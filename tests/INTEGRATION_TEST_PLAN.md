# Finaler manueller Integrationstestplan

Dieser Plan erfasst geräte- und kontoabhängige Prüfungen, die nicht vollständig durch die automatisierten Tests abgedeckt werden. Insbesondere dient er der späteren Wiederholung des GitHub-PAT-Ablaufs auf iPad/Safari. Die Story 1.6 ist für den aktuellen Umfang abgeschlossen; diese Prüfliste ist keine offene Freigabebedingung.

## GitHub Fine-grained PAT auf iPad/Safari

### Voraussetzungen
- Eine veröffentlichte App-Version und ein iPad mit Safari.
- Ein für den Test vorgesehenes Fine-grained PAT, beschränkt auf ein Test-Repository und die erforderlichen Leseberechtigungen für Metadaten und Inhalte.
- Ein eigenes Test-Repository mit mindestens einer lesbaren Datei.
- Keine echten Zugangsdaten in Screenshots, Diagnoseprotokolle oder Testnotizen aufnehmen.

### Prüfschritte

1. **Gültiges PAT und erlaubtes Repository**
   - In der App mit dem gültigen PAT anmelden.
   - Prüfen, dass die Token-Prüfung erfolgreich ist, die Repository-Auswahl erscheint und das Test-Repository geöffnet werden kann.
   - Eine LaTeX-Datei öffnen und den erwarteten Inhalt kontrollieren.
   - **Erwartet:** Login, Repository-Liste und Dateiabruf funktionieren.

2. **Ungültiges PAT**
   - Abmelden und ein absichtlich ungültiges Test-Token eingeben.
   - **Erwartet:** Die Anmeldung wird abgewiesen, eine verständliche Fehlermeldung erscheint und das Token wird nicht als aktive Sitzung gespeichert.

3. **Gültiges PAT ohne Zugriff auf das Test-Repository**
   - Mit einem gültigen, aber nicht für das Test-Repository freigegebenen PAT anmelden oder den Zugriff auf ein nicht berechtigtes Repository prüfen.
   - **Erwartet:** Ein Repository- oder Datei-Zugriffsfehler wird sichtbar angezeigt; die App stellt keinen erfolgreichen Zugriff dar.

4. **Sitzungsende und Token-Speicherung**
   - Nach erfolgreicher Anmeldung abmelden und den Zustand von `sessionStorage` prüfen.
   - Während der Sitzung kontrollieren, dass das Token nicht in `localStorage` abgelegt wird.
   - Diagnoseprotokoll und sichtbare Fehlermeldungen auf Token-Inhalte prüfen.
   - **Erwartet:** Abmeldung entfernt das Token aus `sessionStorage`; das Token erscheint weder in `localStorage` noch im Diagnoseprotokoll.

5. **Apple Passwörter / Safari-Autofill**
   - Einen separaten Passworteintrag für die App-Adresse mit dem Test-PAT verwenden; keinen bestehenden GitHub-Passworteintrag überschreiben.
   - Das Login-Formular öffnen und prüfen, ob iPadOS/Safari das Ausfüllen anbietet.
   - **Erwartet:** Falls Autofill von iPadOS angeboten wird, lässt sich der Eintrag verwenden. Wird er nicht angeboten, bleibt die manuelle Eingabe möglich; dieses plattformabhängige Verhalten blockiert Story 1.6 nicht.

## Testergebnis

| Prüfung | Ergebnis | Gerät/Browser und App-Version | Hinweise |
|---|---|---|---|
| Gültiges PAT und erlaubtes Repository | Noch nicht erneut ausgeführt | — | — |
| Ungültiges PAT | Noch nicht erneut ausgeführt | — | — |
| Gültiges PAT ohne Repository-Zugriff | Noch nicht erneut ausgeführt | — | — |
| Sitzungsende und Token-Speicherung | Noch nicht erneut ausgeführt | — | — |
| Apple Passwörter / Safari-Autofill | Noch nicht erneut ausgeführt | — | Plattformverhalten kann abweichen |
