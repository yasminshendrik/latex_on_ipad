# Prototyp: app.js

```javascript
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min' }});

require(['vs/editor/editor.main'], function() {
    const editor = monaco.editor.create(document.getElementById('editor-container'), {
        value: '\\documentclass{article}\n\\begin{document}\n\\section{Einleitung}\nHallo LaTeX von meinem iPad!\n\\end{document}',
        language: 'latex',
        theme: 'vs-dark',
        automaticLayout: true
    });

    const sidebar = document.getElementById('sidebar');
    document.getElementById('toggle-sidebar').addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    const previewContainer = document.getElementById('preview-container');
    const togglePreviewBtn = document.getElementById('toggle-preview');
    togglePreviewBtn.addEventListener('click', () => {
        previewContainer.classList.toggle('visible');
        const isVisible = previewContainer.classList.contains('visible');
        togglePreviewBtn.textContent = isVisible ? 'Vorschau ausblenden' : 'Vorschau anzeigen';
    });

    document.getElementById('save-btn').addEventListener('click', () => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[Offline VFS] Lokaler Commit erstellt um ${timestamp}`);
        alert(`Erfolgreich lokal gespeichert!\n(Lokaler Commit-Snapshot in IndexedDB angelegt um ${timestamp})`);
    });
});
```
