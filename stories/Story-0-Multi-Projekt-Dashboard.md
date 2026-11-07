# Story 0: Lokale Projektübersicht & GitHub-Repository-Zugriff

**Gesamtstatus: Umgesetzt**

## Ziel
Beim Start eine Übersicht der lokal verfügbaren Projekte anbieten und den Einstieg in die Arbeit klar von einem Online-Zugriff auf GitHub trennen. Lokal gespeicherte Projekte sollen auch ohne Verbindung weiterbearbeitet werden können. Das Öffnen eines GitHub-Repositories ist ein eigener, ausdrücklich onlineabhängiger Ablauf.

## Technische Komponenten
IndexedDB zur lokalen Speicherung von Projektmetadaten und Dateien; GitHub API für die Online-Repository-Auswahl und gegebenenfalls das Erstellen neuer Repositories.

## Teilschritte
- [x] **0.1 Lokale Projektübersicht als Startbildschirm** — lokal gespeicherte Projekte sichtbar machen und von dort zur lokalen Weiterarbeit öffnen; den Online-Einstieg zum Öffnen eines GitHub-Repositories separat anbieten. **Umgesetzt**
- [x] **0.2 GitHub-Repositories online auswählen und öffnen** — nach dem Login Repositories laden und über die Sidebar erneut auswählen. Dies ist die Online-Auswahl gemäß [Story 0.4](Story-0.4-Repository-Auswahl-und-Baumansicht.md), kein lokales Dashboard. **Im Code umgesetzt**
- [x] **0.3 Neue Repositories über GitHub API initialisieren** — separater Ablauf erstellt ein privates Repository und initialisiert `main.tex`. **Im Code umgesetzt**

## Anmerkung
Die App startet mit einer lokalen Projektübersicht. Dort gespeicherte Projekte lassen sich ohne Netzwerkzugriff öffnen; nur lokal vorhandene Dateien werden angezeigt und geladen. GitHub-Repositories werden über einen separaten Online-Ablauf geöffnet und können zusätzlich über die GitHub API neu erstellt und mit `main.tex` initialisiert werden. Das Erstellen benötigt eine Verbindung und ein Token mit den nötigen GitHub-Berechtigungen; neu erstellte Repositories sind privat.
