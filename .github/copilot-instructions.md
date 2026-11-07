# Copilot-Anweisungen für dieses Projekt

## Anforderungen und Stories

- Die Anforderungen an das Projekt und ihr jeweiliger Umsetzungsstatus werden im Ordner `stories/` dokumentiert.
- Halte den Code stets konsistent mit dem aktuellen Status der Stories. Implementiere keine Anforderungen, die als ausstehend markiert sind, ohne die Story entsprechend zu aktualisieren.
- Neue Anforderungen und Änderungen an Anforderungen müssen im Ordner `stories/` dokumentiert werden.
- Anforderungen oder Änderungen an Anforderungen dürfen ausschließlich von der Nutzerin / dem Nutzer vorgegeben werden. Erfinde, ergänze oder ändere keine Produktanforderungen eigenständig.
- Änderungen an bereits abgeschlossenen Stories werden als neue Stories dokumentiert; überschreibe oder ändere abgeschlossene Stories nicht so, dass ihre ursprüngliche Historie verloren geht.
- Wenn in einem Commit nur ein Teil einer Story umgesetzt wird, teile die Arbeit in klar abgegrenzte Stories oder Teilschritte auf und aktualisiere deren Status passend zum tatsächlichen Stand.
- Aktualisiere den dokumentierten Status nur entsprechend der tatsächlich im Code umgesetzten Änderungen. Nicht oder nur teilweise implementierte Arbeit darf nicht als abgeschlossen markiert werden.
- Bei Änderungen an Code und Anforderungen sind die zugehörigen Story-Dokumente im selben Arbeitszusammenhang aktuell zu halten.
- Aktualisiere die Story-Übersicht `stories/Alle_User_Stories___Entwicklungs-Roadmap.md` immer gemeinsam mit den betroffenen Einzel-Story-Dateien, insbesondere wenn Anforderungen, Teilschritte oder deren Status geändert werden.

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
  
