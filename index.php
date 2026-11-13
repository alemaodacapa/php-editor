<?php
session_start(['cookie_httponly' => true, 'cookie_secure' => !empty($_SERVER['HTTPS']), 'cookie_samesite' => 'Strict']);
$_SESSION['studio_csrf'] ??= bin2hex(random_bytes(32));
$studioCsrf = $_SESSION['studio_csrf'];
session_write_close();
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');

// Configurações de SEO
$siteName = 'PHP Studio — Fitowaylabs';
$siteUrl = 'https://peachpuff-goat-805422.hostingersite.com/';
$siteTitle = 'PHP Studio | Editor PHP, HTML, CSS, JavaScript e Twig Grátis';
$siteDescription = 'Editor de código gratuito e em português para PHP, HTML, CSS, JavaScript e Twig. Crie, edite, salve, importe e exporte projetos ZIP. Instale como aplicativo web.';
$ogImage = $siteUrl . 'assets/meta-og.png';

// Escapar valores para atributos HTML
function seo_escape(string $value): string {
    return htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
}

$structuredData = [
    '@context' => 'https://schema.org',
    '@type' => 'WebApplication',
    'name' => 'PHP Studio',
    'url' => $siteUrl,
    'description' => $siteDescription,
    'applicationCategory' => 'DeveloperApplication',
    'operatingSystem' => 'Web, Android, iOS, Windows, macOS, Linux',
    'inLanguage' => 'pt-BR',
    'isAccessibleForFree' => true,
    'offers' => [
        '@type' => 'Offer',
        'price' => '0',
        'priceCurrency' => 'BRL'
    ],
    'author' => [
        '@type' => 'Organization',
        'name' => 'Fitowaylabs',
        'url' => 'https://fitowaylabs.com.br/'
    ],
    'codeRepository' => 'https://github.com/alemaodacapa/php-editor'
];
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <!-- Configurações básicas -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

    <title><?= seo_escape($siteTitle) ?></title>

    <!-- SEO -->
    <meta name="description" content="<?= seo_escape($siteDescription) ?>">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="author" content="Fitowaylabs">
    <meta name="application-name" content="PHP Studio">
    <meta name="color-scheme" content="dark light">

    <!-- URL canônica -->
    <link rel="canonical" href="<?= seo_escape($siteUrl) ?>">

    <!-- Open Graph: Facebook, WhatsApp e LinkedIn -->
    <meta property="og:type" content="website">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:site_name" content="<?= seo_escape($siteName) ?>">
    <meta property="og:title" content="<?= seo_escape($siteTitle) ?>">
    <meta property="og:description" content="<?= seo_escape($siteDescription) ?>">
    <meta property="og:url" content="<?= seo_escape($siteUrl) ?>">

    <!-- Imagem Open Graph -->
    <meta property="og:image" content="<?= seo_escape($ogImage) ?>">
    <meta property="og:image:secure_url" content="<?= seo_escape($ogImage) ?>">
    <meta property="og:image:type" content="assets/meta-og.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="PHP Studio da Fitowaylabs: editor gratuito de PHP, HTML, CSS, JavaScript e Twig.">

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?= seo_escape($siteTitle) ?>">
    <meta name="twitter:description" content="<?= seo_escape($siteDescription) ?>">
    <meta name="twitter:image" content="<?= seo_escape($ogImage) ?>">
    <meta name="twitter:image:alt" content="PHP Studio — Editor de código gratuito da Fitowaylabs">

    <!-- PWA e aparência -->
    <meta name="theme-color" content="#0b1020">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="PHP Studio">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

    <!-- Manifesto e ícones -->
    <link rel="manifest" href="manifest.webmanifest">
    <link rel="icon" href="assets/icon-192.png" type="image/png">
    <link rel="apple-touch-icon" href="assets/icon-192.png">

    <!-- Dados estruturados: Google -->
    <script type="application/ld+json">
    <?= json_encode(
        $structuredData,
        JSON_UNESCAPED_UNICODE |
        JSON_UNESCAPED_SLASHES |
        JSON_HEX_TAG |
        JSON_HEX_AMP |
        JSON_HEX_APOS |
        JSON_HEX_QUOT
    ) ?>
    </script>

    <!-- CSS principal -->
    <link rel="stylesheet" href="assets/style.css?v=5">
