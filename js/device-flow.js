'use strict';
(() => {
  const CLIENT_ID = 'Ov23likSsFVYCyWAjIWR';
  const DEVICE_CODE_URL = 'https://github.com/login/device/code';
  const TOKEN_URL = 'https://github.com/login/oauth/access_token';
  let active = false;
  let cancelled = false;
  let overlay;

  const log = (message) => {
    if (typeof window.__technicalLog === 'function') window.__technicalLog(message);
  };
  const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  function closeOverlay() { if (overlay) overlay.remove(); overlay = null; }
  function showOverlay(userCode, verificationUri, onCancel) {
    closeOverlay();
    overlay = document.createElement('section');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'device-flow-title');
    Object.assign(overlay.style, { position: 'fixed', inset: '0', zIndex: '10000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(0,0,0,.78)' });
    const card = document.createElement('div');
    Object.assign(card.style, { width: 'min(100%, 440px)', padding: '22px', border: '1px solid #666', borderRadius: '10px', background: '#252526', color: '#eee', font: '16px/1.5 -apple-system, BlinkMacSystemFont, sans-serif', textAlign: 'center' });
    const title = document.createElement('h2'); title.id = 'device-flow-title'; title.textContent = 'GitHub-Geräteanmeldung';
    const instruction = document.createElement('p'); instruction.textContent = 'Öffne GitHub zur Gerätebestätigung und gib diesen Code ein. Lass diese App geöffnet.';
    const code = document.createElement('p'); code.textContent = userCode;
    Object.assign(code.style, { padding: '12px', borderRadius: '6px', background: '#111', color: '#9cdcfe', font: 'bold 28px ui-monospace, monospace', letterSpacing: '3px', userSelect: 'all' });
    const link = document.createElement('a'); link.href = verificationUri; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'GitHub-Verifizierung öffnen';
    Object.assign(link.style, { display: 'inline-block', margin: '8px', color: '#50b6ff' });
    const status = document.createElement('p'); status.textContent = 'Warte auf Bestätigung bei GitHub…';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = 'Abbrechen'; cancel.addEventListener('click', onCancel);
    card.append(title, instruction, code, link, status, cancel); overlay.appendChild(card); document.body.appendChild(overlay);
  }
  async function readJson(response, endpointLabel) {
    let data;
    try { data = await response.json(); }
    catch (_) { throw new Error(`${endpointLabel}: Antwort war kein lesbares JSON.`); }
    if (!response.ok) throw new Error(`${endpointLabel}: HTTP ${response.status}.`);
    return data;
  }
  function safeOAuthError(error) {
    const messages = {
      authorization_pending: 'Noch nicht bestätigt — warte auf GitHub.',
      slow_down: 'GitHub bittet um langsameres Abfragen; Polling wird angepasst.',
      expired_token: 'Der Gerätecode ist abgelaufen. Starte die Anmeldung erneut.',
      access_denied: 'Die Anmeldung wurde bei GitHub abgelehnt.',
      incorrect_client_credentials: 'GitHub hat die Client-ID für diesen Flow abgelehnt.',
      incorrect_device_code: 'GitHub hat den Gerätecode abgelehnt. Starte die Anmeldung erneut.',
      unsupported_grant_type: 'GitHub hat den angeforderten Device-Flow nicht akzeptiert.'
    };
    return messages[error] || `GitHub Device Flow meldete: ${String(error || 'unbekannter OAuth-Fehler')}.`;
  }
  async function beginDeviceFlow() {
    if (active) return;
    active = true; cancelled = false;
    log('Experimenteller GitHub-App Device Flow gestartet.');
    let deviceCode = '';
    try {
      const response = await fetch(DEVICE_CODE_URL, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CLIENT_ID }) });
      const data = await readJson(response, 'Device-Code-Anfrage');
      if (!data.device_code || !data.user_code || !data.verification_uri) throw new Error(data.error_description || safeOAuthError(data.error) || 'GitHub lieferte unvollständige Device-Flow-Daten.');
      deviceCode = data.device_code;
      const verification = new URL(data.verification_uri);
      if (verification.protocol !== 'https:' || verification.hostname !== 'github.com') throw new Error('GitHub lieferte eine unerwartete Verifizierungsadresse; aus Sicherheitsgründen abgebrochen.');
      const intervalSeconds = Math.max(Number(data.interval) || 5, 5);
      const expiresAt = Date.now() + Math.max(Number(data.expires_in) || 900, 1) * 1000;
      showOverlay(data.user_code, verification.href, () => { cancelled = true; closeOverlay(); log('Device Flow von der Nutzerin/vom Nutzer abgebrochen.'); });
      log(`Device-Code erhalten; Gültigkeitsdauer ${Math.round((expiresAt - Date.now()) / 1000)} Sekunden. Geräte- und Nutzercode werden nicht protokolliert.`);
      let pollInterval = intervalSeconds * 1000;
      while (!cancelled && Date.now() < expiresAt) {
        await wait(pollInterval);
        if (cancelled) break;
        let tokenResponse;
        try {
          tokenResponse = await fetch(TOKEN_URL, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CLIENT_ID, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }) });
        } catch (error) {
          log(`Device-Flow Token-Abfrage ohne HTTP-Antwort fehlgeschlagen (${error && error.name ? error.name : 'Netzwerkfehler'}; möglicher CORS-/Netzwerkfehler).`);
          throw new Error('GitHub Device-Flow Token-Endpunkt ist aus diesem Browser nicht erreichbar (Netzwerk-/CORS-Fehler).');
        }
        const result = await readJson(tokenResponse, 'Device-Flow Token-Abfrage');
        if (result.access_token) {
          sessionStorage.setItem('gh_token', result.access_token);
          log('Device Flow erfolgreich: Zugriffstoken erhalten und nur in sessionStorage abgelegt; Geheimnis nicht protokolliert.');
          closeOverlay();
          window.location.reload();
          return;
        }
        if (result.error === 'authorization_pending') continue;
        if (result.error === 'slow_down') { pollInterval += 5000; log('GitHub fordert langsameres Polling; Intervall erhöht.'); continue; }
        throw new Error(safeOAuthError(result.error));
      }
      if (!cancelled) throw new Error('Der Gerätecode ist abgelaufen. Starte die Anmeldung erneut.');
    } catch (error) {
      closeOverlay();
      log(`Device Flow beendet: ${error.message || 'unbekannter Fehler'}`);
      alert(`GitHub Device Flow: ${error.message || 'Unbekannter Fehler'}`);
    } finally {
      deviceCode = '';
      active = false;
    }
  }

  document.addEventListener('click', (event) => {
    const button = event.target && event.target.closest ? event.target.closest('#gh-login-btn') : null;
    if (!button || sessionStorage.getItem('gh_token')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    beginDeviceFlow();
  }, true);
})();
