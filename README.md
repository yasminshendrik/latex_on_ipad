# latex_on_ipad
Ein LaTeX Editor für das iPad 

## GitHub verbinden

Erstelle bei GitHub ein Fine-grained Personal Access Token mit Zugriff auf die gewünschten Repositories und Lesezugriff auf deren Inhalte. Öffne in der App „GitHub Login“ und gib das Token ein oder fülle es über einen Passwortmanager aus. Das GitHub-Passwort selbst darf dort nicht eingegeben werden.

Für Apple Passwörter kann ein **separater** Eintrag für `yasminshendrik.github.io` mit dem GitHub-Benutzernamen und dem Token als Passwort angelegt werden. Die App fragt nicht selbst Apple Passwörter ab; das Angebot zum Speichern und Ausfüllen hängt von iPadOS und den Einstellungen ab. Ein bestehender GitHub-Passworteintrag sollte nicht überschrieben werden.

Nach erfolgreicher Prüfung bei GitHub bleibt das Token bis zur Abmeldung oder zum Ende der Browser-Sitzung im `sessionStorage`. JavaScript derselben Origin kann es dort lesen. Ein gültiges Token garantiert keinen Zugriff auf jedes Repository; dafür müssen Token-Berechtigungen und gegebenenfalls Organisationsrichtlinien stimmen.

Nach dem Login zeigt ein Dialog die Anzahl und Auswahl der von GitHub für das Token zurückgegebenen Repositories. Über den Repository-Namen in der Sidebar lässt sich die Auswahl erneut öffnen. Die Sidebar listet Ordner und Dateien des gewählten Branches nur auf; sie lassen sich dort noch nicht öffnen. Der Editor zeigt weiterhin ein lokal gespeichertes `main.tex` für den jeweiligen Repository-/Branch-Kontext oder ein neues lokales Dokument, nicht automatisch den GitHub-Dateiinhalt. Zum Aktualisieren der Liste ist eine Internetverbindung erforderlich.