</head>
<body data-studio-csrf="<?= seo_escape($studioCsrf) ?>">
<div id="app">
<header class="topbar shell">
 <a class="brand" href="#inicio" aria-label="Página inicial PHP Studio"><span class="brand-mark">&lt;/&gt;</span><span><strong>PHP Studio</strong><small>FITOWAYLABS · CRIE. EDITE. EXPORTE.</small></span></a>
 <div class="top-actions"><button class="icon-btn" id="themeToggle" title="Alternar tema" aria-label="Alternar tema">☀</button><button class="icon-btn" id="languageInfo" title="Editor em português" aria-label="Idioma">🌐</button></div>
</header>
<main class="shell">
 <section class="hero" id="inicio"><div class="hero-main"><span class="eyebrow">✦ EDITOR DE CÓDIGO GRATUITO</span><h1>Transforme ideias em <em>código de verdade.</em></h1><p>Edite PHP, HTML, CSS, JavaScript e Twig em um único lugar. Organize seus projetos, visualize páginas e exporte tudo em ZIP.</p><div class="hero-buttons"><a class="btn btn-primary" href="#workspace">Abrir editor <span>↗</span></a><button class="btn btn-outline" id="heroExample">Executar projeto</button></div></div><div class="hero-code" aria-hidden="true"><span class="windowdots">● ● ●</span><div class="filechip">● index.php</div><pre>PHP · HTML · CSS
JavaScript · Twig

