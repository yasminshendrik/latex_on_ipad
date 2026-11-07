# latex_on_ipad
Ein LaTeX Editor für das iPad 

## GitHub verbinden

Erstelle bei GitHub ein Fine-grained Personal Access Token mit Zugriff auf die gewünschten Repositories und Lesezugriff auf deren Inhalte. Öffne in der App „GitHub Login“ und gib das Token ein oder fülle es über einen Passwortmanager aus. Das GitHub-Passwort selbst darf dort nicht eingegeben werden.

Für Apple Passwörter kann ein **separater** Eintrag für `yasminshendrik.github.io` mit dem GitHub-Benutzernamen und dem Token als Passwort angelegt werden. Die App fragt nicht selbst Apple Passwörter ab; das Angebot zum Speichern und Ausfüllen hängt von iPadOS und den Einstellungen ab. Ein bestehender GitHub-Passworteintrag sollte nicht überschrieben werden.

Nach erfolgreicher Prüfung bei GitHub bleibt das Token bis zur Abmeldung oder zum Ende der Browser-Sitzung im `sessionStorage`. JavaScript derselben Origin kann es dort lesen. Ein gültiges Token garantiert keinen Zugriff auf jedes Repository; dafür müssen Token-Berechtigungen und gegebenenfalls Organisationsrichtlinien stimmen.

Nach dem Login zeigt ein Dialog die Anzahl und Auswahl der von GitHub für das Token zurückgegebenen Repositories. Die Repository-Auswahl kennzeichnet Lese-, Schreib- und Administrationsrechte; fehlende Berechtigungsangaben erscheinen als unbekannt. Über den Repository-Namen in der Sidebar lässt sich die Auswahl erneut öffnen. Ordner werden in der Sidebar hierarchisch angezeigt. `.tex`-, `.latex`- und `.ltx`-Dateien lassen sich auswählen; ihr Inhalt wird zuerst aus dem lokalen Speicher geladen und andernfalls online von GitHub abgerufen und lokal gespeichert. Andere Dateien erscheinen nur mit Name und Statussymbol. Vor einem Dateiwechsel werden lokale Änderungen gespeichert. Das Log der Statusmeldungen lässt sich über die Schaltfläche „Log“ einblenden und ist beim Start verborgen.
