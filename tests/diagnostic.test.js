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
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(type, handler) { this.handlers[type] = handler; }
    };
  }
  const toggle = element('button');
  const footer = element('footer');
  const panel = {};
  const sessionValues = new Map();
  const document = {
    readyState: 'complete',
    body: { insertBefore(child) { panel.element = child; } },
    head: { appendChild() {} },
    createElement: element,
    getElementById: (id) => id === 'toggle-log' ? toggle : null,
    querySelector: (selector) => selector === 'footer' ? footer : null,
    addEventListener() {},
    execCommand() { return true; }
  };
  const window = { location: { href: 'https://example.test/' } };
  const sessionStorage = {
    getItem: (key) => sessionValues.get(key) ?? null,
    setItem: (key, value) => sessionValues.set(key, value),
    removeItem: (key) => sessionValues.delete(key)
  };
  vm.runInNewContext(source, {
    document, window, sessionStorage, navigator: {}, URL, Date, MutationObserver: undefined
  });
  return { document, toggle, panel: panel.element, sessionValues };
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
