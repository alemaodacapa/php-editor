# PHP Studio — Fitowaylabs

Editor online em português para PHP, HTML, CSS, JavaScript, JSON e Twig. A interface mantém os temas escuro e claro, com execução PHP em WebAssembly dentro do navegador.

[Editor online](https://peachpuff-goat-805422.hostingersite.com/) · [Fitowaylabs](https://fitowaylabs.com.br)

## Editor e análise

O editor CodeMirror oferece destaque de sintaxe, autocompletar, indentação, histórico de desfazer por arquivo, dobramento de blocos, busca e substituição. O botão Formatar usa Prettier para PHP, HTML, CSS, JavaScript e JSON.

JavaScript é analisado com ESLint, PHP com php-parser e JSON com seu parser nativo. HTML e CSS usam os parsers do CodeMirror. Os diagnósticos mostram arquivo, linha e coluna e permitem navegar até o trecho. O botão Analisar valida Twig com o parser PHP do próprio Twig. A verificação de sintaxe ajuda a localizar problemas antes de executar. Erros de lógica e dependências de ambiente precisam de testes de execução.

Cada projeto pode ter vários arquivos e um banco SQLite próprio. Os projetos ficam em IndexedDB neste navegador, com salvamento automático. Projetos da versão anterior são migrados do localStorage. O projeto demonstrativo antigo é descartado somente quando seus quatro arquivos continuam integralmente sem alterações.

## Execução e console

Selecione a página PHP, HTML ou Twig e clique em Run. Quando o arquivo ativo for CSS ou JavaScript, o editor procura uma página de entrada no projeto. JavaScript também pode ser executado individualmente.

PHP 8.3.36 e Twig executam em um Web Worker com sistema de arquivos virtual. A prévia usa iframe de origem isolada. Referências a estilos, scripts, módulos JavaScript e SVG locais são resolvidas a partir dos arquivos do projeto. Navegação interna, formulários GET/POST e fetch para arquivos PHP são encaminhados ao interpretador.

O console mantém até 500 mensagens por sessão, com filtros por nível e texto, cópia, limpeza e links para arquivo e linha. Logs não são gravados no histórico dos projetos.

O primeiro carregamento do PHP/Twig transfere aproximadamente 20 MB. Código PHP que excede o prazo do worker é interrompido. O ambiente pode ser iniciado novamente no próximo Run.

## Testador de APIs

Escolha Projeto aberto para chamar arquivos do sistema virtual ou API externa para enviar uma requisição HTTP pelo navegador. Estão disponíveis GET, POST, PUT, PATCH, DELETE, HEAD e OPTIONS, headers em JSON, corpo e Bearer token.

A resposta mostra status HTTP, duração, tamanho, headers disponíveis e conteúdo com formatação JSON. APIs externas precisam permitir CORS. O navegador controla quais headers de resposta ficam disponíveis para leitura. O cliente externo tem prazo de 30 segundos e limite de resposta de 5 MB.

Histórico e coleções guardam metadados da requisição. O campo Bearer, o corpo e os headers de autenticação reconhecidos são excluídos do armazenamento. Parâmetros de URL com nomes associados a credenciais são redigidos. Os dados completos da resposta permanecem somente na interface da sessão.

## Composer

Crie composer.json na raiz com as dependências em require e clique em Instalar dependências. O servidor executa o Composer real para resolver versões e obter pacotes públicos do Packagist. O cliente recebe vendor e composer.lock e passa a usá-los no interpretador isolado.

O instalador usa um manifesto gerado a partir dos requisitos e caminhos de autoload aceitos. Scripts, plugins, repositórios personalizados e dependências de desenvolvimento ficam desativados neste serviço. Os arquivos PHP do projeto ficam no navegador. As dependências instaladas substituem a pasta vendor do projeto atual.

O servidor precisa de PHP 8.2 ou posterior, curl, ZIP e um Composer PHAR. Na Hostinger, o caminho padrão é /usr/local/bin/composer2.phar. Em outra hospedagem, configure a variável de ambiente PHP_STUDIO_COMPOSER_PATH com o caminho absoluto do PHAR. Instale uma versão atualizada do Composer no servidor.

A rota usa sessão e token CSRF, limite de oito instalações por IP em cinco minutos e uma instalação simultânea por cópia do editor. O limite do resultado é 25 MB e 2.500 arquivos. Diretórios temporários da instalação são removidos ao final. O cache contém os pacotes públicos baixados pelo Composer.

## SQLite

O painel Ambiente permite executar consultas, rodar scripts em transação, importar SQL, importar um arquivo SQLite e exportar o banco. Consultas mostram até 500 linhas por vez. O banco fica salvo com seu projeto no IndexedDB e acompanha a exportação ZIP como studio-database.sqlite.

Para usar o banco em PHP, obtenha uma conexão com studio_db(). Também é possível criar PDO usando o caminho exposto em STUDIO_DB_PATH. A documentação de execução contém os detalhes.

O banco usa o dialeto SQLite. Aplicações que exigem MySQL, processos do sistema, regras Apache ou extensões PHP adicionais precisam de um ambiente de servidor compatível. O instalador de dependências não disponibiliza esses recursos ao interpretador WebAssembly.

## Instalação

1. Baixe o repositório e envie seu conteúdo para public_html, com assets, vendor, api, index.php e sw.js.
2. Ative HTTPS e use PHP 8.2 ou posterior para servir a interface e a rota do Composer.
3. Ajuste siteUrl e os metadados de SEO em index.php para o domínio escolhido.
4. Confira que o binário vendor/php-wasm/8_3_36/php_8_3.wasm é servido como application/wasm. A configuração está no .htaccess.
5. Confira o caminho do Composer e as extensões PHP curl e ZIP se for usar a instalação de dependências.
6. Teste um projeto, a exportação ZIP, a persistência do banco e uma chamada no testador de APIs.

Os arquivos de execução já estão compilados. Node e npm são usados para desenvolver e reconstruir os bundles.

## Desenvolvimento

Use Node 24.18 ou posterior. Execute npm install e npm run build. As versões diretas das ferramentas estão fixadas em package.json. Os fontes do editor e dos workers estão em docs. O build também copia o formatador PHP do pacote oficial para vendor/php-formatter.js.

A suíte de integração está em tests/integration.cjs. Para executá-la, instale as dependências, instale o Chromium com npx playwright install chromium e rode npm test. Ela cria um servidor de testes local e usa um perfil de navegador separado.

Para incluir a rota PHP real do Composer, defina STUDIO_URL apontando para uma cópia de homologação do editor e rode npm test. STUDIO_BROWSER pode selecionar um navegador instalado, como chrome. A suíte cria projetos no armazenamento do perfil de testes e instala o pacote público psr/log. Os resultados visuais ficam em test-results.

## Atalhos

| Ação | Teclas |
| --- | --- |
| Salvar projeto | Ctrl/Cmd + S |
| Executar | Ctrl/Cmd + Enter |
| Buscar e substituir | Ctrl/Cmd + F |
| Autocompletar | Ctrl + Espaço |
| Formatar | Ctrl/Cmd + Shift + F |
| Indentar | Tab |

## Licenças

O código próprio segue a licença MIT do arquivo LICENSE. PHP.wasm/WordPress Playground segue GPL-2.0-or-later. As dependências do editor, do formatador, do analisador e do Twig têm seus termos em vendor/licenses. As marcas pertencem aos respectivos titulares.
