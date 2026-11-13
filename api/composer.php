<?php
declare(strict_types=1);

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
session_start(['cookie_httponly' => true, 'cookie_secure' => !empty($_SERVER['HTTPS']), 'cookie_samesite' => 'Strict']);

function fail_request(string $message, int $code = 400): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail_request('Use POST para instalar as dependências.', 405);
if (!hash_equals($_SESSION['studio_csrf'] ?? '', $_SERVER['HTTP_X_STUDIO_CSRF'] ?? '') || empty($_SESSION['studio_csrf'])) {
    fail_request('Sessão expirada. Atualize o editor e tente novamente.', 403);
}
session_write_close();
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 131072) fail_request('composer.json excede 128 KB.', 413);
try {
    $manifest = json_decode(file_get_contents('php://input', false, null, 0, 131073), true, 64, JSON_THROW_ON_ERROR);
} catch (Throwable $error) { fail_request('composer.json inválido.'); }
if (!is_array($manifest) || !isset($manifest['require']) || !is_array($manifest['require']) || !$manifest['require'] || count($manifest['require']) > 40) {
    fail_request('Defina entre 1 e 40 dependências no campo require de composer.json.');
}
if (isset($manifest['repositories'])) fail_request('Esta instalação aceita pacotes públicos do Packagist. Remova repositories.');
foreach ($manifest['require'] as $name => $version) {
    if (!preg_match('~^(?:[a-z0-9_.-]+/[a-z0-9_.-]+|php|ext-[a-z0-9_.-]+)$~D', (string)$name) || !is_string($version) || strlen($version) > 120) {
        fail_request('Nome ou versão de dependência inválido.');
    }
}
$autoload = [];
foreach (['psr-4', 'psr-0', 'classmap', 'files'] as $type) {
    if (!isset($manifest['autoload'][$type])) continue;
    $paths = $manifest['autoload'][$type];
    if (!is_array($paths)) fail_request('autoload deve conter listas ou mapas de caminhos.');
    array_walk_recursive($paths, function ($path) {
        if (!is_string($path) || strlen($path) > 200 || str_contains($path, '..') || preg_match('~^[\\/]|[:\x00-\x1f]~', $path)) {
            fail_request('Use somente caminhos relativos do projeto em autoload.');
        }
    });
    $autoload[$type] = $paths;
}

$composerPath = getenv('PHP_STUDIO_COMPOSER_PATH') ?: '/usr/local/bin/composer2.phar';
if (!is_file($composerPath) || !class_exists(ZipArchive::class)) fail_request('O servidor precisa de Composer PHAR e da extensão PHP ZIP.', 503);
$storage = sys_get_temp_dir() . '/php-studio-composer-' . substr(hash('sha256', dirname(__DIR__)), 0, 16);
if (!is_dir($storage) && !mkdir($storage, 0700, true)) fail_request('Não foi possível preparar o instalador.', 503);
$lock = fopen($storage . '/install.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) fail_request('Outra instalação está em andamento. Tente novamente em instantes.', 429);
$rateFile = $storage . '/rate-' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'local') . '.json';
$attempts = is_file($rateFile) ? json_decode(file_get_contents($rateFile), true) : [];
$attempts = array_values(array_filter(is_array($attempts) ? $attempts : [], fn($time) => is_int($time) && $time > time() - 300));
if (count($attempts) >= 8) fail_request('Limite de oito instalações em cinco minutos. Aguarde e tente novamente.', 429);
$attempts[] = time();
file_put_contents($rateFile, json_encode($attempts), LOCK_EX);
$job = $storage . '/job-' . bin2hex(random_bytes(16));
if (!mkdir($job, 0700)) fail_request('Não foi possível criar o diretório da instalação.', 503);

// Only generated manifests enter Composer. Project code is never uploaded or executed here.
$safeManifest = ['require' => $manifest['require'], 'autoload' => (object)$autoload, 'prefer-stable' => true,
    'config' => ['allow-plugins' => false, 'preferred-install' => 'dist', 'platform' => ['php' => '8.3.36']]];
file_put_contents($job . '/composer.json', json_encode($safeManifest, JSON_UNESCAPED_SLASHES));
$initialDirectory = getcwd();
$archive = $job . '/dependencies.zip';
register_shutdown_function(function () use ($job, $initialDirectory, $lock) {
    chdir($initialDirectory);
    if (is_dir($job)) {
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($job, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
        foreach ($iterator as $file) {
            if ($file->isDir() && !$file->isLink()) rmdir($file->getPathname());
            else unlink($file->getPathname());
        }
        rmdir($job);
    }
    flock($lock, LOCK_UN); fclose($lock);
});

try {
    set_time_limit(90);
    ini_set('memory_limit', '256M');
    putenv('COMPOSER_HOME=' . $job . '/home');
    putenv('COMPOSER_CACHE_DIR=' . $storage . '/cache');
    putenv('COMPOSER_NO_INTERACTION=1');
    putenv('COMPOSER_PROCESS_TIMEOUT=60');
    chdir($job);
    require 'phar://' . $composerPath . '/vendor/autoload.php';
    $application = new Composer\Console\Application();
    $application->setAutoExit(false);
    $output = new Symfony\Component\Console\Output\BufferedOutput();
    $input = new Symfony\Component\Console\Input\ArrayInput(['command' => 'update', '--no-dev' => true,
        '--no-plugins' => true, '--no-scripts' => true, '--prefer-dist' => true, '--no-progress' => true]);
    $result = $application->run($input, $output);
    $log = str_replace([$job, dirname(__DIR__), $storage], ['[instalação]', '[editor]', '[cache]'], strip_tags($output->fetch()));
    if ($result !== 0 || !is_file($job . '/vendor/autoload.php')) fail_request(substr($log, -12000), 422);
    $zip = new ZipArchive();
    if ($zip->open($archive, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) throw new RuntimeException('Falha ao compactar as dependências.');
    $total = 0; $count = 0;
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($job . '/vendor', FilesystemIterator::SKIP_DOTS));
    foreach ($iterator as $file) {
        if (!$file->isFile() || $file->isLink()) continue;
        $total += $file->getSize(); $count++;
        if ($total > 25000000 || $count > 2500) throw new RuntimeException('Dependências excedem o limite de 25 MB ou 2.500 arquivos deste ambiente.');
        $zip->addFile($file->getPathname(), substr($file->getPathname(), strlen($job) + 1));
    }
    $zip->addFile($job . '/composer.lock', 'composer.lock');
    $zip->addFromString('studio-install.log', $log);
    $zip->close();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="composer-dependencies.zip"');
    header('Content-Length: ' . filesize($archive));
    readfile($archive);
} catch (Throwable $error) {
    fail_request('Falha na instalação. ' . str_replace([$job, dirname(__DIR__), $storage], ['[instalação]', '[editor]', '[cache]'], $error->getMessage()), 422);
}
