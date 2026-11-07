# Story 3: Client-seitiges Linting

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Fehler im Editor während der Bearbeitung ohne Netzwerkzugriff erkennen und anzeigen. Auf Wunsch der Nutzerin wird anstelle des ursprünglich vorgesehenen TexLab-WASM-Builds eine browserfähige Alternative eingesetzt.

## Technische Komponenten
Ein lokal ausgelieferter Web Worker mit dem MIT-lizenzierten Parser `@unified-latex/unified-latex-util-pegjs`; `monaco.editor.setModelMarkers` im Monaco-Editor und eine Hinweisliste auch im Offline-Texteditor.

## Teilschritte
- [x] Browserfähige Alternative untersuchen und Parser lokal in einen Web Worker einbinden. **Im Code umgesetzt**
- [x] Editoränderungen und Dateiwechsel mit dem Worker verbinden; veraltete Ergebnisse verwerfen. **Im Code umgesetzt**
- [x] Nicht geschlossene oder unerwartete geschweifte Klammern, einfache Mathematikbegrenzungen und Umgebungen mit Positionen anzeigen. **Im Code umgesetzt**
- [x] Diagnosehinweise im Texteditor und als Monaco-Marker anzeigen; Worker offline verfügbar halten. **Im Code umgesetzt**
- [ ] Umfangreichere LaTeX- und projektbezogene Fehlerdiagnosen untersuchen und umsetzen. **Ausstehend**
- [x] Diagnosen aus der lokalen Kompilierung des Projekts ergänzen. Die Kompilierung wird bei automatischer und manueller lokaler Speicherung sowie beim Öffnen der Vorschau ausgelöst; die Hauptdatei ist im Projekt auswählbar, zunächst wird `main.tex` vorgeschlagen. Ergebnisse erscheinen in einer Liste, Monaco-Marker nur bei vorhandener Ortsangabe. **Im Code umgesetzt; im Desktop-Chrome geprüft, auf iPad/Safari nicht**

## Grenzen
Die Compilerdiagnosen stammen aus der lokalen Engine (`glyphtex-engine`, siehe Story 4). Nicht jede Diagnose enthält Datei und Zeile (z. B. „Undefined control sequence“ im Test ohne Ort). Die erste Kompilierung benötigt Internet, um die Engine-Dateien in den Cache zu laden.

Die Prüfung arbeitet auf der aktuell geöffneten Datei und ist keine TeX-Kompilierung. Sie kann weder alle gültigen TeX-Konstrukte noch Paket-, Makro-, Referenz- oder projektübergreifende Fehler zuverlässig beurteilen; ihre Hinweise können bei komplexem TeX unvollständig oder fehlerhaft sein. Keine angezeigten Hinweise bedeuten nicht, dass das Dokument kompilierbar ist. Der ursprüngliche TexLab-Ansatz wurde nicht umgesetzt; zum Zeitpunkt der Untersuchung enthielten die offiziellen TexLab-Releases keinen Browser-WASM-Build.
