const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { IDBFactory } = require('fake-indexeddb');
const { webcrypto, createHash } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, '..', 'js/app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ids = ['editor', 'monaco-editor', 'lint-results', 'gh-login-btn', 'github-login-dialog', 'github-login-form',
  'github-token', 'github-login-error', 'github-login-submit', 'github-login-cancel',
  'repo-dialog', 'repo-count', 'repo-error', 'repo-list', 'repo-retry', 'repo-cancel',
  'repo-create', 'branch-select', 'branch-selector', 'project-settings-button', 'project-settings-dialog', 'project-settings-close',
  'file-list', 'sidebar', 'sidebar-resize', 'toggle-sidebar', 'tex-only-filter', 'toggle-preview', 'save-btn',
  'add-tex-file', 'new-tex-file-dialog', 'new-tex-file-form', 'new-tex-file-folder', 'new-tex-file-name', 'new-tex-file-error',
  'new-tex-file-submit', 'new-tex-file-cancel', 'commit-dialog', 'commit-form', 'commit-message', 'commit-error', 'commit-submit', 'commit-cancel',
  'create-repo-dialog', 'create-repo-form', 'create-repo-name', 'create-repo-description',
  'create-repo-status', 'create-repo-error', 'create-repo-submit', 'create-repo-cancel',
  'dashboard', 'local-project-list', 'local-project-empty', 'main-container', 'open-dashboard',
  'dashboard-open-repo', 'dashboard-create-repo', 'sync-conflict-dialog',
  'sync-conflict-description', 'sync-conflict-local', 'sync-conflict-remote',
  'sync-conflict-keep-local', 'sync-conflict-use-remote', 'sync-conflict-merge',
  'compile-summary', 'main-file-select', 'preview-status', 'pdf-pages', 'preview-container', 'preview-resize',
  'project-name', 'project-branch', 'project-repo-link', 'project-hyphenation', 'app-status'];

function setup({ initial = {}, localInitial = {}, fetchImpl, WorkerClass, monaco, pdfjs, withIndexedDB = false, indexedDBInstance, confirmImpl, exposeSave = false, locationHref = 'https://example.test/app/' } = {}) {
  const values = new Map(Object.entries(initial));
  const requests = [];
  const indexedDB = indexedDBInstance || (withIndexedDB ? new IDBFactory() : undefined);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const localValues = new Map(Object.entries(localInitial));
  function element(tagName = 'DIV') {
    const classNames = new Set();
    return {
      handlers: {}, children: [], attributes: {}, value: '', textContent: '', selectionStart: 0, selectionEnd: 0, scrollTop: 0, scrollLeft: 0,
      style: { setProperty(key, value) { this[key] = value; } }, disabled: false,
      tagName, hidden: true,
      classList: {
        add(name) { classNames.add(name); },
        remove(name) { classNames.delete(name); },
        contains(name) { return classNames.has(name); },
        toggle(name) {
          if (classNames.has(name)) classNames.delete(name);
          else classNames.add(name);
          return classNames.has(name);
        }
      },
      addEventListener(type, handler) { this.handlers[type] = handler; },
      appendChild(child) { this.children.push(child); },
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      getContext() { return {}; },
      setAttribute(name, value) { this.attributes[name] = value; },
      setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      getAttribute(name) { return this.attributes[name] ?? null; },
      getBoundingClientRect() { return { width: 800, height: 600, top: 0, bottom: 600, left: 0, right: 800 }; },
      setPointerCapture() {},
      removeAttribute(name) { delete this.attributes[name]; }
    };
  }
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  elements['tex-only-filter'].checked = true;
  elements['toggle-sidebar'].disabled = true;
  const dialog = elements['github-login-dialog'];
  dialog.showModal = () => { dialog.open = true; };
  dialog.close = () => { dialog.open = false; dialog.handlers.close(); };
  const repoDialog = elements['repo-dialog'];
  repoDialog.showModal = () => { repoDialog.open = true; };
  repoDialog.close = () => { repoDialog.open = false; repoDialog.handlers.close(); };
  const createRepoDialog = elements['create-repo-dialog'];
  createRepoDialog.showModal = () => { createRepoDialog.open = true; };
  createRepoDialog.close = () => { createRepoDialog.open = false; createRepoDialog.handlers.close(); };
  const conflictDialog = elements['sync-conflict-dialog'];
  conflictDialog.showModal = () => { conflictDialog.open = true; };
  conflictDialog.close = () => { conflictDialog.open = false; };
  const newTexFileDialog = elements['new-tex-file-dialog'];
  newTexFileDialog.showModal = () => { newTexFileDialog.open = true; };
  newTexFileDialog.close = () => { newTexFileDialog.open = false; };
  const commitDialog = elements['commit-dialog'];
  commitDialog.showModal = () => { commitDialog.open = true; };
  commitDialog.close = () => { commitDialog.open = false; };
  const projectSettingsDialog = elements['project-settings-dialog'];
  projectSettingsDialog.showModal = () => { projectSettingsDialog.open = true; };
  projectSettingsDialog.close = () => { projectSettingsDialog.open = false; };
  elements['github-login-form'].reset = () => { elements['github-token'].value = ''; };
  elements['create-repo-form'].reset = () => {};
  elements['new-tex-file-form'].reset = () => { elements['new-tex-file-name'].value = ''; };
  const footer = elements['app-status'];
  const location = new URL(locationHref);
  let replacement;
  const intervals = [];
  const logs = [];
  const window = { addEventListener() {}, matchMedia: () => ({ matches: false }), __technicalLog: (message) => logs.push(message), __setCompilerLog: (text) => { window.compilerLog = text; }, confirm: confirmImpl, crypto: webcrypto, pdfjsLib: pdfjs, ...(indexedDB ? { indexedDB } : {}) };
  if (monaco) {
    window.crypto = {};
    window.monaco = monaco;
    window.require = { config: () => (_modules, callback) => callback() };
  }
  const context = {
    window, document: {
      title: 'test',
      head: { appendChild(script) { if (monaco) script.onload(); } },
      getElementById: (id) => elements[id],
      querySelector: () => footer,
      createElement: (tagName) => element(tagName.toUpperCase())
    },
    navigator: { onLine: true },
    sessionStorage: storage, localStorage: {
      getItem: (key) => localValues.get(key) ?? null,
      setItem: (key, value) => localValues.set(key, value),
      removeItem: (key) => localValues.delete(key),
      get length() { return localValues.size; },
      key: (index) => [...localValues.keys()][index] ?? null
    },
    location, URL, AbortController, Worker: WorkerClass, ...(indexedDB ? { indexedDB } : {}),
    setTimeout(callback, delay) { const timer = setTimeout(callback, delay); timer.unref?.(); return timer; },
    clearTimeout,
    setInterval(callback, delay) { intervals.push({ callback, delay }); },
    history: { replaceState(_state, _title, url) { replacement = url; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return fetchImpl ? fetchImpl(url, options) : response([]);
    },
    TextEncoder, TextDecoder, Uint8Array, btoa,
    alert(message) { throw new Error(`Unexpected alert: ${message}`); }
  };
  const pdfTestSource = source.replace(
    "import(new URL('./pdfjs/pdf.min.mjs', SCRIPT_URL).href)",
    'Promise.resolve(window.pdfjsLib)'
  );
  const testSource = exposeSave
    ? pdfTestSource.replace('  initialize();', `  window.testSave = {
        persistCurrentFile, readRemoteFile, readProjectTexPacks,
        setContext(repo, branch, path) { repoName = repo; branchName = branch; activePath = path; }
      };
  initialize();`)
    : pdfTestSource;
  vm.runInNewContext(testSource, context);
  return { elements, values, localValues, requests, footer, context, intervals, logs, get replacement() { return replacement; } };
}

function response(data, { status = 200, link = '' } = {}) {
  return { status, ok: status >= 200 && status < 300, statusText: '', headers: { get: () => link }, json: async () => data };
}

function submit(app, value) {
  app.elements['github-token'].value = value;
  return app.elements['github-login-form'].handlers.submit({ preventDefault() {} });
}

function syncApiFetch({ baseSha = 'a'.repeat(40), refSha = baseSha, treeItems, mainContent = 'Remote-Hauptdatei', settingsContent, writeStatus = 201 } = {}) {
  let blobNumber = 0;
  const tree = treeItems || [{ type: 'blob', path: 'main.tex', sha: 'main-blob-sha', size: mainContent.length, mode: '100644' }];
  return async (url, options = {}) => {
    const method = options.method || 'GET';
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos') && method === 'GET') return response([{ full_name: 'alice/project', default_branch: 'main' }]);
    if (url.includes('/branches')) return response([{ name: 'main', commit: { sha: baseSha } }]);
    if (url.includes(`/git/commits/${baseSha}`) && method === 'GET') return response({ tree: { sha: 'tree-base' } });
    if (url.includes('/git/trees/tree-base?recursive=1') && method === 'GET') {
      return response({ truncated: false, tree: tree.map((item) => ({ ...item })) });
    }
    if (url.endsWith('/git/ref/heads/main') && method === 'GET') return response({ object: { sha: refSha } });
    if (url.includes('/contents/.latex-ipad/settings.json?ref=main') && settingsContent !== undefined) {
      return { ok: true, text: async () => settingsContent };
    }
    if (url.includes('/contents/')) return { ok: true, text: async () => mainContent };
    if (url.endsWith('/git/blobs') && method === 'POST') {
      return writeStatus < 300 ? response({ sha: `created-blob-${++blobNumber}` }, { status: writeStatus }) : response({}, { status: writeStatus });
    }
    if (url.endsWith('/git/trees') && method === 'POST') return response({ sha: 'tree-created' });
    if (url.endsWith('/git/commits') && method === 'POST') return response({ sha: 'commit-created' });
    if (url.endsWith('/git/refs/heads/main') && method === 'PATCH') return response({});
    throw new Error(`Unerwartete URL: ${url} (${method})`);
  };
}

async function openSyncRepository(app) {
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
}

test('Syntaxprüfung nutzt den lokalen Worker und verwirft veraltete Ergebnisse', async () => {
  let worker;
  class FakeWorker {
    constructor(url) { this.url = url; this.requests = []; worker = this; }
    postMessage(data) { this.requests.push(data); }
    terminate() {}
  }
  const app = setup({ WorkerClass: FakeWorker });
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(worker.url, './js/lint-worker.js');
  const first = worker.requests.at(-1);
  app.elements.editor.value = '{offen';
  app.elements.editor.handlers.input();
  worker.onmessage({ data: { id: first.id, diagnostics: [] } });
  assert.match(app.elements['lint-results'].textContent, /läuft/);
  await new Promise((resolve) => setTimeout(resolve, 400));
  const latest = worker.requests.at(-1);
  assert.equal(latest.content, '{offen');
  worker.onmessage({ data: { id: latest.id, diagnostics: [{
    message: 'Geschweifte Klammer nicht geschlossen.',
    start: { line: 1, column: 1 },
    end: { line: 1, column: 2 }
  }] } });
  assert.match(app.elements['lint-results'].children[0].textContent, /1 Hinweis/);
  assert.match(app.elements['lint-results'].children[1].children[0].textContent, /Zeile 1/);
  worker.onerror();
  assert.match(app.elements['lint-results'].textContent, /nicht verfügbar/);
});

test('Syntaxprüfung setzt und entfernt Monaco-Markierungen bei Änderungen', async () => {
  let worker;
  let change;
  let value = '';
  const calls = [];
  const model = {};
  class FakeWorker {
    constructor() { worker = this; }
    postMessage(data) { this.request = data; }
    terminate() {}
  }
  const monaco = {
    MarkerSeverity: { Error: 8 },
    editor: {
      create(_host, options) {
        value = options.value;
        return {
          getValue: () => value,
          getModel: () => model,
          onDidChangeModelContent: (handler) => { change = handler; }
        };
      },
      setModelMarkers(currentModel, owner, markers) { calls.push({ currentModel, owner, markers }); }
    }
  };
  const app = setup({ WorkerClass: FakeWorker, monaco });
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.ok(worker.request);
  worker.onmessage({ data: { id: worker.request.id, diagnostics: [{
    message: 'Testfehler',
    start: { line: 2, column: 3 },
    end: { line: 2, column: 4 }
  }] } });
  const result = calls.at(-1);
  assert.equal(result.currentModel, model);
  assert.equal(result.owner, 'latex-lint');
  assert.equal(result.markers[0].startLineNumber, 2);
  assert.equal(result.markers[0].startColumn, 3);
  assert.equal(result.markers[0].message, 'Testfehler');
  assert.match(app.elements['lint-results'].children[0].textContent, /1 Hinweis/);
  value = 'Korrigiert';
  change();
  assert.equal(calls.at(-1).markers.length, 0);
});

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
  assert.equal(app.elements['gh-login-btn'].attributes['aria-label'], 'Von GitHub abmelden');
  assert.equal(app.elements['gh-login-btn'].attributes['data-icon'], 'github');
  assert.equal(app.elements['gh-login-btn'].textContent, 'Abmelden');
  assert.equal(app.elements['repo-dialog'].open, true);
  app.elements['gh-login-btn'].handlers.click();
  assert.equal(app.values.has('gh_token'), false);
  assert.equal(app.elements['gh-login-btn'].attributes['aria-label'], 'Mit GitHub verbinden');
  assert.equal(app.elements['gh-login-btn'].attributes['data-icon'], 'github');
});

