# Story 1.6: GitHub-Login mit Fine-grained Personal Access Token

**Status: Teilweise umgesetzt; automatische Erkennung des Apple-Passwörter-Eintrags und GitHub-Ende-zu-Ende-Test ausstehend**

## Ziel
Den bisherigen GitHub-App-OAuth-Login durch die Eingabe eines Fine-grained Personal Access Tokens ersetzen. Das Token soll bei Bedarf über Apple Passwörter bereitgestellt werden können; die lokale Offline-Arbeit bleibt unabhängig vom Login.

## Umsetzung
- Der Login öffnet ein Formular mit einem verdeckten Token-Feld und ohne Benutzername-Feld. Das Token-Feld verwendet `autocomplete="current-password"` für Passwortmanager.
- Vor dem Verbinden wird das Token über `GET /user` bei GitHub geprüft. Erst danach wird es für die laufende Sitzung in `sessionStorage` abgelegt; beim Abmelden wird es dort entfernt. Es wird nicht im Diagnoseprotokoll ausgegeben.
- Anschließend öffnet sich die Repository-Auswahl gemäß [Story 0.4](Story-0.4-Repository-Auswahl-und-Baumansicht.md).
- Die PWA enthält kein Client Secret und verwendet keinen OAuth-Token-Austausch. Alte OAuth-Sitzungsdaten und etwaige Rücksprungparameter werden bereinigt; alte OAuth-Tokens werden nicht übernommen.

## Nutzung und Grenzen
Ein Fine-grained Token muss bei GitHub erstellt und auf die benötigten Repositories und Berechtigungen beschränkt werden. Für das aktuelle Lesen sind Repository-Metadaten und Lesezugriff auf Inhalte erforderlich. Organisationsrichtlinien oder Genehmigungen können den Zugriff zusätzlich einschränken.

In Apple Passwörter kann ein separater Eintrag für die App-Adresse mit einem frei gewählten oder dem GitHub-Benutzernamen und dem Token als Passwort angelegt werden. Das echte GitHub-Passwort darf nicht eingegeben oder durch das Token überschrieben werden. Der Eintrag ist mit der App-Seite verknüpft, wird beim Login aber noch nicht automatisch gefunden. Die automatische Erkennung beziehungsweise das automatische Ausfüllen muss noch untersucht und praktisch verifiziert werden.

Das Token ist während der Sitzung für JavaScript derselben Origin zugänglich; `sessionStorage` ist kein Passwortmanager. Eine Prüfung der Token-Gültigkeit belegt nicht, dass der Zugriff auf ein bestimmtes Repository gestattet ist.

## Offener Punkt
- [ ] Apple Passwörter soll den mit der App-Seite verknüpften Eintrag beim Login automatisch erkennen oder zum Ausfüllen anbieten. **Ausstehend**
