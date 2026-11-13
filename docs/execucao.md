# Ambiente de execução do PHP Studio

## Interpretador

PHP 8.3.36 é carregado de vendor/php-wasm em um Web Worker dedicado. O worker disponibiliza os arquivos do projeto em /project. A biblioteca Twig integrada fica em /studio-vendor. Quando o projeto tem vendor/autoload.php próprio, esse autoloader também é carregado.

A prévia executa HTML, CSS e JavaScript em um iframe com origem isolada. Recursos locais são transformados em URLs de dados e módulos recebem um mapa de imports. A ponte entre a prévia e o editor encaminha navegação, formulários e fetch dos arquivos virtuais. Cada renderização recebe uma identificação própria. Trocar de projeto invalida a ponte anterior e encerra o worker.

## Banco por projeto

O caminho do banco virtual é /studio-data/project.sqlite. A função studio_db() cria uma conexão PDO configurada para lançar exceções. O caminho também está disponível em getenv('STUDIO_DB_PATH'). A base fica fora da pasta /project e é preservada durante novas execuções do mesmo projeto.

O exemplo abaixo é uma instrução de conexão para o usuário inserir quando precisar do banco.

```php
$pdo = studio_db();
$statement = $pdo->query('SELECT name FROM sqlite_master WHERE type = \'table\'');
$tables = $statement->fetchAll(PDO::FETCH_ASSOC);
```

Alterações no banco são copiadas do sistema virtual para o registro do projeto em IndexedDB. Cada projeto tem uma identificação própria de ambiente. Importar ou substituir um banco gera uma nova identificação para o worker carregar os bytes corretos. A exportação do projeto inclui studio-database.sqlite.

O botão Executar consulta usa PDO::query. Executar script e Importar SQL usam PDO::exec dentro de uma transação. Uma falha desfaz a transação do script. Scripts devem usar a sintaxe do SQLite. Consultas exibem até 500 resultados.

## Composer e dependências

api/composer.php usa a biblioteca do Composer instalada no servidor. A rota aceita somente uma requisição POST com sessão e token CSRF válidos. O manifesto utilizado no servidor contém requisitos validados, caminhos relativos de autoload e configuração fixa. O comando update resolve dependências, cria o lock e instala arquivos com no-dev, no-plugins, no-scripts e prefer-dist.

O servidor recebe composer.json. Os arquivos PHP do projeto permanecem no navegador. O resultado é um ZIP com vendor, composer.lock e o relatório da instalação. O cliente aplica os arquivos somente ao projeto que originou a solicitação e verifica se composer.json continua igual ao manifesto enviado.

O serviço aceita pacotes públicos do Packagist. Plugins, scripts de instalação, repositórios privados, etapas de build de frameworks e execução de comandos do sistema exigem um ambiente apropriado fora deste instalador. Dependências que exigem extensões ausentes no WebAssembly podem instalar e ainda apresentar erro ao executar. O erro deve ser tratado conforme os requisitos do pacote.

A instalação tem uma trava global por cópia do editor, oito tentativas por IP em cinco minutos, limite de 90 segundos no PHP e resultado limitado a 25 MB ou 2.500 arquivos. O diretório temporário é removido ao terminar a requisição. O caminho do PHAR pode ser definido por PHP_STUDIO_COMPOSER_PATH.

## Análise e formatação

O editor usa CodeMirror. ESLint e php-parser trabalham em um segundo worker. HTML e CSS usam os parsers incrementais do editor. JSON usa seu parser nativo. Twig é validado sob demanda com Twig\Environment::parse e não precisa renderizar a página para identificar erros de sintaxe.

Prettier formata PHP, HTML, CSS, JavaScript e JSON. O plugin PHP oficial é carregado quando necessário. O parser de destaque dos modelos Twig usa a sintaxe de templates do modo Jinja2, enquanto a validação do botão Analisar usa o Twig real.

## APIs e console

Requisições do projeto aberto são encaminhadas ao worker PHP. Requisições externas usam fetch no navegador e respeitam CORS. O cliente não envia cookies da hospedagem a APIs externas. Bearer e headers informados pelo usuário só são adicionados à requisição que ele escolheu enviar.

O histórico e as coleções excluem o corpo e o campo Bearer. Headers e parâmetros de URL associados a autenticação e credenciais são filtrados antes do armazenamento. As respostas e o histórico do console ficam na memória da página.

## Reconstrução

Os fontes dos workers são docs/runtime-worker-source.js e docs/analysis-worker-source.js. O fonte do editor avançado é docs/editor-source.js. docs/build.mjs gera os bundles de assets e copia o plugin de formatação PHP. Execute npm install e npm run build na raiz do repositório.

O loader e o binário PHP permanecem os arquivos originais de @php-wasm/web-8-3@3.1.64, pasta asyncify. vendor/twig-runtime.json contém os fontes PHP do Twig e de suas dependências com os caminhos preservados. As licenças estão em vendor/licenses.
