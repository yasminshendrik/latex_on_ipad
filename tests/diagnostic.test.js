const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/diagnostic.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function setup() {
  function element(tagName = 'div') {
    return {
      tagName, children: [], attributes: {}, handlers: {}, textContent: '', hidden: false,
      style: {}, append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); },
      insertBefore(child) { this.children.push(child); },
      replaceChildren(...children) { this.children = children; },
      select() {},
      remove() {},
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(type, handler) { this.handlers[type] = handler; }
    };
  }
  const toggle = element('button');
  const footer = element('footer');
  const panel = {};
  const sessionValues = new Map();
  const copied = [];
  const timers = new Map();
  let nextTimerId = 0;
  const document = {
    readyState: 'complete',
    body: {
      children: [],
      appendChild(child) { this.children.push(child); },
      insertBefore(child) { panel.element = child; }
    },
    head: { appendChild() {} },
    createElement: element,
    getElementById: (id) => id === 'toggle-log' ? toggle : null,
    querySelector: (selector) => selector === 'footer' ? footer : null,
    addEventListener() {},
    execCommand(command) {
      copied.push({ command, text: document.body.children.at(-1)?.value });
      return true;
    }
  };
  const window = { location: { href: 'https://example.test/' } };
  const navigator = {};
  const sessionStorage = {
    getItem: (key) => sessionValues.get(key) ?? null,
    setItem: (key, value) => sessionValues.set(key, value),
    removeItem: (key) => sessionValues.delete(key)
  };
  vm.runInNewContext(source, {
    document, window, sessionStorage, navigator, URL, Date, MutationObserver: undefined,
    setTimeout(callback, delay) { const id = ++nextTimerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  });
  return { document, window, navigator, toggle, panel: panel.element, sessionValues, copied, timers };
}

test('Vorhandenes Diagnoseprotokoll ist standardmäßig verborgen und ein-/ausblendbar', () => {
  const app = setup();
  assert.match(html, /id="toggle-log"[^>]*aria-controls="technical-log"[^>]*aria-expanded="false"/);
  assert.equal(app.panel.id, 'technical-log');
  assert.equal(app.panel.hidden, true);
  app.toggle.handlers.click();
  assert.equal(app.panel.hidden, false);
  assert.equal(app.toggle.attributes['aria-expanded'], 'true');
  app.toggle.handlers.click();
  assert.equal(app.panel.hidden, true);
  assert.equal(app.toggle.attributes['aria-expanded'], 'false');
});

test('Alle Protokollaktionen bleiben ohne Icon-Schrift sichtbar beschriftet', () => {
  const heading = setup().panel.children[0];
  const tabs = heading.children.find((child) => child.id === 'technical-log-tabs');
  for (const button of [...tabs.children, ...heading.children.filter((child) => child.tagName === 'button')]) {
    assert.ok(button.textContent);
    assert.equal(button.attributes['data-icon'], undefined);
  }
  assert.equal(heading.children.find((child) => child.textContent === 'Leeren').attributes['data-log-icon'], 'delete');
  assert.equal(heading.children.find((child) => child.textContent === 'Kopieren').attributes['data-log-icon'], 'copy');
});

test('Protokoll leeren leert den bestehenden Log ohne zusätzliche Leermeldung', () => {
  const app = setup();
  const heading = app.panel.children[0];
  const clearButton = heading.children.find((child) => child.textContent === 'Leeren');
  const message = heading.children.find((child) => child.id === 'technical-log-message');
  clearButton.handlers.click();
  assert.equal(app.sessionValues.has('latex_pwa_diagnostic_log'), false);
  assert.equal(message.textContent, '');
  assert.doesNotMatch(JSON.stringify(app.panel), /Protokoll geleert/);
});

test('Alle Protokolleinträge lassen sich über die Zwischenablage-Fallback-Funktion kopieren', async () => {
  const app = setup();
  const heading = app.panel.children[0];
  const copyButton = heading.children.find((child) => child.textContent === 'Kopieren');
  const message = heading.children.find((child) => child.id === 'technical-log-message');

  await copyButton.handlers.click();

  assert.equal(app.copied[0].command, 'copy');
  assert.match(app.copied[0].text, /Diagnoseprotokoll gestartet/);
  assert.equal(message.textContent, '');
  assert.equal(copyButton.textContent, 'Kopiert');
  assert.equal(copyButton.attributes['aria-label'], 'Protokoll kopiert');
  const firstTimerId = [...app.timers.keys()][0];
  await copyButton.handlers.click();
  assert.equal(app.timers.has(firstTimerId), false);
  assert.equal(copyButton.textContent, 'Kopiert');
  const [timerId, feedback] = [...app.timers.entries()][0];
  assert.equal(feedback.delay, 1500);
  feedback.callback();
  assert.equal(app.timers.has(timerId), false);
  assert.equal(copyButton.textContent, 'Kopieren');
  assert.equal(copyButton.attributes['aria-label'], 'Aktuelles Protokoll kopieren');

  const clearButton = heading.children.find((child) => child.textContent === 'Leeren');
  clearButton.handlers.click();
  await copyButton.handlers.click();
  assert.equal(message.textContent, 'Kein Inhalt zum Kopieren.');
});

