<?php
header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Permissions-Policy: camera=(), microphone=(), geolocation=()');
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1020"><meta name="description" content="Fitowaylabs PHP Studio: editor gratuito de PHP, HTML, CSS, JavaScript e Twig, com arquivos locais, visualização e exportação ZIP.">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="assets/icon-192.png" type="image/png"><link rel="apple-touch-icon" href="assets/icon-192.png">
<title>PHP Studio • Fitowaylabs — Editor de código gratuito</title>
<link rel="stylesheet" href="assets/style.css?v=1">
</head>
<body>
<div id="app">
<header class="topbar shell">
 <a class="brand" href="#inicio" aria-label="Página inicial PHP Studio"><span class="brand-mark">&lt;/&gt;</span><span><strong>PHP Studio</strong><small>FITOWAYLABS · CRIE. EDITE. EXPORTE.</small></span></a>
 <div class="top-actions"><button class="icon-btn" id="themeToggle" title="Alternar tema" aria-label="Alternar tema">☀</button><button class="icon-btn" id="languageInfo" title="Editor em português" aria-label="Idioma">🌐</button></div>
</header>
<main class="shell">
 <section class="hero" id="inicio"><div class="hero-main"><span class="eyebrow">✦ EDITOR DE CÓDIGO GRATUITO</span><h1>Transforme ideias em <em>código de verdade.</em></h1><p>Edite PHP, HTML, CSS, JavaScript e Twig em um único lugar. Organize seus projetos, visualize páginas e exporte tudo em ZIP.</p><div class="hero-buttons"><a class="btn btn-primary" href="#workspace">Abrir editor <span>↗</span></a><button class="btn btn-outline" id="heroExample">Carregar exemplo</button></div></div><div class="hero-code" aria-hidden="true"><span class="windowdots">● ● ●</span><div class="filechip">● index.php</div><pre><span class="pink">&lt;?php</span>
