(() => {
  'use strict';

  const DB_NAME = 'LaTeXPWA_VFS';
  const DB_VERSION = 1;
  const DEFAULT_DOCUMENT = '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nBitte mit GitHub verbinden, um zu starten!\n\\end{document}';
  const MONACO_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';

  const textarea = document.getElementById('editor');
  const monacoHost = document.getElementById('monaco-editor');
  const loginButton = document.getElementById('gh-login-btn');
  const loginDialog = document.getElementById('github-login-dialog');
  const loginForm = document.getElementById('github-login-form');
  const tokenInput = document.getElementById('github-token');
  const loginError = document.getElementById('github-login-error');
  const loginSubmit = document.getElementById('github-login-submit');
  const repoLabel = document.getElementById('repo-label');
  const branchSelect = document.getElementById('branch-select');
  const fileList = document.getElementById('file-list');
  let repoName = localStorage.getItem('gh_current_repo') || '';
  let branchName = localStorage.getItem('gh_current_branch') || 'main';
  let token = sessionStorage.getItem('gh_token') || '';
  if (token && !token.startsWith('github_pat_')) {
    sessionStorage.removeItem('gh_token');
    token = '';
  }
  let loginRequest;
  let activePath = 'main.tex';
  let dbPromise;
  let monacoEditor;
  let saveTimer;
  let suppressEditorChanges = false;

  function showError(message) { alert(message); }
  function setStatus(message) {
    const footer = document.querySelector('footer');
    if (footer) footer.textContent = message;
  }
  function fileId(repo, branch, path) { return `${repo}\u0000${branch}\u0000${path}`; }

  function openDatabase() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB wird in diesem Browser nicht unterstützt.'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects', { keyPath: 'id' });
        if (!database.objectStoreNames.contains('files')) database.createObjectStore('files', { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB konnte nicht geöffnet werden.'));
      request.onblocked = () => reject(new Error('IndexedDB-Upgrade wird durch einen anderen App-Tab blockiert.'));
    });
    return dbPromise;
  }

  async function storeRecord(storeName, record) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite');
      transaction.objectStore(storeName).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Lokales Speichern fehlgeschlagen.'));
      transaction.onabort = () => reject(transaction.error || new Error('Lokales Speichern wurde abgebrochen.'));
    });
  }

  async function readRecord(storeName, id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Lokaler Inhalt konnte nicht geladen werden.'));
    });
  }

  async function getEditorValue() {
    return monacoEditor ? monacoEditor.getValue() : textarea.value;
  }
  function setEditorValue(value) {
    suppressEditorChanges = true;
    if (monacoEditor) monacoEditor.setValue(value);
    textarea.value = value;
    suppressEditorChanges = false;
  }

  async function persistCurrentFile(showSavedStatus = false) {
    const content = await getEditorValue();
    const record = { id: fileId(repoName || 'local', branchName, activePath), repo: repoName || 'local', branch: branchName, path: activePath, content, updatedAt: Date.now() };
    try {
      await storeRecord('files', record);
      if (repoName) localStorage.setItem(`latex_ipad_document:${repoName}:${branchName}:${activePath}`, content);
      localStorage.setItem('latex_ipad_document', content);
      if (showSavedStatus) setStatus(`Lokal in IndexedDB gespeichert: ${activePath}`);
    } catch (error) {
      try {
        localStorage.setItem(`latex_ipad_document:${repoName || 'local'}:${branchName}:${activePath}`, content);
        localStorage.setItem('latex_ipad_document', content);
        setStatus(`IndexedDB nicht verfügbar; Fallback in localStorage: ${error.message}`);
      } catch (fallbackError) {
        if (showSavedStatus) showError(`Speichern fehlgeschlagen: ${fallbackError.message}`);
      }
    }
  }

  function scheduleAutoSave() {
    if (suppressEditorChanges) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistCurrentFile().then(() => setStatus(`Automatisch lokal gespeichert: ${activePath}`));
    }, 500);
  }

  textarea.addEventListener('input', scheduleAutoSave);
  document.getElementById('toggle-sidebar').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
  document.getElementById('toggle-preview').addEventListener('click', () => document.getElementById('preview-container').classList.toggle('visible'));
  document.getElementById('save-btn').addEventListener('click', () => persistCurrentFile(true));

  async function loadMonaco() {
    if (!navigator.onLine || !window.crypto) return false;
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `${MONACO_BASE}/loader.js`;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Monaco-CDN ist nicht erreichbar.'));
        document.head.appendChild(script);
      });
      window.MonacoEnvironment = {
        getWorkerUrl: () => {
          const worker = `self.MonacoEnvironment={baseUrl:'${MONACO_BASE}/'};importScripts('${MONACO_BASE}/base/worker/workerMain.js');`;
          return URL.createObjectURL(new Blob([worker], { type: 'text/javascript' }));
        }
      };
      await new Promise((resolve) => window.require.config({ paths: { vs: MONACO_BASE } })(['vs/editor/editor.main'], resolve));
      monacoEditor = window.monaco.editor.create(monacoHost, {
        value: textarea.value || DEFAULT_DOCUMENT,
        language: 'latex',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false
      });
      monacoEditor.onDidChangeModelContent(scheduleAutoSave);
      textarea.style.display = 'none';
      monacoHost.style.display = 'block';
      return true;
    } catch (error) {
      setStatus(`Offline-Texteditor aktiv${navigator.onLine ? ` (Monaco nicht geladen: ${error.message})` : ''}`);
      return false;
    }
  }

  function clearLegacyOAuthCallback() {
    const callbackUrl = new URL(location.href);
    const params = callbackUrl.searchParams;
    sessionStorage.removeItem('gh_pkce_verifier');
    sessionStorage.removeItem('gh_oauth_state');
    if (params.has('code') || params.has('state') || params.has('error')) {
      ['code', 'state', 'error', 'error_description', 'error_uri'].forEach((key) => callbackUrl.searchParams.delete(key));
      history.replaceState({}, document.title, `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);
      setStatus('Der frühere OAuth-Login ist nicht mehr aktiv. Bitte mit einem Fine-grained Token verbinden.');
    }
  }
  async function githubApi(path, accept = 'application/vnd.github+json') {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: accept, Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
    return response;
  }

  async function showFile(path, row) {
    activePath = path;
    try {
      const id = fileId(repoName, branchName, path);
      let record = await readRecord('files', id).catch(() => null);
      let content = record?.content;
      if (content === undefined || content === null) content = localStorage.getItem(`latex_ipad_document:${repoName}:${branchName}:${path}`);
      if (content === null || content === undefined) {
        const [owner, name] = repoName.split('/');
        const response = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branchName)}`, 'application/vnd.github.raw+json');
        content = await response.text();
        await storeRecord('files', { id, repo: repoName, branch: branchName, path, content, updatedAt: Date.now() });
      }
      setEditorValue(content);
      document.querySelectorAll('.file-item').forEach((element) => element.classList.remove('active'));
      if (row) row.classList.add('active');
      setStatus(`Datei geladen: ${path}`);
    } catch (error) { showError(error.message); }
  }

  async function loadRepository() {
    if (!repoName || !token) return;
    const parts = repoName.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Repo-Format muss owner/repo sein.');
    const [owner, name] = parts;
    fileList.textContent = 'Lade Repository…';
    const branchesResponse = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branches`);
    const branches = await branchesResponse.json();
    branchSelect.replaceChildren(...branches.map((branch) => {
      const option = document.createElement('option'); option.value = branch.name; option.textContent = branch.name; option.selected = branch.name === branchName; return option;
    }));
    if (!branches.some((branch) => branch.name === branchName) && branches.length) {
      branchName = branches[0].name;
      branchSelect.value = branchName;
      localStorage.setItem('gh_current_branch', branchName);
    }
    const treeResponse = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(branchName)}?recursive=1`);
    const tree = await treeResponse.json();
    fileList.replaceChildren();
    (tree.tree || []).filter((item) => item.type === 'blob').forEach((item) => {
      const row = document.createElement('div'); row.className = 'file-item'; row.textContent = item.path;
      row.addEventListener('click', () => showFile(item.path, row)); fileList.appendChild(row);
    });
    await storeRecord('projects', { id: repoName, repo: repoName, branch: branchName, updatedAt: Date.now() }).catch(() => {});
    setStatus(`Repo geladen: ${repoName} (${branchName})`);
  }

  loginButton.addEventListener('click', () => {
    if (token) {
      sessionStorage.removeItem('gh_token'); token = ''; loginButton.textContent = 'GitHub Login'; loginButton.style.background = '';
      setStatus('Von GitHub abgemeldet.'); return;
    }
    loginError.textContent = '';
    loginDialog.showModal();
  });
  document.getElementById('github-login-cancel').addEventListener('click', () => loginDialog.close());
  loginDialog.addEventListener('close', () => {
    if (loginRequest) loginRequest.abort();
    loginRequest = undefined;
    loginSubmit.disabled = false;
    loginForm.reset();
    loginError.textContent = '';
  });
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (loginRequest) return;
    const candidate = tokenInput.value.trim();
    if (!/^github_pat_[A-Za-z0-9_]+$/.test(candidate)) {
      loginError.textContent = 'Bitte ein Fine-grained Personal Access Token eingeben, kein GitHub-Passwort.';
      return;
    }
    const controller = new AbortController();
    loginRequest = controller;
    loginSubmit.disabled = true;
    loginError.textContent = '';
    try {
      let response;
      try {
        response = await fetch('https://api.github.com/user', {
          headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${candidate}`, 'X-GitHub-Api-Version': '2022-11-28' },
          signal: controller.signal
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        throw new Error('GitHub ist nicht erreichbar. Bitte Internetverbindung prüfen und erneut versuchen.');
      }
      if (controller.signal.aborted) return;
      if (response.status === 401) throw new Error('GitHub hat das Token abgelehnt. Bitte Gültigkeit und Ablaufdatum prüfen.');
      if (!response.ok) throw new Error(`GitHub konnte das Token nicht prüfen (HTTP ${response.status}). Bitte später erneut versuchen.`);
      sessionStorage.setItem('gh_token', candidate);
      token = candidate;
      loginButton.textContent = 'Verbunden'; loginButton.style.background = '#28a745';
      loginDialog.close();
      setStatus('Mit GitHub verbunden.');
      if (repoName) {
        try { await loadRepository(); }
        catch (error) { fileList.textContent = error.message; setStatus('GitHub verbunden, Repository konnte nicht geladen werden.'); }
      }
    } catch (error) {
      if (!controller.signal.aborted) loginError.textContent = error.message;
    } finally {
      if (loginRequest === controller) {
        loginRequest = undefined;
        loginSubmit.disabled = false;
      }
    }
  });
  repoLabel.addEventListener('click', async () => {
    const value = prompt('GitHub Repository angeben (Format: owner/repo):', repoName || 'owner/repo');
    if (!value) return;
    repoName = value.trim(); localStorage.setItem('gh_current_repo', repoName); repoLabel.textContent = repoName;
    await storeRecord('projects', { id: repoName, repo: repoName, branch: branchName, updatedAt: Date.now() }).catch(() => {});
    if (!token) { showError('Bitte zuerst über „GitHub Login“ verbinden.'); return; }
    try { await loadRepository(); } catch (error) { fileList.textContent = error.message; }
  });
  branchSelect.addEventListener('change', async () => {
    branchName = branchSelect.value; localStorage.setItem('gh_current_branch', branchName);
    try { await persistCurrentFile(); await loadRepository(); } catch (error) { fileList.textContent = error.message; }
  });
  window.addEventListener('online', () => setStatus('Internetverbindung verfügbar. Lokales Arbeiten bleibt aktiv.'));
  window.addEventListener('offline', () => setStatus('Offline-Modus: lokale Dateien bleiben verfügbar.'));

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      setStatus('Service Worker wird von diesem Browser nicht unterstützt.');
      return;
    }
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      setStatus(`Service Worker konnte nicht registriert werden: ${error.message}`);
    }
  }

  async function initialize() {
    try {
      clearLegacyOAuthCallback();
      const saved = await readRecord('files', fileId(repoName || 'local', branchName, activePath)).catch(() => null);
      const fallback = localStorage.getItem(`latex_ipad_document:${repoName || 'local'}:${branchName}:${activePath}`) || localStorage.getItem('latex_ipad_document');
      textarea.value = saved?.content ?? fallback ?? DEFAULT_DOCUMENT;
      await loadMonaco();
      await registerServiceWorker();
      if (repoName) repoLabel.textContent = repoName;
      branchSelect.value = branchName;
      if (token) {
        loginButton.textContent = 'Verbunden'; loginButton.style.background = '#28a745';
        await loadRepository();
      }
      setStatus(navigator.onLine ? 'Editor bereit. Änderungen werden lokal automatisch gespeichert.' : 'Offline-Modus: lokale Bearbeitung ist aktiv.');
    } catch (error) {
      setStatus(`App-Fehler: ${error.message}`);
      showError(error.message);
    }
  }

  initialize();
})();