test('GitHub-Repository öffnen startet ohne Token direkt die Anmeldung und setzt die Aktion fort', async () => {
  const app = setup();
  await app.elements['dashboard-open-repo'].handlers.click();
  assert.equal(app.elements['github-login-dialog'].open, true);
  assert.equal(Boolean(app.elements['repo-dialog'].open), false);
  await submit(app, 'github_pat_test123');
  assert.equal(app.elements['repo-dialog'].open, true);
  assert.equal(app.requests.filter((request) => request.url.includes('/user/repos')).length, 1);
});

test('Repository-Erstellung nach Anmeldung ohne Token öffnet den passenden Dialog', async () => {
  const app = setup();
  app.elements['dashboard-create-repo'].handlers.click();
  assert.equal(app.elements['github-login-dialog'].open, true);
  await submit(app, 'github_pat_test123');
  assert.equal(app.elements['create-repo-dialog'].open, true);
  assert.equal(Boolean(app.elements['repo-dialog'].open), false);
});

test('Speichern ohne Token meldet an und setzt anschließend den Commit-Dialog fort', async () => {
  const app = setup({ fetchImpl: syncApiFetch() });
  await openSyncRepository(app);
  app.elements.editor.value = 'Lokale Änderung';
  app.elements['gh-login-btn'].handlers.click();
  const repositoryRequestsBeforeSave = app.requests.filter((request) => request.url.includes('/user/repos')).length;
  await app.elements['save-btn'].handlers.click();
  assert.equal(app.elements['github-login-dialog'].open, true);
  await submit(app, 'github_pat_test123');
  assert.equal(app.elements['commit-dialog'].open, true);
  assert.equal(app.requests.filter((request) => request.url.includes('/user/repos')).length, repositoryRequestsBeforeSave);
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
  assert.ok(app.logs.includes('GitHub-Anmeldung abgebrochen.'));
  assert.doesNotMatch(app.logs.join('\n'), /github_pat_test123/);
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

test('Repository-Auswahl zählt alle Seiten und zeigt einen hierarchischen Baum mit klappbaren Ordnern', async () => {
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
    if (url.includes('/contents/')) return { ok: true, text: async () => `Inhalt von ${url}` };
    throw new Error(`Unerwartete URL: ${url}`);
  } });
  await submit(app, 'github_pat_test123');
  assert.equal(app.elements['repo-count'].textContent, '2 verfügbare Repositories.');
  assert.equal(app.elements['repo-list'].children.length, 2);
  await app.elements['repo-list'].children[1].handlers.click();
  assert.equal(app.elements['repo-dialog'].open, false);
  assert.equal(app.elements['project-name'].textContent, 'alice/two');
  assert.equal(app.elements['project-repo-link'].href, 'https://github.com/alice/two');
  assert.equal(app.elements['project-repo-link'].hidden, false);
  assert.equal(app.localValues.get('gh_current_branch'), 'dev');
  const project = app.elements['file-list'].children[0].children[0];
  assert.match(project.children[0].textContent, /alice\/two/);
  project.children[0].handlers.click();
  assert.equal(project.children[1].hidden, true);
  assert.equal(project.children[0].attributes['aria-expanded'], 'false');
  project.children[0].handlers.click();
  const root = project.children[1];
  const folder = root.children.find((child) => child.children[0].textContent.includes('ordner'));
  const nested = folder.children[1].children[0];
  const file = nested.children[1].children[0];
  assert.match(file.children[0].textContent, /test\.tex/);
  assert.equal(folder.handlers.click, undefined);
  assert.equal(nested.handlers.click, undefined);
  assert.equal(folder.children[0].attributes['aria-expanded'], 'true');
  folder.children[0].handlers.click();
  assert.equal(folder.children[1].hidden, true);
  assert.equal(folder.children[0].attributes['aria-expanded'], 'false');
  folder.children[0].handlers.click();
  assert.equal(folder.children[1].hidden, false);
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

test('TeX-Filter zeigt nur bearbeitbare TeX-Dateien samt übergeordneten Ordnern und ist umschaltbar', async () => {
  const app = setup({ fetchImpl: async (url) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos')) return response([{ full_name: 'alice/filter', default_branch: 'main' }]);
    if (url.includes('/branches')) return response([{ name: 'main' }]);
    if (url.includes('/git/trees/')) return response({ truncated: false, tree: [
      { type: 'blob', path: 'main.tex' }, { type: 'tree', path: 'kapitel' },
      { type: 'blob', path: 'kapitel/eins.LATEX' }, { type: 'blob', path: 'kapitel/link.tex', mode: '120000' },
      { type: 'tree', path: 'bilder' }, { type: 'blob', path: 'bilder/grafik.png' }
    ] });
    if (url.includes('/contents/')) return { ok: true, text: async () => 'Inhalt' };
    throw new Error('Unerwartete Anfrage');
  } });
  assert.match(html, /id="tex-only-filter"[^>]*checked/);
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
  let root = app.elements['file-list'].children[0].children[0].children[1];
  assert.equal(root.children.length, 2);
  let folder = root.children.find((row) => row.children[0].textContent.includes('kapitel'));
  assert.equal(folder.children[1].children.length, 1);
  assert.match(folder.children[1].children[0].children[0].textContent, /eins\.LATEX/);
  folder.children[0].handlers.click();
  app.elements['tex-only-filter'].checked = false;
  app.elements['tex-only-filter'].handlers.change();
  root = app.elements['file-list'].children[0].children[0].children[1];
  folder = root.children.find((row) => row.children[0].textContent.includes('kapitel'));
  assert.equal(folder.children[1].hidden, true);
  assert.equal(folder.children[1].children.length, 2);
  assert.ok(root.children.some((row) => row.children[0].textContent.includes('bilder')));
});

