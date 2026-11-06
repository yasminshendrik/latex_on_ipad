# Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Browser-basierte GitHub-Anbindung mit OAuth PKCE und Synchronisation von Repositories über die GitHub Contents- und Git Data-API.

## Technische Komponenten
GitHub OAuth App mit PKCE; `sessionStorage` für die Session-Daten (PKCE verifier, state und Zugriffstoken); GitHub Tree-/File-API.

## Teilschritte
- [x] PKCE-Verifier und S256-Challenge mit kryptografisch sicherem Browser-Zufall erzeugen. **Im Code umgesetzt; Produktivtest mit registrierter OAuth App ausstehend**
- [x] OAuth-`state` bei Callback zwingend prüfen; Callback-Parameter nach Verarbeitung aus der URL entfernen. **Im Code umgesetzt**
- [x] Authorization Code am GitHub Token-Endpunkt mit Client-ID, Code, Redirect-URI und PKCE-Verifier austauschen; kein Client Secret im Frontend verwenden. **Im Code umgesetzt; Browser-/GitHub-Konfigurationstest ausstehend**
- [x] Dateien und Baumstruktur über die GitHub API abrufen. **Umgesetzt**
- [ ] Commit- & Push-Funktion via API. **Ausstehend**

## Einrichtung und Einschränkungen
Für den Login muss eine GitHub OAuth App registriert sein. Die Client-ID in `js/app.js` ist derzeit ein Platzhalter und muss durch die echte Client-ID ersetzt werden. Die registrierte Callback-URL muss exakt der URL entsprechen, die `redirectUri()` erzeugt. Das Access Token wird in `sessionStorage` abgelegt und ist damit für JavaScript im App-Origin zugänglich; PKCE verhindert nicht, dass XSS ein bereits ausgegebenes Token ausliest.

Der OAuth-Flow benötigt eine Online-Verbindung. Lokales Bearbeiten und Speichern in IndexedDB funktionieren unabhängig davon; Repository-Zugriff über GitHub benötigt Netzwerk und ein gültiges Token.
