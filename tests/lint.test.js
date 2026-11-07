const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/lint-worker.js'), 'utf8');

function lint(content) {
  let response;
  const self = { postMessage(message) { response = message; } };
  vm.runInNewContext(source, { self });
  self.onmessage({ data: { id: 17, content } });
  assert.equal(response.id, 17);
  assert.equal(response.error, undefined);
  return response.diagnostics;
}

test('Syntaxprüfung meldet Klammern, Mathematik und Umgebungen mit Positionen', () => {
  const findings = lint('\\begin{document}\n{unvollständig\n$mathe\n\\end{document}');
  assert.ok(findings.some((item) => /Klammer/.test(item.message) && item.start.line === 2));
  assert.ok(findings.some((item) => /Mathematik/.test(item.message) && item.start.line === 3));
  const environment = lint('\\begin{itemize}\nText\n\\end{document}');
  assert.ok(environment.some((item) => /itemize.*nicht geschlossen/.test(item.message)));
  assert.ok(environment.some((item) => /Unerwartetes Ende.*document/.test(item.message)));
});

test('Kommentare, maskierte Zeichen, gültige Mathematik und Verbatim erzeugen keine Fehlalarme', () => {
  const findings = lint([
    '\\documentclass{article}',
    '\\begin{document}',
    '% { $ \\begin{broken}',
    '\\verb|{ $ \\end{broken}|',
    '\\{ \\} \\$ $x$ \\(y\\) \\[z\\]',
    '\\begin{verbatim}',
    '{ $ \\end{broken}',
    '\\end{verbatim}',
    '\\end{document}'
  ].join('\n'));
  assert.equal(findings.length, 0, JSON.stringify(findings));
});

test('Worker gibt interne Fehler sichtbar zurück', () => {
  let response;
  const self = { postMessage(message) { response = message; } };
  vm.runInNewContext(source, { self });
  self.onmessage({ data: { id: 21, content: null } });
  assert.equal(response.id, 21);
  assert.match(response.error, /LaTeX-Prüfung fehlgeschlagen/);
});
