# Story 0.5: Sidebar und lokale Projektübernahme nach GitHub-Zugriff

**Gesamtstatus: Ausstehend**

## Meldung
Nach dem Login lässt sich die Sidebar laut Nutzerin/Nutzer nicht öffnen. Ein ausgewähltes Remote-Projekt erscheint außerdem nicht als lokales Projekt. Die Ursache und ein möglicher Zusammenhang der beiden Beobachtungen sind noch nicht geklärt.

Die Nutzerin/der Nutzer vermutet, dass der Download nach der Auswahl eines Projekts im Repository-Popup nach dem Login nicht mehr funktioniert. Ob der Download scheitert oder der Ablauf an einer anderen Stelle stehen bleibt, ist noch nicht bestätigt.

## Sollzustand
- [ ] Sidebar nach GitHub-Login und beim Öffnen eines Projekts untersuchen und so herstellen, dass sie sich im Editor öffnen lässt. **Ausstehend**
- [ ] Untersuchen und beheben, weshalb ein ausgewähltes Remote-Repository nicht als lokales Projekt erscheint. Nach erfolgreichem Öffnen sollen die unterstützten Dateien lokal verfügbar sein und das Projekt in der Übersicht „Lokale Projekte“ zur Auswahl stehen. **Ausstehend**

## Einordnung
Die Projektübersicht ist der Startbildschirm und über „Übersicht“ erreichbar. Die Sidebar liegt im Editor, nicht im Dashboard. Laut Code werden nach Auswahl eines Repositories zunächst Branches und Dateien geladen und lokal gespeichert; erst nach erfolgreichem Abschluss öffnet sich der Editor. Ein Abbruch davor könnte daher beide Beobachtungen erklären. Ob dies im gemeldeten Ablauf geschieht, ist nicht nachgewiesen. Die Meldung ergänzt die umgesetzten Stories [0](Story-0-Multi-Projekt-Dashboard.md), [2.1](Story-2.1-Responsive-UI-und-Sidebar.md) und [6.1](Story-6.1-Einheitliches-Speichern.md), ohne deren ursprüngliche Historie zu überschreiben.
