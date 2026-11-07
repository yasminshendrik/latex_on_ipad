# Story 2: Virtuelles Dateisystem (VFS) & Monaco Editor

**Gesamtstatus: Umgesetzt**

## Ziel
Ein lokales virtuelles Dateisystem im Browser (IndexedDB) und der Monaco Editor für Multi-File-LaTeX-Projekte.

## Technische Komponenten
IndexedDB (`LaTeXPWA_VFS`), Monaco Editor, Auto-Save.

## Teilschritte
- [x] IndexedDB-Struktur für VFS — IndexedDB speichert Projektmetadaten und Dateien mit Repo-, Branch- und Pfadzuordnung. **Umgesetzt**
- [x] Monaco Editor — Monaco wird bei verfügbarer Verbindung geladen; im Offline-Modus bleibt der lokale Texteditor verwendbar. Änderungen werden automatisch lokal gespeichert. **Umgesetzt mit Offline-Fallback**
- [x] Multi-File-Ansicht und Dateibaum-Navigation — Remote-Dateien können geladen und lokal im VFS bearbeitet werden. **Umgesetzt**
