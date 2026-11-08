# Story 1.7: Repository-Zugriffsrechte kennzeichnen

> **GitHub Issue:** [#9](https://github.com/yasminshendrik/latex_on_ipad/issues/9) — maßgeblicher Status und Tracking. Diese Datei bleibt als Referenzkopie erhalten.

**Status: Im Code umgesetzt**

## Ziel
In der Repository-Auswahlliste die GitHub-Berechtigungen für jedes Repository auf einen Blick symbolisch anzeigen. Die Kennzeichnung macht sichtbar, ob das Token nur lesen, auch schreiben oder administrieren darf.

## Symbolische Kennzeichnung

| Symbol | Bedeutung |
|---|---|
| 👁️ | Nur Lesen |
| ✏️ | Lesen und Schreiben |
| ⚙️ | Administrationsrechte |
| ❔ | Berechtigung unbekannt oder von der API nicht geliefert |

Die Symbole müssen auch für assistive Technologien verständlich sein, zum Beispiel über einen zugänglichen Namen oder eine Textalternative. Eine unbekannte Berechtigung darf nicht als Nur-Lesezugriff dargestellt werden. Repositories ohne Zugriff werden von GitHub nicht in der Liste geliefert und erhalten daher keine Kennzeichnung.

## Teilschritte
- [x] Berechtigungsinformationen aus den Repository-Metadaten auswerten. **Umgesetzt**
- [x] Je Repository das passende Symbol in der Repository-Auswahlliste nach [Story 0.4](Story-0.4-Repository-Auswahl-und-Baumansicht.md) anzeigen. **Umgesetzt**
- [x] Symbole mit zugänglichen Namen oder Textalternativen versehen. **Umgesetzt**

## Abgrenzung
Die Kennzeichnung zeigt ausschließlich die von GitHub gemeldeten Token-Berechtigungen an. Sie aktiviert keine Schreib- oder Administrationsfunktionen in der App und ersetzt keine Prüfung des tatsächlichen Zugriffs bei einer späteren Aktion.
