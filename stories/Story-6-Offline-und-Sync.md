# Story 6: Offline-Fähigkeit, lokale Speicherung & Sync-Queue

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Offline-Nutzung über Service-Worker-Caching und lokale Speicherung unterstützen; Remote-Sync bleibt weiterhin online-abhängig.

## Teilschritte
- [x] Service Worker für Asset-Caching registriert und aktiviert. **Umgesetzt**
- [x] Lokales Auto-Save in IndexedDB. **Umgesetzt**
- [ ] Online-Sync-Workflow mit KI-generierten Commit-Messages. **Ausstehend**

## Anmerkung
Die App kann lokal im Browser arbeiten und den Arbeitsstand in IndexedDB speichern. GitHub-Sync und Uploads erfordern eine aktive Internetverbindung, da die GitHub-API dafür offline nicht erreichbar ist.
