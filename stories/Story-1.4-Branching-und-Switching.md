# Story 1.4: Branching & In-App Branch-Switching

**Gesamtstatus: Teilweise umgesetzt**

## Ziel
Git-Branches direkt aus dem aktiven Editor verwalten und wechseln.

## Technische Komponenten
GitHub References API (`GET /refs/heads`, `POST /refs`)

## Teilschritte
- [x] Vorhandene Remote-Branches abrufen — `fetchGitHubBranches` lädt verfügbare Branches. **Umgesetzt**
- [ ] Neue Branches über die API erstellen. **Ausstehend**
- [x] Branch über UI-Dropdown wechseln — `change`-Event und Datenladen sind implementiert. **Umgesetzt**
