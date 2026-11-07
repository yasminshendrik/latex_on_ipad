# Finaler manueller Integrationstestplan

Dieser Plan erfasst geräte- und kontoabhängige Prüfungen, die nicht vollständig durch die automatisierten Tests abgedeckt werden. Er dient der späteren Wiederholung des GitHub-PAT-Ablaufs und der LaTeX-Fehlererkennung auf iPad/Safari. Die Stories 1.6 und 3 sind für den aktuellen Umfang abgeschlossen; diese Prüfliste ist keine offene Freigabebedingung für sie.

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

### Testergebnis

| Prüfung | Ergebnis | Gerät/Browser und App-Version | Hinweise |
|---|---|---|---|
| Gültiges PAT und erlaubtes Repository | Noch nicht erneut ausgeführt | — | — |
| Ungültiges PAT | Noch nicht erneut ausgeführt | — | — |
| Gültiges PAT ohne Repository-Zugriff | Noch nicht erneut ausgeführt | — | — |
| Sitzungsende und Token-Speicherung | Noch nicht erneut ausgeführt | — | — |
| Apple Passwörter / Safari-Autofill | Noch nicht erneut ausgeführt | — | Plattformverhalten kann abweichen |

## LaTeX-Fehlererkennung auf iPad/Safari

### Voraussetzungen
- Eine veröffentlichte App-Version und ein iPad mit Safari; App-Version und Editorvariante (Monaco oder Texteditor-Fallback) festhalten.
- Ein lokales Testprojekt mit `main.tex`; vor der Offline-Prüfung App-Shell und TeX-Engine online laden und erfolgreich kompilieren. Nur Testdaten verwenden.

### Prüfschritte

1. **Syntaxprüfung während der Bearbeitung**
   - In `main.tex` eine nicht geschlossene geschweifte Klammer eingeben und kurz warten. Den Fehler anschließend beheben.
   - **Erwartet:** Ein Hinweis mit Zeile und Spalte erscheint; im Monaco-Editor zusätzlich ein Marker. Nach der Korrektur verschwindet der Hinweis.

2. **Compilerdiagnose beim Speichern**
   - Ein ansonsten vollständiges Dokument mit einem undefinierten Befehl, beispielsweise `\unbekannterbefehl`, eingeben und auf „Speichern“ tippen.
   - **Erwartet:** Die lokale Kompilierung meldet den Fehler. Ein Marker wird nur erwartet, wenn die Diagnose Datei und Zeile der geöffneten Datei enthält. Nach Korrektur und erneutem Speichern den aktualisierten Status prüfen.

3. **Automatisches Speichern und Vorschau**
   - Das Dokument erneut ändern, ohne manuell zu speichern, und die automatische Speicherung abwarten. Die Vorschau schließen und wieder öffnen.
   - **Erwartet:** Die Kompilierung berücksichtigt den gespeicherten Stand; beim Öffnen der Vorschau wird kompiliert oder ein bereits vorhandenes Ergebnis für denselben Stand verwendet.

4. **Offline-Prüfung**
   - Nach erfolgreichem Laden der benötigten Ressourcen die Internetverbindung trennen. Im lokalen Projekt einen Fehler eingeben, speichern und die Diagnose prüfen; anschließend den Fehler beheben.
   - **Erwartet:** Syntaxprüfung und lokale Kompilierung funktionieren ohne Internet, sofern App-Shell und Engine zuvor erfolgreich gecacht wurden.

### Testergebnis

| Prüfung | Ergebnis | Gerät/Browser und App-Version | Hinweise |
|---|---|---|---|
| Syntaxprüfung während der Bearbeitung | Noch nicht ausgeführt | — | — |
| Compilerdiagnose beim Speichern | Noch nicht ausgeführt | — | Ortsangaben sind nicht immer verfügbar |
| Automatisches Speichern und Vorschau | Noch nicht ausgeführt | — | — |
| Offline-Prüfung | Noch nicht ausgeführt | — | Ressourcen müssen zuvor gecacht sein |
