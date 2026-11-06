# User Stories, Entwicklungs-Roadmap & Statusübersicht

Diese Datei ist die zentrale Statusübersicht. Detailanforderungen und Teilschritte stehen in den verlinkten Story-Dateien. Statusangaben müssen dem tatsächlich implementierten Code entsprechen; Login- und OAuth-Funktionen gelten erst nach erfolgreichem Test mit einer korrekt registrierten App als produktiv verifiziert.

## Gesamtübersicht

| Story | Thema | Status | Hinweise |
|---|---|---|---|
| 0 | Multi-Projekt-Dashboard & Startbildschirm | Teilweise umgesetzt | Repo-Auswahl per Prompt vorhanden; Dashboard und Repo-Erstellung fehlen |
| 1 & 1.1 | GitHub Auth & Sync | Teilweise umgesetzt | PKCE, verpflichtende State-Prüfung und Callback-Verarbeitung implementiert; echte Client-ID, exakte Callback-Konfiguration und Ende-zu-Ende-Test fehlen; Commit/Push fehlt |
| 1.4 | Branching & Switching | Teilweise umgesetzt | Branches laden und wechseln; Branch-Erstellung fehlt |
| 2 | VFS & Monaco Editor | Umgesetzt | IndexedDB, Editor, Dateibaum und lokales Auto-Save vorhanden |
| 2.1 | Responsive UI & Sidebar | Umgesetzt | Responsives Layout und Sidebar-Toggle vorhanden |
| 3 | Client-seitiges Linting | Ausstehend | TexLab/WASM und Marker fehlen |
| 4 | Live-Vorschau | Ausstehend | KaTeX-Integration fehlt |
| 4.1 | Azure Build & PDF API | Ausstehend | PDF-Build-Backend/API fehlt |
| 4.2 | Responsive PDF-Vorschau | Teilweise umgesetzt | Panel und Toggle vorhanden; Resize und echte Vorschau fehlen |
| 5 | KI-Schreibassistenz | Ausstehend | UI und Syntaxschutz fehlen |
| 6 | Offline-Fähigkeit & Sync | Teilweise umgesetzt | Lokale Bearbeitung/Speicherung und Service-Worker-Shell; GitHub-Login und Remote-Sync benötigen Internet; Sync-Queue fehlt |
| 8 | Commit-Historie & Undo | Ausstehend | Historie und Rollback fehlen |

## Aktueller App-Stand
Die App ist ein lokal editierbarer LaTeX-Editor mit Monaco, IndexedDB-VFS, GitHub-Repository-/Branch-Lesen und einer PWA-Shell. Der OAuth-Code enthält PKCE S256, kryptografisch zufällige Werte, verpflichtende `state`-Prüfung und Callback-Aufräumlogik. Der Flow ist **noch nicht produktiv verifiziert**: Die Client-ID ist ein Platzhalter und die GitHub-App-Registrierung/Callback-URL müssen passend konfiguriert und getestet werden.

Offline möglich sind lokale Bearbeitung und lokale Speicherung bereits geladener Inhalte. Anmeldung, erstmaliges Laden und Remote-Speichern erfordern eine Internetverbindung. Die Client-ID ist öffentlich; ein Client Secret darf nicht in den statischen Frontend-Code gelangen.

Für neue oder geänderte Produktanforderungen gilt: Sie werden ausschließlich von der Nutzerin/vom Nutzer vorgegeben. Die betroffene Story-Datei und diese Übersicht sind gemeinsam zu aktualisieren.
