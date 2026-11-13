import { Linter } from 'eslint-linter-browserify';
import PHPParser from 'php-parser';

const javascript = new Linter();
const php = new PHPParser({ parser: { extractDoc: true, suppressErrors: false, version: '8.3' }, ast: { withPositions: true } });
const browserGlobals = Object.fromEntries([
    'window', 'document', 'console', 'navigator', 'location', 'localStorage', 'sessionStorage',
    'fetch', 'Request', 'Response', 'Headers', 'URL', 'URLSearchParams', 'FormData', 'File',
    'Blob', 'WebSocket', 'Worker', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
    'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance',
    'crypto', 'TextEncoder', 'TextDecoder', 'atob', 'btoa', 'structuredClone', 'history',
    'MutationObserver', 'IntersectionObserver', 'Event', 'CustomEvent', 'HTMLElement', 'Image',
].map(name => [name, 'readonly']));

self.onmessage = ({ data }) => {
    const { id, text, language } = data;
    let diagnostics = [];
    try {
        if (language === 'js') {
            diagnostics = javascript.verify(text, [{ languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: browserGlobals },
                rules: { 'no-undef': 'warn', 'no-unreachable': 'warn', 'no-dupe-args': 'error', 'no-dupe-keys': 'error', 'valid-typeof': 'error' } }])
                .map(error => ({ line: error.line || 1, column: error.column || 1, endColumn: error.endColumn,
                    message: error.message, severity: error.severity === 2 ? 'error' : 'warning' }));
        }
        if (language === 'php') php.parseCode(text, 'editor.php');
        if (language === 'json' && text.trim()) JSON.parse(text);
    } catch (error) {
        const position = Number(error.message.match(/position (\d+)/)?.[1] || 0);
        const before = text.slice(0, position).split('\n');
        diagnostics.push({ line: error.lineNumber || Number(error.message.match(/line (\d+)/i)?.[1]) || before.length,
            column: typeof error.columnNumber === 'number' ? error.columnNumber + 1 : before.at(-1).length + 1, message: error.message, severity: 'error' });
    }
    self.postMessage({ id, diagnostics });
};
