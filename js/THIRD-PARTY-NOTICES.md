# Hinweise zu Drittkomponenten für die lokale Kompilierung und PDF-Vorschau

Diese Komponenten werden nicht vom Projekt selbst entwickelt. Sie werden beim Veröffentlichen aus den npm-Paketen kopiert und nicht in das Repository eingecheckt (`npm run build:assets`).

## glyphtex-engine 0.1.4

- Herkunft: <https://github.com/kanakkholwal/glyphtex/tree/main/packages/tex-engine>
- Lizenz des Pakets: MIT (`js/engine/LICENSE-glyphtex-engine.txt`).
- Enthält `tectonic_wasm.wasm`, eine WebAssembly-Portierung von Tectonic/XeTeX, sowie das TeX-Bundle `tectonic-bundle.tar.gz` mit Formatdatei, Klassen, Paketen, Schriften und Unicode-Tabellen aus einer TeX-Live-Distribution.
- Tectonic wird vom Tectonic-Projekt unter der MIT-Lizenz veröffentlicht; die abgeleiteten Bestandteile (u. a. XeTeX, xdvipdfmx, Bibliotheken) haben teils eigene, freie Lizenzen.
- Laut [README der Originalversion 0.1.4](https://github.com/kanakkholwal/glyphtex/blob/tex-engine-v0.1.4/packages/tex-engine/README.md#licence) stehen die TeX-Live-Pakete im Bundle unter ihren eigenen freien Lizenzen; die MIT-Angabe des Engine-Pakets ist keine pauschale Lizenzangabe für deren Inhalte.
- Das [Build-Skript des Originals](https://github.com/kanakkholwal/glyphtex/blob/tex-engine-v0.1.4/packages/tex-engine/scripts/build-bundle.mjs) entnimmt Dateien einer lokalen TeX-Live-Installation. Das mitgelieferte [Bundle-Manifest](https://github.com/kanakkholwal/glyphtex/blob/tex-engine-v0.1.4/packages/tex-engine/bundle-manifest.json) beschreibt Paketgruppen und Dateien, aber keine vollständigen Lizenzen und Urheberangaben.
- Das ausgelieferte Archiv enthält 1.467 Einträge; bei der Prüfung wurden keine separat benannten Lizenzdateien im Archiv gefunden. Beispielsweise enthalten `article.cls` und `amsmath.sty` LPPL-Vermerke in ihren Dateiköpfen. Andere Dateien, insbesondere Schriften und generierte Binärdateien, können eigene Lizenzen oder an anderer Stelle dokumentierte Lizenzbedingungen haben; nicht alle Lizenzangaben wurden geprüft.
- Ein vollständiges, geprüftes Lizenz- und Herkunftsinventar für das ursprüngliche Bundle wurde weder im untersuchten Paket noch in den genannten Originalunterlagen gefunden und hier nicht erstellt. Das Format und die Sprachkonfiguration werden beim Build mit den unten aufgeführten deutschen Trennmustern neu erzeugt; die anderen enthaltenen Dateien stammen aus dem npm-Paket. Die Recherche ist keine rechtliche Bewertung oder Bestätigung, dass sämtliche Weitergabepflichten erfüllt sind.

## Deutsche Silbentrennungsmuster

- Die Dateien `hyph-de-1996.tex` und `loadhyph-de-1996.tex` stammen aus der [festgelegten TeX-Live-Revision](https://github.com/deepin-community/texlive-lang/tree/365ad220d93cc3bd03d103a89b061564a3891fe1/texmf-dist/tex/generic/hyph-utf8). Sie werden beim Build anhand ihrer Git-Blob-Prüfsummen geprüft und im Engine-Archiv mitgeliefert.
- Die Trennmuster der Deutschsprachigen Trennmustermannschaft stehen unter der MIT-Lizenz; Urheber- und Lizenztext sind in `hyph-de-1996.tex` enthalten. Der Loader enthält den Urheberrechts- und Erlaubnisvermerk der TeX Users Group.

## KOMA-Script 3.43 (TeX Live, 2024-10-24)

- Herkunft: <https://github.com/deepin-community/texlive-base/tree/3b530356bc4630a7a13bf6f6af00c864f17e9a33/texmf-dist/tex/latex/koma-script>.
- Lizenz: LPPL 1.3c. Die Quelldistribution enthält die Lizenzdatei `texmf-dist/doc/latex/koma-script/lppl.txt`, die dem ausgelieferten Paketarchiv als `LPPL.txt` beigefügt wird.
- Das Paket wird beim Asset-Build aus einer festgelegten Revision geladen; alle enthaltenen Laufzeitdateien und die Lizenzdatei werden vor der Archivierung gegen die im `scripts/koma-script-pack.json` festgehaltenen Git-Blob-Prüfsummen geprüft.
- Die App lädt das Paket erst nach ausdrücklicher Zustimmung und prüft zusätzlich Größe und SHA-256, bevor sie es lokal speichert.

## Babel-Sprachdaten

- Herkunft: <https://github.com/deepin-community/texlive-base/tree/3b530356bc4630a7a13bf6f6af00c864f17e9a33/texmf-dist/tex/generic/babel>. Die Liste der Quelldateien und ihre Git-Blob-Prüfsummen stehen in `scripts/babel-packs.json`.
- `nil.ldf` und `babel-ngerman.tex` gehören zu Babel (LPPL 1.3 oder später). Die deutschen `.ini`-Daten nennen zusätzlich Daten aus dem Unicode Common Locale Data Repository. Beide Archive enthalten den LPPL-Lizenztext; das deutsche Archiv enthält zusätzlich den [Unicode-Lizenztext](https://github.com/unicode-org/cldr/blob/f800890ea86482c2eb5f73224897f4a8bc0b653a/unicode-license.txt), dessen Git-Blob-Prüfsumme ebenfalls beim Build geprüft wird.

## PDF.js (pdfjs-dist 6.5.438, Legacy-Build)

- Herkunft: <https://github.com/mozilla/pdf.js>
- Lizenz: Apache-2.0 (`js/pdfjs/LICENSE-pdfjs.txt`).
- Dient der lokalen Darstellung des erzeugten PDFs im Canvas.

## SAP Icons (SAP Theming Base Content)

- Herkunft: [SAP/theming-base-content](https://github.com/SAP/theming-base-content), Datei `content/Base/baseLib/baseTheme/fonts/SAP-icons.woff2`, Revision `b8dc6f16557e5b4b3dc4d07e763c8b46178ab9fe`.
- Lizenz: Apache-2.0; der Lizenztext liegt unter `fonts/LICENSE-APACHE-2.0.txt`.
- Die Schrift wird lokal ausgeliefert und beim Installieren des Service Workers gecacht, damit Icons offline verfügbar sind.

## @unified-latex/unified-latex-util-pegjs 1.8.4

- Lizenz: MIT (`js/UNIFIED-LATEX-LICENSE.txt`).