test('Git-Dateien bleiben gespeichert, aber online und offline in beiden Filterzuständen unsichtbar', async () => {
  const database = new IDBFactory();
  const paths = ['main.tex', '.gitignore', '.gitattributes', '.gitmodules', 'sub/.gitignore', '.git/config', '.git/nested/hidden.tex', 'sub/readme.txt'];
  const tree = [
    { type: 'tree', path: '.git' }, { type: 'tree', path: '.git/nested' }, { type: 'tree', path: 'sub' },
    ...paths.map((path) => ({ type: 'blob', path }))
  ];
  const online = setup({ indexedDBInstance: database, fetchImpl: async (url) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos')) return response([{ full_name: 'alice/gitfiles', default_branch: 'main' }]);
    if (url.includes('/branches')) return response([{ name: 'main' }]);
    if (url.includes('/git/trees/')) return response({ truncated: false, tree });
    if (url.includes('/contents/')) return { ok: true, text: async () => 'Dateiinhalt' };
    throw new Error(`Unerwartete URL: ${url}`);
  } });
  await submit(online, 'github_pat_test123');
  await online.elements['repo-list'].children[0].handlers.click();
  function collect(element) {
    return [element.textContent, ...element.children.flatMap(collect)].join(' ');
  }
  for (const checked of [true, false]) {
    online.elements['tex-only-filter'].checked = checked;
    online.elements['tex-only-filter'].handlers.change();
    const text = collect(online.elements['file-list']);
    assert.doesNotMatch(text, /hidden\.tex|\.gitignore|\.gitattributes|\.gitmodules|📁 \.git(?:\s|$)/);
    assert.match(text, /main\.tex/);
    if (!checked) assert.match(text, /readme\.txt/);
  }
  const offline = setup({ indexedDBInstance: database });
  offline.context.navigator.onLine = false;
  await new Promise((resolve) => setTimeout(resolve, 30));
  await offline.elements['local-project-list'].children[0].children[1].handlers.click();
  for (const checked of [true, false]) {
    offline.elements['tex-only-filter'].checked = checked;
    offline.elements['tex-only-filter'].handlers.change();
    const text = collect(offline.elements['file-list']);
    assert.doesNotMatch(text, /hidden\.tex|\.gitignore|\.gitattributes|\.gitmodules|📁 \.git(?:\s|$)/);
    assert.match(text, /main\.tex/);
  }
  const db = await new Promise((resolve, reject) => {
    const request = database.open('LaTeXPWA_VFS', 2);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const records = await new Promise((resolve, reject) => {
    const request = db.transaction('files').objectStore('files').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  for (const path of paths) assert.ok(records.some((record) => record.path === path), `${path} bleibt gespeichert`);
});

test('Sidebar-Größe ist per Zeiger und Tastatur mit Mindestgröße in beiden Ausrichtungen veränderbar', () => {
  const app = setup();
  let portrait = false;
  app.context.window.matchMedia = () => ({ matches: portrait });
  app.elements.sidebar.getBoundingClientRect = () => ({ width: 250, height: 145 });
  const resize = app.elements['sidebar-resize'];
  resize.handlers.pointerdown({ button: 0, pointerId: 1, clientX: 250, clientY: 145, preventDefault() {} });
  resize.handlers.pointermove({ pointerId: 1, clientX: 0, clientY: 145 });
  resize.handlers.pointerup({ pointerId: 1 });
  assert.equal(app.elements.sidebar.style['--sidebar-width'], '180px');
  portrait = true;
  resize.handlers.pointerdown({ button: 0, pointerId: 2, clientX: 0, clientY: 145, preventDefault() {} });
  resize.handlers.pointermove({ pointerId: 2, clientX: 0, clientY: 0 });
  resize.handlers.pointerup({ pointerId: 2 });
  assert.equal(app.elements.sidebar.style['--sidebar-height'], '120px');
  resize.handlers.keydown({ key: 'ArrowDown', preventDefault() {} });
  assert.equal(app.elements.sidebar.style['--sidebar-height'], '165px');
  assert.ok(app.logs.some((entry) => /Sidebar-Größe geändert/.test(entry)));
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
      if (url.includes('/contents/')) return { ok: true, text: async () => `Inhalt von ${url}` };
      throw new Error(`Unerwartete URL: ${url}`);
    }
  });
  app.context.navigator.onLine = true;
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
  assert.equal(app.elements['project-settings-button'].hidden, false);
  assert.equal(app.elements['branch-selector'].hidden, true);
  app.elements['project-settings-button'].handlers.click();
  assert.equal(app.elements['project-settings-dialog'].open, true);
  app.elements['project-settings-close'].handlers.click();
  assert.equal(app.elements['project-settings-dialog'].open, false);
  let root = app.elements['file-list'].children[0].children[0].children[1];
  const chapter = root.children[0].children[0];
  const main = root.children[1].children[0];
  assert.equal(chapter.tagName, 'BUTTON');
  assert.equal(chapter.textContent, 'chapter.tex');
  assert.equal(chapter.attributes['aria-label'], 'LaTeX-Datei bearbeiten: chapter.tex');
  assert.equal(root.children.length, 3);
  app.elements['tex-only-filter'].checked = false;
  app.elements['tex-only-filter'].handlers.change();
  root = app.elements['file-list'].children[0].children[0].children[1];
  const bibliography = root.children[2].children[0];
  assert.equal(bibliography.tagName, 'SPAN');
  assert.equal(bibliography.attributes['aria-label'], 'Nicht bearbeitbare Datei: refs.bib');
  assert.equal(chapter.attributes['aria-current'], undefined);
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:refs.bib'), 'Inhalt von https://api.github.com/repos/alice/project/contents/refs.bib?ref=main');
  await root.children[1].children[0].handlers.click();
  assert.equal(app.elements.editor.value, 'Remote-Hauptdatei');
  const visibleChapter = root.children[0].children[0];
  await visibleChapter.handlers.click();
  assert.equal(app.elements.editor.value, '\\chapter{Geladen}');
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:chapter.tex'), '\\chapter{Geladen}');
  assert.equal(visibleChapter.attributes['aria-current'], 'page');
  app.localValues.set('latex_ipad_document:alice/project:main:subdir/appendix.ltx', 'Anhang lokal');
  app.context.navigator.onLine = false;
  const nested = root.children[3].children[1].children[0].children[0];
  await nested.handlers.click();
  assert.equal(app.elements.editor.value, 'Anhang lokal');
  assert.equal(visibleChapter.attributes['aria-current'], undefined);
  assert.equal(nested.attributes['aria-current'], 'page');
});

test('Dateiwechsel setzt Cursor und Scroll-Position an den Anfang', async () => {
  const app = setup({
    localInitial: { gh_current_repo: 'alice/project', gh_current_branch: 'main' },
    fetchImpl: async (url) => {
      if (url.endsWith('/user')) return response({});
      if (url.includes('/user/repos')) return response([{ full_name: 'alice/project', default_branch: 'main' }]);
      if (url.includes('/branches')) return response([{ name: 'main' }]);
      if (url.includes('/git/trees/')) return response({ truncated: false, tree: [
        { type: 'blob', path: 'chapter.tex' }, { type: 'blob', path: 'main.tex' }
      ] });
      if (url.includes('/contents/')) return { ok: true, text: async () => 'Dateiinhalt\nzweite Zeile' };
      throw new Error(`Unerwartete URL: ${url}`);
    }
  });
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
  app.elements.editor.scrollTop = 180;
  app.elements.editor.scrollLeft = 24;
  app.elements.editor.setSelectionRange(10, 10);
  const chapter = app.elements['file-list'].children[0].children[0].children[1].children[0].children[0];
  await chapter.handlers.click();
  assert.equal(app.elements.editor.selectionStart, 0);
  assert.equal(app.elements.editor.selectionEnd, 0);
  assert.equal(app.elements.editor.scrollTop, 0);
  assert.equal(app.elements.editor.scrollLeft, 0);
});

