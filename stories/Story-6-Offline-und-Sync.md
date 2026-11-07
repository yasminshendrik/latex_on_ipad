# Story 6: Offline-Fähigkeit, lokale Speicherung & Sync-Queue

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Offline-Nutzung über Service-Worker-Caching und lokale Speicherung unterstützen; Remote-Sync bleibt weiterhin online-abhängig.

## Teilschritte
- [x] Service Worker für Asset-Caching registriert und aktiviert. **Umgesetzt** — Registrierung erfolgt beim App-Start; `sw.js` cached die App-Shell und ersetzt beim Deployment den Cache-Namen durch die Commit-SHA.
- [x] Lokales Auto-Save in IndexedDB. **Umgesetzt** — Änderungen werden nach kurzer Inaktivität und während der App-Ausführung zusätzlich alle drei Minuten im VFS gespeichert; `localStorage` dient nur als Fallback. Vollständiger Repository-Download und lokale Konfliktauflösung sind in [Story 6.1](Story-6.1-Einheitliches-Speichern.md) umgesetzt.
- [ ] Online-Sync-Workflow mit KI-generierten Commit-Messages. **Ausstehend**

## Deployment-Version im Diagnoseprotokoll
Die GitHub-Pages-Workflow-Datei ersetzt `__COMMIT_SHA__` in `sw.js` und `js/build-info.js` durch die SHA des deployten Commits. Das sichtbare Diagnoseprotokoll gibt die Build-SHA beim Start aus. Erst ein erfolgreicher Pages-Deploy enthält die ersetzte Versionskennung; die Live-Auslieferung muss separat kontrolliert werden.

OAuth-Rücksprung-URLs werden nicht im Service-Worker-Cache gespeichert. Beim Aktivieren werden alte App-Caches und gegebenenfalls bereits vorhandene OAuth-Rücksprung-Einträge im aktuellen App-Cache entfernt.

## Anmerkung
Die App kann lokal im Browser arbeiten und Änderungen nach kurzer Inaktivität sowie regelmäßig in IndexedDB speichern, solange die App nicht vom Browser oder Betriebssystem pausiert wird. Beim Öffnen eines GitHub-Repositorys werden unterstützte reguläre Dateien des ausgewählten Branches lokal gespeichert; Submodule, Symlinks, Git-LFS-Dateien und Dateien über 100 MB werden gemeldet und ausgelassen. Service-Worker-Caching stellt die App-Shell offline bereit; Monaco wird online von einem CDN geladen und steht offline nicht zur Verfügung, dann ist der lokale Texteditor aktiv. GitHub-Login und Remote-Laden erfordern eine aktive Internetverbindung. Der Online-Commit und Push über den einheitlichen Speichern-Button sind in [Story 1.8](Story-1.8-GitHub-Commit-und-Push.md) beschrieben und noch nicht implementiert.
