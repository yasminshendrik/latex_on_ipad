# Story 4: Projektbezogene Live-Vorschau

> **GitHub Issue:** [#21](https://github.com/yasminshendrik/latex_on_ipad/issues/21) — maßgeblicher Status und Tracking. Diese Datei bleibt als Referenzkopie erhalten.

**Gesamtstatus: Im Code umgesetzt; iPad/Safari ungetestet**

## Ziel
Eine Live-Vorschau des gesamten aktuell im Editor geöffneten LaTeX-Dokuments bereitstellen. Dabei soll das gesamte Projekt berücksichtigt werden; die Vorschau ist nicht auf mathematische Formeln beschränkt.

## Technische Einordnung
KaTeX kann Formeln darstellen, erfüllt aber für sich allein nicht die Anforderung einer projektbezogenen Vorschau des gesamten Dokuments. Die App bleibt offline-first und benötigt für diese Funktion keinen eigenen Backend-Server.

Ein möglicher Kandidat ist [SwiftLaTeX](https://github.com/SwiftLaTeX/SwiftLaTeX): Die Engine läuft laut Projekt im Browser und unterstützt Dateien in einem virtuellen Dateisystem. Das Projekt steht unter AGPL-3.0; benötigte TeX-Dateien werden standardmäßig über CTAN oder einen Server nachgeladen. Ob eine geeignete Paketbasis vollständig lokal bereitgestellt werden kann und die Lizenz für dieses Projekt akzeptiert wird, ist noch nicht geklärt. Der verfügbare Release enthält Engine-Dateien, aber keine vollständige TeX-Distribution. Eine Integration oder Offline-Kompatibilität mit konkreten Projekten ist noch nicht nachgewiesen.

Gewählt wurde [glyphtex-engine](https://github.com/kanakkholwal/glyphtex/tree/main/packages/tex-engine), eine Tectonic-/XeTeX-Portierung für WebAssembly. Die Engine bietet Dateien im virtuellen Dateisystem, Binärdaten, PDF-Ausgabe und Compilerdiagnosen. Ein isolierter lokaler Node-Test mit Version 0.1.4 erzeugte ein PDF aus einem Hauptdokument mit eingebundener TeX-Datei und PDF-Grafik ohne Netzwerkzugriff. Das Verhalten auf iPad/Safari und eine vollständige Lizenz- und Paketprüfung sind nicht nachgewiesen.

Das Build-Skript des Herstellers stellt das Bundle aus einer lokalen TeX-Live-Installation zusammen. Das Original nennt für die TeX-Live-Pakete eigene Lizenzen; ein vollständiges Lizenz- und Herkunftsverzeichnis für das konkrete veröffentlichte Bundle wurde nicht gefunden. Die Recherche und ihre Grenzen sind in `js/THIRD-PARTY-NOTICES.md` dokumentiert.

Für eine projektbezogene Vorschau müssen außerdem alle benötigten Projektdateien einschließlich Bildern binärtreu vorliegen. Der Repository-Download unterstützt inzwischen Binärdateien; die Bildverarbeitung über die lokale Kopie ist im Browser noch nicht nachgewiesen.

## Umsetzung
Gewählt wurde `glyphtex-engine` 0.1.4 (exakt gepinnt, WASM im Web Worker `js/tex-worker.js`); PDF-Anzeige als Canvas über PDF.js 6.5.438 (Apache-2.0), da native PDF-iframes auf iOS eingeschränkt sind. SwiftLaTeX wurde wegen AGPL und Nachladen von TeX-Dateien verworfen. Engine, Bundle (~20 MB) und PDF.js werden nicht eingecheckt, sondern im Pages-Workflow per `npm run build:assets` aus den npm-Paketen erzeugt. Der Service Worker legt sie beim ersten Gebrauch in einen eigenen Cache (`latex-assets-v1`); danach ist die Kompilierung offline möglich (im Desktop-Chrome mit echtem Service Worker geprüft). Repository-Downloads speichern Binärdateien (z. B. Bilder) binärtreu in IndexedDB.

Kompiliert wird bei jedem automatischen oder manuellen lokalen Speichern (nur bei geändertem Stand) und beim Öffnen der Vorschau. Die Hauptdatei ist im Projekt auswählbar; `main.tex` wird vorgeschlagen, ohne `main.tex` und ohne Auswahl wird nichts geraten.

## Grenzen
- iPad/Safari ist ungetestet.
- Ein vollständiges Lizenzinventar des TeX-Bundles liegt nicht vor (siehe `js/THIRD-PARTY-NOTICES.md`).
- Keine optionalen Paketsets, kein Biber, kein Shell-Escape, keine Systemschriften.
- Die erste Kompilierung benötigt Internet; Binärdateien werden nur mit verfügbarer IndexedDB gespeichert.
- Die Engine läuft synchron im Worker; Kompilierungen haben ein Zeitlimit von drei Minuten.

## Teilschritte
- [x] Eine geeignete clientseitige Umsetzung für die projektbezogene Dokumentvorschau untersuchen. **Umgesetzt (glyphtex-engine)**
- [x] Die Hauptdatei im Projekt auswählbar machen und zunächst `main.tex` vorschlagen. **Im Code umgesetzt**
- [x] Das Projekt bei automatischer und manueller lokaler Speicherung sowie beim Öffnen der Vorschau lokal kompilieren. **Im Code umgesetzt**
- [x] Das aktuell geöffnete Dokument unter Berücksichtigung des Projekts als Live-Vorschau darstellen. **Im Code umgesetzt; Mehrdatei-Projekt mit Grafik nur im isolierten Node-Test geprüft**
- [ ] Vorschau und Kompilierung auf iPad/Safari prüfen. **Ausstehend**
- [x] Lizenzangaben des Original-Bundles recherchieren und Ergebnis dokumentieren. **Erledigt** — ein vollständiges Lizenzinventar wurde nicht gefunden und nicht erstellt; dies ist keine Lizenzfreigabe.

## Abgrenzung
Das Vorschau-Panel und seine Bedienung sind in [Story 4.2](Story-4.2-Responsive-PDF-Vorschau.md) beschrieben.
