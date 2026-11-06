# Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Sichere Anbindung an GitHub via OAuth2 und Synchronisation von Repositories über die GitHub Contents- und Git Data-API.

## Technische Komponenten
Browser-basierte GitHub-API-Anbindung; `sessionStorage` für die vorübergehende Token-Speicherung; Tree-/File-Downloads.

## Teilschritte
- [x] **1.1 Token-Handling im Session-Kontext** — ein Token wird kurzfristig im `sessionStorage` verwaltet. **Umgesetzt**
- [x] **1.2 Dateien und Baumstruktur abrufen** — Git-Trees und Rohdateien über die GitHub API werden geladen. **Umgesetzt**
- [ ] **1.3 sicherer OAuth-Token-Austausch und Commit-/Push-Funktion via API** — ein echter Backend-/Server-Flow ist noch nicht umgesetzt. **Ausstehend**

## Anmerkung
Der aktuelle Stand ermöglicht das Lesen von Repository-Dateien und das Arbeiten mit Branches, aber kein sicherer OAuth-Token-Austausch und keine echte Push-/Commit-Funktion im Browser allein.