test('Anführungszeichen erzeugen LaTeX-Paare und Auswahl wird eingeschlossen', () => {
  const app = setup();
  const editor = app.elements.editor;
  editor.value = 'Zitat';
  editor.setSelectionRange(2, 2);
  let prevented = false;
  editor.handlers.keydown({ key: '"', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(editor.value, ['Zi', '"`', '"\'', 'tat'].join(''));
  assert.equal(editor.selectionStart, 4);
  assert.equal(editor.selectionEnd, 4);

  editor.handlers.keydown({ key: '"', preventDefault() {} });
  assert.equal(editor.value, ['Zi', '"`', '"\'', 'tat'].join(''));
  assert.equal(editor.selectionStart, 6);

  editor.value = 'Text';
  editor.setSelectionRange(0, 4);
  editor.handlers.keydown({ key: '"', preventDefault() {} });
  assert.equal(editor.value, ['"`', 'Text', '"\''].join(''));
  assert.equal(editor.selectionStart, 6);
  assert.equal(editor.selectionEnd, 6);
});

test('Monaco setzt den Cursor an Dateianfang und unterstützt LaTeX-Anführungszeichen', async () => {
  let value = '';
  let selection = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 };
  let position;
  let scrollTop;
  let scrollLeft;
  const model = {
    getValue: () => value,
    getOffsetAt: ({ column }) => column - 1,
    getPositionAt: (offset) => ({ lineNumber: 1, column: offset + 1 })
  };
  const monacoEditor = {
    getValue: () => value,
    getModel: () => model,
    getSelection: () => selection,
    setValue(next) { value = next; },
    setPosition(next) {
      position = next;
      selection = { startLineNumber: 1, startColumn: next.column, endLineNumber: 1, endColumn: next.column };
    },
    setScrollTop(next) { scrollTop = next; },
    setScrollLeft(next) { scrollLeft = next; },
    executeEdits(_source, edits) {
      const { range, text } = edits[0];
      const start = range.startColumn - 1;
      const end = range.endColumn - 1;
      value = `${value.slice(0, start)}${text}${value.slice(end)}`;
    },
    onDidChangeModelContent() {}
  };
  const app = setup({ monaco: {
    MarkerSeverity: { Error: 8 },
    editor: {
      create(_host, options) { value = options.value; return monacoEditor; },
      setModelMarkers() {}
    }
  } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(position.lineNumber, 1);
  assert.equal(position.column, 1);
  assert.equal(scrollTop, 0);
  assert.equal(scrollLeft, 0);
  value = 'Text';
  selection = { startLineNumber: 1, startColumn: 2, endLineNumber: 1, endColumn: 2 };
  app.elements['monaco-editor'].handlers.keydown({ key: '"', preventDefault() {} });
  assert.equal(value, ['T', '"`', '"\'', 'ext'].join(''));
  assert.equal(position.lineNumber, 1);
  assert.equal(position.column, 4);
});

test('Repository-Öffnen lädt alle regulären Dateien und meldet Git-LFS sowie Submodule', async () => {
  const lfsPointer = 'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 10\n';
  const app = setup({ localInitial: {
    'latex_ipad_document:alice/project:main:data.bin': 'Alte lokale LFS-Datei'
  }, fetchImpl: async (url) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos')) return response([{ full_name: 'alice/project', default_branch: 'main' }]);
    if (url.includes('/branches')) return response([{ name: 'main' }]);
    if (url.includes('/git/trees/')) return response({ truncated: false, tree: [
      { type: 'blob', path: 'main.tex', sha: 'main-sha', size: 12, mode: '100644' },
      { type: 'blob', path: 'data.bin', sha: 'lfs-sha', size: 10, mode: '100644' },
      { type: 'tree', path: 'vendor' },
      { type: 'commit', path: 'vendor/package', sha: 'submodule-sha', mode: '160000' }
    ] });
    if (url.includes('/contents/data.bin')) return { ok: true, text: async () => lfsPointer };
    if (url.includes('/contents/main.tex')) return { ok: true, text: async () => 'Main-Datei' };
    throw new Error(`Unerwartete URL: ${url}`);
  } });
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
  const technicalLog = app.logs.join('\n');
  for (const activity of [
    'GitHub-Anmeldung erfolgreich.',
    'Repository-Auswahl geladen',
    'Repository in der Auswahl angefordert.',
    'Repository wird geöffnet',
    'Repository-Download abgeschlossen',
    'Repository lokal gespeichert und im Editor geöffnet.'
  ]) assert.ok(technicalLog.includes(activity), `Protokolleintrag fehlt: ${activity}`);
  assert.doesNotMatch(technicalLog, /github_pat_test123|Main-Datei|version https:\/\/git-lfs/);
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:main.tex'), 'Main-Datei');
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:data.bin'), undefined);
  assert.match(app.footer.textContent, /Git LFS/);
  assert.match(app.footer.textContent, /Git-Submodule/);
  app.elements['tex-only-filter'].checked = false;
  app.elements['tex-only-filter'].handlers.change();
  const vendor = app.elements['file-list'].children[0].children[0].children[1].children.find((row) => row.children[0].textContent.includes('vendor'));
  const submodule = vendor.children[1].children[0].children[0];
  assert.match(submodule.attributes['aria-label'], /Git-Submodule nicht unterstützt/);
});

test('Beim Wiederöffnen lassen sich parallele lokale und Online-Änderungen zusammenführen', async () => {
  let remoteContent = 'Lokal: alt\nGemeinsam: alt\nOnline: alt';
  let remoteSha = 'base-sha';
  const app = setup({ fetchImpl: async (url) => {
    if (url.endsWith('/user')) return response({});
    if (url.includes('/user/repos')) return response([{ full_name: 'alice/merge', default_branch: 'main' }]);
    if (url.includes('/branches')) return response([{ name: 'main' }]);
    if (url.includes('/git/trees/')) return response({ truncated: false, tree: [
      { type: 'blob', path: 'main.tex', sha: remoteSha, size: 64, mode: '100644' }
    ] });
    if (url.includes('/contents/main.tex')) return { ok: true, text: async () => remoteContent };
    throw new Error(`Unerwartete URL: ${url}`);
  } });
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();
  app.elements.editor.value = 'Lokal: geändert\nGemeinsam: alt\nOnline: alt';
  await app.elements['save-btn'].handlers.click();
  remoteContent = 'Lokal: alt\nGemeinsam: alt\nOnline: geändert';
  remoteSha = 'remote-sha';
  await app.elements['open-dashboard'].handlers.click();
  await app.elements['dashboard-open-repo'].handlers.click();
  const opening = app.elements['repo-list'].children[0].handlers.click();
  for (let attempt = 0; attempt < 10 && !app.elements['sync-conflict-dialog'].open; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(app.elements['sync-conflict-dialog'].open, true);
  app.elements['sync-conflict-merge'].handlers.click();
  await opening;
  assert.equal(app.elements.editor.value, 'Lokal: geändert\nGemeinsam: alt\nOnline: geändert');
  assert.match(app.footer.textContent, /Repo geladen/);
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
      if (url.includes('/git/trees/')) return response({ truncated: false, tree: [{ type: 'blob', path: 'main.tex' }] });
      if (url.includes('/contents/main.tex')) return { ok: true, text: async () => 'Neuer Inhalt' };
      return response({ truncated: false, tree: [{ type: 'blob', path: 'main.tex' }] });
    }
  });
  await submit(app, 'github_pat_test123');
  app.elements.editor.value = 'Alter Inhalt';
  app.elements.editor.handlers.input();
  await app.elements['repo-list'].children[0].handlers.click();
  assert.equal(app.elements['branch-selector'].hidden, false);
  assert.equal(app.localValues.get('latex_ipad_document:alice/old:main:main.tex'), 'Alter Inhalt');
  assert.equal(app.elements.editor.value, 'Neuer Inhalt');
  app.elements.editor.value = 'Main geändert';
  app.elements['branch-select'].value = 'dev';
  await app.elements['branch-select'].handlers.change();
  assert.equal(app.localValues.get('latex_ipad_document:alice/new:main:main.tex'), 'Main geändert');
  assert.equal(app.localValues.get('gh_current_branch'), 'dev');
  assert.notEqual(app.elements.editor.value, 'Main geändert');
});

test('Ein vorgemerktes Speichern behält Repository, Branch und Pfad bei Kontextwechsel', async () => {
  const app = setup({ exposeSave: true });
  await new Promise((resolve) => setTimeout(resolve, 0));
  app.context.window.testSave.setContext('alice/old', 'main', 'alt.tex');
  app.elements.editor.value = 'Alter Inhalt';
  const save = app.context.window.testSave.persistCurrentFile(true);
  app.context.window.testSave.setContext('alice/new', 'dev', 'neu.tex');
  await save;
  assert.equal(app.localValues.get('latex_ipad_document:alice/old:main:alt.tex'), 'Alter Inhalt');
  assert.equal(app.localValues.has('latex_ipad_document:alice/old:dev:neu.tex'), false);
  assert.match(app.footer.textContent, /alt\.tex/);
});

async function texWorkerSetup(localInitial = {}, pdfjs, setupOptions = {}) {
  const workers = [];
  class FakeWorker {
    constructor(url) { this.url = url; this.requests = []; workers.push(this); }
    postMessage(data) { this.requests.push(data); }
    terminate() { this.terminated = true; }
  }
  const app = setup({ WorkerClass: FakeWorker, exposeSave: true, localInitial, pdfjs, ...setupOptions });
  const tex = () => workers.find((worker) => worker.url === './js/tex-worker.js');
  const tick = () => new Promise((resolve) => setTimeout(resolve, 20));
  await tick();
  return { app, tex, tick };
}

test('Lokales Speichern startet die Kompilierung; Diagnosen und unveränderte Stände werden behandelt', async () => {
  const { app, tex, tick } = await texWorkerSetup({ 'latex_ipad_document:local:main:kapitel/eins.tex': 'Kapitel' });
  app.elements.editor.value = '\\input{kapitel/eins}';
  await app.elements['save-btn'].handlers.click();
  await tick();
  const first = tex().requests[0];
  assert.equal(first.entry, 'main.tex');
  assert.equal(first.files['main.tex'], '\\input{kapitel/eins}');
  assert.equal(first.files['kapitel/eins.tex'], 'Kapitel');
  assert.equal(app.elements['main-file-select'].value, 'main.tex');
  tex().onmessage({ data: { id: first.id, status: 'errors', pdf: new Uint8Array([37, 80]).buffer, diagnostics: [
    { severity: 'error', file: './main.tex', line: 1, message: 'Undefined control sequence', package: null }
  ] } });
  await tick();
  assert.match(app.elements['compile-summary'].textContent, /mit Fehlern \(1 Fehler, 0 Warnungen\)/);
  assert.match(app.context.window.compilerLog, /main\.tex:1 – Undefined control sequence/);
  await app.elements['save-btn'].handlers.click();
  await tick();
  assert.equal(tex().requests.length, 1);
  app.elements.editor.value = '\\input{kapitel/eins} geändert';
  await app.elements['save-btn'].handlers.click();
  await tick();
  assert.equal(tex().requests.length, 2);
});

test('Während einer laufenden Kompilierung wird nur der neueste Stand nachgeholt', async () => {
  const { app, tex, tick } = await texWorkerSetup();
  for (const value of ['Eins', 'Zwei', 'Drei']) {
    app.elements.editor.value = value;
    await app.elements['save-btn'].handlers.click();
    await tick();
  }
  assert.equal(tex().requests.length, 1);
  tex().onmessage({ data: { id: tex().requests[0].id, status: 'spotless', diagnostics: [] } });
  await tick();
  assert.equal(tex().requests.length, 2);
  assert.equal(tex().requests[1].files['main.tex'], 'Drei');
});

