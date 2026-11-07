const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const origin = 'https://example.test';
const scope = `${origin}/latex_on_ipad/`;
const currentCache = 'latex-pwa-__COMMIT_SHA__';

function createWorker({ entries = {}, networkFails = false, missingIndex = false } = {}) {
  const handlers = {};
  const cached = new Map(Object.entries(entries));
  const deletedCaches = [];
  const writes = [];
  const addedAssets = [];
  const networkRequests = [];
  const index = { name: 'index' };
  const network = { name: 'network', ok: true, clone() { return this; } };
  const cache = {
    async addAll(assets) { addedAssets.push(...assets); },
    async keys() { return [...cached.keys()].map((url) => ({ url })); },
    async delete(request) { return cached.delete(request.url); },
    async match(request) { return cached.get(request.url); },
    async put(request, response) { writes.push(request.url); cached.set(request.url, response); }
  };
  const caches = {
    async keys() { return [currentCache, 'latex-pwa-old', 'unrelated-cache']; },
    async delete(name) { deletedCaches.push(name); return true; },
    async open() { return cache; },
    async match(request) {
      if (request === './index.html') return missingIndex ? undefined : index;
      return cached.get(request.url);
    }
  };
  const self = {
    location: { origin },
    registration: { scope },
    clients: { claim() {} },
    skipWaiting() {},
    addEventListener(type, handler) { handlers[type] = handler; }
  };
  vm.runInNewContext(source, {
    self, caches, URL, Promise, console,
    fetch: async (request) => {
      networkRequests.push(request.url);
      if (networkFails) throw new Error('offline');
      return network;
    }
  });
  return { handlers, cached, deletedCaches, writes, networkRequests, index, network, addedAssets };
}

test('Installation hält den LaTeX-Prüf-Worker offline vor', async () => {
  const worker = createWorker();
  let installation;
  worker.handlers.install({ waitUntil(value) { installation = value; } });
  await installation;
  assert.ok(worker.addedAssets.includes('./js/lint-worker.js'));
  assert.ok(worker.addedAssets.includes('./js/tex-worker.js'));
  assert.ok(!worker.addedAssets.some((asset) => /engine|pdfjs/.test(asset)));
});

function dispatchFetch(worker, url, mode = 'navigate') {
  let response;
  worker.handlers.fetch({
    request: { url, mode, method: 'GET' },
    respondWith(value) { response = value; }
  });
  return response;
}

test('OAuth-Rücksprung verwendet die App-Shell ohne Cache-Eintrag oder Netzwerkanfrage', async () => {
  const worker = createWorker();
  for (const query of ['code=secret&state=value', 'error=access_denied&state=value', 'state=', 'error_description=denied']) {
    assert.equal(await dispatchFetch(worker, `${scope}?${query}`), worker.index);
  }
  assert.deepEqual(worker.writes, []);
  assert.deepEqual(worker.networkRequests, []);
});

test('OAuth-Rücksprung wird ohne App-Shell über das Netzwerk geladen, aber nicht gecacht', async () => {
  const worker = createWorker({ missingIndex: true });
  const url = `${scope}?code=secret&state=value`;
  assert.equal(await dispatchFetch(worker, url), worker.network);
  assert.deepEqual(worker.networkRequests, [url]);
  assert.deepEqual(worker.writes, []);
});

test('Aktivierung entfernt alte App-Caches und vorhandene OAuth-Einträge', async () => {
  const callback = `${scope}?code=secret&state=value`;
  const errorCallback = `${scope}index.html?error=access_denied`;
  const ordinary = `${scope}?view=editor`;
  const worker = createWorker({ entries: { [callback]: {}, [errorCallback]: {}, [ordinary]: {} } });
  let activation;
  worker.handlers.activate({ waitUntil(value) { activation = value; } });
  await activation;
  assert.equal(worker.cached.has(callback), false);
  assert.equal(worker.cached.has(errorCallback), false);
  assert.equal(worker.cached.has(ordinary), true);
  assert.deepEqual(worker.deletedCaches, ['latex-pwa-old']);
});

test('Gewöhnliche Navigation und Assets behalten das bestehende Cache-Verhalten', async () => {
  const worker = createWorker();
  const url = `${scope}?view=editor`;
  assert.equal(await dispatchFetch(worker, url), worker.network);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(worker.writes, [url]);
  assert.equal(await dispatchFetch(worker, url), worker.network);
  assert.deepEqual(worker.networkRequests, [url]);
  assert.equal(dispatchFetch(worker, 'https://github.com/login/oauth/access_token'), undefined);
});

test('Normale Navigation fällt offline auf die App-Shell zurück', async () => {
  const worker = createWorker({ networkFails: true });
  assert.equal(await dispatchFetch(worker, `${scope}?view=editor`), worker.index);
});

test('Große Engine- und PDF.js-Dateien werden beim ersten Abruf gecacht und danach offline geliefert', async () => {
  const online = createWorker();
  for (const name of ['engine/tectonic_wasm.wasm', 'pdfjs/pdf.min.mjs']) {
    const url = `${scope}js/${name}`;
    assert.equal(await dispatchFetch(online, url, 'same-origin'), online.network);
    assert.equal(online.cached.get(url), online.network);
  }
  const offline = createWorker({ networkFails: true, entries: { [`${scope}js/engine/tectonic-bundle.tar.gz`]: { name: 'bundle' } } });
  assert.equal((await dispatchFetch(offline, `${scope}js/engine/tectonic-bundle.tar.gz`, 'same-origin')).name, 'bundle');
  await assert.rejects(dispatchFetch(offline, `${scope}js/engine/tectonic_wasm.wasm`, 'same-origin'));
});
