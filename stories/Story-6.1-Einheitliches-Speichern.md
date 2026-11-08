# Story 6.1: Einheitliches lokales Speichern und Konfliktauflösung

> **GitHub Issue:** [#26](https://github.com/yasminshendrik/latex_on_ipad/issues/26) — maßgeblicher Status und Tracking. Diese Datei bleibt als Referenzkopie erhalten.

**Gesamtstatus: Umgesetzt**

## Ziel
Ein Repository-Branch wird vollständig lokal verfügbar gemacht und Änderungen werden unabhängig vom Verbindungsstatus lokal gesichert. Der einheitliche Button heißt immer „Speichern“. GitHub-Commits und Pushes sind aus dieser Story ausgegliedert und in [Story 1.8](Story-1.8-GitHub-Commit-und-Push.md) zusammengefasst.

## Anforderungen
- [x] **Repository lokal verfügbar machen** — beim Online-Öffnen alle regulären Dateien des ausgewählten Branches herunterladen und lokal sichern. Git-Submodule, symbolische Links, Git-LFS-Dateien und Dateien über 100 MB werden nicht heruntergeladen und klar gemeldet. **Im Code umgesetzt**
- [x] **Beim Öffnen lokal sichern** — heruntergeladene Dateien sowie ihre Online-Basisversion und Git-SHA im lokalen VFS speichern. **Im Code umgesetzt**
- [x] **Regelmäßig im Hintergrund lokal speichern** — alle drei Minuten sichern; bestehendes Auto-Speichern nach kurzer Inaktivität bleibt aktiv. **Im Code umgesetzt**
- [x] **Einheitlicher Speichern-Button** — unabhängig vom Verbindungsstatus heißt der Button „Speichern“ und sichert lokal. **Im Code umgesetzt**
- [x] **Offline speichern** — ohne Netzwerkzugriff lokal sichern und keinen GitHub-Commit vortäuschen. **Im Code umgesetzt**
- [x] **Konflikte beim erneuten Online-Öffnen** — lokale und geänderte Online-Version vergleichen und die Wahl zwischen lokaler Version, Online-Version und Merge anbieten. **Im Code umgesetzt**
- [x] **Merge** — nicht überlappende Änderungen automatisch zusammenführen; überlappende Änderungen oder zu große Dateien mit Konfliktmarkierungen für manuelle Bearbeitung im Editor öffnen. **Im Code umgesetzt**

## Abnahmekriterien
- Alle unterstützten regulären Repository-Dateien eines Branches sind nach erfolgreichem Online-Öffnen lokal vorhanden.
- Nicht unterstützte Dateiarten werden klar gemeldet und nicht als offline verfügbar ausgegeben.
- Die regelmäßige Sicherung läuft alle drei Minuten, solange Browser und Betriebssystem die App nicht pausieren.
- Die Beschriftung des Speichern-Buttons ist unabhängig vom Online-Status „Speichern“.
- Ein erneutes Öffnen überschreibt lokale Änderungen nicht stillschweigend; bei echten Konflikten kann zwischen lokal, online und Merge gewählt werden.
- Lokal gespeicherte Dateien werden über `baseContent` und den letzten Remote-SHA mit der Online-Version verglichen.

## Abgrenzung
Commit und Push der lokalen Änderungen sind in [Story 1.8](Story-1.8-GitHub-Commit-und-Push.md) gebündelt. Eine automatische Remote-Synchronisierung im Hintergrund oder nach einer späteren Wiederverbindung ist nicht Teil dieser Story. KI-generierte Commit-Nachrichten bleiben Teil des übergeordneten Online-Sync-Backlogs in [Story 6](Story-6-Offline-und-Sync.md).

Browser und Betriebssystem können eine inaktive oder im Hintergrund befindliche App pausieren; während dieser Zeit kann die regelmäßige Sicherung nicht garantiert ausgeführt werden.
