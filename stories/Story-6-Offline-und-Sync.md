# Story 6: Offline-Fähigkeit, lokale Speicherung & Sync-Queue

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Offline-Nutzung über Service-Worker-Caching und lokale Speicherung unterstützen und eine lokale Sync-Queue ergänzen.

## Teilschritte
- [x] Service Worker für Asset-Caching — laut bisheriger Dokumentation werden Kern-Assets (`index.html`, `manifest.json`, `app.js`) gecacht. **Umgesetzt**
- [x] Lokales Auto-Save in IndexedDB. **Umgesetzt**
- [ ] Online-Sync-Workflow mit KI-generierten Commit-Messages. **Ausstehend**

> Hinweis: Die ursprüngliche Story erwähnte `sw_js.md`; die konkrete Asset-Caching-Implementierung sollte bei Gelegenheit im Code überprüft werden.
