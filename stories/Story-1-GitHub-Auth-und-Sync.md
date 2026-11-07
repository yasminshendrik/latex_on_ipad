# Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Browser-basierte GitHub-Anbindung mit GitHub App + OAuth PKCE und Synchronisation von Repositories über die GitHub Contents- und Git Data-API.

## Technische Komponenten
GitHub App mit PKCE; `sessionStorage` für die Session-Daten (`code_verifier`, `state`, Zugriffstoken); GitHub Tree-/File-API.

## Teilschritte
- [x] **1.1 PKCE-Flow im Browser** — Code-Verifier und Code-Challenge werden im Browser erzeugt und beim Redirect validiert. **Im Code umgesetzt**
- [x] **1.2 Token-Austausch über GitHub Token-Endpoint** — der Authorization Code wird gegen ein Access Token ausgetauscht. **Im Code umgesetzt; nicht Ende-zu-Ende verifiziert**
- [x] **1.3 Dateien und Baumstruktur abrufen** — Git-Trees und Rohdateien über die GitHub API werden geladen. **Im Code umgesetzt**
- [ ] **1.4 Commit- & Push-Funktion via API** — echte GitHub-Uploads bleiben offen. **Ausstehend**

## Einrichtung und Einschränkungen
Für den Login muss eine GitHub App registriert sein. Die Client-ID in `js/app.js` ist nun gesetzt. Das Client Secret bleibt nicht im Frontend und wird nicht verwendet. Die App erwartet den Callback exakt auf `https://yasminshendrik.github.io/latex_on_ipad/`.

Gegenüber der früheren App-Variante wurde der `scope`-Parameter entfernt, weil GitHub App-Berechtigungen über die App-Konfiguration und Installationsrechte verwaltet werden. Das Access Token bleibt im `sessionStorage` der App; es ist damit nach wie vor für JavaScript in derselben Origin zugänglich. Die App bleibt lokal offline-fähig, remote GitHub-Interaktionen erfordern eine aktive Internetverbindung.

## Device-Flow-Experiment
- [x] Experimenteller Login über den GitHub-App Device Flow — der GitHub-Login-Button fordert einen Device Code an, zeigt den User Code und pollt auf die Nutzerbestätigung. **Im Code umgesetzt; Browser-CORS und erfolgreicher Ende-zu-Ende-Login noch nicht verifiziert.**
- Die Geräte- und Nutzercodes werden nicht ins technische Log geschrieben; das Zugriffstoken wird nur in `sessionStorage` abgelegt.
- Der Flow setzt voraus, dass Device Flow in den Einstellungen der verwendeten GitHub App aktiviert ist. Die direkte Erreichbarkeit der GitHub Device-Flow-Endpunkte aus Safari muss praktisch getestet werden.