<span class="muted">// Suas ideias começam aqui</span>
<span class="sky">$ideia</span> = <span class="yellow">"algo incrível"</span>;
<span class="pink">echo</span> <span class="sky">$ideia</span>;
<span class="pink">?&gt;</span></pre></div></section>
 <section class="workspace-section" id="workspace"><div class="section-heading"><div><span class="eyebrow muted-label">SEU AMBIENTE DE DESENVOLVIMENTO</span><h2>Seu espaço de trabalho</h2><p class="subcopy">Seus arquivos ficam salvos neste navegador. Nenhum projeto é enviado ao servidor.</p></div><span class="status-pill" id="saveStatus">● Pronto para editar</span></div>
 <div class="toolbar"><div class="toolbar-group"><button class="toolbtn active" id="newFileBtn">＋ Novo arquivo</button><button class="toolbtn" id="importBtn">⇧ Importar</button><button class="toolbtn" id="saveBtn">◈ Salvar</button></div><div class="toolbar-group"><button class="toolbtn" id="downloadFileBtn">↓ Arquivo</button><button class="toolbtn" id="exportZipBtn">▣ Exportar ZIP</button><button class="toolbtn danger-quiet" id="resetBtn">↻ Limpar projeto</button></div></div>
 <div class="editor-layout"><aside class="file-sidebar"><div class="side-title"><span>EXPLORADOR</span><button id="sideAdd" aria-label="Adicionar arquivo" title="Adicionar arquivo">＋</button></div><div class="project-title">▾ MEU PROJETO</div><div id="fileList" class="file-list" role="listbox" aria-label="Arquivos do projeto"></div><div class="side-help">Os arquivos permanecem no dispositivo até você limpar os dados do navegador.</div></aside>
 <div class="editor-main"><div class="editor-tabs"><div class="tab-strip" id="tabStrip"></div><select id="syntaxSelect" title="Linguagem de edição" aria-label="Linguagem"><option value="php">PHP</option><option value="html">HTML</option><option value="css">CSS</option><option value="js">JavaScript</option><option value="twig">Twig</option><option value="txt">Texto</option></select></div>
 <div class="code-area" id="codeArea"><div class="line-numbers" id="lineNumbers" aria-hidden="true">1</div><div class="code-stack" id="codeStack"><pre class="syntax-highlight" id="highlight" aria-hidden="true"><code id="highlightCode"></code></pre><textarea id="editor" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" aria-label="Editor de código" wrap="off"></textarea></div><button id="copyAllBtn" class="copy-floating" title="Copiar todo o código" aria-label="Copiar todo o código">▢ Copiar tudo</button></div>
 <div class="editor-bottom"><span id="editorStats">Linha 1, Coluna 1</span><span id="editorLanguage">PHP</span><span>UTF-8</span><span id="fileSize">0 B</span></div></div></div>
 <div class="lower-grid"><section class="panel"><div class="panel-title"><h3>◈ Visualização</h3><div class="panel-actions"><button class="smallbtn" id="previewBtn">▶ Visualizar HTML</button><button class="smallbtn" id="expandPreviewBtn">⤢ Ampliar</button></div></div><div class="preview-hint" id="previewHint">Visualização isolada para HTML, CSS e JavaScript. PHP exige um servidor PHP e não é executado aqui.</div><iframe id="previewFrame" title="Pré-visualização do projeto" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe></section>
 <section class="panel tools-panel"><div class="panel-title"><h3>⇄ Ferramentas Twig</h3></div><p>Edite modelos <code>.twig</code> ou converta estruturas básicas de HTML e PHP para Twig.</p><label for="twigMode">Tipo de conversão</label><select id="twigMode"><option value="php">PHP simples → Twig</option><option value="html">HTML → Twig (modelo)</option></select><button class="btn btn-secondary wide" id="twigConvertBtn">Converter para novo arquivo .twig</button><div class="tool-notice">Conversão assistida: revise expressões, condições e laços complexos antes de usar em produção.</div><div class="shortcuts"><b>Atalhos úteis</b><span>Ctrl/⌘ + S: salvar</span><span>Tab: indentar código</span><span>Ctrl/⌘ + Enter: visualizar</span></div></section></div>
 </section>
 <section class="install-section" id="aplicativos"><div><span class="eyebrow">USE EM QUALQUER LUGAR</span><h2>Leve seu editor com você</h2><p>Instale como aplicativo web no celular ou computador. Ele pode funcionar offline após o primeiro carregamento e preserva seus projetos neste navegador.</p></div><div class="install-buttons"><button class="storebtn" id="androidInstall"><span class="store-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.6 9.48 19.4 6.4a.4.4 0 0 0-.15-.55.4.4 0 0 0-.55.15l-1.83 3.15a11.4 11.4 0 0 0-9.75 0L5.29 6a.4.4 0 0 0-.55-.15.4.4 0 0 0-.15.55L6.4 9.48A9.3 9.3 0 0 0 2 17h20a9.3 9.3 0 0 0-4.4-7.52ZM8 14.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm8 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM2 18h20v2H2v-2Z"/></svg></span><span><small>Instalar no</small><strong>Android</strong></span></button><button class="storebtn" id="appleInstall"><span class="store-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.05 12.54c.03 2.8 2.45 3.73 2.48 3.75-.02.06-.39 1.34-1.27 2.67-.77 1.15-1.56 2.3-2.81 2.32-1.23.02-1.62-.75-3.02-.75-1.4 0-1.84.73-3 .77-1.21.04-2.13-1.24-2.91-2.39-1.6-2.32-2.82-6.56-1.18-9.41a4.48 4.48 0 0 1 3.77-2.3c1.17-.02 2.27.8 3 .8.73 0 2.1-.99 3.54-.84.6.02 2.28.24 3.37 1.82-.09.06-2.01 1.17-1.99 3.56ZM14.76 5.5c.65-.79 1.08-1.88.96-2.97-.93.04-2.05.63-2.72 1.42-.6.7-1.12 1.81-.98 2.88 1.05.08 2.12-.54 2.74-1.33Z"/></svg></span><span><small>Adicionar no</small><strong>iPhone / iPad</strong></span></button></div><p class="install-disclaimer">Não são arquivos APK/IPA: os botões instalam ou orientam a adicionar a versão PWA. Aplicativos nativos assinados exigem builds e distribuição separados.</p></section>
</main>
<footer><div class="shell footer-inner"><span>Copyright © 2026 · Criado por: <a href="https://fitowaylabs.com.br" target="_blank" rel="noopener noreferrer">Fitowaylabs</a> · Todos os direitos reservados.</span><a href="#inicio">↑ Voltar ao topo</a></div></footer>
</div>
<input id="fileInput" type="file" multiple accept=".php,.html,.htm,.css,.js,.mjs,.twig,.txt,.json,.md,.zip,.xml,.svg" hidden>
<dialog id="modal"><div class="dialog-body"><div class="dialog-header"><h3 id="modalTitle">Informação</h3><button id="closeModal" aria-label="Fechar">✕</button></div><div id="modalBody"></div><div class="dialog-buttons" id="modalButtons"></div></div></dialog>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="vendor/jszip.min.js?v=1" defer></script><script src="assets/app.js?v=1" defer></script>
</body></html>
