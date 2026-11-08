# Copilot-Anweisungen für dieses Projekt

## Entwicklung

- Achte bei der Entwicklung auf Sicherheit, Wartbarkeit und Erweiterbarkeit.

## Anforderungen und Stories

- GitHub Issues sind die verbindliche und alleinige Quelle für Anforderungen, Stories, Bugs, technische Aufgaben, Testlücken und Backlog-Themen.
- Vor der Arbeit das zugehörige GitHub Issue und seinen aktuellen Status prüfen. Anforderungen, Umsetzung, Nachweise und Status im Issue aktuell halten.
- Neue Anforderungen und Änderungen an Anforderungen müssen als GitHub Issue dokumentiert werden. Produktanforderungen dürfen ausschließlich von der Nutzerin / dem Nutzer vorgegeben werden.
- Verwende GitHub-Issue-Typen, wenn sie im Repository verfügbar sind. In diesem persönlichen Repository ist das native Typfeld nicht zuweisbar; verwende deshalb die Labels `type:story`, `type:bug` und `type:task` zur Klassifizierung.
- Ein offenes Issue ist nicht abgeschlossen; dazu zählen auch Backlog-Ideen und teilweise umgesetzte Arbeit. Schließe ein Issue erst nach verifizierter vollständiger Umsetzung und verwende den passenden Schließgrund (`completed`, `not planned` oder `duplicate`).
- Issues für Stories enthalten den jeweiligen Anforderungstext und die Abnahmekriterien. Bugs enthalten Beobachtung, erwartetes Verhalten, Reproduktionsschritte, Prüfumgebung und Nachweise. Nicht reproduzierte Meldungen ausdrücklich als ungeklärt kennzeichnen.
- Änderungen an bereits abgeschlossenen Stories werden als neue Stories dokumentiert; überschreibe oder ändere abgeschlossene Stories nicht so, dass ihre ursprüngliche Historie verloren geht.
- Teile größere Vorhaben bei Bedarf in klar abgegrenzte GitHub Issues und bilde tatsächliche Abhängigkeiten über Issue-Beziehungen ab.
- Dokumentiere den Status nur entsprechend der tatsächlich implementierten und verifizierten Änderungen. Nicht oder nur teilweise umgesetzte Arbeit darf nicht als abgeschlossen geschlossen werden.
- Die früheren Story-Dateien und die Roadmap sind in der [Git-Historie](https://github.com/yasminshendrik/latex_on_ipad/tree/0a25fc4c60d5ceda907a8e6217f756efeaf33308/stories) einsehbar. Die Dateien in `issues/` bleiben als migrierte Referenzkopien erhalten. Maßgeblich sind GitHub Issues; keine neuen lokalen Story- oder Issue-Dateien für das Projekttracking anlegen.

## Technisches Protokoll

- Bei allen künftigen Änderungen müssen die betroffenen App-Aktivitäten einschließlich relevanter Fehler und Abbrüche sinnvoll und nachvollziehbar im vorhandenen technischen Protokoll erscheinen. Berücksichtige dies bei Implementierung und Tests.
- Protokolliere keine Tokens, Zugangsdaten, Dokumentinhalte oder andere vertrauliche Daten. Halte die Einträge aussagekräftig, ohne unnötige oder wiederholte Meldungen zu erzeugen.

## Service worker cache versioning

- The service worker cache name in the deployed PWA must identify the exact commit SHA that was deployed from the current Pages branch.
- Keep `__COMMIT_SHA__` as the cache-name placeholder in `sw.js`; do not replace it manually with a guessed or previous commit hash.
- The GitHub Pages workflow `.github/workflows/pages.yml` stamps the triggering commit's `GITHUB_SHA` into the deployed service worker artifact. Keep this workflow and placeholder behavior in sync whenever deployment configuration changes.
- After source changes are pushed, check that the Pages deployment workflow succeeds; the deployed service worker should then contain the SHA of that deployment commit.

## Development and Deployment

- Vor Änderungen den tatsächlich aktuellen Branch- und Dateiinhalt prüfen.
- Nach einem Push den zugehörigen Actions-Lauf und dessen Ergebnis kontrollieren.
- Nicht aus einem erfolgreichen Workflow allein schließen, dass die erwartete Änderung sichtbar ist: zusätzlich die ausgelieferte App-Dateien prüfen
- Bei sichtbaren Tests einen eindeutigen Marker verwenden und erst nach Kontrolle der Live-Seite sagen, dass die Aktualisierung sichtbar ist.
- Fehler und Status präzise benennen: „committed“, „Workflow erfolgreich“ und „Live-Seite verifiziert“ sind verschiedene Aussagen.
- keine Annahmen zum Code treffen, die echten Dateien lesen

## Specifics for this project 
- this project builds a standalone pwa app. apart from initial download via the project’s GitHub pages it runs completely in the local browser and only connects to GitHub and other remote apis on demand of the user. no backend server will be provided for anythimg!
- offline mode is the app’s default mode!
- the update process of the locally cached app should be done by simply pushing a new version to the app’s GitHub page, enforcing a re-download/invalidating the local cache.

## Chat
- *always* answer in German 
  
