# latex_on_ipad
Ein LaTeX Editor für das iPad

## Lokale Projekte und GitHub

Beim Start zeigt die App lokal gespeicherte Projekte. „Lokal öffnen“ lädt ausschließlich bereits gespeicherte Dateien und funktioniert offline. Für den Online-Zugriff kann ein GitHub-Repository separat geöffnet werden.

Über „Neues GitHub-Repository“ lässt sich ein privates Repository erstellen und mit `main.tex` initialisieren. Dafür müssen Internetverbindung und Token-Berechtigungen ausreichen. Beim Online-Öffnen eines Repositorys lädt die App alle unterstützten regulären Dateien des Branches in den lokalen Speicher. Submodule, Symlinks, Git-LFS-Dateien und Dateien über 100 MB werden ausgelassen und gemeldet. Bearbeitete Dateien werden nach kurzer Inaktivität und während der App-Ausführung alle drei Minuten lokal gespeichert; Browser oder Betriebssystem können eine App im Hintergrund pausieren. „Speichern“ sichert lokal und bietet für ein verbundenes GitHub-Repository einen gemeinsamen Commit und Push an. Offline bleiben Änderungen lokal erhalten.

## GitHub verbinden

Erstelle bei GitHub ein Fine-grained Personal Access Token mit Zugriff auf die gewünschten Repositories und Lesezugriff auf deren Inhalte. Öffne in der App „GitHub Login“ und gib das Token ein oder fülle es über einen Passwortmanager aus. Das GitHub-Passwort selbst darf dort nicht eingegeben werden.

Für Apple Passwörter kann ein **separater** Eintrag für `yasminshendrik.github.io` mit dem GitHub-Benutzernamen und dem Token als Passwort angelegt werden. Die App fragt nicht selbst Apple Passwörter ab; das Angebot zum Speichern und Ausfüllen hängt von iPadOS und den Einstellungen ab. Ein bestehender GitHub-Passworteintrag sollte nicht überschrieben werden.

Nach erfolgreicher Prüfung bei GitHub bleibt das Token bis zur Abmeldung oder zum Ende der Browser-Sitzung im `sessionStorage`. JavaScript derselben Origin kann es dort lesen. Ein gültiges Token garantiert keinen Zugriff auf jedes Repository; dafür müssen Token-Berechtigungen und gegebenenfalls Organisationsrichtlinien stimmen.

Nach dem Login zeigt ein Dialog die Anzahl und Auswahl der von GitHub für das Token zurückgegebenen Repositories. Die Repository-Auswahl kennzeichnet Lese-, Schreib- und Administrationsrechte; fehlende Berechtigungsangaben erscheinen als unbekannt. Über den Repository-Namen in der Sidebar lässt sich die Auswahl erneut öffnen. Die Sidebar ist nach dem Öffnen eines Projekts verfügbar; ihre Ordner lassen sich auf- und zuklappen. Standardmäßig zeigt der abschaltbare Filter nur auswählbare `.tex`-, `.latex`- und `.ltx`-Dateien und deren übergeordnete Ordner. Ohne Filter erscheinen andere Dateien mit Name und Statussymbol. Die Inhalte stehen nach dem Online-Öffnen offline aus dem lokalen Speicher zur Verfügung. Beim erneuten Online-Öffnen werden lokale und Remote-Änderungen verglichen; bei Konflikten kann die lokale oder Online-Version gewählt oder ein Merge versucht werden. Vor einem Dateiwechsel werden lokale Änderungen gespeichert. Das vorhandene technische Diagnoseprotokoll lässt sich über „Log“ ein- und ausblenden und bleibt beim Start verborgen.

Der Projektname ist der auf- und zuklappbare Wurzelordner im Dateibrowser. Git-Metadaten (`.git`) und Git-Konfigurationsdateien (`.gitignore`, `.gitattributes`, `.gitmodules`) werden dort ausgeblendet, bleiben aber im Projekt gespeichert. Die Sidebar lässt sich an ihrem Rand per Maus, Touch oder Pfeiltasten vergrößern und verkleinern; eine Mindestgröße schützt ihre Bedienbarkeit.

