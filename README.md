# latex_on_ipad
Ein LaTeX Editor für das iPad

## Lokale Projekte und GitHub

Beim Start zeigt die App lokal gespeicherte Projekte. „Lokal öffnen“ lädt ausschließlich bereits gespeicherte Dateien und funktioniert offline. Für den Online-Zugriff kann ein GitHub-Repository separat geöffnet werden.

Über „Neues GitHub-Repository“ lässt sich ein privates Repository erstellen und mit `main.tex` initialisieren. Dafür müssen Internetverbindung und Token-Berechtigungen ausreichen. Bearbeitete Dateien werden nach kurzer Inaktivität und während der App-Ausführung alle drei Minuten lokal gespeichert; Browser oder Betriebssystem können eine App im Hintergrund pausieren. Ein Commit/Push-Workflow ist noch nicht verfügbar.

## GitHub verbinden

Erstelle bei GitHub ein Fine-grained Personal Access Token mit Zugriff auf die gewünschten Repositories und Lesezugriff auf deren Inhalte. Öffne in der App „GitHub Login“ und gib das Token ein oder fülle es über einen Passwortmanager aus. Das GitHub-Passwort selbst darf dort nicht eingegeben werden.

Für Apple Passwörter kann ein **separater** Eintrag für `yasminshendrik.github.io` mit dem GitHub-Benutzernamen und dem Token als Passwort angelegt werden. Die App fragt nicht selbst Apple Passwörter ab; das Angebot zum Speichern und Ausfüllen hängt von iPadOS und den Einstellungen ab. Ein bestehender GitHub-Passworteintrag sollte nicht überschrieben werden.

Nach erfolgreicher Prüfung bei GitHub bleibt das Token bis zur Abmeldung oder zum Ende der Browser-Sitzung im `sessionStorage`. JavaScript derselben Origin kann es dort lesen. Ein gültiges Token garantiert keinen Zugriff auf jedes Repository; dafür müssen Token-Berechtigungen und gegebenenfalls Organisationsrichtlinien stimmen.

Nach dem Login zeigt ein Dialog die Anzahl und Auswahl der von GitHub für das Token zurückgegebenen Repositories. Die Repository-Auswahl kennzeichnet Lese-, Schreib- und Administrationsrechte; fehlende Berechtigungsangaben erscheinen als unbekannt. Über den Repository-Namen in der Sidebar lässt sich die Auswahl erneut öffnen. Ordner werden in der Sidebar hierarchisch angezeigt. `.tex`-, `.latex`- und `.ltx`-Dateien lassen sich auswählen; ihr Inhalt wird zuerst aus dem lokalen Speicher geladen und andernfalls online von GitHub abgerufen und lokal gespeichert. Andere Dateien erscheinen nur mit Name und Statussymbol. Vor einem Dateiwechsel werden lokale Änderungen gespeichert. Das vorhandene technische Diagnoseprotokoll lässt sich über „Log“ ein- und ausblenden und bleibt beim Start verborgen.
