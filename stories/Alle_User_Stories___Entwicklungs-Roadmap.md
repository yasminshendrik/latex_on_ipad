# User Stories, Entwicklungs-Roadmap & Statusübersicht

Diese Datei ist die zentrale Statusübersicht. Detailanforderungen und Teilschritte stehen in den verlinkten Story-Dateien. Statusangaben müssen dem tatsächlich implementierten Code entsprechen. Der PAT-Login ist für den aktuellen Umfang gemäß Story 1.6 akzeptiert; weitere reproduzierbare Integrationstests stehen im Testplan.

## Gesamtübersicht

| Story | Thema | Status | Hinweise |
|---|---|---|---|
| [0](Story-0-Multi-Projekt-Dashboard.md) | Lokale Projektübersicht & GitHub-Repository-Zugriff | Umgesetzt | Lokale Projekte offline öffnen; GitHub-Repositories online öffnen und privat mit `main.tex` initialisieren |
| [0.4](Story-0.4-Repository-Auswahl-und-Baumansicht.md) | Repository-Auswahl und Baumansicht | Im Code umgesetzt | Auswahl nach Login; LaTeX-Dateien sind gesondert auswählbar |
| [1 & 1.1](Story-1-GitHub-Auth-und-Sync.md) | GitHub Auth & Repository-Abruf | Abgeschlossen | Story 1.1 (OAuth) abgelöst; PAT-Login und Repository-/Dateizugriff umgesetzt. Commit/Push liegt ausschließlich in Story 1.8 |
| 1.4 | Branching & Switching | Teilweise umgesetzt | Branches laden und wechseln; Branch-Erstellung fehlt |
| [1.5](Story-1.5-Azure-Static-Web-Apps-Idee.md) | Azure Static Web Apps als spätere Architekturidee | Backlog-Idee | Hosting der PWA und Token-Austausch über Azure Function prüfen; Backend-Abweichung noch nicht beschlossen |
| [1.6](Story-1.6-Fine-grained-PAT-Login.md) | Fine-grained PAT-Login | Abgeschlossen | Für den aktuellen Umfang hinreichend erfolgreich getestet; Passwortmanager-Autofill bleibt plattformabhängig und ist im finalen Integrationstestplan aufgeführt |
| [1.7](Story-1.7-Repository-Zugriffsrechte.md) | Repository-Zugriffsrechte kennzeichnen | Im Code umgesetzt | Symbole für Nur-Lesen-, Schreib-, Administrationsrechte und unbekannte Berechtigungen |
| 2 | VFS & Monaco Editor | Umgesetzt | IndexedDB-VFS, Editor und Auto-Save; Auswahl und Laden mehrerer LaTeX-Dateien in Stories 2.2 und 2.4 |
| 2.1 | Responsive UI & Sidebar | Umgesetzt | Responsives Layout und Sidebar-Toggle vorhanden |
| [2.2](Story-2.2-LaTeX-Dateien-und-Schreibbarkeit-in-der-Sidebar.md) | LaTeX-Dateien und Schreibbarkeit in der Sidebar | Im Code umgesetzt | `.tex`, `.latex` und `.ltx` sind auswählbar; andere Dateien erscheinen nur mit Name und Statussymbol |
| [2.3](Story-2.3-Ausblendbares-Log.md) | Ausblendbares Log am unteren Rand | Im Code umgesetzt | Vorhandenes technisches Diagnoseprotokoll ist standardmäßig verborgen und über die UI einblendbar |
| [2.4](Story-2.4-LaTeX-Datei-im-Editor-laden.md) | Ausgewählte LaTeX-Datei im Editor laden | Im Code umgesetzt | Repository-Dateien werden beim Online-Öffnen lokal vorgehalten; Auswahl öffnet LaTeX-Dateien |
| [2.5](Story-2.5-Variablen-Quickinfo-im-Editor.md) | Variablen-Quickinfo im Editor | Ausstehend | TeX-Variablen als Links darstellen und aufgelösten Inhalt beim Antippen anzeigen |
| [2.6](Story-2.6-Durchsuchbare-Variablenauswahl.md) | Durchsuchbare Variablenauswahl | Ausstehend | Projektvariablen über Eingabe von `\` und/oder einen Button durchsuchbar anbieten |
| [3](Story-3-Client-seitiges-Linting.md) | Client-seitiges Linting | Im Code umgesetzt | Syntaxprüfung und Compilerdiagnosen der lokalen Engine beim Speichern/Öffnen der Vorschau; iPad/Safari ungetestet |
| [4](Story-4-Live-Vorschau.md) | Projektbezogene Live-Vorschau | Im Code umgesetzt | Lokale Kompilierung (glyphtex-engine) und PDF.js-Vorschau, Hauptdateiauswahl; iPad/Safari und Lizenzinventar offen |
| 4.1 | Azure Build & PDF API | Ausstehend | PDF-Build-Backend/API fehlt |
| 4.2 | Responsive PDF-Vorschau | Teilweise umgesetzt | Panel, Toggle und echte PDF-Vorschau vorhanden; Resize fehlt |
| 5 | KI-Schreibassistenz | Ausstehend | UI und Syntaxschutz fehlen |
| 6 | Offline-Fähigkeit & Sync | Teilweise umgesetzt | Service Worker und lokales Auto-Save; Remote-Sync-Queue und KI-Commit-Messages fehlen; Monaco benötigt CDN-Verbindung; TeX-Engine und PDF.js werden beim ersten Gebrauch gecacht (danach offline) |
| [6.1](Story-6.1-Einheitliches-Speichern.md) | Einheitliches lokales Speichern und Konfliktauflösung | Umgesetzt | Unterstützte Branch-Dateien lokal verfügbar; gleicher lokaler Speichern-Button online/offline; Konfliktwahl und Merge |
| [1.8](Story-1.8-GitHub-Commit-und-Push.md) | GitHub-Commit und Push beim Speichern | Ausstehend | Geänderte Dateien gemeinsam online committen und pushen; bleibt vom lokalen Speichern getrennt |
| 8 | Commit-Historie & Undo | Ausstehend | Historie und Rollback fehlen |
| [9](Story-9-Design-nach-Fiori-Styleguide.md) | Design nach Fiori-Styleguide | Ausstehend | Überarbeitung des Designs der App nach dem Fiori-Styleguide |

## Aktueller App-Stand
Die App startet mit einer lokalen Projektübersicht, aus der lokal gespeicherte Projekte offline geöffnet werden können. Der GitHub-Zugriff ist separat: Repositories lassen sich nach dem Login online öffnen oder privat erstellen und mit `main.tex` initialisieren. Der Editor nutzt IndexedDB und einen optionalen Monaco-Editor (CDN bei Internetverbindung, Texteditor-Fallback offline), zeigt eine Repo-/Branch-Baumansicht und lädt beim Online-Öffnen alle unterstützten regulären Dateien des Branches lokal. Eine lokale Syntaxprüfung meldet ausgewählte Fehler in der aktiven Datei; weitergehende und projektbezogene Diagnosen fehlen. Submodule, Symlinks, Git-LFS-Dateien und Dateien über 100 MB werden ausgelassen und gemeldet. Änderungen werden nach kurzer Inaktivität und während der App-Ausführung alle drei Minuten lokal gespeichert; der Button heißt unabhängig vom Online-Status „Speichern“. Bei abweichenden lokalen und Online-Änderungen kann die lokale oder Online-Version gewählt oder ein Merge versucht werden; nicht automatisch lösbare Konflikte werden zur manuellen Bearbeitung markiert. GitHub-Commit und Push über den Speichern-Button sind in Story 1.8 dokumentiert und noch nicht implementiert. Das vorhandene technische Diagnoseprotokoll lässt sich ein- und ausblenden und enthält weiterhin Funktionen zum Leeren und Kopieren. Der Fine-grained-PAT-Login ist für den aktuellen Umfang abgeschlossen; zusätzliche reproduzierbare End-to-End-Prüfschritte einschließlich des plattformabhängigen Passwortmanager-Autofills stehen im [finalen Integrationstestplan](../tests/INTEGRATION_TEST_PLAN.md). Branch-Erstellung, Sync-Queue, Dokumentvorschau/PDF-Build, KI-Assistenz und Historie/Undo sind nicht implementiert.

Offline sind die lokale Bearbeitung und Speicherung zuvor geladener Dateien sowie die gecachte App-Shell möglich. Anmeldung und GitHub-API-Zugriffe benötigen Internet. Monaco selbst wird von einem CDN geladen; offline bleibt der Texteditor-Fallback verfügbar. Das PAT bleibt bis zur Abmeldung oder zum Ende der Sitzung im `sessionStorage` und ist für JavaScript derselben Origin zugänglich.

Für neue oder geänderte Produktanforderungen gilt: Sie werden ausschließlich von der Nutzerin/vom Nutzer vorgegeben. Die betroffene Story-Datei und diese Übersicht sind gemeinsam zu aktualisieren.
