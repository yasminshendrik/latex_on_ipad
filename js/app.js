(() => {
  'use strict';

  const DB_NAME = 'LaTeXPWA_VFS';
  const DB_VERSION = 1;
  const DEFAULT_DOCUMENT = '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nBitte mit GitHub verbinden, um zu starten!\n\\end{document}';
  const MONACO_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs';
  const PERIODIC_SAVE_MS = 3 * 60 * 1000;
  const COMPILE_TIMEOUT_MS = 3 * 60 * 1000;
  const TEX_FILE = /\.(tex|latex|ltx)$/i;
  const logActivity = (message) => {
    if (typeof window.__technicalLog === 'function') window.__technicalLog(message);
  };
  const SCRIPT_URL = document.currentScript?.src || new URL('./js/app.js', location.href).href;

  const textarea = document.getElementById('editor');
  const monacoHost = document.getElementById('monaco-editor');
  const lintResults = document.getElementById('lint-results');
  const compileSummary = document.getElementById('compile-summary');
  const compileResults = document.getElementById('compile-results');
  const mainFileSelect = document.getElementById('main-file-select');
  const previewStatus = document.getElementById('preview-status');
  const pdfPages = document.getElementById('pdf-pages');
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
  const conflictDialog = document.getElementById('sync-conflict-dialog');
  const conflictDescription = document.getElementById('sync-conflict-description');
  const conflictLocal = document.getElementById('sync-conflict-local');
  const conflictRemote = document.getElementById('sync-conflict-remote');
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
  let conflictResolver;
  let activeFileButtons = [];
  let activeFileLoaded = false;
  let suppressEditorChanges = false;
  let saveQueue = Promise.resolve();
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
  let pdfjsPromise;
  const pendingCompiles = new Map();
  const compiledSignatures = new Map();

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
    const { id, repo, branch, path, content, updatedAt, baseContent, remoteSha } = record;
    try {
      await storeRecord('files', record);
      return;
    } catch (error) {
      if (record.binary) {
        setStatus(`Binärdatei ${path} kann ohne IndexedDB nicht lokal gespeichert werden: ${error.message}`);
        return;
      }
      try {
        localStorage.setItem(`latex_ipad_document:${repo}:${branch}:${path}`, content);
        localStorage.setItem(fileMetadataKey(repo, branch, path), JSON.stringify({ baseContent, remoteSha }));
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

  async function storeProject(project) {
    try {
      await storeRecord('projects', project);
    } catch (error) {
      writeProjectCatalog(project);
      setStatus(`Projektmetadaten in localStorage gespeichert; IndexedDB nicht verfügbar: ${error.message}`);
      return;
    }
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
    scheduleLint();
    applyCompileMarkers();
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
  function normalizeDiagnosticFile(file) { return file ? String(file).replace(/^(\.\/)+/, '') : ''; }

  async function readProjectRecords(context) {
    try {
      return (await readAllRecords('files')).filter((record) => record.repo === context.repo && record.branch === context.branch);
    } catch (error) {
      const prefix = `latex_ipad_document:${context.repo}:${context.branch}:`;
      const records = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(prefix)) {
          records.push({ path: key.slice(prefix.length), content: localStorage.getItem(key) });
        }
      }
      return records;
    }
  }

  // Die Auswahl wird pro Projekt und Branch gemerkt; ohne Auswahl wird main.tex vorgeschlagen, sofern vorhanden.
  function updateMainFileOptions(context, records) {
    const paths = records.filter((record) => !record.binary && TEX_FILE.test(record.path)).map((record) => record.path).sort();
    const stored = localStorage.getItem(mainFileKey(context));
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
    }
    return selected;
  }

  async function refreshMainFiles() {
    const context = projectContext();
    if (compileDiagnosticsKey !== contextKey(context)) {
      pdfRenderId += 1;
      compileDiagnostics = [];
      compileSummary.textContent = 'Kompilierung noch nicht gelaufen.';
      compileResults.replaceChildren();
      previewStatus.textContent = 'Noch keine Vorschau.';
      pdfPages.replaceChildren();
      applyCompileMarkers();
    }
    try { updateMainFileOptions(context, await readProjectRecords(context)); }
    catch (error) { setStatus(`Hauptdateien konnten nicht ermittelt werden: ${error.message}`); }
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

  function projectSignature(main, files) {
    return `${main}|${Object.keys(files).sort().map((path) => `${path}:${files[path].length}:${hashBytes(files[path])}`).join('|')}`;
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

  function runTexWorker(entry, files) {
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
        worker.postMessage({ id, entry, files });
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

  function showCompileDiagnostics(main, result) {
    compileDiagnostics = result.diagnostics || [];
    const errors = compileDiagnostics.filter((item) => item.severity === 'error').length;
    const warnings = compileDiagnostics.filter((item) => item.severity === 'warning').length;
    const label = result.status === 'failed' ? 'fehlgeschlagen' : errors ? 'mit Fehlern' : warnings ? 'mit Warnungen' : 'ohne Beanstandung';
    compileSummary.textContent = `Kompilierung von ${main}: ${label} (${errors} Fehler, ${warnings} Warnungen).`;
    const entries = compileDiagnostics.filter((item) => item.severity !== 'info').slice(0, 50).map((item) => {
      const entry = document.createElement('li');
      const place = item.file ? `${normalizeDiagnosticFile(item.file)}${item.line ? `:${item.line}` : ''} – ` : '';
      entry.textContent = `${item.severity === 'error' ? 'Fehler' : 'Warnung'}: ${place}${item.message}`;
      return entry;
    });
    const children = [];
    if (result.status === 'failed' && result.message) {
      const message = document.createElement('p');
      message.textContent = result.message;
      children.push(message);
    }
    if (entries.length) {
      const list = document.createElement('ul');
      list.append(...entries);
      children.push(list);
    }
    compileResults.replaceChildren(...children);
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

  async function renderPdf(bytes) {
    const renderId = ++pdfRenderId;
    try {
      const library = await loadPdfjs();
      const loadingTask = library.getDocument({ data: bytes.slice(), isEvalSupported: false });
      const document_ = await loadingTask.promise;
      try {
        const width = Math.max(200, (pdfPages.clientWidth || 600) - 4);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvases = [];
        for (let number = 1; number <= document_.numPages; number += 1) {
          const page = await document_.getPage(number);
          if (renderId !== pdfRenderId) return;
          const scale = width / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale: scale * ratio });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${width}px`;
          canvas.setAttribute('aria-label', `Seite ${number}`);
          await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
          canvases.push(canvas);
        }
        if (renderId !== pdfRenderId) return;
        const previousScroll = document.getElementById('preview-container').scrollTop;
        pdfPages.replaceChildren(...canvases);
        document.getElementById('preview-container').scrollTop = previousScroll;
      } finally {
        loadingTask.destroy();
      }
    } catch (error) {
      if (renderId === pdfRenderId) previewStatus.textContent = `PDF konnte nicht dargestellt werden: ${error.message}`;
    }
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
      logActivity('Kompilierung nicht gestartet: Keine Hauptdatei ausgewählt.');
      compileSummary.textContent = 'Keine Hauptdatei: bitte main.tex anlegen oder eine Hauptdatei wählen.';
      compileResults.replaceChildren();
      compileDiagnostics = [];
      applyCompileMarkers();
      previewStatus.textContent = 'Keine Vorschau: Hauptdatei fehlt.';
      return;
    }
    const files = {};
    for (const record of records) files[record.path] = record.binary ? record.data : record.content ?? '';
    const key = contextKey(context);
    const signature = projectSignature(main, files);
    if (compiledSignatures.get(key) === signature && currentPdf && currentPdfContext === key) {
      logActivity('Kompilierung übersprungen: Vorschau ist aktuell.');
      if (reason === 'preview') {
        previewStatus.textContent = `Vorschau von ${main} (aktueller Stand).`;
        await renderPdf(currentPdf);
      }
      return;
    }
    compileSummary.textContent = `Kompilierung von ${main} läuft…`;
    previewStatus.textContent = `Kompilierung von ${main} läuft…`;
    logActivity(`Kompilierung gestartet (${records.length} Projektdateien).`);
    let result;
    try {
      result = await runTexWorker(main, files);
    } catch (error) {
      logActivity('Kompilierung abgebrochen: TeX-Worker oder Engine nicht verfügbar; Einzelheiten in der Kompilierungsanzeige.');
      if (!isCurrentContext(context)) return;
      compileSummary.textContent = `Kompilierung nicht möglich: ${error.message}`;
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
    logActivity(`Kompilierung ${result.pdf ? 'abgeschlossen' : 'ohne PDF beendet'} (${errors} Fehler, ${warnings} Warnungen).`);
    compiledSignatures.set(key, signature);
    showCompileDiagnostics(main, result);
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
          logActivity('Kompilierung abgebrochen: Projektdateien oder Vorschau konnten nicht verarbeitet werden.');
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
        setStatus(`Datei lokal gespeichert; Projektmetadaten konnten nicht gespeichert werden: ${error.message}`);
      }
      if (repo === 'local') {
        try { localStorage.setItem('latex_ipad_document', content); }
        catch (error) { setStatus(`IndexedDB gespeichert; zusätzliche localStorage-Kopie fehlgeschlagen: ${error.message}`); }
      }
      if (showSavedStatus) setStatus(`Lokal gespeichert: ${path}`);
      requestCompile('save', { repo, branch });
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

  setInterval(() => {
    if (!activeFileLoaded) return;
    persistCurrentFile().catch((error) => {
      setStatus(`Automatisches Speichern fehlgeschlagen: ${error.message}`);
      showError(error.message);
    });
  }, PERIODIC_SAVE_MS);

  textarea.addEventListener('input', () => {
    activeFileLoaded = true;
    scheduleAutoSave();
    scheduleLint();
  });
  document.getElementById('toggle-sidebar').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('collapsed'));
  document.getElementById('toggle-preview').addEventListener('click', () => {
    const container = document.getElementById('preview-container');
    container.classList.toggle('visible');
    if (!container.classList.contains('visible')) return;
    const context = projectContext();
    requestCompile('preview', context);
  });
  mainFileSelect.addEventListener('change', () => {
    localStorage.setItem(mainFileKey(projectContext()), mainFileSelect.value);
    requestCompile('main');
  });
  document.getElementById('save-btn').addEventListener('click', () =>
    persistCurrentFile(true).then(() => {
      if (repoName && token && navigator.onLine) {
        setStatus(`Lokal gespeichert: ${activePath}. GitHub-Commit ist noch nicht verfügbar.`);
      }
    }).catch((error) => showError(error.message))
  );

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
          scheduleLint();
        }
      });
      textarea.style.display = 'none';
      monacoHost.style.display = 'block';
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
    const directories = new Map([['', root]]);
    activeFileButtons = [];
    const sorted = items.filter((item) => item.type === 'tree' || item.type === 'blob' || item.type === 'commit')
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
        const supportedFile = item.type === 'blob' && item.mode !== '120000';
        const editable = supportedFile && (extension === 'tex' || extension === 'latex' || extension === 'ltx');
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
          const reason = item.type === 'commit' || item.mode === '160000'
            ? 'Git-Submodule nicht unterstützt'
            : item.mode === '120000'
              ? 'Symbolischer Link nicht unterstützt'
              : 'Nicht bearbeitbare Datei';
          label.setAttribute('aria-label', `${reason}: ${name}`);
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
    refreshMainFiles();
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
    let saved;
    try { saved = await readStoredFile(repoName, branchName, path); }
    catch (error) { throw new Error(`Lokaler Inhalt konnte nicht geladen werden: ${error.message}`); }
    const fallback = localStorage.getItem(`latex_ipad_document:${repoName}:${branchName}:${path}`);
    if (signal?.aborted) return;
    let content = saved?.content ?? fallback;
    if (content === null || content === undefined) {
      if (!token || !navigator.onLine) {
        throw new Error('Für diese Datei ist keine lokale Kopie verfügbar. Zum ersten Laden bitte online mit GitHub verbinden.');
      }
      const currentToken = token;
      const encodedPath = path.split('/').map(encodeURIComponent).join('/');
      const response = await githubApi(`/repos/${repoName.split('/').map(encodeURIComponent).join('/')}/contents/${encodedPath}?ref=${encodeURIComponent(branchName)}`, 'application/vnd.github.raw', signal);
      content = await response.text();
      if (token !== currentToken || signal?.aborted) return;
      if (isGitLfsPointer(content)) throw new Error(`Git-LFS-Datei wird nicht unterstützt: ${path}`);
    }
    activePath = path;
    activeFileLoaded = true;
    setEditorValue(content);
    updateActiveFileButton();
    await storeFile({
      ...(saved || {}),
      id: fileId(repoName, branchName, path),
      repo: repoName,
      branch: branchName,
      path,
      content,
      baseContent: saved?.baseContent ?? content,
      remoteSha: saved?.remoteSha,
      updatedAt: Date.now()
    });
    setStatus(`Datei geladen: ${path}`);
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
      .filter((record) => record.repo === repo && record.branch === branch)
      .map((record) => [record.path, record]));
    const project = await readRecord('projects', repo).catch(() =>
      readProjectCatalog().find((item) => item.id === repo) || null
    );
    for (const path of project?.branch === branch ? project.paths || [] : []) {
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
      const dirty = !local.binary && (local.baseContent === undefined || local.content !== local.baseContent);
      if (!dirty) {
        await removeStoredFile(repo, branch, local.path);
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
      if (activeFileLoaded) {
        clearTimeout(saveTimer);
        await persistCurrentFile();
      }
      const { files, unsupported, manualConflicts, localOnly } = await downloadRepositoryFiles(nextRepo, nextBranch || preferredBranch || 'main', tree, signal);
      logActivity(`Repository-Download abgeschlossen (${files.length} Dateien, ${unsupported.length} nicht unterstützte Einträge, ${manualConflicts.length} manuelle Konflikte).`);
      for (const record of files) await storeFile(record);
      tree.push(...localOnly);
      const treeElement = renderFileTree(tree);
      if (token !== currentToken || signal?.aborted) return false;
      const targetBranch = nextBranch || preferredBranch || 'main';
      const sameContext = nextRepo === repoName && targetBranch === branchName;
      if (!sameContext) {
        textarea.readOnly = true;
        if (monacoEditor) monacoEditor.updateOptions({ readOnly: true });
        try {
          if (token !== currentToken || signal?.aborted) return false;
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
      setEditorValue(activeFile?.content ?? DEFAULT_DOCUMENT);
      activeFileLoaded = Boolean(activeFile);
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
      refreshMainFiles();
      try {
        await storeProject({
          id: repoName,
          repo: repoName,
          branch: branchName,
          activePath,
          paths: availablePaths,
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
    if (!token) { logActivity('Repository-Auswahl nicht gestartet: GitHub-Anmeldung fehlt.'); showError('Bitte zuerst über „GitHub Login“ verbinden.'); return; }
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
      if (controller.signal.aborted) return;
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
            logActivity(controller.signal.aborted ? 'Repository-Auswahl abgebrochen.' : 'Repository-Auswahl konnte nicht geladen werden.');
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
      logActivity('GitHub-Abmeldung abgeschlossen.');
      setStatus('Von GitHub abgemeldet.'); return;
    }
    loginError.textContent = '';
    logActivity('GitHub-Anmeldedialog geöffnet.');
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
        if (controller.signal.aborted) return;
        throw new Error('GitHub ist nicht erreichbar. Bitte Internetverbindung prüfen und erneut versuchen.');
      }
      if (controller.signal.aborted) return;
      if (response.status === 401) throw new Error('GitHub hat das Token abgelehnt. Bitte Gültigkeit und Ablaufdatum prüfen.');
      if (!response.ok) throw new Error(`GitHub konnte das Token nicht prüfen (HTTP ${response.status}). Bitte später erneut versuchen.`);
      sessionStorage.setItem('gh_token', candidate);
      token = candidate;
      logActivity('GitHub-Anmeldung erfolgreich.');
      loginButton.textContent = 'Verbunden'; loginButton.style.background = '#28a745';
      loginDialog.close();
      setStatus('Mit GitHub verbunden.');
      await showRepositories();
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
      startLintWorker();
      scheduleLint();
      refreshMainFiles();
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
