# Story 0: Multi-Projekt-Dashboard & Startbildschirm

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Eine zentrale Projektübersicht beim Start der App, um zwischen mehreren LaTeX-Repositories zu wechseln, bestehende Repositories hinzuzufügen oder neue anzulegen.

## Technische Komponenten
IndexedDB zur lokalen Speicherung der Projekt-Metadaten; GitHub API zum Abrufen und Erstellen von Repositories.

## Teilschritte
- [ ] **0.1 Startbildschirm / Dashboard-UI** — Visuelle Kartenansicht aller gespeicherten Projekte. **Ausstehend**
- [x] **0.2 Projekte hinzufügen / auswählen** — `owner/repo` per Prompt eingeben und im `localStorage` speichern. **Umgesetzt**
- [ ] **0.3 Neue Repositories über GitHub API initialisieren** — Repository inklusive initialer `main.tex` automatisch anlegen. **Ausstehend**
