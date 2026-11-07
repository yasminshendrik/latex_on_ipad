const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ids = ['editor', 'monaco-editor', 'gh-login-btn', 'github-login-dialog', 'github-login-form',
  'github-token', 'github-login-error', 'github-login-submit', 'github-login-cancel',
  'repo-label', 'branch-select', 'file-list', 'toggle-sidebar', 'toggle-preview', 'save-btn'];

function setup({ initial = {}, fetchImpl, locationHref = 'https://example.test/app/' } = {}) {
  const values = new Map(Object.entries(initial));
  const requests = [];
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const elements = Object.fromEntries(ids.map((id) => [id, {
    handlers: {}, value: '', textContent: '', style: {}, disabled: false,
    addEventListener(type, handler) { this.handlers[type] = handler; }
  }]));
  const dialog = elements['github-login-dialog'];
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.handlers.close(); };
  elements['github-login-form'].reset = () => { elements['github-token'].value = ''; };
  const footer = { textContent: '' };
  const location = new URL(locationHref);
  let replacement;
  const window = { addEventListener() {} };
  const context = {
    window, document: {
      title: 'test',
      getElementById: (id) => elements[id],
      querySelector: () => footer
    },
    navigator: { onLine: false },
    sessionStorage: storage, localStorage: { getItem: () => null, setItem() {} },
    location, URL, AbortController, setTimeout, clearTimeout,
    history: { replaceState(_state, _title, url) { replacement = url; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : { status: 200, ok: true };
    },
    alert(message) { throw new Error(`Unexpected alert: ${message}`); }
  };
  vm.runInNewContext(source, context);
  return { elements, values, requests, get replacement() { return replacement; } };
}

function submit(app, value) {
  app.elements['github-token'].value = value;
  return app.elements['github-login-form'].handlers.submit({ preventDefault() {} });
}

test('Formular enthält Passwortmanager-Felder und ein verdecktes Token', () => {
  assert.match(html, /name="username"[^>]*autocomplete="username"/);
  assert.match(html, /name="password"[^>]*type="password"[^>]*autocomplete="current-password"/);
});

test('Gültiges Token wird geprüft, nur für die Sitzung gespeichert und bei Abmeldung entfernt', async () => {
  const app = setup();
  app.elements['gh-login-btn'].handlers.click();
  assert.equal(app.elements['github-login-dialog'].open, true);
  await submit(app, 'github_pat_test123');
  assert.equal(app.requests[0].url, 'https://api.github.com/user');
  assert.equal(app.requests[0].options.headers.Authorization, 'Bearer github_pat_test123');
  assert.equal(app.values.get('gh_token'), 'github_pat_test123');
  assert.equal(app.elements['github-token'].value, '');
  assert.equal(app.elements['github-login-dialog'].open, false);
  assert.equal(app.elements['gh-login-btn'].textContent, 'Verbunden');
  app.elements['gh-login-btn'].handlers.click();
  assert.equal(app.values.has('gh_token'), false);
  assert.equal(app.elements['gh-login-btn'].textContent, 'GitHub Login');
});

test('Passwort oder anderes Tokenformat wird ohne Netzwerkzugriff abgewiesen', async () => {
  const app = setup();
  await submit(app, 'kein-github-token');
  assert.equal(app.requests.length, 0);
  assert.match(app.elements['github-login-error'].textContent, /Fine-grained/);
  assert.equal(app.values.has('gh_token'), false);
});

test('GitHub-Ablehnung und Netzwerkfehler werden angezeigt und nicht gespeichert', async () => {
  for (const [fetchImpl, expected] of [
    [async () => ({ status: 401, ok: false }), /abgelehnt/],
    [async () => ({ status: 403, ok: false }), /HTTP 403/],
    [async () => { throw new TypeError('Load failed'); }, /nicht erreichbar/]
  ]) {
    const app = setup({ fetchImpl });
    await submit(app, 'github_pat_test123');
    assert.match(app.elements['github-login-error'].textContent, expected);
    assert.equal(app.values.has('gh_token'), false);
  }
});

test('Abbruch verwirft auch eine nachträglich erfolgreiche Token-Prüfung', async () => {
  let complete;
  const app = setup({ fetchImpl: () => new Promise((resolve) => { complete = resolve; }) });
  app.elements['gh-login-btn'].handlers.click();
  const pending = submit(app, 'github_pat_test123');
  app.elements['github-login-cancel'].handlers.click();
  complete({ status: 200, ok: true });
  await pending;
  assert.equal(app.values.has('gh_token'), false);
  assert.equal(app.elements['github-token'].value, '');
});

test('Alter OAuth-Token und Rücksprungdaten werden entfernt', () => {
  const app = setup({
    initial: { gh_token: 'ghu_old', gh_pkce_verifier: 'old', gh_oauth_state: 'old' },
    locationHref: 'https://example.test/app/?code=old&state=old&keep=yes#section'
  });
  assert.equal(app.values.has('gh_token'), false);
  assert.equal(app.values.has('gh_pkce_verifier'), false);
  assert.equal(app.values.has('gh_oauth_state'), false);
  assert.equal(app.replacement, '/app/?keep=yes#section');
});
