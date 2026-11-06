const DB_NAME = 'LaTeXPWA_VFS';
const DB_VERSION = 2;
const GITHUB_CLIENT_ID = 'Iv2li...';

function getVFSKey(path, repo = '', branch = '') {
    const repoId = repo || 'local';
    const branchId = branch || 'main';
    return `${repoId}::${branchId}::${path}`;
}

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (db.objectStoreNames.contains('files')) {
                db.deleteObjectStore('files');
            }
            if (db.objectStoreNames.contains('projects')) {
                db.deleteObjectStore('projects');
            }
            db.createObjectStore('files', { keyPath: 'id' });
            db.createObjectStore('projects', { keyPath: 'repo' });
        };
    });
}

async function saveFileToVFS(path, content, repo = localStorage.getItem('gh_current_repo') || '', branch = localStorage.getItem('gh_current_branch') || 'main') {
    const db = await openDB();
    const record = {
        id: getVFSKey(path, repo, branch),
        path,
        repo,
        branch,
        content,
        updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        const request = store.put(record);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadFileFromVFS(path, repo = localStorage.getItem('gh_current_repo') || '', branch = localStorage.getItem('gh_current_branch') || 'main') {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const key = getVFSKey(path, repo, branch);
        const request = store.get(key);

        request.onsuccess = () => {
            if (request.result) {
                resolve(request.result.content);
                return;
            }

            const legacyRequest = store.get(path);
            legacyRequest.onsuccess = () => resolve(legacyRequest.result ? legacyRequest.result.content : null);
            legacyRequest.onerror = () => reject(legacyRequest.error);
        };

        request.onerror = () => reject(request.error);
    });
}

async function fetchGitHubRepoTree(owner, repo, branch, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error(`GitHub Tree API Fehler: ${response.statusText}`);
    const data = await response.json();
    return data.tree.filter(item => item.type === 'blob');
}

async function fetchGitHubFileContent(fileUrl, token) {
    const response = await fetch(fileUrl, {
        headers: {
            'Accept': 'application/vnd.github.v3.raw',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error(`Fehler beim Laden der Datei: ${response.statusText}`);
    return await response.text();
}

async function fetchGitHubBranches(owner, repo, token) {
    const url = `https://api.github.com/repos/${owner}/${repo}/branches`;
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) throw new Error(`Fehler beim Laden der Branches: ${response.statusText}`);
    return await response.json();
}

require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min' }});

require(['vs/editor/editor.main'], async function() {
    let currentFilePath = 'main.tex';
    let currentRepo = localStorage.getItem('gh_current_repo') || '';
    let currentBranch = localStorage.getItem('gh_current_branch') || 'main';
    let accessToken = sessionStorage.getItem('gh_token');

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(() => {
            console.warn('Service Worker konnte nicht registriert werden.');
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    if (authCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
        accessToken = authCode;
        sessionStorage.setItem('gh_token', accessToken);
    }

    let initialContent = await loadFileFromVFS(currentFilePath, currentRepo, currentBranch);
    if (!initialContent) {
        initialContent = '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nBitte mit GitHub verbinden, um zu starten!\n\\end{document}';
        await saveFileToVFS(currentFilePath, initialContent, currentRepo, currentBranch);
    }

    const editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: initialContent,
        language: 'latex',
        theme: 'vs-dark',
        automaticLayout: true
    });

    let saveTimeout;
    const persistEditorContent = async () => {
        await saveFileToVFS(currentFilePath, editor.getValue(), currentRepo, currentBranch);
    };

    editor.onDidChangeModelContent(() => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            await persistEditorContent();
        }, 800);
    });

    const loginBtn = document.getElementById('gh-login-btn');
    const repoLabel = document.getElementById('repo-label');
    const branchSelect = document.getElementById('branch-select');

    if (accessToken) {
        loginBtn.textContent = 'Verbunden';
        loginBtn.style.background = '#28a745';
    }

    if (currentRepo) {
        repoLabel.textContent = currentRepo;
    }

    loginBtn.addEventListener('click', () => {
        if (accessToken) {
            sessionStorage.removeItem('gh_token');
            alert('Erfolgreich von GitHub abgemeldet.');
            window.location.reload();
        } else {
            triggerOAuthLogin();
        }
    });

    function triggerOAuthLogin() {
        const redirectUri = window.location.origin + window.location.pathname;
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
    }

    repoLabel.addEventListener('click', async () => {
        const repoInput = prompt('GitHub Repository angeben (Format: owner/repo):', currentRepo || 'user/repo');
        if (!repoInput) return;

        currentRepo = repoInput.trim();
        localStorage.setItem('gh_current_repo', currentRepo);
        repoLabel.textContent = currentRepo;

        if (!accessToken) {
            alert('Sicherheits-Check: Bitte melde dich bei GitHub an, um auf das Repository zuzugreifen.');
            triggerOAuthLogin();
            return;
        }

        await loadRepositoryWorkspace(currentRepo, currentBranch, accessToken);
    });

    branchSelect.addEventListener('change', async () => {
        if (!currentRepo || !accessToken) return;
        currentBranch = branchSelect.value;
        localStorage.setItem('gh_current_branch', currentBranch);
        await loadRepositoryWorkspace(currentRepo, currentBranch, accessToken);
    });

    async function loadRepositoryWorkspace(repoFullName, branch, token) {
        const [owner, repo] = repoFullName.split('/');
        if (!owner || !repo) {
            alert('Ungültiges Repo-Format. Nutze owner/repo');
            return;
        }

        const fileListEl = document.getElementById('file-list');
        fileListEl.innerHTML = '<div style="padding: 10px; color: #888;">Lade Repository &amp; Baum...</div>';

        try {
            const branches = await fetchGitHubBranches(owner, repo, token);
            branchSelect.innerHTML = '';
            branches.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b.name;
                opt.textContent = b.name;
                if (b.name === branch) opt.selected = true;
                branchSelect.appendChild(opt);
            });

            const tree = await fetchGitHubRepoTree(owner, repo, branch, token);
            fileListEl.innerHTML = '';

            tree.forEach(file => {
                const item = document.createElement('div');
                item.className = 'file-item';
                item.textContent = file.path;

                item.addEventListener('click', async () => {
                    document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
                    item.classList.add('active');
                    currentFilePath = file.path;

                    let content = await loadFileFromVFS(file.path, repoFullName, branch);
                    if (!content) {
                        content = await fetchGitHubFileContent(file.url, token);
                        await saveFileToVFS(file.path, content, repoFullName, branch);
                    }
                    editor.setValue(content);
                });

                fileListEl.appendChild(item);
            });
            alert(`Projekt "${repoFullName}" (Branch: ${branch}) erfolgreich geladen!`);
        } catch (err) {
            fileListEl.textContent = `Fehler: ${err.message}`;
        }
    }

    if (currentRepo && accessToken) {
        await loadRepositoryWorkspace(currentRepo, currentBranch, accessToken);
    } else if (currentRepo && !accessToken) {
        document.getElementById('file-list').innerHTML = '<div style="padding: 10px; color: #666; font-size: 12px;">Bitte verbinde dich mit GitHub, um fortzufahren.</div>';
    }

    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('collapsed');
    });

    const previewContainer = document.getElementById('preview-container');
    document.getElementById('toggle-preview').addEventListener('click', () => {
        previewContainer.classList.toggle('visible');
    });

    document.getElementById('save-btn').addEventListener('click', async () => {
        await persistEditorContent();
        alert(`Datei "${currentFilePath}" lokal in IndexedDB gespeichert!`);
    });
});
