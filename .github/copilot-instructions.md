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

## Service worker cache versioning

- The service worker cache name in the deployed PWA must identify the exact commit SHA that was deployed from the current Pages branch.
- Keep `__COMMIT_SHA__` as the cache-name placeholder in `sw.js`; do not replace it manually with a guessed or previous commit hash.
- The GitHub Pages workflow `.github/workflows/pages.yml` stamps the triggering commit's `GITHUB_SHA` into the deployed service worker artifact. Keep this workflow and placeholder behavior in sync whenever deployment configuration changes.
- After source changes are pushed, check that the Pages deployment workflow succeeds; the deployed service worker should then contain the SHA of that deployment commit.