test('Reiter und Fehlerverweis schalten um; Kopieren und Leeren betreffen nur den ausgewählten Reiter', async () => {
  const app = setup();
  const heading = app.panel.children[0];
  const tabs = heading.children.find((child) => child.id === 'technical-log-tabs');
  const [general, compiler] = tabs.children;
  const clear = heading.children.find((child) => child.textContent === 'Leeren');
  const copy = heading.children.find((child) => child.textContent === 'Kopieren');
  const [generalPanel, compilerPanel] = app.panel.children.slice(1);

  app.window.__setCompilerLog('Fehler: vertraulicher Inhalt');
  app.window.__technicalLog('Kompilierung fehlgeschlagen. Compiler-Protokoll öffnen.', { compiler: true });
  assert.equal(general.attributes['aria-selected'], 'true');
  assert.equal(compilerPanel.hidden, true);
  const link = generalPanel.children.at(-1).children[0];
  link.handlers.click();
  assert.equal(compiler.attributes['aria-selected'], 'true');
  assert.equal(generalPanel.hidden, true);
  assert.equal(compilerPanel.textContent, 'Fehler: vertraulicher Inhalt');
  await copy.handlers.click();
  assert.equal(app.copied.at(-1).text, 'Fehler: vertraulicher Inhalt');

  clear.handlers.click();
  assert.equal(compilerPanel.textContent, 'Leeres Compiler-Protokoll.');
  assert.equal(app.sessionValues.has('latex_pwa_diagnostic_log'), true);
  await copy.handlers.click();
  assert.equal(heading.children.find((child) => child.id === 'technical-log-message').textContent, 'Kein Inhalt zum Kopieren.');
  assert.equal(copy.attributes['aria-label'], 'Aktuelles Protokoll kopieren');

  app.window.__setCompilerLog('Neuer Compiler-Fehler');
  general.handlers.click();
  await copy.handlers.click();
  assert.match(app.copied.at(-1).text, /Compiler-Protokoll öffnen/);
  assert.doesNotMatch(app.copied.at(-1).text, /Neuer Compiler-Fehler/);
  clear.handlers.click();
  assert.equal(app.sessionValues.has('latex_pwa_diagnostic_log'), false);
  compiler.handlers.click();
  assert.equal(compilerPanel.textContent, 'Neuer Compiler-Fehler');
});

test('Fehler beim Kopieren werden angezeigt und leeres Compiler-Protokoll wird nicht kopiert', async () => {
  const app = setup();
  const heading = app.panel.children[0];
  const compiler = heading.children.find((child) => child.id === 'technical-log-tabs').children[1];
  const copy = heading.children.find((child) => child.textContent === 'Kopieren');
  const message = heading.children.find((child) => child.id === 'technical-log-message');
  compiler.handlers.click();
  await copy.handlers.click();
  assert.equal(message.textContent, 'Kein Inhalt zum Kopieren.');
  app.window.__setCompilerLog('Fehler');
  app.document.execCommand = () => false;
  await copy.handlers.click();
  assert.match(message.textContent, /Kopieren fehlgeschlagen/);
});

test('Clipboard-API kopiert den gewählten Reiter und meldet Berechtigungsfehler', async () => {
  const app = setup();
  const heading = app.panel.children[0];
  const compiler = heading.children.find((child) => child.id === 'technical-log-tabs').children[1];
  const copy = heading.children.find((child) => child.textContent === 'Kopieren');
  const message = heading.children.find((child) => child.id === 'technical-log-message');
  const copied = [];
  app.window.isSecureContext = true;
  app.window.__setCompilerLog('Compilerinhalt');
  compiler.handlers.click();
  app.navigator.clipboard = { writeText: async (text) => { copied.push(text); } };
  await copy.handlers.click();
  assert.deepEqual(copied, ['Compilerinhalt']);
  app.navigator.clipboard.writeText = async () => { throw new Error('Zugriff verweigert'); };
  await copy.handlers.click();
  assert.match(message.textContent, /Kopieren fehlgeschlagen: Zugriff verweigert/);
});
