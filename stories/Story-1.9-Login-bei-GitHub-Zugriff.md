# Story 1.9: Login bei GitHub-Zugriff

> **GitHub Issue:** [#11](https://github.com/yasminshendrik/latex_on_ipad/issues/11) — maßgeblicher Status und Tracking. Diese Datei bleibt als Referenzkopie erhalten.

**Gesamtstatus: Ausstehend**

## Ziel
Wird ohne bestehende Anmeldung eine GitHub-Aktion aufgerufen, soll der vorhandene Login-Mechanismus gestartet werden. Das gilt insbesondere für die GitHub-Einstiege im Dashboard.

## Aktueller Stand
Beim Öffnen oder Erstellen eines GitHub-Repositories ohne Token erscheint derzeit nur der Hinweis, sich zunächst über „GitHub Login“ zu verbinden. Der Login-Dialog wird dabei nicht geöffnet.

## Teilschritte
- [ ] Bei einem GitHub-Zugriff ohne Anmeldung den bestehenden Login-Dialog öffnen, insbesondere beim Öffnen und Erstellen eines Repositories im Dashboard. **Ausstehend**

## Abgrenzung
Diese Story ergänzt den abgeschlossenen PAT-Login aus [Story 1.6](Story-1.6-Fine-grained-PAT-Login.md); lokale Offline-Arbeit bleibt ohne Anmeldung nutzbar.
