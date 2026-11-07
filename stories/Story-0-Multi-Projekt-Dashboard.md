# Story 0: Lokale Projektübersicht & GitHub-Repository-Zugriff

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Beim Start eine Übersicht der lokal verfügbaren Projekte anbieten und den Einstieg in die Arbeit klar von einem Online-Zugriff auf GitHub trennen. Lokal gespeicherte Projekte sollen auch ohne Verbindung weiterbearbeitet werden können. Das Öffnen eines GitHub-Repositories ist ein eigener, ausdrücklich onlineabhängiger Ablauf.

## Technische Komponenten
IndexedDB zur lokalen Speicherung von Projektmetadaten und Dateien; GitHub API für die Online-Repository-Auswahl und gegebenenfalls das Erstellen neuer Repositories.

## Teilschritte
- [ ] **0.1 Lokale Projektübersicht als Startbildschirm** — lokal gespeicherte Projekte sichtbar machen und von dort zur lokalen Weiterarbeit öffnen; den Online-Einstieg zum Öffnen eines GitHub-Repositories separat anbieten. **Ausstehend**
- [x] **0.2 GitHub-Repositories online auswählen und öffnen** — nach dem Login Repositories laden und über die Sidebar erneut auswählen. Dies ist die Online-Auswahl gemäß [Story 0.4](Story-0.4-Repository-Auswahl-und-Baumansicht.md), kein lokales Dashboard. **Im Code umgesetzt**
- [ ] **0.3 Neue Repositories über GitHub API initialisieren** — optionaler, separater Ablauf zum Erstellen eines Repositories inklusive `main.tex`. **Ausstehend**

## Anmerkung
Die App startet derzeit direkt im Editor. Nach dem Öffnen eines Repositories werden dessen Metadaten lokal gespeichert; eine Übersicht, die lokal gespeicherte Projekte beim Start aufführt und deren Offline-Weiterarbeit ermöglicht, ist noch nicht implementiert. Die GitHub-Repository-Liste wird online geladen und benötigt eine Verbindung sowie ein gültiges Token. Das Erstellen und Initialisieren eines neuen Repositories bleibt unabhängig von der lokalen Projektübersicht.
