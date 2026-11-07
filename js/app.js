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
  const repoDialog = document.getElementById('repo-dialog');
  const repoCount = document.getElementById('repo-count');
  const repoError = document.getElementById('repo-error');
  const repoList = document.getElementById('repo-list');
  const repoRetry = document.getElementById('repo-retry');
  const createRepoDialog = document.getElementById('create-repo-dialog');
  const createRepoForm = document.getElementById('create-repo-form');
  const createRepoName = document.getElementById('create-repo-name');
  const createRepoDescription = document.getElementById('create-repo-description');
  const createRepoStatus = document.getElementById('create-repo-status');
  const createRepoError = document.getElementById('create-repo-error');
  const createRepoSubmit = document.getElementById('create-repo-submit');
  const dashboard = document.getElementById('dashboard');
  const dashboardList = document.getElementById('local-project-list');
  const dashboardEmpty = document.getElementById('local-project-empty');
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
  let repoListRequest;
  let repoOpenRequest;
  let repositoryLoading = false;
  let activePath = 'main.tex';
  let dbPromise;
  let monacoEditor;
  let saveTimer;
  let fileLoadRequest;
  let createRepoRequest;
  let pendingRepoCreation;
  let activeFileButtons = [];
  let activeFileLoaded = false;
  let suppressEditorChanges = false;
  let saveQueue = Promise.resolve();

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

  async function readAllRecords(storeName) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error('Lokale Projektdaten konnten nicht geladen werden.'));
    });
  }

  function readProjectCatalog() {
    try {
      const catalog = JSON.parse(localStorage.getItem('latex_ipad_projects') || '[]');
      return Array.isArray(catalog) ? catalog : [];
    } catch (error) {
      throw new Error(`Lokale Projektübersicht konnte nicht gelesen werden: ${error.message}`);
    }
  }

  function writeProjectCatalog(project) {
    const projects = readProjectCatalog().filter((item) => item.id !== project.id);
    projects.push(project);
    localStorage.setItem('latex_ipad_projects', JSON.stringify(projects));
  }

  async function storeProject(project) {
    await storeRecord('projects', project);
    writeProjectCatalog(project);
  }

  function getEditorValue() {
    return monacoEditor ? monacoEditor.getValue() : textarea.value;
  }
  function setEditorValue(value) {
    suppressEditorChanges = true;
    if (monacoEditor) monacoEditor.setValue(value);
    textarea.value = value;
    suppressEditorChanges = false;
  }

  function persistCurrentFile(showSavedStatus = false) {
    const content = getEditorValue();
    const record = { id: fileId(repoName || 'local', branchName, activePath), repo: repoName || 'local', branch: branchName, path: activePath, content, updatedAt: Date.now() };
    const save = async () => {
      try {
        await storeRecord('files', record);
        const previous = await readRecord('projects', record.repo);
        await storeProject({
          id: record.repo,
          repo: record.repo,
          branch: record.branch,
          activePath: record.path,
          paths: [...new Set([...(previous?.paths || []), record.path])],
          updatedAt: record.updatedAt
        });
        localStorage.setItem(`latex_ipad_document:${record.repo}:${record.branch}:${record.path}`, content);
        localStorage.setItem('latex_ipad_document', content);
        if (showSavedStatus) setStatus(`Lokal in IndexedDB gespeichert: ${record.path}`);
      } catch (error) {
        try {
          localStorage.setItem(`latex_ipad_document:${record.repo}:${record.branch}:${record.path}`, content);
          localStorage.setItem('latex_ipad_document', content);
          const previous = readProjectCatalog().find((project) => project.id === record.repo);
          writeProjectCatalog({
            id: record.repo,
            repo: record.repo,
            branch: record.branch,
            activePath: record.path,
            paths: [...new Set([...(previous?.paths || []), record.path])],
            updatedAt: record.updatedAt
          });
          setStatus(`IndexedDB nicht verfügbar; Fallback in localStorage: ${error.message}`);
        } catch (fallbackError) {
          throw new Error(`Lokales Speichern fehlgeschlagen: ${fallbackError.message}`);
        }
      }
    };
    const result = saveQueue.catch(() => {}).then(save);
    saveQueue = result;
    return result;
  }

  function scheduleAutoSave() {
    if (suppressEditorChanges) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistCurrentFile().catch((error) => { setStatus(error.message); showError(error.message); });
    }, 500);
  }

  textarea.addEventListener('input', () => {
    activeFileLoaded = true;
    scheduleAutoSave();
  });
  document.getElementById('toggle-sidebar').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
  document.getElementById('toggle-preview').addEventListener('click', () => document.getElementById('preview-container').classList.toggle('visible'));
  document.getElementById('save-btn').addEventListener('click', () => persistCurrentFile(true).catch((error) => showError(error.message)));

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
      monacoEditor.onDidChangeModelContent(() => {
        if (!suppressEditorChanges) {
          activeFileLoaded = true;
          scheduleAutoSave();
        }
      });
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
  async function githubApi(path, accept = 'application/vnd.github+json', signal) {
    if (signal?.aborted) throw new Error('Anfrage abgebrochen.');
    const url = new URL(path, 'https://api.github.com');
    if (url.origin !== 'https://api.github.com') throw new Error('Ungültige GitHub-API-Adresse.');
    const response = await fetch(url.href, {
      headers: { Accept: accept, Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' },
      signal
    });
    if (signal?.aborted) throw new Error('Anfrage abgebrochen.');
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
    return response;
  }

  async function githubPages(path, signal) {
    const items = [];
    let url = new URL(path, 'https://api.github.com');
    const expectedPath = url.pathname;
    const visited = new Set();
    while (url) {
      if (url.origin !== 'https://api.github.com' || url.pathname !== expectedPath || visited.has(url.href)) {
        throw new Error('Ungültige GitHub-Seitennavigation.');
      }
      visited.add(url.href);
      const response = await githubApi(url.href, 'application/vnd.github+json', signal);
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('GitHub lieferte eine ungültige Liste.');
      items.push(...page);
      const link = response.headers.get('link') || '';
      const next = link.split(',').map((part) => part.trim()).find((part) => /;\s*rel="next"/.test(part));
      const match = next && next.match(/^<([^>]+)>/);
      if (next && !match) throw new Error('GitHub lieferte einen ungültigen Seitenlink.');
      url = match ? new URL(match[1], url) : null;
    }
    return items;
  }

  async function githubWrite(path, method, body, signal) {
    if (!token || !navigator.onLine) throw new Error('Für GitHub-Schreibzugriffe werden eine Verbindung und ein gültiges Token benötigt.');
    const url = new URL(path, 'https://api.github.com');
    if (url.origin !== 'https://api.github.com') throw new Error('Ungültige GitHub-API-Adresse.');
    const response = await fetch(url.href, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal
    });
    if (signal?.aborted) throw new Error('Anfrage abgebrochen.');
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
    return response;
  }

  function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function renderFileTree(items) {
    const root = document.createElement('ul');
    root.className = 'file-tree';
    const directories = new Map([['', root]]);
    activeFileButtons = [];
    const sorted = items.filter((item) => item.type === 'tree' || item.type === 'blob')
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path));
    for (const item of sorted) {
      const parts = item.path.split('/');
      const name = parts.pop();
      const parentPath = parts.join('/');
      const parent = directories.get(parentPath);
      if (!parent) throw new Error('GitHub lieferte eine unvollständige Ordnerstruktur.');
      const row = document.createElement('li');
      row.className = 'file-item';
      if (item.type === 'tree') {
        const label = document.createElement('span');
        label.textContent = `📁 ${name}`;
        row.appendChild(label);
        const children = document.createElement('ul');
        row.appendChild(children);
        directories.set(item.path, children);
      } else {
        const extension = name.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
        const editable = extension === 'tex' || extension === 'latex' || extension === 'ltx';
        const label = document.createElement(editable ? 'button' : 'span');
        if (editable) {
          label.type = 'button';
          label.className = 'file-select-button';
          label.setAttribute('aria-label', `LaTeX-Datei bearbeiten: ${name}`);
          label.addEventListener('click', async () => {
            if (fileLoadRequest) fileLoadRequest.abort();
            const controller = new AbortController();
            fileLoadRequest = controller;
            try {
              await selectFile(item.path, controller.signal);
            } catch (error) {
              if (!controller.signal.aborted) setStatus(`Datei konnte nicht geladen werden: ${error.message}`);
            } finally {
              if (fileLoadRequest === controller) fileLoadRequest = undefined;
            }
          });
          activeFileButtons.push({ path: item.path, button: label });
        } else {
          label.className = 'file-readonly';
          label.setAttribute('role', 'img');
          label.setAttribute('aria-label', `Nicht bearbeitbare Datei: ${name}`);
        }
        label.textContent = `${editable ? '✏️' : '🔒'} ${name}`;
        row.appendChild(label);
      }
      parent.appendChild(row);
    }
    return root;
  }

  function localTreeItems(paths) {
    const directories = new Set();
    const files = [];
    for (const path of paths) {
      const parts = path.split('/');
      parts.pop();
      while (parts.length) {
        directories.add(parts.join('/'));
        parts.pop();
      }
      files.push({ type: 'blob', path });
    }
    return [
      ...[...directories].map((path) => ({ type: 'tree', path })),
      ...files
    ];
  }

  function showEditor() {
    dashboard.hidden = true;
    document.getElementById('main-container').hidden = false;
  }

  async function refreshDashboard() {
    dashboardList.replaceChildren();
    try {
      let projects = [];
      let files = [];
      try { projects = await readAllRecords('projects'); }
      catch (error) {
        setStatus(`IndexedDB-Projekte konnten nicht gelesen werden: ${error.message}`);
      }
      try { files = await readAllRecords('files'); }
      catch (error) {
        setStatus(`IndexedDB-Dateien konnten nicht gelesen werden; localStorage-Projekte werden angezeigt: ${error.message}`);
      }
      const catalog = readProjectCatalog();
      const merged = new Map(catalog.map((project) => [project.id, project]));
      projects.forEach((project) => merged.set(project.id, { ...merged.get(project.id), ...project }));
      files.forEach((file) => {
        const existing = merged.get(file.repo);
        if (existing?.branch && existing.branch !== file.branch) return;
        const project = existing || { id: file.repo, repo: file.repo, branch: file.branch, paths: [] };
        project.paths = [...new Set([...(project.paths || []), file.path])];
        project.updatedAt = Math.max(project.updatedAt || 0, file.updatedAt || 0);
        merged.set(file.repo, project);
      });
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith('latex_ipad_document:')) continue;
        const parts = key.slice('latex_ipad_document:'.length).split(':');
        const repo = parts[0] === 'local' ? parts.shift() : `${parts.shift()}/${parts.shift()}`;
        const branch = parts.shift();
        const path = parts.join(':');
        if (!repo || !branch || !path) continue;
        const existing = merged.get(repo);
        if (existing?.branch && existing.branch !== branch) continue;
        const project = existing || { id: repo, repo, branch, paths: [] };
        project.paths = [...new Set([...(project.paths || []), path])];
        merged.set(repo, project);
      }
      const ordered = [...merged.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      dashboardEmpty.hidden = ordered.length > 0;
      dashboardEmpty.textContent = ordered.length ? '' : 'Noch keine lokal gespeicherten Projekte. Öffne ein GitHub-Repository und lade Dateien oder bearbeite ein lokales Dokument.';
      for (const project of ordered) {
        const card = document.createElement('article');
        card.className = 'local-project';
        const details = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = project.repo === 'local' ? 'Lokales Projekt' : project.repo;
        const metadata = document.createElement('p');
        metadata.textContent = `${project.branch || 'main'} · ${(project.paths || []).length} lokal gespeicherte ${project.paths?.length === 1 ? 'Datei' : 'Dateien'}`;
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = 'Lokal öffnen';
        open.setAttribute('aria-label', `Lokal öffnen: ${title.textContent}`);
        open.addEventListener('click', () => openLocalProject(project).catch((error) => {
          setStatus(`Lokales Projekt konnte nicht geöffnet werden: ${error.message}`);
          showError(error.message);
        }));
        details.append(title, metadata);
        card.append(details, open);
        dashboardList.appendChild(card);
      }
    } catch (error) {
      dashboardEmpty.hidden = false;
      dashboardEmpty.textContent = `Lokale Projektübersicht konnte nicht geladen werden: ${error.message}`;
      setStatus(dashboardEmpty.textContent);
    }
  }

  async function openLocalProject(project) {
    if (activeFileLoaded) {
      clearTimeout(saveTimer);
      await persistCurrentFile();
    }
    const nextRepo = project.repo === 'local' ? '' : project.repo;
    const nextBranch = project.branch || 'main';
    let records = [];
    try { records = await readAllRecords('files'); }
    catch (error) { setStatus(`IndexedDB nicht verfügbar; lokale Kopien aus localStorage werden verwendet: ${error.message}`); }
    const localRecords = records.filter((record) => record.repo === (nextRepo || 'local') && record.branch === nextBranch);
    const paths = [...new Set([...(project.paths || []), ...localRecords.map((record) => record.path)])].sort();
    repoName = nextRepo;
    branchName = nextBranch;
    activePath = project.activePath && paths.includes(project.activePath) ? project.activePath : paths.includes('main.tex') ? 'main.tex' : paths[0] || 'main.tex';
    const tree = renderFileTree(localTreeItems(paths));
    if (tree.children.length) fileList.replaceChildren(tree);
    else fileList.textContent = 'Für dieses Projekt sind noch keine Dateien lokal gespeichert.';
    branchSelect.replaceChildren();
    const option = document.createElement('option');
    option.value = branchName;
    option.textContent = branchName;
    branchSelect.appendChild(option);
    branchSelect.value = branchName;
    branchSelect.disabled = true;
    repoLabel.textContent = repoName || 'Lokales Projekt';
    localStorage.setItem('gh_current_repo', repoName);
    localStorage.setItem('gh_current_branch', branchName);
    const record = localRecords.find((file) => file.path === activePath);
    const fallback = localStorage.getItem(`latex_ipad_document:${repoName || 'local'}:${branchName}:${activePath}`);
    const content = record?.content ?? fallback;
    activeFileLoaded = content !== null && content !== undefined;
    setEditorValue(content ?? DEFAULT_DOCUMENT);
    updateActiveFileButton();
    showEditor();
    setStatus(activeFileLoaded
      ? `Offline-Projekt geöffnet: ${repoName || 'Lokales Projekt'} (${branchName})`
      : 'Projekt lokal geöffnet. Noch keine Datei lokal gespeichert; GitHub-Inhalte werden offline nicht geladen.');
  }

  function updateActiveFileButton() {
    for (const { path, button } of activeFileButtons) {
      if (path === activePath && activeFileLoaded) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }

  async function selectFile(path, signal) {
    if (path === activePath && activeFileLoaded) return;
    if (activeFileLoaded) {
      clearTimeout(saveTimer);
      await persistCurrentFile();
    }
    if (signal?.aborted) return;
    const id = fileId(repoName, branchName, path);
    let saved;
    let readError;
    try { saved = await readRecord('files', id); }
    catch (error) { readError = error; }
    const fallback = localStorage.getItem(`latex_ipad_document:${repoName}:${branchName}:${path}`);
    if (signal?.aborted) return;
    let content = saved?.content ?? fallback;
    if (content === null || content === undefined) {
      if (!token || !navigator.onLine) {
        if (readError) throw new Error(`Lokaler Inhalt konnte nicht geladen werden: ${readError.message}`);
        throw new Error('Für diese Datei ist keine lokale Kopie verfügbar. Zum ersten Laden bitte online mit GitHub verbinden.');
      }
      const currentToken = token;
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const response = await githubApi(`/repos/${repoName.split('/').map(encodeURIComponent).join('/')}/contents/${encodedPath}?ref=${encodeURIComponent(branchName)}`, 'application/vnd.github.raw', signal);
      content = await response.text();
      if (token !== currentToken || signal?.aborted) return;
    }
    activePath = path;
    activeFileLoaded = true;
    setEditorValue(content);
    updateActiveFileButton();
    await persistCurrentFile();
    setStatus(`Datei geladen: ${path}`);
  }

  async function loadRepository(nextRepo = repoName, preferredBranch = branchName, signal) {
    if (!nextRepo || !token || repositoryLoading) return false;
    repositoryLoading = true;
    branchSelect.disabled = true;
    repoLabel.disabled = true;
    const currentToken = token;
    try {
      const parts = nextRepo.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Repo-Format muss owner/repo sein.');
      const [owner, name] = parts.map(encodeURIComponent);
      const base = `/repos/${owner}/${name}`;
      const branches = await githubPages(`${base}/branches?per_page=100`, signal);
      const nextBranch = branches.some((branch) => branch.name === preferredBranch) ? preferredBranch : branches[0]?.name;
      let tree = [];
      if (nextBranch) {
        const response = await githubApi(`${base}/git/trees/${encodeURIComponent(nextBranch)}?recursive=1`, 'application/vnd.github+json', signal);
        const data = await response.json();
        if (data.truncated || !Array.isArray(data.tree)) throw new Error('GitHub lieferte keinen vollständigen Repository-Baum.');
        tree = data.tree;
      }
      const treeElement = renderFileTree(tree);
      if (token !== currentToken || signal?.aborted) return false;
      if (nextRepo !== repoName || (nextBranch && nextBranch !== branchName)) {
        textarea.readOnly = true;
        if (monacoEditor) monacoEditor.updateOptions({ readOnly: true });
        try {
          clearTimeout(saveTimer);
          await persistCurrentFile();
          const targetBranch = nextBranch || preferredBranch || 'main';
          const fallback = localStorage.getItem(`latex_ipad_document:${nextRepo}:${targetBranch}:main.tex`);
          let saved;
          try { saved = await readRecord('files', fileId(nextRepo, targetBranch, 'main.tex')); }
          catch (error) {
            if ('indexedDB' in window && fallback === null) throw new Error(`Lokaler Inhalt konnte nicht geladen werden: ${error.message}`);
          }
          if (token !== currentToken || signal?.aborted) return false;
          activePath = 'main.tex';
          setEditorValue(saved?.content ?? fallback ?? DEFAULT_DOCUMENT);
          activeFileLoaded = saved?.content !== undefined && saved?.content !== null || fallback !== null;
        } finally {
          textarea.readOnly = false;
          if (monacoEditor) monacoEditor.updateOptions({ readOnly: false });
        }
      }
      repoName = nextRepo;
      branchName = nextBranch || preferredBranch || 'main';
      localStorage.setItem('gh_current_repo', repoName);
      localStorage.setItem('gh_current_branch', branchName);
      repoLabel.textContent = repoName;
      branchSelect.replaceChildren(...branches.map((branch) => {
        const option = document.createElement('option'); option.value = branch.name; option.textContent = branch.name; return option;
      }));
      branchSelect.value = nextBranch || '';
      if (treeElement.children.length) fileList.replaceChildren(treeElement);
      else fileList.textContent = 'Keine Ordner oder Dateien zum Anzeigen.';
      updateActiveFileButton();
      try {
        const previous = await readRecord('projects', repoName);
        await storeProject({
          id: repoName,
          repo: repoName,
          branch: branchName,
          activePath: previous?.branch === branchName ? previous.activePath : 'main.tex',
          paths: previous?.branch === branchName ? previous.paths || [] : [],
          updatedAt: Date.now()
        });
      }
      catch (error) { setStatus(`Repo geladen; Projektmetadaten konnten nicht gespeichert werden: ${error.message}`); return true; }
      setStatus(`Repo geladen: ${repoName}${nextBranch ? ` (${branchName})` : ''}`);
      return true;
    } finally {
      repositoryLoading = false;
      branchSelect.disabled = false;
      repoLabel.disabled = false;
    }
  }

  function openCreateRepository() {
    if (!token) {
      showError('Bitte zuerst über „GitHub Login“ verbinden.');
      return;
    }
    if (!navigator.onLine) {
      createRepoError.textContent = 'Zum Erstellen eines GitHub-Repositories ist eine Internetverbindung erforderlich.';
      createRepoStatus.textContent = '';
    } else {
      createRepoError.textContent = '';
      createRepoStatus.textContent = '';
    }
    updateCreateRepoButton();
    createRepoDialog.showModal();
  }

  function updateCreateRepoButton() {
    createRepoSubmit.textContent = pendingRepoCreation?.name === createRepoName.value.trim()
      ? pendingRepoCreation.initialized ? 'Repository erneut öffnen' : 'Initialisierung fortsetzen'
      : 'Privates Repository erstellen';
  }

  createRepoName.addEventListener('input', updateCreateRepoButton);

  createRepoForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (createRepoRequest) return;
    const name = createRepoName.value.trim();
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(name)) {
      createRepoError.textContent = 'Der Repository-Name darf nur Buchstaben, Zahlen, Punkte, Unterstriche und Bindestriche enthalten.';
      return;
    }
    const controller = new AbortController();
    createRepoRequest = controller;
    createRepoSubmit.disabled = true;
    createRepoError.textContent = '';
    createRepoStatus.textContent = 'Repository wird erstellt…';
    let createdRepo;
    try {
      if (pendingRepoCreation?.name === name) {
        createdRepo = pendingRepoCreation.repo;
      } else {
        const createResponse = await githubWrite('/user/repos', 'POST', {
          name,
          description: createRepoDescription.value.trim() || undefined,
          private: true,
          auto_init: true
        }, controller.signal);
        createdRepo = await createResponse.json();
        if (!createdRepo.full_name || !createdRepo.default_branch) throw new Error('GitHub lieferte unvollständige Repository-Daten.');
        pendingRepoCreation = { name, repo: createdRepo, initialized: false };
      }
      if (!pendingRepoCreation.initialized) {
        createRepoStatus.textContent = 'Repository erstellt; main.tex wird initialisiert…';
        const repoPath = createdRepo.full_name.split('/').map(encodeURIComponent).join('/');
        await githubWrite(`/repos/${repoPath}/contents/main.tex`, 'PUT', {
          message: 'LaTeX-Projekt initialisieren',
          content: encodeBase64(DEFAULT_DOCUMENT)
        }, controller.signal);
        pendingRepoCreation.initialized = true;
      }
      createRepoStatus.textContent = 'main.tex initialisiert; Repository wird geöffnet…';
      const opened = await loadRepository(createdRepo.full_name, createdRepo.default_branch, controller.signal);
      if (!opened) throw new Error('Repository konnte nach der Initialisierung nicht geöffnet werden.');
      await selectFile('main.tex', controller.signal);
      pendingRepoCreation = undefined;
      updateCreateRepoButton();
      createRepoDialog.close();
      if (repoDialog.open) repoDialog.close();
      showEditor();
      setStatus(`Privates Repository erstellt und initialisiert: ${createdRepo.full_name}`);
    } catch (error) {
      if (!controller.signal.aborted) {
        createRepoStatus.textContent = '';
        createRepoError.textContent = createdRepo
          ? `${createdRepo.full_name} wurde erstellt, aber main.tex oder das Öffnen des Repositories ist fehlgeschlagen: ${error.message}`
          : error.message;
        updateCreateRepoButton();
      }
    } finally {
      if (createRepoRequest === controller) {
        createRepoRequest = undefined;
        createRepoSubmit.disabled = false;
      }
    }
  });

  document.getElementById('create-repo-cancel').addEventListener('click', () => createRepoDialog.close());
  createRepoDialog.addEventListener('cancel', (event) => {
    if (createRepoRequest) event.preventDefault();
  });
  createRepoDialog.addEventListener('close', () => {
    if (createRepoRequest) createRepoRequest.abort();
    createRepoRequest = undefined;
    createRepoSubmit.disabled = false;
  });

  async function showRepositories() {
    if (!token) { showError('Bitte zuerst über „GitHub Login“ verbinden.'); return; }
    if (!navigator.onLine) {
      showError('Zum Laden von GitHub-Repositories ist eine Internetverbindung erforderlich. Lokale Projekte bleiben offline verfügbar.');
      return;
    }
    if (!repoDialog.open) repoDialog.showModal();
    if (repoListRequest) repoListRequest.abort();
    const controller = new AbortController();
    repoListRequest = controller;
    repoCount.textContent = 'Repositories werden geladen…';
    repoError.textContent = '';
    repoList.replaceChildren();
    repoRetry.hidden = true;
    try {
      const repositories = await githubPages('/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=full_name', controller.signal);
      if (controller.signal.aborted) return;
      const countText = repositories.length === 1 ? '1 verfügbares Repository.' : `${repositories.length} verfügbare Repositories.`;
      repoCount.textContent = countText;
      for (const repo of repositories) {
        const button = document.createElement('button');
        button.type = 'button';
        const permission = repo.permissions?.admin === true
          ? { icon: '⚙️', label: 'Administrationsrechte' }
          : repo.permissions?.push === true || repo.permissions?.maintain === true
            ? { icon: '✏️', label: 'Lese- und Schreibzugriff' }
            : repo.permissions?.pull === true
              ? { icon: '👁️', label: 'Nur-Lesezugriff' }
              : { icon: '❔', label: 'Berechtigung unbekannt' };
        button.textContent = `${permission.icon} ${repo.full_name}`;
        button.setAttribute('aria-label', `${permission.label}: ${repo.full_name}`);
        button.addEventListener('click', async () => {
          if (repositoryLoading) return;
          const openController = new AbortController();
          repoOpenRequest = openController;
          repoError.textContent = '';
          repoCount.textContent = `Repository wird geöffnet: ${repo.full_name}…`;
          try {
            if (await loadRepository(repo.full_name, repo.default_branch, openController.signal)) {
              repoDialog.close();
              showEditor();
            }
          } catch (error) {
            if (!openController.signal.aborted) repoError.textContent = `Repository konnte nicht geöffnet werden: ${error.message}`;
          } finally {
            if (repoOpenRequest === openController) repoOpenRequest = undefined;
            if (repoDialog.open) repoCount.textContent = countText;
          }
        });
        repoList.appendChild(button);
      }
      if (!repositories.length) repoError.textContent = 'Keine verfügbaren Repositories gefunden. Bitte Token-Zugriff und Organisationsfreigaben prüfen.';
    } catch (error) {
      if (!controller.signal.aborted) {
        repoCount.textContent = 'Repositories konnten nicht geladen werden.';
        repoError.textContent = error.message;
        repoRetry.hidden = false;
      }
    } finally {
      if (repoListRequest === controller) repoListRequest = undefined;
    }
  }

  loginButton.addEventListener('click', () => {
    if (token) {
      if (repoDialog.open) repoDialog.close();
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
      await showRepositories();
    } catch (error) {
      if (!controller.signal.aborted) loginError.textContent = error.message;
    } finally {
      if (loginRequest === controller) {
        loginRequest = undefined;
        loginSubmit.disabled = false;
      }
    }
  });
  repoLabel.addEventListener('click', showRepositories);
  document.getElementById('open-repo-btn').addEventListener('click', showRepositories);
  document.getElementById('dashboard-open-repo').addEventListener('click', showRepositories);
  document.getElementById('dashboard-create-repo').addEventListener('click', openCreateRepository);
  document.getElementById('repo-create').addEventListener('click', openCreateRepository);
  repoRetry.addEventListener('click', showRepositories);
  document.getElementById('repo-cancel').addEventListener('click', () => repoDialog.close());
  repoDialog.addEventListener('close', () => {
    if (repoListRequest) repoListRequest.abort();
    if (repoOpenRequest) repoOpenRequest.abort();
  });
  branchSelect.addEventListener('change', async () => {
    const target = branchSelect.value;
    branchSelect.value = branchName;
    try { await loadRepository(repoName, target); } catch (error) { showError(`Branch konnte nicht geladen werden: ${error.message}`); }
  });
  document.getElementById('open-dashboard').addEventListener('click', async () => {
    try {
      if (activeFileLoaded) {
        clearTimeout(saveTimer);
        await persistCurrentFile();
      }
      document.getElementById('main-container').hidden = true;
      dashboard.hidden = false;
      await refreshDashboard();
    } catch (error) {
      setStatus(`Änderungen konnten vor dem Wechsel zur Übersicht nicht gespeichert werden: ${error.message}`);
    }
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
      const fallback = localStorage.getItem(`latex_ipad_document:${repoName || 'local'}:${branchName}:${activePath}`) ?? (!repoName ? localStorage.getItem('latex_ipad_document') : null);
      textarea.value = saved?.content ?? fallback ?? DEFAULT_DOCUMENT;
      activeFileLoaded = saved?.content !== undefined && saved?.content !== null || fallback !== null;
      await refreshDashboard();
      await loadMonaco();
      await registerServiceWorker();
      if (repoName) repoLabel.textContent = repoName;
      branchSelect.value = branchName;
      if (token) {
        loginButton.textContent = 'Verbunden'; loginButton.style.background = '#28a745';
      }
      setStatus(navigator.onLine ? 'Editor bereit. Änderungen werden lokal automatisch gespeichert.' : 'Offline-Modus: lokale Bearbeitung ist aktiv.');
    } catch (error) {
      setStatus(`App-Fehler: ${error.message}`);
      showError(error.message);
    }
  }

  initialize();
})();