test('Ohne main.tex wird keine Datei geraten; die Auswahl wird pro Projekt gemerkt', async () => {
  const { app, tex, tick } = await texWorkerSetup({ 'latex_ipad_document:local:main:b.tex': 'B' });
  app.context.window.testSave.setContext('', 'main', 'a.tex');
  app.elements.editor.value = 'A';
  await app.context.window.testSave.persistCurrentFile();
  await tick();
  assert.equal(tex(), undefined);
  assert.match(app.elements['compile-summary'].textContent, /Keine Hauptdatei/);
  app.elements['main-file-select'].value = 'b.tex';
  app.elements['main-file-select'].handlers.change();
  await tick();
  assert.equal(JSON.parse(app.localValues.get('latex_ipad_settings:local')).mainFiles.main, 'b.tex');
  assert.equal(app.localValues.has('latex_ipad_main:local:main'), false);
  assert.equal(tex().requests[0].entry, 'b.tex');
});

test('Projektbezogene Silbentrennung wird lokal gespeichert und bei der Kompilierung überschrieben', async () => {
  const { app, tex, tick } = await texWorkerSetup({
    'latex_ipad_document:local:main:main.tex': '\\documentclass{article}\n\\usepackage[ngerman]{babel}'
  });
  app.elements['project-hyphenation'].value = 'english';
  app.elements['project-hyphenation'].handlers.change();
  await tick();
  await tick();
  const settings = JSON.parse(app.localValues.get('latex_ipad_settings:local'));
  assert.equal(settings.hyphenation, 'english');
  assert.match(tex().requests[0].files['main.tex'], /^\\PassOptionsToPackage\{main=english\}\{babel\}\n/);
  assert.match(app.footer.textContent, /Projekteinstellungen lokal gespeichert/);
});

test('Fehler des TeX-Workers werden angezeigt und nicht als Vorschau ausgegeben', async () => {
  const { app, tex, tick } = await texWorkerSetup();
  app.elements.editor.value = 'X';
  await app.elements['save-btn'].handlers.click();
  await tick();
  tex().onmessage({ data: { id: tex().requests[0].id, error: 'tectonic_wasm.wasm konnte nicht geladen werden (HTTP 404).' } });
  await tick();
  assert.match(app.elements['compile-summary'].textContent, /nicht möglich: tectonic_wasm/);
  assert.match(app.context.window.compilerLog, /tectonic_wasm/);
  assert.match(app.elements['preview-status'].textContent, /Keine Vorschau/);
});

test('Kompilierung protokolliert Start, Fehler und Erfolg ohne Dokumentinhalte', async () => {
  const { app, tex, tick } = await texWorkerSetup();
  app.elements.editor.value = 'VERTRAULICHER-DOKUMENTINHALT';
  await app.elements['save-btn'].handlers.click();
  await tick();
  tex().onmessage({ data: { id: tex().requests[0].id, error: 'VERTRAULICHER-DOKUMENTINHALT' } });
  await tick();
  assert.ok(app.logs.some((entry) => entry.includes('Kompilierung gestartet')));
  assert.ok(app.logs.some((entry) => entry.includes('Kompilierung abgebrochen')));
  assert.doesNotMatch(app.logs.join('\n'), /VERTRAULICHER-DOKUMENTINHALT/);
  app.elements.editor.value = 'Anderer Inhalt';
  await app.elements['save-btn'].handlers.click();
  await tick();
  tex().onmessage({ data: { id: tex().requests.at(-1).id, status: 'spotless', pdf: new Uint8Array([37, 80]).buffer, diagnostics: [] } });
  await tick();
  assert.ok(app.logs.some((entry) => entry.includes('Kompilierung abgeschlossen')));
});

test('Compiler-Meldungen bleiben im Compiler-Protokoll und das allgemeine Protokoll enthält nur den Status', async () => {
  const { app, tex, tick } = await texWorkerSetup();
  app.elements.editor.value = 'x';
  await app.elements['save-btn'].handlers.click();
  await tick();
  tex().onmessage({ data: {
    id: tex().requests[0].id,
    status: 'failed',
    message: 'XeTeX failed',
    diagnostics: [
      { severity: 'error', file: 'vertraulich.tex', line: 1, message: "LaTeX Error: File `scrbook.cls' not found. VERTRAULICH" },
      { severity: 'info', message: 'Zusätzlicher Hinweis' }
    ],
    missingFiles: ['main.aux.clo', 'main.aux', 'lstlang0.sty', 'scrbook.cls']
  } });
  await tick();
  const log = app.logs.join('\n');
  assert.match(log, /Compiler-Protokoll öffnen/);
  assert.doesNotMatch(log, /scrbook|vertraulich|VERTRAULICH/);
  assert.match(app.context.window.compilerLog, /Fehlende Dateien: scrbook\.cls/);
  assert.doesNotMatch(app.context.window.compilerLog, /main\.aux|lstlang0/);
  assert.match(app.context.window.compilerLog, /vertraulich\.tex:1.*VERTRAULICH/);
  assert.match(app.context.window.compilerLog, /Hinweis: Zusätzlicher Hinweis/);
});

test('TeX-Pakete werden erst nach Zustimmung geprüft und projekt- sowie branchbezogen offline gespeichert', async () => {
  const archive = new Uint8Array([0x1f, 0x8b, 1, 2, 3]);
  const integrity = createHash('sha256').update(archive).digest('hex');
  const prompts = [];
  const pack = {
    id: 'koma-script', label: 'KOMA-Script', hash: '3.43-2024.10.24',
    bytes: archive.length, integrity, license: 'LPPL 1.3c'
  };
  const sharedDatabase = new IDBFactory();
  const first = await texWorkerSetup({}, undefined, {
    indexedDBInstance: sharedDatabase,
    confirmImpl: (message) => { prompts.push(message); return true; },
    fetchImpl: async (url) => {
      assert.match(String(url), /pack-koma-script-3\.43-2024\.10\.24\.tar\.gz$/);
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength)
      };
    }
  });
  first.app.elements.editor.value = '\\documentclass{scrbook}';
  await first.app.elements['save-btn'].handlers.click();
  await first.tick();
  const firstCompile = first.tex().requests[0];
  assert.equal(firstCompile.packages.length, 0);
  first.tex().onmessage({ data: {
    id: firstCompile.id, status: 'failed', diagnostics: [], missingFiles: ['scrbook.cls'],
    missingPacks: [pack], unsupportedFiles: []
  } });
  for (let attempt = 0; attempt < 20 && first.tex().requests.length < 2; attempt += 1) await first.tick();
  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /KOMA-Script.*LPPL 1\.3c/);
  const secondCompile = first.tex().requests[1];
  assert.equal(secondCompile.packages[0].id, 'koma-script');
  assert.deepEqual([...secondCompile.packages[0].archive], [...archive]);

  first.tex().onmessage({ data: { id: secondCompile.id, status: 'spotless', diagnostics: [], missingFiles: [] } });
  await first.tick();
  const installed = await first.app.context.window.testSave.readProjectTexPacks({ repo: 'local', branch: 'main' });
  assert.equal(installed.length, 1);
  assert.deepEqual([...installed[0].archive], [...archive]);
  assert.equal((await first.app.context.window.testSave.readProjectTexPacks({ repo: 'local', branch: 'dev' })).length, 0);
  assert.equal((await first.app.context.window.testSave.readProjectTexPacks({ repo: 'another-project', branch: 'main' })).length, 0);

  const offline = await texWorkerSetup({}, undefined, {
    indexedDBInstance: sharedDatabase,
    confirmImpl: () => { throw new Error('Offline installation must not prompt again.'); }
  });
  offline.app.context.navigator.onLine = false;
  offline.app.elements.editor.value = 'Offline-Projekt';
  await offline.app.elements['save-btn'].handlers.click();
  await offline.tick();
  const offlineCompile = offline.tex().requests[0];
  assert.equal(offlineCompile.packages[0].id, 'koma-script');
  assert.equal(offline.app.requests.some((request) => String(request.url).includes('/packs/')), false);
  assert.equal(offline.app.logs.some((entry) => entry.includes('TeX-Paketdownload')), false);
});

test('Abgelehnte TeX-Paketfreigabe löst keinen Paketabruf aus', async () => {
  const prompts = [];
  const app = await texWorkerSetup({}, undefined, {
    withIndexedDB: true,
    confirmImpl: (message) => { prompts.push(message); return false; },
    fetchImpl: async () => { throw new Error('Paketabruf darf nicht erfolgen.'); }
  });
  app.app.elements.editor.value = 'Dokument';
  await app.app.elements['save-btn'].handlers.click();
  await app.tick();
  const request = app.tex().requests[0];
  app.tex().onmessage({ data: {
    id: request.id, status: 'failed', diagnostics: [], missingFiles: ['scrbook.cls'],
    missingPacks: [{ id: 'koma-script', label: 'KOMA-Script', hash: '3.43.0', bytes: 100, integrity: 'a'.repeat(64) }]
  } });
  await app.tick();
  assert.equal(prompts.length, 1);
  assert.equal(app.app.requests.length, 0);
  assert.match(app.app.context.window.compilerLog, /Download der benötigten TeX-Pakete wurde abgelehnt/);
});

