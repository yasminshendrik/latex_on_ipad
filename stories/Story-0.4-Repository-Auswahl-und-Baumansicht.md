# Story 0.4: Repository-Auswahl und Baumansicht

**Status: Im Code umgesetzt**

## Ziel
Nach erfolgreichem GitHub-Login ein Popup mit der Anzahl und einer Auswahl der für das Token verfügbaren Repositories anzeigen. Ein ausgewähltes Repository kann geöffnet werden.

Die Sidebar zeigt anschließend dessen Ordner und Dateien hierarchisch an. Ordner bleiben nicht interaktiv; LaTeX-Dateien können gemäß [Story 2.2](Story-2.2-LaTeX-Dateien-und-Schreibbarkeit-in-der-Sidebar.md) und [Story 2.4](Story-2.4-LaTeX-Datei-im-Editor-laden.md) gezielt geöffnet werden. Andere Dateien werden nur mit Name und Statussymbol aufgeführt.

## Teilschritte
- [x] Repository-Liste nach dem Login seitenweise laden, Anzahl anzeigen und Auswahl ermöglichen. **Im Code umgesetzt**
- [x] Ausgewähltes Repository öffnen und Ordner sowie Dateien hierarchisch in der Sidebar darstellen. **Im Code umgesetzt**

Das Popup kann über den Repository-Namen erneut geöffnet werden. Zugriffs- und Ladefehler sowie unvollständige Git-Trees werden angezeigt; leere Repositories erhalten einen Hinweis. Beim Öffnen eines Repositorys zeigt der Editor den lokalen Stand von `main.tex` für den gewählten Repo-/Branch-Kontext beziehungsweise ein neues lokales Dokument. Andere LaTeX-Dateien werden erst auf Auswahl geladen; lokale Änderungen werden vor einem Datei- oder Kontextwechsel gespeichert. Submodule sind keine Ordner oder Dateien und werden nicht aufgeführt.
