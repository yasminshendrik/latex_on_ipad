# User Stories, Entwicklungs-Roadmap & Statusübersicht

Diese Datei ist die zentrale Statusübersicht. Detailanforderungen und Teilschritte stehen in den verlinkten Story-Dateien. Statusangaben müssen dem tatsächlich implementierten Code entsprechen; Login- und OAuth-Funktionen gelten erst nach erfolgreichem Test mit einer korrekt registrierten App als produktiv verifiziert.

## Gesamtübersicht

| Story | Thema | Status | Hinweise |
|---|---|---|---|
| 0 | Multi-Projekt-Dashboard & Startbildschirm | Teilweise umgesetzt | Repo-Auswahl per Prompt; Dashboard und Repo-Erstellung fehlen; Metadaten werden in IndexedDB gespeichert |
| 1 & 1.1 | GitHub Auth & Sync | Teilweise umgesetzt | PKCE und Callback-Verarbeitung vorhanden; experimenteller GitHub-App Device Flow eingebaut, Browser-/CORS-Verhalten und Ende-zu-Ende-Login noch nicht verifiziert; Commit/Push fehlt |
| 1.4 | Branching & Switching | Teilweise umgesetzt | Branches laden und wechseln; Branch-Erstellung fehlt |
| 2 | VFS & Monaco Editor | Umgesetzt | IndexedDB-VFS, Monaco mit Offline-Texteditor-Fallback, lokales Auto-Save und Dateibaum vorhanden |
| 2.1 | Responsive UI & Sidebar | Umgesetzt | Responsives Layout und Sidebar-Toggle vorhanden |
| 3 | Client-seitiges Linting | Ausstehend | TexLab/WASM und Marker fehlen |
| 4 | Live-Vorschau | Ausstehend | KaTeX-Integration fehlt |
| 4.1 | Azure Build & PDF API | Ausstehend | PDF-Build-Backend/API fehlt |
| 4.2 | Responsive PDF-Vorschau | Teilweise umgesetzt | Panel und Toggle vorhanden; Resize und echte Vorschau fehlen |
| 5 | KI-Schreibassistenz | Ausstehend | UI und Syntaxschutz fehlen |
| 6 | Offline-Fähigkeit & Sync | Teilweise umgesetzt | Service Worker registriert; lokale Dateien in IndexedDB; Remote-Sync und KI-Commit-Messages fehlen; Monaco benötigt CDN-Verbindung |
| 8 | Commit-Historie & Undo | Ausstehend | Historie und Rollback fehlen |

## Aktueller App-Stand
Die App ist ein lokal editierbarer LaTeX-Editor mit IndexedDB-VFS, optionalem Monaco-Editor (CDN bei Internetverbindung, Texteditor-Fallback offline), Repo-/Branch-Lesen über GitHub und einer Service-Worker-PWA-Shell. Lokale Änderungen werden nach kurzer Inaktivität in IndexedDB gespeichert. OAuth enthält PKCE S256, kryptografisch zufällige Werte, verpflichtende `state`-Prüfung und Callback-Aufräumlogik; der Authorization-Code-Flow ist nicht produktiv verifiziert. Der GitHub-Login-Button startet derzeit einen experimentellen Device Flow für die registrierte GitHub App; direkte Browserzugriffe auf die Device-Flow-Endpunkte müssen noch getestet werden. GitHub-Uploads, Branch-Erstellung, Sync-Queue, Linting, PDF-Build, KI-Assistenz und Historie/Undo sind nicht implementiert.

Offline sind die lokale Bearbeitung und Speicherung bereits geladener Dateien sowie die gecachte App-Shell möglich. Anmeldung und GitHub-API-Zugriffe benötigen Internet. Monaco selbst wird von einem CDN geladen; offline bleibt der Texteditor-Fallback verfügbar. Die Client-ID ist öffentlich; ein Client Secret darf nicht in den statischen Frontend-Code gelangen.

Für neue oder geänderte Produktanforderungen gilt: Sie werden ausschließlich von der Nutzerin/vom Nutzer vorgegeben. Die betroffene Story-Datei und diese Übersicht sind gemeinsam zu aktualisieren.
