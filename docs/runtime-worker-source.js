import { PHP, PHPRequestHandler, loadPHPRuntime } from '@php-wasm/universal';


let php;
let server;
let twigFiles;
const root = '/project';
const databasePath = '/studio-data/project.sqlite';
let projectId;
const phpString = value => "'" + value.replaceAll('\\', '\\\\').replaceAll("'", "\\'") + "'";

function writeFile(name, content) {
    const path = `${root}/${name}`;
    php.mkdir(path.slice(0, path.lastIndexOf('/')));
    php.writeFile(path, content);
}

async function boot() {
    if (php) return;
    const loader = await import('../vendor/php-wasm/php_8_3.js');
    const runtime = await loadPHPRuntime(loader, {
        locateFile: () => new URL('../vendor/php-wasm/8_3_36/php_8_3.wasm', self.location.href).href,
    });
    php = new PHP(runtime);
    php.writeFile('/internal/shared/php.ini', [
        'display_errors=1', 'display_startup_errors=1', 'html_errors=1',
        'error_reporting=E_ALL', 'memory_limit=128M', 'max_execution_time=8',
        'auto_prepend_file=/internal/studio-bootstrap.php',
    ].join('\n'));
    php.mkdir('/studio-data');
    php.writeFile('/internal/studio-bootstrap.php', `<?php
        require_once '/studio-vendor/autoload.php';
        if (is_file('/project/vendor/autoload.php')) require_once '/project/vendor/autoload.php';
        putenv('STUDIO_DB_PATH=${databasePath}');
        function studio_db(): PDO {
            $db = new PDO('sqlite:${databasePath}');
            $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            return $db;
        }
    `);
    server = new PHPRequestHandler({ php, documentRoot: root, absoluteUrl: 'https://project.phpstudio.invalid' });
}

async function loadProject(files, id, database) {
    await boot();
    if (!twigFiles) {
        const response = await fetch(new URL('../vendor/twig-runtime.json', self.location.href));
        if (!response.ok) throw new Error('Não foi possível carregar o interpretador Twig.');
        twigFiles = await response.json();
        for (const [name, content] of Object.entries(twigFiles)) {
            const path = '/studio-vendor/' + name.replace(/^vendor\//, '');
            php.mkdir(path.slice(0, path.lastIndexOf('/')));
            php.writeFile(path, content);
        }
    }
    if (projectId !== id) {
        if (php.fileExists(databasePath)) php.unlink(databasePath);
        if (database?.length) php.writeFile(databasePath, database);
        projectId = id;
    }
    if (php.fileExists(root)) php.rmdir(root, { recursive: true });
    php.mkdir(root);
    for (const [name, content] of Object.entries(files)) {
        if (name.startsWith('/') || name.split('/').includes('..') || /[\x00-\x1f]/.test(name)) {
            throw new Error('Caminho de arquivo inválido.');
        }
        writeFile(name, content);
    }
    php.chdir(root);
}

async function queryDatabase(sql, mode) {
    const result = await php.run({ code: `<?php
        try {
            $db = studio_db();
            $sql = ${phpString(sql)};
            if (${mode === 'script' ? 'true' : 'false'}) {
                $db->beginTransaction();
                try { $affected = $db->exec($sql); $db->commit(); }
                catch (Throwable $e) { if ($db->inTransaction()) $db->rollBack(); throw $e; }
                echo json_encode(['affected' => $affected, 'rows' => []]);
            } else {
                $statement = $db->query($sql);
                $rows = [];
                if ($statement->columnCount()) {
                    while (count($rows) < 501 && ($row = $statement->fetch(PDO::FETCH_ASSOC)) !== false) $rows[] = $row;
                }
                echo json_encode(['affected' => $statement->rowCount(), 'rows' => array_slice($rows, 0, 500), 'truncated' => count($rows) > 500]);
            }
        } catch (Throwable $e) { echo json_encode(['error' => $e->getMessage()]); }
    ` });
    const parsed = JSON.parse(result.text);
    if (parsed.error) throw new Error(parsed.error);
    return parsed;
}

async function request(input) {
    if (typeof input.body === 'string') input.body = new TextEncoder().encode(input.body);
    let requestUrl = new URL(input.url, 'https://project.phpstudio.invalid');
    if (requestUrl.pathname.endsWith('.twig')) {
        const template = decodeURIComponent(requestUrl.pathname).slice(1);
        const directory = template.includes('/') ? template.slice(0, template.lastIndexOf('/')) + '/' : '';
        const code = `<?php
            $loader = new \\Twig\\Loader\\FilesystemLoader('/project');
            $twig = new \\Twig\\Environment($loader, ['cache' => false, 'autoescape' => 'html']);
            $contextFile = '/project/' . ${phpString(directory + 'context.json')};
            $context = is_file($contextFile) ? json_decode(file_get_contents($contextFile), true, 512, JSON_THROW_ON_ERROR) : [];
            if (!is_array($context)) throw new \\RuntimeException('context.json deve conter um objeto JSON.');
            echo $twig->render(${phpString(template)}, $context + ['get' => $_GET, 'post' => $_POST]);`;
        php.writeFile('/internal/studio-twig.php', code);
        const result = await php.run({ scriptPath: '/internal/studio-twig.php', relativeUri: requestUrl.pathname + requestUrl.search,
            method: input.method || 'GET', headers: input.headers || {}, body: input.body });
        return { text: result.text, headers: result.headers, status: result.httpStatusCode, errors: result.errors };
    }
    const result = await server.request({ url: requestUrl.href, method: input.method || 'GET', headers: input.headers || {}, body: input.body });
    return { text: result.text, headers: result.headers, status: result.httpStatusCode, errors: result.errors };
}

let queue = Promise.resolve();
self.onmessage = ({ data }) => {
    queue = queue.catch(() => {}).then(async () => {
        try {
            let result;
            if (data.type === 'project') { await loadProject(data.files, data.projectId, data.database); result = { ready: true }; }
            if (data.type === 'request') result = await request(data.request);
            if (data.type === 'database') result = await queryDatabase(data.sql, data.mode);
            if (data.type === 'snapshot') result = php.fileExists(databasePath) ? php.readFileAsBuffer(databasePath) : new Uint8Array();
            if (data.type === 'lintTwig') {
                const checked = await php.run({ code: `<?php
                    try {
                        $twig = new \\Twig\\Environment(new \\Twig\\Loader\\FilesystemLoader('/project'));
                        $twig->parse($twig->tokenize(new \\Twig\\Source(file_get_contents('/project/' . ${phpString(data.name)}), ${phpString(data.name)})));
                        echo '[]';
                    } catch (\\Twig\\Error\\SyntaxError $error) {
                        echo json_encode([['line' => $error->getTemplateLine(), 'column' => 1, 'severity' => 'error', 'message' => $error->getRawMessage()]]);
                    } catch (Throwable $error) {
                        echo json_encode([['line' => 1, 'column' => 1, 'severity' => 'error', 'message' => $error->getMessage()]]);
                    }
                ` });
                result = JSON.parse(checked.text);
            }
            self.postMessage({ id: data.id, result });
        } catch (error) {
            self.postMessage({ id: data.id, error: error.message });
        }
    });
};

