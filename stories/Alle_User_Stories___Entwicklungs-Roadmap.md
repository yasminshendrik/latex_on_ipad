# User Stories, Entwicklungs-Roadmap & Statusübersicht

Diese Datei ist die zentrale Statusübersicht. Detailanforderungen und Teilschritte stehen in den verlinkten Story-Dateien. Statusangaben müssen dem tatsächlich implementierten Code entsprechen; der GitHub-Login gilt erst nach erfolgreichem Ende-zu-Ende-Test als produktiv verifiziert.

## Gesamtübersicht

| Story | Thema | Status | Hinweise |
|---|---|---|---|
| 0 | Multi-Projekt-Dashboard & Startbildschirm | Teilweise umgesetzt | Repo-Auswahl per Prompt; Dashboard und Repo-Erstellung fehlen; Metadaten werden in IndexedDB gespeichert |
| 1 & 1.1 | GitHub Auth & Sync | Teilweise umgesetzt | Früherer OAuth-Login durch PAT-Login ersetzt; Dateien und Baumstruktur abrufbar; Commit/Push fehlt |
| 1.4 | Branching & Switching | Teilweise umgesetzt | Branches laden und wechseln; Branch-Erstellung fehlt |
| [1.5](Story-1.5-Azure-Static-Web-Apps-Idee.md) | Azure Static Web Apps als spätere Architekturidee | Backlog-Idee | Hosting der PWA und Token-Austausch über Azure Function prüfen; Backend-Abweichung noch nicht beschlossen |
| [1.6](Story-1.6-Fine-grained-PAT-Login.md) | Fine-grained PAT-Login | Teilweise umgesetzt | Token-Eingabe und Prüfung im Code; Apple Passwörter und GitHub-Login noch nicht Ende-zu-Ende verifiziert |
| 2 | VFS & Monaco Editor | Umgesetzt | IndexedDB-VFS, Monaco mit Offline-Texteditor-Fallback, lokales Auto-Save und Dateibaum vorhanden |
| 2.1 | Responsive UI & Sidebar | Umgesetzt | Responsives Layout und Sidebar-Toggle vorhanden |
| 3 | Client-seitiges Linting | Ausstehend | TexLab/WASM und Marker fehlen |
| 4 | Live-Vorschau | Ausstehend | KaTeX-Integration fehlt |
| 4.1 | Azure Build & PDF API | Ausstehend | PDF-Build-Backend/API fehlt |
| 4.2 | Responsive PDF-Vorschau | Teilweise umgesetzt | Panel und Toggle vorhanden; Resize und echte Vorschau fehlen |
| 5 | KI-Schreibassistenz | Ausstehend | UI und Syntaxschutz fehlen |
| 6 | Offline-Fähigkeit & Sync | Teilweise umgesetzt | Service Worker registriert; OAuth-Rücksprung-URLs werden nicht gecacht; lokale Dateien in IndexedDB; Remote-Sync und KI-Commit-Messages fehlen; Monaco benötigt CDN-Verbindung |
| 8 | Commit-Historie & Undo | Ausstehend | Historie und Rollback fehlen |

## Aktueller App-Stand
Die App ist ein lokal editierbarer LaTeX-Editor mit IndexedDB-VFS, optionalem Monaco-Editor (CDN bei Internetverbindung, Texteditor-Fallback offline), Repo-/Branch-Lesen über GitHub und einer Service-Worker-PWA-Shell. Lokale Änderungen werden nach kurzer Inaktivität in IndexedDB gespeichert. Der GitHub-Login verwendet ein manuell eingegebenes Fine-grained PAT und prüft es über die GitHub-API; Apple Passwörter und der Ende-zu-Ende-Login sind noch nicht praktisch verifiziert. GitHub-Uploads, Branch-Erstellung, Sync-Queue, Linting, PDF-Build, KI-Assistenz und Historie/Undo sind nicht implementiert.

Offline sind die lokale Bearbeitung und Speicherung bereits geladener Dateien sowie die gecachte App-Shell möglich. Anmeldung und GitHub-API-Zugriffe benötigen Internet. Monaco selbst wird von einem CDN geladen; offline bleibt der Texteditor-Fallback verfügbar. Das PAT bleibt bis zur Abmeldung oder zum Ende der Sitzung im `sessionStorage` und ist für JavaScript derselben Origin zugänglich.

Für neue oder geänderte Produktanforderungen gilt: Sie werden ausschließlich von der Nutzerin/vom Nutzer vorgegeben. Die betroffene Story-Datei und diese Übersicht sind gemeinsam zu aktualisieren.
