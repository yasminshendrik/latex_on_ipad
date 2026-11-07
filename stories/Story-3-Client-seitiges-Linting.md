# Story 3: Client-seitiges Linting

**Gesamtstatus: Abgeschlossen für den akzeptierten Umfang**

## Ziel
Fehler im Editor während der Bearbeitung ohne Netzwerkzugriff erkennen und anzeigen. Auf Wunsch der Nutzerin wird anstelle des ursprünglich vorgesehenen TexLab-WASM-Builds eine browserfähige Alternative eingesetzt. Zusätzlich liefert die lokale Projektkompilierung Diagnosen.

## Technische Komponenten
Ein lokal ausgelieferter Web Worker mit dem MIT-lizenzierten Parser `@unified-latex/unified-latex-util-pegjs` prüft die aktive Datei. Ein weiterer Worker kompiliert das lokale Projekt mit `glyphtex-engine`; beide Ergebnisse werden als Hinweise angezeigt, soweit möglich auch mit `monaco.editor.setModelMarkers`.

## Teilschritte
- [x] Browserfähige Alternative untersuchen und Parser lokal in einen Web Worker einbinden. **Im Code umgesetzt**
- [x] Editoränderungen und Dateiwechsel mit dem Worker verbinden; veraltete Ergebnisse verwerfen. **Im Code umgesetzt**
- [x] Nicht geschlossene oder unerwartete geschweifte Klammern, einfache Mathematikbegrenzungen und Umgebungen mit Positionen anzeigen. **Im Code umgesetzt**
- [x] Diagnosehinweise im Texteditor und als Monaco-Marker anzeigen; Worker offline verfügbar halten. **Im Code umgesetzt**
- [x] Umfangreichere LaTeX- und projektbezogene Fehlerdiagnosen untersuchen und umsetzen. **Teilweise umgesetzt; aktueller Umfang von der Nutzerin/vom Nutzer akzeptiert** — die Projektkompilierung liefert zusätzliche Fehler und Warnungen; eine umfassende Diagnose ist nicht nachgewiesen und für den Abschluss nicht erforderlich.
- [x] Diagnosen aus der lokalen Kompilierung des Projekts ergänzen. Die Kompilierung wird bei automatischer und manueller lokaler Speicherung sowie beim Öffnen der Vorschau ausgelöst; die Hauptdatei ist im Projekt auswählbar, zunächst wird `main.tex` vorgeschlagen. Ergebnisse erscheinen in einer Liste, Monaco-Marker nur bei vorhandener Ortsangabe. **Im Code umgesetzt; im Desktop-Chrome geprüft, auf iPad/Safari nicht**

Die Wiederholung der Fehlererkennung auf iPad/Safari ist im [finalen Integrationstestplan](../tests/INTEGRATION_TEST_PLAN.md) vorgesehen und keine Bedingung für den Abschluss dieser Story.

## Grenzen
Die Syntaxprüfung läuft nach Änderungen in der aktiven Datei; die Projektkompilierung dagegen beim lokalen Speichern und beim Öffnen der Vorschau, nicht unmittelbar bei jeder Eingabe. Compilerdiagnosen stammen aus der lokalen Engine (`glyphtex-engine`, siehe Story 4). Die Liste zeigt höchstens 50 Fehler und Warnungen; Marker erscheinen nur bei passender aktiver Datei und vorhandener Zeile. Nicht jede Diagnose enthält Datei und Zeile (z. B. „Undefined control sequence“ im Test ohne Ort). Die erste Kompilierung benötigt Internet, um die Engine-Dateien in den Cache zu laden.

Die parserbasierte Syntaxprüfung arbeitet nur auf der aktuell geöffneten Datei und ist keine TeX-Kompilierung. Sie kann weder alle gültigen TeX-Konstrukte noch Paket-, Makro-, Referenz- oder projektübergreifende Fehler zuverlässig beurteilen; ihre Hinweise können bei komplexem TeX unvollständig oder fehlerhaft sein. Auch die Compilerdiagnosen sind durch die verfügbare Engine und Paketbasis begrenzt. Keine angezeigten Hinweise bedeuten nicht, dass das Dokument fehlerfrei ist. Der ursprüngliche TexLab-Ansatz wurde nicht umgesetzt; zum Zeitpunkt der Untersuchung enthielten die offiziellen TexLab-Releases keinen Browser-WASM-Build.
