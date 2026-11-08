# latex_on_ipad
Ein LaTeX Editor für das iPad

## Lokale Projekte und GitHub

Beim Start zeigt die App lokal gespeicherte Projekte. „Lokal öffnen“ lädt ausschließlich bereits gespeicherte Dateien und funktioniert offline. Für den Online-Zugriff kann ein GitHub-Repository separat geöffnet werden.

Über „Neues GitHub-Repository“ lässt sich ein privates Repository erstellen und mit `main.tex` initialisieren. Dafür müssen Internetverbindung und Token-Berechtigungen ausreichen. Beim Online-Öffnen eines Repositorys lädt die App alle unterstützten regulären Dateien des Branches in den lokalen Speicher. Submodule, Symlinks, Git-LFS-Dateien und Dateien über 100 MB werden ausgelassen und gemeldet. Bearbeitete Dateien werden nach kurzer Inaktivität und während der App-Ausführung alle drei Minuten lokal gespeichert; Browser oder Betriebssystem können eine App im Hintergrund pausieren. Der einheitliche Button „Speichern“ sichert lokal. GitHub-Commit und Push über diesen Button sind noch nicht verfügbar.

## GitHub verbinden

Erstelle bei GitHub ein Fine-grained Personal Access Token mit Zugriff auf die gewünschten Repositories und Lesezugriff auf deren Inhalte. Öffne in der App „GitHub Login“ und gib das Token ein oder fülle es über einen Passwortmanager aus. Das GitHub-Passwort selbst darf dort nicht eingegeben werden.

Für Apple Passwörter kann ein **separater** Eintrag für `yasminshendrik.github.io` mit dem GitHub-Benutzernamen und dem Token als Passwort angelegt werden. Die App fragt nicht selbst Apple Passwörter ab; das Angebot zum Speichern und Ausfüllen hängt von iPadOS und den Einstellungen ab. Ein bestehender GitHub-Passworteintrag sollte nicht überschrieben werden.

Nach erfolgreicher Prüfung bei GitHub bleibt das Token bis zur Abmeldung oder zum Ende der Browser-Sitzung im `sessionStorage`. JavaScript derselben Origin kann es dort lesen. Ein gültiges Token garantiert keinen Zugriff auf jedes Repository; dafür müssen Token-Berechtigungen und gegebenenfalls Organisationsrichtlinien stimmen.

Nach dem Login zeigt ein Dialog die Anzahl und Auswahl der von GitHub für das Token zurückgegebenen Repositories. Die Repository-Auswahl kennzeichnet Lese-, Schreib- und Administrationsrechte; fehlende Berechtigungsangaben erscheinen als unbekannt. Über den Repository-Namen in der Sidebar lässt sich die Auswahl erneut öffnen. Die Sidebar ist nach dem Öffnen eines Projekts verfügbar; ihre Ordner lassen sich auf- und zuklappen. Standardmäßig zeigt der abschaltbare Filter nur auswählbare `.tex`-, `.latex`- und `.ltx`-Dateien und deren übergeordnete Ordner. Ohne Filter erscheinen andere Dateien mit Name und Statussymbol. Die Inhalte stehen nach dem Online-Öffnen offline aus dem lokalen Speicher zur Verfügung. Beim erneuten Online-Öffnen werden lokale und Remote-Änderungen verglichen; bei Konflikten kann die lokale oder Online-Version gewählt oder ein Merge versucht werden. Vor einem Dateiwechsel werden lokale Änderungen gespeichert. Das vorhandene technische Diagnoseprotokoll lässt sich über „Log“ ein- und ausblenden und bleibt beim Start verborgen.

Das Protokoll hat die Reiter „Allgemein“ und „Compiler“. Kompilierungsereignisse im allgemeinen Protokoll öffnen den Compiler-Reiter mit dem aktuellen Ergebnis; Kopieren und Leeren gelten jeweils nur für den ausgewählten Reiter. Das Compiler-Protokoll bleibt nur bis zum nächsten Lauf, Projektwechsel oder Neuladen erhalten und kann Dateinamen und vertrauliche Dokumentinhalte enthalten. Ältere allgemeine Protokolleinträge aus früheren App-Versionen können ebenfalls Compiler-Details enthalten; vor dem Teilen prüfen oder den allgemeinen Reiter leeren.

## Lokale Syntaxprüfung

Die App prüft die aktive Datei während der Bearbeitung in einem lokal ausgelieferten Worker auf ausgewählte Fehler bei geschweiften Klammern, Mathematikbegrenzungen und Umgebungen. Hinweise erscheinen unter dem Editor und bei geladenem Monaco zusätzlich als Markierungen. Die Prüfung funktioniert nach dem Laden der App-Shell auch offline; sie ist keine Kompilierung und erkennt weder alle LaTeX-Fehler noch projektübergreifende Fehler.

Der Worker verwendet den MIT-lizenzierten Parser `@unified-latex/unified-latex-util-pegjs`; die Lizenz liegt unter `js/UNIFIED-LATEX-LICENSE.txt`. Nach Änderungen an `js-src/lint-worker.js` wird das ausgelieferte Bundle mit `npm ci` und `npm run build:lint-worker` neu erzeugt.

## TeX-Engine und Vorschau
Kompilierung (Story 3/4) nutzt `glyphtex-engine` und PDF.js. Die großen Assets werden nicht eingecheckt: `npm ci && npm run build` erzeugt `js/engine/` und `js/pdfjs/` (der Pages-Workflow macht das automatisch). Lizenzhinweise: `js/THIRD-PARTY-NOTICES.md`.
