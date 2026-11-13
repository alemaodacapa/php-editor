# PHP Studio — Editor de Código | Fitowaylabs

Editor gratuito e responsivo de **PHP, HTML, CSS, JavaScript e Twig**, em português do Brasil. Interface escura inspirada em um ambiente moderno de desenvolvimento, com opção de tema claro. Projeto independente de domínio, adequado para hospedagem compartilhada **Hostinger** e distribuição pública no GitHub.

**Editor online:** https://peachpuff-goat-805422.hostingersite.com/  
**Repositório:** https://github.com/alemaodacapa/php-editor  
**Desenvolvido por:** [Fitowaylabs](https://fitowaylabs.com.br) · © 2026.

## Funcionalidades

- Criar e editar arquivos `.php`, `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.twig` e texto; abas, explorador e numeração de linhas.
- Salvar o projeto automaticamente no `localStorage` do dispositivo, com botão **Salvar** e atalho `Ctrl/Cmd + S`.
- Importar arquivos de texto ou projetos em `.zip`; exportar o projeto inteiro como `.zip`; baixar o arquivo ativo.
- Copiar todo o código pelo botão discreto no canto inferior do editor (temporariamente oculto durante a rolagem).
- Executar PHP 8.3.36 em WebAssembly e visualizar HTML, CSS e JavaScript em um iframe isolado. O botão **Run** e o atalho `Ctrl/Cmd + Enter` executam o projeto.
- Resolver arquivos locais de CSS e JavaScript, módulos ES, navegação interna, formulários GET/POST e chamadas `fetch` para arquivos PHP do projeto.
- Mostrar erros de PHP e mensagens de console JavaScript na prévia. Execuções PHP que excedem o prazo são interrompidas e podem ser reiniciadas.
- Iniciar projetos com `index.php` vazio, com preservação dos projetos já salvos.
- Executar templates Twig com herança, includes, filtros e laços. Variáveis podem ser fornecidas em `context.json` na pasta do template. A conversão assistida de padrões simples de PHP permanece disponível.
- Interface adaptável a computadores e celulares; tema escuro/claro; suporte PWA/uso offline após instalação e carregamento inicial.
- Botões Android e Apple com fluxo de instalação de aplicativo web ou instruções para adicionar à tela inicial.

## Requisitos

- Servidor HTTPS (recomendado/necessário para instalar PWA), **PHP 8.2 ou posterior** e hospedagem estática comum.
- Navegador recente com JavaScript, WebAssembly, Web Workers e armazenamento local habilitados. O primeiro Run de PHP/Twig baixa aproximadamente 20 MB de interpretador e dependências.
- **Sem banco de dados, chaves de API, login, npm, composer ou build obrigatório.** JSZip 3.10.1 incluído localmente em `vendor/`.

## Instalação na Hostinger

1. Baixe o ZIP do projeto e extraia o conteúdo.
2. Abra **hPanel → Sites → Gerenciar → Gerenciador de Arquivos** do domínio desejado.
3. Envie todos os arquivos e pastas **de dentro da pasta do projeto** à pasta `public_html` (não envie apenas o ZIP sem extrair).
4. Confirme que `public_html/index.php`, `public_html/assets/`, `public_html/vendor/`, `public_html/sw.js` e `public_html/manifest.webmanifest` existem.
5. Ative SSL/HTTPS para o domínio e acesse `https://peachpuff-goat-805422.hostingersite.com/` ou seu domínio definitivo.
6. Teste criar arquivo, salvar, atualizar a página, importar e exportar ZIP, executar PHP/Twig e instalar como PWA.
7. Confirme que `vendor/php-wasm/8_3_36/php_8_3.wasm` é servido com o tipo `application/wasm`. A configuração está no `.htaccess`.

Os arquivos do editor usam caminhos relativos. Ao publicar em outro domínio, ajuste `$siteUrl` e os metadados de SEO em `index.php`. Mantenha a estrutura na raiz do repositório.

## Estrutura

```text
php-editor/
├── index.php                    # Interface e cabeçalhos básicos
├── assets/
├── ├── meta-og.png              # Og Image Graph
│   ├── preview.js               # Prévia isolada, recursos e ponte de requisições
│   ├── runtime-worker.js        # Interpretador PHP compilado para o navegador
│   ├── app.js                   # Editor, projetos, exportação, PWA
│   ├── style.css                # Layout responsivo e temas
│   ├── icon-192.png             # Ícone PWA
│   └── icon-512.png             # Ícone PWA
├── vendor/                     # JSZip, PHP WebAssembly, Twig e licenças
├── docs/execucao.md             # Execução e reconstrução do runtime
├── manifest.webmanifest        # Metadados de instalação
├── sw.js                       # Cache offline / Service Worker
├── .htaccess                   # Ajustes Apache
├── .gitignore                  # Exclusões do versionamento
├── LICENSE                     # Licença MIT
└── README.md                   # Manual e especificação
```

## Segurança e limitações

PHP e Twig são interpretados em um sistema de arquivos virtual dentro de um Web Worker no navegador. A prévia fica em um iframe com origem isolada. Os códigos dos projetos ficam no armazenamento local e no ambiente de execução do navegador.

Projetos que dependem de MySQL externo, extensões PHP adicionais, processos do sistema ou regras Apache precisam de um ambiente de servidor compatível. A importação atual aceita arquivos de texto. Imagens e fontes externas podem ser usadas por URL. O console mostra a mensagem mais recente. A conversão assistida de PHP para Twig cobre padrões simples e exige revisão.

O código fonte do worker, o funcionamento do interpretador, as dependências e as instruções de reconstrução estão em [docs/execucao.md](docs/execucao.md).

O aplicativo web pode ser instalado **como PWA**, mas **não gera, baixa ou instala automaticamente APK/IPA**. Android pode mostrar um prompt de instalação do navegador, e iOS geralmente exige **Compartilhar → Adicionar à Tela de Início** no Safari. Para APK assinado, é necessário empacotamento externo (por exemplo, Trusted Web Activity/Capacitor); para IPA, assinatura Apple e fluxo próprio de distribuição.

O armazenamento em `localStorage` tem limites e pode ser apagado pelo usuário/navegador; exporte ZIP para backup. Limites desta versão: arquivos de texto individuais até 2 MB na importação, ZIP importado com até 250 arquivos aceitos, sem sincronização de nuvem ou integração com GitHub.

## Atalhos

| Ação | Teclas |
| --- | --- |
| Salvar | `Ctrl/Cmd + S` |
| Executar projeto | `Ctrl/Cmd + Enter` |
| Indentar | `Tab` |

## Licença e créditos

O código próprio do editor segue a licença [MIT](LICENSE). PHP.wasm/WordPress Playground segue GPL-2.0-or-later. Twig e os componentes Symfony seguem MIT. JSZip tem licença MIT/GPLv3, conforme os termos da biblioteca. Consulte os arquivos de [licenças das dependências](vendor/licenses). Copyright © 2026 — Criado por [Fitowaylabs](https://fitowaylabs.com.br). Todos os direitos reservados sobre a marca, observada a licença deste código.
