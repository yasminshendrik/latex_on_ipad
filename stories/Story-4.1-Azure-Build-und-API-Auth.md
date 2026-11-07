# Story 4.1: Lokale PDF-Erzeugung

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Ein PDF aus dem LaTeX-Projekt lokal im Browser erzeugen. Dafür soll dieselbe TeX-Engine wie für die Vorschau aus [Story 4](Story-4-Live-Vorschau.md) verwendet werden; ein eigener Backend-Server ist nicht vorgesehen.

## Aktueller Stand
`glyphtex-engine` kompiliert die ausgewählte Hauptdatei mit den lokal verfügbaren Projektdateien im Web Worker. Der Worker liefert bei erfolgreicher Kompilierung die PDF-Daten an die App; PDF.js stellt sie in der Vorschau dar. Ein eigenständiger Weg, das erzeugte PDF außerhalb der Vorschau bereitzustellen, ist nicht implementiert; dessen konkrete Ausgestaltung ist noch nicht festgelegt.

Die Engine und ihr TeX-Bundle müssen für die erste Nutzung geladen werden und stehen nach erfolgreichem Caching offline zur Verfügung. Einschränkungen wie fehlende optionale Paketsets, Biber, Shell-Escape und Systemschriften gelten auch für die PDF-Erzeugung. iPad/Safari ist noch ungetestet und ein vollständiges Lizenzinventar des Bundles liegt nicht vor; Einzelheiten stehen in Story 4.

## Teilschritte
- [x] PDF lokal mit der vorhandenen TeX-Engine und den Projektdateien erzeugen und an die App übergeben. **Im Code umgesetzt**
- [ ] Klären, ob und wie das erzeugte PDF über die Vorschau hinaus genutzt werden soll. **Noch nicht festgelegt**

## Historische Planung
Ursprünglich waren eine Azure Container App mit TeXLive, ein REST-Endpunkt und eine API-Key-Authentifizierung vorgesehen. Dieser serverbasierte Ansatz wird für die lokale PDF-Erzeugung nicht weiterverfolgt.
