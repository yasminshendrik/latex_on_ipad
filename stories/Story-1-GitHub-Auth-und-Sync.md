# Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation

**Gesamtstatus: Teilweise umgesetzt**

**Früherer GitHub-App-OAuth-Login: Won't do — vorerst nicht weiterverfolgt.** Er wurde durch den [PAT-Login in Story 1.6](Story-1.6-Fine-grained-PAT-Login.md) ersetzt und ist nicht mehr aktiv. Dieser Status betrifft nur den früheren Login, nicht den Repository-Abruf oder die weiterhin ausstehende Commit- und Push-Funktion. Die ursprünglichen Schritte bleiben zur Dokumentation der Historie erhalten.

## Ursprüngliches Ziel
Browser-basierte GitHub-Anbindung mit GitHub App + OAuth PKCE und Synchronisation von Repositories über die GitHub Contents- und Git Data-API.

## Ursprüngliche technische Komponenten
GitHub App mit PKCE; `sessionStorage` für die Session-Daten (`code_verifier`, `state`, Zugriffstoken); GitHub Tree-/File-API.

## Teilschritte
- [x] **1.1 PKCE-Flow im Browser** — Code-Verifier und Code-Challenge wurden im Browser erzeugt und beim Redirect validiert. **Historisch im Code umgesetzt; won't do**
- [x] **1.2 Token-Austausch über GitHub Token-Endpoint** — ein direkter Austausch wurde versucht. **Historisch im Code umgesetzt, nicht erfolgreich Ende-zu-Ende verifiziert; won't do**
- [x] **1.3 Dateien und Baumstruktur abrufen** — Git-Trees werden über die GitHub API geladen; das gezielte Laden ausgewählter LaTeX-Dateien ist in [Story 2.4](Story-2.4-LaTeX-Datei-im-Editor-laden.md) umgesetzt. **Teilweise umgesetzt**
- [ ] **1.4 Commit- & Push-Funktion via API** — echte GitHub-Uploads bleiben offen; der gemeinsame Online-/Offline-Speichern-Ablauf ist in [Story 6.1](Story-6.1-Einheitliches-Speichern.md) beschrieben. **Ausstehend**

## Frühere Einrichtung und Einschränkungen
Der frühere Login verwendete eine registrierte GitHub App und die Callback-Adresse `https://yasminshendrik.github.io/latex_on_ipad/`. Die Client-ID war im Frontend hinterlegt; das Client Secret wurde dort nicht verwendet.

Der `scope`-Parameter wurde entfernt, weil GitHub-App-Berechtigungen über die App-Konfiguration und Installationsrechte verwaltet werden. Ein erfolgreich erhaltenes Access Token sollte im `sessionStorage` der App bleiben und wäre damit für JavaScript derselben Origin zugänglich gewesen.

## Historischer Login-Flow
- Der Login-Button startete zuletzt den Authorization-Code-Flow mit PKCE S256.
- Callback-Fehler, fehlender oder ungültiger `state` sowie fehlender Authorization Code wurden abgewiesen. PKCE-Daten und OAuth-Parameter wurden nach dem Callback bereinigt.
- Ein zuvor eingebauter experimenteller Device Flow wurde entfernt, damit er den PKCE-Flow nicht abfing. Beide Varianten sind nicht mehr aktiv.

## Erkenntnisse der Untersuchung
- Das iPad-Protokoll zeigte beim Rücksprung einen vorhandenen Code und passenden `state`; der anschließende Token-`POST` scheiterte aus Browsersicht ohne lesbare HTTP-Antwort. Die fest codierte Aufzählung möglicher Netzwerk-, CORS- oder Browserprobleme belegt für sich genommen keine konkrete Ursache.
- Eine separate CORS-Vorabprüfung des GitHub-Token-Endpunkts lieferte HTTP 404 ohne CORS-Freigabe. Ein einfacher Formular-`POST` vermied zwar die Vorabprüfung, die getestete Antwort enthielt aber ebenfalls keinen `Access-Control-Allow-Origin`-Header. Der Device-Code-Endpunkt lieferte bei einem Testaufruf ebenfalls keine solche Freigabe. Diese HTTP-Tests waren kein Ende-zu-Ende-Test in Safari.
- Zusätzlich dokumentiert GitHub für den Authorization-Code-Austausch einer GitHub App ein erforderliches **Client Secret**. PKCE ersetzt dieses in dem dokumentierten Ablauf nicht; ein App-bezogenes Secret darf nicht im öffentlich ausgelieferten Frontend stehen.
- GitHubs REST-API unter `api.github.com` unterstützt dagegen CORS. Eine separate Vorabprüfung erlaubte die für API-Aufrufe benötigten Header. Dies ermöglicht die Verwendung eines bereits vorhandenen Tokens aus der PWA, nicht dessen Ausstellung über den OAuth-Endpunkt.
- Der Service Worker kann die Callback-Navigation behandeln; im Protokoll erreichte der Rücksprung die App. Den nachfolgenden externen Token-`POST` verarbeitet der Worker nicht. OAuth-Rücksprung-URLs werden inzwischen nicht mehr im Service-Worker-Cache gespeichert.
- Ein serverseitiger Austausch etwa über Azure API Management oder eine Azure Function könnte das Secret schützen und die Browser-CORS-Grenze umgehen, wäre aber ein Backend und damit eine Abweichung von der aktuellen Vorgabe. Die [Azure-Hosting-Idee](Story-1.5-Azure-Static-Web-Apps-Idee.md) bleibt separat als nicht beschlossene spätere Option im Backlog.

## Quellen
- [GitHub: User Access Token für eine GitHub App erzeugen](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [GitHub: CORS für die REST-API](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests)
- [GitHub Pages als statischer Hosting-Dienst](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
