# Story 4: Projektbezogene Live-Vorschau

**Gesamtstatus: Ausstehend**

## Ziel
Eine Live-Vorschau des gesamten aktuell im Editor geöffneten LaTeX-Dokuments bereitstellen. Dabei soll das gesamte Projekt berücksichtigt werden; die Vorschau ist nicht auf mathematische Formeln beschränkt.

## Technische Einordnung
Die technische Umsetzung und ihre Grenzen sind noch zu untersuchen. KaTeX kann Formeln darstellen, erfüllt aber für sich allein nicht die Anforderung einer projektbezogenen Vorschau des gesamten Dokuments. Die App bleibt offline-first und benötigt für diese Funktion keinen eigenen Backend-Server.

## Teilschritte
- [ ] Eine geeignete clientseitige Umsetzung für die projektbezogene Dokumentvorschau untersuchen. **Ausstehend**
- [ ] Das aktuell geöffnete Dokument unter Berücksichtigung des Projekts als Live-Vorschau darstellen. **Ausstehend**

## Abgrenzung
Die frühere Beschreibung als reine KaTeX-Formelvorschau wurde durch die Anforderung einer Vorschau des gesamten Dokuments ersetzt. Das vorhandene Vorschau-Panel und seine Bedienung sind in [Story 4.2](Story-4.2-Responsive-PDF-Vorschau.md) beschrieben; eine konkrete Ausgabeform oder Kompilierungstechnik ist für diese Story noch nicht festgelegt.
