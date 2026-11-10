# PHP Studio — Editor de Código | Fitowaylabs

Editor gratuito e responsivo de **PHP, HTML, CSS, JavaScript e Twig**, em português do Brasil. Interface escura inspirada em um ambiente moderno de desenvolvimento, com opção de tema claro. Projeto independente de domínio, adequado para hospedagem compartilhada **Hostinger** e distribuição pública no GitHub.

**Demonstração prevista:** https://peachpuff-goat-805422.hostingersite.com/  
**Repositório:** https://github.com/alemaodacapa/php-editor  
**Desenvolvido por:** [Fitowaylabs](https://fitowaylabs.com.br) · © 2026.

## Funcionalidades

- Criar e editar arquivos `.php`, `.html`, `.htm`, `.css`, `.js`, `.mjs`, `.twig` e texto; abas, explorador e numeração de linhas.
- Salvar o projeto automaticamente no `localStorage` do dispositivo, com botão **Salvar** e atalho `Ctrl/Cmd + S`.
- Importar arquivos de texto ou projetos em `.zip`; exportar o projeto inteiro como `.zip`; baixar o arquivo ativo.
- Copiar todo o código pelo botão discreto no canto inferior do editor (temporariamente oculto durante a rolagem).
- Pré-visualizar HTML/CSS/JavaScript em um `iframe` isolado por `sandbox` e política de conteúdo restritiva.
- Converter padrões *simples* de PHP em modelos `.twig`, preservando o arquivo original. Editar Twig como texto.
- Interface adaptável a computadores e celulares; tema escuro/claro; suporte PWA/uso offline após instalação e carregamento inicial.
- Botões Android e Apple com fluxo de instalação de aplicativo web ou instruções para adicionar à tela inicial.

## Requisitos

- Servidor HTTPS (recomendado/necessário para instalar PWA), **PHP 8.2 ou posterior** e hospedagem estática comum.
- Navegador recente com JavaScript habilitado e armazenamento local disponível.
- **Sem banco de dados, chaves de API, login, npm, composer ou build obrigatório.** JSZip 3.10.1 incluído localmente em `vendor/`.

## Instalação na Hostinger

1. Baixe o ZIP do projeto e extraia o conteúdo.
2. Abra **hPanel → Sites → Gerenciar → Gerenciador de Arquivos** do domínio desejado.
3. Envie todos os arquivos e pastas **de dentro da pasta do projeto** à pasta `public_html` (não envie apenas o ZIP sem extrair).
4. Confirme que `public_html/index.php`, `public_html/assets/`, `public_html/vendor/`, `public_html/sw.js` e `public_html/manifest.webmanifest` existem.
5. Ative SSL/HTTPS para o domínio e acesse `https://peachpuff-goat-805422.hostingersite.com/` ou seu domínio definitivo.
6. Teste criar arquivo, salvar, atualizar a página, importar e exportar ZIP, visualizar HTML e instalar como PWA.

A aplicação usa caminhos relativos e **não** exige alterar o domínio no código. Para publicar no GitHub, mantenha a estrutura na raiz do repositório.

## Estrutura

```text
php-editor/
├── index.php                    # Interface e cabeçalhos básicos
├── assets/
├── ├── meta-og.png              # Og Image Graph
│   ├── app.js                   # Editor, projetos, exportação, PWA
│   ├── style.css                # Layout responsivo e temas
│   ├── icon-192.png             # Ícone PWA
│   └── icon-512.png             # Ícone PWA
├── vendor/jszip.min.js         # Biblioteca JSZip para arquivos ZIP
├── manifest.webmanifest        # Metadados de instalação
├── sw.js                       # Cache offline / Service Worker
├── .htaccess                   # Ajustes Apache
├── .gitignore                  # Exclusões do versionamento
├── LICENSE                     # Licença MIT
└── README.md                   # Manual e especificação
```

## Segurança e limitações

**O editor não executa PHP no servidor.** Por segurança, o arquivo `.php` é tratado como texto e nunca é enviado para execução remota. A pré-visualização suporta HTML, CSS e JS em um quadro isolado, sem acesso à origem principal. Não é um ambiente de execução PHP 8.4 nem um conversor completo de Twig; conversões complexas exigem revisão. Arquivos importados são processados localmente. Não insira segredos ou tokens em projetos a publicar.

O aplicativo web pode ser instalado **como PWA**, mas **não gera, baixa ou instala automaticamente APK/IPA**. Android pode mostrar um prompt de instalação do navegador, e iOS geralmente exige **Compartilhar → Adicionar à Tela de Início** no Safari. Para APK assinado, é necessário empacotamento externo (por exemplo, Trusted Web Activity/Capacitor); para IPA, assinatura Apple e fluxo próprio de distribuição.

O armazenamento em `localStorage` tem limites e pode ser apagado pelo usuário/navegador; exporte ZIP para backup. Limites desta versão: arquivos de texto individuais até 2 MB na importação, ZIP importado com até 250 arquivos aceitos, sem sincronização de nuvem ou integração com GitHub.

## Atalhos

| Ação | Teclas |
| --- | --- |
| Salvar | `Ctrl/Cmd + S` |
| Visualizar HTML | `Ctrl/Cmd + Enter` |
| Indentar | `Tab` |

## Licença e créditos

Distribuído sob licença [MIT](LICENSE). JSZip tem licença MIT/GPLv3, conforme os termos da biblioteca. Copyright © 2026 — Criado por [Fitowaylabs](https://fitowaylabs.com.br). Todos os direitos reservados sobre a marca, observada a licença deste código.
