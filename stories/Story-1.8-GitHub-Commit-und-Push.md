# Story 1.8: GitHub-Commit und Push beim Speichern

> **GitHub Issue:** [#10](https://github.com/yasminshendrik/latex_on_ipad/issues/10) — maßgeblicher Status und Tracking. Diese Datei bleibt als Referenzkopie erhalten.

**Gesamtstatus: Ausstehend**

## Ziel
Lokale Änderungen über den stets gleich beschrifteten „Speichern“-Button online sichern. Bei bestehender Verbindung werden alle geänderten Dateien des aktiven Branches gemeinsam in einem GitHub-Commit gespeichert und gepusht. Offline bleibt der Button lokal wirksam; der Ablauf aus [Story 6.1](Story-6.1-Einheitliches-Speichern.md) bleibt davon unabhängig.

## Anforderungen
- [ ] Vor dem Remote-Schreibzugriff den aktuellen Editorinhalt lokal sichern.
- [ ] Bei Repository, Branch, gültigem Token und Internetverbindung eine Commit-Nachricht abfragen.
- [ ] Alle seit der letzten Remote-Basis geänderten Dateien des aktiven Branches gemeinsam in einem Commit speichern und den Branch aktualisieren.
- [ ] Die GitHub-Änderungen atomar über die Git Data API übertragen; einen zwischenzeitlich geänderten Remote-Branch nicht stillschweigend überschreiben.
- [ ] Nach erfolgreichem Push die gespeicherten Remote-Basisinhalte und SHAs lokal aktualisieren.
- [ ] Bei fehlender Verbindung ausschließlich lokal speichern; keine Erfolgsmeldung für einen Commit ausgeben.
- [ ] Bei fehlendem Token oder unzureichenden Berechtigungen den lokalen Stand erhalten und den Remote-Fehler verständlich anzeigen.

## Abnahmekriterien
- Ein erfolgreicher Online-Speichervorgang erzeugt genau einen Commit mit der eingegebenen Nachricht, der alle geänderten Dateien des aktiven Branches enthält.
- Lokale Änderungen bleiben auch dann verfügbar, wenn Commit oder Push fehlschlägt.
- Wird der Remote-Branch während des Vorgangs geändert, bricht der Push mit einer sichtbaren Konfliktmeldung ab und überschreibt die neue Remote-Version nicht.
- Offline ist derselbe Button nutzbar und meldet ausschließlich das lokale Speichern.

## Abgrenzung
Die lokale Speicherung, der Download des Branches, der einheitliche Button und die Konfliktwahl beim erneuten Öffnen sind in [Story 6.1](Story-6.1-Einheitliches-Speichern.md) umgesetzt. Branch-Erstellung und Commit-Historie bleiben in ihren jeweiligen Stories.
