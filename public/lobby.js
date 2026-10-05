// Homepage and room setup. Combat and controller input remain in app.js.
async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try { return await fetch(url, {...options, signal: controller.signal}); }
  finally { clearTimeout(timer); }
}
function messageFor(response, action) {
  if (response.status === 404) return 'That rink has closed or could not be found. Check the code or create a new rink.';
  if (response.status === 429) return 'Too many requests. Wait a moment, then try again.';
  if (response.status === 503) return 'No room for a new rink right now. Try again in a moment.';
  if (response.status === 409) return 'That player was just claimed. Choose the other player or watch the fight.';
  return `Could not ${action}. Try again in a moment.`;
}
function networkMessage(error, action) {
  return error.name === 'AbortError'
    ? `Taking too long to ${action}. Check your connection and try again.`
    : `Could not ${action}. Check your connection and try again.`;
}
function setBusy(button, busy, label) {
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  button.textContent = label;
}
export function renderHomepage(app) {
  app.innerHTML = `<section class="landing">
    <div class="hero"><div><h1>ICE<br><span>FIGHT.</span></h1>
      <p class="lead">Every button is a puck.<br>Throw a punch. Lose your jump.<br>Steal their entire moveset.</p>
      <button id="create" type="button">Create a rink</button>
      <p id="createstatus" class="feedback" role="status" aria-live="polite" aria-atomic="true"></p>
    </div><img src="/banner-800.webp" srcset="/banner-400.webp 400w, /banner-800.webp 800w, /banner-1200.webp 1200w" sizes="(max-width: 700px) calc(100vw - 78px), (max-width: 1160px) calc((100vw - 114px) / 2), 523px" width="1200" height="630" fetchpriority="high" alt="Ice Fight arcade banner with blue and red hockey fighters facing off"></div>
    <div class="steps"><div><strong>01 / Bring two phones</strong>Create or join the same rink. Claim Player 1 and Player 2, then turn sideways.</div>
      <div><strong>02 / Find a big screen</strong>Open the same room on a separate screen and choose Watch the fight.</div>
      <div><strong>03 / Fight for the upper hand</strong>The ice is slippery. So are your controls.</div></div>
    <form id="joinform" class="join-form" novalidate><label for="code">Room code</label>
      <div class="join"><input id="code" name="code" placeholder="e.g. A1B2C3" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" aria-describedby="codehint joinstatus" required><button id="watch" type="submit">Join a rink</button></div>
      <p id="codehint" class="field-hint">Six characters from your friend's rink.</p>
      <p id="joinstatus" class="feedback" role="status" aria-live="polite" aria-atomic="true"></p></form>
    <p class="fine-print">5-minute rounds · punches + kicks · experimental prototype</p>
  </section>`;
  const code = app.querySelector('#code'), join = app.querySelector('#watch'), create = app.querySelector('#create');
  const joinStatus = app.querySelector('#joinstatus'), createStatus = app.querySelector('#createstatus');
  code.addEventListener('input', () => { code.removeAttribute('aria-invalid'); joinStatus.textContent = ''; });
  app.querySelector('#joinform').addEventListener('submit', async event => {
    event.preventDefault();
    if (join.disabled) return;
    const value = code.value.trim().toUpperCase();
    code.value = value;
    if (!/^[A-F0-9]{6}$/.test(value)) {
      code.setAttribute('aria-invalid', 'true');
      joinStatus.textContent = 'Enter a six-character room code using A–F and 0–9.';
      code.focus(); return;
    }
    setBusy(join, true, 'Finding rink…'); joinStatus.textContent = '';
    try {
      const response = await request(`/api/rooms/${value}`);
      if (!response.ok) { joinStatus.textContent = messageFor(response, 'join this rink'); return; }
      location.href = `/room/${value}`;
    } catch (error) { joinStatus.textContent = networkMessage(error, 'find this rink'); }
    finally { setBusy(join, false, 'Join a rink'); }
  });
  create.addEventListener('click', async () => {
    if (create.disabled) return;
    setBusy(create, true, 'Creating rink…'); createStatus.textContent = '';
    try {
      const response = await request('/api/rooms', {method: 'POST'});
      if (!response.ok) { createStatus.textContent = messageFor(response, 'create a rink'); return; }
      const data = await response.json(); location.href = data.lobby;
    } catch (error) { createStatus.textContent = networkMessage(error, 'create a rink'); }
    finally { setBusy(create, false, 'Create a rink'); }
  });
}
export function renderLobby(app, room) {
  app.innerHTML = `<section class="landing lobby"><h1>CLAIM<br><span>THE ICE.</span></h1>
    <p class="lead">Two players. Two phones. A separate screen for the fight.</p>
    <div class="join role-actions"><button id="p0" type="button" disabled>Checking Player 1…</button><button id="p1" type="button" disabled>Checking Player 2…</button><a class="button button-secondary" href="/display/${room}">Watch the fight</a></div>
    <p id="roomstatus" class="feedback" role="status" aria-live="polite" aria-atomic="true"></p>
    <button id="retry" class="button-secondary" type="button" hidden>Check players again</button>
    <div class="card invite-card"><h2>Invite your opponent</h2>
      <img src="/qr?data=${encodeURIComponent(location.origin + location.pathname)}" width="220" height="220" alt="QR code to open this rink on another phone">
      <div class="invite-details"><p>Same rink. Another phone.<br>Spectators can watch, too.</p><p class="room-code">Room code <strong>${room}</strong></p>
        <a class="room-link" href="${location.pathname}">${location.origin}${location.pathname}</a></div>
    </div>
    <details class="phone-help"><summary>More room on iPhone</summary><p>In Safari, choose Share → Add to Home Screen → Open as Web App. Launch from Home Screen before claiming a player.</p></details>
    <p class="back-link"><a href="/">Back to home / new rink</a></p>
  </section>`;
  const status = app.querySelector('#roomstatus'), retry = app.querySelector('#retry');
  const buttons = [app.querySelector('#p0'), app.querySelector('#p1')];
  let claimed = [false, false], busy = false, checking = false, expired = false, timer;
  let storageAvailable = true;
  function savedLink(i) {
    try {
      const value = localStorage.getItem(`player-${room}-${i}`);
      return value && value.startsWith(`/play/${room}/${i}#`) ? value : null;
    } catch { storageAvailable = false; return null; }
  }
  function updateButtons() {
    for (let i = 0; i < 2; i++) {
      const saved = savedLink(i);
      buttons[i].disabled = busy || expired || (claimed[i] && !saved);
      buttons[i].textContent = saved ? `Return to Player ${i + 1}` : claimed[i] ? `Player ${i + 1} claimed` : `Join Player ${i + 1} · ${i ? 'Mint' : 'Coral'}`;
    }
  }
  async function refresh() {
    if (checking || busy || expired || document.hidden) return;
    checking = true;
    try {
      const response = await request(`/api/rooms/${room}`);
      if (busy) return;
      if (!response.ok) {
        expired = response.status === 404;
        status.textContent = messageFor(response, 'check the players');
        retry.hidden = expired; buttons.forEach(button => button.disabled = true);
        if (expired) clearInterval(timer);
        return;
      }
      const data = await response.json(); if (busy) return; claimed = data.claimed; updateButtons();
      if (!retry.hidden) status.textContent = '';
      retry.hidden = true;
    } catch (error) {
      status.textContent = networkMessage(error, 'check the players'); retry.hidden = false;
      buttons.forEach(button => button.disabled = true);
    } finally { checking = false; }
  }
  buttons.forEach((button, i) => button.addEventListener('click', async () => {
    if (busy || button.disabled) return;
    const saved = savedLink(i);
    if (saved) { location.href = saved; return; }
    // Check persistence before claiming an irreversible, reserved player slot.
    try {
      if (!storageAvailable) throw new Error('Storage unavailable');
      localStorage.setItem('icefight-storage-check', '1'); localStorage.removeItem('icefight-storage-check');
    } catch {
      status.textContent = 'This browser cannot save your player link. Allow site storage or use another browser to play. You can still watch the fight.';
      return;
    }
    busy = true; updateButtons(); setBusy(button, true, 'Claiming player…'); status.textContent = '';
    try {
      const response = await request(`/api/rooms/${room}/claim?slot=${i}`, {method: 'POST'});
      if (!response.ok) { status.textContent = messageFor(response, 'claim this player'); return; }
      const data = await response.json();
      try { localStorage.setItem(`player-${room}-${i}`, data.player); } catch { /* The returned private link still opens the claimed player. */ }
      location.href = data.player;
    } catch {
      status.textContent = 'Could not confirm your player claim. Check your connection. If the slot now shows claimed, create a new rink from Home.';
    } finally { busy = false; button.setAttribute('aria-busy', 'false'); updateButtons(); refresh(); }
  }));
  retry.addEventListener('click', refresh);
  refresh(); timer = setInterval(refresh, 1500);
  addEventListener('pagehide', () => clearInterval(timer));
  addEventListener('pageshow', event => { if (event.persisted) { refresh(); timer = setInterval(refresh, 1500); } });
}
