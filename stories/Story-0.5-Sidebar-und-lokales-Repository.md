# Story 0.5: Sidebar und lokale Projektübernahme nach GitHub-Zugriff

**Gesamtstatus: Im Code umgesetzt; iPad/Safari ungetestet**

## Meldung
Nach dem Login lässt sich die Sidebar laut Nutzerin/Nutzer nicht öffnen. Ein ausgewähltes Remote-Projekt erscheint außerdem nicht als lokales Projekt. Die Ursache und ein möglicher Zusammenhang der beiden Beobachtungen sind noch nicht geklärt.

Die Nutzerin/der Nutzer vermutet, dass der Download nach der Auswahl eines Projekts im Repository-Popup nach dem Login nicht mehr funktioniert. Ob der Download scheitert oder der Ablauf an einer anderen Stelle stehen bleibt, ist noch nicht bestätigt.

## Sollzustand
- [x] Sidebar nach GitHub-Login und beim Öffnen eines Projekts untersuchen und so herstellen, dass sie sich im Editor öffnen lässt. **Im Code umgesetzt; Toggle-Verhalten automatisiert geprüft**
- [x] Untersuchen und beheben, weshalb ein ausgewähltes Remote-Repository nicht als lokales Projekt erscheint. Nach erfolgreichem Öffnen sollen die unterstützten Dateien lokal verfügbar sein und das Projekt in der Übersicht „Lokale Projekte“ zur Auswahl stehen. **Im Code umgesetzt; GitHub-Öffnen, IndexedDB-Speicherung, Dashboard-Eintrag und Offline-Wiederöffnung automatisiert geprüft**

## Einordnung
Die Projektübersicht ist der Startbildschirm und über „Übersicht“ erreichbar. Die Sidebar liegt im Editor, nicht im Dashboard. Beim erfolgreichen Öffnen werden unterstützte Branch-Dateien und Projektmetadaten gespeichert; das Projekt erscheint danach in „Lokale Projekte“ und kann ohne Netzwerk aus IndexedDB erneut geöffnet werden. Regressionstests prüfen diesen Ablauf einschließlich Sidebar-Toggle und Offline-Wiederöffnung. Die ursprünglich gemeldete Störung ließ sich in diesen automatisierten Tests nicht reproduzieren; eine Prüfung auf iPad/Safari steht aus. Die Meldung ergänzt die umgesetzten Stories [0](Story-0-Multi-Projekt-Dashboard.md), [2.1](Story-2.1-Responsive-UI-und-Sidebar.md) und [6.1](Story-6.1-Einheitliches-Speichern.md), ohne deren ursprüngliche Historie zu überschreiben.
