# Story 0: Multi-Projekt-Dashboard & Startbildschirm

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Eine zentrale Projektübersicht beim Start der App, um zwischen mehreren LaTeX-Repositories zu wechseln, bestehende Repositories hinzuzufügen oder neue anzulegen.

## Technische Komponenten
IndexedDB zur lokalen Speicherung der Projekt-Metadaten; GitHub API zum Abrufen und Erstellen von Repositories.

## Teilschritte
- [ ] **0.1 Startbildschirm / Dashboard-UI** — visuelle Kartenansicht aller gespeicherten Projekte. **Ausstehend**
- [x] **0.2 Projekte auswählen** — Repository-Auswahl nach Login und über die Sidebar; Metadaten werden lokal gespeichert. Siehe [Story 0.4](Story-0.4-Repository-Auswahl-und-Baumansicht.md). **Umgesetzt**
- [ ] **0.3 Neue Repositories über GitHub API initialisieren** — automatisch ein Repo inklusive `main.tex` anlegen. **Ausstehend**

## Anmerkung
Der aktuelle Code hat die Auswahl und lokale Speicherung, aber noch kein echtes Dashboard und keine projektweite Initialisierung. Die Auswahl erfordert eine GitHub-Verbindung.
