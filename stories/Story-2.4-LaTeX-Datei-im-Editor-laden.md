# Story 2.4: Ausgewählte LaTeX-Datei im Editor laden

**Status: Im Code umgesetzt**

## Ziel
Wird eine LaTeX-Datei in der Sidebar ausgewählt, soll ihr Inhalt in den Editor geladen werden.

## Teilschritte
- [x] LaTeX-Dateien in der Sidebar auswählbar machen. **Umgesetzt**
- [x] Beim Auswählen einer LaTeX-Datei deren Inhalt in den Editor laden. **Umgesetzt** — zuerst aus dem lokalen VFS, andernfalls online über GitHub; der geladene Inhalt wird lokal gespeichert.
- [x] Die ausgewählte Datei als aktuell im Editor bearbeitete Datei kenntlich machen. **Umgesetzt**

## Abgrenzung
Die Anzeige nicht bearbeitbarer Dateien und ihrer späteren optionalen Vorschau ist in [Story 2.2](Story-2.2-LaTeX-Dateien-und-Schreibbarkeit-in-der-Sidebar.md) abgegrenzt.
