# User Stories, Entwicklungs-Roadmap & Statusübersicht

> Veraltete historische Roadmap-Kopie. Das aktive Tracking wurde nach [GitHub Issues](https://github.com/yasminshendrik/latex_on_ipad/issues) migriert; diese Datei ist keine Statusquelle.

Dieses Dokument fasst sämtliche User Stories für die **LaTeX iPad PWA** zusammen. Jede Story ist in ihre spezifischen Teilschritte unterteilt und mit ihrem aktuellen Implementierungsstand im Projektcode (`index_html.md`, `app_js.md`, `sw_js.md`) abgeglichen.

---

## 📊 Tabellarische Gesamtübersicht

| User Story / Modul | Teilschritt / Komponente | Status |
| :--- | :--- | :---: |
| **Story 0: Multi-Projekt-Dashboard** | • Startbildschirm / Dashboard-UI (Kartenansicht) | ❌ Ausstehend |
| | • Logik zum Hinzufügen / Auswählen von Projekten | ✅ Umgesetzt |
| | • Initialisierung neuer Repos über GitHub API | ❌ Ausstehend |
| **Story 1: GitHub Auth & Sync** | • OAuth2-Flow & Token-Handling (`sessionStorage`) | ✅ Umgesetzt |
| | • API-Anbindung für Dateidownload & Baum-Struktur | ✅ Umgesetzt |
| | • Commit- & Push-Funktion via API | ❌ Ausstehend |
| **Story 1.4: Branching & Switching** | • Abrufen vorhandener Remote-Branches | ✅ Umgesetzt |
| | • Erstellen neuer Branches über die API | ❌ Ausstehend |
| | • UI-Dropdown für Branch-Wechsel | ✅ Umgesetzt |
| **Story 2: VFS & Monaco Editor** | • IndexedDB-Struktur für Virtuelles Dateisystem (VFS) | ✅ Umgesetzt |
| | • Monaco Editor Integration mit Syntax-Highlighting | ✅ Umgesetzt |
| | • Multi-File-Ansicht & Dateibaum-Navigation | ✅ Umgesetzt |
| **Story 2.1: Responsive UI & Sidebar** | • Responsive Layout (Portrait / Landscape) | ✅ Umgesetzt |
| | • Toggle-Button & Ein-/Ausblendlogik für Sidebar | ✅ Umgesetzt |
| | • Touch-optimierte Toolbar für iPad | ✅ Umgesetzt |
| **Story 3: Client-seitiges Linting** | • TexLab WASM in Web Worker eingebunden | ❌ Ausstehend |
| | • Kommunikation zwischen Editor & Worker | ❌ Ausstehend |
| | • Echtzeit-Fehleranzeige im Editor (`setModelMarkers`) | ❌ Ausstehend |
| **Story 4: Live-Vorschau & Kompilierung** | • KaTeX für Formel-Vorschau integriert | ❌ Ausstehend |
| | • Azure Container App (Docker mit TeXLive) aufgesetzt | ❌ Ausstehend |
| | • API-Endpoint für PDF-Generierung angebunden | ❌ Ausstehend |
| **Story 4.1: Azure Build & API Auth** | • Dockerfile mit TeXLive für Azure erstellt | ❌ Ausstehend |
| | • REST API-Endpoint für PDF-Builds | ❌ Ausstehend |
| | • Sichere Übergabe des API-Keys aus `sessionStorage` | ❌ Ausstehend |
| **Story 4.2: Responsive PDF-Vorschau** | • Responsive UI-Container (rechts/unten) | ✅ Umgesetzt |
| | • Resizable Split-Pane (Größenveränderung) | ❌ Ausstehend |
| | • Default-Zustand (unsichtbar) & Toggle-Button | ✅ Umgesetzt |
| **Story 5: KI-Schreibassistenz** | • UI-Anbindung für Textprüfung / Umformulierung | ❌ Ausstehend |
| | • System-Prompt zur Bewahrung der LaTeX-Syntax | ❌ Ausstehend |
| **Story 6: Offline-Fähigkeit & Queue** | • Service Worker Asset-Caching (`sw_js.md`) | ✅ Umgesetzt |
| | • Lokales Auto-Save in IndexedDB | ✅ Umgesetzt |
| | • Online-Sync-Workflow mit KI-Commit-Messages | ❌ Ausstehend |
| **Story 8: Commit-Historie & Undo** | • UI-Ansicht für Commit-Historie des Branches | ❌ Ausstehend |
| | • Logik zum Laden & Wiederherstellen eines Standes | ❌ Ausstehend |
| | • Verknüpfung mit Speichern-Workflow & GitHub API | ❌ Ausstehend |

---

## 📑 Detaillierte User Stories

### Story 0: Multi-Projekt-Dashboard & Startbildschirm
* **Ziel:** Bereitstellung einer zentralen Projektübersicht beim Start der App, um nahtlos zwischen mehreren LaTeX-Repositories zu wechseln, bestehende Repos hinzuzufügen oder neue anzulegen.
* **Technische Komponenten:** IndexedDB zur lokalen Speicherung der Projekt-Metadaten; GitHub API zum Abrufen/Erstellen von Repositories.
* **Teilschritte:**
  - [ ] **Teil 0.1: Startbildschirm / Dashboard-UI** *(Ausstehend)* – Visuelle Kartenansicht aller gespeicherten Projekte.
  - [x] **Teil 0.2: Logik zum Hinzufügen / Auswählen von Projekten** *(Umgesetzt)* – Eingabe von `owner/repo` per Prompt und Speicherung im `localStorage`.
  - [ ] **Teil 0.3: Initialisierung neuer Repos über die GitHub API** *(Ausstehend)* – Automatisches Anlegen eines Repos inkl. initialer `main.tex`.

---

### Story 1 & 1.1: GitHub-Authentifizierung & Repository-Synchronisation
* **Ziel:** Sichere Anbindung an GitHub via OAuth2 und Synchronisation von Repositories über die GitHub Contents / Git Data API.
* **Technische Komponenten:** OAuth2 Authorization Code Flow; `sessionStorage` für strikte Token-Sicherheit.
* **Teilschritte:**
  - [x] **Teil 1.1: OAuth-Flow & Token-Handling** *(Umgesetzt)* – Token verbleibt streng im `sessionStorage` und wird beim Schließen der Session gelöscht.
  - [x] **Teil 1.2: API-Anbindung für Dateidownload & Baum-Struktur** *(Umgesetzt)* – Abruf der Git-Trees und Rohdateien über die GitHub API.
  - [ ] **Teil 1.3: Commit- & Push-Funktion via API** *(Ausstehend)* – Zurückschreiben veränderter Dateien an GitHub.

---

### Story 1.4: Branching & In-App Branch-Switching
* **Ziel:** Verwaltung und Wechsel von Git-Branches direkt aus dem aktiven Editor heraus.
* **Technische Komponenten:** GitHub References API (`GET /refs/heads`, `POST /refs`).
* **Teilschritte:**
  - [x] **Abrufen vorhandener Remote-Branches** *(Umgesetzt)* – `fetchGitHubBranches` lädt alle verfügbaren Branches.
  - [ ] **Erstellen neuer Branches über die API** *(Ausstehend)*.
  - [x] **UI-Dropdown für Branch-Wechsel** *(Umgesetzt)* – `#branch-select` lädt den Workspace bei Auswahl neu.

---

### Story 2: Virtuelles Dateisystem (VFS) & Monaco Editor
* **Ziel:** Bereitstellung eines lokalen virtuellen Dateisystems im Browser (IndexedDB) und Einbindung des Monaco Editors für Multi-File-LaTeX-Projekte.
* **Technische Komponenten:** IndexedDB (`LaTeXPWA_VFS`), Monaco Editor, Auto-Save.
* **Teilschritte:**
  - [x] **IndexedDB-Struktur für VFS aufgesetzt** *(Umgesetzt)* – Objektspeicher für Dateien und Projekte.
  - [x] **Monaco Editor in die Webapp integriert** *(Umgesetzt)* – Syntax-Highlighting für LaTeX und Auto-Save bei Inaktivität.
  - [x] **Multi-File-Ansicht & Dateibaum-Navigation** *(Umgesetzt)* – Dynamische Auswahl im Sidebar-Dateibaum.

---

### Story 2.1: Responsive UI & ausblendbare Sidebar
* **Ziel:** Optimierung der Benutzeroberfläche für das iPad im Hoch- und Querformat mit einklappbarer Sidebar.
* **Technische Komponenten:** CSS Flexbox, Media Queries für iPad Portrait/Landscape.
* **Teilschritte:**
  - [x] **Responsive Layout-Struktur für iPad Portrait & Landscape** *(Umgesetzt)*.
  - [x] **Toggle-Button und Ein-/Ausblendlogik für Sidebar** *(Umgesetzt)* – Steuerung via `#toggle-sidebar`.
  - [x] **Touch-optimierte Toolbar** *(Umgesetzt)*.

---

### Story 3: Client-seitiges Linting (TexLab WASM)
* **Ziel:** Einbindung von TexLab via WebAssembly in einen Web Worker zur Echtzeit-Fehlererkennung im Editor.
* **Technische Komponenten:** TexLab WASM, Web Worker Interface, `monaco.editor.setModelMarkers`.
* **Teilschritte:**
  - [ ] **TexLab WASM in einen Web Worker eingebunden** *(Ausstehend)*.
  - [ ] **Kommunikation zwischen Editor und Worker aufgebaut** *(Ausstehend)*.
  - [ ] **Echtzeit-Fehleranzeige im Editor aktiviert** *(Ausstehend)*.

---

### Story 4, 4.1 & 4.2: Live-Vorschau & Kompilierung
* **Ziel:** Schnellvorschau mathematischer Formeln (KaTeX) und PDF-Kompilierung über eine Azure Container App (Docker mit TeXLive).
* **Teilschritte:**
  - [ ] **Story 4: KaTeX Formel-Vorschau** *(Ausstehend)*.
  - [ ] **Story 4.1: Azure Container App (Docker TeXLive) & PDF REST API** *(Ausstehend)*.
  - [x] **Story 4.2.1: Responsive PDF-Vorschau UI-Container** *(Umgesetzt)* – `#preview-container` im CSS/HTML angelegt und togglebar.
  - [ ] **Story 4.2.2: Resizable Split-Pane** *(Ausstehend)*.

---

### Story 5: KI-Schreibassistenz für Text & Stil
* **Ziel:** KI-gestützte Überarbeitung von Texten unter strikter Beibehaltung der LaTeX-Syntax.
* **Teilschritte:**
  - [ ] **UI-Anbindung für Textprüfung / Umformulierung konzipiert** *(Ausstehend)*.
  - [ ] **System-Prompt zur Bewahrung von LaTeX-Syntax definiert** *(Ausstehend)*.

---

### Story 6: Offline-Fähigkeit, Lokale Commits & Sync-Queue
* **Ziel:** Vollständige Offline-Nutzung über Service Worker Caching und lokale Commit-Queue.
* **Teilschritte:**
  - [x] **Service Worker für Asset-Caching implementiert** *(Umgesetzt)* – `sw_js.md` cacht Kern-Assets (`index.html`, `manifest.json`, `app.js`).
  - [x] **Lokales Auto-Save in IndexedDB** *(Umgesetzt)*.
  - [ ] **Intelligenter Online-Sync-Workflow mit KI-Commit-Message-Generierung** *(Ausstehend)*.

---

### Story 8: Undo / Rollback auf frühere Commits
* **Ziel:** Einsicht in die Commit-Historie des aktuellen Branches mit Rollback-Möglichkeit auf frühere Stände.
* **Teilschritte:**
  - [ ] **UI-Ansicht für die Commit-Historie des aktiven Branches** *(Ausstehend)*.
  - [ ] **Logik zum Laden & Wiederherstellen eines früheren Commit-Zustands** *(Ausstehend)*.
  - [ ] **Verknüpfung mit dem Speichern-Workflow & der GitHub API** *(Ausstehend)*.