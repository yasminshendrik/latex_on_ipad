# Story 1.6: GitHub-Login mit Fine-grained Personal Access Token

**Status: Abgeschlossen für den aktuellen Umfang**

## Ziel
Den bisherigen GitHub-App-OAuth-Login durch die Eingabe eines Fine-grained Personal Access Tokens ersetzen. Das Token soll bei Bedarf über Apple Passwörter bereitgestellt werden können; die lokale Offline-Arbeit bleibt unabhängig vom Login.

## Umsetzung
- Der Login öffnet ein Formular mit einem verdeckten Token-Feld und ohne Benutzername-Feld. Das Token-Feld verwendet `autocomplete="current-password"` für Passwortmanager.
- Vor dem Verbinden wird das Token über `GET /user` bei GitHub geprüft. Erst danach wird es für die laufende Sitzung in `sessionStorage` abgelegt; beim Abmelden wird es dort entfernt. Es wird nicht im Diagnoseprotokoll ausgegeben.
- Anschließend öffnet sich die Repository-Auswahl gemäß [Story 0.4](Story-0.4-Repository-Auswahl-und-Baumansicht.md).
- Die PWA enthält kein Client Secret und verwendet keinen OAuth-Token-Austausch. Alte OAuth-Sitzungsdaten und etwaige Rücksprungparameter werden bereinigt; alte OAuth-Tokens werden nicht übernommen.

## Nutzung und Grenzen
Ein Fine-grained Token muss bei GitHub erstellt und auf die benötigten Repositories und Berechtigungen beschränkt werden. Für das aktuelle Lesen sind Repository-Metadaten und Lesezugriff auf Inhalte erforderlich. Organisationsrichtlinien oder Genehmigungen können den Zugriff zusätzlich einschränken.

In Apple Passwörter kann ein separater Eintrag für die App-Adresse mit einem frei gewählten oder dem GitHub-Benutzernamen und dem Token als Passwort angelegt werden. Das echte GitHub-Passwort darf nicht eingegeben oder durch das Token überschrieben werden. Das Token-Feld ist für Passwortmanager vorbereitet; ob iPadOS/Safari den Eintrag automatisch anbietet, hängt von den Plattform-Einstellungen ab und ist keine Voraussetzung für den Abschluss dieser Story.

Das Token ist während der Sitzung für JavaScript derselben Origin zugänglich; `sessionStorage` ist kein Passwortmanager. Eine Prüfung der Token-Gültigkeit belegt nicht, dass der Zugriff auf ein bestimmtes Repository gestattet ist. Die Nutzerin bewertet den PAT-Ablauf für den aktuellen Stand als hinreichend erfolgreich getestet. Zusätzliche wiederholbare manuelle Prüfschritte sind im [finalen Integrationstestplan](../tests/INTEGRATION_TEST_PLAN.md) festgehalten und blockieren den Abschluss nicht.

## Abschluss
Der PAT-Login, die sitzungsgebundene Token-Verwendung und der Zugriff auf GitHub sind für den aktuellen Projektumfang akzeptiert. Ein bestimmtes Autofill-Verhalten von Apple Passwörter wird nicht zugesichert; bei Bedarf kann es anhand des Integrationstestplans auf einem unterstützten Gerät erneut geprüft werden.
