(() => {
  'use strict';

  const CLIENT_ID = 'Ov23likSsFVYCyWAjIWR';
  const REDIRECT_URI = 'https://yasminshendrik.github.io/latex_on_ipad/';
  const editor = document.getElementById('editor');
  const loginButton = document.getElementById('gh-login-btn');
  const repoLabel = document.getElementById('repo-label');
  const branchSelect = document.getElementById('branch-select');
  const fileList = document.getElementById('file-list');
  let repoName = localStorage.getItem('gh_current_repo') || '';
  let branchName = localStorage.getItem('gh_current_branch') || 'main';
  let token = sessionStorage.getItem('gh_token') || '';
  let activePath = 'main.tex';

  function showError(message) {
    alert(message);
  }

  function setStatus(message) {
    const footer = document.querySelector('footer');
    if (footer) footer.textContent = message;
  }

  document.getElementById('toggle-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });

  document.getElementById('toggle-preview').addEventListener('click', () => {
    document.getElementById('preview-container').classList.toggle('visible');
  });

  document.getElementById('save-btn').addEventListener('click', () => {
    try {
      localStorage.setItem('latex_ipad_document', editor.value);
      if (repoName) localStorage.setItem(`latex_ipad_document:${repoName}:${branchName}:${activePath}`, editor.value);
      setStatus(`Lokal gespeichert: ${activePath}`);
    } catch (error) {
      showError(`Speichern fehlgeschlagen: ${error.message}`);
    }
  });

  async function sha256Base64Url(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    let binary = '';
    new Uint8Array(digest).forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function randomValue() {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  async function startLogin() {
    if (!crypto.subtle || !crypto.getRandomValues) {
      showError('Für GitHub Login wird ein aktueller Browser mit sicherer HTTPS-Verbindung benötigt.');
      return;
    }
    const verifier = randomValue();
    const state = randomValue();
    sessionStorage.setItem('gh_pkce_verifier', verifier);
    sessionStorage.setItem('gh_oauth_state', state);
    const challenge = await sha256Base64Url(verifier);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
    window.location.assign(`https://github.com/login/oauth/authorize?${params}`);
  }

  async function handleOAuthCallback() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (params.get('error')) throw new Error(`GitHub-Anmeldung fehlgeschlagen: ${params.get('error_description') || params.get('error')}`);
    if (!code) return;

    const savedState = sessionStorage.getItem('gh_oauth_state');
    const verifier = sessionStorage.getItem('gh_pkce_verifier');
    if (!state || !savedState || state !== savedState || !verifier) throw new Error('OAuth-Prüfung fehlgeschlagen. Bitte erneut anmelden.');
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, code, code_verifier: verifier, redirect_uri: REDIRECT_URI })
    });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error(data.error_description || data.error || 'GitHub konnte kein Zugriffstoken ausstellen.');
    token = data.access_token;
    sessionStorage.setItem('gh_token', token);
    sessionStorage.removeItem('gh_pkce_verifier');
    sessionStorage.removeItem('gh_oauth_state');
    history.replaceState({}, document.title, location.pathname);
  }

  async function githubApi(path, accept = 'application/vnd.github+json') {
    const response = await fetch(`https://api.github.com${path}`, {
      headers: { Accept: accept, Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' }
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}: ${response.statusText}`);
    return response;
  }

  async function loadRepository() {
    if (!repoName || !token) return;
    const [owner, name] = repoName.split('/');
    if (!owner || !name) throw new Error('Repo-Format muss owner/repo sein.');
    fileList.textContent = 'Lade Repository…';
    const branchesResponse = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/branches`);
    const branches = await branchesResponse.json();
    branchSelect.replaceChildren(...branches.map((branch) => {
      const option = document.createElement('option');
      option.value = branch.name;
      option.textContent = branch.name;
      option.selected = branch.name === branchName;
      return option;
    }));
    const treeResponse = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/git/trees/${encodeURIComponent(branchName)}?recursive=1`);
    const tree = await treeResponse.json();
    fileList.replaceChildren();
    tree.tree.filter((item) => item.type === 'blob').forEach((item) => {
      const row = document.createElement('div');
      row.className = 'file-item';
      row.textContent = item.path;
      row.addEventListener('click', async () => {
        try {
          activePath = item.path;
          const localCopy = localStorage.getItem(`latex_ipad_document:${repoName}:${branchName}:${activePath}`);
          if (localCopy !== null) {
            editor.value = localCopy;
          } else {
            const contentResponse = await githubApi(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/contents/${item.path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branchName)}`, 'application/vnd.github.raw+json');
            editor.value = await contentResponse.text();
          }
          document.querySelectorAll('.file-item').forEach((element) => element.classList.remove('active'));
          row.classList.add('active');
          setStatus(`Datei geladen: ${activePath}`);
        } catch (error) { showError(error.message); }
      });
      fileList.appendChild(row);
    });
    setStatus(`Repo geladen: ${repoName} (${branchName})`);
  }

  loginButton.addEventListener('click', async () => {
    if (token) {
      sessionStorage.removeItem('gh_token');
      token = '';
      loginButton.textContent = 'GitHub Login';
      setStatus('Von GitHub abgemeldet.');
      return;
    }
    try { await startLogin(); } catch (error) { showError(error.message); }
  });

  repoLabel.addEventListener('click', async () => {
    const value = prompt('GitHub Repository angeben (Format: owner/repo):', repoName || 'owner/repo');
    if (!value) return;
    repoName = value.trim();
    localStorage.setItem('gh_current_repo', repoName);
    repoLabel.textContent = repoName;
    if (!token) {
      showError('Bitte zuerst über „GitHub Login“ verbinden.');
      return;
    }
    try { await loadRepository(); } catch (error) { fileList.textContent = error.message; }
  });

  branchSelect.addEventListener('change', async () => {
    branchName = branchSelect.value;
    localStorage.setItem('gh_current_branch', branchName);
    try { await loadRepository(); } catch (error) { fileList.textContent = error.message; }
  });

  async function initialize() {
    editor.value = localStorage.getItem('latex_ipad_document') || '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nBitte mit GitHub verbinden, um zu starten!\n\\end{document}';
    if (repoName) repoLabel.textContent = repoName;
    branchSelect.value = branchName;
    try {
      await handleOAuthCallback();
      if (token) {
        loginButton.textContent = 'Verbunden';
        loginButton.style.background = '#28a745';
        await loadRepository();
      }
      setStatus('TEST DEPLOY: Buttons aktiv – 2026-11-07');
    } catch (error) {
      setStatus(`App-Fehler: ${error.message}`);
      showError(error.message);
    }
  }

  initialize();
})();
