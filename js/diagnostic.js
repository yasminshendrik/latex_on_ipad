'use strict';
(() => {
  const STORAGE_KEY = 'latex_pwa_diagnostic_log';
  const MAX_ENTRIES = 60;
  const entries = [];
  let compilerText = '';
  let activeTab = 'general';
  let panel;
  let list;
  let compilerPanel;
  let generalTab;
  let compilerTab;
  let messageNode;
  let copyButton;
  let copyFeedbackTimer;

  function loadEntries() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) entries.push(...saved.filter((entry) =>
        typeof entry === 'string' || (entry && typeof entry.text === 'string' && entry.compiler === true)
      ).slice(-MAX_ENTRIES));
    } catch (_) { /* Keep diagnostics available in memory if storage is unavailable. */ }
  }
  function render() {
    if (!list) return;
    const rows = entries.length ? entries.map((entry) => {
      const row = document.createElement('div');
      row.className = 'technical-log-entry';
      if (typeof entry === 'string') row.textContent = entry;
      else {
        const link = document.createElement('button');
        link.type = 'button'; link.className = 'technical-log-link'; link.textContent = entry.text;
        link.addEventListener('click', () => selectTab('compiler'));
        row.appendChild(link);
      }
      return row;
    }) : [(() => { const empty = document.createElement('div'); empty.className = 'technical-log-entry technical-log-empty'; empty.textContent = 'Leeres Protokoll.'; return empty; })()];
    list.replaceChildren(...rows); list.scrollTop = list.scrollHeight;
  }
  function log(message, options) {
    const text = `${new Date().toLocaleTimeString()}  ${message}`;
    entries.push(options?.compiler ? { text, compiler: true } : text);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch (_) { /* Keep the visible in-memory log. */ }
    render();
  }
  function setMessage(message) { if (messageNode) messageNode.textContent = message; }
  function resetCopyButton() {
    if (copyFeedbackTimer) clearTimeout(copyFeedbackTimer);
    copyFeedbackTimer = undefined;
    if (!copyButton) return;
    copyButton.setAttribute('data-icon', '▣');
    copyButton.setAttribute('aria-label', 'Aktuelles Protokoll kopieren');
    copyButton.title = 'Aktuelles Protokoll kopieren';
  }
  function selectTab(tab) {
    activeTab = tab;
    generalTab.setAttribute('aria-selected', String(tab === 'general'));
    compilerTab.setAttribute('aria-selected', String(tab === 'compiler'));
    generalTab.tabIndex = tab === 'general' ? 0 : -1;
    compilerTab.tabIndex = tab === 'compiler' ? 0 : -1;
    list.hidden = tab !== 'general';
    compilerPanel.hidden = tab !== 'compiler';
    setMessage('');
  }
  function setCompilerLog(text) {
    compilerText = text;
    if (compilerPanel) compilerPanel.textContent = text || 'Leeres Compiler-Protokoll.';
  }
  function clearEntries() {
    if (activeTab === 'compiler') setCompilerLog('');
    else {
      entries.length = 0;
      try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) { /* Storage unavailable. */ }
    }
    render(); setMessage('');
  }
  async function copyAll() {
    resetCopyButton();
    const text = activeTab === 'compiler' ? compilerText : entries.map((entry) => typeof entry === 'string' ? entry : entry.text).join('\n');
    if (!text) { setMessage('Kein Inhalt zum Kopieren.'); return; }
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const temporary = document.createElement('textarea'); temporary.value = text; temporary.setAttribute('readonly', '');
        temporary.style.position = 'fixed'; temporary.style.opacity = '0'; document.body.appendChild(temporary); temporary.select();
        const copied = document.execCommand('copy'); temporary.remove();
        if (!copied) throw new Error('Kopieren wird von diesem Browser nicht unterstützt.');
      }
      setMessage('');
      copyButton.setAttribute('data-icon', '✓');
      copyButton.setAttribute('aria-label', 'Protokoll kopiert');
      copyButton.title = 'Protokoll kopiert';
      copyFeedbackTimer = setTimeout(resetCopyButton, 1500);
    } catch (error) { setMessage(`Kopieren fehlgeschlagen: ${error.message || 'Zwischenablage nicht verfügbar.'}`); }
  }
  function addPanel() {
    if (panel || !document.body) return;
    const style = document.createElement('style');
    style.textContent = `
      #technical-log { flex: 0 0 150px; min-height: 100px; display: flex; flex-direction: column; border-top: 1px solid #666; background: #151515; color: #d8d8d8; font: 12px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; }
      #technical-log[hidden] { display: none; }
      #technical-log-heading { flex: 0 0 auto; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 5px 10px; color: #9cdcfe; background: #252526; font: 600 12px -apple-system, BlinkMacSystemFont, sans-serif; }
      #technical-log-title { flex: 1 1 180px; }
      #technical-log button { min-height: 30px; padding: 4px 9px; font-size: 12px; }
      #technical-log button[data-icon] { width: 36px; min-width: 36px; padding: 4px; font-size: 0; }
      #technical-log-tabs { display: flex; gap: 4px; }
      #technical-log-tabs [aria-selected="true"] { border-bottom: 2px solid #9cdcfe; }
      #technical-log .technical-log-link { min-height: 0; padding: 0; border: 0; background: none; color: #9cdcfe; text-align: left; text-decoration: underline; font: inherit; }
      #technical-log .technical-log-link::before { content: '↗'; margin-right: 5px; }
      #technical-log-message { flex: 0 1 auto; color: #b7e3ff; font-weight: normal; }
      #technical-log-entries, #compiler-log-entries { min-height: 0; overflow: auto; padding: 4px 10px; overflow-wrap: anywhere; }
      #compiler-log-entries { white-space: pre-wrap; }
      #technical-log-entries[hidden], #compiler-log-entries[hidden] { display: none; }
      .technical-log-entry { padding: 1px 0; }
      .technical-log-empty { color: #9aa0a6; }
      @media (max-height: 600px) { #technical-log { flex-basis: 110px; min-height: 85px; } }
    `;
    document.head.appendChild(style);
    panel = document.createElement('section'); panel.id = 'technical-log'; panel.setAttribute('aria-label', 'Technisches Diagnoseprotokoll');
    panel.hidden = true;
    const heading = document.createElement('div'); heading.id = 'technical-log-heading';
    const title = document.createElement('span'); title.id = 'technical-log-title'; title.textContent = 'Protokoll';
    const tabs = document.createElement('div'); tabs.id = 'technical-log-tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Protokoll auswählen');
    generalTab = document.createElement('button'); generalTab.type = 'button'; generalTab.id = 'general-log-tab'; generalTab.textContent = 'Allgemein'; generalTab.setAttribute('data-icon', '≡'); generalTab.setAttribute('aria-label', 'Allgemeines Protokoll'); generalTab.title = 'Allgemeines Protokoll'; generalTab.setAttribute('role', 'tab'); generalTab.setAttribute('aria-controls', 'technical-log-entries');
    compilerTab = document.createElement('button'); compilerTab.type = 'button'; compilerTab.id = 'compiler-log-tab'; compilerTab.textContent = 'Compiler'; compilerTab.setAttribute('data-icon', '▤'); compilerTab.setAttribute('aria-label', 'Compiler-Protokoll'); compilerTab.title = 'Compiler-Protokoll'; compilerTab.setAttribute('role', 'tab'); compilerTab.setAttribute('aria-controls', 'compiler-log-entries');
    generalTab.addEventListener('click', () => selectTab('general'));
    compilerTab.addEventListener('click', () => selectTab('compiler'));
    for (const tab of [generalTab, compilerTab]) tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const next = activeTab === 'general' ? 'compiler' : 'general';
      selectTab(next);
      (next === 'general' ? generalTab : compilerTab).focus();
    });
    tabs.append(generalTab, compilerTab);
    const clearButton = document.createElement('button'); clearButton.type = 'button'; clearButton.textContent = 'Leeren'; clearButton.setAttribute('data-icon', '⌫'); clearButton.setAttribute('aria-label', 'Aktuelles Protokoll leeren'); clearButton.title = 'Aktuelles Protokoll leeren'; clearButton.addEventListener('click', clearEntries);
    copyButton = document.createElement('button'); copyButton.type = 'button'; copyButton.textContent = 'Alles kopieren'; copyButton.setAttribute('data-icon', '▣'); copyButton.setAttribute('aria-label', 'Aktuelles Protokoll kopieren'); copyButton.title = 'Aktuelles Protokoll kopieren'; copyButton.setAttribute('aria-live', 'polite'); copyButton.setAttribute('aria-atomic', 'true'); copyButton.addEventListener('click', copyAll);
    messageNode = document.createElement('span'); messageNode.id = 'technical-log-message'; messageNode.setAttribute('role', 'status');
    heading.append(title, tabs, clearButton, copyButton, messageNode);
    list = document.createElement('div'); list.id = 'technical-log-entries'; list.setAttribute('role', 'tabpanel'); list.setAttribute('aria-labelledby', 'general-log-tab'); list.setAttribute('aria-live', 'polite');
    compilerPanel = document.createElement('div'); compilerPanel.id = 'compiler-log-entries'; compilerPanel.setAttribute('role', 'tabpanel'); compilerPanel.setAttribute('aria-labelledby', 'compiler-log-tab'); compilerPanel.setAttribute('aria-live', 'polite');
    panel.append(heading, list, compilerPanel);
    setCompilerLog(compilerText); selectTab('general');
    const toggleButton = document.getElementById('toggle-log');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        panel.hidden = !panel.hidden;
        toggleButton.setAttribute('aria-expanded', String(!panel.hidden));
      });
    }
    const footer = document.querySelector('footer'); document.body.insertBefore(panel, footer || null); render();
  }
  loadEntries();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addPanel, { once: true }); else addPanel();
  window.__technicalLog = log;
  window.__setCompilerLog = setCompilerLog;
  log('Diagnoseprotokoll gestartet.');
  const buildSha = typeof window.APP_BUILD_SHA === 'string' && /^[0-9a-f]{40}$/i.test(window.APP_BUILD_SHA) ? window.APP_BUILD_SHA : '';
  log(`Startup-Version: ${buildSha || 'NICHT VERFÜGBAR (Build-SHA fehlt oder Platzhalter nicht ersetzt)'}.`);
  log(buildSha ? `Erwarteter Service-Worker-Cache: latex-pwa-${buildSha}.` : 'Erwarteter Service-Worker-Cache: nicht bestimmbar.');

  document.addEventListener('click', (event) => { if (event.target && event.target.closest && event.target.closest('#gh-login-btn')) log('GitHub-Login-Schaltfläche betätigt.'); }, true);

  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function (input, init) {
      let requestUrl; let method;
      try { requestUrl = new URL(typeof input === 'string' ? input : input.url, window.location.href); method = (init && init.method) || (typeof input !== 'string' && input.method) || 'GET'; }
      catch (_) { log('Netzwerkanfrage gestartet (Ziel konnte nicht klassifiziert werden).'); return originalFetch.apply(this, arguments); }
      let label = 'externe Anfrage';
      if (requestUrl.hostname === 'api.github.com') {
        if (requestUrl.pathname === '/user') label = 'GitHub API: Token-Prüfung';
        else if (/\/branches\/?$/.test(requestUrl.pathname)) label = 'GitHub API: Branch-Liste';
        else if (requestUrl.pathname.includes('/git/trees/')) label = 'GitHub API: Repository-Baum';
        else if (requestUrl.pathname.includes('/contents/')) label = 'GitHub API: Dateiinhalte';
        else label = 'GitHub API';
      }
      log(`${label}: ${String(method).toUpperCase()} gestartet.`);
      return originalFetch.apply(this, arguments).then((response) => { log(`${label}: HTTP ${response.status}${response.ok ? ' (erfolgreich)' : ' (Fehlerantwort)'}.`); return response; }, (error) => {
        const name = error && error.name ? error.name : 'Netzwerkfehler'; const message = error && error.message === 'Load failed' ? 'Load failed' : 'Details aus Sicherheitsgründen nicht ausgegeben';
        log(`${label}: Anfrage ohne HTTP-Antwort fehlgeschlagen (${name}; ${message}; mögliches Netzwerk-, CORS- oder Browser-Blockierungsproblem).`); throw error;
      });
    };
  }
  const observeAppError = () => {
    const footer = document.querySelector('footer'); if (!footer || typeof MutationObserver === 'undefined') return;
    new MutationObserver(() => { if (footer.textContent.startsWith('App-Fehler:')) log('App-Initialisierung mit Fehler abgebrochen; vorherige Protokolleinträge zeigen den letzten OAuth-/API-Schritt.'); }).observe(footer, { childList: true, characterData: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observeAppError, { once: true }); else observeAppError();

})();
