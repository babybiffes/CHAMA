/* AegisWall — Audio workspace. Kept apart from the wall's visual editing.
 * Basic view first; advanced endpoint settings are expandable. Routing changes are staged and confirmed
 * by the backend. Local preview monitoring (this browser) is a different thing from audio sent to the wall. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$, svc = AW.svc;
  const A = (AW.audioUI = { draft: null, visible: false, busy: false, error: '', advOut: 'hdmi-1', advOpen: false, clips: {}, local: false, testLevel: 20, testDev: 'hdmi-1', refreshing: false });
  let root, meterTimer = 0, actx = null, osc = null;
  const cfgSig = (c) => JSON.stringify(c);
  const pendingList = () => {
    const a = svc.audio.confirmed(), d = A.draft, out = [];
    if (a.master.volume !== d.master.volume) out.push(t('Master volume {a}% → {b}%', { a: a.master.volume, b: d.master.volume }));
    if (a.policy !== d.policy) out.push(t('Playback policy changed'));
    if (a.active !== d.active) out.push(t('Active source changed'));
    if (cfgSig(a.sources) !== cfgSig(d.sources)) out.push(t('Source levels or routing changed'));
    if (cfgSig(a.outputs) !== cfgSig(d.outputs)) out.push(t('Output endpoint settings changed'));
    return out;
  };

  A.build = function (el) {
    root = el;
    root.addEventListener('click', onClick); root.addEventListener('change', onChange); root.addEventListener('input', onInput);
    AW.bus.on('audio', (e) => { if (!A.draft) return; if (e && 'masterMute' in e) A.draft.master.mute = e.masterMute; if (A.visible) render(); });
    AW.bus.on('audio-presets', () => A.visible && render());
    AW.bus.on('audio-test', (e) => { localTone(e); if (A.visible) render(); });
    AW.bus.on('demo', () => A.visible && render());
    AW.bus.on('license', () => A.visible && render());
    AW.bus.on('conn', () => A.visible && render());
    AW.bus.on('wall', (e) => { if (A.visible && e.reason === 'applied') render(); });
  };
  A.onSession = function () { if (!A.draft) A.draft = svc.audio.confirmed(); };
  A.show = function (v) {
    A.visible = v;
    clearInterval(meterTimer);
    if (!v) return;
    if (!A.draft) A.draft = svc.audio.confirmed();
    render();
    meterTimer = setInterval(drawMeters, 90);      // labeled demo signal; runs only while this workspace is open
  };

  function render() {
    const live = svc.audio.confirmed(), d = A.draft, online = svc.conn.state === 'online';
    const srcs = svc.audio.sourcesOnWall(AW.wall.S.confirmed), devs = svc.audio.devices(), outs = devs.filter((x) => x.dir === 'output');
    const pend = pendingList(), test = svc.audio.testState();
    const active = document.activeElement, focusId = root.contains(active) ? active.id : null;
    const scroll = root.scrollTop;
    const outOpt = (sel) => outs.map((o) => '<option value="' + o.id + '"' + (o.id === sel ? ' selected' : '') + '>' + esc(o.name) + (o.available ? '' : ' — ' + esc(t('disconnected'))) + '</option>').join('');
    const missing = srcs.filter((e) => { const sc = svc.audio.srcCfg(d, e.source.id), dev = svc.audio.device(sc.output); return sc.enabled && dev && !dev.available; });

    let h = '<div class="page"><header class="page-head"><h1>' + esc(t('Audio')) + '</h1><span class="grow"></span>' +
      '<span class="chip ' + (A.error ? 'chip-bad' : pend.length ? 'chip-accent' : '') + '" role="status">' + (A.error ? icon('alert') + esc(t('Apply failed')) : pend.length ? '<span class="dot"></span>' + esc(AW.plural(pend.length, 'pending audio change', 'pending audio changes')) : icon('ok') + esc(t('Matches the live configuration'))) + '</span>' +
      '<button class="btn" type="button" data-a="discard"' + (!pend.length || A.busy ? ' disabled' : '') + '>' + esc(t('Discard')) + '</button>' +
      '<button class="btn btn-primary" type="button" data-a="apply"' + (!pend.length || A.busy || !online ? ' disabled' : '') + ' title="' + esc(!online ? t('Unavailable: the controller is not reachable') : !pend.length ? t('Nothing to apply') : t('Send the audio changes to the controller')) + '">' + (A.busy ? '<span class="spinner"></span>' + esc(t('Sending…')) : esc(t('Apply audio changes'))) + '</button>' +
      '<p>' + esc(t('Levels and routing for audio sent to the physical wall. Changes are staged here and become live only when the controller acknowledges them.')) + ' ' + AW.ui.demo() + '</p></header>';
    if (A.error) h += '<div class="callout-box bad" role="alert">' + icon('alert') + '<span>' + esc(A.error) + ' ' + esc(t('Your staged changes are kept.')) + '</span></div>';
    if (pend.length) h += '<div class="callout-box">' + icon('info') + '<span>' + esc(t('Staged, not yet live:')) + ' ' + esc(pend.join(' · ')) + '</span></div>';
    if (missing.length) h += '<div class="callout-box warn" role="alert">' + icon('alert') + '<span>' + esc(t('{n} source(s) are routed to a disconnected device. Their mapping is kept and their audio is silent — nothing was rerouted to another endpoint.', { n: missing.length })) + '</span></div>';

    // ---- master
    h += '<section class="card"><div class="card-head"><h2>' + esc(t('Master')) + '</h2><span class="muted">' + esc(t('Wall output')) + '</span></div><div class="card-body au-master">' +
      '<label class="au-slider"><span>' + esc(t('Master volume')) + '</span><input id="au-vol" type="range" min="0" max="100" step="1" value="' + d.master.volume + '" data-f="vol"><output id="au-vol-out">' + d.master.volume + ' %</output></label>' +
      '<label class="opt"><span class="opt-label">' + esc(t('Master mute')) + '</span><input id="au-mute" class="switch" type="checkbox" data-f="mute"' + (live.master.mute ? ' checked' : '') + (online ? '' : ' disabled') + '><small>' + esc(t('Takes effect immediately (confirmed by the controller). Same control as the speaker button in the header.')) + '</small></label>' +
      '<div class="au-policy"><span class="opt-label">' + esc(t('Playback policy')) + '</span>' + AW.ui.segmented('au-policy', [['single', 'One active source'], ['mix', 'Mix enabled sources']], d.policy) +
      '<small class="note">' + esc(d.policy === 'single' ? t('Only the active source is heard. Other sources stay silent even when enabled.') : t('Every enabled source is mixed on its output. Use deliberately: several sources will be audible at once.')) + '</small></div>' +
      '<label class="opt"><span class="opt-label">' + esc(t('Local preview monitoring')) + '</span><input id="au-local" class="switch" type="checkbox" data-f="local"' + (A.local ? ' checked' : '') + '><small>' + esc(t('Plays test tones on THIS browser\'s speakers. Off by default. It never mutes or changes the wall outputs.')) + (A.localError ? ' <b class="st-bad">' + esc(A.localError) + '</b>' : '') + '</small></label></div></section>';

    // ---- sources
    h += '<section class="card"><div class="card-head"><h2>' + esc(t('Sources on the wall')) + '</h2><span class="muted">' + srcs.length + '</span><span class="grow"></span><span class="note">' + esc(t('Meters show the live configuration.')) + ' ' + AW.ui.demo() + '</span></div><div class="card-body">';
    if (!srcs.length) h += '<p class="empty">' + esc(t('No source with audio is on the confirmed wall composition. Place a YouTube, camera-with-audio or application source and Apply it in the Wall workspace.')) + '</p>';
    else {
      h += '<div class="table-wrap"><table class="au-table"><thead><tr><th>' + esc(t('Source')) + '</th><th>' + esc(d.policy === 'single' ? t('Active') : t('Enabled')) + '</th><th>' + esc(t('Mute')) + '</th><th>' + esc(t('Level')) + '</th><th>' + esc(t('Output')) + '</th><th>' + esc(t('Signal')) + '</th></tr></thead><tbody>';
      srcs.forEach((e) => {
        const id = e.source.id, sc = svc.audio.srcCfg(d, id), dev = svc.audio.device(sc.output), gone = dev && !dev.available;
        h += '<tr data-src="' + id + '"><td><b>' + esc(e.source.name) + '</b><br><small class="muted">' + (e.tiles > 1 ? esc(t('On {n} tiles — plays once', { n: e.tiles })) : esc(t('On 1 tile'))) + '</small></td>' +
          '<td>' + (d.policy === 'single'
            ? '<input type="radio" name="au-active" id="au-act-' + id + '" value="' + id + '"' + (d.active === id ? ' checked' : '') + ' aria-label="' + esc(t('Make {n} the active source', { n: e.source.name })) + '">'
            : '<input class="switch" type="checkbox" id="au-en-' + id + '" data-sf="enabled"' + (sc.enabled ? ' checked' : '') + ' aria-label="' + esc(t('Enable audio for {n}', { n: e.source.name })) + '">') + '</td>' +
          '<td><input class="switch" type="checkbox" id="au-mu-' + id + '" data-sf="mute"' + (sc.mute ? ' checked' : '') + ' aria-label="' + esc(t('Mute {n}', { n: e.source.name })) + '"></td>' +
          '<td class="au-level"><input type="range" min="0" max="100" id="au-lv-' + id + '" data-sf="level" value="' + sc.level + '" aria-label="' + esc(t('Level of {n}', { n: e.source.name })) + '"><output>' + sc.level + ' %</output></td>' +
          '<td><select id="au-rt-' + id + '" data-sf="output" aria-label="' + esc(t('Output for {n}', { n: e.source.name })) + '">' + outOpt(sc.output) + '</select>' + (gone ? '<br><small class="st-bad">' + esc(t('Disconnected — mapping kept, not rerouted')) + '</small>' : '') + '</td>' +
          '<td><div class="meter" data-meter="' + id + '"><i></i></div><button class="clip" type="button" data-clip="' + id + '" hidden title="' + esc(t('Clipping was detected. Click to reset.')) + '">' + esc(t('CLIP')) + '</button><small class="muted" data-meter-text="' + id + '"></small></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div></section>';

    // ---- devices + test
    h += '<section class="card"><div class="card-head"><h2>' + esc(t('Devices')) + '</h2><span class="grow"></span><button class="btn btn-small" type="button" data-a="refresh"' + (A.refreshing || !online ? ' disabled' : '') + '>' + (A.refreshing ? '<span class="spinner"></span>' : icon('refresh')) + esc(t('Refresh devices')) + '</button></div><div class="card-body">' +
      '<div class="table-wrap"><table><thead><tr><th>' + esc(t('Device')) + '</th><th>' + esc(t('Direction')) + '</th><th>' + esc(t('Type')) + '</th><th>' + esc(t('Availability')) + '</th><th>' + esc(t('Supported')) + '</th></tr></thead><tbody>' +
      devs.map((x) => '<tr><td>' + esc(x.name) + '</td><td>' + esc(t(x.dir === 'output' ? 'Output' : 'Input')) + '</td><td>' + esc(t(x.kind)) + '</td><td>' + (x.available ? AW.ui.badge('ok', 'Connected') : AW.ui.badge('bad', 'Disconnected')) + '</td><td class="mono">' + (x.rates ? x.rates.map((r) => r / 1000 + ' kHz').join(', ') + ' · ' + esc(t('up to {n} ch', { n: x.maxCh })) : '—') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="au-test"><h3>' + esc(t('Test output')) + '</h3><div class="au-test-row">' +
      '<label class="field"><span>' + esc(t('Device')) + '</span><select id="au-test-dev" data-f="testdev"' + (test ? ' disabled' : '') + '>' + outOpt(A.testDev) + '</select></label>' +
      '<label class="field"><span>' + esc(t('Test level')) + ' <output id="au-test-out">' + A.testLevel + ' %</output></span><input id="au-test-lv" type="range" min="5" max="60" step="5" value="' + A.testLevel + '" data-f="testlv"' + (test ? ' disabled' : '') + '></label>' +
      '<button class="btn" type="button" data-a="test"' + (test || !online ? ' disabled' : '') + '>' + icon('play') + esc(t('Test Output')) + '</button>' +
      '<button class="btn btn-danger-quiet" type="button" data-a="stop"' + (test ? '' : ' disabled') + '>' + icon('stop') + esc(t('Stop')) + '</button></div>' +
      '<p class="note" role="status">' + (test ? esc(t('Playing a 3-second test tone on {d} at {l}% (Demo: no sound reaches real hardware).', { d: svc.audio.device(test.deviceId).name, l: A.testLevel })) + (A.local ? ' ' + esc(t('You hear it on this browser because local preview monitoring is on.')) : '') : esc(A.testNote || t('Plays a short 440 Hz tone at a conservative level. Stop is available the whole time.'))) + '</p></div></div></section>';

    // ---- advanced
    const oc = svc.audio.outCfg(d, A.advOut), od = svc.audio.device(A.advOut);
    h += '<section class="card"><details id="au-adv"' + (A.advOpen ? ' open' : '') + '><summary class="card-head"><h2>' + esc(t('Advanced endpoint settings')) + '</h2><span class="muted">' + esc(t('Channel mapping, format, gain, buffer and A/V offset')) + '</span></summary><div class="card-body">' +
      '<label class="rowfield"><span>' + esc(t('Endpoint')) + '</span><select id="au-adv-out" data-f="advout">' + outOpt(A.advOut) + '</select></label>' +
      (od && !od.available ? '<div class="callout-box warn">' + icon('alert') + '<span>' + esc(t('This device is disconnected. Settings are kept for when it returns.')) + '</span></div>' : '') +
      '<div class="form-grid">' +
      '<div class="frow"><span>' + esc(t('Channel mode')) + '</span>' + AW.ui.segmented('au-mode', [['stereo', 'Stereo'], ['mono', 'Mono (L+R)']], oc.mode) + '</div>' +
      '<label class="frow"><span>' + esc(t('Swap left and right')) + '</span><input class="switch" type="checkbox" id="au-swap" data-of="swap"' + (oc.swap ? ' checked' : '') + (oc.mode === 'mono' ? ' disabled title="' + esc(t('Not applicable in mono')) + '"' : '') + '></label>' +
      '<label class="frow"><span>' + esc(t('Balance')) + ' <output>' + (oc.balance === 0 ? esc(t('Centre')) : (oc.balance < 0 ? 'L ' : 'R ') + Math.abs(oc.balance)) + '</output></span><input type="range" id="au-bal" min="-50" max="50" step="5" value="' + oc.balance + '" data-of="balance"' + (oc.mode === 'mono' ? ' disabled' : '') + '></label>' +
      '<label class="frow"><span>' + esc(t('Sample rate')) + '</span><select id="au-rate" data-of="sampleRate">' + (od ? od.rates : [48000]).map((r) => '<option value="' + r + '"' + (r === oc.sampleRate ? ' selected' : '') + '>' + r / 1000 + ' kHz</option>').join('') + '</select></label>' +
      '<label class="frow"><span>' + esc(t('Channels')) + '</span><select id="au-ch" data-of="channels">' + [2, 6, 8].filter((n) => !od || n <= od.maxCh).map((n) => '<option value="' + n + '"' + (n === oc.channels ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
      '<label class="frow"><span>' + esc(t('Gain')) + ' <small class="muted">dB, −24 … +12</small></span><input type="number" id="au-gain" min="-24" max="12" step="1" value="' + oc.gainDb + '" data-of="gainDb"></label>' +
      '<label class="frow"><span>' + esc(t('Buffer')) + ' <small class="muted">ms, 10 … 500</small></span><input type="number" id="au-buf" min="10" max="500" step="10" value="' + oc.bufferMs + '" data-of="bufferMs"></label>' +
      '<label class="frow"><span>' + esc(t('Audio/video offset')) + ' <small class="muted">ms, −500 … +500; positive delays audio</small></span><input type="number" id="au-sync" min="-500" max="500" step="10" value="' + oc.syncMs + '" data-of="syncMs"></label>' +
      '</div><p class="field-error" id="au-adv-err" role="alert" hidden></p><p class="note">' + esc(t('Only rates and channel counts the device reports are offered. Values apply to the endpoint, for every source routed to it.')) + '</p></div></details></section>';

    // ---- presets
    const licensed = svc.license.has('audio.presets'), presets = svc.audio.presets.list();
    h += '<section class="card"><div class="card-head"><h2>' + esc(t('Presets')) + '</h2><span class="muted">' + presets.length + '</span><span class="grow"></span><button class="btn btn-small" type="button" data-a="preset-save"' + (licensed ? '' : ' disabled title="' + esc(t('Requires the "Audio presets" license feature')) + '"') + '>' + icon('plus') + esc(t('Save current as preset…')) + '</button></div><div class="card-body">' +
      (licensed ? '' : '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Audio presets are a licensed feature and are locked on this installation.')) + ' <button class="btn btn-small" type="button" data-a="licensing">' + esc(t('Open Licensing')) + '</button></span></div>') +
      (presets.length ? '<div class="table-wrap"><table><tbody>' + presets.map((p) => '<tr><td><b>' + esc(p.name) + '</b><br><small class="muted">' + esc(AW.fmtDateTime(p.savedAt)) + '</small></td><td class="actions"><button class="btn btn-small" type="button" data-a="preset-load" data-id="' + p.id + '"' + (licensed ? '' : ' disabled') + '>' + esc(t('Load')) + '</button><button class="btn btn-small" type="button" data-a="preset-rename" data-id="' + p.id + '"' + (licensed ? '' : ' disabled') + '>' + esc(t('Rename')) + '</button><button class="btn btn-small btn-danger-quiet" type="button" data-a="preset-delete" data-id="' + p.id + '"' + (licensed ? '' : ' disabled') + '>' + esc(t('Delete')) + '</button></td></tr>').join('') + '</tbody></table></div>'
        : '<p class="empty">' + esc(t('No presets yet. A preset stores levels, routing, policy and endpoint settings; loading one stages it for Apply.')) + '</p>') + '</div></section></div>';
    root.innerHTML = h;
    root.scrollTop = scroll;
    if (focusId) { const n = document.getElementById(focusId); if (n && !n.disabled) n.focus({ preventScroll: true }); }
    const det = $('#au-adv', root); if (det) det.addEventListener('toggle', () => { A.advOpen = det.open; });
    drawMeters();
  }
  A.render = render;

  function drawMeters() {
    if (!A.visible || !root) return;
    const live = svc.audio.confirmed(), srcs = svc.audio.sourcesOnWall(AW.wall.S.confirmed);
    const m = svc.audio.meters(live, srcs, Date.now());
    for (const id in m) {
      const bar = root.querySelector('[data-meter="' + id + '"] i'), txt = root.querySelector('[data-meter-text="' + id + '"]'), clip = root.querySelector('[data-clip="' + id + '"]');
      if (!bar) continue;
      bar.style.width = Math.round(m[id].level * 100) + '%'; bar.parentElement.classList.toggle('hot', m[id].level > 0.9);
      if (m[id].clip) A.clips[id] = true;
      clip.hidden = !A.clips[id];
      const tx = m[id].audible ? Math.round(20 * Math.log10(Math.max(0.001, m[id].level))) + ' dBFS' : t('Silent');
      if (txt.textContent !== tx) txt.textContent = tx;
    }
  }

  // Local tone (this browser only) for Test Output when local preview monitoring is enabled.
  function localTone(e) {
    if (osc) { try { osc.stop(); } catch (_) { /* already stopped */ } osc = null; }
    if (e.state !== 'playing' || !A.local) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const g = actx.createGain(); g.gain.value = Math.min(0.12, (e.level / 100) * 0.2);    // conservative
      osc = actx.createOscillator(); osc.frequency.value = 440; osc.connect(g); g.connect(actx.destination); osc.start(); osc.stop(actx.currentTime + e.ms / 1000);
      A.localError = '';
    } catch (_) { A.localError = t('This browser blocked audio playback.'); }
  }

  const setSrc = (id, key, val) => { A.draft.sources[id] = Object.assign(svc.audio.srcCfg(A.draft, id), { [key]: val }); };
  function onInput(e) {
    const n = e.target;
    if (n.type !== 'range') return;
    const out = n.parentElement.querySelector('output');
    if (n.dataset.f === 'vol' || n.dataset.sf === 'level') { if (out) out.textContent = n.value + ' %'; }
    else if (n.dataset.f === 'testlv') $('#au-test-out', root).textContent = n.value + ' %';
  }
  async function onChange(e) {
    const n = e.target, d = A.draft, row = n.closest('[data-src]');
    A.error = '';
    if (n.dataset.f === 'vol') d.master.volume = +n.value;
    else if (n.dataset.f === 'mute') { n.disabled = true; try { await svc.audio.setMasterMute(n.checked); } catch (err) { AW.toast('error', err.message); } return; }
    else if (n.name === 'au-policy') d.policy = n.value;
    else if (n.dataset.f === 'local') {
      A.local = n.checked; A.localError = '';
      if (A.local) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') await actx.resume(); } catch (_) { A.local = false; A.localError = t('This browser does not allow audio playback here.'); } }
    }
    else if (n.name === 'au-active') { d.active = n.value; setSrc(n.value, 'enabled', true); }
    else if (row && n.dataset.sf) setSrc(row.dataset.src, n.dataset.sf, n.type === 'checkbox' ? n.checked : n.type === 'range' ? +n.value : n.value);
    else if (n.dataset.f === 'testdev') A.testDev = n.value;
    else if (n.dataset.f === 'testlv') A.testLevel = +n.value;
    else if (n.dataset.f === 'advout') A.advOut = n.value;
    else if (n.name === 'au-mode' || n.dataset.of) {
      const oc = svc.audio.outCfg(d, A.advOut), key = n.name === 'au-mode' ? 'mode' : n.dataset.of;
      const val = n.type === 'checkbox' ? n.checked : key === 'mode' ? n.value : Number(n.value);
      const next = Object.assign({}, oc, { [key]: val });
      const problems = svc.audio.validate({ outputs: { [A.advOut]: next } });
      if (typeof val === 'number' && (!Number.isFinite(val) || problems.length)) { const err = $('#au-adv-err', root); err.textContent = problems[0] || t('Enter a number.'); err.hidden = false; n.setAttribute('aria-invalid', 'true'); n.value = oc[key]; return; }
      d.outputs[A.advOut] = next;
    } else return;
    render();
  }
  async function onClick(e) {
    const clip = e.target.closest('[data-clip]'); if (clip) { delete A.clips[clip.dataset.clip]; clip.hidden = true; return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, id = b.dataset.id;
    const nameTaken = (v, except) => svc.audio.presets.list().some((p) => p.id !== except && p.name.toLowerCase() === v.toLowerCase()) ? t('A preset with this name already exists.') : null;
    try {
      if (a === 'apply') {
        A.busy = true; A.error = ''; render();
        try { await svc.audio.apply(A.draft); AW.toast('ok', t('Audio configuration confirmed by the controller.') + ' ' + t('(Demo acknowledgement)')); }
        catch (err) { A.error = err.message; }
        finally { A.busy = false; A.draft.master.mute = svc.audio.confirmed().master.mute; render(); }
      } else if (a === 'discard') { A.draft = svc.audio.confirmed(); A.error = ''; render(); }
      else if (a === 'refresh') { A.refreshing = true; render(); try { await svc.audio.refreshDevices(); AW.toast('info', t('Device list refreshed.')); } finally { A.refreshing = false; render(); } }
      else if (a === 'test') { A.testNote = ''; svc.audio.startTest(A.testDev, A.testLevel, 3); }
      else if (a === 'stop') { svc.audio.stopTest('stopped'); A.testNote = t('Test stopped.'); render(); }
      else if (a === 'licensing') AW.app.go('settings', 'licensing');
      else if (a === 'preset-save') { const name = await AW.promptText({ title: t('Save audio preset'), label: t('Preset name'), value: t('Preset {n}', { n: svc.audio.presets.list().length + 1 }), validate: (v) => nameTaken(v) }); if (name) { svc.audio.presets.save(name, A.draft); AW.toast('ok', t('Preset "{n}" saved.', { n: name })); } }
      else if (a === 'preset-load') { const cfg = svc.audio.presets.get(id); if (cfg) { cfg.master.mute = A.draft.master.mute; A.draft = cfg; AW.toast('info', t('Preset staged. Review it and use Apply audio changes to make it live.')); render(); } }
      else if (a === 'preset-rename') { const p = svc.audio.presets.list().find((x) => x.id === id); const name = await AW.promptText({ title: t('Rename preset'), label: t('Preset name'), value: p.name, validate: (v) => nameTaken(v, id) }); if (name) svc.audio.presets.rename(id, name); }
      else if (a === 'preset-delete') { const p = svc.audio.presets.list().find((x) => x.id === id); if (await AW.confirm({ title: t('Delete preset?'), message: t('"{n}" will be deleted. The live audio configuration is not affected.', { n: p.name }), confirmLabel: t('Delete'), danger: true })) svc.audio.presets.remove(id); }
    } catch (err) { A.testNote = err.message; AW.toast('error', err.message); render(); }
  }
})();
