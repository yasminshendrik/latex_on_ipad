# Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Sichere Anbindung an GitHub via OAuth2 und Synchronisation von Repositories über die GitHub Contents- und Git Data-API.

## Technische Komponenten
OAuth2-Flow im Browser; `sessionStorage` für das Token-Handling; GitHub Tree- und Datei-API.

## Teilschritte
- [x] **1.1 OAuth-Flow & Token-Handling** — ein Token wird kurzzeitig im `sessionStorage` verwaltet. **Umgesetzt**
- [x] **1.2 Dateien und Baumstruktur abrufen** — Git-Trees und Rohdateien über die GitHub API werden geladen. **Umgesetzt**
- [ ] **1.3 Commit- & Push-Funktion via API** — geänderte Dateien an GitHub senden. **Ausstehend**

## Anmerkung
Der aktuelle Stand zeigt die API-Anbindung für lesen, aber noch keinen sicheren OAuth-Token-Austausch gegen ein echtes Access Token über einen Server- oder Backend-Flow. Das ist für einen abgeschlossenen Auth-Status noch nicht ausreichend.
