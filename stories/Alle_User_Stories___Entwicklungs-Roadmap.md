# User Stories, Entwicklungs-Roadmap & Statusübersicht

Dieses Dokument fasst sämtliche User Stories für die **LaTeX iPad PWA** zusammen. Jede Story ist in ihre spezifischen Teilschritte unterteilt und mit ihrem aktuellen Implementierungsstand im Projektstatus dokumentiert. Die Statusangaben müssen mit dem tatsächlich vorhandenen Code und den vorhandenen UI-Features übereinstimmen.

---

## 📊 Gesamtübersicht

| Story | Thema | Status | Hinweise |
| :--- | :--- | :---: | :--- |
| 0 | Multi-Projekt-Dashboard & Startbildschirm | Teilweise umgesetzt | Repo-Auswahl per Prompt und lokale Speicherung vorhanden; Dashboard-UI und Repo-Erstellung fehlen |
| 1 & 1.1 | GitHub Auth & Sync | Teilweise umgesetzt | GitHub-Tree-/File-Download und Token-Handling im Browser sind vorhanden; echter OAuth-Token-Austausch und Commit-/Push-Funktion fehlen |
| 1.4 | Branching & Switching | Teilweise umgesetzt | Branches laden und wechseln funktioniert; Erstellen neuer Branches fehlt |
| 2 | VFS & Monaco Editor | Umgesetzt | IndexedDB, Editor, Dateibaum und Auto-Save sind aktiv |
| 2.1 | Responsive UI & Sidebar | Umgesetzt | Layout und Toggle für iPad sind umgesetzt |
| 3 | Client-seitiges Linting | Ausstehend | TexLab/WASM und Editor-Markierung fehlen |
| 4 | Live-Vorschau | Ausstehend | KaTeX-Integration fehlt |
| 4.1 | Azure Build & API Auth | Ausstehend | Docker/TeXLive-Setup und sichere Auth fehlen |
| 4.2 | Responsive PDF-Vorschau | Teilweise umgesetzt | Container und Toggle vorhanden; Resize/komplette Vorschau fehlen |
| 5 | KI-Schreibassistenz | Ausstehend | UI und Syntaxschutz fehlen |
| 6 | Offline-Fähigkeit & Sync | Teilweise umgesetzt | Service Worker registriert und Asset-Caching aktiv; Offline-Queue und Sync-Workflow fehlen |
| 8 | Commit-Historie & Undo | Ausstehend | Historie und Rollback fehlen |

**Aktueller Stand der App:** Der Code enthält ein funktionales lokales Editor-Setup mit Monaco, VFS in IndexedDB, GitHub-Branch-Laden, Sidebar-Toggle und Service-Worker-Registrierung. Die wichtigsten offenen Aspekte sind der sichere OAuth-Token-Austausch, Commit-/Push-Funktion, Linting, Vorschau, Azure/PDF-Backend und die Offline-/Sync-Queue.

---

## 📑 Detaillierte Story-Status

### Story 0: Multi-Projekt-Dashboard & Startbildschirm
* **Ziel:** zentrale Projektübersicht beim Start der App
* **Status:** Teilweise umgesetzt
* **Teilschritte:**
  - [ ] Startbildschirm / Dashboard-UI – ausstehend
  - [x] Repo-Auswahl per Prompt und lokalem Speicher – umgesetzt
  - [ ] Initialisierung neuer GitHub-Repos – ausstehend

### Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation
* **Ziel:** sichere Anbindung an GitHub und Datei-Download mit der GitHub API
* **Status:** Teilweise umgesetzt
* **Teilschritte:**
  - [x] Token-Handling im Session-Kontext – umgesetzt
  - [x] Baum/Dateien über GitHub API laden – umgesetzt
  - [ ] sicherer OAuth-Token-Austausch und Commit-/Push-Funktion – ausstehend

### Story 1.4: Branching & In-App Branch-Switching
* **Ziel:** Branches verwalten und wechseln
* **Status:** Teilweise umgesetzt
* **Teilschritte:**
  - [x] Laden vorhandener Remote-Branches – umgesetzt
  - [ ] Erstellen neuer Branches – ausstehend
  - [x] UI-Dropdown für Branch-Wechsel – umgesetzt

### Story 2: Virtuelles Dateisystem (VFS) & Monaco Editor
* **Ziel:** lokales VFS und Monaco-Editor für LaTeX
* **Status:** Umgesetzt
* **Teilschritte:**
  - [x] IndexedDB/VFS-Struktur – umgesetzt
  - [x] Monaco-Editor und Auto-Save – umgesetzt
  - [x] Datei-Baum und Multi-File-Ansicht – umgesetzt

### Story 2.1: Responsive UI & Sidebar
* **Ziel:** iPad-optimierte Oberfläche
* **Status:** Umgesetzt
* **Teilschritte:**
  - [x] Responsive Layout – umgesetzt
  - [x] Sidebar-Toggle – umgesetzt
  - [x] Touch-optimierte Toolbar – umgesetzt

### Story 3: Client-seitiges Linting (TexLab WASM)
* **Ziel:** LaTeX-Fehlererkennung in Echtzeit
* **Status:** Ausstehend
* **Teilschritte:**
  - [ ] WASM/Web-Worker-Setup – ausstehend
  - [ ] Editor/Worker-Kommunikation – ausstehend
  - [ ] Marker-Ausgabe im Editor – ausstehend

### Story 4: Live-Vorschau und Kompilierung
* **Ziel:** KaTeX- und PDF-Vorschau
* **Status:** Ausstehend
* **Teilschritte:**
  - [ ] KaTeX-Formel-Vorschau – ausstehend
  - [ ] Azure/Docker-PDF-Backend – ausstehend
  - [ ] API-Endpoint und Auth – ausstehend

### Story 4.2: Responsive PDF-Vorschau
* **Ziel:** Vorschau-Panel im UI
* **Status:** Teilweise umgesetzt
* **Teilschritte:**
  - [x] Container und Toggle – umgesetzt
  - [ ] Resizable Split-Pane – ausstehend
  - [x] Standard-Unsichtbarkeit / Button-Handling – umgesetzt

### Story 5: KI-Schreibassistenz
* **Ziel:** Textverbesserung unter Beibehaltung der LaTeX-Syntax
* **Status:** Ausstehend
* **Teilschritte:**
  - [ ] UI für Prüfung/Umformulierung – ausstehend
  - [ ] Prompt/Syntax-Schutz – ausstehend

### Story 6: Offline-Fähigkeit, lokale Speicherung & Sync-Queue
* **Ziel:** globale Offline-Unterstützung mit lokaler Synchronsierung
* **Status:** Teilweise umgesetzt
* **Teilschritte:**
  - [x] Service Worker registriert und Asset-Caching – umgesetzt
  - [x] lokales Auto-Save in IndexedDB – umgesetzt
  - [ ] Online-Sync-Queue und KI-Commit-Message-Generierung – ausstehend

### Story 8: Undo / Rollback auf frühere Commits
* **Ziel:** Historie und Rollback von Zuständen
* **Status:** Ausstehend
* **Teilschritte:**
  - [ ] Commit-Historie UI – ausstehend
  - [ ] Laden früherer Commit-Zustände – ausstehend
  - [ ] Verknüpfung mit GitHub-API – ausstehend

---

Wichtiger Hinweis: Änderungen an Anforderungen oder Story-Definitionen werden nur von der Nutzerin / dem Nutzer ergänzt. Die bisher dokumentierten Stories dienen als Basis für die technische Umsetzung und sind nicht ohne ausdrückliche Vorgabe zu erweitern.
