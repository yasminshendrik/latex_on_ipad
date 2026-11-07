# Story 1.5: Azure Static Web Apps als spätere Architekturidee

**Status: Backlog-Idee — nicht beschlossen und nicht umgesetzt**

## Idee
Für eine spätere Version Azure Static Web Apps als Alternative zu GitHub Pages für die gesamte PWA prüfen. Eine integrierte Azure Function könnte beim GitHub-Login den Authorization Code serverseitig gegen ein Zugriffstoken austauschen. Die PWA würde weiterhin `state` und PKCE verwenden und GitHub-API-Aufrufe nach dem Login direkt aus dem Browser durchführen.

Die Function benötigt das Client Secret der GitHub App. Es darf nicht im Frontend oder Repository stehen; als mögliche Speicherorte sind geschützte Azure-Anwendungseinstellungen oder Azure Key Vault zu prüfen.

## Offene Prüfung vor einer Entscheidung
- Die Function ist ein Backend-Dienst und widerspricht der bisherigen Vorgabe „kein Backend“. Eine Umsetzung setzt eine ausdrückliche Entscheidung zur Änderung dieser Vorgabe voraus.
- Offline-Bearbeitung, Service-Worker-Updates und die Migration lokal gespeicherter Daten auf eine neue Browser-Origin sowie die GitHub-Callback-Konfiguration untersuchen.
- Den vollständigen Login mit der registrierten GitHub App, die Absicherung des öffentlichen Endpunkts und den Umgang mit Tokens und Protokollen praktisch prüfen.
- Free- und Standard-Tarif, Function-Nutzung, Secret-Speicher, verfügbare Schutzfunktionen und mögliche Zusatzkosten für die konkrete Azure-Region und das Abonnement prüfen. Verwaltete Functions unterstützen keine direkte Key-Vault-Integration; eine eigene Function-App kann zusätzliche Kosten verursachen.

## Quellen
- [Azure Static Web Apps: Preise](https://azure.microsoft.com/de-de/pricing/details/app-service/static/)
- [Anwendungseinstellungen](https://learn.microsoft.com/de-de/azure/static-web-apps/application-settings)
- [Key-Vault-Integration und Einschränkungen](https://learn.microsoft.com/en-us/azure/static-web-apps/key-vault-secrets)