Mit dem Plus an einem Ordner oder der Projektwurzel wird dort eine TeX-Datei oder ein Unterordner angelegt. Leere Ordner werden durch eine ausgeblendete `.gitkeep`-Datei im Repository erhalten. TeX-Dateien haben ein Quellcode-Icon; geänderte Namen sind mit `*` markiert, neue mit „Neu“. Langes Tippen auf eine Datei oder einen Ordner öffnet ein Kontextmenü zum Löschen; alternativ sind Rechtsklick oder Umschalt+F10 möglich. Im projekt- und branchbezogenen Papierkorb lassen sich die Einträge wiederherstellen. Der Papierkorb bleibt offline und nach einem Neuladen erhalten und wird erst nach erfolgreichem Commit und Push geleert. Belegte oder überlappende Pfade müssen vorher wiederhergestellt oder gespeichert werden.

Das Protokoll hat die Reiter „Allgemein“ und „Compiler“. Kompilierungsereignisse im allgemeinen Protokoll öffnen den Compiler-Reiter mit dem aktuellen Ergebnis; Kopieren und Leeren gelten jeweils nur für den ausgewählten Reiter. Das Compiler-Protokoll bleibt nur bis zum nächsten Lauf, Projektwechsel oder Neuladen erhalten und kann Dateinamen und vertrauliche Dokumentinhalte enthalten. Ältere allgemeine Protokolleinträge aus früheren App-Versionen können ebenfalls Compiler-Details enthalten; vor dem Teilen prüfen oder den allgemeinen Reiter leeren.

## Lokale Syntaxprüfung

Die App prüft die aktive Datei während der Bearbeitung in einem lokal ausgelieferten Worker auf ausgewählte Fehler bei geschweiften Klammern, Mathematikbegrenzungen und Umgebungen. Hinweise erscheinen unter dem Editor und bei geladenem Monaco zusätzlich als Markierungen. Die Prüfung funktioniert nach dem Laden der App-Shell auch offline; sie ist keine Kompilierung und erkennt weder alle LaTeX-Fehler noch projektübergreifende Fehler.

Der Worker verwendet den MIT-lizenzierten Parser `@unified-latex/unified-latex-util-pegjs`; die Lizenz liegt unter `js/UNIFIED-LATEX-LICENSE.txt`. Nach Änderungen an `js-src/lint-worker.js` wird das ausgelieferte Bundle mit `npm ci` und `npm run build:lint-worker` neu erzeugt.

## TeX-Engine und Vorschau
Die Kompilierung nutzt `glyphtex-engine` und PDF.js. Die großen Assets werden nicht eingecheckt: `npm ci && npm run build` erzeugt `js/engine/` und `js/pdfjs/`. Der Asset-Build lädt die gepinnten KOMA-Script- und Babel-Dateien aus öffentlichen Quellen und prüft sie anhand ihrer Git-Blob-Prüfsummen. Lizenzhinweise: `js/THIRD-PARTY-NOTICES.md`.

Wenn beim Kompilieren ein unterstütztes TeX-Paket fehlt, fragt die App vor dem Download nach Zustimmung. Nach erfolgreicher Größen- und SHA-256-Prüfung wird das Archiv lokal in IndexedDB dem aktuellen Projekt und Branch zugeordnet. Spätere Kompilierungen können das Paket offline verwenden; ohne IndexedDB wird es nicht heruntergeladen. Projekt-Export und -Import der Pakete sind noch nicht umgesetzt. Das allgemeine TeX-Bundle der Engine steht unabhängig davon weiter zur Verfügung.

Für die Paketauflösung werden konkrete Fehlermeldungen zu fehlenden Dateien sowie unbekannte Babel-Sprachoptionen ausgewertet; unverbindliche Dateisuchversuche lösen keinen Download aus. Nur die im Paketindex angebotenen Pakete können nachgeladen werden; `bookmark.sty` ist dort beispielsweise noch nicht enthalten.

Für `babel` mit `ngerman` können die neutrale Babel-Grundsprache und deutsche Sprachdaten nachgeladen werden. Das TeX-Format enthält englische und deutsche Silbentrennungsmuster; Babel wählt sie anhand der Dokumentsprache und auch bei Sprachwechseln im Dokument. Eine spätere Übersteuerung in den Projekteinstellungen ist noch nicht umgesetzt. `footmisc` selbst ist nicht im Paketindex enthalten; eine optionale KOMA-Script-Suchprobe wird nicht als fehlendes Paket angezeigt, ein tatsächlicher Fehler beim Laden dagegen schon.

`npm test` führt die Unit-Tests aus. Nach `npm run build` prüft `npm run test:integration` zusätzlich eine echte Kompilierung mit `scrbook`.
