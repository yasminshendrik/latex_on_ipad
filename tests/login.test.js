const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ids = ['editor', 'monaco-editor', 'gh-login-btn', 'github-login-dialog', 'github-login-form',
  'github-token', 'github-login-error', 'github-login-submit', 'github-login-cancel',
  'repo-label', 'repo-dialog', 'repo-count', 'repo-error', 'repo-list', 'repo-retry', 'repo-cancel',
  'branch-select', 'file-list', 'toggle-sidebar', 'toggle-preview', 'save-btn'];

function setup({ initial = {}, localInitial = {}, fetchImpl, locationHref = 'https://example.test/app/' } = {}) {
  const values = new Map(Object.entries(initial));
  const requests = [];
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const localValues = new Map(Object.entries(localInitial));
  function element() {
    return {
      handlers: {}, children: [], value: '', textContent: '', style: {}, disabled: false,
      addEventListener(type, handler) { this.handlers[type] = handler; },
      appendChild(child) { this.children.push(child); },
      replaceChildren(...children) { this.children = children; }
    };
  }
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  const dialog = elements['github-login-dialog'];
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.handlers.close(); };
  const repoDialog = elements['repo-dialog'];
  repoDialog.showModal = () => { repoDialog.open = true; };
  repoDialog.close = () => { repoDialog.open = false; repoDialog.handlers.close(); };
  elements['github-login-form'].reset = () => { elements['github-token'].value = ''; };
  const footer = { textContent: '' };
  const location = new URL(locationHref);
  let replacement;
  const window = { addEventListener() {} };
  const context = {
    window, document: {
      title: 'test',
      getElementById: (id) => elements[id],
      querySelector: () => footer,
      createElement: element
    },
    navigator: { onLine: false },
    sessionStorage: storage, localStorage: {
      getItem: (key) => localValues.get(key) ?? null,
      setItem: (key, value) => localValues.set(key, value)
    },
    location, URL, AbortController, setTimeout, clearTimeout,
    history: { replaceState(_state, _title, url) { replacement = url; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : response([]);
    },
    alert(message) { throw new Error(`Unexpected alert: ${message}`); }
  };
  vm.runInNewContext(source, context);
  return { elements, values, localValues, requests, footer, get replacement() { return replacement; } };
}

function response(data, { status = 200, link = '' } = {}) {
  return { status, ok: status >= 200 && status < 300, statusText: '', headers: { get: () => link }, json: async () => data };
}

function submit(app, value) {
  app.elements['github-token'].value = value;
  return app.elements['github-login-form'].handlers.submit({ preventDefault() {} });
}

test('Formular enthält nur ein verdecktes Token-Feld für den Passwortmanager', () => {
  assert.doesNotMatch(html, /id="github-username"/);
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
  assert.equal(app.elements['repo-dialog'].open, true);
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

test('Repository-Auswahl zählt alle Seiten und zeigt den hierarchischen Baum ohne Klickfunktion', async () => {
  const app = setup({ fetchImpl: async (url) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos') && !url.includes('page=2')) {
      return response([{ full_name: 'alice/one', default_branch: 'main' }],
        { link: '<https://api.github.com/user/repos?per_page=100&page=2>; rel="next"' });
    }
    if (url.includes('/user/repos')) return response([{ full_name: 'alice/two', default_branch: 'dev' }]);
    if (url.includes('/branches')) return response([{ name: 'dev' }]);
    if (url.includes('/git/trees/')) return response({ truncated: false, tree: [
      { type: 'blob', path: 'ordner/nested/test.tex' },
      { type: 'tree', path: 'ordner' }, { type: 'tree', path: 'ordner/nested' },
      { type: 'blob', path: 'main.tex' }
    ] });
    throw new Error(`Unerwartete URL: ${url}`);
  } });
  await submit(app, 'github_pat_test123');
  assert.equal(app.elements['repo-count'].textContent, '2 verfügbare Repositories.');
  assert.equal(app.elements['repo-list'].children.length, 2);
  await app.elements['repo-list'].children[1].handlers.click();
  assert.equal(app.elements['repo-dialog'].open, false);
  assert.equal(app.elements['repo-label'].textContent, 'alice/two');
  assert.equal(app.localValues.get('gh_current_branch'), 'dev');
  const root = app.elements['file-list'].children[0];
  const folder = root.children.find((child) => child.children[0].textContent.includes('ordner'));
  const nested = folder.children[1].children[0];
  assert.match(nested.children[1].children[0].children[0].textContent, /test\.tex/);
  assert.equal(folder.handlers.click, undefined);
  assert.equal(nested.children[1].children[0].handlers.click, undefined);
});

