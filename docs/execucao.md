# Execução do PHP Studio

O botão Run interpreta PHP 8.3.36 com WebAssembly em um Web Worker. O Twig 3 e suas dependências são carregados no sistema de arquivos virtual do PHP. HTML, CSS e JavaScript são executados no iframe isolado da prévia. Os arquivos reais da hospedagem não são acessíveis pelo código do projeto.

Selecione um arquivo .php, .html ou .twig e clique em Run ou pressione Ctrl+Enter. Quando selecionar CSS ou JavaScript, o editor procura uma página de entrada no projeto. Arquivos JavaScript também podem ser executados individualmente, com saída na faixa de console da prévia.

Referências a estilos, scripts, módulos JavaScript e SVG locais são resolvidas a partir da pasta da página. Links internos, formulários GET/POST e fetch para arquivos do projeto utilizam o mesmo ambiente PHP. Projetos dependentes de MySQL externo, extensões PHP específicas, processos do sistema ou regras Apache exigem um servidor adequado a essas dependências. A prévia usa arquivos virtuais de texto. Imagens e fontes externas podem ser referenciadas por URL.

Para executar um template Twig diretamente, crie context.json na pasta do template com um objeto JSON contendo as variáveis. Os templates podem usar extends, include, filtros e laços. Arquivos PHP podem usar as classes Twig após o carregamento automático. Projetos criados começam com index.php vazio. Projetos existentes permanecem no armazenamento local. O projeto demonstrativo antigo é removido apenas se seus quatro arquivos estiverem integralmente sem alterações.

O primeiro Run de PHP/Twig baixa aproximadamente 20 MB. O cache permite reutilizar o interpretador. Cada execução PHP tem limites de memória e tempo. Um worker que excede o prazo é encerrado e pode ser iniciado novamente no próximo Run.

## Dependências e reconstrução

PHP.wasm / WordPress Playground 3.1.64, distribuído sob GPL-2.0-or-later.
Fonte https://github.com/WordPress/wordpress-playground
Pacotes https://www.npmjs.com/package/@php-wasm/universal e https://www.npmjs.com/package/@php-wasm/web-8-3

Twig e componentes Symfony são distribuídos sob MIT. As licenças estão em vendor/licenses. Fonte do Twig https://github.com/twigphp/Twig

O fonte do worker está em docs/runtime-worker-source.js. Para recompilar, instale @php-wasm/universal@3.1.64 e esbuild@0.28.2 e use bundle com formato esm e plataforma browser. Marque node:*, worker_threads e ../vendor/php-wasm/php_8_3.js como externos. O arquivo de saída é assets/runtime-worker.js.

O loader e o binário PHP são os arquivos originais de @php-wasm/web-8-3@3.1.64, pasta asyncify. O pacote vendor/twig-runtime.json contém os fontes PHP do Twig e do autoloader Composer com os caminhos preservados.
