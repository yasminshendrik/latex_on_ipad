# Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Browser-basierte GitHub-Anbindung mit OAuth PKCE und Synchronisation von Repositories über die GitHub Contents- und Git Data-API.

## Technische Komponenten
GitHub OAuth App mit PKCE; `sessionStorage` für die verifizierte Session; GitHub Tree-/File-API.

## Teilschritte
- [x] **1.1 PKCE-Flow im Browser** — Code-Verifier und Code-Challenge werden im Browser erzeugt und beim Redirect validiert. **Umgesetzt**
- [x] **1.2 Token-Austausch über GitHub OAuth-Endpoint** — der Code wird gegen ein Access Token ausgetauscht. **Umgesetzt**
- [x] **1.3 Dateien und Baumstruktur abrufen** — Git-Trees und Rohdateien über die GitHub API werden geladen. **Umgesetzt**
- [ ] **1.4 Commit- & Push-Funktion via API** — echte GitHub-Uploads bleiben offen. **Ausstehend**

## Anmerkung
Der aktuelle Stand setzt auf `OAuth App + PKCE` in der statischen App. Dafür muss eine GitHub OAuth App registriert und die Client-ID in `js/app.js` gesetzt werden. Die App selbst bleibt offline-fähig für lokale Bearbeitung; GitHub-Sync und Uploads sind online-abhängig.
