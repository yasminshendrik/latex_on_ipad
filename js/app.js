(() => {
  'use strict';

  const DB_NAME = 'LaTeXPWA_VFS';
  const DB_VERSION = 2;
  const DEFAULT_DOCUMENT = '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nBitte mit GitHub verbinden, um zu starten!\n\\end{document}';
  const MONACO_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';
  const PERIODIC_SAVE_MS = 3 * 60 * 1000;
  const COMPILE_TIMEOUT_MS = 3 * 60 * 1000;
  const TEX_FILE = /\.(tex|latex|ltx)$/i;
  const PROJECT_SETTINGS_PATH = '.latex-ipad/settings.json';
  const VIEW_STATE_KEY = 'latex_ipad_view_state';
  const logActivity = (message, options) => {
    if (typeof window.__technicalLog === 'function') window.__technicalLog(message, options);
  };
  const setCompilerLog = (text) => {
    if (typeof window.__setCompilerLog === 'function') window.__setCompilerLog(text);
  };
  const sidebarToggle = document.getElementById('toggle-sidebar');
  const dashboardButton = document.getElementById('open-dashboard');
  const sidebar = document.getElementById('sidebar');
  const sidebarResize = document.getElementById('sidebar-resize');
  const texOnlyFilter = document.getElementById('tex-only-filter');
  let sidebarItems = [];
  const collapsedFolders = new Set();
  let changeStateRequest = 0;
  let changeStateTimer;
  let changeMarkers = new Map();
  let changeMarkerTargets = [];
  let previewDrag;
  const SCRIPT_URL = document.currentScript?.src || new URL('./js/app.js', location.href).href;

  const textarea = document.getElementById('editor');
  const monacoHost = document.getElementById('monaco-editor');
  const lintResults = document.getElementById('lint-results');
  const compileSummary = document.getElementById('compile-summary');
  const mainFileSelect = document.getElementById('main-file-select');
  const previewStatus = document.getElementById('preview-status');
  const pdfPages = document.getElementById('pdf-pages');
  const previewContainer = document.getElementById('preview-container');
  const previewResizer = document.getElementById('preview-resize');
  const previewButton = document.getElementById('toggle-preview');
  const saveButton = document.getElementById('save-btn');
  const loginButton = document.getElementById('gh-login-btn');
  const loginDialog = document.getElementById('github-login-dialog');
  const loginForm = document.getElementById('github-login-form');
  const tokenInput = document.getElementById('github-token');
  const loginError = document.getElementById('github-login-error');
  const loginSubmit = document.getElementById('github-login-submit');
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
  const conflictDialog = document.getElementById('sync-conflict-dialog');
  const conflictDescription = document.getElementById('sync-conflict-description');
  const conflictLocal = document.getElementById('sync-conflict-local');
  const conflictRemote = document.getElementById('sync-conflict-remote');
  const dashboard = document.getElementById('dashboard');
  const dashboardList = document.getElementById('local-project-list');
  const dashboardEmpty = document.getElementById('local-project-empty');
  const projectSettingsButton = document.getElementById('project-settings-button');
  const projectSettingsDialog = document.getElementById('project-settings-dialog');
  const projectSettingsClose = document.getElementById('project-settings-close');
  const branchSelect = document.getElementById('branch-select');
  const branchSelector = document.getElementById('branch-selector');
  const newTexFileDialog = document.getElementById('new-tex-file-dialog');
  const newTexFileForm = document.getElementById('new-tex-file-form');
  const newTexFileFolder = document.getElementById('new-tex-file-folder');
  const newTexFileKind = document.getElementById('new-tex-file-kind');
  const newTexFileName = document.getElementById('new-tex-file-name');
  const newTexFileError = document.getElementById('new-tex-file-error');
  const commitDialog = document.getElementById('commit-dialog');
  const commitForm = document.getElementById('commit-form');
  const commitMessage = document.getElementById('commit-message');
  const commitError = document.getElementById('commit-error');
  const commitSubmit = document.getElementById('commit-submit');
  const fileList = document.getElementById('file-list');
  const trashList = document.getElementById('trash-list');
  const fileContextMenu = document.getElementById('file-context-menu');
  const fileContextDelete = document.getElementById('file-context-delete');
  const projectName = document.getElementById('project-name');
  const projectBranch = document.getElementById('project-branch');
  const projectRepoLink = document.getElementById('project-repo-link');
  const hyphenationSelect = document.getElementById('project-hyphenation');
  let repoName = localStorage.getItem('gh_current_repo') || '';
  let branchName = localStorage.getItem('gh_current_branch') || 'main';
  let token = sessionStorage.getItem('gh_token') || '';
  if (token && !token.startsWith('github_pat_')) {
    sessionStorage.removeItem('gh_token');
    token = '';
  }

  function appendLocalPathsToTree(tree, files) {
    const directories = new Set(tree.filter((item) => item.type === 'tree').map((item) => item.path));
    for (const file of files) {
      const parts = file.path.split('/');
      parts.pop();
      const parents = [];
      while (parts.length) {
        parents.unshift(parts.join('/'));
        parts.pop();
      }
      for (const path of parents) {
        if (directories.has(path)) continue;
        directories.add(path);
        tree.push({ type: 'tree', path });
      }
      if (!tree.some((item) => item.path === file.path)) tree.push(file);
    }
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
  let conflictResolver;
  let pendingGitHubAction = 'repositories';
  let commitRequest;
  let newTexFileRequest = false;
  let activeFileButtons = [];
  let activeFileLoaded = false;
  let suppressEditorChanges = false;
  let saveQueue = Promise.resolve();
  let saveFailureLogged = false;
  let lintWorker;
  let lintTimer;
  let lintRequestId = 0;
  let texWorker;
  let compileRunId = 0;
  let compileRunning = false;
  let compileRequest = null;
  let compileDiagnostics = [];
  let compileDiagnosticsKey = '';
  let compileMarkersSet = false;
  let currentPdf;
  let currentPdfContext = '';
  let pdfRenderId = 0;
  let pdfSession;
  let pdfResizeTimer;
  let previewSize = 40;
  let pdfjsPromise;
  const MAX_RENDERED_PDF_PAGES = 3;
  const MAX_PDF_CANVAS_PIXELS = 2_000_000;
  const MAX_PDF_PIXEL_RATIO = 1.5;
  const pendingCompiles = new Map();
  const compiledSignatures = new Map();

  function showError(message) { alert(message); }
  function setStatus(message) {
    const status = document.getElementById('app-status') || document.querySelector('footer');
    if (status) status.textContent = message;
  }
  function setButtonIcon(button, icon, label) {
    button.setAttribute('data-icon', icon);
    button.setAttribute('aria-label', label);
    button.title = label;
  }
  const loginButtonHome = loginButton.parentNode;
  const loginButtonAnchor = loginButton.nextSibling;
  const dashboardActions = document.getElementById('dashboard-actions');
  // Auf dem Dashboard steht der Login-Knopf mit Text neben den GitHub-Aktionen, im Editor als Icon in der Toolbar.
  function placeLoginButton(onDashboard) {
    if (onDashboard) dashboardActions.appendChild(loginButton);
    else loginButtonHome.insertBefore(loginButton, loginButtonAnchor);
    loginButton.setAttribute('data-on-dashboard', String(onDashboard));
    updateLoginButton();
  }
  function updateLoginButton() {
    const label = loginButton.getAttribute('data-on-dashboard') === 'true';
    if (token) {
      loginButton.textContent = label ? 'Logout' : 'Abmelden';
      setButtonIcon(loginButton, 'github', 'Von GitHub abmelden');
      loginButton.setAttribute('data-connected', 'true');
    } else {
      loginButton.textContent = label ? 'Login' : 'GitHub Login';
      setButtonIcon(loginButton, 'github', 'Mit GitHub verbinden');
      loginButton.removeAttribute('data-connected');
    }
  }
  function updateProjectProperties() {
    projectName.textContent = repoName || 'Lokales Projekt';
    projectBranch.textContent = branchName || 'main';
    if (repoName && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoName)) {
      projectRepoLink.href = `https://github.com/${repoName.split('/').map(encodeURIComponent).join('/')}`;
      projectRepoLink.hidden = false;
    } else {
      projectRepoLink.removeAttribute('href');
      projectRepoLink.hidden = true;
    }
  }
  function fileId(repo, branch, path) { return `${repo}\u0000${branch}\u0000${path}`; }
  function trashKey(context) { return `latex_ipad_trash:${context.repo}:${context.branch}`; }
  function readTrash(context) {
    const raw = localStorage.getItem(trashKey(context));
    if (!raw) return [];
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries) || entries.some((entry, index) =>
      !entry || !isSafeProjectPath(entry.path) || !Array.isArray(entry.items) ||
      entries.some((other, otherIndex) => otherIndex !== index && other && typeof other.path === 'string' &&
        (other.path === entry.path || other.path.startsWith(`${entry.path}/`))) ||
      entry.items.some((item) => !item || !isSafeProjectPath(item.path) || !['tree', 'blob', 'commit'].includes(item.type) ||
        (item.path !== entry.path && !item.path.startsWith(`${entry.path}/`))))) {
      throw new Error('Der lokale Papierkorb ist ungültig.');
    }
    return entries;
  }
  function writeTrash(context, entries) {
    if (entries.length) localStorage.setItem(trashKey(context), JSON.stringify(entries));
    else localStorage.removeItem(trashKey(context));
  }
  function pathInTrash(path, entries) {
    return entries.some((entry) => path === entry.path || path.startsWith(`${entry.path}/`));
  }
  let trashOperation = false;

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
        if (!database.objectStoreNames.contains('texPacks')) database.createObjectStore('texPacks', { keyPath: 'id' });
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

  async function deleteFileRecord(id) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('files', 'readwrite');
      transaction.objectStore('files').delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Lokale Datei konnte nicht entfernt werden.'));
      transaction.onabort = () => reject(transaction.error || new Error('Lokales Entfernen wurde abgebrochen.'));
    });
  }

  function finishConflictChoice(choice) {
    if (!conflictResolver) return;
    const resolve = conflictResolver;
    resolve(choice);
  }

  document.getElementById('sync-conflict-keep-local').addEventListener('click', () => finishConflictChoice('local'));
  document.getElementById('sync-conflict-use-remote').addEventListener('click', () => finishConflictChoice('remote'));
  document.getElementById('sync-conflict-merge').addEventListener('click', () => finishConflictChoice('merge'));
  conflictDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    finishConflictChoice(null);
  });

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

  async function readProjectTexPacks(context) {
    return (await readAllRecords('texPacks')).filter((record) =>
      record.repo === context.repo && record.branch === context.branch
    );
  }

  function texPackRecordId(context, packId) {
    return fileId(context.repo, context.branch, `tex-pack:${packId}`);
  }

  async function saveProjectTexPack(context, pack, archive) {
    await storeRecord('texPacks', {
      id: texPackRecordId(context, pack.id),
      repo: context.repo,
      branch: context.branch,
      packId: pack.id,
      hash: pack.hash,
      archive,
      source: pack.source || '',
      license: pack.license || '',
      installedAt: Date.now()
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
    const projects = readProjectCatalog();
    const previous = projects.find((item) => item.id === project.id);
    const updated = { ...previous, ...project, settings: project.settings ?? previous?.settings };
    const next = projects.filter((item) => item.id !== project.id);
    next.push(updated);
    localStorage.setItem('latex_ipad_projects', JSON.stringify(next));
  }

  function fileMetadataKey(repo, branch, path) {
    return `latex_ipad_file_metadata:${repo}:${branch}:${path}`;
  }

  async function readStoredFile(repo, branch, path) {
    try {
      const record = await readRecord('files', fileId(repo, branch, path));
      if (record) return record;
    } catch (error) {
      setStatus(`IndexedDB-Datei nicht lesbar; localStorage-Fallback wird verwendet: ${error.message}`);
    }
    const content = localStorage.getItem(`latex_ipad_document:${repo}:${branch}:${path}`);
    if (content === null) return null;
    let metadata = {};
    try {
      metadata = JSON.parse(localStorage.getItem(fileMetadataKey(repo, branch, path)) || '{}');
    } catch (error) {
      setStatus(`Datei-Metadaten konnten nicht gelesen werden: ${error.message}`);
    }
    return { id: fileId(repo, branch, path), repo, branch, path, content, ...metadata };
  }

  async function storeFile(record) {
    const { id, repo, branch, path, content, updatedAt, baseContent, remoteSha, isNewFile, initialContent } = record;
    try {
      await storeRecord('files', record);
      return;
    } catch (error) {
      if (record.binary) {
        throw new Error(`Binärdatei ${path} kann ohne IndexedDB nicht lokal gespeichert werden: ${error.message}`);
      }
      try {
        localStorage.setItem(`latex_ipad_document:${repo}:${branch}:${path}`, content);
        localStorage.setItem(fileMetadataKey(repo, branch, path), JSON.stringify({ baseContent, remoteSha, isNewFile, initialContent }));
        const previous = readProjectCatalog().find((project) => project.id === repo);
        writeProjectCatalog({
          id: repo,
          repo,
          branch,
          activePath: path,
          paths: [...new Set([...(previous?.branch === branch ? previous.paths || [] : []), path])],
          updatedAt: updatedAt || Date.now()
        });
        setStatus(`IndexedDB nicht verfügbar; Datei lokal in localStorage gespeichert: ${error.message}`);
      } catch (fallbackError) {
        throw new Error(`Lokales Speichern fehlgeschlagen: ${fallbackError.message}`);
      }
    }
  }

  async function removeStoredFile(repo, branch, path) {
    try { await deleteFileRecord(fileId(repo, branch, path)); }
    catch (error) { setStatus(`IndexedDB-Datei konnte nicht entfernt werden; Fallback wird bereinigt: ${error.message}`); }
    localStorage.removeItem(`latex_ipad_document:${repo}:${branch}:${path}`);
    localStorage.removeItem(fileMetadataKey(repo, branch, path));
  }

  function trashSnapshotId(context, path) { return `trash\u0000${fileId(context.repo, context.branch, path)}`; }
  function trashSnapshotKey(context, path) { return `latex_ipad_trash_file:${context.repo}:${context.branch}:${path}`; }
  async function storeTrashSnapshot(context, record) {
    const snapshot = { id: trashSnapshotId(context, record.path), original: record };
    try {
      await storeRecord('files', snapshot);
      return 'indexedDB';
    } catch (error) {
      if (record.binary) throw new Error(`Binärdatei kann nicht sicher im Papierkorb gespeichert werden: ${error.message}`);
      localStorage.setItem(trashSnapshotKey(context, record.path), JSON.stringify(snapshot));
      return 'localStorage';
    }
  }
  async function readTrashSnapshot(context, item) {
    if (!item.snapshotLocation) return null;
    let snapshot;
    if (item.snapshotLocation === 'indexedDB') snapshot = await readRecord('files', trashSnapshotId(context, item.path));
    else if (item.snapshotLocation === 'localStorage') {
      const raw = localStorage.getItem(trashSnapshotKey(context, item.path));
      snapshot = raw === null ? null : JSON.parse(raw);
    } else throw new Error('Der Speicherort einer Papierkorbdatei ist ungültig.');
    if (!snapshot?.original || snapshot.original.repo !== context.repo ||
        snapshot.original.branch !== context.branch || snapshot.original.path !== item.path) {
      throw new Error(`Die Papierkorbkopie von ${item.path} ist nicht verfügbar.`);
    }
    return snapshot.original;
  }
  async function removeTrashSnapshot(context, item) {
    if (item.snapshotLocation === 'indexedDB') await deleteFileRecord(trashSnapshotId(context, item.path));
    else if (item.snapshotLocation === 'localStorage') localStorage.removeItem(trashSnapshotKey(context, item.path));
  }
  async function readTrashOriginal(context, item) {
    if (item.snapshotLocation === 'indexedDB') {
      const record = await readRecord('files', fileId(context.repo, context.branch, item.path));
      if (record) return record;
    }
    return readStoredFile(context.repo, context.branch, item.path);
  }
  function sameStoredFile(left, right) {
    if (!left || !right) return left === right;
    if (left.content !== right.content || left.baseContent !== right.baseContent ||
        left.remoteSha !== right.remoteSha || left.isNewFile !== right.isNewFile || Boolean(left.binary) !== Boolean(right.binary)) return false;
    if (!left.binary) return true;
    const a = left.data;
    const b = right.data;
    if (!a || !b || a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false;
    return true;
  }

  async function finalizeCommittedTrash(context) {
    const entries = readTrash(context);
    const committed = entries.filter((entry) => entry.committedSha);
    if (!committed.length) return;
    for (const entry of committed) {
      for (const item of entry.items.filter((candidate) => candidate.snapshotLocation)) {
        const snapshot = await readTrashSnapshot(context, item);
        const current = await readTrashOriginal(context, item);
        if (current && !sameStoredFile(current, snapshot)) {
          throw new Error(`Die lokale Datei ${item.path} wurde nach dem Löschen verändert. Die Papierkorbbereinigung wurde abgebrochen.`);
        }
      }
    }
    for (const entry of committed) {
      for (const item of entry.items.filter((candidate) => candidate.type !== 'tree')) {
        if ('indexedDB' in window) await deleteFileRecord(fileId(context.repo, context.branch, item.path));
        localStorage.removeItem(`latex_ipad_document:${context.repo}:${context.branch}:${item.path}`);
        localStorage.removeItem(fileMetadataKey(context.repo, context.branch, item.path));
      }
    }
    const project = readProjectCatalog().find((item) => item.id === context.repo);
    const sha = committed.at(-1).committedSha;
    const stored = await storeProject({
      ...project, id: context.repo, repo: context.repo, branch: context.branch,
      paths: (project?.paths || []).filter((path) => !pathInTrash(path, committed)),
      remoteHeadShas: { ...(project?.remoteHeadShas || {}), [context.branch]: sha },
      updatedAt: Date.now()
    });
    if (!stored && 'indexedDB' in window) throw new Error('Die Projektmetadaten konnten nicht vollständig in IndexedDB aktualisiert werden.');
    writeTrash(context, entries.filter((entry) => !entry.committedSha));
    for (const entry of committed) {
      for (const item of entry.items.filter((candidate) => candidate.snapshotLocation)) await removeTrashSnapshot(context, item);
    }
  }

  async function storeProject(project) {
    const catalogProject = readProjectCatalog().find((item) => item.id === project.id);
    let storedProject;
    try { storedProject = await readRecord('projects', project.id); }
    catch (error) { logActivity('Projektmetadaten konnten nicht aus IndexedDB gelesen werden.'); }
    const updated = {
      ...catalogProject,
      ...storedProject,
      ...project,
      settings: project.settings ?? storedProject?.settings ?? catalogProject?.settings
    };
    try {
      await storeRecord('projects', updated);
    } catch (error) {
      writeProjectCatalog(updated);
      setStatus(`Projektmetadaten in localStorage gespeichert; IndexedDB nicht verfügbar: ${error.message}`);
      return false;
    }
    writeProjectCatalog(updated);
    return true;
  }

  function getEditorValue() {
    return monacoEditor ? monacoEditor.getValue() : textarea.value;
  }
  function resetEditorPosition() {
    if (monacoEditor) {
      monacoEditor.setPosition?.({ lineNumber: 1, column: 1 });
      monacoEditor.setScrollTop?.(0);
      monacoEditor.setScrollLeft?.(0);
    }
    textarea.setSelectionRange?.(0, 0);
    textarea.scrollTop = 0;
    textarea.scrollLeft = 0;
  }
  function setEditorValue(value) {
    suppressEditorChanges = true;
    try {
      if (monacoEditor) monacoEditor.setValue(value);
      textarea.value = value;
      resetEditorPosition();
    } finally {
      suppressEditorChanges = false;
    }
    scheduleLint();
    applyCompileMarkers();
  }

  function handleEditorInput() {
    activeFileLoaded = true;
    scheduleAutoSave();
    scheduleLint();
    clearTimeout(changeStateTimer);
    changeStateTimer = setTimeout(updateChangeState, 150);
  }

  function insertLatexQuotes(event, useMonaco) {
    if (event.key !== '"') return;
    event.preventDefault();
    const openingQuote = '"`';
    const closingQuote = '"\'';
    if (useMonaco && monacoEditor) {
      const model = monacoEditor.getModel();
      const selection = monacoEditor.getSelection();
      const start = model.getOffsetAt({ lineNumber: selection.startLineNumber, column: selection.startColumn });
      const end = model.getOffsetAt({ lineNumber: selection.endLineNumber, column: selection.endColumn });
      const value = model.getValue();
      if (start === end && value.slice(start, start + closingQuote.length) === closingQuote) {
        monacoEditor.setPosition(model.getPositionAt(start + closingQuote.length));
        return;
      }
      const selectedText = value.slice(start, end);
      const insertedText = `${openingQuote}${selectedText}${closingQuote}`;
      monacoEditor.executeEdits('latex-quote-assist', [{ range: selection, text: insertedText }]);
      monacoEditor.setPosition(model.getPositionAt(start + openingQuote.length + selectedText.length));
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? start;
    if (start === end && textarea.value.slice(start, start + closingQuote.length) === closingQuote) {
      textarea.setSelectionRange(start + closingQuote.length, start + closingQuote.length);
      return;
    }
    const selectedText = textarea.value.slice(start, end);
    textarea.value = `${textarea.value.slice(0, start)}${openingQuote}${selectedText}${closingQuote}${textarea.value.slice(end)}`;
    const cursor = start + openingQuote.length + selectedText.length;
    textarea.setSelectionRange(cursor, cursor);
    handleEditorInput();
  }

  function clearLintMarkers() {
    if (monacoEditor && window.monaco) {
      window.monaco.editor.setModelMarkers(monacoEditor.getModel(), 'latex-lint', []);
    }
  }

  function startLintWorker() {
    try {
      lintWorker = new Worker('./js/lint-worker.js');
      lintWorker.onmessage = ({ data }) => {
        if (data.id !== lintRequestId) return;
        if (data.error) {
          clearLintMarkers();
          lintResults.textContent = data.error;
          return;
        }
        const diagnostics = data.diagnostics;
        if (monacoEditor && window.monaco) {
          window.monaco.editor.setModelMarkers(monacoEditor.getModel(), 'latex-lint', diagnostics.map((item) => ({
            severity: window.monaco.MarkerSeverity.Error,
            message: item.message,
            startLineNumber: item.start.line,
            startColumn: item.start.column,
            endLineNumber: item.end.line,
            endColumn: item.end.column
          })));
        }
        if (!diagnostics.length) {
          lintResults.textContent = 'LaTeX-Syntaxprüfung: keine der unterstützten Fehler gefunden.';
          return;
        }
        const summary = document.createElement('span');
        summary.textContent = `LaTeX-Syntaxprüfung: ${diagnostics.length} ${diagnostics.length === 1 ? 'Hinweis' : 'Hinweise'}.`;
        const list = document.createElement('ul');
        for (const item of diagnostics) {
          const entry = document.createElement('li');
          entry.textContent = `Zeile ${item.start.line}, Spalte ${item.start.column}: ${item.message}`;
          list.appendChild(entry);
        }
        lintResults.replaceChildren(summary, list);
      };
      lintWorker.onerror = () => {
        lintWorker.terminate();
        lintWorker = undefined;
        clearLintMarkers();
        lintResults.textContent = 'LaTeX-Prüfung nicht verfügbar: Der lokale Worker konnte nicht ausgeführt werden.';
      };
    } catch (error) {
      lintResults.textContent = `LaTeX-Prüfung nicht verfügbar: ${error.message}`;
    }
  }

  function scheduleLint() {
    const id = ++lintRequestId;
    clearTimeout(lintTimer);
    clearLintMarkers();
    if (!lintWorker) return;
    lintResults.textContent = 'LaTeX-Syntaxprüfung läuft…';
    lintTimer = setTimeout(() => lintWorker?.postMessage({ id, content: getEditorValue() }), 350);
  }

  function projectContext() {
    return { repo: repoName || 'local', branch: branchName };
  }
  function contextKey(context) { return `${context.repo}\u0000${context.branch}`; }
  function isCurrentContext(context) { return contextKey(context) === contextKey(projectContext()); }
  function mainFileKey(context) { return `latex_ipad_main:${context.repo}:${context.branch}`; }
  function projectSettingsKey(repo) { return `latex_ipad_settings:${repo}`; }
  function readProjectSettings(context) {
    const raw = localStorage.getItem(projectSettingsKey(context.repo));
    const catalogSettings = readProjectCatalog().find((project) => project.id === context.repo)?.settings;
    let saved = raw === null ? catalogSettings || {} : JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
      throw new Error('Die lokalen Projekteinstellungen haben ein ungültiges Format.');
    }
    if (saved.mainFiles !== undefined && (!saved.mainFiles || typeof saved.mainFiles !== 'object' || Array.isArray(saved.mainFiles))) {
      throw new Error('Die gespeicherten Hauptdatei-Auswahlen haben ein ungültiges Format.');
    }
    const mainFiles = { ...(saved.mainFiles || {}) };
    if (Object.values(mainFiles).some((path) => typeof path !== 'string')) {
      throw new Error('Eine gespeicherte Hauptdatei-Auswahl ist ungültig.');
    }
    const legacyMainFile = localStorage.getItem(mainFileKey(context));
    if (!mainFiles[context.branch] && legacyMainFile) mainFiles[context.branch] = legacyMainFile;
    const allowedHyphenation = ['auto', 'ngerman', 'english'];
    if (saved.hyphenation !== undefined && !allowedHyphenation.includes(saved.hyphenation)) {
      throw new Error('Die gespeicherte Silbentrennung ist ungültig.');
    }
    const hyphenation = saved.hyphenation || 'auto';
    return { mainFiles, hyphenation };
  }
  async function saveProjectSettings(context, changes, quiet = false) {
    const settings = readProjectSettings(context);
    if (Object.prototype.hasOwnProperty.call(changes, 'mainFile')) {
      if (typeof changes.mainFile !== 'string' || (changes.mainFile && !TEX_FILE.test(changes.mainFile))) {
        throw new Error('Die ausgewählte Compiler-Hauptdatei ist ungültig.');
      }
      settings.mainFiles[context.branch] = changes.mainFile;
    }
    if (Object.prototype.hasOwnProperty.call(changes, 'hyphenation')) {
      if (!['auto', 'ngerman', 'english'].includes(changes.hyphenation)) {
        throw new Error('Die ausgewählte Silbentrennung ist ungültig.');
      }
      settings.hyphenation = changes.hyphenation;
    }
    localStorage.setItem(projectSettingsKey(context.repo), JSON.stringify(settings));
    localStorage.removeItem(mainFileKey(context));
    const indexedDbSaved = await storeProject({
      id: context.repo,
      repo: context.repo,
      branch: context.branch,
      settings,
      updatedAt: Date.now()
    });
    if (context.repo !== 'local') await storeVersionedProjectSettings(context, settings);
    if (isCurrentContext(context)) updateChangeState();
    logActivity('Projekteinstellungen lokal gespeichert.');
    if (!quiet) {
      setStatus(indexedDbSaved
        ? 'Projekteinstellungen lokal gespeichert.'
        : 'Projekteinstellungen lokal gespeichert; IndexedDB nicht verfügbar, localStorage wird verwendet.');
    }
    return settings;
  }

  function isSafeProjectPath(path) {
    return typeof path === 'string' && path.length > 0 && !path.startsWith('/') && !path.includes('\\') &&
      !path.split('/').some((part) => !part || part === '.' || part === '..');
  }

  function serializeProjectSettings(settings) {
    return `${JSON.stringify({
      version: 1,
      mainFiles: settings.mainFiles,
      hyphenation: settings.hyphenation
    }, null, 2)}\n`;
  }

  function parseProjectSettings(content) {
    let saved;
    try { saved = JSON.parse(content); }
    catch (error) { throw new Error(`Versionierte Projekteinstellungen sind kein gültiges JSON: ${error.message}`); }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved) || saved.version !== 1) {
      throw new Error('Versionierte Projekteinstellungen haben ein nicht unterstütztes Format.');
    }
    if (!saved.mainFiles || typeof saved.mainFiles !== 'object' || Array.isArray(saved.mainFiles) ||
      Object.entries(saved.mainFiles).some(([branch, path]) =>
        !branch || typeof path !== 'string' || (path !== '' && (!isSafeProjectPath(path) || !TEX_FILE.test(path))))) {
      throw new Error('Versionierte Hauptdatei-Auswahlen sind ungültig.');
    }
    if (!['auto', 'ngerman', 'english'].includes(saved.hyphenation)) {
      throw new Error('Versionierte Silbentrennung ist ungültig.');
    }
    return { mainFiles: { ...saved.mainFiles }, hyphenation: saved.hyphenation };
  }

  async function storeVersionedProjectSettings(context, settings) {
    const existing = await readStoredFile(context.repo, context.branch, PROJECT_SETTINGS_PATH);
    let content = serializeProjectSettings(settings);
    if (existing?.content) {
      try {
        const existingSettings = parseProjectSettings(existing.content);
        if (JSON.stringify(existingSettings) === JSON.stringify(settings)) content = existing.content;
      } catch (error) {
        logActivity('Vorhandene versionierte Projekteinstellungen konnten nicht gelesen werden; lokale Auswahl bleibt erhalten.');
      }
    }
    await storeFile({
      ...(existing || {}),
      id: fileId(context.repo, context.branch, PROJECT_SETTINGS_PATH),
      repo: context.repo,
      branch: context.branch,
      path: PROJECT_SETTINGS_PATH,
      content,
      baseContent: existing?.baseContent ?? '',
      remoteSha: existing?.remoteSha,
      isNewFile: existing?.isNewFile ?? !existing?.remoteSha,
      initialContent: existing?.initialContent ?? existing?.content ?? content,
      updatedAt: Date.now()
    });
    const project = readProjectCatalog().find((item) => item.id === context.repo);
    await storeProject({
      ...project,
      id: context.repo,
      repo: context.repo,
      branch: context.branch,
      settings,
      paths: [...new Set([...(project?.branch === context.branch ? project.paths || [] : []), PROJECT_SETTINGS_PATH])],
      updatedAt: Date.now()
    });
    logActivity('Versionierte Projekteinstellungen lokal vorbereitet.');
  }
  async function migrateLegacyMainFile(context, records) {
    const legacy = localStorage.getItem(mainFileKey(context));
    if (!legacy) return;
    const validPaths = records.filter((record) => !record.binary && TEX_FILE.test(record.path)).map((record) => record.path);
    if (!validPaths.includes(legacy)) {
      localStorage.removeItem(mainFileKey(context));
      logActivity('Veraltete Hauptdatei-Auswahl entfernt, da die Datei im Projekt nicht mehr vorhanden ist.');
      return;
    }
    const raw = localStorage.getItem(projectSettingsKey(context.repo));
    const saved = raw === null ? null : JSON.parse(raw);
    if (saved?.mainFiles?.[context.branch] === legacy) {
      localStorage.removeItem(mainFileKey(context));
      return;
    }
    await saveProjectSettings(context, { mainFile: legacy }, true);
  }
  function normalizeDiagnosticFile(file) { return file ? String(file).replace(/^(\.\/)+/, '') : ''; }

  async function readProjectRecords(context) {
    let records = [];
    try {
      records = (await readAllRecords('files')).filter((record) => record.repo === context.repo && record.branch === context.branch);
    } catch (error) {
      logActivity('Projektdateien konnten nicht aus IndexedDB gelesen werden; lokale Ersatzkopien werden verwendet.');
    }
    const paths = new Set(records.map((record) => record.path));
    const prefix = `latex_ipad_document:${context.repo}:${context.branch}:`;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) {
        const path = key.slice(prefix.length);
        if (!paths.has(path)) records.push({ path, content: localStorage.getItem(key) });
      }
    }
    const trash = readTrash(context);
    return records.filter((record) => !pathInTrash(record.path, trash));
  }

  // Die Auswahl wird pro Projekt und Branch gemerkt; ohne Auswahl wird main.tex vorgeschlagen, sofern vorhanden.
  function updateMainFileOptions(context, records) {
    const paths = records.filter((record) => !record.binary && TEX_FILE.test(record.path)).map((record) => record.path).sort();
    const settings = readProjectSettings(context);
    const stored = settings.mainFiles[context.branch];
    const selected = paths.includes(stored) ? stored : paths.includes('main.tex') ? 'main.tex' : '';
    if (isCurrentContext(context)) {
      const options = [];
      if (!selected) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = paths.length ? 'Hauptdatei wählen…' : 'Keine LaTeX-Datei';
        options.push(placeholder);
      }
      for (const path of paths) {
        const option = document.createElement('option');
        option.value = path;
        option.textContent = path;
        options.push(option);
      }
      mainFileSelect.replaceChildren(...options);
      mainFileSelect.value = selected;
      hyphenationSelect.value = settings.hyphenation;
      updateProjectProperties();
    }
    return selected;
  }

  async function refreshMainFiles() {
    const context = projectContext();
    if (compileDiagnosticsKey !== contextKey(context)) {
      pdfRenderId += 1;
      compileDiagnostics = [];
      compileSummary.textContent = 'Kompilierung noch nicht gelaufen.';
      setCompilerLog('');
      previewStatus.textContent = 'Noch keine Vorschau.';
      pdfPages.replaceChildren();
      applyCompileMarkers();
    }
    try {
      const records = await readProjectRecords(context);
      updateMainFileOptions(context, records);
      await migrateLegacyMainFile(context, records);
    }
    catch (error) {
      logActivity('Hauptdateien oder Projekteinstellungen konnten nicht ermittelt werden.');
      setStatus(`Hauptdateien konnten nicht ermittelt werden: ${error.message}`);
    }
  }

  function hashBytes(value) {
    let hash = 0x811c9dc5;
    if (typeof value === 'string') {
      for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193);
    } else {
      for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value[index], 0x01000193);
    }
    return (hash >>> 0).toString(16);
  }

  function projectSignature(main, files, texPacks = []) {
    const packSignature = texPacks.map((pack) => `${pack.packId}:${pack.hash}`).sort().join(',');
    return `${main}|${packSignature}|${Object.keys(files).sort().map((path) => `${path}:${files[path].length}:${hashBytes(files[path])}`).join('|')}`;
  }

  function stopTexWorker(reason) {
    if (texWorker) texWorker.terminate();
    texWorker = undefined;
    for (const pending of pendingCompiles.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    pendingCompiles.clear();
  }

  function ensureTexWorker() {
    if (texWorker) return texWorker;
    if (typeof Worker === 'undefined') throw new Error('Dieser Browser unterstützt keine Web Worker.');
    const worker = new Worker('./js/tex-worker.js');
    worker.onmessage = ({ data }) => {
      const pending = pendingCompiles.get(data.id);
      if (!pending) return;
      pendingCompiles.delete(data.id);
      clearTimeout(pending.timer);
      if (data.error) pending.reject(new Error(data.error));
      else pending.resolve(data);
    };
    worker.onerror = () => {
      if (texWorker === worker) stopTexWorker('Der lokale TeX-Worker ist ausgefallen.');
    };
    texWorker = worker;
    return worker;
  }

  function runTexWorker(entry, files, context, packages) {
    return new Promise((resolve, reject) => {
      let worker;
      try { worker = ensureTexWorker(); } catch (error) { reject(error); return; }
      compileRunId += 1;
      const id = compileRunId;
      const timer = setTimeout(() => {
        if (pendingCompiles.has(id)) stopTexWorker('Die Kompilierung wurde nach Zeitüberschreitung abgebrochen.');
      }, COMPILE_TIMEOUT_MS);
      pendingCompiles.set(id, { resolve, reject, timer });
      try {
        worker.postMessage({
          id,
          entry,
          files,
          projectKey: contextKey(context),
          packages: packages.map((pack) => ({ id: pack.packId, hash: pack.hash, archive: pack.archive }))
        });
      } catch (error) {
        pendingCompiles.delete(id);
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  function applyCompileMarkers() {
    if (!monacoEditor || !window.monaco) return;
    const markers = compileDiagnostics
      .filter(() => compileDiagnosticsKey === contextKey(projectContext()))
      .filter((item) => item.line && normalizeDiagnosticFile(item.file) === activePath)
      .map((item) => {
        const severity = window.monaco.MarkerSeverity || {};
        const model = monacoEditor.getModel();
        return {
          severity: item.severity === 'error' ? severity.Error : item.severity === 'warning' ? severity.Warning ?? 4 : severity.Info ?? 2,
          message: item.message,
          startLineNumber: item.line,
          startColumn: 1,
          endLineNumber: item.line,
          endColumn: model.getLineMaxColumn ? model.getLineMaxColumn(item.line) : 1000
        };
      });
    if (!markers.length && !compileMarkersSet) return;
    window.monaco.editor.setModelMarkers(monacoEditor.getModel(), 'latex-compile', markers);
    compileMarkersSet = markers.length > 0;
  }

  const MISSING_FILE_PATTERN = /File [`'‘]([^'’`]+\.(?:cls|sty|bst|def|clo))['’] not found/;
  const INSTALLABLE_FILE = /^[^./\\]+\.(?:cls|sty|bst|def|clo)$/i;

  function missingPackageFiles(result) {
    const names = new Set((result.missingFiles || []).filter((name) =>
      typeof name === 'string' && INSTALLABLE_FILE.test(name) && !/^lst(?:lang|misc)0\.sty$/i.test(name)
    ));
    for (const item of result.diagnostics || []) {
      const match = MISSING_FILE_PATTERN.exec(item.message || '');
      if (match) names.add(match[1]);
    }
    return [...names];
  }

  function canStoreTexPacks() {
    return Boolean(window.indexedDB);
  }

  function askToInstallTexPacks(packs) {
    const size = packs.reduce((total, pack) => total + pack.bytes, 0);
    const details = packs.map((pack) => `• ${pack.label} (${(pack.bytes / 1024 / 1024).toFixed(1)} MB${pack.license ? `, ${pack.license}` : ''})`).join('\n');
    return window.confirm(
      `Für die Kompilierung fehlen TeX-Pakete. Sollen diese jetzt von der App geladen und nur diesem Projekt und Branch zugeordnet lokal gespeichert werden?\n\n${details}\n\nGesamt: ${(size / 1024 / 1024).toFixed(1)} MB. Der Download erfolgt erst nach deiner Zustimmung.`
    );
  }

  async function downloadTexPacks(context, packs, installed) {
    if (!window.crypto?.subtle) throw new Error('Sichere Prüfung der Paketdateien wird in diesem Browser nicht unterstützt.');
    const existing = new Map(installed.map((pack) => [pack.packId, pack.hash]));
    for (const pack of packs) {
      if (existing.get(pack.id) === pack.hash) continue;
      if (!/^[a-z0-9-]+$/i.test(pack.id) || !/^[a-z0-9.-]+$/i.test(pack.hash) ||
        !/^[a-f0-9]{64}$/i.test(pack.integrity) || !Number.isSafeInteger(pack.bytes) ||
        pack.bytes <= 0 || pack.bytes > 30 * 1024 * 1024) {
        throw new Error('Das Paketverzeichnis enthält ungültige oder zu große Paketmetadaten.');
      }
      const filename = `pack-${pack.id}-${pack.hash}.tar.gz`;
      const url = new URL(`engine/packs/${filename}`, SCRIPT_URL);
      const response = await fetch(url.href);
      if (!response.ok) throw new Error(`TeX-Paket konnte nicht geladen werden (HTTP ${response.status}).`);
      const archive = new Uint8Array(await response.arrayBuffer());
      if (archive.byteLength !== pack.bytes) throw new Error('Die Größe des heruntergeladenen TeX-Pakets stimmt nicht.');
      const digest = new Uint8Array(await window.crypto.subtle.digest('SHA-256', archive));
      const actualIntegrity = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (actualIntegrity !== pack.integrity.toLowerCase()) throw new Error('Die Integritätsprüfung des TeX-Pakets ist fehlgeschlagen.');
      await saveProjectTexPack(context, pack, archive);
      existing.set(pack.id, pack.hash);
      logActivity(`TeX-Paket lokal für das aktuelle Projekt und den Branch gespeichert (${archive.byteLength} Bytes).`);
    }
  }

  async function compileWithTexPacks(context, main, files, installedPacks, storageError) {
    let packages = installedPacks;
    let result = await runTexWorker(main, files, context, packages);
    for (let attempt = 0; attempt < 5 && result.missingPacks?.length; attempt += 1) {
      if (!isCurrentContext(context)) return result;
      const alreadyInstalled = new Set(packages.map((pack) => `${pack.packId}:${pack.hash}`));
      const needed = result.missingPacks.filter((pack) => !alreadyInstalled.has(`${pack.id}:${pack.hash}`));
      if (!needed.length) break;
      if (storageError || !canStoreTexPacks()) {
        result.packageNotice = `TeX-Pakete können diesem Projekt nicht lokal zugeordnet werden: ${storageError?.message || 'IndexedDB ist nicht verfügbar.'}`;
        break;
      }
      if (!navigator.onLine) {
        result.packageNotice = 'Für diese Kompilierung fehlen TeX-Pakete, die noch nicht offline gespeichert sind. Bitte online gehen und die Pakete nach Aufforderung freigeben.';
        break;
      }
      let accepted = false;
      try { accepted = askToInstallTexPacks(needed); }
      catch (error) {
        result.packageNotice = `Freigabedialog für TeX-Pakete konnte nicht geöffnet werden: ${error.message}`;
        break;
      }
      if (!accepted) {
        result.packageNotice = 'Der Download der benötigten TeX-Pakete wurde abgelehnt; es wurde nichts nachgeladen.';
        break;
      }
      logActivity(`TeX-Paketdownload nach ausdrücklicher Freigabe gestartet (${needed.length} Pakete).`);
      await downloadTexPacks(context, needed, packages);
      packages = await readProjectTexPacks(context);
      result = await runTexWorker(main, files, context, packages);
    }
    result.projectPackages = packages;
    return result;
  }

  function showCompileDiagnostics(main, result) {
    compileDiagnostics = result.diagnostics || [];
    const errors = compileDiagnostics.filter((item) => item.severity === 'error').length;
    const warnings = compileDiagnostics.filter((item) => item.severity === 'warning').length;
    const label = result.status === 'failed' ? 'fehlgeschlagen' : errors ? 'mit Fehlern' : warnings ? 'mit Warnungen' : 'ohne Beanstandung';
    compileSummary.textContent = `Kompilierung von ${main}: ${label} (${errors} Fehler, ${warnings} Warnungen).`;
    const entries = compileDiagnostics.map((item) => {
      const place = item.file ? `${normalizeDiagnosticFile(item.file)}${item.line ? `:${item.line}` : ''} – ` : '';
      const severity = item.severity === 'error' ? 'Fehler' : item.severity === 'warning' ? 'Warnung' : 'Hinweis';
      return `${severity}: ${place}${item.message}`;
    });
    const lines = [compileSummary.textContent];
    const missing = missingPackageFiles(result);
    if (missing.length) {
      lines.push(`Fehlende Dateien: ${missing.join(', ')}. Prüfen Sie, ob diese Klassen oder Pakete im Projekt oder in der Engine verfügbar sind.`);
    }
    if (result.missingPacks?.length) {
      lines.push(`Verfügbare TeX-Pakete: ${result.missingPacks.map((pack) => pack.label).join(', ')}.`);
    }
    if (result.unsupportedFiles?.length) {
      lines.push(`Durch verfügbare Pakete nicht abgedeckt: ${result.unsupportedFiles.join(', ')}.`);
    }
    if (result.packageNotice) lines.push(result.packageNotice);
    if (result.status === 'failed' && result.message) lines.push(result.message);
    lines.push(...entries);
    setCompilerLog(lines.join('\n'));
    applyCompileMarkers();
  }

  function loadPdfjs() {
    pdfjsPromise ||= import(new URL('./pdfjs/pdf.min.mjs', SCRIPT_URL).href).then((library) => {
      library.GlobalWorkerOptions.workerSrc = new URL('./pdfjs/pdf.worker.min.mjs', SCRIPT_URL).href;
      return library;
    }).catch((error) => {
      pdfjsPromise = undefined;
      throw error;
    });
    return pdfjsPromise;
  }

  function releasePdfPage(slot) {
    slot.renderTask?.cancel?.();
    slot.renderTask = undefined;
    if (slot.canvas) {
      slot.canvas.width = 0;
      slot.canvas.height = 0;
      slot.canvas = undefined;
    }
    slot.element.replaceChildren();
  }

  async function discardPdfSession(session) {
    if (!session) return;
    session.observer?.disconnect();
    if (session.scrollListener) previewContainer.removeEventListener?.('scroll', session.scrollListener);
    for (const slot of session.slots) releasePdfPage(slot);
    await session.loadingTask.destroy();
  }

  function updateFallbackPdfPages(session) {
    const root = previewContainer.getBoundingClientRect();
    const margin = root.height;
    for (const slot of session.slots) {
      const bounds = slot.element.getBoundingClientRect();
      if (bounds.top <= root.bottom + margin && bounds.bottom >= root.top - margin) {
        session.visiblePages.add(slot);
      } else {
        session.visiblePages.delete(slot);
      }
    }
    updateRenderedPdfPages(session);
  }

  function updateRenderedPdfPages(session) {
    if (pdfSession !== session) return;
    const root = previewContainer.getBoundingClientRect();
    const visible = [...session.visiblePages]
      .sort((left, right) => {
        const leftBounds = left.element.getBoundingClientRect();
        const rightBounds = right.element.getBoundingClientRect();
        const rootCenter = (root.top + root.bottom) / 2;
        const leftCenter = (leftBounds.top + leftBounds.bottom) / 2;
        const rightCenter = (rightBounds.top + rightBounds.bottom) / 2;
        return Math.abs(leftCenter - rootCenter) - Math.abs(rightCenter - rootCenter);
      });
    const retained = new Set(visible.slice(0, MAX_RENDERED_PDF_PAGES));
    for (const slot of session.slots) {
      if (!retained.has(slot)) releasePdfPage(slot);
    }
    for (const slot of retained) {
      if (slot.canvas || slot.rendering) continue;
      slot.rendering = (async () => {
        let page;
        let failed = false;
        try {
          page = await session.document.getPage(slot.number);
          if (pdfSession !== session || !session.visiblePages.has(slot)) return;
          const scale = slot.width / slot.pageWidth;
          const pixelRatio = Math.min(
            window.devicePixelRatio || 1,
            MAX_PDF_PIXEL_RATIO,
            Math.sqrt(MAX_PDF_CANVAS_PIXELS / (slot.width * slot.height))
          );
          const viewport = page.getViewport({ scale: scale * pixelRatio });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.setAttribute('aria-label', `Seite ${slot.number}`);
          const task = page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport });
          slot.renderTask = task;
          await task.promise;
          if (pdfSession === session && session.visiblePages.has(slot)) {
            slot.canvas = canvas;
            slot.element.replaceChildren(canvas);
          } else {
            canvas.width = 0;
            canvas.height = 0;
          }
        } catch (error) {
          failed = error?.name !== 'RenderingCancelledException';
          if (pdfSession === session && session.visiblePages.has(slot) && failed) {
            previewStatus.textContent = `PDF konnte nicht dargestellt werden: ${error.message}`;
          }
        } finally {
          slot.renderTask = undefined;
          page?.cleanup?.();
          slot.rendering = undefined;
          if (!failed && pdfSession === session && session.visiblePages.has(slot) && !slot.canvas) {
            Promise.resolve().then(() => updateRenderedPdfPages(session));
          }
        }
      })();
    }
  }

  async function renderPdf(bytes) {
    const renderId = ++pdfRenderId;
    try {
      const previousSession = pdfSession;
      pdfSession = undefined;
      await discardPdfSession(previousSession);
      if (renderId !== pdfRenderId) return;
      const library = await loadPdfjs();
      if (renderId !== pdfRenderId) return;
      const loadingTask = library.getDocument({ data: bytes.slice(), isEvalSupported: false });
      const session = {
        loadingTask,
        document: undefined,
        observer: undefined,
        slots: [],
        visiblePages: new Set()
      };
      pdfSession = session;
      session.document = await loadingTask.promise;
      if (renderId !== pdfRenderId || pdfSession !== session) return;
      const width = Math.max(200, (pdfPages.clientWidth || 600) - 4);
      for (let number = 1; number <= session.document.numPages; number += 1) {
        const page = await session.document.getPage(number);
        if (renderId !== pdfRenderId || pdfSession !== session) {
          page.cleanup?.();
          return;
        }
        const viewport = page.getViewport({ scale: 1 });
        const element = document.createElement('div');
        element.className = 'pdf-page';
        element.style.width = `${width}px`;
        element.style.height = `${width * viewport.height / viewport.width}px`;
        element.setAttribute('aria-label', `Seite ${number}`);
        session.slots.push({
          number,
          element,
          width,
          height: width * viewport.height / viewport.width,
          pageWidth: viewport.width
        });
        page.cleanup?.();
      }
      if (renderId !== pdfRenderId || pdfSession !== session) return;
      const previousScroll = previewContainer.scrollTop;
      pdfPages.replaceChildren(...session.slots.map((slot) => slot.element));
      previewContainer.scrollTop = previousScroll;
      if (typeof IntersectionObserver === 'function') {
        session.observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const slot = session.slots.find((item) => item.element === entry.target);
            if (!slot) continue;
            if (entry.isIntersecting) session.visiblePages.add(slot);
            else session.visiblePages.delete(slot);
          }
          updateRenderedPdfPages(session);
        }, { root: previewContainer, rootMargin: '100% 0px' });
        for (const slot of session.slots) session.observer.observe(slot.element);
      } else {
        session.scrollListener = () => updateFallbackPdfPages(session);
        previewContainer.addEventListener('scroll', session.scrollListener, { passive: true });
        updateFallbackPdfPages(session);
      }
    } catch (error) {
      if (renderId === pdfRenderId) {
        const session = pdfSession;
        pdfSession = undefined;
        await discardPdfSession(session);
        previewStatus.textContent = `PDF konnte nicht dargestellt werden: ${error.message}`;
      }
    }
  }

  function clearPdfPreview() {
    pdfRenderId += 1;
    const session = pdfSession;
    pdfSession = undefined;
    pdfPages.replaceChildren();
    discardPdfSession(session).catch((error) => {
      previewStatus.textContent = `PDF-Speicher konnte nicht freigegeben werden: ${error.message}`;
    });
  }

  function previewVisible() {
    return Boolean(document.getElementById('preview-container').classList?.contains?.('visible'));
  }

  async function compileProject(context, reason) {
    logActivity(`Kompilierung angefordert (${reason === 'preview' ? 'Vorschau' : reason === 'main' ? 'Hauptdatei' : 'Speichern'}).`);
    const records = await readProjectRecords(context);
    const main = updateMainFileOptions(context, records);
    if (!isCurrentContext(context)) {
      logActivity('Kompilierung verworfen: Projektkontext hat sich geändert.');
      return;
    }
    if (!main) {
      compileSummary.textContent = 'Keine Hauptdatei: bitte main.tex anlegen oder eine Hauptdatei wählen.';
      setCompilerLog(compileSummary.textContent);
      logActivity('Kompilierung nicht gestartet: Keine Hauptdatei ausgewählt. Compiler-Protokoll öffnen.', { compiler: true });
      compileDiagnostics = [];
      applyCompileMarkers();
      previewStatus.textContent = 'Keine Vorschau: Hauptdatei fehlt.';
      return;
    }
    const files = {};
    for (const record of records) files[record.path] = record.binary ? record.data : record.content ?? '';
    const settings = readProjectSettings(context);
    if (settings.hyphenation !== 'auto' && typeof files[main] === 'string') {
      files[main] = `\\PassOptionsToPackage{main=${settings.hyphenation}}{babel}\n${files[main]}`;
    }
    const key = contextKey(context);
    let installedPacks = [];
    let packageStorageError;
    try { installedPacks = await readProjectTexPacks(context); }
    catch (error) {
      packageStorageError = error;
      logActivity('Projektbezogene Offline-TeX-Pakete konnten nicht gelesen werden; die Basiskompilierung wird versucht.');
    }
    if (!isCurrentContext(context)) return;
    let signature = projectSignature(main, files, installedPacks);
    if (compiledSignatures.get(key) === signature && currentPdf && currentPdfContext === key) {
      logActivity('Kompilierung übersprungen: Vorschau ist aktuell.');
      if (reason === 'preview') {
        previewStatus.textContent = `Vorschau von ${main} (aktueller Stand).`;
        await renderPdf(currentPdf);
      }
      return;
    }
    compileSummary.textContent = `Kompilierung von ${main} läuft…`;
    setCompilerLog(compileSummary.textContent);
    previewStatus.textContent = `Kompilierung von ${main} läuft…`;
    logActivity(`Kompilierung gestartet (${records.length} Projektdateien).`);
    let result;
    try {
      result = await compileWithTexPacks(context, main, files, installedPacks, packageStorageError);
    } catch (error) {
      if (!isCurrentContext(context)) {
        logActivity('Kompilierung abgebrochen; das Ergebnis gehört zu einem vorherigen Projektkontext.');
        return;
      }
      compileSummary.textContent = `Kompilierung nicht möglich: ${error.message}`;
      setCompilerLog(compileSummary.textContent);
      logActivity('Kompilierung abgebrochen. Compiler-Protokoll öffnen.', { compiler: true });
      previewStatus.textContent = currentPdf && currentPdfContext === key
        ? 'Kompilierung nicht möglich; die angezeigte Vorschau ist veraltet.'
        : `Keine Vorschau: ${error.message}`;
      return;
    }
    if (!isCurrentContext(context)) {
      logActivity('Kompilierungsergebnis verworfen: Projektkontext hat sich geändert.');
      return;
    }
    const errors = (result.diagnostics || []).filter((item) => item.severity === 'error').length;
    const warnings = (result.diagnostics || []).filter((item) => item.severity === 'warning').length;
    if (result.packageNotice) logActivity('Zusätzliche TeX-Pakete wurden für diese Kompilierung nicht vollständig bereitgestellt.');
    installedPacks = result.projectPackages || installedPacks;
    signature = projectSignature(main, files, installedPacks);
    compiledSignatures.set(key, signature);
    showCompileDiagnostics(main, result);
    logActivity(`Kompilierung ${result.pdf ? 'abgeschlossen' : 'ohne PDF beendet'} (${errors} Fehler, ${warnings} Warnungen). Compiler-Protokoll öffnen.`, { compiler: true });
    compileDiagnosticsKey = key;
    if (result.pdf) {
      currentPdf = new Uint8Array(result.pdf);
      currentPdfContext = key;
      previewStatus.textContent = `Vorschau von ${main} (aktueller Stand).`;
      if (previewVisible()) await renderPdf(currentPdf);
    } else {
      previewStatus.textContent = currentPdf && currentPdfContext === key
        ? 'Kompilierung fehlgeschlagen; die angezeigte Vorschau ist veraltet.'
        : 'Keine Vorschau: Kompilierung fehlgeschlagen.';
    }
  }

  // Nur die jeweils neueste Anforderung wird nach einem laufenden Durchgang noch ausgeführt.
  async function requestCompile(reason, context = projectContext()) {
    compileRequest = { reason, context };
    if (compileRunning) return;
    compileRunning = true;
    try {
      while (compileRequest) {
        const next = compileRequest;
        compileRequest = null;
        try { await compileProject(next.context, next.reason); }
        catch (error) {
          if (isCurrentContext(next.context)) {
            setCompilerLog(`Kompilierung fehlgeschlagen: ${error.message}`);
            logActivity('Kompilierung abgebrochen: Projektdateien oder Vorschau konnten nicht verarbeitet werden. Compiler-Protokoll öffnen.', { compiler: true });
          } else logActivity('Kompilierung abgebrochen: Projektkontext hat sich geändert.');
          setStatus(`Kompilierung fehlgeschlagen: ${error.message}`);
        }
      }
    } finally {
      compileRunning = false;
    }
  }

  function persistCurrentFile(showSavedStatus = false) {
    const content = getEditorValue();
    const repo = repoName || 'local';
    const branch = branchName;
    const path = activePath;
    const save = async () => {
      const previous = await readStoredFile(repo, branch, path);
      const record = {
        ...previous,
        ...(!previous ? { baseContent: '', isNewFile: true } : {}),
        id: fileId(repo, branch, path),
        repo,
        branch,
        path,
        content,
        updatedAt: Date.now()
      };
      await storeFile(record);
      try {
        const project = await readRecord('projects', repo);
        await storeProject({
          id: repo,
          repo,
          branch,
          activePath: path,
          paths: [...new Set([...(project?.branch === branch ? project.paths || [] : []), path])],
          updatedAt: record.updatedAt
        });
      } catch (error) {
        logActivity('Datei lokal gespeichert; Projektmetadaten konnten nicht gespeichert werden.');
        setStatus(`Datei lokal gespeichert; Projektmetadaten konnten nicht gespeichert werden: ${error.message}`);
      }
      if (repo === 'local') {
        try { localStorage.setItem('latex_ipad_document', content); }
        catch (error) {
          logActivity('IndexedDB gespeichert; zusätzliche localStorage-Kopie fehlgeschlagen.');
          setStatus(`IndexedDB gespeichert; zusätzliche localStorage-Kopie fehlgeschlagen: ${error.message}`);
        }
      }
      if (showSavedStatus) {
        logActivity('Datei lokal gespeichert.');
        setStatus(`Lokal gespeichert: ${path}`);
      }
      if (isCurrentContext({ repo, branch })) updateChangeState();
      requestCompile('save', { repo, branch });
    };
    const result = saveQueue.catch(() => {}).then(save).then((value) => {
      saveFailureLogged = false;
      return value;
    }, (error) => {
      if (!saveFailureLogged) logActivity('Lokales Speichern fehlgeschlagen.');
      saveFailureLogged = true;
      throw error;
    });
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

  setInterval(() => {
    if (!activeFileLoaded) return;
    persistCurrentFile().catch((error) => {
      setStatus(`Automatisches Speichern fehlgeschlagen: ${error.message}`);
      showError(error.message);
    });
  }, PERIODIC_SAVE_MS);

  textarea.addEventListener('input', () => {
    handleEditorInput();
  });
  textarea.addEventListener('keydown', (event) => insertLatexQuotes(event, false));
  monacoHost.addEventListener('keydown', (event) => insertLatexQuotes(event, true));
  sidebarToggle.addEventListener('click', () => {
    if (sidebarToggle.disabled) return;
    sidebar.classList.toggle('collapsed');
    sidebarResize.setAttribute('tabindex', sidebar.classList.contains('collapsed') ? '-1' : '0');
    logActivity(`Sidebar ${sidebar.classList.contains('collapsed') ? 'zugeklappt' : 'aufgeklappt'}.`);
  });
  let resizeDrag;
  const sidebarPortrait = () => window.matchMedia('(orientation: portrait)').matches;
  function updatePreviewResizer() {
    previewResizer.hidden = !previewVisible();
    const portrait = sidebarPortrait();
    previewResizer.setAttribute('aria-orientation', portrait ? 'horizontal' : 'vertical');
    previewResizer.setAttribute('aria-valuenow', String(Math.round(previewSize)));
  }
  function resizePreview(value) {
    previewSize = Math.max(20, Math.min(70, value));
    previewContainer.style.flexBasis = `${previewSize}%`;
    previewResizer.setAttribute('aria-valuenow', String(Math.round(previewSize)));
    schedulePdfRender();
  }
  function schedulePdfRender() {
    clearTimeout(pdfResizeTimer);
    if (currentPdf && previewVisible()) pdfResizeTimer = setTimeout(() => {
      if (previewVisible()) renderPdf(currentPdf);
    }, 100);
  }
  function previewResizeTotal(portrait) {
    const bounds = document.getElementById('main-container').getBoundingClientRect();
    return portrait ? bounds.height : bounds.width;
  }
  previewResizer.addEventListener('pointerdown', (event) => {
    if (previewResizer.hidden || event.button !== 0) return;
    const portrait = sidebarPortrait();
    previewDrag = {
      id: event.pointerId,
      portrait,
      start: portrait ? event.clientY : event.clientX,
      size: previewSize
    };
    previewResizer.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  previewResizer.addEventListener('pointermove', (event) => {
    if (!previewDrag || previewDrag.id !== event.pointerId) return;
    const coordinate = previewDrag.portrait ? event.clientY : event.clientX;
    const start = previewDrag.start;
    const delta = -(coordinate - start) / (previewResizeTotal(previewDrag.portrait) || 1) * 100;
    resizePreview(previewDrag.size + delta);
  });
  function finishPreviewResize(event) {
    if (!previewDrag || previewDrag.id !== event.pointerId) return;
    previewDrag = undefined;
    logActivity('Größe der PDF-Vorschau geändert.');
  }
  previewResizer.addEventListener('pointerup', finishPreviewResize);
  previewResizer.addEventListener('pointercancel', finishPreviewResize);
  previewResizer.addEventListener('lostpointercapture', finishPreviewResize);
  previewResizer.addEventListener('keydown', (event) => {
    const portrait = sidebarPortrait();
    const increase = portrait ? 'ArrowUp' : 'ArrowLeft';
    const decrease = portrait ? 'ArrowDown' : 'ArrowRight';
    if (event.key !== increase && event.key !== decrease) return;
    event.preventDefault();
    const current = Number(previewResizer.getAttribute('aria-valuenow')) || 40;
    resizePreview(current + (event.key === increase ? 5 : -5));
    logActivity('Größe der PDF-Vorschau geändert.');
  });
  updatePreviewResizer();
  function resizeSidebar(size) {
    const bounds = document.getElementById('main-container').getBoundingClientRect();
    const minimum = 180;
    const maximum = Math.max(minimum, sidebarPortrait() ? bounds.width : bounds.width - 120);
    const value = Math.max(minimum, Math.min(maximum, size));
    sidebar.style.setProperty('--sidebar-width', `${value}px`);
    sidebarResize.setAttribute('aria-valuemin', String(minimum));
    sidebarResize.setAttribute('aria-valuemax', String(Math.round(maximum)));
    sidebarResize.setAttribute('aria-valuenow', String(Math.round(value)));
  }
  function syncResizeOrientation() {
    sidebarResize.setAttribute('aria-orientation', 'vertical');
    const bounds = document.getElementById('main-container').getBoundingClientRect();
    const minimum = 180;
    sidebarResize.setAttribute('aria-valuemin', String(minimum));
    sidebarResize.setAttribute('aria-valuemax', String(Math.round(Math.max(minimum, sidebarPortrait() ? bounds.width : bounds.width - 120))));
    const size = sidebar.getBoundingClientRect();
    sidebarResize.setAttribute('aria-valuenow', String(Math.round(size.width)));
  }
  sidebarResize.addEventListener('pointerdown', (event) => {
    if (sidebar.classList.contains('collapsed') || event.button !== 0) return;
    const bounds = sidebar.getBoundingClientRect();
    resizeDrag = { id: event.pointerId, start: event.clientX, size: bounds.width };
    sidebarResize.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  sidebarResize.addEventListener('pointermove', (event) => {
    if (!resizeDrag || resizeDrag.id !== event.pointerId) return;
    resizeSidebar(resizeDrag.size + event.clientX - resizeDrag.start);
  });
  function finishSidebarResize(event) {
    if (!resizeDrag || resizeDrag.id !== event.pointerId) return;
    resizeDrag = undefined;
    logActivity('Sidebar-Größe geändert.');
  }
  sidebarResize.addEventListener('pointerup', finishSidebarResize);
  sidebarResize.addEventListener('pointercancel', finishSidebarResize);
  sidebarResize.addEventListener('lostpointercapture', finishSidebarResize);
  sidebarResize.addEventListener('keydown', (event) => {
    const increase = 'ArrowRight';
    const decrease = 'ArrowLeft';
    if (event.key !== increase && event.key !== decrease) return;
    event.preventDefault();
    const bounds = sidebar.getBoundingClientRect();
    resizeSidebar(bounds.width + (event.key === increase ? 20 : -20));
    logActivity('Sidebar-Größe geändert.');
  });
  window.addEventListener('resize', syncResizeOrientation);
  window.addEventListener('resize', () => {
    updatePreviewResizer();
    schedulePdfRender();
  });
  syncResizeOrientation();
  texOnlyFilter.addEventListener('change', () => {
    renderSidebar();
    logActivity(`Sidebar-Dateifilter ${texOnlyFilter.checked ? 'aktiviert' : 'deaktiviert'}.`);
  });
  document.getElementById('toggle-preview').addEventListener('click', () => {
    previewContainer.classList.toggle('visible');
    updatePreviewResizer();
    saveViewState();
    if (!previewContainer.classList.contains('visible')) {
      clearPdfPreview();
      return;
    }
    const context = projectContext();
    requestCompile('preview', context);
  });
  mainFileSelect.addEventListener('change', () => {
    const context = projectContext();
    saveProjectSettings(context, { mainFile: mainFileSelect.value })
      .catch((error) => { logActivity('Änderung der Compiler-Hauptdatei konnte nicht gespeichert werden.'); setStatus(`Projekteinstellung konnte nicht gespeichert werden: ${error.message}`); });
    requestCompile('main');
  });
  hyphenationSelect.addEventListener('change', () => {
    const context = projectContext();
    saveProjectSettings(context, { hyphenation: hyphenationSelect.value })
      .then(() => requestCompile('main'))
      .catch((error) => { logActivity('Änderung der Silbentrennung konnte nicht gespeichert werden.'); setStatus(`Projekteinstellung konnte nicht gespeichert werden: ${error.message}`); });
  });
  document.getElementById('save-btn').addEventListener('click', () => saveProjectFromButton().catch((error) => showError(error.message)));

  async function saveProjectFromButton() {
    if (trashOperation || newTexFileRequest) throw new Error('Eine andere Projektaktion läuft bereits.');
    const context = projectContext();
    const savedPath = activePath;
    if (activeFileLoaded || !readTrash(context).length) await persistCurrentFile(true);
    if (!isCurrentContext(context)) {
      logActivity('GitHub-Commit ausgelassen: Projektkontext hat sich nach dem lokalen Speichern geändert.');
      setStatus(`Lokal gespeichert: ${savedPath}. Kein Commit für den geänderten Projektkontext gestartet.`);
      return;
    }
    if (context.repo === 'local') return;
    const settings = readProjectSettings(context);
    const changes = {};
    if (mainFileSelect.value !== settings.mainFiles[context.branch]) changes.mainFile = mainFileSelect.value;
    if (hyphenationSelect.value !== settings.hyphenation) changes.hyphenation = hyphenationSelect.value;
    if (Object.keys(changes).length) await saveProjectSettings(context, changes, true);
    else await storeVersionedProjectSettings(context, settings);
    const records = await readProjectFileRecords(context);
    if (!isCurrentContext(context)) {
      logActivity('GitHub-Commit ausgelassen: Projektkontext hat sich vor dem Commit geändert.');
      setStatus('Lokale Änderungen bleiben gespeichert; kein Commit für den geänderten Projektkontext gestartet.');
      return;
    }
    if (!records.some(isChangedTextFile) && !readTrash(context).some((entry) => entry.items.some((item) => item.remoteSha))) {
      setStatus('Lokal gespeichert; es gibt keine neuen Änderungen für GitHub.');
      return;
    }
    if (!navigator.onLine) {
      logActivity('GitHub-Commit ausgelassen: offline; lokale Dateien und Einstellungen bleiben gespeichert.');
      setStatus(`Lokal gespeichert: ${activePath}. Offline; keine GitHub-Anfrage gestartet.`);
      return;
    }
    if (!token) {
      requestGitHubLogin('commit');
      return;
    }
    openCommitDialog();
  }

  document.getElementById('commit-cancel').addEventListener('click', () => {
    if (!commitRequest) {
      logActivity('GitHub-Commit abgebrochen; lokale Änderungen bleiben gespeichert.');
      commitDialog.close();
    }
  });
  commitDialog.addEventListener('cancel', (event) => {
    if (commitRequest) event.preventDefault();
    else logActivity('GitHub-Commit abgebrochen; lokale Änderungen bleiben gespeichert.');
  });
  commitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (commitRequest) return;
    const message = commitMessage.value.trim();
    if (!message || message.length > 200) {
      commitError.textContent = 'Bitte eine Commit-Nachricht mit höchstens 200 Zeichen eingeben.';
      return;
    }
    commitRequest = true;
    commitSubmit.disabled = true;
    commitError.textContent = '';
    logActivity('GitHub-Commit angefordert.');
    try {
      const result = await commitProjectChanges(message);
      if (result.noChanges) {
        setStatus('Lokal gespeichert; es gibt keine neuen Änderungen für GitHub.');
      } else {
        setStatus(`GitHub-Commit erfolgreich: ${result.sha.slice(0, 7)} (${result.count} Dateien).`);
      }
      commitDialog.close();
    } catch (error) {
      logActivity('GitHub-Commit fehlgeschlagen; lokale Änderungen bleiben erhalten.');
      commitError.textContent = error.message;
    } finally {
      commitRequest = undefined;
      commitSubmit.disabled = false;
    }
  });

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
        value: textarea.value,
        language: 'latex',
        theme: 'vs',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false
      });
      monacoEditor.onDidChangeModelContent(() => {
        if (!suppressEditorChanges) {
          handleEditorInput();
        }
      });
      textarea.style.display = 'none';
      monacoHost.style.display = 'block';
      resetEditorPosition();
      scheduleLint();
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

  async function readProjectFileRecords(context, quiet = false) {
    const records = new Map();
    try {
      for (const record of await readAllRecords('files')) {
        if (record.repo === context.repo && record.branch === context.branch) records.set(record.path, record);
      }
    } catch (error) {
      if ('indexedDB' in window) {
        throw new Error(`Lokale IndexedDB-Dateien konnten nicht vollständig gelesen werden; Commit vorsichtshalber abgebrochen: ${error.message}`);
      }
      if (!quiet) logActivity('IndexedDB-Dateien konnten für den Commit nicht gelesen werden; localStorage wird geprüft.');
    }
    const prefix = `latex_ipad_document:${context.repo}:${context.branch}:`;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const path = key.slice(prefix.length);
      if (records.has(path)) continue;
      let metadata = {};
      try { metadata = JSON.parse(localStorage.getItem(fileMetadataKey(context.repo, context.branch, path)) || '{}'); }
      catch (error) { throw new Error(`Lokale Metadaten für ${path} sind ungültig: ${error.message}`); }
      records.set(path, {
        id: fileId(context.repo, context.branch, path),
        repo: context.repo,
        branch: context.branch,
        path,
        content: localStorage.getItem(key),
        ...metadata
      });
    }
    const trash = readTrash(context);
    return [...records.values()].filter((record) => !pathInTrash(record.path, trash));
  }

  function isChangedTextFile(record) {
    if (record.binary) return false;
    return record.isNewFile === true || typeof record.baseContent !== 'string' || record.content !== record.baseContent;
  }

  function applyChangeMarkers() {
    for (const { element, path, label } of changeMarkerTargets) {
      const state = changeMarkers.get(path);
      if (state) element.setAttribute('data-change', state);
      else element.removeAttribute('data-change');
      element.setAttribute('aria-label', state ? `${label} – ${state === 'new' ? 'neu' : 'geändert'}` : label);
    }
  }

  async function updateChangeState() {
    const request = ++changeStateRequest;
    const context = projectContext();
    try {
      const records = await readProjectFileRecords(context, true);
      if (request !== changeStateRequest || !isCurrentContext(context)) return;
      const byPath = new Map(records.map((record) => [record.path, record]));
      if (activeFileLoaded) {
        const active = byPath.get(activePath);
        byPath.set(activePath, { ...active, path: activePath, content: getEditorValue() });
      }
      const markers = new Map();
      for (const record of byPath.values()) {
        if (record.path === PROJECT_SETTINGS_PATH && record.isNewFile &&
            typeof record.initialContent === 'string' && record.content === record.initialContent) continue;
        if (!isChangedTextFile(record)) continue;
        const placeholder = record.path.endsWith('/.gitkeep');
        const path = placeholder ? record.path.slice(0, -'/.gitkeep'.length) : record.path;
        markers.set(path, record.isNewFile ? 'new' : 'modified');
        const parts = path.split('/');
        parts.pop();
        while (parts.length) {
          const parent = parts.join('/');
          if (!markers.has(parent)) markers.set(parent, 'modified');
          parts.pop();
        }
        if (!markers.has('')) markers.set('', 'modified');
      }
      changeMarkers = markers;
      const deletedRemote = readTrash(context).some((entry) => entry.items.some((item) => item.remoteSha));
      saveButton.disabled = markers.size === 0 && !deletedRemote;
      saveButton.title = saveButton.disabled ? 'Keine Änderungen' : 'Speichern';
      applyChangeMarkers();
    } catch (error) {
      if (request !== changeStateRequest || !isCurrentContext(context)) return;
      saveButton.disabled = false;
      saveButton.title = 'Speichern – Änderungsstatus konnte nicht ermittelt werden';
      logActivity('Änderungsstatus konnte nicht ermittelt werden.');
      setStatus(`Änderungsstatus konnte nicht ermittelt werden: ${error.message}`);
    }
  }

  function openCommitDialog() {
    commitError.textContent = '';
    commitMessage.value = '';
    if (!commitDialog.open) commitDialog.showModal();
  }

  async function commitProjectChanges(message) {
    const context = projectContext();
    const expectedToken = token;
    if (!context.repo || context.repo === 'local') throw new Error('Für ein lokales Projekt gibt es keinen GitHub-Branch.');
    if (!expectedToken || !navigator.onLine) throw new Error('GitHub-Commit benötigt eine Internetverbindung und ein gültiges Token.');
    const files = await readProjectFileRecords(context);
    const changes = files.filter(isChangedTextFile);
    const trash = readTrash(context);
    if (trash.some((entry) => entry.committedSha)) throw new Error('Der Papierkorb eines bereits übertragenen Commits muss zuerst lokal bereinigt werden. Bitte das Projekt erneut öffnen.');
    const deletions = trash.flatMap((entry) => entry.items.filter((item) => item.remoteSha));
    if (!changes.length && !deletions.length) return { noChanges: true };
    const project = readProjectCatalog().find((item) => item.id === context.repo);
    const baseSha = project?.remoteHeadShas?.[context.branch];
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(baseSha || '')) {
      throw new Error('Der Remote-Basisstand dieses Branches fehlt. Bitte das Repository online erneut öffnen.');
    }
    const repoPath = context.repo.split('/').map(encodeURIComponent).join('/');
    const branchPath = context.branch.split('/').map(encodeURIComponent).join('/');
    const apiBase = `/repos/${repoPath}`;
    const refResponse = await githubApi(`${apiBase}/git/ref/heads/${branchPath}`);
    const ref = await refResponse.json();
    if (ref.object?.sha !== baseSha) {
      throw new Error('Der GitHub-Branch wurde seit dem letzten Laden geändert. Der Commit wurde abgebrochen; bitte das Repository erneut öffnen.');
    }
    const commitResponse = await githubApi(`${apiBase}/git/commits/${encodeURIComponent(baseSha)}`);
    const baseCommit = await commitResponse.json();
    if (!baseCommit.tree?.sha) throw new Error('GitHub lieferte keinen Dateibaum für den gespeicherten Remote-Basisstand.');
    const treeResponse = await githubApi(`${apiBase}/git/trees/${encodeURIComponent(baseCommit.tree.sha)}?recursive=1`);
    const baseTree = await treeResponse.json();
    if (baseTree.truncated || !Array.isArray(baseTree.tree)) throw new Error('GitHub lieferte keinen vollständigen Remote-Dateibaum.');
    const remoteFiles = new Map(baseTree.tree.filter((item) => item.type === 'blob' || item.type === 'commit').map((item) => [item.path, item]));
    for (const item of deletions) {
      const remote = remoteFiles.get(item.path);
      if (!remote || remote.sha !== item.remoteSha) {
        throw new Error(`Der Remote-Stand von ${item.path} im Papierkorb weicht ab. Der Commit wurde abgebrochen.`);
      }
    }
    for (const record of changes) {
      if (!isSafeProjectPath(record.path)) throw new Error('Ein lokaler Dateipfad ist ungültig; der Commit wurde abgebrochen.');
      const remoteFile = remoteFiles.get(record.path);
      if (record.isNewFile) {
        if (remoteFile) throw new Error(record.path === PROJECT_SETTINGS_PATH
          ? 'Die versionierten Projekteinstellungen existieren bereits auf GitHub und wurden lokal noch nicht abgeglichen. Repository erneut öffnen.'
          : `Die Datei ${record.path} existiert bereits auf GitHub. Repository erneut öffnen, um den Konflikt aufzulösen.`);
      } else if (!remoteFile || !record.remoteSha || remoteFile.sha !== record.remoteSha) {
        throw new Error(record.path === PROJECT_SETTINGS_PATH
          ? 'Die versionierten Projekteinstellungen auf GitHub weichen vom gespeicherten Stand ab. Der Commit wurde abgebrochen; Repository erneut öffnen.'
          : `Der Remote-Stand von ${record.path} weicht vom gespeicherten Stand ab. Der Commit wurde abgebrochen; Repository erneut öffnen.`);
      }
      if (typeof record.baseContent !== 'string' || typeof record.content !== 'string') {
        throw new Error(`Für ${record.path} fehlt eine sichere Textbasis. Repository erneut öffnen, bevor Änderungen übertragen werden.`);
      }
    }
    if (token !== expectedToken || !isCurrentContext(context) || !navigator.onLine) {
      throw new Error('GitHub-Commit abgebrochen: Anmeldung, Projekt oder Verbindung hat sich geändert.');
    }
    logActivity('Atomarer GitHub-Commit wird vorbereitet.');
    const blobs = new Map();
    for (const record of changes) {
      const response = await githubWrite(`${apiBase}/git/blobs`, 'POST', {
        content: record.content,
        encoding: 'utf-8'
      });
      const blob = await response.json();
      if (!blob.sha) throw new Error('GitHub lieferte keinen Datei-SHA für den Commit.');
      blobs.set(record.path, blob.sha);
    }
    const treeResponseCreated = await githubWrite(`${apiBase}/git/trees`, 'POST', {
      base_tree: baseCommit.tree.sha,
      tree: [...changes.map((record) => ({
        path: record.path,
        mode: '100644',
        type: 'blob',
        sha: blobs.get(record.path)
      })), ...deletions.map((item) => {
        const remote = remoteFiles.get(item.path);
        return { path: item.path, mode: remote.mode, type: remote.type, sha: null };
      })]
    });
    const newTree = await treeResponseCreated.json();
    if (!newTree.sha) throw new Error('GitHub lieferte keinen neuen Projektbaum.');
    const commitResponseCreated = await githubWrite(`${apiBase}/git/commits`, 'POST', {
      message,
      tree: newTree.sha,
      parents: [baseSha]
    });
    const newCommit = await commitResponseCreated.json();
    if (!newCommit.sha) throw new Error('GitHub lieferte keinen neuen Commit-SHA.');
    if (token !== expectedToken || !isCurrentContext(context) || !navigator.onLine) {
      throw new Error('GitHub-Commit wurde erstellt, aber der Branch konnte wegen eines geänderten Projektkontexts nicht aktualisiert werden.');
    }
    try {
      await githubWrite(`${apiBase}/git/refs/heads/${branchPath}`, 'PATCH', {
        sha: newCommit.sha,
        force: false
      });
    } catch (error) {
      if (/GitHub API (?:409|422)/.test(error.message)) {
        throw new Error('Der GitHub-Branch wurde während des Commits geändert. Der Push wurde abgebrochen; lokale Änderungen bleiben erhalten.');
      }
      throw error;
    }
    try {
      if (trash.length) writeTrash(context, trash.map((entry) => ({ ...entry, committedSha: newCommit.sha })));
      for (const record of changes) {
        const current = await readStoredFile(context.repo, context.branch, record.path);
        await storeFile({
          ...record,
          ...current,
          baseContent: record.content,
          remoteSha: blobs.get(record.path),
          isNewFile: false,
          updatedAt: Date.now()
        });
      }
      if (trash.length) await finalizeCommittedTrash(context);
      await storeProject({
        id: context.repo,
        repo: context.repo,
        branch: context.branch,
        remoteHeadShas: { ...(project?.remoteHeadShas || {}), [context.branch]: newCommit.sha },
        updatedAt: Date.now()
      });
      if (isCurrentContext(context)) updateChangeState();
    } catch (error) {
      throw new Error(`Commit wurde auf GitHub erstellt, aber die lokale Remote-Basis konnte nicht vollständig aktualisiert werden: ${error.message}`);
    }
    logActivity('GitHub-Commit erfolgreich übertragen; lokale Basis-SHAs aktualisiert.');
    if (isCurrentContext(context)) renderSidebar();
    return { noChanges: false, sha: newCommit.sha, count: changes.length + deletions.length };
  }

  function encodeBase64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  function conflictMarkers(localContent, remoteContent) {
    return `<<<<<<< LOKAL\n${localContent}${localContent.endsWith('\n') ? '' : '\n'}=======\n${remoteContent}${remoteContent.endsWith('\n') ? '' : '\n'}>>>>>>> ONLINE\n`;
  }

  function diffHunks(base, changed) {
    const before = base.split('\n');
    const after = changed.split('\n');
    const width = after.length + 1;
    const cells = (before.length + 1) * width;
    if (cells > 2_000_000) throw new Error('Datei ist für den automatischen Merge zu groß.');
    const table = new Uint32Array(cells);
    for (let i = before.length - 1; i >= 0; i -= 1) {
      for (let j = after.length - 1; j >= 0; j -= 1) {
        table[i * width + j] = before[i] === after[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
      }
    }
    const hunks = [];
    let i = 0;
    let j = 0;
    while (i < before.length || j < after.length) {
      if (i < before.length && j < after.length && before[i] === after[j]) {
        i += 1;
        j += 1;
        continue;
      }
      const start = i;
      const replacement = [];
      while (i < before.length || j < after.length) {
        if (i < before.length && j < after.length && before[i] === after[j]) break;
        if (j < after.length && (i === before.length || table[i * width + j + 1] >= table[(i + 1) * width + j])) {
          replacement.push(after[j]);
          j += 1;
        } else {
          i += 1;
        }
      }
      hunks.push({ start, end: i, replacement });
    }
    return hunks;
  }

  function hunksOverlap(left, right) {
    if (left.start === left.end && right.start === right.end) return left.start === right.start;
    if (left.start === left.end) return left.start >= right.start && left.start < right.end;
    if (right.start === right.end) return right.start >= left.start && right.start < left.end;
    return left.start < right.end && right.start < left.end;
  }

  function mergeText(base, local, remote) {
    if (local === remote) return { content: local, conflicts: false };
    if (local === base) return { content: remote, conflicts: false };
    if (remote === base) return { content: local, conflicts: false };
    let localHunks;
    let remoteHunks;
    try {
      localHunks = diffHunks(base, local);
      remoteHunks = diffHunks(base, remote);
    } catch (error) {
      if (error.message !== 'Datei ist für den automatischen Merge zu groß.') throw error;
      return { content: conflictMarkers(local, remote), conflicts: true };
    }
    for (const localHunk of localHunks) {
      for (const remoteHunk of remoteHunks) {
        if (!hunksOverlap(localHunk, remoteHunk)) continue;
        if (localHunk.start === remoteHunk.start && localHunk.end === remoteHunk.end &&
          localHunk.replacement.join('\n') === remoteHunk.replacement.join('\n')) continue;
        return { content: conflictMarkers(local, remote), conflicts: true };
      }
    }
    const edits = [...localHunks, ...remoteHunks]
      .filter((edit, index, all) => all.findIndex((other) =>
        edit.start === other.start && edit.end === other.end &&
        edit.replacement.join('\n') === other.replacement.join('\n')) === index)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const lines = base.split('\n');
    const output = [];
    let cursor = 0;
    for (const edit of edits) {
      if (edit.start < cursor) return { content: conflictMarkers(local, remote), conflicts: true };
      output.push(...lines.slice(cursor, edit.start), ...edit.replacement);
      cursor = edit.end;
    }
    output.push(...lines.slice(cursor));
    return { content: output.join('\n'), conflicts: false };
  }

  function askConflictChoice(path, localContent, remoteContent, signal) {
    if (signal?.aborted) return Promise.resolve(null);
    conflictDescription.textContent = `„${path}“ wurde lokal und online geändert. Wähle eine Version oder führe beide Änderungen zusammen.`;
    conflictLocal.textContent = `LOKAL\n${localContent}`;
    conflictRemote.textContent = `ONLINE\n${remoteContent}`;
    conflictDialog.showModal();
    return new Promise((resolve) => {
      const finish = (choice) => {
        signal?.removeEventListener('abort', onAbort);
        conflictResolver = undefined;
        conflictDialog.close();
        resolve(choice);
      };
      const onAbort = () => finish(null);
      conflictResolver = finish;
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  function renderFileTree(items) {
    const root = document.createElement('ul');
    root.className = 'file-tree';
    const project = document.createElement('li');
    project.className = 'file-item folder-item project-item';
    const projectButton = document.createElement('button');
    projectButton.type = 'button';
    projectButton.className = 'folder-toggle';
    projectButton.setAttribute('data-icon', 'folder-blank');
    projectButton.textContent = repoName || 'Lokales Projekt';
    changeMarkerTargets = [{ element: projectButton, path: '', label: projectButton.textContent }];
    const projectChildren = document.createElement('ul');
    projectChildren.hidden = collapsedFolders.has('');
    projectButton.setAttribute('aria-expanded', String(!projectChildren.hidden));
    projectButton.addEventListener('click', () => {
      projectChildren.hidden = !projectChildren.hidden;
      if (projectChildren.hidden) collapsedFolders.add('');
      else collapsedFolders.delete('');
      projectButton.setAttribute('aria-expanded', String(!projectChildren.hidden));
      logActivity(`Sidebar-Projektordner ${projectChildren.hidden ? 'zugeklappt' : 'aufgeklappt'}.`);
    });
    project.appendChild(projectButton);
    project.appendChild(projectChildren);
    project.appendChild(createFolderAddButton(''));
    root.appendChild(project);
    const directories = new Map([['', projectChildren]]);
    activeFileButtons = [];
    const visibleItems = items.filter((item) => {
      const parts = item.path.split('/');
      return !parts.includes('.git') && item.path !== '.latex-ipad' && !item.path.startsWith('.latex-ipad/') &&
        (item.type === 'tree' || !['.gitignore', '.gitattributes', '.gitmodules', '.gitkeep'].includes(parts[parts.length - 1]));
    });
    const visibleFiles = visibleItems.filter((item) => item.type === 'blob' && item.mode !== '120000' && TEX_FILE.test(item.path));
    const visibleFilePaths = new Set(visibleFiles.map((item) => item.path));
    const visibleDirectories = new Set();
    const folderMarkers = items.filter((item) => item.type === 'blob' && item.path.endsWith('/.gitkeep'));
    for (const item of [...visibleFiles, ...folderMarkers]) {
      const parts = item.path.split('/');
      parts.pop();
      while (parts.length) {
        visibleDirectories.add(parts.join('/'));
        parts.pop();
      }
    }
    const sorted = visibleItems.filter((item) => (item.type === 'tree' || item.type === 'blob' || item.type === 'commit') &&
      (!texOnlyFilter.checked || (item.type === 'tree' ? visibleDirectories.has(item.path) : item.type === 'blob' && item.mode !== '120000' && visibleFilePaths.has(item.path))))
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
        row.className = 'file-item folder-item';
        const label = document.createElement('button');
        label.type = 'button';
        label.className = 'folder-toggle';
        label.setAttribute('data-icon', 'folder-blank');
        label.textContent = name;
        changeMarkerTargets.push({ element: label, path: item.path, label: `Ordner: ${name}` });
        const children = document.createElement('ul');
        children.hidden = collapsedFolders.has(item.path);
        label.setAttribute('aria-expanded', String(!children.hidden));
        const consumeLongPressClick = addItemContextMenu(label, item);
        label.addEventListener('click', (event) => {
          if (consumeLongPressClick(event)) return;
          children.hidden = !children.hidden;
          if (children.hidden) collapsedFolders.add(item.path);
          else collapsedFolders.delete(item.path);
          label.setAttribute('aria-expanded', String(!children.hidden));
          logActivity(`Sidebar-Ordner ${children.hidden ? 'zugeklappt' : 'aufgeklappt'}.`);
        });
        row.appendChild(label);
        row.appendChild(children);
        row.appendChild(createFolderAddButton(item.path));
        directories.set(item.path, children);
      } else {
        const extension = name.match(/\.([^.]+)$/)?.[1]?.toLowerCase();
        const supportedFile = item.type === 'blob' && item.mode !== '120000';
        const editable = supportedFile && (extension === 'tex' || extension === 'latex' || extension === 'ltx');
        const label = document.createElement(editable ? 'button' : 'span');
        const consumeLongPressClick = addItemContextMenu(label, item);
        if (editable) {
          label.type = 'button';
          label.className = 'file-select-button';
          label.setAttribute('aria-label', `LaTeX-Datei bearbeiten: ${name}`);
          changeMarkerTargets.push({ element: label, path: item.path, label: `LaTeX-Datei bearbeiten: ${name}` });
          label.addEventListener('click', async (event) => {
            if (consumeLongPressClick(event)) return;
            if (fileLoadRequest) fileLoadRequest.abort();
            const controller = new AbortController();
            fileLoadRequest = controller;
            try {
              await selectFile(item.path, controller.signal);
            } catch (error) {
              if (controller.signal.aborted) logActivity('Dateiauswahl abgebrochen.');
              else {
                logActivity('Datei konnte nicht geladen werden.');
                setStatus(`Datei konnte nicht geladen werden: ${error.message}`);
              }
            } finally {
              if (fileLoadRequest === controller) fileLoadRequest = undefined;
            }
          });
          activeFileButtons.push({ path: item.path, button: label });
        } else {
          label.className = 'file-readonly';
          label.setAttribute('role', 'button');
          label.setAttribute('tabindex', '0');
          label.addEventListener('click', consumeLongPressClick);
          if (item.type !== 'commit' && item.mode !== '160000') label.setAttribute('data-icon', 'locked');
          const reason = item.type === 'commit' || item.mode === '160000'
            ? 'Git-Submodule nicht unterstützt'
            : item.mode === '120000'
              ? 'Symbolischer Link nicht unterstützt'
              : 'Nicht bearbeitbare Datei';
          label.setAttribute('aria-label', `${reason}: ${name}`);
        }
        label.textContent = name;
        row.appendChild(label);
      }
      parent.appendChild(row);
    }
    if (!projectChildren.children.length) {
      const empty = document.createElement('li');
      empty.className = 'file-item';
      empty.textContent = texOnlyFilter.checked ? 'Keine TeX-Dateien zum Anzeigen.' : 'Keine Ordner oder Dateien zum Anzeigen.';
      projectChildren.appendChild(empty);
    }
    return root;
  }

  function createFolderAddButton(folder) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'folder-add';
    button.setAttribute('data-icon', 'add');
    const label = `Datei oder Ordner anlegen in ${folder || 'Projektwurzel'}`;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.addEventListener('click', () => openNewTexFileDialog(folder));
    return button;
  }

  let contextItem;
  let contextAnchor;
  let longPressTimer;
  function cancelLongPress() {
    clearTimeout(longPressTimer);
    longPressTimer = undefined;
  }
  function closeFileContextMenu() {
    fileContextMenu.hidden = true;
    contextItem = undefined;
    contextAnchor = undefined;
  }
  function addItemContextMenu(label, item) {
    let suppressClick = false;
    let start;
    label.setAttribute('aria-haspopup', 'menu');
    label.setAttribute('aria-keyshortcuts', 'Shift+F10');
    label.setAttribute('title', 'Für Aktionen gedrückt halten');
    const open = () => {
      cancelLongPress();
      contextItem = item;
      contextAnchor = label;
      fileContextDelete.setAttribute('aria-label', `${item.type === 'tree' ? 'Ordner' : 'Datei'} löschen: ${item.path}`);
      const rect = label.getBoundingClientRect();
      fileContextMenu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 170))}px`;
      fileContextMenu.style.top = `${Math.max(8, Math.min(rect.bottom, window.innerHeight - 55))}px`;
      fileContextMenu.hidden = false;
      fileContextDelete.focus({ preventScroll: true });
    };
    label.addEventListener('pointerdown', (event) => {
      suppressClick = false;
      cancelLongPress();
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      start = { id: event.pointerId, x: event.clientX, y: event.clientY };
      longPressTimer = setTimeout(() => {
        suppressClick = true;
        open();
      }, 550);
    });
    label.addEventListener('pointermove', (event) => {
      if (start && event.pointerId === start.id && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancelLongPress();
    });
    const finish = (event) => {
      if (start && event.pointerId === start.id) {
        cancelLongPress();
        start = undefined;
      }
    };
    label.addEventListener('pointerup', finish);
    label.addEventListener('pointercancel', finish);
    label.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      suppressClick = true;
      open();
    });
    label.addEventListener('keydown', (event) => {
      suppressClick = false;
      if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
        event.preventDefault();
        open();
      }
    });
    return (event) => {
      if (!suppressClick) return false;
      suppressClick = false;
      event?.preventDefault();
      event?.stopPropagation();
      return true;
    };
  }
  fileContextDelete.addEventListener('click', () => {
    const item = contextItem;
    closeFileContextMenu();
    if (!item) return;
    return deleteProjectItem(item).catch((error) => {
      logActivity('Verschieben in den Papierkorb fehlgeschlagen.');
      setStatus(`Verschieben in den Papierkorb fehlgeschlagen: ${error.message}`);
    });
  });
  document.addEventListener('pointerdown', (event) => {
    if (!fileContextMenu.hidden && !fileContextMenu.contains(event.target)) closeFileContextMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !fileContextMenu.hidden) {
      const anchor = contextAnchor;
      closeFileContextMenu();
      anchor?.focus({ preventScroll: true });
      event.preventDefault();
    }
  });
  fileList.addEventListener('scroll', () => {
    cancelLongPress();
    closeFileContextMenu();
  });

  function renderTrash() {
    const entries = readTrash(projectContext());
    const rows = entries.map((entry) => {
      const row = document.createElement('div');
      row.className = 'trash-entry';
      const name = document.createElement('span');
      name.textContent = entry.committedSha ? `${entry.path} (lokale Bereinigung ausstehend)` : entry.path;
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.setAttribute('data-icon', 'undo');
      restore.setAttribute('aria-label', `Wiederherstellen: ${entry.path}`);
      restore.setAttribute('title', `Wiederherstellen: ${entry.path}`);
      restore.disabled = Boolean(entry.committedSha);
      restore.addEventListener('click', () => restoreProjectItem(entry).catch((error) => {
        logActivity('Wiederherstellen aus dem Papierkorb fehlgeschlagen.');
        setStatus(`Wiederherstellen fehlgeschlagen: ${error.message}`);
      }));
      row.append(name, restore);
      return row;
    });
    if (!rows.length) {
      const empty = document.createElement('span');
      empty.textContent = 'Papierkorb ist leer.';
      rows.push(empty);
    }
    trashList.replaceChildren(...rows);
  }

  function setEditorReadOnly(readOnly) {
    textarea.readOnly = readOnly;
    if (monacoEditor) monacoEditor.updateOptions({ readOnly });
  }

  async function deleteProjectItem(item) {
    if (trashOperation || commitRequest || newTexFileRequest || repositoryLoading) throw new Error('Eine andere Projektaktion läuft bereits.');
    if (!window.confirm(`${item.type === 'tree' ? 'Ordner' : 'Datei'} „${item.path}“ in den Papierkorb legen?`)) {
      logActivity('Verschieben in den Papierkorb abgebrochen.');
      return;
    }
    const context = projectContext();
    trashOperation = true;
    const previousReadOnly = textarea.readOnly;
    let activeDeleted = false;
    let openError;
    setEditorReadOnly(true);
    try {
      clearTimeout(saveTimer);
      if (activeFileLoaded) await persistCurrentFile();
      else await saveQueue;
      if (!isCurrentContext(context)) throw new Error('Das Projekt hat sich geändert.');
      const items = sidebarItems.filter((candidate) =>
        candidate.path === item.path || (item.type === 'tree' && candidate.path.startsWith(`${item.path}/`)));
      if (!items.some((candidate) => candidate.path === item.path)) throw new Error('Der Eintrag ist nicht mehr vorhanden.');
      const entries = readTrash(context);
      if (pathInTrash(item.path, entries) || entries.some((entry) => entry.path.startsWith(`${item.path}/`))) {
        throw new Error('Der Eintrag oder ein untergeordneter Eintrag befindet sich bereits im Papierkorb. Bitte zuerst wiederherstellen oder speichern.');
      }
      const records = new Map((await readProjectFileRecords(context)).map((record) => [record.path, record]));
      const savedItems = items.map((candidate) => {
        const record = records.get(candidate.path);
        if (record?.isNewFile && candidate.sha) {
          throw new Error(`Für ${candidate.path} besteht ein Konflikt mit einer Remote-Datei. Bitte das Repository erneut öffnen.`);
        }
        const remoteSha = candidate.type === 'tree' || record?.isNewFile ? null : record?.remoteSha || candidate.sha || null;
        if (context.repo !== 'local' && candidate.type !== 'tree' && !remoteSha && !record?.isNewFile) {
          throw new Error(`Für ${candidate.path} fehlt der gespeicherte Remote-Stand; bitte das Repository erneut öffnen.`);
        }
        return { ...candidate, remoteSha };
      });
      if (!isCurrentContext(context)) throw new Error('Das Projekt hat sich geändert.');
      const snapshots = [];
      try {
        for (const candidate of savedItems) {
          const record = records.get(candidate.path);
          if (!record) continue;
          candidate.snapshotLocation = await storeTrashSnapshot(context, record);
          snapshots.push(candidate);
        }
        if (!isCurrentContext(context)) throw new Error('Das Projekt hat sich geändert.');
        writeTrash(context, [...entries, { path: item.path, kind: item.type, items: savedItems }]);
      } catch (error) {
        try {
          for (const snapshot of snapshots) await removeTrashSnapshot(context, snapshot);
        } catch (cleanupError) {
          throw new Error(`${error.message} Papierkorbkopien konnten nicht vollständig bereinigt werden: ${cleanupError.message}`);
        }
        throw error;
      }
      activeDeleted = items.some((candidate) => candidate.path === activePath);
      sidebarItems = sidebarItems.filter((candidate) => !items.includes(candidate));
      if (activeDeleted) {
        activeFileLoaded = false;
        activePath = 'main.tex';
        setEditorValue('');
      }
      renderSidebar();
      if (activeDeleted) {
        const next = sidebarItems.find((candidate) => candidate.type === 'blob' && candidate.mode !== '120000' && TEX_FILE.test(candidate.path));
        if (next) {
          try { await selectFile(next.path); }
          catch (error) {
            logActivity('Nach dem Löschen konnte keine andere Datei geöffnet werden.');
            openError = error.message;
          }
        }
      }
      await refreshMainFiles();
      saveViewState();
      requestCompile('save', context);
      logActivity('Eintrag in den Papierkorb verschoben.');
      setStatus(openError ? `Papierkorb gespeichert; andere Datei konnte nicht geöffnet werden: ${openError}` : `In den Papierkorb verschoben: ${item.path}`);
    } finally {
      if (isCurrentContext(context)) setEditorReadOnly(activeDeleted ? !activeFileLoaded : previousReadOnly);
      trashOperation = false;
    }
  }

  async function restoreProjectItem(entry) {
    if (trashOperation || commitRequest || newTexFileRequest || repositoryLoading) throw new Error('Eine andere Projektaktion läuft bereits.');
    const context = projectContext();
    trashOperation = true;
    let openError;
    let cleanupError;
    try {
      const entries = readTrash(context);
      const current = entries.find((candidate) => candidate.path === entry.path);
      if (!current) throw new Error('Der Eintrag befindet sich nicht mehr im Papierkorb.');
      if (current.committedSha) throw new Error('Der Eintrag wurde bereits ins Repository gespeichert und kann nicht mehr wiederhergestellt werden.');
      if (sidebarItems.some((item) => item.path === current.path || item.path.startsWith(`${current.path}/`))) {
        throw new Error('An diesem Pfad existiert bereits ein Eintrag.');
      }
      for (const item of current.items.filter((candidate) => candidate.snapshotLocation)) {
        const snapshot = await readTrashSnapshot(context, item);
        const existing = await readTrashOriginal(context, item);
        if (existing && !sameStoredFile(existing, snapshot)) {
          throw new Error(`Die lokale Datei ${item.path} wurde seit dem Löschen verändert. Wiederherstellen wurde abgebrochen.`);
        }
        if (!existing) await storeFile(snapshot);
      }
      const project = readProjectCatalog().find((item) => item.id === context.repo);
      await storeProject({
        ...project, id: context.repo, repo: context.repo, branch: context.branch,
        paths: [...new Set([...(project?.branch === context.branch ? project.paths || [] : []),
          ...current.items.filter((item) => item.type === 'blob').map((item) => item.path)])],
        updatedAt: Date.now()
      });
      if (!isCurrentContext(context)) throw new Error('Das Projekt hat sich geändert.');
      writeTrash(context, entries.filter((candidate) => candidate.path !== current.path));
      try {
        for (const item of current.items.filter((candidate) => candidate.snapshotLocation)) await removeTrashSnapshot(context, item);
      } catch (error) {
        cleanupError = error.message;
        logActivity('Wiederhergestellt; eine Papierkorbkopie konnte nicht bereinigt werden.');
      }
      for (const item of current.items) {
        if (!sidebarItems.some((existing) => existing.path === item.path)) sidebarItems.push(item);
      }
      renderSidebar();
      if (!activeFileLoaded) {
        const next = current.items.find((item) => item.type === 'blob' && item.mode !== '120000' && TEX_FILE.test(item.path));
        if (next) {
          try {
            await selectFile(next.path);
            setEditorReadOnly(false);
          } catch (error) {
            openError = error.message;
            logActivity('Wiederhergestellte Datei konnte nicht geöffnet werden.');
          }
        }
      }
      await refreshMainFiles();
      saveViewState();
      requestCompile('save', context);
      logActivity('Eintrag aus dem Papierkorb wiederhergestellt.');
      setStatus(openError ? `Wiederhergestellt; Datei konnte nicht geöffnet werden: ${openError}` :
        cleanupError ? `Wiederhergestellt; Papierkorbkopie konnte nicht bereinigt werden: ${cleanupError}` : `Wiederhergestellt: ${entry.path}`);
    } finally {
      trashOperation = false;
    }
  }

  function renderSidebar() {
    cancelLongPress();
    closeFileContextMenu();
    const tree = renderFileTree(sidebarItems);
    fileList.replaceChildren(tree);
    updateActiveFileButton();
    applyChangeMarkers();
    renderTrash();
    updateChangeState();
  }

  function validateTree(items) {
    const directories = new Set(['', ...items.filter((item) => item.type === 'tree').map((item) => item.path)]);
    for (const item of items) {
      if (!['tree', 'blob', 'commit'].includes(item.type)) continue;
      const parts = item.path.split('/');
      parts.pop();
      if (!directories.has(parts.join('/'))) throw new Error('GitHub lieferte eine unvollständige Ordnerstruktur.');
    }
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
    placeLoginButton(false);
    document.getElementById('main-container').hidden = false;
    sidebarToggle.hidden = false;
    dashboardButton.hidden = false;
    projectSettingsButton.hidden = false;
    saveButton.hidden = false;
    previewButton.hidden = false;
    sidebarToggle.disabled = false;
    updateChangeState();
    saveViewState();
  }

  function saveViewState() {
    try {
      sessionStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
        repo: repoName || 'local', branch: branchName, path: activePath,
        hasFile: activeFileLoaded, preview: previewVisible()
      }));
    } catch (error) {
      logActivity('Aktuelle Ansicht konnte nicht für das Neuladen gespeichert werden.');
      setStatus(`Ansicht konnte nicht gespeichert werden: ${error.message}`);
    }
  }

  async function restoreViewState() {
    let view;
    try {
      const saved = sessionStorage.getItem(VIEW_STATE_KEY);
      if (!saved) return;
      view = JSON.parse(saved);
      if (!view || typeof view.repo !== 'string' || !view.repo ||
          typeof view.branch !== 'string' || !view.branch || !isSafeProjectPath(view.path) ||
          typeof view.hasFile !== 'boolean' || typeof view.preview !== 'boolean') {
        throw new Error('Gespeicherte Ansicht ist ungültig.');
      }
      const catalogProject = readProjectCatalog().find((project) => project.id === view.repo);
      let storedProject;
      try { storedProject = await readRecord('projects', view.repo); }
      catch (error) { logActivity('Projektmetadaten für die Wiederherstellung konnten nicht aus IndexedDB gelesen werden.'); }
      const project = storedProject || catalogProject;
      if (!project || (view.hasFile && !(await readStoredFile(view.repo, view.branch, view.path)))) {
        throw new Error('Das zuletzt geöffnete Projekt oder die Datei ist lokal nicht verfügbar.');
      }
      activeFileLoaded = false;
      await openLocalProject({
        ...project, repo: view.repo, branch: view.branch, activePath: view.path,
        paths: project.branch === view.branch ? [...new Set([...(project.paths || []), view.path])] : [view.path]
      });
      if (view.preview) {
        previewContainer.classList.add('visible');
        updatePreviewResizer();
        saveViewState();
        requestCompile('preview');
      }
      logActivity('Letzte Ansicht lokal wiederhergestellt.');
    } catch (error) {
      logActivity('Letzte Ansicht konnte nicht lokal wiederhergestellt werden.');
      const message = `Ansicht konnte nicht wiederhergestellt werden: ${error.message}`;
      setStatus(message);
      return message;
    }
  }

  let newItemContext;
  function openNewTexFileDialog(folder) {
    if (trashOperation || commitRequest) {
      setStatus('Eine andere Projektaktion läuft bereits.');
      return;
    }
    const option = document.createElement('option');
    option.value = folder;
    option.textContent = folder || 'Projektordner-Wurzel';
    newTexFileFolder.replaceChildren(option);
    newTexFileFolder.value = folder;
    newTexFileKind.value = 'file';
    newItemContext = projectContext();
    newTexFileName.value = '';
    newTexFileError.textContent = '';
    if (!newTexFileDialog.open) newTexFileDialog.showModal();
  }

  const newTexFileSubmit = document.getElementById('new-tex-file-submit');
  const newTexFileCancel = document.getElementById('new-tex-file-cancel');
  newTexFileCancel.addEventListener('click', () => {
    if (!newTexFileRequest) {
      logActivity('Anlegen einer Datei oder eines Ordners abgebrochen.');
      newTexFileDialog.close();
    }
  });
  newTexFileDialog.addEventListener('cancel', (event) => {
    if (newTexFileRequest) event.preventDefault();
    else logActivity('Anlegen einer Datei oder eines Ordners abgebrochen.');
  });
  newTexFileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (newTexFileRequest || trashOperation || commitRequest) return;
    const fileName = newTexFileName.value.trim();
    const folder = newTexFileFolder.value;
    const isFolder = newTexFileKind.value === 'folder';
    const stem = fileName.slice(0, fileName.lastIndexOf('.'));
    if (!newItemContext || !isCurrentContext(newItemContext)) {
      newTexFileError.textContent = 'Das Projekt hat sich geändert. Bitte den Dialog erneut öffnen.';
      logActivity('Anlegen abgebrochen: Projektkontext geändert.');
      return;
    }
    if (!fileName || fileName.length > 255 || /[\/\\\u0000-\u001f\u007f]/.test(fileName) ||
      ['.', '..', '.git', '.latex-ipad', '.gitkeep'].includes(fileName) ||
      (!isFolder && (!stem || !TEX_FILE.test(fileName)))) {
      newTexFileError.textContent = isFolder ? 'Bitte einen gültigen einzelnen Ordnernamen eingeben.' : 'Bitte einen gültigen Dateinamen mit .tex, .latex oder .ltx eingeben.';
      logActivity('Anlegen fehlgeschlagen: ungültiger Name.');
      return;
    }
    if (folder && !sidebarItems.some((item) => item.type === 'tree' && item.path === folder)) {
      newTexFileError.textContent = 'Der ausgewählte Projektordner ist nicht mehr verfügbar.';
      logActivity('Anlegen fehlgeschlagen: Zielordner nicht verfügbar.');
      return;
    }
    const path = folder ? `${folder}/${fileName}` : fileName;
    if (!isSafeProjectPath(path) || sidebarItems.some((item) => item.path === path)) {
      newTexFileError.textContent = 'Unter diesem Pfad existiert bereits eine Datei oder der Pfad ist ungültig.';
      logActivity('Anlegen fehlgeschlagen: Pfad ungültig oder vorhanden.');
      return;
    }
    const context = projectContext();
    newTexFileRequest = true;
    newTexFileSubmit.disabled = true;
    newTexFileCancel.disabled = true;
    let previousReadOnly = textarea.readOnly;
    if (!isFolder) {
      textarea.readOnly = true;
      if (monacoEditor) monacoEditor.updateOptions({ readOnly: true });
    }
    try {
      if (readTrash(context).some((entry) => path === entry.path || path.startsWith(`${entry.path}/`) || entry.path.startsWith(`${path}/`))) {
        throw new Error('Dieser Pfad ist im Papierkorb belegt. Bitte zuerst wiederherstellen oder ins Repository speichern.');
      }
      if (!isFolder && activeFileLoaded) {
        clearTimeout(saveTimer);
        await persistCurrentFile();
      }
      if (!isCurrentContext(context)) throw new Error('Das Projekt hat sich während des Anlegens geändert.');
      const storedPath = isFolder ? `${path}/.gitkeep` : path;
      const existing = await readStoredFile(context.repo, context.branch, storedPath);
      if (existing) {
        newTexFileError.textContent = 'Unter diesem Pfad existiert bereits eine lokal gespeicherte Datei.';
        logActivity('Anlegen fehlgeschlagen: lokale Datei vorhanden.');
        return;
      }
      const record = {
        id: fileId(context.repo, context.branch, storedPath),
        repo: context.repo,
        branch: context.branch,
        path: storedPath,
        content: '',
        baseContent: '',
        isNewFile: true,
        updatedAt: Date.now()
      };
      await storeFile(record);
      const project = readProjectCatalog().find((item) => item.id === context.repo);
      await storeProject({
        ...project,
        id: context.repo,
        repo: context.repo,
        branch: context.branch,
        activePath: isFolder ? activePath : path,
        paths: [...new Set([...(project?.branch === context.branch ? project.paths || [] : []), storedPath])],
        updatedAt: record.updatedAt
      });
      if (!isCurrentContext(context)) return;
      if (isFolder) {
        sidebarItems = [...sidebarItems, { type: 'tree', path }, { type: 'blob', path: storedPath, mode: '100644', size: 0 }];
      } else {
        sidebarItems = [...sidebarItems, { type: 'blob', path, mode: '100644', size: 0 }];
        activePath = path;
        activeFileLoaded = true;
        setEditorValue('');
        previousReadOnly = false;
      }
      collapsedFolders.delete(folder);
      saveViewState();
      renderSidebar();
      await refreshMainFiles();
      newTexFileDialog.close();
      logActivity(isFolder ? 'Neuer Ordner lokal angelegt.' : 'Neue TeX-Datei lokal angelegt.');
      setStatus(`${isFolder ? 'Neuer Ordner' : 'Neue TeX-Datei'} lokal angelegt: ${path}`);
    } catch (error) {
      logActivity('Datei oder Ordner konnte nicht lokal angelegt werden.');
      newTexFileError.textContent = `Eintrag konnte nicht angelegt werden: ${error.message}`;
    } finally {
      if (!isFolder) {
        textarea.readOnly = previousReadOnly;
        if (monacoEditor) monacoEditor.updateOptions({ readOnly: previousReadOnly });
      }
      newTexFileRequest = false;
      newTexFileSubmit.disabled = false;
      newTexFileCancel.disabled = false;
    }
  });

  async function refreshDashboard() {
    dashboardList.replaceChildren();
    try {
      let projects = [];
      let files = [];
      try { projects = await readAllRecords('projects'); }
      catch (error) {
        logActivity('IndexedDB-Projekte konnten nicht gelesen werden; lokale Projektübersicht wird verwendet.');
        setStatus(`IndexedDB-Projekte konnten nicht gelesen werden: ${error.message}`);
      }
      try { files = await readAllRecords('files'); }
      catch (error) {
        logActivity('IndexedDB-Dateien konnten nicht gelesen werden; lokale Projektübersicht wird verwendet.');
        setStatus(`IndexedDB-Dateien konnten nicht gelesen werden; localStorage-Projekte werden angezeigt: ${error.message}`);
      }
      const catalog = readProjectCatalog();
      const merged = new Map(catalog.map((project) => [project.id, project]));
      projects.forEach((project) => merged.set(project.id, { ...merged.get(project.id), ...project }));
      files.forEach((file) => {
        if (file.original) return;
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
        const fileCount = (project.paths || []).filter((path) => path !== PROJECT_SETTINGS_PATH).length;
        metadata.textContent = `${project.branch || 'main'} · ${fileCount} lokal gespeicherte ${fileCount === 1 ? 'Datei' : 'Dateien'}`;
        const open = document.createElement('button');
        open.type = 'button';
        open.textContent = 'Lokal öffnen';
        setButtonIcon(open, 'folder-blank', `Lokal öffnen: ${title.textContent}`);
        open.addEventListener('click', () => openLocalProject(project).catch((error) => {
          logActivity('Lokales Projekt konnte nicht geöffnet werden.');
          setStatus(`Lokales Projekt konnte nicht geöffnet werden: ${error.message}`);
          showError(error.message);
        }));
        details.append(title, metadata);
        card.append(details, open);
        dashboardList.appendChild(card);
      }
    } catch (error) {
      logActivity('Lokale Projektübersicht konnte nicht geladen werden.');
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
    const nextContext = { repo: nextRepo || 'local', branch: nextBranch };
    const needsTrashCleanup = readTrash(nextContext).some((entry) => entry.committedSha);
    await finalizeCommittedTrash(nextContext);
    if (needsTrashCleanup) project = readProjectCatalog().find((item) => item.id === nextContext.repo) || project;
    let records = [];
    try { records = await readAllRecords('files'); }
    catch (error) {
      logActivity('IndexedDB-Dateien konnten nicht gelesen werden; lokale Kopien aus localStorage werden verwendet.');
      setStatus(`IndexedDB nicht verfügbar; lokale Kopien aus localStorage werden verwendet: ${error.message}`);
    }
    const trash = readTrash({ repo: nextRepo || 'local', branch: nextBranch });
    const localRecords = records.filter((record) => record.repo === (nextRepo || 'local') &&
      record.branch === nextBranch && !pathInTrash(record.path, trash));
    const paths = [...new Set([...(project.paths || []), ...localRecords.map((record) => record.path)])]
      .filter((path) => !pathInTrash(path, trash)).sort();
    repoName = nextRepo;
    branchName = nextBranch;
    activePath = project.activePath && TEX_FILE.test(project.activePath) && paths.includes(project.activePath)
      ? project.activePath : paths.includes('main.tex') ? 'main.tex' : paths.find((path) => TEX_FILE.test(path)) || 'main.tex';
    sidebarItems = localTreeItems(paths);
    collapsedFolders.clear();
    renderSidebar();
    branchSelect.replaceChildren();
    const option = document.createElement('option');
    option.value = branchName;
    option.textContent = branchName;
    branchSelect.appendChild(option);
    branchSelect.value = branchName;
    branchSelect.disabled = true;
    branchSelector.hidden = true;
    updateProjectProperties();
    localStorage.setItem('gh_current_repo', repoName);
    localStorage.setItem('gh_current_branch', branchName);
    const record = localRecords.find((file) => file.path === activePath);
    const fallback = pathInTrash(activePath, trash) ? null : localStorage.getItem(`latex_ipad_document:${repoName || 'local'}:${branchName}:${activePath}`);
    const content = record?.content ?? fallback;
    activeFileLoaded = content !== null && content !== undefined;
    setEditorReadOnly(!activeFileLoaded && trash.length > 0 && !paths.some((path) => TEX_FILE.test(path)));
    setEditorValue(content ?? (textarea.readOnly ? '' : DEFAULT_DOCUMENT));
    updateActiveFileButton();
    refreshMainFiles();
    showEditor();
    logActivity('Lokales Projekt aus der Übersicht geöffnet.');
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
    if (signal?.aborted) { logActivity('Dateiauswahl abgebrochen.'); return; }
    const repo = repoName || 'local';
    let saved;
    try { saved = await readStoredFile(repo, branchName, path); }
    catch (error) { throw new Error(`Lokaler Inhalt konnte nicht geladen werden: ${error.message}`); }
    const fallback = localStorage.getItem(`latex_ipad_document:${repo}:${branchName}:${path}`);
    if (signal?.aborted) { logActivity('Dateiauswahl abgebrochen.'); return; }
    let content = saved?.content ?? fallback;
    if (content === null || content === undefined) {
      if (!repoName || !token || !navigator.onLine) {
        throw new Error('Für diese Datei ist keine lokale Kopie verfügbar. Zum ersten Laden bitte online mit GitHub verbinden.');
      }
      const currentToken = token;
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const response = await githubApi(`/repos/${repoName.split('/').map(encodeURIComponent).join('/')}/contents/${encodedPath}?ref=${encodeURIComponent(branchName)}`, 'application/vnd.github.raw', signal);
      content = await response.text();
      if (token !== currentToken || signal?.aborted) {
        logActivity(signal?.aborted ? 'Dateiauswahl abgebrochen.' : 'Dateiauswahl verworfen: GitHub-Anmeldung geändert.');
        return;
      }
      if (isGitLfsPointer(content)) throw new Error(`Git-LFS-Datei wird nicht unterstützt: ${path}`);
    }
    activePath = path;
    activeFileLoaded = true;
    setEditorReadOnly(false);
    setEditorValue(content);
    updateActiveFileButton();
    await storeFile({
      ...(saved || {}),
      id: fileId(repo, branchName, path),
      repo,
      branch: branchName,
      path,
      content,
      baseContent: saved?.baseContent ?? content,
      remoteSha: saved?.remoteSha,
      updatedAt: Date.now()
    });
    updateChangeState();
    saveViewState();
    setStatus(`Datei geladen: ${path}`);
    logActivity('Datei im Editor geöffnet.');
  }

  function isGitLfsPointer(content) {
    return content.startsWith('version https://git-lfs.github.com/spec/v1');
  }

  // Nicht als UTF-8-Text lesbare Dateien (Grafiken, PDFs) werden byteweise gespeichert, damit die Kompilierung sie unverändert erhält.
  async function readRemoteFile(response) {
    if (typeof response.arrayBuffer !== 'function') return { text: await response.text() };
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.subarray(0, 8000).includes(0)) return { bytes };
    try { return { text: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) }; }
    catch (error) { return { bytes }; }
  }

  async function downloadRepositoryFiles(repo, branch, tree, signal) {
    const trash = readTrash({ repo, branch });
    const files = tree.filter((item) => item.type === 'blob');
    const unsupportedPaths = new Set();
    const unsupported = tree
      .filter((item) => item.type === 'commit' || item.mode === '160000')
      .map((item) => {
        unsupportedPaths.add(item.path);
        return `${item.path} (Git-Submodule)`;
      });
    const symlinks = tree.filter((item) => item.type === 'blob' && item.mode === '120000');
    unsupported.push(...symlinks.map((item) => {
      unsupportedPaths.add(item.path);
      return `${item.path} (symbolischer Link)`;
    }));
    const regularFiles = files.filter((item) => item.mode !== '120000');
    const tooLarge = regularFiles.filter((item) => Number.isFinite(item.size) && item.size > 100 * 1024 * 1024);
    unsupported.push(...tooLarge.map((item) => {
      unsupportedPaths.add(item.path);
      return `${item.path} (größer als 100 MB)`;
    }));
    const downloadable = regularFiles.filter((item) => !Number.isFinite(item.size) || item.size <= 100 * 1024 * 1024);
    const localRecords = await readAllRecords('files').catch((error) => {
      setStatus(`IndexedDB-Dateien konnten nicht gelesen werden; localStorage-Fallback wird geprüft: ${error.message}`);
      return [];
    });
    const localByPath = new Map(localRecords
      .filter((record) => record.repo === repo && record.branch === branch && !pathInTrash(record.path, trash))
      .map((record) => [record.path, record]));
    const project = await readRecord('projects', repo).catch(() =>
      readProjectCatalog().find((item) => item.id === repo) || null
    );
    for (const path of project?.branch === branch ? project.paths || [] : []) {
      if (pathInTrash(path, trash)) continue;
      if (!localByPath.has(path)) {
        const fallback = await readStoredFile(repo, branch, path);
        if (fallback) localByPath.set(path, fallback);
      }
    }
    for (const item of downloadable) {
      if (!localByPath.has(item.path)) {
        const fallback = await readStoredFile(repo, branch, item.path);
        if (fallback) localByPath.set(item.path, fallback);
      }
    }

    const downloaded = [];
    let nextIndex = 0;
    let downloadedCount = 0;
    const worker = async () => {
      while (nextIndex < downloadable.length) {
        if (signal?.aborted) throw new Error('Anfrage abgebrochen.');
        const item = downloadable[nextIndex];
        nextIndex += 1;
        const encodedPath = item.path.split('/').map(encodeURIComponent).join('/');
        const response = await githubApi(
          `/repos/${repo.split('/').map(encodeURIComponent).join('/')}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
          'application/vnd.github.raw',
          signal
        );
        const { text: remoteContent, bytes: remoteBytes } = await readRemoteFile(response);
        if (remoteBytes) {
          downloaded.push({ item, remoteBytes });
        } else if (isGitLfsPointer(remoteContent)) {
          unsupportedPaths.add(item.path);
          unsupported.push(`${item.path} (Git LFS)`);
        } else {
          downloaded.push({ item, remoteContent });
        }
        downloadedCount += 1;
        setStatus(`Repository wird lokal geladen: ${downloadedCount}/${downloadable.length} Dateien`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, downloadable.length) }, worker));
    if (signal?.aborted) throw new Error('Anfrage abgebrochen.');
    for (const path of unsupportedPaths) {
      await removeStoredFile(repo, branch, path);
      localByPath.delete(path);
    }
    const prepared = [];
    const manualConflicts = [];
    const localOnly = [];
    for (const { item, remoteContent, remoteBytes } of downloaded) {
      if (remoteBytes) {
        prepared.push({
          id: fileId(repo, branch, item.path),
          repo,
          branch,
          path: item.path,
          content: '',
          binary: true,
          data: remoteBytes,
          remoteSha: item.sha,
          updatedAt: Date.now()
        });
        continue;
      }
      const local = localByPath.get(item.path);
      let content = remoteContent;
      const localChanged = local && (local.baseContent === undefined
        ? local.content !== remoteContent
        : local.content !== local.baseContent);
      const remoteUnchanged = local && (
        (local.baseContent !== undefined && local.baseContent === remoteContent) ||
        (local.remoteSha && local.remoteSha === item.sha)
      );
      if (local && local.content !== remoteContent && !localChanged) {
        content = remoteContent;
      } else if (local && local.content !== remoteContent && localChanged && !remoteUnchanged) {
        const choice = await askConflictChoice(item.path, local.content, remoteContent, signal);
        if (!choice) throw new Error('Repository-Öffnen wegen eines nicht aufgelösten Konflikts abgebrochen.');
        if (choice === 'local') content = local.content;
        else if (choice === 'merge') {
          const merged = mergeText(local.baseContent ?? remoteContent, local.content, remoteContent);
          content = merged.content;
          if (merged.conflicts) manualConflicts.push(item.path);
        }
      } else if (local && localChanged && remoteUnchanged) {
        content = local.content;
      }
      prepared.push({
        id: fileId(repo, branch, item.path),
        repo,
        branch,
        path: item.path,
        content,
        baseContent: remoteContent,
        remoteSha: item.sha,
        updatedAt: Date.now()
      });
    }
    const remotePaths = new Set(tree.filter((item) => item.type === 'blob' || item.type === 'commit').map((item) => item.path));
    for (const local of localByPath.values()) {
      if (remotePaths.has(local.path)) continue;
      const dirty = !local.binary && (local.isNewFile || local.baseContent === undefined || local.content !== local.baseContent);
      if (!dirty) {
        await removeStoredFile(repo, branch, local.path);
        continue;
      }
      if (local.isNewFile) {
        localOnly.push({ type: 'blob', path: local.path, mode: '100644' });
        prepared.push({
          ...local,
          id: fileId(repo, branch, local.path),
          repo,
          branch,
          baseContent: '',
          remoteSha: undefined,
          updatedAt: Date.now()
        });
        continue;
      }
      const choice = await askConflictChoice(local.path, local.content, '', signal);
      if (!choice) throw new Error('Repository-Öffnen wegen eines nicht aufgelösten Konflikts abgebrochen.');
      if (choice === 'remote') {
        await removeStoredFile(repo, branch, local.path);
        continue;
      }
      const merged = choice === 'merge'
        ? mergeText(local.baseContent ?? '', local.content, '')
        : { content: local.content, conflicts: false };
      if (merged.conflicts) manualConflicts.push(local.path);
      localOnly.push({ type: 'blob', path: local.path, mode: '100644' });
      prepared.push({
        ...local,
        id: fileId(repo, branch, local.path),
        repo,
        branch,
        content: merged.content,
        baseContent: '',
        remoteSha: undefined,
        isNewFile: true,
        updatedAt: Date.now()
      });
    }
    return { files: prepared, unsupported, manualConflicts, localOnly };
  }

  async function loadRepository(nextRepo = repoName, preferredBranch = branchName, signal) {
    if (!nextRepo || !token || repositoryLoading) return false;
    logActivity('Repository wird geöffnet: Branches und Dateibaum werden geladen.');
    repositoryLoading = true;
    branchSelect.disabled = true;
    const currentToken = token;
    try {
      const parts = nextRepo.split('/');
      if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Repo-Format muss owner/repo sein.');
      const [owner, name] = parts.map(encodeURIComponent);
      const base = `/repos/${owner}/${name}`;
      const branches = await githubPages(`${base}/branches?per_page=100`, signal);
      const selectedBranch = branches.find((branch) => branch.name === preferredBranch) || branches[0];
      const nextBranch = selectedBranch?.name;
      const remoteHeadSha = selectedBranch?.commit?.sha || '';
      let tree = [];
      if (nextBranch) {
        let treeRevision = encodeURIComponent(nextBranch);
        if (remoteHeadSha) {
          const commitResponse = await githubApi(`${base}/git/commits/${encodeURIComponent(remoteHeadSha)}`, 'application/vnd.github+json', signal);
          const commitData = await commitResponse.json();
          if (!commitData.tree?.sha) throw new Error('GitHub lieferte keinen Dateibaum für den aktuellen Branch-Stand.');
          treeRevision = encodeURIComponent(commitData.tree.sha);
        }
        const response = await githubApi(`${base}/git/trees/${treeRevision}?recursive=1`, 'application/vnd.github+json', signal);
        const data = await response.json();
        if (data.truncated || !Array.isArray(data.tree)) throw new Error('GitHub lieferte keinen vollständigen Repository-Baum.');
        tree = data.tree;
      }
      if (activeFileLoaded) {
        clearTimeout(saveTimer);
        await persistCurrentFile();
      }
      const targetBranch = nextBranch || preferredBranch || 'main';
      const targetContext = { repo: nextRepo, branch: targetBranch };
      await finalizeCommittedTrash(targetContext);
      const trash = readTrash(targetContext);
      const remoteItems = new Map(tree.map((item) => [item.path, item]));
      for (const entry of trash) {
        const deleted = new Map(entry.items.filter((item) => item.remoteSha).map((item) => [item.path, item.remoteSha]));
        for (const remote of tree.filter((item) => item.type !== 'tree' &&
          (item.path === entry.path || item.path.startsWith(`${entry.path}/`)))) {
          if (deleted.get(remote.path) !== remote.sha) {
            throw new Error(`Im Papierkorb gibt es einen neuen oder geänderten Remote-Eintrag unter ${entry.path}. Bitte den Eintrag wiederherstellen und den Konflikt prüfen.`);
          }
        }
        for (const item of entry.items.filter((candidate) => candidate.remoteSha)) {
          if (remoteItems.get(item.path)?.sha !== item.remoteSha) {
            throw new Error(`Der Remote-Stand von ${item.path} im Papierkorb hat sich geändert. Bitte den Eintrag wiederherstellen und den Konflikt prüfen.`);
          }
        }
      }
      tree = tree.filter((item) => !pathInTrash(item.path, trash));
      const settingsEntry = tree.find((item) => item.path === PROJECT_SETTINGS_PATH);
      if (settingsEntry && (settingsEntry.type !== 'blob' || settingsEntry.mode === '120000')) {
        throw new Error('Die versionierte Projekteinstellungsdatei wird als Symlink oder anderes nicht unterstütztes Objekt gespeichert.');
      }
      const localSettingsRecord = await readStoredFile(nextRepo, targetBranch, PROJECT_SETTINGS_PATH);
      const catalogProject = readProjectCatalog().find((item) => item.id === nextRepo);
      const hasLocalSettings = localStorage.getItem(projectSettingsKey(nextRepo)) !== null ||
        localStorage.getItem(mainFileKey(targetContext)) !== null || Boolean(catalogProject?.settings);
      if (settingsEntry && !localSettingsRecord && hasLocalSettings) {
        const settings = readProjectSettings(targetContext);
        await storeFile({
          id: fileId(nextRepo, targetBranch, PROJECT_SETTINGS_PATH),
          repo: nextRepo,
          branch: targetBranch,
          path: PROJECT_SETTINGS_PATH,
          content: serializeProjectSettings(settings),
          baseContent: '',
          isNewFile: true,
          updatedAt: Date.now()
        });
      }
      const { files, unsupported, manualConflicts, localOnly } = await downloadRepositoryFiles(nextRepo, targetBranch, tree, signal);
      logActivity(`Repository-Download abgeschlossen (${files.length} Dateien, ${unsupported.length} nicht unterstützte Einträge, ${manualConflicts.length} manuelle Konflikte).`);
      appendLocalPathsToTree(tree, localOnly);
      let settingsFile = files.find((file) => file.path === PROJECT_SETTINGS_PATH);
      let createdSettingsFile = false;
      if (!settingsFile) {
        const settings = readProjectSettings(targetContext);
        settingsFile = {
          id: fileId(nextRepo, targetBranch, PROJECT_SETTINGS_PATH),
          repo: nextRepo,
          branch: targetBranch,
          path: PROJECT_SETTINGS_PATH,
          content: serializeProjectSettings(settings),
          baseContent: '',
          isNewFile: true,
          updatedAt: Date.now()
        };
        files.push(settingsFile);
        createdSettingsFile = true;
        appendLocalPathsToTree(tree, [{ type: 'blob', path: PROJECT_SETTINGS_PATH, mode: '100644' }]);
      }
      const localSettingsBeforeRestore = readProjectSettings(targetContext);
      const branchSettings = parseProjectSettings(settingsFile.content);
      const restoredSettings = {
        ...branchSettings,
        mainFiles: { ...localSettingsBeforeRestore.mainFiles, ...branchSettings.mainFiles }
      };
      const availableMainFiles = files.filter((file) => !file.binary && TEX_FILE.test(file.path)).map((file) => file.path);
      const configuredMainFile = restoredSettings.mainFiles[targetBranch];
      const selectedMainFile = availableMainFiles.includes(configuredMainFile)
        ? configuredMainFile
        : availableMainFiles.includes('main.tex')
          ? 'main.tex'
          : availableMainFiles[0];
      if (selectedMainFile && configuredMainFile !== selectedMainFile) {
        restoredSettings.mainFiles[targetBranch] = selectedMainFile;
        settingsFile.content = serializeProjectSettings(restoredSettings);
      }
      if (createdSettingsFile) settingsFile.initialContent = settingsFile.content;
      localStorage.setItem(projectSettingsKey(nextRepo), JSON.stringify(restoredSettings));
      localStorage.removeItem(mainFileKey(targetContext));
      validateTree(tree);
      for (const record of files) await storeFile(record);
      if (token !== currentToken || signal?.aborted) {
        logActivity(signal?.aborted ? 'Repository-Öffnen abgebrochen.' : 'Repository-Öffnen verworfen: GitHub-Anmeldung geändert.');
        return false;
      }
      const sameContext = nextRepo === repoName && targetBranch === branchName;
      if (!sameContext) {
        textarea.readOnly = true;
        if (monacoEditor) monacoEditor.updateOptions({ readOnly: true });
        try {
          if (token !== currentToken || signal?.aborted) {
            logActivity(signal?.aborted ? 'Repository-Öffnen abgebrochen.' : 'Repository-Öffnen verworfen: GitHub-Anmeldung geändert.');
            return false;
          }
        } finally {
          textarea.readOnly = false;
          if (monacoEditor) monacoEditor.updateOptions({ readOnly: false });
        }
      }
      repoName = nextRepo;
      branchName = targetBranch;
      const targetFiles = new Map(files.map((file) => [file.path, file]));
      const availablePaths = [...targetFiles.keys()];
      activePath = sameContext && targetFiles.has(activePath)
        ? activePath
        : availablePaths.includes('main.tex')
          ? 'main.tex'
          : availablePaths.find((path) => /\.(tex|latex|ltx)$/i.test(path)) || 'main.tex';
      const activeFile = targetFiles.get(activePath);
      activeFileLoaded = Boolean(activeFile);
      setEditorReadOnly(!activeFileLoaded && trash.length > 0 && !availablePaths.some((path) => TEX_FILE.test(path)));
      setEditorValue(activeFile?.content ?? (textarea.readOnly ? '' : DEFAULT_DOCUMENT));
      localStorage.setItem('gh_current_repo', repoName);
      localStorage.setItem('gh_current_branch', branchName);
      updateProjectProperties();
      branchSelect.replaceChildren(...branches.map((branch) => {
        const option = document.createElement('option'); option.value = branch.name; option.textContent = branch.name; return option;
      }));
      branchSelect.value = nextBranch || '';
      branchSelector.hidden = branches.length <= 1;
      sidebarItems = tree;
      if (!sameContext) collapsedFolders.clear();
      renderSidebar();
      await refreshMainFiles();
      if (dashboard.hidden) saveViewState();
      try {
        await storeProject({
          id: repoName,
          repo: repoName,
          branch: branchName,
          activePath,
          paths: availablePaths,
          remoteHeadShas: {
            ...(catalogProject?.remoteHeadShas || {}),
            [targetBranch]: remoteHeadSha
          },
          settings: restoredSettings,
          updatedAt: Date.now()
        });
      }
      catch (error) {
        logActivity('Repository geladen; lokale Projektmetadaten konnten nicht gespeichert werden.');
        setStatus(`Repo geladen; Projektmetadaten konnten nicht gespeichert werden: ${error.message}`); return true;
      }
      const unsupportedMessage = unsupported.length
        ? ` Nicht offline verfügbar: ${unsupported.join(', ')}.`
        : '';
      const manualMergeMessage = manualConflicts.length
        ? ` Merge-Konflikt in ${manualConflicts.join(', ')}: Konfliktmarkierungen im Editor manuell bearbeiten.`
        : '';
      setStatus(`Repo geladen und lokal gespeichert: ${repoName}${nextBranch ? ` (${branchName})` : ''}.${unsupportedMessage}${manualMergeMessage}`);
      logActivity('Repository lokal gespeichert und im Editor geöffnet.');
      return true;
    } catch (error) {
      logActivity(signal?.aborted ? 'Repository-Öffnen abgebrochen.' : 'Repository-Öffnen fehlgeschlagen; Einzelheiten in der Oberfläche.');
      throw error;
    } finally {
      repositoryLoading = false;
      branchSelect.disabled = false;
    }
  }

  function requestGitHubLogin(action) {
    pendingGitHubAction = action;
    loginError.textContent = '';
    if (!loginDialog.open) loginDialog.showModal();
    logActivity('GitHub-Anmeldedialog für angeforderte Aktion geöffnet.');
  }

  function openCreateRepository() {
    if (!token) {
      requestGitHubLogin('create-repository');
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
    const label = pendingRepoCreation?.name === createRepoName.value.trim()
      ? pendingRepoCreation.initialized ? 'Repository erneut öffnen' : 'Initialisierung fortsetzen'
      : 'Privates Repository erstellen';
    createRepoSubmit.textContent = label;
    setButtonIcon(createRepoSubmit, pendingRepoCreation?.name === createRepoName.value.trim() ? 'refresh' : 'add', label);
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
    if (!token) { requestGitHubLogin('repositories'); return; }
    if (!navigator.onLine) {
      logActivity('Repository-Auswahl nicht gestartet: offline.');
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
    logActivity('Repository-Auswahl wird geladen.');
    try {
      const repositories = await githubPages('/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=full_name', controller.signal);
      if (controller.signal.aborted) { logActivity('Repository-Auswahl abgebrochen.'); return; }
      const countText = repositories.length === 1 ? '1 verfügbares Repository.' : `${repositories.length} verfügbare Repositories.`;
      logActivity(`Repository-Auswahl geladen (${repositories.length} verfügbar).`);
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
        button.title = `${permission.label}: ${repo.full_name}`;
        button.addEventListener('click', async () => {
          if (repositoryLoading) return;
          logActivity('Repository in der Auswahl angefordert.');
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
      logActivity(controller.signal.aborted ? 'Repository-Auswahl abgebrochen.' : 'Repository-Auswahl konnte nicht geladen werden.');
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
      sessionStorage.removeItem('gh_token'); token = ''; updateLoginButton();
      logActivity('GitHub-Abmeldung abgeschlossen.');
      setStatus('Von GitHub abgemeldet.'); return;
    }
    requestGitHubLogin('repositories');
  });
  document.getElementById('github-login-cancel').addEventListener('click', () => loginDialog.close());
  loginDialog.addEventListener('close', () => {
    if (loginRequest) loginRequest.abort();
    loginRequest = undefined;
    loginSubmit.disabled = false;
    loginForm.reset();
    loginError.textContent = '';
    if (!token) pendingGitHubAction = 'repositories';
  });
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (loginRequest) return;
    const candidate = tokenInput.value.trim();
    if (!/^github_pat_[A-Za-z0-9_]+$/.test(candidate)) {
      logActivity('GitHub-Anmeldung abgelehnt: Tokenformat ungültig.');
      loginError.textContent = 'Bitte ein Fine-grained Personal Access Token eingeben, kein GitHub-Passwort.';
      return;
    }
    const controller = new AbortController();
    loginRequest = controller;
    loginSubmit.disabled = true;
    loginError.textContent = '';
    logActivity('GitHub-Anmeldung wird geprüft.');
    try {
      let response;
      try {
        response = await fetch('https://api.github.com/user', {
          headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${candidate}`, 'X-GitHub-Api-Version': '2022-11-28' },
          signal: controller.signal
        });
      } catch (error) {
        if (controller.signal.aborted) { logActivity('GitHub-Anmeldung abgebrochen.'); return; }
        throw new Error('GitHub ist nicht erreichbar. Bitte Internetverbindung prüfen und erneut versuchen.');
      }
      if (controller.signal.aborted) { logActivity('GitHub-Anmeldung abgebrochen.'); return; }
      if (response.status === 401) throw new Error('GitHub hat das Token abgelehnt. Bitte Gültigkeit und Ablaufdatum prüfen.');
      if (!response.ok) throw new Error(`GitHub konnte das Token nicht prüfen (HTTP ${response.status}). Bitte später erneut versuchen.`);
      sessionStorage.setItem('gh_token', candidate);
      token = candidate;
      logActivity('GitHub-Anmeldung erfolgreich.');
      updateLoginButton();
      const requestedAction = pendingGitHubAction;
      loginDialog.close();
      setStatus('Mit GitHub verbunden.');
      pendingGitHubAction = 'repositories';
      if (requestedAction === 'create-repository') openCreateRepository();
      else if (requestedAction === 'commit') openCommitDialog();
      else await showRepositories();
    } catch (error) {
      logActivity(controller.signal.aborted ? 'GitHub-Anmeldung abgebrochen.' : 'GitHub-Anmeldung fehlgeschlagen; Einzelheiten im Anmeldedialog.');
      if (!controller.signal.aborted) loginError.textContent = error.message;
    } finally {
      if (loginRequest === controller) {
        loginRequest = undefined;
        loginSubmit.disabled = false;
      }
    }
  });
  document.getElementById('dashboard-open-repo').addEventListener('click', showRepositories);
  document.getElementById('dashboard-create-repo').addEventListener('click', openCreateRepository);
  document.getElementById('repo-create').addEventListener('click', openCreateRepository);
  repoRetry.addEventListener('click', showRepositories);
  projectRepoLink.addEventListener('click', () => logActivity('Repository-Link in den Projekteigenschaften geöffnet.'));
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
  projectSettingsButton.addEventListener('click', () => projectSettingsDialog.showModal());
  projectSettingsClose.addEventListener('click', () => projectSettingsDialog.close());
  dashboardButton.addEventListener('click', async () => {
    try {
      if (activeFileLoaded) {
        clearTimeout(saveTimer);
        await persistCurrentFile();
      }
      document.getElementById('main-container').hidden = true;
      dashboard.hidden = false;
      placeLoginButton(true);
      sidebarToggle.hidden = true;
      dashboardButton.hidden = true;
      projectSettingsButton.hidden = true;
      saveButton.hidden = true;
      previewButton.hidden = true;
      previewContainer.classList.remove('visible');
      updatePreviewResizer();
      clearPdfPreview();
      try { sessionStorage.removeItem(VIEW_STATE_KEY); }
      catch (error) {
        logActivity('Gespeicherte Ansicht konnte nicht gelöscht werden.');
        setStatus(`Ansicht konnte nicht zurückgesetzt werden: ${error.message}`);
      }
      if (projectSettingsDialog.open) projectSettingsDialog.close();
      sidebarToggle.disabled = true;
      await refreshDashboard();
      logActivity('Zur Projektübersicht gewechselt.');
    } catch (error) {
      logActivity('Wechsel zur Projektübersicht fehlgeschlagen.');
      setStatus(`Änderungen konnten vor dem Wechsel zur Übersicht nicht gespeichert werden: ${error.message}`);
    }
  });
  window.addEventListener('online', () => setStatus('Internetverbindung verfügbar. Lokales Arbeiten bleibt aktiv.'));
  window.addEventListener('offline', () => setStatus('Offline-Modus: lokale Dateien bleiben verfügbar.'));

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      logActivity('Service Worker wird von diesem Browser nicht unterstützt.');
      setStatus('Service Worker wird von diesem Browser nicht unterstützt.');
      return;
    }
    try {
      await navigator.serviceWorker.register('./sw.js');
    } catch (error) {
      logActivity('Service Worker konnte nicht registriert werden.');
      setStatus(`Service Worker konnte nicht registriert werden: ${error.message}`);
    }
  }

  async function initialize() {
    try {
      placeLoginButton(!dashboard.hidden);
      clearLegacyOAuthCallback();
      const saved = await readRecord('files', fileId(repoName || 'local', branchName, activePath)).catch(() => {
        logActivity('Lokale Datei konnte nicht aus IndexedDB gelesen werden; localStorage-Fallback wird verwendet.');
        return null;
      });
      const fallback = localStorage.getItem(`latex_ipad_document:${repoName || 'local'}:${branchName}:${activePath}`) ?? (!repoName ? localStorage.getItem('latex_ipad_document') : null);
      textarea.value = saved?.content ?? fallback ?? DEFAULT_DOCUMENT;
      activeFileLoaded = saved?.content !== undefined && saved?.content !== null || fallback !== null;
      startLintWorker();
      scheduleLint();
      refreshMainFiles();
      await refreshDashboard();
      const restoreError = await restoreViewState();
      await loadMonaco();
      await registerServiceWorker();
      updateProjectProperties();
      branchSelect.value = branchName;
      placeLoginButton(!dashboard.hidden);
      setStatus(restoreError || (navigator.onLine ? 'Editor bereit. Änderungen werden lokal automatisch gespeichert.' : 'Offline-Modus: lokale Bearbeitung ist aktiv.'));
    } catch (error) {
      logActivity('App-Initialisierung fehlgeschlagen.');
      setStatus(`App-Fehler: ${error.message}`);
      showError(error.message);
    }
  }

  initialize();
})();
