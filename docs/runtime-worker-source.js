import { PHP, PHPRequestHandler, loadPHPRuntime } from '@php-wasm/universal';


let php;
let server;
let twigFiles;
const root = '/project';

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
    php.writeFile('/internal/studio-bootstrap.php', '<?php require_once "/project/vendor/autoload.php";');
    server = new PHPRequestHandler({ php, documentRoot: root, absoluteUrl: 'https://project.phpstudio.invalid' });
}

async function loadProject(files) {
    await boot();
    if (!twigFiles) {
        const response = await fetch(new URL('../vendor/twig-runtime.json', self.location.href));
        if (!response.ok) throw new Error('Não foi possível carregar o interpretador Twig.');
        twigFiles = await response.json();
    }
    if (php.fileExists(root)) php.rmdir(root, { recursive: true });
    php.mkdir(root);
    for (const [name, content] of Object.entries(twigFiles)) writeFile(name, content);
    for (const [name, content] of Object.entries(files)) {
        if (name.startsWith('/') || name.split('/').includes('..') || /[\x00-\x1f]/.test(name)) {
            throw new Error('Caminho de arquivo inválido.');
        }
        writeFile(name, content);
    }
    php.chdir(root);
}

async function request(input) {
    let requestUrl = new URL(input.url, 'https://project.phpstudio.invalid');
    if (requestUrl.pathname.endsWith('.twig')) {
        const template = decodeURIComponent(requestUrl.pathname).slice(1);
        const directory = template.includes('/') ? template.slice(0, template.lastIndexOf('/')) + '/' : '';
        const code = `<?php
            $loader = new \\Twig\\Loader\\FilesystemLoader('/project');
            $twig = new \\Twig\\Environment($loader, ['cache' => false, 'autoescape' => 'html']);
            $contextFile = '/project/' . ${JSON.stringify(directory + 'context.json')};
            $context = is_file($contextFile) ? json_decode(file_get_contents($contextFile), true, 512, JSON_THROW_ON_ERROR) : [];
            if (!is_array($context)) throw new \\RuntimeException('context.json deve conter um objeto JSON.');
            echo $twig->render(${JSON.stringify(template)}, $context + ['get' => $_GET, 'post' => $_POST]);`;
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
            if (data.type === 'project') await loadProject(data.files);
            const result = data.type === 'project' ? { ready: true } : await request(data.request);
            self.postMessage({ id: data.id, result });
        } catch (error) {
            self.postMessage({ id: data.id, error: error.message });
        }
    });
};

