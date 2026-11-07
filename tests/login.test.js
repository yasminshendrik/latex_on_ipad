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
  'repo-create', 'branch-select', 'file-list', 'toggle-sidebar', 'toggle-preview', 'save-btn',
  'create-repo-dialog', 'create-repo-form', 'create-repo-name', 'create-repo-description',
  'create-repo-status', 'create-repo-error', 'create-repo-submit', 'create-repo-cancel',
  'dashboard', 'local-project-list', 'local-project-empty', 'main-container', 'open-dashboard',
  'open-repo-btn', 'dashboard-open-repo', 'dashboard-create-repo'];

function setup({ initial = {}, localInitial = {}, fetchImpl, locationHref = 'https://example.test/app/' } = {}) {
  const values = new Map(Object.entries(initial));
  const requests = [];
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const localValues = new Map(Object.entries(localInitial));
  function element(tagName = 'DIV') {
    return {
      handlers: {}, children: [], attributes: {}, value: '', textContent: '', style: {}, disabled: false,
      tagName, hidden: true,
      addEventListener(type, handler) { this.handlers[type] = handler; },
      appendChild(child) { this.children.push(child); },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; }
    };
  }
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  const dialog = elements['github-login-dialog'];
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.handlers.close(); };
  const repoDialog = elements['repo-dialog'];
  repoDialog.showModal = () => { repoDialog.open = true; };
  repoDialog.close = () => { repoDialog.open = false; repoDialog.handlers.close(); };
  const createRepoDialog = elements['create-repo-dialog'];
  createRepoDialog.showModal = () => { createRepoDialog.open = true; };
  createRepoDialog.close = () => { createRepoDialog.open = false; createRepoDialog.handlers.close(); };
  elements['github-login-form'].reset = () => { elements['github-token'].value = ''; };
  elements['create-repo-form'].reset = () => {};
  const footer = { textContent: '' };
  const location = new URL(locationHref);
  let replacement;
  const window = { addEventListener() {} };
  const context = {
    window, document: {
      title: 'test',
      getElementById: (id) => elements[id],
      querySelector: () => footer,
      createElement: (tagName) => element(tagName.toUpperCase())
    },
    navigator: { onLine: true },
    sessionStorage: storage, localStorage: {
      getItem: (key) => localValues.get(key) ?? null,
      setItem: (key, value) => localValues.set(key, value),
      removeItem: (key) => localValues.delete(key)
    },
    location, URL, AbortController, setTimeout, clearTimeout,
    history: { replaceState(_state, _title, url) { replacement = url; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : response([]);
    },
    TextEncoder, btoa,
    alert(message) { throw new Error(`Unexpected alert: ${message}`); }
  };
  vm.runInNewContext(source, context);
  return { elements, values, localValues, requests, footer, context, get replacement() { return replacement; } };
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

test('Repository-Auswahl zählt alle Seiten und zeigt einen hierarchischen Baum mit nicht-interaktiven Ordnern', async () => {
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
  const file = nested.children[1].children[0];
  assert.match(file.children[0].textContent, /test\.tex/);
  assert.equal(folder.handlers.click, undefined);
  assert.equal(nested.handlers.click, undefined);
  assert.equal(typeof file.children[0].handlers.click, 'function');
});

test('Repository-Zugriffsrechte erhalten ein korrektes und zugängliches Symbol', async () => {
  const app = setup({ fetchImpl: async (url) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos')) return response([
      { full_name: 'alice/admin', permissions: { admin: true, push: true, pull: true } },
      { full_name: 'alice/write', permissions: { admin: false, push: true, pull: true } },
      { full_name: 'alice/read', permissions: { admin: false, push: false, pull: true } },
      { full_name: 'alice/unknown' }
    ]);
  } });
  await submit(app, 'github_pat_test123');
  const buttons = app.elements['repo-list'].children;
  assert.match(buttons[0].textContent, /^⚙️/);
  assert.equal(buttons[0].attributes['aria-label'], 'Administrationsrechte: alice/admin');
  assert.match(buttons[1].textContent, /^✏️/);
  assert.equal(buttons[1].attributes['aria-label'], 'Lese- und Schreibzugriff: alice/write');
  assert.match(buttons[2].textContent, /^👁️/);
  assert.equal(buttons[2].attributes['aria-label'], 'Nur-Lesezugriff: alice/read');
  assert.match(buttons[3].textContent, /^❔/);
  assert.equal(buttons[3].attributes['aria-label'], 'Berechtigung unbekannt: alice/unknown');
});

