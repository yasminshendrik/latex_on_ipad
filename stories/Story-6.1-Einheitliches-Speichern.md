# Story 6.1: Einheitliches Speichern online und offline

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Dateien sollen unabhängig vom Verbindungsstatus über denselben Speichern-Button gesichert werden. Die lokale Speicherung bleibt die Grundlage; bei bestehender Verbindung wird sie beim manuellen Speichern mit einem GitHub-Commit verbunden.

## Anforderungen
- [ ] **Nach dem Öffnen eines Repositories lokal speichern** — alle regulären Dateien des geöffneten Repository-Branches für die Offline-Nutzung herunterladen und lokal sichern. Git-Submodule und Git LFS müssen zunächst nicht unterstützt werden; solche Fälle sind klar zu melden.
- [x] **Regelmäßig im Hintergrund lokal speichern** — alle drei Minuten automatisch lokal sichern, ohne dass eine manuelle Aktion erforderlich ist. Das bereits vorhandene lokale Auto-Speichern nach kurzer Inaktivität bleibt bestehen. **Im Code umgesetzt**
- [ ] **Einheitlicher Speichern-Button** — unabhängig davon, ob die App online oder offline ist, gibt es nur einen Button mit der Beschriftung „Speichern“.
- [ ] **Online speichern** — der Speichern-Button sichert lokal und überträgt die Änderungen in einem Vorgang mit einem Commit zu GitHub. Die Commit-Nachricht wird beim Speichern eingegeben.
- [ ] **Offline speichern** — derselbe Button sichert lokal; ohne Internetverbindung wird kein GitHub-Commit versucht.
- [ ] **Konflikte beim erneuten Öffnen** — bei abweichenden lokalen und Online-Änderungen den Konflikt anzeigen und die Wahl zwischen lokaler Version, Online-Version und Merge anbieten. Merge soll automatisch zusammenführen; nicht automatisch lösbare Konflikte werden manuell bearbeitet.

## Abnahmekriterien
- Nach dem Öffnen eines Repositories sind alle regulären Dateien des geöffneten Branches lokal vorhanden. Git-Submodule und Git-LFS-Dateien werden, solange sie nicht unterstützt sind, deutlich gemeldet.
- Änderungen werden auch bei längerer Bearbeitung ohne manuelles Speichern wiederkehrend lokal gesichert.
- Der Speichern-Button und seine Beschriftung ändern sich nicht abhängig vom Online-Status.
- Online führt ein Speichervorgang lokale Sicherung und GitHub-Commit mit eingegebener Commit-Nachricht aus; Fehler beim Remote-Speichern werden sichtbar angezeigt und die lokale Kopie bleibt erhalten.
- Offline führt der Speichern-Button eine lokale Sicherung aus und zeigt keinen Erfolg für einen GitHub-Commit an.
- Bei einem Konflikt beim erneuten Öffnen kann zwischen lokaler und Online-Version oder einem automatischen Merge mit manueller Bearbeitung nicht lösbarer Konflikte gewählt werden.

## Abgrenzung
Die Anforderungen führen keine automatische Remote-Synchronisierung im Hintergrund oder nach einer späteren Wiederverbindung ein. Die bestehende Sync-Queue und KI-generierte Commit-Messages bleiben Teil der übergeordneten [Story 6](Story-6-Offline-und-Sync.md).

Browser und Betriebssystem können eine inaktive oder im Hintergrund befindliche App pausieren; während dieser Zeit kann die regelmäßige Sicherung nicht garantiert ausgeführt werden.