test('Babel-Sprachpaket und Grundsprache werden gemeinsam nach Freigabe installiert', async () => {
  const archive = new Uint8Array([1, 2, 3]);
  const integrity = createHash('sha256').update(archive).digest('hex');
  const prompts = [];
  const app = await texWorkerSetup({}, undefined, {
    withIndexedDB: true,
    confirmImpl: (message) => { prompts.push(message); return true; },
    fetchImpl: async () => ({
      ok: true, status: 200,
      arrayBuffer: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength)
    })
  });
  app.app.elements.editor.value = '\\usepackage[ngerman]{babel}';
  await app.app.elements['save-btn'].handlers.click();
  await app.tick();
  const request = app.tex().requests[0];
  app.tex().onmessage({ data: {
    id: request.id, status: 'failed', diagnostics: [], missingFiles: ['babel-ngerman.tex'],
    missingPacks: [
      { id: 'babel-nil', label: 'Babel-Grundsprache', hash: '2024-10-24', bytes: 3, integrity },
      { id: 'babel-ngerman', label: 'Babel Deutsch', hash: '2024-10-24', bytes: 3, integrity }
    ]
  } });
  for (let attempt = 0; attempt < 20 && app.tex().requests.length < 2; attempt += 1) await app.tick();
  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /Babel-Grundsprache/);
  assert.match(prompts[0], /Babel Deutsch/);
  assert.equal(app.app.requests.length, 2);
  const next = app.tex().requests[1];
  assert.deepEqual(Array.from(next.packages, (pack) => pack.id).sort(), ['babel-ngerman', 'babel-nil']);
  app.tex().onmessage({ data: { id: next.id, status: 'spotless', diagnostics: [], missingFiles: [] } });
  await app.tick();
});

test('Ohne IndexedDB werden TeX-Pakete weder heruntergeladen noch als offline verfügbar ausgegeben', async () => {
  const app = await texWorkerSetup({}, undefined, {
    confirmImpl: () => true,
    fetchImpl: async () => { throw new Error('Paketabruf darf ohne dauerhaften Speicher nicht erfolgen.'); }
  });
  app.app.elements.editor.value = 'Dokument';
  await app.app.elements['save-btn'].handlers.click();
  await app.tick();
  const request = app.tex().requests[0];
  app.tex().onmessage({ data: {
    id: request.id, status: 'failed', diagnostics: [], missingFiles: ['scrbook.cls'],
    missingPacks: [{ id: 'koma-script', label: 'KOMA-Script', hash: '3.43.0', bytes: 100, integrity: 'a'.repeat(64) }]
  } });
  await app.tick();
  assert.equal(app.app.requests.length, 0);
  assert.match(app.app.context.window.compilerLog, /IndexedDB wird in diesem Browser nicht unterstützt/);
});

test('TeX-Pakete werden bei beschädigter oder nicht verifizierbarer Antwort nicht gespeichert', async () => {
  const archive = new Uint8Array([1, 2, 3]);
  const app = await texWorkerSetup({}, undefined, {
    withIndexedDB: true,
    confirmImpl: () => true,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength)
    })
  });
  app.app.elements.editor.value = 'Dokument';
  await app.app.elements['save-btn'].handlers.click();
  await app.tick();
  const request = app.tex().requests[0];
  app.tex().onmessage({ data: {
    id: request.id, status: 'failed', diagnostics: [], missingFiles: ['scrbook.cls'],
    missingPacks: [{ id: 'koma-script', label: 'KOMA-Script', hash: '3.43.0', bytes: 3, integrity: '0'.repeat(64) }]
  } });
  for (let attempt = 0; attempt < 20 && !/Integritätsprüfung/.test(app.app.context.window.compilerLog || ''); attempt += 1) await app.tick();
  assert.match(app.app.context.window.compilerLog, /Integritätsprüfung des TeX-Pakets ist fehlgeschlagen/);
  assert.equal((await app.app.context.window.testSave.readProjectTexPacks({ repo: 'local', branch: 'main' })).length, 0);
});

test('PDF-Vorschau rendert sichtbare Seiten und gibt Canvas-Speicher außerhalb des Ansichtsbereichs frei', async () => {
  const rendered = [];
  let created = 0;
  let destroyed = 0;
  let firstCanvas;
  const pdfjs = {
    GlobalWorkerOptions: {},
    getDocument(options) {
      assert.equal(options.isEvalSupported, false);
      assert.deepEqual([...options.data], [37, 80]);
      created += 1;
      return {
        promise: Promise.resolve({
          numPages: 5,
          async getPage(number) {
            return {
              getViewport({ scale }) {
                return { width: 300 * scale, height: (number === 3 ? 5000 : 400) * scale };
              },
              render({ canvas, canvasContext, viewport }) {
                rendered.push({ number, canvas, canvasContext, viewport });
                if (!firstCanvas) firstCanvas = canvas;
                return { promise: Promise.resolve() };
              },
              cleanup() {}
            };
          }
        }),
        destroy() { destroyed += 1; }
      };
    }
  };
  const { app, tex, tick } = await texWorkerSetup({
    'latex_ipad_document:local:main:main.tex': '\\documentclass{article}'
  }, pdfjs);
  app.context.window.devicePixelRatio = 2;

  await app.elements['toggle-preview'].handlers.click();
  assert.equal(app.elements['preview-container'].classList.contains('visible'), true);
  await tick();
  const request = tex().requests[0];
  tex().onmessage({ data: {
    id: request.id, status: 'spotless', pdf: new Uint8Array([37, 80]).buffer, diagnostics: []
  } });
  await tick();
  await tick();

  assert.equal(rendered.length, 3);
  assert.deepEqual(rendered.map((page) => page.number), [1, 2, 3]);
  assert.equal(app.elements['pdf-pages'].children.length, 5);
  assert.equal(app.elements['pdf-pages'].children.filter((page) => page.children.length === 1).length, 3);
  assert.ok(rendered.every((page) => page.canvasContext));
  assert.deepEqual(app.elements['pdf-pages'].children.map((page) => page.attributes['aria-label']), [
    'Seite 1', 'Seite 2', 'Seite 3', 'Seite 4', 'Seite 5'
  ]);
  assert.equal(app.elements['pdf-pages'].children[0].style.width, '596px');
  assert.equal(rendered[0].viewport.width, 894);
  assert.ok(rendered[2].canvas.width * rendered[2].canvas.height <= 2_000_000);
  assert.match(pdfjs.GlobalWorkerOptions.workerSrc, /pdf\.worker\.min\.mjs$/);
  assert.equal(created, 1);
  assert.equal(destroyed, 0);
  assert.match(app.elements['preview-status'].textContent, /Vorschau von main\.tex/);

  app.elements['pdf-pages'].children.slice(0, 3).forEach((page) => {
    page.getBoundingClientRect = () => ({ top: -2000, bottom: -1000, width: 596, height: 795 });
  });
  app.elements['pdf-pages'].children.slice(3).forEach((page) => {
    page.getBoundingClientRect = () => ({ top: 0, bottom: 795, width: 596, height: 795 });
  });
  app.elements['preview-container'].handlers.scroll();
  await tick();
  await tick();
  assert.equal(rendered.length, 5);
  assert.deepEqual(rendered.slice(3).map((page) => page.number), [4, 5]);
  assert.equal(app.elements['pdf-pages'].children.filter((page) => page.children.length === 1).length, 2);
  assert.equal(firstCanvas.width, 0);

  app.elements['preview-resize'].handlers.pointerdown({
    button: 0, pointerId: 9, clientX: 600, clientY: 0,
    preventDefault() {}
  });
  app.elements['preview-resize'].handlers.pointermove({ pointerId: 9, clientX: 520, clientY: 0 });
  await new Promise((resolve) => setTimeout(resolve, 120));
  await tick();
  await tick();
  assert.equal(rendered.length, 8);
  assert.equal(created, 2);
  assert.equal(destroyed, 1);
  await app.elements['toggle-preview'].handlers.click();
  await tick();
  assert.equal(destroyed, 2);
  assert.equal(app.elements['pdf-pages'].children.length, 0);
});

test('Binäre Remote-Dateien bleiben byteweise erhalten, Text wird weiterhin dekodiert', async () => {
  const app = setup({ exposeSave: true });
  const { readRemoteFile } = app.context.window.testSave;
  const binary = await readRemoteFile({ arrayBuffer: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 255]).buffer });
  assert.deepEqual([...binary.bytes], [0x89, 0x50, 0x4e, 0x47, 0, 255]);
  const invalid = await readRemoteFile({ arrayBuffer: async () => new Uint8Array([0xff, 0xfe, 0x41]).buffer });
  assert.ok(invalid.bytes);
  const text = await readRemoteFile({ arrayBuffer: async () => new TextEncoder().encode('Grüße \\LaTeX').buffer });
  assert.equal(text.text, 'Grüße \\LaTeX');
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
  assert.ok(app.logs.includes('Repository-Öffnen abgebrochen.'));
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
  assert.match(app.elements['file-list'].children[0].children[0].children[0].textContent, /alice\/empty/);
  assert.equal(app.elements['project-name'].textContent, 'alice/empty');
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
  assert.ok(app.logs.includes('IndexedDB-Dateien konnten nicht gelesen werden; lokale Kopien aus localStorage werden verwendet.'));
  assert.doesNotMatch(app.logs.join('\n'), /Lokal gespeicherter Inhalt/);
});