test('Listenfehler, leere Liste und unsichere Paginierung werden sichtbar behandelt', async () => {
  for (const [result, message] of [
    [response([], { status: 403 }), /403/],
    [response([]), /Keine verfügbaren/],
    [response([], { link: '<https://evil.example/repos?page=2>; rel="next"' }), /Seitennavigation/]
  ]) {
    const app = setup({ fetchImpl: async (url) => url.endsWith('/user') ? response({}) : result });
    await submit(app, 'github_pat_test123');
    assert.match(app.elements['repo-error'].textContent, message);
    assert.equal(app.requests.length, 2);
  }
});

test('Unvollständiger Baum lässt das bisherige Repository und Dokument unverändert', async () => {
  const app = setup({ localInitial: { gh_current_repo: 'alice/old', gh_current_branch: 'main' },
    fetchImpl: async (url) => {
      if (url.endsWith('/user')) return response({});
      if (url.includes('/user/repos')) return response([{ full_name: 'alice/new', default_branch: 'main' }]);
      if (url.includes('/branches')) return response([{ name: 'main' }]);
      return response({ truncated: true, tree: [] });
    } });
  await submit(app, 'github_pat_test123');
  app.elements.editor.value = 'Meine Änderung';
  await app.elements['repo-list'].children[0].handlers.click();
  assert.match(app.elements['repo-error'].textContent, /vollständigen/);
  assert.equal(app.localValues.get('gh_current_repo'), 'alice/old');
  assert.equal(app.elements.editor.value, 'Meine Änderung');
});

test('Repo- und Branchwechsel speichern Änderungen unter dem alten Kontext', async () => {
  const app = setup({
    localInitial: { gh_current_repo: 'alice/old', gh_current_branch: 'main', 'latex_ipad_document:alice/new:main:main.tex': 'Neuer Inhalt' },
    fetchImpl: async (url) => {
      if (url.endsWith('/user')) return response({});
      if (url.includes('/user/repos')) return response([{ full_name: 'alice/new', default_branch: 'main' }]);
      if (url.includes('/branches')) return response([{ name: 'main' }, { name: 'dev' }]);
      return response({ truncated: false, tree: [{ type: 'blob', path: 'main.tex' }] });
    }
  });
  await submit(app, 'github_pat_test123');
  app.elements.editor.value = 'Alter Inhalt';
  app.elements.editor.handlers.input();
  await app.elements['repo-list'].children[0].handlers.click();
  assert.equal(app.localValues.get('latex_ipad_document:alice/old:main:main.tex'), 'Alter Inhalt');
  assert.equal(app.elements.editor.value, 'Neuer Inhalt');
  app.elements.editor.value = 'Main geändert';
  app.elements['branch-select'].value = 'dev';
  await app.elements['branch-select'].handlers.change();
  assert.equal(app.localValues.get('latex_ipad_document:alice/new:main:main.tex'), 'Main geändert');
  assert.equal(app.localValues.get('gh_current_branch'), 'dev');
  assert.notEqual(app.elements.editor.value, 'Main geändert');
});

test('Abbruch während des Öffnens verändert das aktive Repository nicht', async () => {
  let finishBranches;
  const app = setup({
    localInitial: { gh_current_repo: 'alice/old', gh_current_branch: 'main' },
    fetchImpl: async (url) => {
      if (url.endsWith('/user')) return response({});
      if (url.includes('/user/repos')) return response([{ full_name: 'alice/new', default_branch: 'main' }]);
      if (url.includes('/branches')) return new Promise((resolve) => { finishBranches = resolve; });
      return response({ truncated: false, tree: [] });
    }
  });
  await submit(app, 'github_pat_test123');
  app.elements.editor.value = 'Ungespeichert';
  const pending = app.elements['repo-list'].children[0].handlers.click();
  app.elements['repo-cancel'].handlers.click();
  finishBranches(response([{ name: 'main' }]));
  await pending;
  assert.equal(app.localValues.get('gh_current_repo'), 'alice/old');
  assert.equal(app.elements.editor.value, 'Ungespeichert');
});

test('Ein leeres Repository wird ohne Baumabfrage geöffnet', async () => {
  const app = setup({ fetchImpl: async (url) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos')) return response([{ full_name: 'alice/empty', default_branch: 'main' }]);
    if (url.includes('/branches')) return response([]);
    throw new Error('Ein leerer Branch hat keinen Git-Tree');
  } });
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
  assert.match(app.elements['file-list'].textContent, /Keine Ordner oder Dateien/);
  assert.equal(app.elements['repo-label'].textContent, 'alice/empty');
});
