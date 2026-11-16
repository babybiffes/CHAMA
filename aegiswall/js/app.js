/* AegisWall — application shell: entry screen, header, workspace navigation, shortcuts.
 * Workspaces are kept alive when hidden, so switching never loses selection or unsaved edits. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$;
  const W = AW.wall, S = W.S;
  const WORKSPACES = [['wall', 'Wall', 'wall'], ['audio', 'Audio', 'audio'], ['system', 'System & Maintenance', 'system'], ['settings', 'Settings', 'settings']];
  const app = (AW.app = { ws: 'wall', started: false });
  const el = {};

  // ------------------------------------------------------------------ entry screen
  function buildLogin() {
    $('#login-product').textContent = AW.PRODUCT;
    $('#login-tagline').textContent = t('Videowall control');
    $('#login-user-label').textContent = t('User');
    $('#login-pass-label').textContent = t('Password');
    $('#login-submit').textContent = t('Sign in');
    $('#login-demo').innerHTML = '<p><span class="badge demo">' + esc(t('Demo Mode')) + '</span> ' + esc(t('No real hardware is connected. Enter with a reference profile:')) + '</p><div class="btn-row">' +
      AW.svc.auth.accounts.map((a) => '<button class="btn btn-small" type="button" data-demo="' + a.user + '" title="' + esc(a.user + ' / ' + a.pass) + '">' + esc(t(AW.ROLE_LABEL[a.role])) + '</button>').join('') + '</div>' +
      '<p class="note">' + esc(t('Reference credentials: operator / operator, tech / tech, admin / admin. Real authentication is defined at installation.')) + '</p>';
    $('#login-demo').addEventListener('click', (e) => { const b = e.target.closest('[data-demo]'); if (!b) return; const a = AW.svc.auth.accounts.find((x) => x.user === b.dataset.demo); signIn(a.user, a.pass); });
    $('#login-form').addEventListener('submit', (e) => { e.preventDefault(); signIn($('#login-user').value, $('#login-pass').value); });
    renderLoginLicense();
    AW.bus.on('license', renderLoginLicense);
  }
  function renderLoginLicense() {
    const st = AW.svc.license.status(), box = $('#login-license');
    const kind = st.state === 'valid' ? 'ok' : st.state === 'not_activated' ? 'info' : 'bad';
    box.innerHTML = '<p>' + AW.ui.badge(kind, st.state === 'valid' ? 'Activated' : st.state === 'not_activated' ? 'Not activated' : 'License ' + st.state) + ' <span>' + esc(st.message) + '</span></p>' +
      '<button class="btn btn-small" type="button" id="login-lic-btn">' + icon('key') + esc(t(st.state === 'valid' ? 'View license' : 'Enter or import a license')) + '</button>';
    $('#login-lic-btn').addEventListener('click', () => AW.licensingUI && AW.licensingUI.openActivation());
  }
  async function signIn(user, pass) {
    const err = $('#login-error'), btn = $('#login-submit');
    err.hidden = true;
    if (!String(user).trim() || !pass) { err.textContent = t('Enter a user and a password.'); err.hidden = false; return; }
    btn.disabled = true; btn.textContent = t('Signing in…');
    try {
      await AW.svc.auth.login(user, pass);
      $('#login-pass').value = '';
      await enter();
    } catch (e) { err.textContent = e.message; err.hidden = false; $('#login-pass').focus(); }
    finally { btn.disabled = false; btn.textContent = t('Sign in'); }
  }
  async function enter() {
    $('#login').hidden = true; $('#app').hidden = false;
    if (!app.started) {
      app.started = true;
      await W.init();
      buildShell();
      AW.wallUI.build($('#ws-wall')); AW.wallInspector.bind(); AW.wallInspector.bindShelf();
      await AW.wallUI.start();
      if (AW.ops) AW.ops.start();
    } else { AW.wallUI.show(app.ws === 'wall'); }
    renderHeader(); renderRail();
    ['audioUI', 'systemUI', 'settingsUI'].forEach((k) => AW[k] && AW[k].onSession && AW[k].onSession());
    app.go(app.ws);
    resetIdle();
  }
  app.signOut = function (reason) {
    AW.closePopover();
    AW.svc.auth.logout();
    AW.wallUI.show(false);
    $('#app').hidden = true; $('#login').hidden = false;
    const err = $('#login-error'); err.hidden = !reason; if (reason) err.textContent = reason;
    renderLoginLicense();
    $('#login-user').focus();
  };

  // ------------------------------------------------------------------ shell
  function buildShell() {
    const h = $('#header');
    h.innerHTML =
      '<div class="brand-s"><svg class="logo logo-s" aria-hidden="true"><use href="#logo"/></svg><strong>' + esc(AW.PRODUCT) + '</strong></div>' +
      '<span id="hd-wall" class="hd-wall" title="' + esc(t('Current wall')) + '"></span>' +
      '<span id="hd-conn" class="chip" role="status"></span>' +
      '<button id="hd-health" class="chip chip-btn" type="button"></button>' +
      '<button id="hd-mute" class="icon-btn" type="button" aria-pressed="false"></button>' +
      '<span class="grow"></span>' +
      '<button id="hd-pending" class="chip chip-btn" type="button" aria-haspopup="true"></button>' +
      '<button id="hd-discard" class="btn" type="button">' + esc(t('Discard')) + '</button>' +
      '<button id="hd-apply" class="btn btn-primary" type="button"></button>' +
      '<button id="hd-account" class="btn btn-quiet" type="button" aria-haspopup="true"></button>';
    ['hd-wall', 'hd-conn', 'hd-health', 'hd-mute', 'hd-pending', 'hd-discard', 'hd-apply', 'hd-account'].forEach((id) => { el[id] = document.getElementById(id); });
    el['hd-apply'].addEventListener('click', () => AW.wallUI.apply());
    el['hd-discard'].addEventListener('click', () => AW.wallUI.discard());
    el['hd-health'].addEventListener('click', () => app.go('system', 'info'));
    el['hd-mute'].addEventListener('click', async () => {
      try { await AW.svc.audio.setMasterMute(!AW.svc.audio.confirmed().master.mute); }
      catch (e) { AW.toast('error', e.message); }
    });
    el['hd-pending'].addEventListener('click', () => {
      const p = W.pending();
      const body = S.applyError ? '<p class="note bad">' + esc(S.applyError) + '</p>' : '';
      AW.popover(el['hd-pending'], '<h3>' + esc(t('Pending wall changes')) + '</h3>' + body +
        (p.n ? '<ul class="plain">' + p.notes.map((n) => '<li>' + esc(n) + '</li>').join('') + '</ul><p class="note">' + esc(t('These changes exist only in your draft. Apply sends them to the controller; Discard returns to the confirmed composition.')) + '</p>'
          : '<p class="note">' + esc(t('The draft matches the composition confirmed at {time}.', { time: AW.fmtTime(S.confirmedAt) })) + ' ' + esc(S.lastAck ? t('Acknowledged by the demo adapter.') : '') + '</p>') +
        (app.ws !== 'wall' ? '<button class="btn btn-small" type="button" data-go>' + esc(t('Open Wall')) + '</button>' : ''),
        (pop) => { const g = pop.querySelector('[data-go]'); if (g) g.addEventListener('click', () => { AW.closePopover(); app.go('wall'); }); });
    });
    el['hd-account'].addEventListener('click', () => {
      const s = AW.session, lic = AW.svc.license.status();
      AW.popover(el['hd-account'], '<div class="menu"><div class="menu-head"><b>' + esc(s.name) + '</b><span>' + esc(s.user) + ' · ' + esc(t(AW.ROLE_LABEL[s.role])) + '</span></div>' +
        '<p class="note">' + esc(t('License')) + ': ' + esc(lic.message) + '</p>' +
        '<button type="button" data-m="account">' + icon('user') + esc(t('Account settings')) + '</button>' +
        '<button type="button" data-m="licensing">' + icon('key') + esc(t('Licensing')) + '</button>' +
        '<button type="button" data-m="out">' + icon('power') + esc(t('Sign out')) + '</button></div>',
      (pop) => { pop.onclick = (e) => { const b = e.target.closest('[data-m]'); if (!b) return; AW.closePopover(); if (b.dataset.m === 'out') app.signOut(); else app.go('settings', b.dataset.m); }; });
    });
    const rail = $('#rail');
    rail.innerHTML = WORKSPACES.map(([id, label, ic]) => '<button type="button" data-ws="' + id + '">' + icon(ic) + '<span>' + esc(t(label)) + '</span></button>').join('');
    rail.addEventListener('click', (e) => { const b = e.target.closest('[data-ws]'); if (b) app.go(b.dataset.ws); });
    if (AW.audioUI) AW.audioUI.build($('#ws-audio'));
    if (AW.systemUI) AW.systemUI.build($('#ws-system'));
    if (AW.settingsUI) AW.settingsUI.build($('#ws-settings'));
  }
  function renderRail() { AW.$$('#rail [data-ws]').forEach((b) => { const on = b.dataset.ws === app.ws; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }

  function renderHeader() {
    if (!app.started || !AW.session) return;
    const conn = AW.svc.conn, online = conn.state === 'online';
    el['hd-wall'].textContent = AW.svc.outputs.wallName();
    el['hd-conn'].className = 'chip ' + (online ? 'chip-demo' : conn.state === 'offline' ? 'chip-bad' : 'chip-warn');
    el['hd-conn'].innerHTML = '<span class="dot"></span>' + esc(t('Demo')) + ' · ' + esc(t({ online: 'Online', offline: 'Offline', reconnecting: 'Reconnecting…', restarting: 'Restarting…' }[conn.state] || conn.state));
    el['hd-conn'].title = online ? t('Connected to the demo adapter. No command reaches physical displays.') : (conn.detail || t('The controller is not reachable.'));
    // one compact system-health indicator
    const alerts = AW.svc.telemetry ? AW.svc.telemetry.alerts() : [];
    el['hd-health'].className = 'chip chip-btn ' + (alerts.length ? 'chip-warn' : '');
    el['hd-health'].innerHTML = icon(alerts.length ? 'alert' : 'system') + (alerts.length ? esc(AW.plural(alerts.length, 'alert', 'alerts')) : esc(t('Healthy')));
    el['hd-health'].title = t('System health of {host}. Opens System Information.', { host: AW.svc.host.name });
    if (AW.svc.audio) {
      const muted = AW.svc.audio.confirmed().master.mute;
      el['hd-mute'].innerHTML = icon(muted ? 'mute' : 'audio'); el['hd-mute'].setAttribute('aria-pressed', muted); el['hd-mute'].classList.toggle('on', muted);
      el['hd-mute'].title = el['hd-mute'].ariaLabel = muted ? t('Wall audio is muted. Click to unmute.') : t('Mute wall audio (master)');
    }
    const p = W.pending(), busy = S.applying;
    el['hd-pending'].className = 'chip chip-btn ' + (S.applyError ? 'chip-bad' : p.n ? 'chip-accent' : '');
    el['hd-pending'].innerHTML = S.applyError ? icon('alert') + esc(t('Apply failed')) : p.n ? '<span class="dot"></span>' + esc(AW.plural(p.n, 'pending change', 'pending changes')) : icon('ok') + esc(t('Confirmed {time}', { time: AW.fmtTime(S.confirmedAt) }));
    el['hd-apply'].disabled = !p.n || busy || !online;
    el['hd-apply'].innerHTML = busy ? '<span class="spinner" aria-hidden="true"></span>' + esc(t('Sending…')) : esc(t(S.applyError ? 'Retry Apply' : 'Apply'));
    el['hd-apply'].title = busy ? t('Waiting for the controller to acknowledge') : !online ? t('Unavailable: the controller is {state}', { state: t(conn.state) }) : !p.n ? t('Nothing to apply') : t('Send the draft to the wall');
    el['hd-apply'].setAttribute('aria-busy', busy);
    el['hd-discard'].disabled = !p.n || busy;
    el['hd-discard'].title = !p.n ? t('Nothing to discard') : t('Return the draft to the confirmed composition');
    el['hd-account'].innerHTML = icon('user') + '<span>' + esc(AW.session.name.split(' ')[0]) + '</span><small>' + esc(t(AW.ROLE_LABEL[AW.session.role])) + '</small>';
  }
  app.renderHeader = renderHeader;
  ['wall', 'conn', 'mapping', 'health', 'audio', 'prefs', 'license'].forEach((evt) => AW.bus.on(evt, renderHeader));

  // ------------------------------------------------------------------ navigation
  app.go = function (ws, section) {
    AW.closePopover();
    app.ws = ws;
    AW.$$('.ws').forEach((n) => { n.hidden = n.dataset.ws !== ws; });
    document.body.dataset.ws = ws;
    AW.wallUI.show(ws === 'wall');
    if (AW.audioUI) AW.audioUI.show(ws === 'audio');
    if (AW.systemUI) AW.systemUI.show(ws === 'system', section);
    if (AW.settingsUI) AW.settingsUI.show(ws === 'settings', section);
    renderRail(); renderHeader();
  };

  // ------------------------------------------------------------------ keyboard
  document.addEventListener('keydown', (e) => {
    if (!AW.session || AW.dialogOpen() || app.ws !== 'wall') return;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z' && !typing) { e.preventDefault(); e.shiftKey ? W.redo() : W.undo(); }
    else if (mod && k === 'y' && !typing) { e.preventDefault(); W.redo(); }
    else if (mod && k === 'enter') { e.preventDefault(); AW.wallUI.apply(); }
    else if (!typing && !mod && k === 'e') AW.wallUI.setMode(AW.wallUI.mode === 'edit' ? 'explore' : 'edit');
    else if (!typing && !mod && k === 'f') AW.stage.frontView();
    else if (e.key === 'Escape' && !typing) { if (AW.wallUI.shelfOpen) AW.wallUI.toggleShelf(false); else if (S.sel) W.select(null); }
  });

  // ------------------------------------------------------------------ session timeout (Settings > Account)
  let idleTimer = 0;
  function resetIdle() {
    clearTimeout(idleTimer);
    if (!AW.session) return;
    idleTimer = setTimeout(() => { if (AW.session && !S.applying) app.signOut(t('Signed out after {n} minutes without activity. Your draft is kept.', { n: AW.prefs.sessionTimeout })); else resetIdle(); }, AW.prefs.sessionTimeout * 60000);
  }
  ['pointerdown', 'keydown'].forEach((evt) => document.addEventListener(evt, resetIdle, true));
  AW.bus.on('prefs', resetIdle);

  // ------------------------------------------------------------------ boot
  AW.applyPrefs();
  buildLogin();
  setInterval(() => { if (AW.session && app.started) renderHeader(); }, 30000);
  $('#login-user').focus();
})();
