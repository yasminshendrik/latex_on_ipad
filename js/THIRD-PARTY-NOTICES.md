# Hinweise zu Drittkomponenten für die lokale Kompilierung und PDF-Vorschau

Diese Komponenten werden nicht vom Projekt selbst entwickelt. Sie werden beim Veröffentlichen aus den npm-Paketen kopiert und nicht in das Repository eingecheckt (`npm run build:assets`).

## glyphtex-engine 0.1.4

- Herkunft: <https://github.com/kanakkholwal/glyphtex/tree/main/packages/tex-engine>
- Lizenz des Pakets: MIT (`js/engine/LICENSE-glyphtex-engine.txt`).
- Enthält `tectonic_wasm.wasm`, eine WebAssembly-Portierung von Tectonic/XeTeX, sowie das TeX-Bundle `tectonic-bundle.tar.gz` mit Formatdatei, Klassen, Paketen, Schriften und Unicode-Tabellen aus einer TeX-Live-Distribution.
- Tectonic wird vom Tectonic-Projekt unter der MIT-Lizenz veröffentlicht; die abgeleiteten Bestandteile (u. a. XeTeX, xdvipdfmx, Bibliotheken) haben teils eigene, freie Lizenzen.
- Die TeX-Dateien im Bundle tragen ihre jeweiligen Lizenzvermerke in den Dateikopfzeilen. Eine Stichprobe des Bundles ergab überwiegend Dateien unter der LaTeX Project Public License (LPPL); das Bundle enthält außerdem Schriften (u. a. Computer Modern, Latin Modern) mit eigenen Lizenzen. Ein vollständiges, geprüftes Lizenzverzeichnis für alle rund 1.400 Dateien liegt dem Paket nicht bei und wurde nicht erstellt. Die Weitergabe erfolgt unverändert; die Lizenzvermerke in den Dateien bleiben erhalten.

## PDF.js (pdfjs-dist 6.5.438, Legacy-Build)

- Herkunft: <https://github.com/mozilla/pdf.js>
- Lizenz: Apache-2.0 (`js/pdfjs/LICENSE-pdfjs.txt`).
- Dient der lokalen Darstellung des erzeugten PDFs im Canvas.

## @unified-latex/unified-latex-util-pegjs 1.8.4

- Lizenz: MIT (`js/UNIFIED-LATEX-LICENSE.txt`).
