# Story 0.4: Repository-Auswahl und Baumansicht

> **GitHub Issue:** [#3](https://github.com/yasminshendrik/latex_on_ipad/issues/3) — maßgeblicher Status und Tracking. Diese Datei bleibt als Referenzkopie erhalten.

**Status: Im Code umgesetzt**

## Ziel
Nach erfolgreichem GitHub-Login ein Popup mit der Anzahl und einer Auswahl der für das Token verfügbaren Repositories anzeigen. Ein ausgewähltes Repository kann geöffnet werden.

Die Sidebar zeigt anschließend dessen Ordner und Dateien hierarchisch an. Ordner bleiben nicht interaktiv; LaTeX-Dateien können gemäß [Story 2.2](Story-2.2-LaTeX-Dateien-und-Schreibbarkeit-in-der-Sidebar.md) und [Story 2.4](Story-2.4-LaTeX-Datei-im-Editor-laden.md) gezielt geöffnet werden. Andere Dateien werden nur mit Name und Statussymbol aufgeführt. Das Online-Öffnen lädt unterstützte reguläre Dateien des Branches gemäß [Story 6.1](Story-6.1-Einheitliches-Speichern.md) vorab in den lokalen Speicher.

## Teilschritte
- [x] Repository-Liste nach dem Login seitenweise laden, Anzahl anzeigen und Auswahl ermöglichen. **Im Code umgesetzt**
- [x] Ausgewähltes Repository öffnen und Ordner sowie Dateien hierarchisch in der Sidebar darstellen. **Im Code umgesetzt**

Das Popup kann über den Repository-Namen erneut geöffnet werden. Zugriffs- und Ladefehler sowie unvollständige Git-Trees werden angezeigt; leere Repositories erhalten einen Hinweis. Beim Öffnen eines Repositorys lädt die App den Branch lokal und zeigt anschließend `main.tex`, die erste LaTeX-Datei oder ein neues Dokument an. Andere LaTeX-Dateien werden aus dem lokalen Speicher erst auf Auswahl im Editor geöffnet; lokale Änderungen werden vor einem Datei- oder Kontextwechsel gespeichert. Submodule werden als nicht unterstützte Einträge angezeigt und nicht heruntergeladen.
