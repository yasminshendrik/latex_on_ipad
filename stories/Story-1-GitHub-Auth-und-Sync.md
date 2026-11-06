# Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Sichere Anbindung an GitHub via OAuth2 und Synchronisation von Repositories über die GitHub Contents- und Git Data-API.

## Technische Komponenten
OAuth2 Authorization Code Flow; `sessionStorage` für Token-Handling.

## Teilschritte
- [x] **1.1 OAuth-Flow & Token-Handling** — Token verbleibt im `sessionStorage` und wird beim Schließen der Session gelöscht. **Umgesetzt**
- [x] **1.2 Dateien und Baumstruktur abrufen** — Git-Trees und Rohdateien über die GitHub API abrufen. **Umgesetzt**
- [ ] **1.3 Commit- & Push-Funktion via API** — Geänderte Dateien an GitHub zurückschreiben. **Ausstehend**
