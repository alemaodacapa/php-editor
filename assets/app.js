/* PHP Studio — project editing, diagnostics, API testing and isolated databases. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const storage = window.StudioStorage;
    let current, editor, saveTimer, deferredInstall, saveQueue = Promise.resolve();
    let apiAbort, apiSequence = 0, history = [], collections = [], logs = [];
    let projectLocks = 0;
    let consoleRenderPending = false;
    function lockProject() {
        projectLocks++;
        const controls = ['projectSelect', 'newProjectBtn', 'resetBtn', 'dbImportBtn', 'importBtn'];
        controls.forEach(id => { $(id).disabled = true; });
        return () => { projectLocks--; if (!projectLocks) controls.forEach(id => { $(id).disabled = false; }); };
    }
    const language = name => ({ php: 'php', inc: 'php', html: 'html', htm: 'html', css: 'css', js: 'js', mjs: 'js', twig: 'twig', json: 'json', lock: 'json' })[name.split('.').pop().toLowerCase()] || 'txt';
    const path = raw => {
        const name = String(raw || '').trim().replaceAll('\\', '/');
        if (!name || name.length > 200 || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..') || /[\x00-\x1f:]/.test(name) || ['__proto__', 'constructor', 'prototype'].includes(name)) throw new Error('Use um caminho relativo válido para o arquivo.');
        return name;
    };
    function notify(message) {
        $('toast').textContent = message; $('toast').classList.add('visible');
        clearTimeout(notify.timer); notify.timer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
    }
    function ask(title, message, value) {
        return new Promise(resolve => {
            const dialog = $('modal'); $('modalTitle').textContent = title;
            const paragraph = document.createElement('p'); paragraph.textContent = message;
            $('modalBody').replaceChildren(paragraph);
            let input;
            if (value !== undefined) {
                input = document.createElement('input'); input.value = value; input.maxLength = 200;
                input.setAttribute('aria-label', title); $('modalBody').append(input);
            }
            let finished = false;
            const finish = result => { if (finished) return; finished = true; dialog.close(); resolve(result); };
            $('modalButtons').replaceChildren();
            for (const [label, accept] of [['Cancelar', false], ['Confirmar', true]]) {
                const button = document.createElement('button'); button.textContent = label;
                button.onclick = () => finish(accept ? (input ? input.value.trim() : true) : null); $('modalButtons').append(button);
            }
            $('closeModal').onclick = () => finish(null);
            dialog.oncancel = event => { event.preventDefault(); finish(null); };
            dialog.showModal(); input?.focus(); input?.select();
        });
    }
    function download(bytes, name, type = 'application/octet-stream') {
        const url = URL.createObjectURL(new Blob([bytes], { type }));
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
        document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
    const settings = () => ({ id: current.runtimeId, database: current.database });
    function fresh(name = 'Meu projeto') {
        return { id: crypto.randomUUID(), runtimeId: crypto.randomUUID(), name, files: { 'index.php': '' }, active: 'index.php', database: new Uint8Array(), modified: Date.now() };
    }
    function sync() { if (current && editor) current.files[current.active] = editor.value(); }
    async function persist() {
        if (!current) return;
        clearTimeout(saveTimer); sync(); current.modified = Date.now();
        const snapshot = structuredClone(current);
        saveQueue = saveQueue.catch(() => {}).then(() => storage.save(snapshot));
        try { await saveQueue; if (snapshot.id === current.id) $('saveStatus').textContent = '● Salvo no dispositivo'; }
        catch { $('saveStatus').textContent = '● Falha ao salvar'; notify('Não foi possível salvar no navegador. Exporte seu projeto em ZIP.'); }
    }
    function scheduleSave() { $('saveStatus').textContent = '● Alterações pendentes'; clearTimeout(saveTimer); saveTimer = setTimeout(persist, 400); }
    function diagnostics(errors, name) {
        if (name !== current.active) return;
        $('diagnosticsList').replaceChildren();
        $('diagnosticsSummary').textContent = errors.length ? `${errors.length} diagnóstico(s)` : language(name) === 'twig' ? 'Clique em Analisar para validar o Twig' : 'Nenhum erro de sintaxe detectado';
        for (const error of errors) {
            const item = document.createElement('li'), button = document.createElement('button');
            button.className = 'diagnostic ' + error.severity;
            button.textContent = `${name}:${error.line}:${error.column || 1} · ${error.message}`;
            button.onclick = () => editor.jump(error.line, error.column); item.append(button); $('diagnosticsList').append(item);
        }
    }
    function render() {
        if (!Object.hasOwn(current.files, current.active)) current.active = Object.keys(current.files)[0];
        const fileList = $('fileList'); fileList.replaceChildren(); $('tabStrip').replaceChildren();
        for (const name of Object.keys(current.files).sort()) {
            const button = document.createElement('button'); button.className = 'file-row' + (name === current.active ? ' active' : '');
            button.textContent = (name === current.active ? '● ' : '◇ ') + name; button.title = name; button.onclick = () => choose(name); fileList.append(button);
        }
        const tab = document.createElement('div'); tab.className = 'editor-tab'; tab.textContent = current.active; $('tabStrip').append(tab);
        $('syntaxSelect').value = language(current.active); $('editorLanguage').textContent = language(current.active).toUpperCase();
        $('editor').value = current.files[current.active];
        editor.open(current.active, current.files[current.active], language(current.active), current.id);
        $('fileSize').textContent = new Blob([current.files[current.active]]).size.toLocaleString('pt-BR') + ' B';
        $('diagnosticsSummary').textContent = language(current.active) === 'twig' ? 'Clique em Analisar para validar o Twig' : 'Analisando…'; $('diagnosticsList').replaceChildren();
    }
    function choose(name, line, column) {
        if (!Object.hasOwn(current.files, name)) return;
        sync(); current.active = name; render(); if (line) editor.jump(line, column); scheduleSave();
    }
    function addFile(name, content = '') {
        name = path(name); if (Object.hasOwn(current.files, name)) throw new Error('Já existe um arquivo com esse nome.');
        sync(); current.files[name] = content; current.active = name; render(); scheduleSave();
    }
    async function projectOptions() {
        const projects = await storage.projects(); $('projectSelect').replaceChildren();
        for (const project of projects.sort((a, b) => b.modified - a.modified)) {
            const option = document.createElement('option'); option.value = project.id; option.textContent = project.name;
            option.selected = project.id === current.id; $('projectSelect').append(option);
        }
    }
    async function importFiles(input) {
        sync(); const added = Object.create(null); let total = 0, importedDatabase;
        try {
            for (const file of input) {
                if (/\.zip$/i.test(file.name)) {
                    const zip = await JSZip.loadAsync(file);
                    for (const entry of Object.values(zip.files)) {
                        if (entry.dir || entry.name.startsWith('__MACOSX/')) continue;
                        if (entry.unsafeOriginalName && entry.unsafeOriginalName !== entry.name) throw new Error('O ZIP contém caminhos inseguros.');
                        const name = path(entry.name);
                        if (name === 'studio-database.sqlite') {
                            importedDatabase = await entry.async('uint8array');
                            if (new TextDecoder().decode(importedDatabase.slice(0, 16)) !== 'SQLite format 3\0' || importedDatabase.length > 25000000) throw new Error('Banco SQLite inválido ou maior que 25 MB no ZIP.');
                            continue;
                        }
                        if (/\.(png|jpg|jpeg|gif|webp|woff2?|ttf|sqlite|db|phar|exe)$/i.test(name)) continue;
                        const text = await entry.async('string'); total += new Blob([text]).size;
                        if (total > 25000000 || Object.keys(added).length >= 2500) throw new Error('Limite de 25 MB de texto e 2.500 arquivos por importação.');
                        added[name] = text;
                    }
                } else {
                    if (file.size > 2000000) throw new Error('Limite de 2 MB por arquivo de texto.');
                    added[path(file.webkitRelativePath || file.name)] = await file.text();
                }
            }
            if (importedDatabase && current.database?.length && !await ask('Importar banco do ZIP', 'O banco deste projeto será substituído pelo banco incluído no ZIP. Continuar?')) return;
            if (importedDatabase) { current.database = importedDatabase; current.runtimeId = crypto.randomUUID(); }
            Object.assign(current.files, added);
            const names = Object.keys(added); current.active = names.find(name => /(?:^|\/)index\.(php|html?|twig)$/i.test(name)) || names[0] || current.active;
            render(); await persist(); notify(`${names.length} arquivo(s) importado(s).`);
        } catch (error) { notify(error.message); }
        finally { $('fileInput').value = ''; }
    }
    async function exportProject() {
        sync(); const zip = new JSZip();
        for (const [name, text] of Object.entries(current.files)) zip.file(name, text);
        if (current.database?.length) zip.file('studio-database.sqlite', current.database);
        download(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), 'php-studio-projeto.zip', 'application/zip');
    }
    function appendLog(entry) {
        logs.push({ time: Date.now(), level: 'log', ...entry }); if (logs.length > 500) logs.shift();
        if (!consoleRenderPending) {
            consoleRenderPending = true;
            requestAnimationFrame(() => { consoleRenderPending = false; renderConsole(); });
        }
    }
    function renderConsole() {
        const level = $('consoleLevel').value, search = $('consoleSearch').value.toLowerCase(); $('consoleEntries').replaceChildren();
        for (const entry of logs.filter(row => (level === 'all' || row.level === level) && `${row.message} ${row.file || ''}`.toLowerCase().includes(search))) {
            const row = document.createElement('div'); row.className = 'console-row ' + entry.level;
            const label = document.createElement('span'); label.textContent = `${new Date(entry.time).toLocaleTimeString('pt-BR')} · ${entry.level}`;
            const message = document.createElement('pre'); message.textContent = entry.message;
            row.append(label, message);
            if (entry.file) {
                const button = document.createElement('button'); button.className = 'console-source';
                button.textContent = `${entry.file}:${entry.line || 1}`; button.onclick = () => choose(entry.file.replace(/^\//, ''), entry.line || 1, entry.column || 1); row.append(button);
            }
            $('consoleEntries').append(row);
        }
    }
    function safeRequest(request) {
        const url = new URL(request.url || '/', 'https://project.phpstudio.invalid');
        if (url.username || url.password) throw new Error('Use headers ou Bearer token para autenticar.');
        for (const name of [...url.searchParams.keys()]) if (/token|key|secret|password|auth|credential|signature|session|jwt/i.test(name)) url.searchParams.set(name, '[redigido]');
        return { ...request, url: request.target === 'project' ? url.pathname + url.search : url.href,
            headers: Object.fromEntries(Object.entries(request.headers).filter(([name]) => !/auth|cookie|token|key|secret|password|credential|signature/i.test(name))) };
    }
    function apiInput() {
        const headers = JSON.parse($('apiHeaders').value || '{}');
        if (!headers || Array.isArray(headers) || typeof headers !== 'object' || Object.values(headers).some(value => typeof value !== 'string')) throw new Error('Headers devem ser um objeto JSON com valores de texto.');
        const target = $('apiTarget').value, url = $('apiUrl').value.trim();
        if (!url) throw new Error('Informe a URL da requisição.');
        if (target === 'external') { const parsed = new URL(url); if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('Informe uma URL HTTP/HTTPS sem credenciais embutidas.'); }
        return { target, url, method: $('apiMethod').value, headers };
    }
    function renderRequests() {
        for (const [id, items, label] of [['apiHistory', history, 'Requisições recentes'], ['apiCollections', collections, 'Requisições salvas']]) {
            const initial = document.createElement('option'); initial.value = ''; initial.textContent = label; $(id).replaceChildren(initial);
            items.forEach((item, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = item.name || `${item.method} ${item.url}`; $(id).append(option); });
        }
    }
    function restoreRequest(item) {
        if (!item) return; $('apiTarget').value = item.target; $('apiMethod').value = item.method; $('apiUrl').value = item.url;
        $('apiHeaders').value = JSON.stringify(item.headers, null, 2); $('apiToken').value = ''; $('apiBody').value = '';
    }
    async function sendAPI() {
        const unlock = lockProject();
        const sequence = ++apiSequence; apiAbort = new AbortController();
        $('apiSendBtn').disabled = true; $('apiCancelBtn').disabled = false;
        const timer = setTimeout(() => apiAbort?.abort(), 30000);
        try {
            const input = apiInput(), safe = safeRequest(input), start = performance.now();
            const headers = { ...input.headers }; if ($('apiToken').value) headers.Authorization = 'Bearer ' + $('apiToken').value;
            const body = ['GET', 'HEAD'].includes(input.method) ? undefined : $('apiBody').value;
            $('apiStatus').textContent = 'Enviando…'; $('apiResponse').textContent = ''; $('apiResponseHeaders').textContent = '';
            let response;
            if (input.target === 'project') {
                sync(); response = await PHPStudioPreview.api(current.files, { url: input.url, method: input.method, headers, body }, settings());
                await persist();
            } else {
                const fetched = await fetch(input.url, { method: input.method, headers, body, signal: apiAbort.signal, credentials: 'omit' });
                const reader = fetched.body?.getReader(); let text = '', size = 0; const decoder = new TextDecoder();
                if (reader) {
                    while (true) {
                        const chunk = await reader.read(); if (chunk.done) break;
                        size += chunk.value.length;
                        if (size > 5000000) { await reader.cancel(); throw new Error('Resposta excedeu o limite de 5 MB.'); }
                        text += decoder.decode(chunk.value, { stream: true });
                    }
                    text += decoder.decode();
                }
                response = { status: fetched.status, text, headers: Object.fromEntries(fetched.headers) };
            }
            if (sequence !== apiSequence) return;
            const duration = Math.round(performance.now() - start);
            $('apiStatus').textContent = `HTTP ${response.status} · ${duration} ms · ${new Blob([response.text]).size.toLocaleString('pt-BR')} bytes`;
            try { $('apiResponse').textContent = JSON.stringify(JSON.parse(response.text), null, 2); } catch { $('apiResponse').textContent = response.text; }
            $('apiResponseHeaders').textContent = JSON.stringify(response.headers, null, 2);
            appendLog({ level: 'network', message: `${input.method} ${safe.url} · HTTP ${response.status} · ${duration} ms` });
            history.unshift({ ...safe, status: response.status, time: Date.now() }); history = history.slice(0, 30);
            await storage.set('apiHistory', history); renderRequests();
        } catch (error) {
            if (sequence === apiSequence) $('apiStatus').textContent = error.name === 'AbortError' ? 'Requisição cancelada ou prazo excedido.' : error instanceof TypeError ? 'Falha de rede ou CORS. Confira URL, HTTPS e a permissão de origem na API.' : error.message;
        } finally {
            unlock();
            clearTimeout(timer);
            if (sequence === apiSequence) { $('apiSendBtn').disabled = false; $('apiCancelBtn').disabled = true; }
        }
    }
    function table(rows) {
        const node = document.createElement('table'), header = document.createElement('tr');
        const columns = [...new Set(rows.flatMap(Object.keys))];
        for (const name of columns) { const cell = document.createElement('th'); cell.textContent = name; header.append(cell); } node.append(header);
        for (const row of rows) {
            const line = document.createElement('tr');
            for (const name of columns) { const cell = document.createElement('td'); cell.textContent = row[name] === null ? 'NULL' : typeof row[name] === 'object' ? JSON.stringify(row[name]) : String(row[name] ?? ''); line.append(cell); }
            node.append(line);
        }
        return node;
    }
    async function sql(mode = 'query', text = $('sqlEditor').value) {
        if (!text.trim()) { notify('Digite uma consulta ou importe um arquivo SQL.'); return; }
        $('sqlRunBtn').disabled = $('sqlScriptBtn').disabled = true;
        const unlock = lockProject();
        try {
            sync(); $('sqlStatus').textContent = 'Executando…';
            const result = await PHPStudioPreview.database(current.files, text, mode, settings());
            $('sqlResults').replaceChildren(table(result.rows));
            $('sqlStatus').textContent = `${result.rows.length} linha(s) retornada(s) · ${result.affected} afetada(s)` + (result.truncated ? ' · limite de 500 resultados' : '');
            await persist();
        } catch (error) { $('sqlStatus').textContent = error.message; }
        finally { unlock(); $('sqlRunBtn').disabled = $('sqlScriptBtn').disabled = false; }
    }
    async function replaceDatabase(bytes, confirm = true) {
        if (new TextDecoder().decode(bytes.slice(0, 16)) !== 'SQLite format 3\0') throw new Error('Arquivo SQLite inválido.');
        if (bytes.length > 25000000) throw new Error('Limite de 25 MB para o banco.');
        if (confirm && !await ask('Substituir banco', 'O banco SQLite deste projeto será substituído pelo arquivo selecionado. Exporte o banco atual antes de continuar.')) return;
        PHPStudioPreview.reset(); current.runtimeId = crypto.randomUUID(); current.database = bytes; await persist(); notify('Banco importado neste projeto.');
    }
    async function installComposer() {
        const unlock = lockProject();
        sync(); $('composerInstallBtn').disabled = true;
        const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 110000);
        try {
            if (!current.files['composer.json']) throw new Error('Crie composer.json na raiz do projeto com as dependências em require.');
            JSON.parse(current.files['composer.json']); $('composerStatus').textContent = 'Resolvendo e instalando dependências…';
            const originalManifest = current.files['composer.json'];
            const originalProject = current.id;
            const response = await fetch('api/composer.php', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-CSRF': document.body.dataset.studioCsrf }, body: current.files['composer.json'], signal: controller.signal, credentials: 'same-origin' });
            if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Falha no Composer.'); }
            const bytes = await response.arrayBuffer();
            if (bytes.byteLength > 25000000) throw new Error('Pacotes excedem o limite deste ambiente.');
            const zip = await JSZip.loadAsync(bytes), installed = Object.create(null); let size = 0;
            for (const entry of Object.values(zip.files)) {
                if (entry.dir) continue;
                if (entry.name === 'studio-install.log') { appendLog({ level: 'info', message: await entry.async('string') }); continue; }
                const name = path(entry.name), text = await entry.async('string'); size += new Blob([text]).size;
                if (size > 25000000 || Object.keys(installed).length > 2500) throw new Error('Dependências excedem os limites do projeto.');
                installed[name] = text;
            }
            if (originalProject !== current.id) throw new Error('O projeto foi trocado. Execute a instalação novamente no projeto desejado.');
            sync();
            if (current.files['composer.json'] !== originalManifest) throw new Error('composer.json mudou durante a instalação. Execute novamente para instalar as versões atuais.');
            const retained = Object.fromEntries(Object.entries(current.files).filter(([name]) => !name.startsWith('vendor/')));
            current.files = { ...retained, ...installed }; render(); await persist();
            $('composerStatus').textContent = `${Object.keys(installed).length} arquivo(s) instalado(s). composer.lock atualizado.`;
        } catch (error) { $('composerStatus').textContent = error.name === 'AbortError' ? 'Instalação excedeu o prazo. Aguarde e tente novamente.' : error.message; }
        finally { unlock(); clearTimeout(timer); $('composerInstallBtn').disabled = false; }
    }

    async function start() {
        if (localStorage.getItem('phpstudio-theme') === 'light') document.body.classList.add('light');
        editor = StudioEditor.create($('advancedEditor'), text => {
            if (!current) return; current.files[current.active] = text; $('editor').value = text;
            $('fileSize').textContent = new Blob([text]).size.toLocaleString('pt-BR') + ' B';
            if (language(current.active) === 'twig') diagnostics([], current.active);
            scheduleSave();
        }, diagnostics, (line, column) => { $('editorStats').textContent = `Linha ${line}, coluna ${column}`; });
        const last = await storage.get('lastProject'); current = last && await storage.project(last);
        if (!current) {
            current = fresh();
            try {
                const legacy = JSON.parse(localStorage.getItem('fitowaylabs.phpstudio.project.v1'));
                const starter = { 'index.php': 1490271192, 'index.html': 3113143653, 'style.css': 2816130136, 'script.js': 3360369668 };
                const unchanged = legacy?.files && Object.keys(legacy.files).length === 4 && Object.entries(starter).every(([name, expected]) => {
                    let hash = 2166136261; for (const char of legacy.files[name] || '') hash = Math.imul(hash ^ char.charCodeAt(0), 16777619); return (hash >>> 0) === expected;
                });
                if (legacy?.files && !unchanged) {
                    const files = Object.fromEntries(Object.entries(legacy.files).filter(([name, content]) => { try { path(name); return typeof content === 'string'; } catch { return false; } }));
                    if (Object.keys(files).length) { current.files = files; current.active = Object.hasOwn(files, legacy.active) ? legacy.active : Object.keys(files)[0]; }
                }
            } catch { /* A corrupt legacy record must not prevent opening a fresh project. */ }
            await storage.save(current); await storage.set('lastProject', current.id);
        }
        history = await storage.get('apiHistory') || []; collections = await storage.get('apiCollections') || [];
        render(); await projectOptions(); renderRequests(); $('saveStatus').textContent = '● Salvo no dispositivo';
        $('newFileBtn').onclick = $('sideAdd').onclick = async () => { const name = await ask('Novo arquivo', 'Informe o caminho e a extensão.', 'novo.php'); if (name) try { addFile(name); } catch (error) { notify(error.message); } };
        $('saveBtn').onclick = async () => { await persist(); notify('Projeto salvo.'); };
        $('newProjectBtn').onclick = async () => {
            const name = await ask('Novo projeto', 'Escolha um nome para o projeto.', 'Meu projeto'); if (!name) return;
            await persist(); PHPStudioPreview.reset(); current = fresh(name); await storage.save(current); await storage.set('lastProject', current.id); render(); await projectOptions();
        };
        $('projectSelect').onchange = async event => {
            const id = event.target.value; await persist(); const next = await storage.project(id);
            if (next) { PHPStudioPreview.reset(); current = next; await storage.set('lastProject', id); render(); }
        };
        $('renameFileBtn').onclick = async () => {
            const raw = await ask('Renomear arquivo', 'As referências no código devem acompanhar o novo nome.', current.active); if (!raw) return;
            try { const name = path(raw); if (name === current.active) return; if (Object.hasOwn(current.files, name)) throw new Error('Esse arquivo já existe.'); sync(); current.files[name] = current.files[current.active]; delete current.files[current.active]; editor.forget(current.active); current.active = name; render(); scheduleSave(); } catch (error) { notify(error.message); }
        };
        $('deleteFileBtn').onclick = async () => {
            if (!await ask('Excluir arquivo', `Excluir ${current.active} deste projeto?`)) return;
            delete current.files[current.active]; editor.forget(current.active);
            if (!Object.keys(current.files).length) current.files['index.php'] = '';
            current.active = Object.keys(current.files)[0]; render(); scheduleSave();
        };
        $('resetBtn').onclick = async () => {
            if (!await ask('Limpar projeto', 'Os arquivos e o banco deste projeto serão apagados. Exporte o projeto em ZIP para guardar uma cópia.')) return;
            PHPStudioPreview.reset(); current.files = { 'index.php': '' }; current.active = 'index.php'; current.database = new Uint8Array(); current.runtimeId = crypto.randomUUID(); render(); await persist();
        };
        $('syntaxSelect').onchange = async event => {
            const extension = event.target.value, name = current.active.replace(/\.[^/.]+$/, '') + '.' + extension;
            if (name !== current.active) {
                if (Object.hasOwn(current.files, name)) { event.target.value = language(current.active); notify('Já existe um arquivo com essa extensão.'); return; }
                sync(); current.files[name] = current.files[current.active]; delete current.files[current.active]; current.active = name; render(); scheduleSave();
            }
        };
        $('formatBtn').onclick = async () => { try { await editor.format(); notify('Código formatado.'); } catch (error) { notify(error.message); } };
        $('analyzeBtn').onclick = async () => {
            const unlock = lockProject(); $('analyzeBtn').disabled = true;
            try {
                sync(); const name = current.active;
                if (language(name) === 'twig') diagnostics(await PHPStudioPreview.analyzeTwig(current.files, name, settings()), name);
                else diagnostics(await editor.check(), name);
            } catch (error) { notify(error.message); }
            finally { unlock(); $('analyzeBtn').disabled = false; }
        };
        $('copyAllBtn').onclick = async () => { await navigator.clipboard.writeText(editor.value()); notify('Código copiado.'); };
        $('importBtn').onclick = () => $('fileInput').click(); $('fileInput').onchange = event => importFiles(event.target.files);
        $('exportZipBtn').onclick = () => exportProject().catch(error => notify(error.message));
        $('downloadFileBtn').onclick = () => { sync(); download(current.files[current.active], current.active.split('/').at(-1), 'text/plain;charset=utf-8'); };
        const run = async () => { const unlock = lockProject(); try { sync(); await persist(); await PHPStudioPreview.run(current.files, current.active, settings()); await persist(); } finally { unlock(); } };
        $('previewBtn').onclick = run;
        $('expandPreviewBtn').onclick = async () => { await run(); try { await $('previewFrame').requestFullscreen(); } catch { $('previewFrame').scrollIntoView({ block: 'center' }); } };
        $('heroExample').onclick = () => { $('workspace').scrollIntoView({ behavior: 'smooth' }); run(); };
        $('twigConvertBtn').onclick = () => {
            sync(); let output = current.files[current.active].replace(/<\?=\s*\$(\w+)\s*\?>/g, '{{ $1 }}').replace(/<\?php\s+echo\s+\$(\w+)\s*;\s*\?>/g, '{{ $1 }}').replace(/<\?php[\s\S]*?\?>/g, match => '{# Bloco PHP para revisar: ' + match.replaceAll('#', '') + ' #}');
            let name = current.active.replace(/\.[^.]+$/, '') + '.twig', number = 2;
            while (Object.hasOwn(current.files, name)) name = current.active.replace(/\.[^.]+$/, '') + '-' + number++ + '.twig';
            addFile(name, output); notify('Twig criado. Revise a conversão.');
        };
        $('themeToggle').onclick = () => { const light = document.body.classList.toggle('light'); editor.theme(light); localStorage.setItem('phpstudio-theme', light ? 'light' : 'dark'); };
        $('languageInfo').onclick = () => notify('PHP Studio está disponível em português do Brasil.');
        $('consoleLevel').onchange = $('consoleSearch').oninput = renderConsole;
        $('clearConsoleBtn').onclick = () => { logs = []; renderConsole(); };
        $('copyConsoleBtn').onclick = () => navigator.clipboard.writeText(logs.map(row => `${row.level} ${row.file || ''}:${row.line || 1} ${row.message}`).join('\n'));
        $('apiSendBtn').onclick = sendAPI;
        $('apiCancelBtn').onclick = () => { apiAbort?.abort(); PHPStudioPreview.cancel(); apiSequence++; $('apiStatus').textContent = 'Requisição cancelada.'; $('apiSendBtn').disabled = false; $('apiCancelBtn').disabled = true; };
        $('apiTarget').onchange = () => { $('apiUrl').placeholder = $('apiTarget').value === 'project' ? '/api.php' : 'https://'; };
        $('apiHistory').onchange = event => { if (event.target.value !== '') restoreRequest(history[Number(event.target.value)]); };
        $('apiCollections').onchange = event => { if (event.target.value !== '') restoreRequest(collections[Number(event.target.value)]); };
        $('apiSaveBtn').onclick = async () => {
            try { const request = safeRequest(apiInput()), name = await ask('Salvar requisição', 'Escolha o nome da requisição na coleção.', `${request.method} ${request.url}`); if (!name) return; collections.push({ ...request, name }); await storage.set('apiCollections', collections); renderRequests(); } catch (error) { notify(error.message); }
        };
        $('apiDeleteBtn').onclick = async () => { if ($('apiCollections').value === '') return; collections.splice(Number($('apiCollections').value), 1); await storage.set('apiCollections', collections); renderRequests(); };
        $('composerInstallBtn').onclick = installComposer;
        $('sqlRunBtn').onclick = () => sql(); $('sqlScriptBtn').onclick = () => sql('script');
        $('sqlImportBtn').onclick = () => $('sqlInput').click();
        $('sqlInput').onchange = async event => { const file = event.target.files[0]; if (file) { if (file.size > 2000000) notify('Limite de 2 MB para SQL.'); else await sql('script', await file.text()); } event.target.value = ''; };
        $('dbImportBtn').onclick = () => $('databaseInput').click();
        $('databaseInput').onchange = async event => { const file = event.target.files[0]; if (file) try { await replaceDatabase(new Uint8Array(await file.arrayBuffer())); } catch (error) { notify(error.message); } event.target.value = ''; };
        $('dbExportBtn').onclick = () => current.database?.length ? download(current.database, 'project.sqlite') : notify('O projeto ainda não tem um banco. Execute uma consulta para criá-lo.');
        document.addEventListener('keydown', event => {
            if (!(event.ctrlKey || event.metaKey)) return;
            if (event.key.toLowerCase() === 's') { event.preventDefault(); persist(); }
            if (event.key === 'Enter') { event.preventDefault(); run(); }
            if (event.shiftKey && event.key.toLowerCase() === 'f') { event.preventDefault(); $('formatBtn').click(); }
        });
        document.addEventListener('studio:database', ({ detail }) => {
            if (detail.id !== current.runtimeId) return;
            if (current.database.length === detail.database.length && current.database.every((byte, index) => byte === detail.database[index])) return;
            current.database = detail.database; persist();
        });
        document.addEventListener('studio:log', ({ detail }) => appendLog(detail));
        document.addEventListener('studio:clear-console', () => { logs = []; renderConsole(); });
        const installHelp = () => ask('Instalar PHP Studio', 'No Android, use Instalar aplicativo no menu do Chrome. No Safari do iPhone/iPad, use Compartilhar e Adicionar à Tela de Início.');
        window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstall = event; });
        $('androidInstall').onclick = async () => { if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; } else installHelp(); };
        $('appleInstall').onclick = installHelp;
        window.PHPStudio = { get files() { sync(); return current.files; }, get active() { return current.active; }, editor, choose, addFile, persist, settings, get project() { return current; } };
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
    start().catch(error => { $('saveStatus').textContent = '● Falha ao iniciar'; notify('Falha ao iniciar o editor. ' + error.message); });
})();
