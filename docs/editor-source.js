import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { syntaxTree, StreamLanguage } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { php } from '@codemirror/lang-php';
import { json } from '@codemirror/lang-json';
import { jinja2 } from '@codemirror/legacy-modes/mode/jinja2';
import { oneDark } from '@codemirror/theme-one-dark';
import { linter, lintGutter } from '@codemirror/lint';
import * as prettier from 'prettier/standalone';
import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import * as htmlFormatter from 'prettier/plugins/html';
import * as postcss from 'prettier/plugins/postcss';

let analyzer;
let serial = 0;
const awaiting = new Map();
function analyze(text, language) {
    if (!analyzer) {
        analyzer = new Worker('assets/analysis-worker.js?v=5', { type: 'module' });
        analyzer.onmessage = ({ data }) => {
            const task = awaiting.get(data.id);
            if (task) { clearTimeout(task.timeout); awaiting.delete(data.id); task.resolve(data.diagnostics); }
        };
        analyzer.onerror = event => {
            analyzer.terminate(); analyzer = null;
            for (const task of awaiting.values()) { clearTimeout(task.timeout); task.resolve([{ line: 1, column: 1, severity: 'warning', message: 'Analisador indisponível. ' + (event.message || 'Execute a análise novamente.') }]); }
            awaiting.clear();
        };
    }
    return new Promise(resolve => {
        const id = ++serial;
        const timeout = setTimeout(() => { awaiting.delete(id); resolve([{ line: 1, column: 1, severity: 'warning', message: 'Análise excedeu o prazo. Divida este arquivo em módulos menores.' }]); }, 5000);
        awaiting.set(id, { resolve, timeout }); analyzer.postMessage({ id, text, language });
    });
}

const extensions = { php: () => php(), html: () => html(), css: () => css(), js: () => javascript(), json: () => json(), twig: () => StreamLanguage.define(jinja2) };
let phpFormatter;
async function loadPHPFormatter() {
    if (!phpFormatter) {
        globalThis.prettier = prettier;
        phpFormatter = new Promise((resolve, reject) => {
            const script = document.createElement('script'); script.src = 'vendor/php-formatter.js?v=5';
            script.onload = () => resolve(globalThis.prettierPlugins.php);
            script.onerror = () => { phpFormatter = null; script.remove(); reject(new Error('Não foi possível carregar o formatador PHP.')); };
            document.head.append(script);
        });
    }
    return phpFormatter;
}

globalThis.StudioEditor = {
    create(parent, onChange, onDiagnostics, onCursor) {
        const languageSlot = new Compartment(), themeSlot = new Compartment();
        let currentLanguage = 'php', revision = 0, currentName = '', currentKey = '', changing = false;
        const states = new Map();
        const diagnostics = linter(async view => {
            if (currentLanguage === 'twig') return [];
            const original = view.state.doc.toString(), name = currentName, version = revision;
            let errors;
            if (['php', 'js', 'json'].includes(currentLanguage)) errors = await analyze(original, currentLanguage);
            else {
                errors = [];
                syntaxTree(view.state).iterate({ enter(node) {
                    if (node.type.isError && errors.length < 40) {
                        const line = view.state.doc.lineAt(node.from);
                        errors.push({ line: line.number, column: node.from - line.from + 1, message: 'Sintaxe incompleta ou inesperada.', severity: 'error' });
                    }
                } });
            }
            if (name !== currentName || version !== revision) return [];
            onDiagnostics(errors, name);
            return errors.map(error => {
                const line = view.state.doc.line(Math.min(Math.max(error.line, 1), view.state.doc.lines));
                const from = Math.min(line.to, line.from + Math.max(0, error.column - 1));
                return { from, to: Math.min(line.to, from + Math.max(1, (error.endColumn || error.column + 1) - error.column)), severity: error.severity, message: error.message };
            });
        }, { delay: 700 });
        const appearance = EditorView.theme({
            '&': { height: '490px', backgroundColor: 'var(--code)', color: 'var(--text)' },
            '.cm-scroller': { overflow: 'auto', fontFamily: 'Consolas, ui-monospace, monospace', fontSize: '14px' },
            '.cm-content': { padding: '16px 0 70px' }, '.cm-gutters': { backgroundColor: 'var(--code)', color: 'var(--muted)', border: 'none' },
            '.cm-search, .cm-panel': { backgroundColor: 'var(--panel)', color: 'var(--text)' },
            '.cm-tooltip': { backgroundColor: 'var(--panel2)', color: 'var(--text)', border: '1px solid var(--border)' },
        });
        const setup = [basicSetup, keymap.of([indentWithTab]), appearance, lintGutter(), diagnostics,
            languageSlot.of(php()), themeSlot.of(oneDark), EditorView.contentAttributes.of({ 'aria-label': 'Editor de código avançado' }),
            EditorView.updateListener.of(update => {
                if (update.docChanged) { revision++; if (!changing) onChange(update.state.doc.toString()); }
                if (update.selectionSet || update.docChanged) {
                    const point = update.state.selection.main.head, line = update.state.doc.lineAt(point);
                    onCursor(line.number, point - line.from + 1);
                }
            })];
        const view = new EditorView({ parent, state: EditorState.create({ extensions: setup }) });
        return {
            view,
            value() { return view.state.doc.toString(); },
            open(name, content, language, workspace = '') {
                if (currentKey) states.set(currentKey, view.state);
                currentName = name; currentLanguage = language; revision++;
                currentKey = workspace + ':' + name;
                let state = states.get(currentKey);
                changing = true;
                if (!state || state.doc.toString() !== content) state = EditorState.create({ doc: content, extensions: setup });
                view.setState(state);
                view.dispatch({ effects: [languageSlot.reconfigure(extensions[language]?.() || []), themeSlot.reconfigure(document.body.classList.contains('light') ? [] : oneDark)] });
                changing = false;
            },
            replace(text) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }); },
            forget(name) { for (const key of states.keys()) if (key.endsWith(':' + name)) states.delete(key); },
            theme(light) { view.dispatch({ effects: themeSlot.reconfigure(light ? [] : oneDark) }); },
            jump(line, column = 1) {
                const row = view.state.doc.line(Math.max(1, Math.min(Number(line), view.state.doc.lines)));
                const position = Math.min(row.to, row.from + Math.max(0, Number(column) - 1));
                view.dispatch({ selection: { anchor: position }, effects: EditorView.scrollIntoView(position, { y: 'center' }) }); view.focus();
            },
            async format() {
                const original = view.state.doc.toString(), name = currentName;
                const parser = { php: 'php', html: 'html', css: 'css', js: 'babel', json: 'json' }[currentLanguage];
                if (!parser) throw new Error('Formatação disponível para PHP, HTML, CSS, JavaScript e JSON.');
                const plugins = [babel, estree, htmlFormatter, postcss];
                if (parser === 'php') plugins.push(await loadPHPFormatter());
                const result = await prettier.format(original, { parser, plugins, tabWidth: 2, phpVersion: '8.3' });
                if (name === currentName && view.state.doc.toString() === original) this.replace(result);
            },
            async check() {
                if (['php', 'js', 'json'].includes(currentLanguage)) return analyze(view.state.doc.toString(), currentLanguage);
                const errors = [];
                syntaxTree(view.state).iterate({ enter(node) {
                    if (node.type.isError && errors.length < 40) {
                        const line = view.state.doc.lineAt(node.from);
                        errors.push({ line: line.number, column: node.from - line.from + 1, severity: 'error', message: 'Sintaxe incompleta ou inesperada.' });
                    }
                } });
                return errors;
            },
        };
    },
};
