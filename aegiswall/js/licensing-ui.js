/* AegisWall — Licensing UI. Two flows:
 *   end user      — enter or import a license, activate, see status (also reachable from the entry screen);
 *   administrator — generate and manage licenses.
 * Everything issued here is "Demo Only". A browser cannot protect production software: real licenses are
 * signed and verified by an authorized backend (see docs/INTEGRATION.md). */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$, svc = AW.svc;
  const lic = () => svc.license;
  const STATE = {
    not_activated: ['info', 'Not activated'], valid: ['ok', 'Valid'], activated: ['ok', 'Activated'], already_activated: ['info', 'Already activated'],
    invalid: ['bad', 'Invalid'], expired: ['bad', 'Expired'], revoked: ['bad', 'Revoked'], limit: ['bad', 'Activation limit reached'], unavailable: ['warn', 'Service unavailable'], generating: ['info', 'Generating…'],
  };
  const badge = (state) => { const s = STATE[state] || ['info', state]; return AW.ui.badge(s[0], s[1]); };
  const featureList = (ids) => (ids && ids.length ? ids.map((f) => esc(t(lic().FEATURES[f] || f))).join(', ') : esc(t('None')));
  const expiry = (p) => (p.expiresAt ? esc(AW.fmtDate(p.expiresAt)) + (Date.parse(p.expiresAt) < Date.now() ? ' (' + esc(t('expired')) + ')' : '') : esc(t('Perpetual')));
  const L = (AW.licensingUI = { text: '', result: null, busy: false });

  function meta(p, extra) {
    return '<dl class="kv">' + [['License ID', '<span class="mono">' + esc(p.id) + '</span>'], ['Edition', esc(t(lic().EDITIONS[p.edition] ? lic().EDITIONS[p.edition].label : p.edition))], ['Features', featureList(p.features)],
      ['Issued', esc(AW.fmtDate(p.issuedAt))], ['Expires', expiry(p)], ['Permitted installations', String(p.deviceLimit)]].concat(extra || []).map(([k, v]) => '<div><dt>' + esc(t(k)) + '</dt><dd>' + v + '</dd></div>').join('') + '</dl>';
  }
  function statusCard() {
    const st = lic().status();
    return '<div class="lic-status"><p>' + badge(st.state) + ' <b>' + esc(st.message) + '</b> <span class="badge demo">' + esc(t('Demo Only')) + '</span></p>' +
      (st.payload ? meta(st.payload, [['Activated on this installation', st.activatedAt ? esc(AW.fmtDateTime(st.activatedAt)) : '—']]) : '') +
      '<p class="note">' + esc(t('Installation ID')) + ': <span class="mono">' + esc(lic().installation()) + '</span></p>' +
      '<div class="lic-features"><h3>' + esc(t('Licensed features')) + '</h3>' + Object.keys(lic().FEATURES).map((f) => { const on = st.features.indexOf(f) >= 0; return '<p>' + icon(on ? 'ok' : 'lock') + '<span>' + esc(t(lic().FEATURES[f])) + '</span>' + AW.ui.badge(on ? 'ok' : 'info', on ? 'Enabled' : 'Locked') + '</p>'; }).join('') + '</div></div>';
  }
  // End-user block: enter/import, validate, activate.
  function activateBlock() {
    const r = L.result, st = lic().status();
    return '<div class="lic-activate"><label class="field"><span>' + esc(t('License text')) + '</span><textarea id="lic-text" rows="4" spellcheck="false" placeholder="AWDEMO1.…" aria-describedby="lic-help">' + esc(L.text) + '</textarea></label>' +
      '<p class="note" id="lic-help">' + esc(t('Paste the license text, or import the license file you received.')) + '</p>' +
      '<div class="btn-row"><button class="btn" type="button" data-l="import">' + icon('upload') + esc(t('Import license file…')) + '</button>' +
      '<button class="btn" type="button" data-l="validate"' + (L.busy ? ' disabled' : '') + '>' + esc(t('Validate')) + '</button>' +
      '<button class="btn btn-primary" type="button" data-l="activate"' + (L.busy ? ' disabled' : '') + '>' + (L.busy === 'activate' ? '<span class="spinner"></span>' : icon('key')) + esc(t('Activate')) + '</button>' +
      (st.state !== 'not_activated' ? '<button class="btn btn-danger-quiet" type="button" data-l="deactivate">' + esc(t('Deactivate this installation')) + '</button>' : '') + '</div>' +
      (r ? '<div class="callout-box ' + (STATE[r.state] ? { ok: 'ok', bad: 'bad', warn: 'warn', info: '' }[STATE[r.state][0]] : '') + '" role="status">' + icon(r.ok ? 'ok' : 'alert') + '<div><p>' + badge(r.state) + ' ' + esc(r.message) + '</p>' + (r.payload ? meta(r.payload) : '') + '</div></div>' : '') + '</div>';
  }
  async function handle(action, rerender) {
    const ta = document.getElementById('lic-text'); if (ta) L.text = ta.value;
    try {
      if (action === 'import') {
        const f = await AW.pickFile('.json,.txt,application/json,text/plain'); if (!f) return;
        L.text = f.text.trim();
        try { const o = JSON.parse(L.text); if (o && typeof o.token === 'string') L.text = o.token; } catch (_) { /* plain license text */ }
        L.result = { state: 'not_activated', ok: true, message: t('File "{n}" loaded. Validate or activate it.', { n: f.name }) };
      } else if (action === 'validate') {
        L.busy = 'validate'; rerender();
        const v = await lic().validate(L.text);
        L.result = { state: v.state, ok: v.state === 'valid', payload: v.payload, message: v.state === 'valid' ? t('This license is valid. {a} of {n} installation(s) used.', { a: v.activations, n: v.payload.deviceLimit }) : v.reason };
      } else if (action === 'activate') {
        L.busy = 'activate'; rerender();
        const a = await lic().activate(L.text);
        L.result = { state: a.state, ok: true, payload: a.payload, message: a.state === 'already_activated' ? t('This installation is already activated with this license. Nothing changed.') : t('Activation succeeded. Licensed features are now enabled; your work was not touched.') };
        if (a.state === 'activated') AW.toast('ok', t('Installation activated — {e} edition.', { e: t(lic().EDITIONS[a.payload.edition].label) }) + ' ' + t('(Demo Only)'));
      } else if (action === 'deactivate') {
        if (!(await AW.confirm({ title: t('Deactivate this installation?'), message: t('Licensed features lock again and the license frees one installation slot. Your wall, layouts and settings are kept.'), confirmLabel: t('Deactivate'), danger: true }))) return;
        lic().deactivate(); L.result = { state: 'not_activated', ok: true, message: t('This installation was deactivated.') };
      }
    } catch (e) {
      const state = STATE[e.code] ? e.code : 'invalid';
      L.result = { state, ok: false, payload: e.payload, message: e.message };
    } finally { L.busy = false; rerender(); }
  }

  // ------------------------------------------------------------------ end-user dialog (entry screen / header)
  L.openActivation = function () {
    const body = AW.el('<div class="lic-dialog"></div>');
    const draw = () => { body.innerHTML = statusCard() + '<h3>' + esc(t('Enter or import a license')) + '</h3>' + activateBlock() + '<p class="note">' + esc(t('Generating licenses requires signing in as an Administrator (Settings → Licensing).')) + '</p>'; };
    body.addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (b) handle(b.dataset.l, draw); });
    const off = AW.bus.on('license', draw);
    draw();
    AW.dialog({ title: t('Licensing'), body, wide: true, cls: 'lic', actions: [{ label: t('Close'), value: null }], onClose: off });
  };

  // ------------------------------------------------------------------ generate dialog (administrator)
  L.openGenerate = function () {
    const body = AW.el('<div class="lic-gen"></div>');
    const F = { edition: 'professional', features: lic().EDITIONS.professional.features.slice(), policy: 'perpetual', date: AW.fmtDate(Date.now() + 365 * 86400000), devices: 1 };
    let phase = 'form', out = null, error = '', api;
    const expiresAt = () => F.policy === 'perpetual' ? null : F.policy === '30d' ? new Date(Date.now() + 30 * 86400000).toISOString() : F.policy === '1y' ? new Date(Date.now() + 365 * 86400000).toISOString() : F.policy === 'expired' ? new Date(Date.now() - 86400000).toISOString() : new Date(F.date + 'T23:59:59').toISOString();
    const draw = () => {
      if (phase === 'form' || phase === 'generating') {
        const dis = phase === 'generating' ? ' disabled' : '';
        body.innerHTML = '<p class="note">' + esc(t('Issues a unique license record on the demo service and stores it in this browser.')) + ' <span class="badge demo">' + esc(t('Demo Only')) + '</span></p>' +
          '<div class="form-grid"><label class="frow"><span>' + esc(t('Product edition')) + '</span><select id="gen-edition"' + dis + '>' + Object.keys(lic().EDITIONS).map((k) => '<option value="' + k + '"' + (k === F.edition ? ' selected' : '') + '>' + esc(t(lic().EDITIONS[k].label)) + '</option>').join('') + '</select></label>' +
          '<fieldset class="frow"><legend>' + esc(t('Enabled features')) + '</legend><div class="checks">' + Object.keys(lic().FEATURES).map((f) => '<label><input type="checkbox" data-feat="' + f + '"' + (F.features.indexOf(f) >= 0 ? ' checked' : '') + dis + '> ' + esc(t(lic().FEATURES[f])) + '</label>').join('') + '</div></fieldset>' +
          '<label class="frow"><span>' + esc(t('Expiration policy')) + '</span><select id="gen-policy"' + dis + '>' + [['perpetual', 'Perpetual'], ['30d', '30 days'], ['1y', '1 year'], ['date', 'Until a date…'], ['expired', 'Already expired (for testing)']].map(([v, l]) => '<option value="' + v + '"' + (v === F.policy ? ' selected' : '') + '>' + esc(t(l)) + '</option>').join('') + '</select></label>' +
          (F.policy === 'date' ? '<label class="frow"><span>' + esc(t('Expiration date')) + '</span><input type="date" id="gen-date" value="' + esc(F.date) + '"' + dis + '></label>' : '') +
          '<label class="frow"><span>' + esc(t('Permitted installations')) + ' <small class="muted">1–999</small></span><input type="number" id="gen-devices" min="1" max="999" step="1" value="' + F.devices + '"' + dis + '></label></div>' +
          (error ? '<div class="callout-box bad" role="alert">' + icon('alert') + '<span>' + esc(error) + '</span></div>' : '') +
          (phase === 'generating' ? '<div class="gen-progress" role="status"><div class="apply-bar static"><i></i></div><p>' + badge('generating') + ' ' + esc(t('Creating a unique identifier and recording the license…')) + '</p></div>' : '');
      } else {
        const p = out.payload, st = lic().status(), mine = st.payload && st.payload.id === p.id && st.state === 'valid';
        body.innerHTML = '<div class="lic-reveal"><p>' + icon('ok') + ' <b>' + esc(t('License generated')) + '</b> <span class="badge demo">' + esc(t('Demo Only')) + '</span></p>' +
          '<label class="field"><span>' + esc(t('License text (select to copy)')) + '</span><textarea id="gen-out" class="lic-out" rows="5" readonly spellcheck="false">' + esc(out.token) + '</textarea></label>' +
          meta(p, [['Activation state', mine ? badge('activated') : badge('not_activated')]]) +
          '<p class="note" id="gen-note" role="status">' + esc(error || t('Keep this text or the license file: it is what an installation needs to activate.')) + '</p></div>';
      }
      if (api) api.setActions(phase === 'form' ? [{ label: t('Cancel'), value: null }, { label: t('Generate License'), kind: 'primary', keepOpen: true, run: () => { generate(); return false; } }]
        : phase === 'generating' ? [{ label: t('Generating…'), kind: 'primary', disabled: true }]
          : [{ label: t('Copy'), keepOpen: true, run: (a, b) => { AW.copyText(out.token).then((ok) => { b.textContent = ok ? t('Copied') : t('Select the text and copy'); if (!ok) $('#gen-out', body).select(); }); return false; } },
            { label: t('Download License File'), keepOpen: true, run: () => { AW.saveFile('aegiswall-license-' + out.payload.id.toLowerCase() + '.json', lic().file(out.token, out.payload)); return false; } },
            { label: t('Activate on This Installation'), kind: 'primary', keepOpen: true, run: () => { activateHere(); return false; } },
            { label: t('Close'), value: null }]);
    };
    const read = () => { const d = $('#gen-devices', body); if (d) F.devices = Number(d.value); const dt = $('#gen-date', body); if (dt) F.date = dt.value; };
    async function generate() {
      read(); error = '';
      if (!Number.isInteger(F.devices) || F.devices < 1 || F.devices > 999) error = t('Permitted installations must be a whole number from 1 to 999.');
      else if (F.policy === 'date' && (!F.date || Number.isNaN(Date.parse(F.date)))) error = t('Choose an expiration date.');
      if (error) return draw();
      phase = 'generating'; draw();
      try { out = await lic().generate({ edition: F.edition, features: F.features, expiresAt: expiresAt(), deviceLimit: F.devices }); phase = 'done'; }
      catch (e) { error = (e.code === 'unavailable' ? t('Service unavailable') + ': ' : '') + e.message; phase = 'form'; }
      draw();
      if (phase === 'done') $('#gen-out', body).focus();
    }
    async function activateHere() {
      const note = $('#gen-note', body); note.textContent = t('Activating…');
      try { const a = await lic().activate(out.token); error = a.state === 'already_activated' ? t('This installation is already activated with this license.') : t('Activated on this installation. Licensed features are now enabled.'); }
      catch (e) { error = t('Activation refused') + ' — ' + t((STATE[e.code] || ['', 'Invalid'])[1]) + ': ' + e.message; }
      draw();
    }
    body.addEventListener('change', (e) => {
      const n = e.target; read();
      if (n.id === 'gen-edition') { F.edition = n.value; F.features = lic().EDITIONS[n.value].features.slice(); draw(); }
      else if (n.id === 'gen-policy') { F.policy = n.value; draw(); }
      else if (n.dataset.feat) { if (n.checked) F.features.push(n.dataset.feat); else F.features = F.features.filter((f) => f !== n.dataset.feat); }
    });
    AW.dialog({ title: t('Generate license'), body, wide: true, cls: 'lic', dismissible: true, actions: [], onMount(a) { api = a; draw(); } });
  };

  // ------------------------------------------------------------------ Settings → Licensing panel
  L.render = function (host) {
    const admin = AW.can('administrator'), list = lic().list().slice().reverse(), me = lic().installation();
    host.innerHTML = '<section class="card"><div class="card-head"><h2>' + esc(t('Activation status')) + '</h2></div><div class="card-body">' + statusCard() + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + esc(t('Activate this installation')) + '</h2><span class="muted">' + esc(t('End user')) + '</span></div><div class="card-body">' + activateBlock() + '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + esc(t('License administration')) + '</h2><span class="muted">' + esc(t('Administrator')) + '</span><span class="grow"></span>' +
      '<button class="btn btn-primary" type="button" data-l="generate"' + (admin ? '' : ' disabled title="' + esc(t('Requires the Administrator profile')) + '"') + '>' + icon('key') + esc(t('Generate License…')) + '</button></div><div class="card-body">' +
      (admin ? '' : '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Generating, listing and revoking licenses requires the Administrator profile. The service refuses these requests for other profiles, not just this screen.')) + '</span></div>') +
      (admin ? (list.length ? '<div class="table-wrap"><table><thead><tr><th>' + esc(t('License ID')) + '</th><th>' + esc(t('Edition')) + '</th><th>' + esc(t('Issued')) + '</th><th>' + esc(t('Expires')) + '</th><th>' + esc(t('Installations')) + '</th><th>' + esc(t('State')) + '</th><th></th></tr></thead><tbody>' +
        list.map((r) => { const state = r.revoked ? 'revoked' : r.expiresAt && Date.parse(r.expiresAt) < Date.now() ? 'expired' : 'valid', here = r.activations.some((a) => a.installation === me);
          return '<tr><td class="mono">' + esc(r.id) + '</td><td>' + esc(t(lic().EDITIONS[r.edition].label)) + '</td><td>' + esc(AW.fmtDate(r.issuedAt)) + '</td><td>' + expiry(r) + '</td><td>' + r.activations.length + ' / ' + r.deviceLimit + (here ? ' · ' + esc(t('this one')) : '') + '</td><td>' + badge(state) + '</td>' +
            '<td class="actions"><button class="btn btn-small" type="button" data-l="copy" data-id="' + r.id + '">' + esc(t('Copy')) + '</button><button class="btn btn-small" type="button" data-l="download" data-id="' + r.id + '">' + esc(t('Download')) + '</button><button class="btn btn-small" type="button" data-l="use" data-id="' + r.id + '" title="' + esc(t('Put this license in the activation box above')) + '">' + esc(t('Use')) + '</button>' +
            '<button class="btn btn-small btn-danger-quiet" type="button" data-l="revoke" data-id="' + r.id + '"' + (r.revoked ? ' disabled' : '') + '>' + esc(t('Revoke')) + '</button></td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="empty">' + esc(t('No licenses issued yet. Generate one to try the full flow: copy or download it, import it, then activate.')) + '</p>') : '') +
      '</div></section>' +
      '<section class="card"><div class="card-head"><h2>' + esc(t('Demo tools')) + '</h2><span class="muted">' + esc(t('For repeating the licensing flow')) + '</span></div><div class="card-body"><div class="btn-row">' +
      '<button class="btn" type="button" data-l="new-install" title="' + esc(t('Pretend this is another computer: new installation ID, activation cleared')) + '">' + esc(t('Simulate a different installation')) + '</button>' +
      '<button class="btn btn-danger-quiet" type="button" data-l="reset">' + esc(t('Reset licensing demo data')) + '</button></div>' +
      '<p class="note">' + esc(t('Use "Simulate a different installation" after activating a 1-installation license to see "Activation limit reached".')) + '</p></div></section>' +
      '<section class="card"><div class="card-body"><div class="callout-box">' + icon('info') + '<span>' + esc(t('Demo only. Activation here is checked by code running in your browser and can be bypassed. Production licensing signs license payloads on an authorized backend, keeps signing keys out of the client, verifies signature, entitlements, validity and activation policy on the server, enforces features at the service layer, and records administrative actions in an audit trail. Revocation reaches offline installations only as fast as their verification policy allows.')) + '</span></div></div></section>';
  };
  L.bind = function (host, rerender) {
    host.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-l]'); if (!b) return;
      const a = b.dataset.l, id = b.dataset.id, rec = id && lic().list().find((r) => r.id === id);
      try {
        if (a === 'generate') L.openGenerate();
        else if (a === 'copy' && rec) { const ok = await AW.copyText(rec.token); AW.toast(ok ? 'ok' : 'warn', ok ? t('License text copied.') : t('Copy was blocked by the browser. Use Download instead.')); }
        else if (a === 'download' && rec) { const p = Object.assign({}, rec); delete p.token; delete p.activations; delete p.revoked; delete p.revokedAt; await AW.saveFile('aegiswall-license-' + rec.id.toLowerCase() + '.json', lic().file(rec.token, p)); }
        else if (a === 'use' && rec) { L.text = rec.token; L.result = null; rerender(); const ta = document.getElementById('lic-text'); if (ta) ta.focus(); }
        else if (a === 'revoke' && rec) { if (await AW.confirm({ title: t('Revoke license?'), message: t('{id} stops being valid. Installations activated with it lose their licensed features the next time the license is checked.', { id: rec.id }), confirmLabel: t('Revoke'), danger: true })) { await lic().revoke(id); AW.toast('info', t('License revoked.')); } }
        else if (a === 'new-install') { const nid = lic().newInstallationId(); L.result = null; AW.toast('info', t('Now acting as installation {id}. Activation was cleared.', { id: nid })); }
        else if (a === 'reset') { if (await AW.confirm({ title: t('Reset licensing demo data?'), message: t('All demo licenses, the activation and the installation ID are erased. Wall layouts and settings are kept.'), confirmLabel: t('Reset'), danger: true })) { lic().resetDemo(); L.text = ''; L.result = null; AW.toast('info', t('Licensing demo data reset.')); } }
        else handle(a, rerender);
      } catch (err) { AW.toast('error', err.message); }
    });
  };
})();
