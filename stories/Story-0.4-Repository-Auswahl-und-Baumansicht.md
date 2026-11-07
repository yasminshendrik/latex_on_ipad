# Story 0.4: Repository-Auswahl und reine Baumansicht

**Status: Im Code umgesetzt**

## Ziel
Nach erfolgreichem GitHub-Login ein Popup mit der Anzahl und einer Auswahl der für das Token verfügbaren Repositories anzeigen. Ein ausgewähltes Repository kann geöffnet werden.

Die Sidebar zeigt anschließend dessen Ordner und Dateien hierarchisch an. Ordner und Dateien werden zunächst nur aufgelistet und haben keine Auswahl- oder Öffnen-Funktion. Dies ersetzt die bisherige Dateiauswahl aus Story 2; deren ursprüngliche Beschreibung bleibt als Historie erhalten.

## Teilschritte
- [x] Repository-Liste nach dem Login seitenweise laden, Anzahl anzeigen und Auswahl ermöglichen. **Im Code umgesetzt**
- [x] Ausgewähltes Repository öffnen und Ordner sowie Dateien ohne Interaktion in der Sidebar darstellen. **Im Code umgesetzt**

Das Popup kann über den Repository-Namen erneut geöffnet werden. Zugriffs- und Ladefehler sowie unvollständige Git-Trees werden angezeigt; leere Repositories erhalten einen Hinweis. Der Editor lädt dabei keine GitHub-Dateiinhalte: Er zeigt den lokal gespeicherten Stand von `main.tex` für den gewählten Repo-/Branch-Kontext beziehungsweise ein neues lokales Dokument. Bereits vorhandene lokale Änderungen werden vor einem Kontextwechsel gespeichert. Submodule sind keine Ordner oder Dateien und werden nicht aufgeführt.
