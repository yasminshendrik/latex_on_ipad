# Story 6: Offline-Fähigkeit, lokale Speicherung & Sync-Queue

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Offline-Nutzung über Service-Worker-Caching und lokale Speicherung unterstützen; Remote-Sync bleibt weiterhin online-abhängig.

## Teilschritte
- [x] Service Worker für Asset-Caching registriert und aktiviert. **Umgesetzt** — Registrierung erfolgt beim App-Start; `sw.js` cached die App-Shell und ersetzt beim Deployment den Cache-Namen durch die Commit-SHA.
- [x] Lokales Auto-Save in IndexedDB. **Umgesetzt** — Änderungen werden nach kurzer Inaktivität im VFS gespeichert; `localStorage` dient nur als Fallback.
- [ ] Online-Sync-Workflow mit KI-generierten Commit-Messages. **Ausstehend**

## Anmerkung
Die App kann lokal im Browser arbeiten und den Arbeitsstand in IndexedDB speichern. Service-Worker-Caching stellt die App-Shell offline bereit; Monaco wird online von einem CDN geladen und steht offline nicht zur Verfügung, dann ist der lokale Texteditor aktiv. GitHub-Login und Remote-Laden/-Speichern erfordern eine aktive Internetverbindung. GitHub-Uploads sind noch nicht implementiert.
