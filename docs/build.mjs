import { build } from 'esbuild';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const shared = { absWorkingDir: root, bundle: true, platform: 'browser', minify: true };
await build({ ...shared, entryPoints: ['docs/editor-source.js'], format: 'iife', outfile: 'assets/editor.bundle.js' });
await build({ ...shared, entryPoints: ['docs/analysis-worker-source.js'], format: 'esm', outfile: 'assets/analysis-worker.js',
    banner: { js: "const process = { env: {}, arch: 'wasm', platform: 'browser', versions: {}, cwd: () => '/', nextTick: queueMicrotask };" } });
await build({ ...shared, entryPoints: ['docs/runtime-worker-source.js'], format: 'esm', outfile: 'assets/runtime-worker.js',
    external: ['node:*', 'worker_threads', '../vendor/php-wasm/php_8_3.js'] });
await copyFile(new URL('../node_modules/@prettier/plugin-php/standalone.js', import.meta.url), new URL('../vendor/php-formatter.js', import.meta.url));
