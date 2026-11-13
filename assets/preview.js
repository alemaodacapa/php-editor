/* PHP Studio. Real PHP/Twig execution in a dedicated browser worker. */
(() => {
    'use strict';
    const virtualOrigin = 'https://project.phpstudio.invalid';
    const frame = document.getElementById('previewFrame');
    const hint = document.getElementById('previewHint');
    const runButton = document.getElementById('previewBtn');
    let renderToken = crypto.randomUUID(), generation = 0;
    let workspaceId = 'legacy';
    let worker, sequence = 0, project = {}, currentPath = '/index.php', busy = false;
    const pending = new Map();

    function status(message) { hint.textContent = message; }
    function log(entry) { document.dispatchEvent(new CustomEvent('studio:log', { detail: { time: Date.now(), file: currentPath.slice(1), ...entry } })); }
    async function saveDatabase() {
        if (!worker) return;
        const database = await rpc('snapshot', {});
        document.dispatchEvent(new CustomEvent('studio:database', { detail: { id: workspaceId, database } }));
    }
    async function prepare(files, settings = {}) {
        project = { ...files };
        workspaceId = settings.id || 'legacy';
        await rpc('project', { files: project, projectId: workspaceId, database: settings.database });
    }
    function stopRuntime(message) {
        worker?.terminate();
        worker = null;
        for (const task of pending.values()) {
            clearTimeout(task.timer);
            task.reject(new Error(message));
        }
        pending.clear();
    }
    function rpc(type, payload) {
        if (!worker) {
            worker = new Worker('assets/runtime-worker.js?v=5', { type: 'module' });
            worker.onmessage = ({ data }) => {
                const task = pending.get(data.id);
                if (!task) return;
                pending.delete(data.id);
                clearTimeout(task.timer);
                data.error ? task.reject(new Error(data.error)) : task.resolve(data.result);
            };
            worker.onerror = () => stopRuntime('Falha ao carregar o PHP. Verifique a conexão e execute novamente.');
        }
        return new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => stopRuntime('Execução interrompida por exceder o tempo limite. Corrija o código e execute novamente.'), type === 'project' ? 90000 : 15000);
            pending.set(id, { resolve, reject, timer });
            worker.postMessage({ id, type, ...payload });
        });
    }
    function resolvePath(reference, base) {
        try {
            const url = new URL(reference, virtualOrigin + base);
            return url.origin === virtualOrigin ? url : null;
        } catch { return null; }
    }
    function fileName(url) { return decodeURIComponent(url.pathname).replace(/^\//, ''); }
    const mime = name => ({ css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', txt: 'text/plain', xml: 'application/xml' })[name.split('.').pop()] || 'text/plain';
    function blob(text, type) {
        return `data:${type};charset=utf-8,${encodeURIComponent(text)}`;
    }

    // This bridge runs inside an opaque-origin iframe. It cannot access the editor's storage or DOM.
    function previewBridge(token, origin, initialPath) {
        let serial = 0;
        const callbacks = new Map();
        const nativeFetch = window.fetch.bind(window);
        const stringify = value => value instanceof Error ? value.stack || value.message : typeof value === 'string' ? value : (() => { try { return JSON.stringify(value); } catch { return String(value); } })();
        function send(type, payload) { parent.postMessage({ studio: token, type, ...payload }, '*'); }
        function localUrl(value) {
            try {
                const url = new URL(value, origin + initialPath);
                return url.origin === origin ? url : null;
            } catch { return null; }
        }
        for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
            const original = console[level].bind(console);
            console[level] = (...args) => { original(...args); send('console', { level, message: args.map(stringify).join(' ').slice(0, 60000), stack: new Error().stack }); };
        }
        window.addEventListener('error', event => send('console', { level: 'error', message: event.message || 'Erro ao carregar recurso.', file: event.filename, line: event.lineno, column: event.colno }));
        window.addEventListener('unhandledrejection', event => send('console', { level: 'error', message: String(event.reason), stack: event.reason?.stack }));
        console.clear = () => send('clear', {});
        console.assert = (condition, ...args) => { if (!condition) console.error('Assertion failed', ...args); };
        document.addEventListener('click', event => {
            const link = event.target.closest('a[href]');
            if (!link || link.hasAttribute('download') || link.target === '_blank') return;
            if (link.getAttribute('href').startsWith('#')) {
                event.preventDefault();
                document.getElementById(decodeURIComponent(link.hash.slice(1)))?.scrollIntoView();
                return;
            }
            const url = localUrl(link.getAttribute('href'));
            if (url) { event.preventDefault(); send('navigate', { request: { url: url.href } }); }
        });
        document.addEventListener('submit', async event => {
            const form = event.target;
            const url = localUrl(event.submitter?.getAttribute('formaction') || form.getAttribute('action') || initialPath);
            if (!url) return;
            event.preventDefault();
            const method = (event.submitter?.getAttribute('formmethod') || form.method || 'GET').toUpperCase();
            const data = new FormData(form, event.submitter);
            let body, headers = {};
            if (method === 'GET') url.search = new URLSearchParams(data).toString();
            else if (form.enctype === 'multipart/form-data') {
                const encoded = new Response(data);
                headers['Content-Type'] = encoded.headers.get('Content-Type');
                body = new Uint8Array(await encoded.arrayBuffer());
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
                body = new URLSearchParams(data).toString();
            }
            send('navigate', { request: { url: url.href, method, body, headers } });
        });
        window.fetch = async (input, options = {}) => {
            const url = localUrl(input instanceof Request ? input.url : String(input));
            if (!url) return nativeFetch(input, options);
            const request = new Request(url, input instanceof Request ? input : options);
            const body = ['GET', 'HEAD'].includes(request.method) ? undefined : new Uint8Array(await request.arrayBuffer());
            return new Promise((resolve, reject) => {
                const id = ++serial;
                callbacks.set(id, { resolve, reject });
                send('fetch', { id, request: { url: url.href, method: request.method, headers: Object.fromEntries(request.headers), body } });
            });
        };
        window.addEventListener('message', ({ source, data }) => {
            if (source !== parent || data?.studio !== token || data.type !== 'response') return;
            const callback = callbacks.get(data.id);
            if (!callback) return;
            callbacks.delete(data.id);
            if (data.error) callback.reject(new Error(data.error));
            else callback.resolve(new Response([204, 205, 304].includes(data.result.status) ? null : data.result.text, { status: data.result.status, headers: data.result.headers }));
        });
    }

    function render(text, path) {
        renderToken = crypto.randomUUID();
        const cache = new Map();
        function rewriteModule(source, base) {
            return source.replace(/(\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?['"])([^'"]+)(['"])/g, (match, start, target, end) => {
                const url = resolvePath(target, base);
                return url && Object.hasOwn(project, fileName(url)) ? start + url.href + end : match;
            }).replace(/(\bimport\s*\(\s*['"])([^'"]+)(['"]\s*\))/g, (match, start, target, end) => {
                const url = resolvePath(target, base);
                return url && Object.hasOwn(project, fileName(url)) ? start + url.href + end : match;
            });
        }
        function resource(reference, base, trail = new Set()) {
            const url = resolvePath(reference, base);
            if (!url) return reference;
            const name = fileName(url);
            if (!Object.hasOwn(project, name)) return url.href;
            if (cache.has(name)) return cache.get(name) + url.hash;
            if (trail.has(name)) return 'data:text/css,';
            const next = new Set([...trail, name]);
            let content = project[name];
            if (name.endsWith('.css')) {
                content = content.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (match, quote, target) => `url("${resource(target, url.pathname, next)}")`)
                    .replace(/(@import\s+)(['"])([^'"]+)\2/gi, (match, start, quote, target) => start + '"' + resource(target, url.pathname, next) + '"');
            }
            if (/\.m?js$/.test(name)) content = rewriteModule(content, url.pathname) + '\n//# sourceURL=studio:///' + name;
            const value = blob(content, mime(name));
            cache.set(name, value);
            return value + url.hash;
        }
        const doc = new DOMParser().parseFromString(text, 'text/html');
        doc.querySelectorAll('base, meta[http-equiv="Content-Security-Policy" i], meta[http-equiv="refresh" i]').forEach(node => node.remove());
        const base = doc.createElement('base');
        base.href = virtualOrigin + path;
        doc.head.prepend(base);
        const imports = {};
        for (const name of Object.keys(project).filter(name => /\.m?js$/.test(name))) imports[virtualOrigin + '/' + name] = resource('/' + name, path);
        const importMap = doc.createElement('script');
        importMap.type = 'importmap';
        importMap.textContent = JSON.stringify({ imports });
        base.after(importMap);
        for (const node of doc.querySelectorAll('[src], link[href], [poster]')) {
            for (const attr of ['src', 'href', 'poster']) {
                if (!node.hasAttribute(attr)) continue;
                node.setAttribute(attr, resource(node.getAttribute(attr), path));
            }
        }
        for (const node of doc.querySelectorAll('style, [style]')) {
            const replace = css => css.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi, (match, quote, target) => `url("${resource(target, path)}")`);
            if (node.tagName === 'STYLE') node.textContent = replace(node.textContent);
            else node.setAttribute('style', replace(node.getAttribute('style')));
        }
        for (const script of doc.querySelectorAll('script[type="module"]:not([src])')) script.textContent = rewriteModule(script.textContent, path);
        for (const script of doc.querySelectorAll('script:not([src]):not([type="importmap"])')) {
            const originalLine = Math.max(0, text.slice(0, text.indexOf(script.textContent)).split('\n').length - 1);
            script.textContent = '\n'.repeat(originalLine) + script.textContent + '\n//# sourceURL=studio:///' + path.replace(/^\//, '') + '\n';
        }
        const bridge = doc.createElement('script');
        bridge.textContent = `(${previewBridge.toString()})(${JSON.stringify(renderToken)}, ${JSON.stringify(virtualOrigin)}, ${JSON.stringify(path)});`;
        importMap.after(bridge);
        frame.removeAttribute('src');
        frame.srcdoc = '<!doctype html>\n' + doc.documentElement.outerHTML;
    }

    async function request(input, redirects = 0) {
        if (redirects > 8) throw new Error('Redirecionamentos em excesso no projeto.');
        const url = new URL(input.url, virtualOrigin + currentPath);
        const name = fileName(url);
        let result;
        if (/\.(php|twig)$/i.test(url.pathname)) result = await rpc('request', { request: { ...input, url: url.href } });
        else if (Object.hasOwn(project, name)) result = { text: project[name], headers: { 'content-type': [mime(name)] }, status: 200 };
        else result = { text: 'Arquivo não encontrado no projeto. ' + name, headers: {}, status: 404 };
        const headers = Object.fromEntries(Object.entries(result.headers || {}).map(([key, value]) => [key.toLowerCase(), Array.isArray(value) ? value.join(', ') : value]));
        if (result.status >= 300 && result.status < 400 && headers.location) {
            const next = resolvePath(headers.location, url.pathname);
            if (!next) throw new Error('O projeto redirecionou para um endereço externo.');
            return request({ url: next.href, method: [307, 308].includes(result.status) ? input.method : 'GET', body: [307, 308].includes(result.status) ? input.body : undefined, headers: input.headers }, redirects + 1);
        }
        return { ...result, headers, path: url.pathname + url.search };
    }
    async function navigate(input) {
        const started = generation;
        try {
            status('Executando o projeto…');
            const result = await request(input);
            if (started !== generation) return;
            currentPath = result.path;
            render(result.text, currentPath);
            const plain = new DOMParser().parseFromString(result.text, 'text/html').body.textContent;
            for (const error of plain.matchAll(/((?:Warning|Fatal error|Parse error|Notice):[^\n]+?) in \/project\/([^\n]+?) on line (\d+)/g)) {
                log({ level: /Notice|Warning/.test(error[1]) ? 'warn' : 'error', message: error[1], file: error[2], line: Number(error[3]) });
            }
            await saveDatabase();
            status(result.errors ? 'PHP — ' + result.errors : `Executado · ${currentPath} · HTTP ${result.status}`);
        } catch (error) {
            if (started !== generation) return;
            status(error.message);
            log({ level: 'error', message: error.message });
            const safe = document.createElement('pre');
            safe.textContent = error.message;
            frame.srcdoc = safe.outerHTML;
        }
    }
    window.addEventListener('message', async ({ source, data }) => {
        if (source !== frame.contentWindow || data?.studio !== renderToken) return;
        if (data.type === 'clear') document.dispatchEvent(new Event('studio:clear-console'));
        if (data.type === 'console') {
            const location = (data.stack || '').match(/studio:\/\/\/([^):\n]+):(\d+):(\d+)/);
            log({ level: data.level, message: data.message, file: location?.[1] || data.file?.replace('studio:///', '') || currentPath.slice(1), line: Number(location?.[2] || data.line || 1), column: Number(location?.[3] || data.column || 1) });
            status(`${data.level === 'error' ? 'Erro JavaScript' : 'Console'} — ${data.message}`);
        }
        if (data.type === 'navigate') await navigate(data.request);
        if (data.type === 'fetch') {
            try {
                const start = performance.now();
                const result = await request(data.request);
                log({ level: 'network', message: `${data.request.method || 'GET'} ${new URL(data.request.url).pathname} · HTTP ${result.status} · ${Math.round(performance.now() - start)} ms` });
                frame.contentWindow.postMessage({ studio: data.studio, type: 'response', id: data.id, result }, '*');
                await saveDatabase();
            }
            catch (error) { frame.contentWindow.postMessage({ studio: data.studio, type: 'response', id: data.id, error: error.message }, '*'); }
        }
    });

    window.PHPStudioPreview = {
        reset() {
            generation++; renderToken = crypto.randomUUID(); project = {}; currentPath = '/index.php';
            stopRuntime('Projeto alterado.'); frame.srcdoc = ''; status('Execute o projeto aberto para atualizar a prévia.');
        },
        cancel() { stopRuntime('Execução cancelada.'); },
        async analyzeTwig(files, name, settings) {
            await prepare(files, settings);
            return rpc('lintTwig', { name });
        },
        async api(files, input, settings) {
            await prepare(files, settings);
            const result = await request(input);
            await saveDatabase();
            return result;
        },
        async database(files, sql, mode, settings) {
            await prepare(files, settings);
            const result = await rpc('database', { sql, mode });
            await saveDatabase();
            return result;
        },
        async run(files, active, settings = {}) {
            if (busy) return;
            busy = true;
            runButton.disabled = true;
            project = { ...files };
            try {
                const pages = Object.keys(project).filter(name => /\.(php|html?|twig)$/i.test(name));
                let entry = pages.includes(active) ? active : pages.find(name => /^index\.(php|html?|twig)$/i.test(name)) || pages[0];
                if (!entry) {
                    if (/\.m?js$/.test(active)) {
                        render(`<script src="/${active.replaceAll('"', '&quot;')}"></script>`, '/');
                        status('JavaScript executado. A saída de console aparece nesta faixa.');
                    } else status('Crie um arquivo HTML, PHP ou Twig para visualizar o projeto com seus estilos.');
                    return;
                }
                if (Object.keys(project).some(name => /\.(php|twig)$/.test(name))) {
                    status('Carregando PHP 8.3 e Twig… O primeiro carregamento pode demorar.');
                    await prepare(project, settings);
                }
                await navigate({ url: '/' + entry });
            } catch (error) { status(error.message); }
            finally { busy = false; runButton.disabled = false; }
        },
    };
})();
