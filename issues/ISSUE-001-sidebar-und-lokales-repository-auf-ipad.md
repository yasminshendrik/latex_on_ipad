# ISSUE-001: Sidebar und lokales Repository auf iPad

**Migriert nach:** [GitHub Issue #29](https://github.com/yasminshendrik/latex_on_ipad/issues/29) — dort wird der Status weitergeführt.

**Status:** Nicht reproduziert; iPad/Safari-Prüfung ausstehend  
**Bezug:** [Story 0.5](../stories/Story-0.5-Sidebar-und-lokales-Repository.md)

## Beobachtung

Es wurde gemeldet, dass sich die Sidebar nach dem GitHub-Login nicht öffnen lasse und ein ausgewähltes Remote-Repository anschließend nicht in „Lokale Projekte“ erscheine. Es ist nicht bestätigt, ob der Download scheitert oder der Ablauf an einer anderen Stelle abbricht. Die Meldung ist noch kein bestätigter Produktfehler.

## Erwartetes Verhalten

Ein erfolgreich geöffnetes Repository zeigt den Editor mit bedienbarer Sidebar, wird lokal gespeichert und erscheint in „Lokale Projekte“, von wo es offline erneut geöffnet werden kann.

## Reproduktionsschritte

1. Mit GitHub verbinden.
2. Ein Repository auswählen und öffnen.
3. Sidebar ein- und ausblenden.
4. Zur Übersicht wechseln und das gespeicherte Projekt offline öffnen.

## Bisherige Nachweise

- Automatisierte Tests mit IndexedDB: Repository-Öffnen, Sidebar-Toggle, lokaler Dashboard-Eintrag und Offline-Wiederöffnung erfolgreich.
- Browser-Smoke-Test mit simulierter GitHub-API: gleicher Ablauf erfolgreich; keine echten Zugangsdaten verwendet.
- Portrait-Layout im Browser geprüft.
- iPad/Safari und ein echtes GitHub-Konto wurden nicht geprüft. Daher ist die ursprüngliche Meldung dort weder bestätigt noch widerlegt.

## Nächster Prüfschritt

Die Reproduktionsschritte auf iPad/Safari mit einem geeigneten Test-Repository ausführen und Ergebnis, App-Version sowie Browser-Version hier dokumentieren.