test('Neue TeX-Datei lässt sich im gewählten Ordner lokal und offline anlegen', async () => {
  const project = {
    id: 'local', repo: 'local', branch: 'main', activePath: 'main.tex',
    paths: ['main.tex', 'chapters/start.tex'], updatedAt: 1
  };
  const app = setup({
    localInitial: {
      latex_ipad_projects: JSON.stringify([project]),
      'latex_ipad_document:local:main:main.tex': 'Hauptdatei',
      'latex_ipad_document:local:main:chapters/start.tex': 'Kapitel'
    }
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.elements['toggle-sidebar'].hidden, true);
  assert.equal(app.elements['open-dashboard'].hidden, true);
  assert.equal(app.elements['project-settings-button'].hidden, true);
  assert.equal(app.elements['save-btn'].hidden, true);
  assert.equal(app.elements['toggle-preview'].hidden, true);
  await app.elements['local-project-list'].children[0].children[1].handlers.click();
  assert.equal(app.elements['toggle-sidebar'].hidden, false);
  assert.equal(app.elements['open-dashboard'].hidden, false);
  assert.equal(app.elements['project-settings-button'].hidden, false);
  assert.equal(app.elements['save-btn'].hidden, false);
  assert.equal(app.elements['toggle-preview'].hidden, false);
  assert.equal(app.elements['branch-selector'].hidden, true);
  assert.equal(app.elements['add-tex-file'].disabled, false);
  app.elements['add-tex-file'].handlers.click();
  assert.equal(app.elements['new-tex-file-dialog'].open, true);
  app.elements['new-tex-file-folder'].value = 'chapters';
  app.elements['new-tex-file-name'].value = 'draft.pdf';
  await app.elements['new-tex-file-form'].handlers.submit({ preventDefault() {} });
  assert.match(app.elements['new-tex-file-error'].textContent, /\.tex/);
  app.elements['new-tex-file-name'].value = 'start.tex';
  await app.elements['new-tex-file-form'].handlers.submit({ preventDefault() {} });
  assert.match(app.elements['new-tex-file-error'].textContent, /existiert bereits/);
  app.elements['new-tex-file-name'].value = 'draft.tex';
  await app.elements['new-tex-file-form'].handlers.submit({ preventDefault() {} });
  assert.equal(app.elements['new-tex-file-dialog'].open, false);
  assert.equal(app.elements.editor.value, '');
  assert.equal(app.localValues.get('latex_ipad_document:local:main:chapters/draft.tex'), '');

  app.elements.editor.value = 'Offline weiterbearbeitet';
  await app.elements['save-btn'].handlers.click();
  await app.elements['open-dashboard'].handlers.click();
  assert.equal(app.elements['toggle-sidebar'].hidden, true);
  assert.equal(app.elements['open-dashboard'].hidden, true);
  assert.equal(app.elements['project-settings-button'].hidden, true);
  assert.equal(app.elements['save-btn'].hidden, true);
  assert.equal(app.elements['toggle-preview'].hidden, true);
  app.context.navigator.onLine = false;
  await app.elements['local-project-list'].children[0].children[1].handlers.click();
  assert.equal(app.elements['toggle-sidebar'].hidden, false);
  assert.equal(app.elements['open-dashboard'].hidden, false);
  assert.equal(app.elements['project-settings-button'].hidden, false);
  assert.equal(app.elements['save-btn'].hidden, false);
  assert.equal(app.elements['toggle-preview'].hidden, false);
  assert.equal(app.elements.editor.value, 'Offline weiterbearbeitet');
  const rendered = [];
  const collectText = (node) => {
    if (node.textContent) rendered.push(node.textContent);
    for (const child of node.children || []) collectText(child);
  };
  collectText(app.elements['file-list']);
  assert.ok(rendered.includes('draft.tex'));
});

test('Editor-Layout passt Sidebar, Vorschau und Touch-Ziele an die iPad-Ausrichtung an', () => {
  assert.match(html, /button, select \{ min-height: 36px;/);
  assert.match(html, /#sidebar\.collapsed \{ width: 0; flex-basis: 0; overflow: hidden;/);
  assert.match(html, /#preview-container \{ display: none; flex: 0 0 var\(--preview-size, 40%\);/);
  assert.match(html, /id="preview-resize" role="separator"[^>]*aria-valuemin="20"[^>]*aria-valuemax="70"/);
  assert.match(html, /@media \(orientation: portrait\)[\s\S]*?#main-container \{ flex-direction: column; \}[\s\S]*?#sidebar \{ width: 100%; height: min\(var\(--sidebar-height/);
  assert.match(html, /@media \(orientation: portrait\)[\s\S]*?#preview-resize \{ flex-basis: 16px; cursor: row-resize; \}/);
});

test('PDF-Vorschau lässt sich mit Touch-Zieher und Tastatur anpassen', async () => {
  const app = setup();
  assert.equal(app.elements['preview-resize'].hidden, true);
  await app.elements['toggle-preview'].handlers.click();
  const resizer = app.elements['preview-resize'];
  assert.equal(resizer.hidden, false);
  assert.equal(resizer.attributes['aria-orientation'], 'vertical');
  resizer.handlers.pointerdown({
    button: 0, pointerId: 7, clientX: 600, clientY: 0,
    preventDefault() {}
  });
  resizer.handlers.pointermove({ pointerId: 7, clientX: 520, clientY: 0 });
  assert.equal(app.elements['preview-container'].style.flexBasis, '50%');
  assert.equal(resizer.attributes['aria-valuenow'], '50');
  resizer.handlers.pointerup({ pointerId: 7 });
  let prevented = false;
  resizer.handlers.keydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(app.elements['preview-container'].style.flexBasis, '45%');
  await app.elements['toggle-preview'].handlers.click();
  assert.equal(resizer.hidden, true);
});

test('UI-Aktionen sind als zugängliche Symbole ausgezeichnet; Login und Protokoll stehen in der Fußzeile', () => {
  const header = /<header>([\s\S]*?)<\/header>/.exec(html)[1];
  const footer = /<footer>([\s\S]*?)<\/footer>/.exec(html)[1];
  assert.doesNotMatch(header, /gh-login-btn|toggle-log|open-repo-btn/);
  const centerGroup = /<div class="toolbar-group" id="toolbar-center">([\s\S]*?)<\/div>/.exec(header)[1];
  assert.ok(centerGroup.indexOf('id="open-dashboard"') < centerGroup.indexOf('id="save-btn"'));
  assert.match(centerGroup, /id="project-settings-button"/);
  assert.match(html, /#toolbar-center \{ justify-self: center; \}/);
  assert.match(html, /#toolbar-right \{ justify-self: end; \}/);
  assert.match(header, /id="toggle-sidebar"[^>]*hidden/);
  assert.match(header, /id="open-dashboard"[^>]*hidden/);
  assert.match(header, /id="project-settings-button"[^>]*hidden/);
  assert.match(header, /id="save-btn"[^>]*hidden/);
  assert.match(header, /id="toggle-preview"[^>]*hidden/);
  assert.doesNotMatch(header, /id="branch-select"/);
  assert.match(html, /<dialog id="project-settings-dialog"[\s\S]*id="branch-selector" hidden[\s\S]*id="project-repo-link"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.ok(header.indexOf('id="toggle-preview"') > header.indexOf('id="save-btn"'));
  assert.match(header, /id="toggle-preview"[^>]*data-icon="course-book"[^>]*aria-label="Leseansicht umschalten"/);
  assert.match(html, /id="dashboard-open-repo" type="button">GitHub-Repository öffnen<\/button>/);
  assert.match(html, /id="dashboard-create-repo" type="button">Neues GitHub-Repository<\/button>/);
  assert.match(footer, /id="gh-login-btn"[^>]*data-icon="github"/);
  assert.match(footer, /id="toggle-log"[^>]*data-icon/);
  assert.doesNotMatch(html, /id="repo-label"/);
  assert.match(html, /id="dashboard-open-repo"/);
  for (const [, attributes] of html.matchAll(/<button\b([^>]*)>/g)) {
    if (/id="dashboard-(open-repo|create-repo)"/.test(attributes)) continue;
    assert.match(attributes, /data-icon=/);
    assert.match(attributes, /aria-label=/);
  }
  assert.match(html, /@font-face \{ font-family: "SAP-icons"/);
  assert.match(html, /button\[data-icon="save"\]::before \{ content: "\\e09a"/);
  assert.match(html, /button\[data-icon="github"\]::before/);
  assert.match(html, /mask: url\("\.\/icons\/github-mark\.svg"\)/);
});

test('Speichern bündelt geänderte Dateien und versionierte Projekteinstellungen in genau einem atomaren Commit', async () => {
  const app = setup({ fetchImpl: syncApiFetch() });
  await openSyncRepository(app);
  app.elements.editor.value = 'Neue lokale Version';
  await app.elements['save-btn'].handlers.click();
  assert.equal(app.elements['commit-dialog'].open, true);
  app.elements['commit-message'].value = 'Dokument aktualisieren';
  await app.elements['commit-form'].handlers.submit({ preventDefault() {} });

  const commitRequests = app.requests.filter((request) =>
    request.url.endsWith('/git/commits') && request.options.method === 'POST'
  );
  const treeRequest = app.requests.find((request) =>
    request.url.endsWith('/git/trees') && request.options.method === 'POST'
  );
  const blobRequests = app.requests.filter((request) =>
    request.url.endsWith('/git/blobs') && request.options.method === 'POST'
  );
  assert.ok(treeRequest, app.elements['commit-error'].textContent);
  const commitBody = JSON.parse(commitRequests[0].options.body);
  const treeBody = JSON.parse(treeRequest.options.body);
  const blobContents = blobRequests.map((request) => JSON.parse(request.options.body).content);
  assert.equal(commitRequests.length, 1);
  assert.equal(commitBody.message, 'Dokument aktualisieren');
  assert.deepEqual(commitBody.parents, ['a'.repeat(40)]);
  assert.ok(treeBody.tree.some((item) => item.path === 'main.tex'));
  assert.ok(treeBody.tree.some((item) => item.path === '.latex-ipad/settings.json'));
  assert.ok(blobContents.includes('Neue lokale Version'));
  assert.match(blobContents.find((content) => content.includes('"version": 1')), /"hyphenation": "auto"/);
  assert.equal(app.requests.filter((request) =>
    request.url.endsWith('/git/refs/heads/main') && request.options.method === 'PATCH'
  ).length, 1);
  assert.equal(JSON.parse(app.localValues.get('latex_ipad_file_metadata:alice/project:main:main.tex')).baseContent, 'Neue lokale Version');
  assert.equal(JSON.parse(app.localValues.get('latex_ipad_projects'))[0].remoteHeadShas.main, 'commit-created');
  assert.match(app.footer.textContent, /GitHub-Commit erfolgreich/);
  assert.equal(app.elements['commit-dialog'].open, false);
});

test('Remote-Projekteinstellungen werden beim Öffnen wiederhergestellt', async () => {
  const settingsContent = JSON.stringify({
    version: 1,
    mainFiles: { main: 'chapters.tex' },
    hyphenation: 'ngerman'
  });
  const app = setup({
    fetchImpl: syncApiFetch({
      settingsContent,
      treeItems: [
        { type: 'blob', path: 'main.tex', sha: 'main-blob-sha', size: 12, mode: '100644' },
        { type: 'blob', path: 'chapters.tex', sha: 'chapter-blob-sha', size: 14, mode: '100644' },
        { type: 'tree', path: '.latex-ipad' },
        { type: 'blob', path: '.latex-ipad/settings.json', sha: 'settings-blob-sha', size: settingsContent.length, mode: '100644' }
      ]
    })
  });
  await openSyncRepository(app);
  assert.equal(app.elements['main-file-select'].value, 'chapters.tex');
  assert.equal(app.elements['project-hyphenation'].value, 'ngerman');
  assert.deepEqual(JSON.parse(app.localValues.get('latex_ipad_settings:alice/project')), {
    mainFiles: { main: 'chapters.tex' },
    hyphenation: 'ngerman'
  });
});

test('Bereits vorhandene lokale Projekteinstellungen lassen sich beim ersten Laden behalten', async () => {
  const remoteSettings = `${JSON.stringify({
    version: 1,
    mainFiles: { main: 'main.tex' },
    hyphenation: 'english'
  }, null, 2)}\n`;
  const localSettings = { mainFiles: { main: 'main.tex' }, hyphenation: 'ngerman' };
  const app = setup({
    localInitial: { 'latex_ipad_settings:alice/project': JSON.stringify(localSettings) },
    fetchImpl: syncApiFetch({
      settingsContent: remoteSettings,
      treeItems: [
        { type: 'blob', path: 'main.tex', sha: 'main-blob-sha', size: 12, mode: '100644' },
        { type: 'tree', path: '.latex-ipad' },
        { type: 'blob', path: '.latex-ipad/settings.json', sha: 'settings-blob-sha', size: remoteSettings.length, mode: '100644' }
      ]
    })
  });
  await submit(app, 'github_pat_test123');
  const opening = app.elements['repo-list'].children[0].handlers.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.elements['sync-conflict-dialog'].open, true);
  app.elements['sync-conflict-keep-local'].handlers.click();
  await opening;
  assert.equal(app.elements['project-hyphenation'].value, 'ngerman');
  assert.deepEqual(JSON.parse(app.localValues.get('latex_ipad_settings:alice/project')), localSettings);
  const metadata = JSON.parse(app.localValues.get('latex_ipad_file_metadata:alice/project:main:.latex-ipad/settings.json'));
  assert.equal(metadata.baseContent, remoteSettings);
  assert.equal(metadata.remoteSha, 'settings-blob-sha');
});

test('Offline-Speichern bleibt lokal und startet keine GitHub-Anfrage', async () => {
  const app = setup({ fetchImpl: syncApiFetch() });
  await openSyncRepository(app);
  app.context.navigator.onLine = false;
  app.elements.editor.value = 'Nur lokal gespeichert';
  const requestsBeforeSave = app.requests.length;
  await app.elements['save-btn'].handlers.click();
  assert.equal(app.elements['commit-dialog'].open, undefined);
  assert.equal(app.requests.length, requestsBeforeSave);
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:main.tex'), 'Nur lokal gespeichert');
  assert.match(app.footer.textContent, /Offline; keine GitHub-Anfrage gestartet/);
});

test('Commit bricht bei geändertem Remote-Branch ab und erhält lokale Änderungen', async () => {
  const app = setup({ fetchImpl: syncApiFetch({ refSha: 'b'.repeat(40) }) });
  await openSyncRepository(app);
  app.elements.editor.value = 'Lokale Änderung bleibt erhalten';
  await app.elements['save-btn'].handlers.click();
  app.elements['commit-message'].value = 'Änderung sichern';
  await app.elements['commit-form'].handlers.submit({ preventDefault() {} });
  assert.match(app.elements['commit-error'].textContent, /Branch wurde seit dem letzten Laden geändert/);
  assert.equal(app.requests.some((request) => request.url.endsWith('/git/blobs') && request.options.method === 'POST'), false);
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:main.tex'), 'Lokale Änderung bleibt erhalten');
  assert.ok(app.logs.includes('GitHub-Commit fehlgeschlagen; lokale Änderungen bleiben erhalten.'));
});

test('GitHub-Schreibfehler bleibt sichtbar und lokale Änderungen bleiben erhalten', async () => {
  const app = setup({ fetchImpl: syncApiFetch({ writeStatus: 403 }) });
  await openSyncRepository(app);
  app.elements.editor.value = 'Lokale Änderung ohne Berechtigung';
  await app.elements['save-btn'].handlers.click();
  app.elements['commit-message'].value = 'Änderung sichern';
  await app.elements['commit-form'].handlers.submit({ preventDefault() {} });
  assert.match(app.elements['commit-error'].textContent, /GitHub API 403/);
  assert.equal(app.localValues.get('latex_ipad_document:alice/project:main:main.tex'), 'Lokale Änderung ohne Berechtigung');
  assert.equal(app.requests.some((request) =>
    request.url.endsWith('/git/refs/heads/main') && request.options.method === 'PATCH'
  ), false);
});

test('Remote-Projekt erscheint nach dem Öffnen lokal und lässt sich mit IndexedDB offline wieder öffnen', async () => {
  const app = setup({
    withIndexedDB: true,
    fetchImpl: async (url) => {
      if (url.endsWith('/user')) return response({});
      if (url.includes('/user/repos')) return response([{ full_name: 'alice/offline-ready', default_branch: 'main' }]);
      if (url.includes('/branches')) return response([{ name: 'main' }]);
      if (url.includes('/git/trees/')) return response({ truncated: false, tree: [
        { type: 'blob', path: 'main.tex', sha: 'main-sha', size: 12, mode: '100644' },
        { type: 'blob', path: 'chapters/intro.tex', sha: 'intro-sha', size: 15, mode: '100644' },
        { type: 'tree', path: 'chapters' }
      ] });
      if (url.includes('/contents/main.tex')) return { ok: true, text: async () => 'Remote-Hauptdatei' };
      if (url.includes('/contents/chapters/intro.tex')) return { ok: true, text: async () => 'Remote-Einleitung' };
      throw new Error(`Unerwartete URL: ${url}`);
    }
  });

  assert.equal(app.elements['toggle-sidebar'].disabled, true);
  app.elements['toggle-sidebar'].handlers.click();
  assert.equal(app.elements.sidebar.classList.contains('collapsed'), false);
  await submit(app, 'github_pat_test123');
  await app.elements['repo-list'].children[0].handlers.click();

  assert.equal(app.elements['main-container'].hidden, false);
  assert.equal(app.elements['toggle-sidebar'].disabled, false);
  assert.equal(app.elements.dashboard.hidden, true);
  assert.equal(app.elements.sidebar.classList.contains('collapsed'), false);
  await app.elements['toggle-sidebar'].handlers.click();
  assert.equal(app.elements.sidebar.classList.contains('collapsed'), true);
  await app.elements['toggle-sidebar'].handlers.click();
  assert.equal(app.elements.sidebar.classList.contains('collapsed'), false);
  assert.equal(app.elements.editor.value, 'Remote-Hauptdatei');

  await app.elements['open-dashboard'].handlers.click();
  assert.equal(app.elements['toggle-sidebar'].disabled, true);
  assert.equal(app.elements.dashboard.hidden, false);
  assert.equal(app.elements['local-project-list'].children.length, 1);
  assert.match(app.elements['local-project-list'].children[0].children[0].children[0].textContent, /alice\/offline-ready/);
  assert.match(app.elements['local-project-list'].children[0].children[0].children[1].textContent, /2 lokal gespeicherte Dateien/);

  const requestCount = app.requests.length;
  app.context.navigator.onLine = false;
  await app.elements['local-project-list'].children[0].children[1].handlers.click();
  assert.equal(app.elements['main-container'].hidden, false);
  assert.equal(app.elements.editor.value, 'Remote-Hauptdatei');
  assert.equal(app.requests.length, requestCount);
  assert.match(app.footer.textContent, /Offline-Projekt geöffnet/);
});

test('Regelmäßige lokale Sicherung arbeitet unabhängig von Inaktivität und Netzwerkstatus', async () => {
  const app = setup();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.intervals.length, 1);
  assert.equal(app.intervals[0].delay, 3 * 60 * 1000);
  app.context.navigator.onLine = false;
  app.elements.editor.value = 'Lange Bearbeitung';
  app.elements.editor.handlers.input();
  app.intervals[0].callback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.localValues.get('latex_ipad_document:local:main:main.tex'), 'Lange Bearbeitung');
  assert.match(html, /id="save-btn"[^>]*>Speichern<\/button>/);
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
  assert.equal(app.elements['project-name'].textContent, 'alice/new-project');
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
  assert.equal(app.elements['project-name'].textContent, 'alice/retry-project');
});