test('Sidebar lädt auswählbare LaTeX-Dateien von GitHub oder aus dem lokalen Offline-Cache', async () => {
  const app = setup({
    localInitial: { gh_current_repo: 'alice/project', gh_current_branch: 'main' },
    fetchImpl: async (url, options) => {
      if (url.endsWith('/user')) return response({});
      if (url.includes('/user/repos')) return response([{ full_name: 'alice/project', default_branch: 'main' }]);
      if (url.includes('/branches')) return response([{ name: 'main' }]);
      if (url.includes('/git/trees/')) return response({ truncated: false, tree: [
        { type: 'blob', path: 'chapter.tex' }, { type: 'blob', path: 'main.tex' }, { type: 'blob', path: 'refs.bib' },
        { type: 'tree', path: 'subdir' }, { type: 'blob', path: 'subdir/appendix.ltx' }
      ] });
      if (url.includes('/contents/main.tex?ref=main')) return { ok: true, text: async () => 'Remote-Hauptdatei' };
      if (url.includes('/contents/chapter.tex?ref=main')) {
        assert.equal(options.headers.Accept, 'application/vnd.github.raw');
        return { ok: true, text: async () => '\\chapter{Geladen}' };
      }
      throw new Error(`Unerwartete URL: ${url}`);
    }
  });
  app.context.navigator.onLine = true;
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
  const root = app.elements['file-list'].children[0];
  const chapter = root.children[0].children[0];
  const main = root.children[1].children[0];
  const bibliography = root.children[2].children[0];
  assert.equal(chapter.tagName, 'BUTTON');
  assert.equal(chapter.attributes['aria-label'], 'LaTeX-Datei bearbeiten: chapter.tex');
  assert.equal(bibliography.tagName, 'SPAN');
  assert.equal(bibliography.attributes['aria-label'], 'Nicht bearbeitbare Datei: refs.bib');
  assert.equal(chapter.attributes['aria-current'], undefined);
  await main.handlers.click();
  assert.equal(app.elements.editor.value, 'Remote-Hauptdatei');
  await chapter.handlers.click();
  assert.equal(app.elements.editor.value, '\\chapter{Geladen}');
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:chapter.tex'), '\\chapter{Geladen}');
  assert.equal(chapter.attributes['aria-current'], 'page');
  app.localValues.set('latex_ipad_document:alice/project:main:subdir/appendix.ltx', 'Anhang lokal');
  app.context.navigator.onLine = false;
  const nested = root.children[3].children[1].children[0].children[0];
  await nested.handlers.click();
  assert.equal(app.elements.editor.value, 'Anhang lokal');
  assert.equal(chapter.attributes['aria-current'], undefined);
  assert.equal(nested.attributes['aria-current'], 'page');
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

test('Startübersicht zeigt gespeicherte lokale Projekte und öffnet sie offline', async () => {
  const project = { id: 'alice/offline', repo: 'alice/offline', branch: 'main', activePath: 'chapter.tex', paths: ['chapter.tex'], updatedAt: 1 };
  const app = setup({
    localInitial: {
      latex_ipad_projects: JSON.stringify([project]),
      'latex_ipad_document:alice/offline:main:chapter.tex': 'Lokal gespeicherter Inhalt'
    }
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.elements['local-project-list'].children.length, 1);
  assert.match(app.elements['local-project-list'].children[0].children[0].children[0].textContent, /alice\/offline/);
  app.context.navigator.onLine = false;
  await app.elements['local-project-list'].children[0].children[1].handlers.click();
  assert.equal(app.elements['main-container'].hidden, false);
  assert.equal(app.elements['dashboard'].hidden, true);
  assert.equal(app.elements.editor.value, 'Lokal gespeicherter Inhalt');
  assert.match(app.footer.textContent, /Offline-Projekt geöffnet/);
});

test('Neues privates Repository wird erstellt und mit main.tex initialisiert', async () => {
  const app = setup({ fetchImpl: async (url, options) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos') && options.method !== 'POST') return response([]);
    if (url.endsWith('/user/repos') && options.method === 'POST') return response({
      full_name: 'alice/new-project', default_branch: 'main'
    });
    if (url.endsWith('/contents/main.tex') && options.method === 'PUT') return response({});
    if (url.includes('/contents/main.tex?ref=main')) return {
      ok: true, text: async () => '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nBitte mit GitHub verbinden, um zu starten!\n\\end{document}'
    };
    if (url.includes('/branches')) return response([{ name: 'main' }]);
    if (url.includes('/git/trees/')) return response({ truncated: false, tree: [{ type: 'blob', path: 'main.tex' }] });
    throw new Error(`Unerwartete URL: ${url}`);
  } });
  app.context.navigator.onLine = true;
  await submit(app, 'github_pat_test123');
  app.elements['dashboard-create-repo'].handlers.click();
  app.elements['create-repo-name'].value = 'new-project';
  await app.elements['create-repo-form'].handlers.submit({ preventDefault() {} });
  const createRequest = app.requests.find((request) => request.url.endsWith('/user/repos') && request.options.method === 'POST');
  const fileRequest = app.requests.find((request) => request.url.endsWith('/contents/main.tex'));
  assert.deepEqual(JSON.parse(createRequest.options.body), {
    name: 'new-project', private: true, auto_init: true
  });
  assert.equal(Buffer.from(JSON.parse(fileRequest.options.body).content, 'base64').toString('utf8'),
    '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nBitte mit GitHub verbinden, um zu starten!\n\\end{document}');
  assert.equal(app.elements['repo-label'].textContent, 'alice/new-project');
  assert.equal(app.elements['main-container'].hidden, false);
  assert.equal(app.elements['create-repo-dialog'].open, false);
  assert.match(app.footer.textContent, /Privates Repository erstellt/);
});

test('Fehler bei main.tex lässt die Repository-Erstellung später fortsetzen', async () => {
  let contentAttempts = 0;
  const app = setup({ fetchImpl: async (url, options) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos') && options.method !== 'POST') return response([]);
    if (url.endsWith('/user/repos') && options.method === 'POST') return response({
      full_name: 'alice/retry-project', default_branch: 'main'
    });
    if (url.endsWith('/contents/main.tex') && options.method === 'PUT') {
      contentAttempts += 1;
      return response({}, { status: contentAttempts === 1 ? 403 : 201 });
    }
    if (url.includes('/contents/main.tex?ref=main')) return {
      ok: true, text: async () => '\\documentclass{article}'
    };
    if (url.includes('/branches')) return response([{ name: 'main' }]);
    if (url.includes('/git/trees/')) return response({ truncated: false, tree: [{ type: 'blob', path: 'main.tex' }] });
    throw new Error(`Unerwartete URL: ${url}`);
  } });
  app.context.navigator.onLine = true;
  await submit(app, 'github_pat_test123');
  app.elements['dashboard-create-repo'].handlers.click();
  app.elements['create-repo-name'].value = 'retry-project';
  await app.elements['create-repo-form'].handlers.submit({ preventDefault() {} });
  assert.match(app.elements['create-repo-error'].textContent, /wurde erstellt, aber main\.tex/);
  assert.equal(app.elements['create-repo-submit'].textContent, 'Initialisierung fortsetzen');
  await app.elements['create-repo-form'].handlers.submit({ preventDefault() {} });
  assert.equal(app.requests.filter((request) => request.url.endsWith('/user/repos') && request.options.method === 'POST').length, 1);
  assert.equal(contentAttempts, 2);
  assert.equal(app.elements['create-repo-dialog'].open, false);
  assert.equal(app.elements['repo-label'].textContent, 'alice/retry-project');
});
