# Story 2.2: LaTeX-Dateien und Schreibbarkeit in der Sidebar

**Status: Im Code umgesetzt**

## Ziel
In der Repository-Baumansicht nur LaTeX-Dateien zur Bearbeitung anbieten und die Bearbeitbarkeit von Dateien durch Symbole kenntlich machen.

## Anforderungen
- LaTeX-Dateien werden als bearbeitbar angeboten und in der Sidebar mit einem passenden Symbol gekennzeichnet.
- Dateien, die nicht bearbeitet werden können, erscheinen in der Sidebar ausschließlich mit ihrem Namen und einem Symbol für den nicht bearbeitbaren Status. Ihr Dateiinhalt wird dort nicht angezeigt.
- Die Symbole müssen auch für assistive Technologien verständlich sein, zum Beispiel über einen zugänglichen Namen oder eine Textalternative.
- Die Repository-weiten GitHub-Zugriffsrechte aus [Story 1.7](Story-1.7-Repository-Zugriffsrechte.md) bleiben davon getrennt: Ein Datei-Symbol darf keine Schreibberechtigung auf GitHub suggerieren, die das Token nicht besitzt.

## Teilschritte
- [x] Dateien als bearbeitbare LaTeX-Dateien oder nicht bearbeitbare Dateien einordnen. **Umgesetzt** — `.tex`, `.latex` und `.ltx` können geöffnet werden.
- [x] Bearbeitbarkeit der Dateien in der Sidebar durch Symbole kenntlich machen. **Umgesetzt**
- [x] Nicht bearbeitbare Dateien in der Sidebar nur mit ihrem Namen aufführen. **Umgesetzt** — ihr Inhalt wird nicht geladen oder angezeigt.

## Abgrenzung
Eine spätere Option zur Anzeige einzelner nicht bearbeitbarer Dateien ist nicht Bestandteil dieser Story und wird bei Bedarf separat spezifiziert.