Cole seu código no editor.
Execute e veja o resultado.</pre></div></section>
 <section class="workspace-section" id="workspace"><div class="section-heading"><div><span class="eyebrow muted-label">SEU AMBIENTE DE DESENVOLVIMENTO</span><h2>Seu espaço de trabalho</h2><p class="subcopy">Seus arquivos ficam salvos neste navegador. PHP e Twig são executados em um ambiente isolado neste navegador.</p></div><span class="status-pill" id="saveStatus">● Pronto para editar</span></div>
 <div class="toolbar"><div class="toolbar-group"><select id="projectSelect" aria-label="Projeto aberto"></select><button class="toolbtn" id="newProjectBtn">＋ Projeto</button><button class="toolbtn active" id="newFileBtn">＋ Novo arquivo</button><button class="toolbtn" id="importBtn">⇧ Importar</button><button class="toolbtn" id="saveBtn">◈ Salvar</button><button class="toolbtn" id="formatBtn">Formatar</button><button class="toolbtn" id="analyzeBtn">Analisar</button></div><div class="toolbar-group"><button class="toolbtn" id="renameFileBtn">Renomear</button><button class="toolbtn" id="deleteFileBtn">Excluir arquivo</button><button class="toolbtn" id="downloadFileBtn">↓ Arquivo</button><button class="toolbtn" id="exportZipBtn">▣ Exportar ZIP</button><button class="toolbtn danger-quiet" id="resetBtn">↻ Limpar projeto</button></div></div>
 <div class="editor-layout"><aside class="file-sidebar"><div class="side-title"><span>EXPLORADOR</span><button id="sideAdd" aria-label="Adicionar arquivo" title="Adicionar arquivo">＋</button></div><div class="project-title">▾ MEU PROJETO</div><div id="fileList" class="file-list" role="listbox" aria-label="Arquivos do projeto"></div><div class="side-help">Os arquivos permanecem no dispositivo até você limpar os dados do navegador.</div></aside>
 <div class="editor-main"><div class="editor-tabs"><div class="tab-strip" id="tabStrip"></div><select id="syntaxSelect" title="Linguagem de edição" aria-label="Linguagem"><option value="php">PHP</option><option value="html">HTML</option><option value="css">CSS</option><option value="js">JavaScript</option><option value="twig">Twig</option><option value="json">JSON</option><option value="txt">Texto</option></select></div>
 <div class="code-area" id="codeArea"><div id="advancedEditor"></div><textarea id="editor" hidden aria-hidden="true"></textarea><button id="copyAllBtn" class="copy-floating" title="Copiar todo o código" aria-label="Copiar todo o código">▢ Copiar tudo</button></div>
 <div class="editor-bottom"><span id="editorStats">Linha 1, Coluna 1</span><span id="editorLanguage">PHP</span><span>UTF-8</span><span id="fileSize">0 B</span></div></div></div>
 <div class="lower-grid"><section class="panel"><div class="panel-title"><h3>◈ Visualização</h3><div class="panel-actions"><button class="smallbtn" id="previewBtn">▶ Run · Executar</button><button class="smallbtn" id="expandPreviewBtn">⤢ Ampliar</button></div></div><div class="preview-hint" id="previewHint">Cole seu código e clique em Run. PHP 8.3, HTML, CSS, JavaScript e Twig com execução real.</div><iframe id="previewFrame" title="Pré-visualização do projeto" sandbox="allow-scripts allow-forms allow-downloads allow-modals" referrerpolicy="no-referrer"></iframe></section>
 <section class="panel tools-panel"><div class="panel-title"><h3>⇄ Ferramentas Twig</h3></div><p>Execute modelos <code>.twig</code> com o interpretador Twig. Para usar variáveis, crie um arquivo <code>context.json</code> na pasta do modelo. A conversão abaixo auxilia a migração de PHP.</p><label for="twigMode">Tipo de conversão</label><select id="twigMode"><option value="php">PHP simples → Twig</option><option value="html">HTML → Twig (modelo)</option></select><button class="btn btn-secondary wide" id="twigConvertBtn">Converter para novo arquivo .twig</button><div class="tool-notice">Conversão assistida: revise expressões, condições e laços complexos antes de usar em produção.</div><div class="shortcuts"><b>Atalhos úteis</b><span>Ctrl/⌘ + S: salvar</span><span>Tab: indentar código</span><span>Ctrl/⌘ + Enter: visualizar</span></div></section></div>

 <section class="panel studio-panel" aria-labelledby="diagnosticsTitle"><div class="panel-title"><h3 id="diagnosticsTitle">Diagnósticos do arquivo</h3><span id="diagnosticsSummary">Aguardando análise</span></div><ol id="diagnosticsList"></ol></section>
 <section class="panel studio-panel" aria-labelledby="consoleTitle"><div class="panel-title"><h3 id="consoleTitle">Console de execução</h3><div class="panel-actions"><select id="consoleLevel" aria-label="Filtrar nível do console"><option value="all">Todos os níveis</option><option value="error">Erros</option><option value="warn">Avisos</option><option value="log">Logs</option><option value="info">Informações</option><option value="network">Requisições</option></select><input id="consoleSearch" placeholder="Filtrar mensagens" aria-label="Buscar no console"><button class="smallbtn" id="copyConsoleBtn">Copiar</button><button class="smallbtn" id="clearConsoleBtn">Limpar</button></div></div><div id="consoleEntries" class="console-entries" role="log" aria-label="Histórico do console"></div></section>
 <section class="panel studio-panel" aria-labelledby="apiTitle"><div class="panel-title"><h3 id="apiTitle">Testador de APIs</h3></div>
 <div class="studio-fields"><label>Destino<select id="apiTarget"><option value="project">Projeto aberto</option><option value="external">API externa</option></select></label><label>Método<select id="apiMethod"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option><option>HEAD</option><option>OPTIONS</option></select></label><label class="grow">URL<input id="apiUrl" placeholder="/api.php" autocomplete="off" spellcheck="false"></label><button id="apiSendBtn" class="toolbtn active">Enviar</button><button id="apiCancelBtn" class="toolbtn" disabled>Cancelar</button></div>
 <div class="studio-fields"><label class="grow">Headers em JSON<textarea id="apiHeaders" rows="3" spellcheck="false">{}</textarea></label><label class="grow">Corpo da requisição<textarea id="apiBody" rows="3" spellcheck="false" placeholder="JSON, formulário ou texto"></textarea></label><label>Bearer token<input id="apiToken" type="password" autocomplete="off" placeholder="Opcional"></label></div>
 <p class="subcopy">Tokens e corpos ficam somente nesta sessão. Histórico e coleções guardam método, URL e headers sem credenciais. APIs externas precisam permitir CORS.</p>
 <div class="studio-fields"><label class="grow">Histórico<select id="apiHistory"><option value="">Requisições recentes</option></select></label><label class="grow">Coleções<select id="apiCollections"><option value="">Requisições salvas</option></select></label><button id="apiSaveBtn" class="toolbtn">Salvar requisição</button><button id="apiDeleteBtn" class="toolbtn">Excluir salva</button></div>
 <div id="apiStatus" role="status">Pronto para enviar</div><details><summary>Headers da resposta</summary><pre id="apiResponseHeaders" class="studio-output"></pre></details><pre id="apiResponse" class="studio-output" aria-label="Resposta da API"></pre></section>
 <section class="panel studio-panel" aria-labelledby="environmentTitle"><div class="panel-title"><h3 id="environmentTitle">Ambiente do projeto · Composer e SQLite</h3></div>
 <p class="subcopy">Instale dependências públicas definidas em composer.json. O Composer resolve e baixa os pacotes na hospedagem com scripts e plugins desativados. O código dos projetos executa no PHP isolado do navegador.</p><div class="studio-fields"><button id="composerInstallBtn" class="toolbtn active">Instalar dependências</button><span id="composerStatus" role="status"></span></div>
 <details><summary>Como conectar o PHP ao banco deste projeto</summary><p>Use <code>$pdo = studio_db();</code> ou <code>new PDO('sqlite:' . getenv('STUDIO_DB_PATH'))</code>. O banco é salvo com o projeto neste navegador. Dependências que exigem MySQL, processos do sistema ou extensões adicionais precisam de um servidor compatível.</p></details>
 <label class="studio-sql-label" for="sqlEditor">Consulta ou script SQL</label><textarea id="sqlEditor" class="studio-sql" rows="5" spellcheck="false" placeholder="Digite sua consulta SQL"></textarea><div class="studio-fields"><button id="sqlRunBtn" class="toolbtn active">Executar consulta</button><button id="sqlScriptBtn" class="toolbtn">Executar script</button><button id="sqlImportBtn" class="toolbtn">Importar SQL</button><button id="dbImportBtn" class="toolbtn">Importar SQLite</button><button id="dbExportBtn" class="toolbtn">Exportar SQLite</button><span id="sqlStatus" role="status"></span></div><div id="sqlResults" class="sql-results"></div>
 <input id="sqlInput" type="file" accept=".sql" hidden><input id="databaseInput" type="file" accept=".sqlite,.sqlite3,.db" hidden></section>
 </section>
 <section class="install-section" id="aplicativos"><div><span class="eyebrow">USE EM QUALQUER LUGAR</span><h2>Leve seu editor com você</h2><p>Instale como aplicativo web no celular ou computador. Os projetos são preservados neste navegador. Carregue o interpretador PHP online antes de usá-lo sem conexão.</p></div><div class="install-buttons"><button class="storebtn" id="androidInstall"><span class="store-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 9.48 19.4 6.4a.4.4 0 0 0-.15-.55.4.4 0 0 0-.55.15l-1.83 3.15a11.4 11.4 0 0 0-9.75 0L5.29 6a.4.4 0 0 0-.55-.15.4.4 0 0 0-.15.55L6.4 9.48A9.3 9.3 0 0 0 2 17h20a9.3 9.3 0 0 0-4.4-7.52ZM8 14.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm8 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM2 18h20v2H2v-2Z"/></svg></span><span><small>Instalar no</small><strong>Android</strong></span></button><button class="storebtn" id="appleInstall"><span class="store-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c.03 2.8 2.45 3.73 2.48 3.75-.02.06-.39 1.34-1.27 2.67-.77 1.15-1.56 2.3-2.81 2.32-1.23.02-1.62-.75-3.02-.75-1.4 0-1.84.73-3 .77-1.21.04-2.13-1.24-2.91-2.39-1.6-2.32-2.82-6.56-1.18-9.41a4.48 4.48 0 0 1 3.77-2.3c1.17-.02 2.27.8 3 .8.73 0 2.1-.99 3.54-.84.6.02 2.28.24 3.37 1.82-.09.06-2.01 1.17-1.99 3.56ZM14.76 5.5c.65-.79 1.08-1.88.96-2.97-.93.04-2.05.63-2.72 1.42-.6.7-1.12 1.81-.98 2.88 1.05.08 2.12-.54 2.74-1.33Z"/></svg></span><span><small>Adicionar no</small><strong>iPhone / iPad</strong></span></button></div><p class="install-disclaimer">Não são arquivos APK/IPA: os botões instalam ou orientam a adicionar a versão PWA. Aplicativos nativos assinados exigem builds e distribuição separados.</p></section>
</main>
<footer><div class="shell footer-inner"><span>Copyright © 2026 · Criado por: <a href="https://fitowaylabs.com.br" target="_blank" rel="noopener noreferrer">Fitowaylabs</a> · Todos os direitos reservados.</span><a href="#inicio">↑ Voltar ao topo</a></div></footer>
</div>
<input id="fileInput" type="file" multiple accept=".php,.html,.htm,.css,.js,.mjs,.twig,.txt,.json,.lock,.md,.zip,.xml,.svg,.sql,.inc" hidden>
<dialog id="modal"><div class="dialog-body"><div class="dialog-header"><h3 id="modalTitle">Informação</h3><button id="closeModal" aria-label="Fechar">✕</button></div><div id="modalBody"></div><div class="dialog-buttons" id="modalButtons"></div></div></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="vendor/jszip.min.js?v=1" defer></script><script src="assets/storage.js?v=5" defer></script><script src="assets/editor.bundle.js?v=5" defer></script><script src="assets/preview.js?v=5" defer></script><script src="assets/app.js?v=5" defer></script>
</body></html>

