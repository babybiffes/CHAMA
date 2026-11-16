/* AegisWall — Settings workspace, part 1: searchable categories, a schema-driven form engine and the
 * categories for appearance, account, hardware mapping, preview & rendering, content reload,
 * configuration lifecycle and demo tools. Every setting states its scope, range, default and when it applies. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$, svc = AW.svc, clone = AW.clone;
  const CATS = [
    ['General', 'appearance', 'Appearance', 'theme motion clock monitor ids opening sequence intro snapping dark light'],
    ['General', 'account', 'Account', 'user role profile sign out session timeout permissions operator technician administrator'],
    ['Wall', 'hardware', 'Hardware mapping', 'outputs tiles planned detected confirmed wall name mapping gpu displayport'],
    ['Wall', 'rendering', 'Preview & rendering', 'quality shadows reflections render resolution frame rate thumbnail live static bitrate 3d'],
    ['Wall', 'reload', 'Content reload', 'reload interval timeout retry backoff cache schedule refresh web youtube'],
    ['Controller host', 'network', 'Network access', 'http https port certificate tls bind hostname listener url'],
    ['Controller host', 'database', 'Database', 'sqlite postgresql connection backup restore schema retention pool'],
    ['Controller host', 'config', 'Configuration', 'export import version persistence recovery previous'],
    ['Advanced maintenance', 'logs', 'Logs', 'severity audit trail export retention rotation level follow'],
    ['Advanced maintenance', 'console', 'Technician console', 'command diagnostics ping service status devices'],
    ['Licensing', 'licensing', 'Licensing', 'license activate generate edition features revoke import'],
    ['Developer', 'demo', 'Demo tools', 'simulate failure offline unplug webgl fallback reset'],
  ];
  const P = (AW.settingsUI = { cat: 'appearance', query: '', visible: false, drafts: {}, errors: {}, panels: {}, flash: '', ver: {} });
  let root, main, nav;
  const SCOPE = { browser: 'This browser (user preference)', session: 'This browser session', wall: 'This wall', source: 'Per source', host: 'Controller host' };

  // ------------------------------------------------------------------ form engine
  const fid = (cat, key) => 'set-' + cat + '-' + key;
  function control(cat, f, v, dis) {
    const id = fid(cat, f.key), d = dis || f.disabled ? ' disabled' : '';
    if (f.type === 'readonly') return '<div class="set-ro" id="' + id + '">' + (f.value == null ? AW.ui.unavailable(f.reason) : '<b>' + esc(f.value) + '</b>') + '<small class="muted">' + esc(t('Read-only')) + (f.reason ? ' — ' + esc(t(f.reason)) : '') + '</small></div>';
    if (f.type === 'switch') return '<input class="switch" type="checkbox" id="' + id + '" data-key="' + f.key + '"' + (v ? ' checked' : '') + d + '>';
    if (f.type === 'seg') return '<div id="' + id + '" data-seg="' + f.key + '">' + AW.ui.segmented(id + '-r', f.options, v, !!d) + '</div>';
    if (f.type === 'select') return '<select id="' + id + '" data-key="' + f.key + '"' + d + '>' + f.options.map(([val, label, off]) => '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + (off ? ' disabled' : '') + '>' + esc(t(label)) + '</option>').join('') + '</select>';
    if (f.type === 'number') return '<div class="with-unit"><input type="number" id="' + id + '" data-key="' + f.key + '" min="' + f.min + '" max="' + f.max + '" step="' + (f.step || 1) + '" value="' + esc(v) + '"' + d + '>' + (f.unit ? '<span>' + esc(f.unit) + '</span>' : '') + '</div>';
    if (f.type === 'time') return '<input type="time" id="' + id + '" data-key="' + f.key + '" value="' + esc(v) + '"' + d + '>';
    if (f.type === 'password') return '<input type="password" id="' + id + '" data-key="' + f.key + '" value="" autocomplete="new-password" placeholder="' + esc(f.placeholder || '') + '"' + d + '>';
    return '<input type="text" id="' + id + '" data-key="' + f.key + '" value="' + esc(v == null ? '' : v) + '" spellcheck="false" autocomplete="off"' + (f.maxlength ? ' maxlength="' + f.maxlength + '"' : '') + d + '>';
  }
  function row(cat, f, v, o) {
    const err = (P.errors[cat] || {})[f.key];
    const defTxt = f.def === undefined ? '' : (f.options ? (f.options.find((x) => String(x[0]) === String(f.def)) || [0, String(f.def)])[1] : typeof f.def === 'boolean' ? (f.def ? 'On' : 'Off') : String(f.def) + (f.unit ? ' ' + f.unit : ''));
    const metaBits = [t('Scope') + ': ' + t(SCOPE[f.scope || o.scope])];
    if (f.type === 'number') metaBits.push(t('Range') + ': ' + f.min + '–' + f.max + (f.unit ? ' ' + f.unit : ''));
    if (defTxt) metaBits.push(t('Default') + ': ' + t(defTxt));
    if (f.type !== 'readonly') metaBits.push(t(f.applies || o.applies));
    return '<div class="set-row' + (P.flash === f.key ? ' flash' : '') + '" data-row="' + f.key + '"><div class="set-label"><label for="' + fid(cat, f.key) + '">' + esc(t(f.label)) + '</label>' +
      (f.help ? '<p class="note">' + esc(t(f.help)) + '</p>' : '') + '<p class="set-meta">' + esc(metaBits.join(' · ')) + '</p></div>' +
      '<div class="set-control">' + control(cat, f, v, o.readOnly) + (err ? '<p class="field-error" role="alert">' + esc(err) + '</p>' : '') + '</div></div>';
  }
  // Registers a category rendered from a field schema with Basic / Advanced groups and Save, Cancel, Restore Defaults.
  P.formPanel = function (o) {
    const cat = o.id;
    // a draft remembers the configuration version it started from (stale concurrent edits are refused on Save)
    const draft = () => { if (!P.drafts[cat]) { P.drafts[cat] = clone(o.load()); if (o.section) P.ver[cat] = svc.config.sectionVersion(o.section); } return P.drafts[cat]; };
    const dirty = () => !!P.drafts[cat] && JSON.stringify(P.drafts[cat]) !== JSON.stringify(o.load());
    P.panels[cat] = {
      dirty,
      render(host) {
        const d = draft(), fields = o.fields(d), ro = o.role && !AW.can(o.role), opts = { scope: o.scope, applies: o.applies, readOnly: ro };
        const basic = fields.filter((f) => !f.adv), adv = fields.filter((f) => f.adv);
        const advOpen = P['adv-' + cat] || adv.some((f) => f.key === P.flash);
        host.innerHTML = '<header class="set-head"><h2>' + esc(t(o.title)) + '</h2>' + (o.demo ? AW.ui.demo() : '') + '<p>' + esc(t(o.intro)) + '</p></header>' +
          (ro ? '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Read-only: changing these settings requires the {r} profile. The service enforces this, not just this screen.', { r: t(AW.ROLE_LABEL[o.role]) })) + '</span></div>' : '') +
          (o.before ? o.before(d) : '') +
          '<section class="card"><div class="card-head"><h2>' + esc(t('Basic')) + '</h2></div><div class="card-body set-form">' + basic.map((f) => row(cat, f, d[f.key], opts)).join('') + '</div></section>' +
          (adv.length ? '<section class="card"><details data-adv' + (advOpen ? ' open' : '') + '><summary class="card-head"><h2>' + esc(t('Advanced')) + '</h2><span class="muted">' + adv.length + ' ' + esc(t('settings')) + '</span></summary><div class="card-body set-form">' + adv.map((f) => row(cat, f, d[f.key], opts)).join('') + '</div></details></section>' : '') +
          (o.after ? o.after(d) : '') +
          '<div class="set-actions"><button class="btn btn-primary" type="button" data-form="save"' + (dirty() && !ro && !P.busy ? '' : ' disabled') + '>' + (P.busy === cat ? '<span class="spinner"></span>' : '') + esc(t(o.saveLabel || 'Save')) + '</button>' +
          '<button class="btn" type="button" data-form="cancel"' + (dirty() ? '' : ' disabled') + '>' + esc(t('Cancel')) + '</button>' +
          '<button class="btn" type="button" data-form="defaults"' + (ro ? ' disabled' : '') + '>' + esc(t('Restore Defaults')) + '</button>' +
          '<span class="note" role="status">' + esc(dirty() ? t('Unsaved changes in this category. They are kept if you look at another page.') : P['saved-' + cat] || '') + '</span></div>';
        const det = host.querySelector('[data-adv]'); if (det) det.addEventListener('toggle', () => { P['adv-' + cat] = det.open; });
        if (o.bind) o.bind(host, d);
      },
      change(n) {
        const d = draft(), seg = n.closest('[data-seg]'), key = seg ? seg.dataset.seg : n.dataset.key; if (!key) return false;
        const f = o.fields(d).find((x) => x.key === key); if (!f) return false;
        let v = n.type === 'checkbox' ? n.checked : n.value;
        if (f.type === 'number') v = n.value.trim() === '' ? NaN : Number(n.value);
        else if (f.options && f.options.some((x) => typeof x[0] === 'number')) v = Number(v);
        d[key] = v;
        if (o.onChange) o.onChange(d, key);
        P.errors[cat] = validate(d);
        P['saved-' + cat] = '';
        return true;
      },
      async action(a) {
        const d = draft();
        if (a === 'cancel') { delete P.drafts[cat]; P.errors[cat] = {}; return true; }
        if (a === 'defaults') { P.drafts[cat] = Object.assign(d, clone(o.defaults())); P.errors[cat] = validate(P.drafts[cat]); P['saved-' + cat] = ''; return true; }
        if (a === 'save') {
          P.errors[cat] = validate(d);
          if (Object.keys(P.errors[cat]).length) return true;
          const before = o.load(), fields = o.fields(d);
          const changes = fields.filter((f) => f.type !== 'readonly' && JSON.stringify(before[f.key]) !== JSON.stringify(d[f.key]));
          if (o.disruptive) {   // concise change summary before anything disruptive is applied
            const note = o.disruptive(d, changes); if (note) {
              const show = (f, v) => { const op = f.options && f.options.find((x) => String(x[0]) === String(v)); return op ? t(op[1]) : typeof v === 'boolean' ? t(v ? 'On' : 'Off') : v + (f.unit ? ' ' + f.unit : ''); };
              const ok = await AW.confirm({ title: t('Apply these changes?'), confirmLabel: t('Apply'), html: '<p>' + esc(note) + '</p><ul>' + changes.map((f) => '<li><b>' + esc(t(f.label)) + ':</b> ' + esc(show(f, before[f.key])) + ' → ' + esc(show(f, d[f.key])) + '</li>').join('') + '</ul>' });
              if (!ok) return false;
            }
          }
          P.busy = cat; renderMain();
          try { await o.save(d); delete P.drafts[cat]; P['saved-' + cat] = t('Saved at {time}.', { time: AW.fmtTime() }) + ' ' + t(o.persist || ''); AW.toast('ok', t('{c} settings saved.', { c: t(o.title) })); }
          catch (e) { if (e.fields) P.errors[cat] = e.fields; AW.toast('error', e.message); P['saved-' + cat] = ''; if (e.code === 'conflict') P.conflict = cat; }
          finally { P.busy = ''; }
          return true;
        }
        return o.action ? o.action(a, d) : false;
      },
    };
    function validate(d) {
      const errs = {};
      for (const f of o.fields(d)) {
        const v = d[f.key];
        if (f.type === 'number' && !f.disabled) { if (!Number.isFinite(v)) errs[f.key] = t('Enter a number.'); else if (v < f.min || v > f.max) errs[f.key] = t('Must be between {a} and {b}{u}.', { a: f.min, b: f.max, u: f.unit ? ' ' + f.unit : '' }); else if (f.integer !== false && !Number.isInteger(v)) errs[f.key] = t('Use a whole number.'); }
        if (f.type === 'text' && f.required && !String(v || '').trim()) errs[f.key] = t('This field is required.');
      }
      return Object.assign(errs, o.validate ? o.validate(d) : {});
    }
  };

  // ------------------------------------------------------------------ shell
  P.build = function (el) {
    root = el;
    root.innerHTML = '<div class="settings"><aside class="set-nav"><h1>' + esc(t('Settings')) + '</h1>' +
      '<label class="search">' + icon('search') + '<input id="set-search" type="search" placeholder="' + esc(t('Search settings')) + '" aria-label="' + esc(t('Search settings')) + '" spellcheck="false" autocomplete="off"></label>' +
      '<nav id="set-cats" aria-label="' + esc(t('Settings categories')) + '"></nav></aside><section class="set-main" id="set-main" tabindex="-1"></section></div>';
    main = $('#set-main', root); nav = $('#set-cats', root);
    $('#set-search', root).addEventListener('input', (e) => { P.query = e.target.value; renderNav(); });
    nav.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) P.open(b.dataset.cat, b.dataset.field); });
    main.addEventListener('change', (e) => { const p = P.panels[P.cat]; if (p && p.change && p.change(e.target)) { renderMain(e.target.id || (e.target.closest('[data-seg]') || {}).id); renderNav(); } });
    main.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-form]'); if (!b) return;
      const p = P.panels[P.cat]; if (!p || !p.action) return;
      if (await p.action(b.dataset.form)) { renderMain(); renderNav(); }
    });
    if (AW.licensingUI) { AW.licensingUI.bind(main, () => renderMain()); P.panels.licensing = { render: (host) => { host.innerHTML = '<header class="set-head"><h2>' + esc(t('Licensing')) + '</h2><p>' + esc(t('Activate this installation, or generate and manage licenses as an administrator.')) + '</p></header><div id="lic-host" class="set-stack"></div>'; AW.licensingUI.render($('#lic-host', host)); } }; }
    ['license', 'config', 'mapping', 'conn', 'backups', 'demo'].forEach((evt) => AW.bus.on(evt, () => { if (P.visible && !P.busy && P.panels[P.cat] && !P.panels[P.cat].live) renderMain(); }));
    AW.bus.on('wall', (e) => { if (P.visible && (e.reason === 'applied' || e.reason === 'restored') && (P.cat === 'reload' || P.cat === 'hardware')) renderMain(); });
  };
  P.onSession = function () { if (P.visible) { renderNav(); renderMain(); } };
  P.show = function (v, section) {
    P.visible = v;
    if (!v) { const p = P.panels[P.cat]; if (p && p.hide) p.hide(); return; }
    if (section && P.panels[section]) P.cat = section;
    renderNav(); renderMain();
  };
  P.open = function (cat, field) {
    const prev = P.panels[P.cat]; if (prev && prev.hide && cat !== P.cat) prev.hide();
    P.cat = cat; P.flash = field || '';
    renderNav(); renderMain();
    main.scrollTop = 0;
    if (field) { const r = main.querySelector('[data-row="' + field + '"]'); if (r) { r.scrollIntoView({ block: 'center' }); const c = r.querySelector('input, select, button'); if (c) c.focus({ preventScroll: true }); } setTimeout(() => { P.flash = ''; }, 1500); }
    else main.focus({ preventScroll: true });
  };
  function renderNav() {
    const q = AW.norm(P.query.trim());
    let h = '', group = '';
    const hits = [];
    if (q) for (const id in P.index || {}) for (const f of P.index[id]) if (AW.norm(f.label + ' ' + (f.help || '')).includes(q)) hits.push([id, f]);
    for (const [g, id, label, kw] of CATS) {
      if (q && !AW.norm(label + ' ' + kw + ' ' + g).includes(q) && !hits.some((x) => x[0] === id)) continue;
      if (g !== group) { h += '<h3>' + esc(t(g)) + '</h3>'; group = g; }
      const p = P.panels[id], dirty = p && p.dirty && p.dirty();
      h += '<button type="button" data-cat="' + id + '"' + (id === P.cat ? ' aria-current="page"' : '') + '><span>' + esc(t(label)) + '</span>' + (dirty ? '<span class="unsaved" title="' + esc(t('Unsaved changes')) + '">●<span class="sr">' + esc(t('unsaved changes')) + '</span></span>' : '') + '</button>';
      for (const [cid, f] of hits) if (cid === id) h += '<button type="button" class="set-hit" data-cat="' + id + '" data-field="' + f.key + '">' + esc(t(f.label)) + '</button>';
    }
    nav.innerHTML = h || '<p class="empty">' + esc(t('No setting matches "{q}".', { q: P.query.trim() })) + '</p>';
  }
  function renderMain(focusId) {
    const p = P.panels[P.cat];
    const keep = focusId || (main.contains(document.activeElement) ? document.activeElement.id : null), scroll = main.scrollTop;
    if (!p) { main.innerHTML = '<p class="empty">' + esc(t('This category is not available.')) + '</p>'; return; }
    p.render(main);
    if (P.conflict === P.cat) { main.insertAdjacentHTML('afterbegin', '<div class="callout-box warn" role="alert">' + icon('alert') + '<span>' + esc(t('A newer configuration exists on the controller. Your unsaved values are still in the form; Reload replaces them with the newer ones.')) + '</span> <button class="btn btn-small" type="button" id="set-reload">' + esc(t('Reload newer configuration')) + '</button></div>'); $('#set-reload', main).addEventListener('click', () => { delete P.drafts[P.cat]; P.conflict = ''; P.errors[P.cat] = {}; renderMain(); renderNav(); }); }
    main.scrollTop = scroll;
    if (keep) { let n = document.getElementById(keep); if (n && n.matches('[data-seg]')) n = n.querySelector('input:checked') || n.querySelector('input'); if (n && !n.disabled && n.focus) n.focus({ preventScroll: true }); }
  }
  P.renderMain = renderMain; P.renderNav = renderNav;
  const pick = (obj, keys) => { const o = {}; keys.forEach((k) => { o[k] = obj[k]; }); return o; };
  const D = AW.PREF_DEFAULTS;
  P.index = {};
  const reg = (o) => { P.formPanel(o); P.index[o.id] = o.fields(o.defaults()).map((f) => ({ key: f.key, label: f.label, help: f.help })); };

  // ------------------------------------------------------------------ Appearance
  const APPEAR = ['theme', 'motion', 'monitorIds', 'intro', 'clock', 'snapping'];
  reg({
    id: 'appearance', title: 'Appearance', scope: 'browser', applies: 'Applies immediately on Save', persist: 'Stored in this browser.',
    intro: 'How AegisWall looks and moves on this browser. These are personal preferences; they never change the wall.',
    load: () => pick(AW.prefs, APPEAR), defaults: () => pick(D, APPEAR), save: (d) => AW.savePrefs(d),
    fields: () => [
      { key: 'theme', label: 'Theme', type: 'seg', options: [['system', 'System'], ['dark', 'Dark'], ['light', 'Light']], def: D.theme, help: 'System follows the appearance set on this device.' },
      { key: 'motion', label: 'Motion', type: 'seg', options: [['system', 'System'], ['full', 'Full'], ['reduced', 'Reduced'], ['off', 'Off']], def: D.motion, help: 'Reduced replaces camera and panel movement with immediate updates or short fades. System honours the device\'s reduced-motion setting.' },
      { key: 'monitorIds', label: 'Monitor identifiers', type: 'select', options: [['always', 'Always shown'], ['edit', 'Only in Edit Layout'], ['never', 'Hidden']], def: D.monitorIds, help: 'The small A1, B2… tag in the corner of each monitor.' },
      { key: 'intro', label: 'Opening sequence', type: 'switch', def: D.intro, help: 'Plays the short 3D assembly once when you sign in. It can always be skipped.' },
      { key: 'clock', label: 'Clock format', type: 'seg', options: [['24h', '24-hour'], ['12h', '12-hour']], def: D.clock, help: 'Used for timestamps across the application.' },
      { key: 'snapping', label: 'Snapping in Edit Layout', type: 'switch', def: D.snapping, adv: true, help: 'Content edges snap to monitor, split and other content edges. Alt bypasses it while dragging.' },
    ],
    after: () => '<section class="card"><div class="card-body"><div class="btn-row"><button class="btn" type="button" data-form="replay"' + (AW.stage.kind === '3d' ? '' : ' disabled title="' + esc(t('Unavailable in the 2D fallback')) + '"') + '>' + icon('play') + esc(t('Replay opening sequence')) + '</button></div><p class="note">' + esc(t('Opens the Wall workspace and plays the sequence once.')) + '</p></div></section>',
    action(a) { if (a === 'replay') { AW.app.go('wall'); setTimeout(() => AW.wallUI.playIntro(), 80); } return false; },
  });

  // ------------------------------------------------------------------ Account
  reg({
    id: 'account', title: 'Account', scope: 'browser', applies: 'Applies immediately on Save', persist: 'Stored in this browser.',
    intro: 'Who is signed in, what this profile may do, and when an idle session ends.',
    load: () => pick(AW.prefs, ['sessionTimeout']), defaults: () => pick(D, ['sessionTimeout']), save: (d) => AW.savePrefs(d),
    fields: () => [
      { key: 'user', label: 'User', type: 'readonly', value: AW.session ? AW.session.user + ' — ' + AW.session.name : '', reason: 'Accounts are managed on the controller' },
      { key: 'role', label: 'Permission profile', type: 'readonly', value: AW.session ? t(AW.ROLE_LABEL[AW.session.role]) : '', reason: 'Assigned by an administrator on the controller' },
      { key: 'sessionTimeout', label: 'Sign out when idle', type: 'number', min: 5, max: 240, unit: 'min', def: D.sessionTimeout, help: 'After this long without input you are returned to the entry screen. Your draft is kept.' },
    ],
    after: () => '<section class="card"><div class="card-head"><h2>' + esc(t('What each profile can do')) + '</h2></div><div class="card-body"><div class="table-wrap"><table><thead><tr><th>' + esc(t('Capability')) + '</th><th>' + esc(t('Operator')) + '</th><th>' + esc(t('Technician')) + '</th><th>' + esc(t('Administrator')) + '</th></tr></thead><tbody>' +
      [['Edit and apply wall layouts, manage saved layouts', 1], ['Audio levels, routing and test output', 1], ['Diagnostics, diagnostic report, alert thresholds', 2], ['Hardware mapping, content reload settings, backups', 2], ['Restart service / reboot host, technician console', 2], ['Network listener, database connection, restore', 3], ['Generate and revoke licenses, import configuration, delete stored logs', 3]]
        .map(([cap, min]) => '<tr><td>' + esc(t(cap)) + '</td>' + [1, 2, 3].map((r) => '<td>' + (r >= min ? icon('ok') + '<span class="sr">' + esc(t('Yes')) + '</span>' : '<span class="muted">—</span><span class="sr">' + esc(t('No')) + '</span>') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<p class="note">' + esc(t('Profiles are enforced by the service layer for every request. Hiding or disabling a button is never the only protection.')) + '</p>' +
      '<div class="btn-row"><button class="btn" type="button" data-form="signout">' + icon('power') + esc(t('Sign out')) + '</button></div></div></section>',
    action(a) { if (a === 'signout') AW.app.signOut(); return false; },
  });

  // ------------------------------------------------------------------ Preview & rendering
  const REND = ['quality', 'renderScale', 'shadows', 'reflections', 'previewRes', 'previewMode', 'previewFps', 'thumbInterval', 'liveLimit'];
  const PRESETS = { low: { renderScale: 0.75, shadows: 'off', reflections: false, previewRes: 320 }, balanced: { renderScale: 1, shadows: 'contact', reflections: true, previewRes: 480 }, high: { renderScale: 1.5, shadows: 'soft', reflections: true, previewRes: 640 } };
  reg({
    id: 'rendering', title: 'Preview & rendering', scope: 'browser', applies: 'Applies immediately on Save', persist: 'Stored in this browser.',
    intro: 'Quality of the 3D view and of the content previews drawn on this browser.',
    load: () => pick(AW.prefs, REND), defaults: () => pick(D, REND), save: (d) => AW.savePrefs(d),
    before: () => '<div class="callout-box">' + icon('info') + '<span>' + esc(t('These settings change only what this browser draws. Wall output quality is set by the hardware and is never reduced by a preview setting.')) + '</span></div>',
    onChange(d, key) { if (key === 'quality') { if (PRESETS[d.quality]) Object.assign(d, PRESETS[d.quality]); } else if (PRESETS.low[key] !== undefined) d.quality = 'custom'; },
    fields: (d) => [
      { key: 'quality', label: 'Quality preset', type: 'seg', options: [['low', 'Low'], ['balanced', 'Balanced'], ['high', 'High'], ['custom', 'Custom']], def: D.quality, help: 'Sets render resolution, shadows, reflections and preview resolution together. Changing one of them switches to Custom.' },
      { key: 'previewMode', label: 'Preview mode', type: 'seg', options: [['static', 'Static thumbnails'], ['live', 'Live (moving)']], def: D.previewMode, help: 'Static redraws previews at the thumbnail interval. Live animates them at the preview frame rate. Both are demo pictures.' },
      { key: 'wallOut', label: 'Wall output quality', type: 'readonly', scope: 'host', value: '1920 × 1080 @ 60 Hz ' + t('per output'), reason: 'Reported by the hardware; not affected by preview settings' },
      { key: 'renderScale', label: '3D render resolution', type: 'select', options: [[0.5, '50 %'], [0.75, '75 %'], [1, '100 % (native)'], [1.5, '150 %'], [2, '200 %']], def: D.renderScale, adv: true, help: 'Relative to this screen\'s pixel density. Higher is sharper and heavier.' },
      { key: 'shadows', label: 'Shadows', type: 'seg', options: [['off', 'Off'], ['contact', 'Contact'], ['soft', 'Soft']], def: D.shadows, adv: true, help: 'Contact is a cheap soft shadow under the wall. Soft adds real shadow maps.' },
      { key: 'reflections', label: 'Floor reflections', type: 'switch', def: D.reflections, adv: true, help: 'A restrained mirror image of the wall on the floor. Costs one extra render pass.' },
      { key: 'previewRes', label: 'Preview resolution', type: 'select', options: [[240, '240 px per monitor'], [320, '320 px per monitor'], [480, '480 px per monitor'], [640, '640 px per monitor']], def: D.previewRes, adv: true, help: 'Width of the picture drawn for each monitor. Large grids are reduced automatically to stay within GPU limits.' },
      { key: 'previewFps', label: 'Preview frame rate', type: 'select', options: [[2, '2 fps'], [5, '5 fps'], [10, '10 fps']], def: D.previewFps, adv: true, disabled: d.previewMode !== 'live', help: 'Used in Live mode only.' },
      { key: 'thumbInterval', label: 'Thumbnail refresh interval', type: 'number', min: 5, max: 300, unit: 's', def: D.thumbInterval, adv: true, disabled: d.previewMode !== 'static', help: 'Used in Static mode only.' },
      { key: 'liveLimit', label: 'Simultaneous live previews', type: 'number', min: 1, max: 16, def: D.liveLimit, adv: true, help: 'In Live mode only this many items animate; the rest stay still.' },
      { key: 'bitrate', label: 'Preview bitrate / compression', type: 'readonly', scope: 'host', value: null, adv: true, reason: 'Needs a streaming backend; this prototype draws previews locally' },
    ],
  });

  // ------------------------------------------------------------------ Content reload
  const IV = [[0, 'Disabled'], [30, 'Every 30 s'], [60, 'Every minute'], [300, 'Every 5 minutes'], [900, 'Every 15 minutes'], [3600, 'Every hour']];
  const RELOAD_KEYS = ['defaultInterval', 'timeoutS', 'retries', 'backoffS', 'cache', 'scheduleEnabled', 'scheduleTime'];
  reg({
    id: 'reload', section: 'reload', title: 'Content reload', scope: 'host', role: 'technician', demo: true, applies: 'Applies on Save, without restarting anything', persist: 'Stored on the controller (simulated in this browser).',
    intro: 'When web and YouTube content on the wall is reloaded. This is separate from UI refresh, telemetry polling, preview updates and service restart.',
    load: () => svc.config.section('reload'), defaults: () => clone(svc.config.DEFAULTS.reload),
    save: (d) => svc.config.save('reload', d, P.ver.reload),
    validate: (d) => svc.config.validate('reload', d),
    disruptive: (d, ch) => (ch.some((f) => f.key === 'defaultInterval' || f.key === 'perSource') && (d.defaultInterval > 0 || Object.values(d.perSource).some((v) => v > 0)) ? t('A reload briefly interrupts playback of that content on the wall each time it runs.') : ''),
    fields: () => [
      { key: 'defaultInterval', label: 'Default reload interval', type: 'select', options: IV, def: 0, help: 'Applies to every reloadable source without its own interval. A reload interrupts that content for a moment.' },
      { key: 'scheduleEnabled', label: 'Daily scheduled refresh', type: 'switch', def: false, help: 'Reloads all reloadable content once a day at the time below.' },
      { key: 'scheduleTime', label: 'Scheduled refresh time', type: 'time', def: '06:00', help: 'Controller host local time.' },
      { key: 'timeoutS', label: 'Timeout', type: 'number', min: 1, max: 120, unit: 's', def: 15, adv: true, help: 'How long to wait for the content to answer.' },
      { key: 'retries', label: 'Retry count', type: 'number', min: 0, max: 10, def: 2, adv: true, help: 'Attempts after the first failure. Requests are never queued: a source reloads once at a time.' },
      { key: 'backoffS', label: 'Backoff between retries', type: 'number', min: 0, max: 300, unit: 's', def: 5, adv: true },
      { key: 'cache', label: 'Cache policy', type: 'select', options: [['default', 'Browser default'], ['no-cache', 'Revalidate every time'], ['force-refresh', 'Ignore cache']], def: 'default', adv: true, help: 'Where the content engine supports it.' },
    ],
    after(d) {
      const srcs = svc.reload.sources(), ro = !AW.can('technician');
      const opt = (v) => '<option value="-1"' + (v == null ? ' selected' : '') + '>' + esc(t('Use default')) + '</option>' + IV.map(([n, l]) => '<option value="' + n + '"' + (v === n ? ' selected' : '') + '>' + esc(t(l)) + '</option>').join('');
      return '<section class="card"><div class="card-head"><h2>' + esc(t('Per-source reload')) + '</h2><span class="muted">' + esc(t('Reloadable content on the confirmed wall')) + '</span></div><div class="card-body">' +
        (srcs.length ? '<div class="table-wrap"><table><thead><tr><th>' + esc(t('Source')) + '</th><th>' + esc(t('Interval')) + '</th><th>' + esc(t('Effective')) + '</th><th>' + esc(t('Last reload')) + '</th><th></th></tr></thead><tbody>' + srcs.map((s) => {
          const st = svc.reload.state(s.id), eff = d.perSource[s.id] == null ? d.defaultInterval : d.perSource[s.id];
          return '<tr><td><b>' + esc(s.name) + '</b><br><small class="muted">' + esc(t(s.type === 'web' ? 'Web page' : 'YouTube')) + '</small></td><td><select data-src-iv="' + s.id + '" id="set-reload-src-' + s.id + '" aria-label="' + esc(t('Reload interval for {n}', { n: s.name })) + '"' + (ro ? ' disabled' : '') + '>' + opt(d.perSource[s.id]) + '</select></td><td>' + esc(t((IV.find((x) => x[0] === eff) || [0, eff + ' s'])[1])) + '</td>' +
            '<td>' + (st.busy ? '<span class="spinner"></span> ' + esc(t('Reloading…')) : st.lastAt ? esc(AW.fmtTime(st.lastAt)) + ' ' + AW.ui.badge(st.status === 'ok' ? 'ok' : 'bad', st.status === 'ok' ? 'OK' : 'Failed') + (st.message ? '<br><small class="st-bad">' + esc(st.message) + '</small>' : '') : '<span class="muted">' + esc(t('Not yet in this session')) + '</span>') + '</td>' +
            '<td><button class="btn btn-small" type="button" data-reload-now="' + s.id + '"' + (st.busy || svc.conn.state !== 'online' ? ' disabled' : '') + ' title="' + esc(t('Interrupts this content on the wall for a moment')) + '">' + icon('refresh') + esc(t('Reload Now')) + '</button></td></tr>';
        }).join('') + '</tbody></table></div>' : '<p class="empty">' + esc(t('No web or YouTube content is on the confirmed wall. Apply a composition that contains some to configure per-source reload.')) + '</p>') + '</div></section>';
    },
    bind(host, d) {
      host.querySelectorAll('[data-src-iv]').forEach((sel) => sel.addEventListener('change', (e) => { e.stopPropagation(); const v = +sel.value; if (v < 0) delete d.perSource[sel.dataset.srcIv]; else d.perSource[sel.dataset.srcIv] = v; renderMain(sel.id); renderNav(); }));
      host.querySelectorAll('[data-reload-now]').forEach((b) => b.addEventListener('click', () => { svc.reload.now(b.dataset.reloadNow, 'manual').then(() => AW.toast('ok', t('Content reloaded.') + ' ' + t('(Demo)')), (e) => AW.toast('error', e.message)); renderMain(); }));
    },
  });
  AW.bus.on('reload', () => { if (P.visible && P.cat === 'reload') renderMain(); });
  // ------------------------------------------------------------------ Hardware mapping (custom panel)
  P.panels.hardware = {
    dirty: () => !!P.drafts.hardware && JSON.stringify(P.drafts.hardware) !== JSON.stringify({ wallName: svc.outputs.wallName(), mapping: svc.outputs.mapping() }),
    render(host) {
      const can = AW.can('technician'), online = svc.conn.state === 'online';
      const d = (P.drafts.hardware = P.drafts.hardware || { wallName: svc.outputs.wallName(), mapping: clone(svc.outputs.mapping()) });
      const comp = AW.wall.S.draft, outs = svc.outputs.list(), saved = svc.outputs.mapping(), L = svc.limits;
      const problems = svc.outputs.validate(d.mapping), dirty = this.dirty();
      const STL = { planned: ['warn', 'Planned'], detected: ['info', 'Detected output'], confirmed: ['ok', 'Confirmed mapping'], missing: ['bad', 'Output missing'] };
      let rows = '';
      for (let r = 0; r < comp.rows; r++) for (let k = 0; k < comp.cols; k++) {
        const key = r + ',' + k, cur = d.mapping[key] ? d.mapping[key].output : '', st = svc.outputs.tileState(key), changed = (saved[key] ? saved[key].output : '') !== cur;
        rows += '<tr><td class="mono"><b>' + AW.wall.tileName(r, k) + '</b></td><td>' + (changed ? AW.ui.badge('info', 'Unsaved change') : AW.ui.badge(STL[st.state][0], STL[st.state][1])) + '</td>' +
          '<td><select data-map="' + key + '" id="set-hw-' + r + '-' + k + '" aria-label="' + esc(t('Output for tile {id}', { id: AW.wall.tileName(r, k) })) + '"' + (can ? '' : ' disabled') + '><option value="">' + esc(t('— none (planned tile) —')) + '</option>' + outs.map((o) => '<option value="' + o.id + '"' + (o.id === cur ? ' selected' : '') + '>' + o.id + (o.connected ? '' : ' — ' + esc(t('no signal'))) + '</option>').join('') + '</select></td>' +
          '<td>' + (cur ? (outs.find((o) => o.id === cur) || {}).width + ' × ' + (outs.find((o) => o.id === cur) || {}).height + ' @ ' + (outs.find((o) => o.id === cur) || {}).hz + ' Hz' : AW.ui.unavailable(t('No physical output'))) + '</td></tr>';
      }
      const unconfirmed = Object.keys(saved).filter((k) => svc.outputs.tileState(k).state === 'detected').length;
      host.innerHTML = '<header class="set-head"><h2>' + esc(t('Hardware mapping')) + '</h2>' + AW.ui.demo() + '<p>' + esc(t('Which physical output drives each tile of the layout. A planned tile is only a drawing until an output is assigned and the mapping is confirmed on the hardware.')) + '</p></header>' +
        (can ? '' : '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Read-only: changing the mapping requires the Technician profile.')) + '</span></div>') +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Wall')) + '</h2></div><div class="card-body set-form">' +
        '<div class="set-row" data-row="wallName"><div class="set-label"><label for="set-hw-name">' + esc(t('Wall name')) + '</label><p class="note">' + esc(t('Shown in the header.')) + '</p><p class="set-meta">' + esc(t('Scope') + ': ' + t(SCOPE.wall) + ' · ' + t('Applies on Save')) + '</p></div><div class="set-control"><input type="text" id="set-hw-name" maxlength="40" value="' + esc(d.wallName) + '"' + (can ? '' : ' disabled') + '></div></div>' +
        '<div class="set-row"><div class="set-label"><label>' + esc(t('Grid limit')) + '</label><p class="set-meta">' + esc(t('Scope') + ': ' + t(SCOPE.host)) + '</p></div><div class="set-control"><div class="set-ro"><b>' + L.maxCols + ' × ' + L.maxRows + '</b><small class="muted">' + esc(t('Read-only — set by the integration')) + '</small></div></div></div>' +
        '<div class="set-row"><div class="set-label"><label>' + esc(t('Monitor resolution')) + '</label></div><div class="set-control"><div class="set-ro"><b>' + L.monitor.w + ' × ' + L.monitor.h + '</b><small class="muted">' + esc(t('Read-only — a property of the displays')) + '</small></div></div></div></div></section>' +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Tiles and outputs')) + '</h2><span class="muted">' + comp.cols + ' × ' + comp.rows + ' · ' + esc(t('{n} outputs detected', { n: outs.filter((o) => o.connected).length })) + '</span><span class="grow"></span>' +
        '<button class="btn btn-small" type="button" data-form="detect"' + (online && !P.busy ? '' : ' disabled') + '>' + (P.busy === 'detect' ? '<span class="spinner"></span>' : icon('refresh')) + esc(t('Detect outputs')) + '</button></div><div class="card-body">' +
        '<div class="table-wrap"><table><thead><tr><th>' + esc(t('Tile')) + '</th><th>' + esc(t('State')) + '</th><th>' + esc(t('Physical output')) + '</th><th>' + esc(t('Signal format')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (problems.length ? '<div class="callout-box bad" role="alert">' + icon('alert') + '<span>' + problems.map(esc).join(' ') + '</span></div>' : '') +
        '<p class="note">' + esc(t('The table follows the grid of the current draft. Changing an assignment marks it unconfirmed until the hardware confirms it.')) + '</p></div></section>' +
        '<div class="set-actions"><button class="btn btn-primary" type="button" data-form="save"' + (can && dirty && !problems.length && !P.busy ? '' : ' disabled') + '>' + esc(t('Save mapping')) + '</button><button class="btn" type="button" data-form="cancel"' + (dirty ? '' : ' disabled') + '>' + esc(t('Cancel')) + '</button>' +
        '<button class="btn" type="button" data-form="defaults"' + (can ? '' : ' disabled') + ' title="' + esc(t('Row by row, in output order')) + '">' + esc(t('Restore Defaults')) + '</button>' +
        '<button class="btn" type="button" data-form="confirm"' + (can && !dirty && unconfirmed && online && !P.busy ? '' : ' disabled') + ' title="' + esc(dirty ? t('Save the mapping first') : !unconfirmed ? t('Nothing to confirm') : '') + '">' + (P.busy === 'confirm' ? '<span class="spinner"></span>' : '') + esc(t('Confirm mapping on hardware')) + (unconfirmed ? ' (' + unconfirmed + ')' : '') + '</button></div>';
      $('#set-hw-name', host).addEventListener('change', (e) => { e.stopPropagation(); d.wallName = e.target.value.trim() || svc.outputs.wallName(); renderMain('set-hw-name'); renderNav(); });
      host.querySelectorAll('[data-map]').forEach((sel) => sel.addEventListener('change', (e) => { e.stopPropagation(); if (sel.value) d.mapping[sel.dataset.map] = { output: sel.value, confirmed: false }; else delete d.mapping[sel.dataset.map]; renderMain(sel.id); renderNav(); }));
    },
    async action(a) {
      const d = P.drafts.hardware;
      try {
        if (a === 'cancel') delete P.drafts.hardware;
        else if (a === 'defaults') { d.mapping = {}; svc.outputs.list().forEach((o, i) => { d.mapping[Math.floor(i / 4) + ',' + (i % 4)] = { output: o.id, confirmed: false }; }); }
        else if (a === 'detect') { P.busy = 'detect'; renderMain(); const list = await svc.outputs.detect(); AW.toast('info', t('{n} of {m} outputs report a signal.', { n: list.filter((o) => o.connected).length, m: list.length }) + ' ' + t('(Demo)')); }
        else if (a === 'save') { P.busy = 'save'; renderMain(); await svc.outputs.saveMapping(d.mapping, d.wallName); delete P.drafts.hardware; AW.toast('ok', t('Hardware mapping saved. Changed assignments are unconfirmed until you confirm them on the hardware.')); }
        else if (a === 'confirm') { P.busy = 'confirm'; renderMain(); const r = await svc.outputs.confirmMapping(); AW.toast('ok', t('{n} mapping(s) confirmed.', { n: r.confirmed }) + ' ' + t('(Demo acknowledgement)')); }
      } catch (e) { AW.toast('error', e.message); }
      P.busy = '';
      return true;
    },
  };
  P.index.hardware = [{ key: 'wallName', label: 'Wall name' }];

  // ------------------------------------------------------------------ Configuration lifecycle
  P.panels.config = {
    render(host) {
      const c = svc.config.get(), licensed = svc.license.has('config.transfer'), tech = AW.can('technician'), admin = AW.can('administrator');
      host.innerHTML = '<header class="set-head"><h2>' + esc(t('Configuration')) + '</h2>' + AW.ui.demo() + '<p>' + esc(t('Where settings live, how to move them between installations, and how to get back to the previous configuration.')) + '</p></header>' +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Persistence')) + '</h2></div><div class="card-body"><dl class="kv">' +
        [['Controller configuration version', String(c.version)], ['Last changed', esc(AW.fmtDateTime(c.updatedAt)) + ' ' + esc(t('by')) + ' ' + esc(c.updatedBy)], ['Controller settings', esc(t('Network, database, backup, content reload, alert thresholds'))], ['User preferences', esc(t('Appearance, preview & rendering, idle sign-out — this browser only'))], ['Browser storage', AW.store.persistent ? AW.ui.badge('ok', 'Available') : AW.ui.badge('warn', 'Unavailable — settings last until this tab closes')]].map(([k, v]) => '<div><dt>' + esc(t(k)) + '</dt><dd>' + v + '</dd></div>').join('') + '</dl>' +
        '<p class="note">' + esc(t('In this prototype the "controller" store is simulated in this browser\'s storage. On a real installation controller settings live on the host and survive a browser change.')) + '</p>' +
        '<div class="btn-row"><button class="btn" type="button" data-form="verify">' + icon('ok') + esc(t('Verify persisted settings')) + '</button></div>' + (P.verify ? '<div class="callout-box ' + (P.verify.ok ? 'ok' : 'warn') + '" role="status">' + icon(P.verify.ok ? 'ok' : 'alert') + '<span>' + esc(P.verify.text) + '</span></div>' : '') + '</div></section>' +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Export and import')) + '</h2></div><div class="card-body">' +
        (licensed ? '' : '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Configuration export and import is a licensed feature and is locked on this installation.')) + ' <button class="btn btn-small" type="button" data-form="licensing">' + esc(t('Open Licensing')) + '</button></span></div>') +
        '<div class="btn-row"><button class="btn" type="button" data-form="export"' + (licensed && tech ? '' : ' disabled title="' + esc(!licensed ? t('Requires the license feature') : t('Requires the Technician profile')) + '"') + '>' + icon('download') + esc(t('Export configuration')) + '</button>' +
        '<button class="btn" type="button" data-form="import"' + (licensed && admin ? '' : ' disabled title="' + esc(!licensed ? t('Requires the license feature') : t('Requires the Administrator profile')) + '"') + '>' + icon('upload') + esc(t('Import configuration…')) + '</button>' +
        '<button class="btn" type="button" data-form="previous"' + (admin && svc.config.hasPrevious() ? '' : ' disabled title="' + esc(!admin ? t('Requires the Administrator profile') : t('No previous configuration is stored yet')) + '"') + '>' + icon('undo') + esc(t('Restore previous configuration')) + '</button></div>' +
        '<p class="note">' + esc(t('Exports are versioned (aegiswall-config/1) and never contain secrets. An import is validated and previewed before anything changes, and the configuration it replaces is kept for recovery.')) + '</p></div></section>';
    },
    async action(a) {
      try {
        if (a === 'licensing') { P.open('licensing'); return false; }
        if (a === 'verify') {
          const raw = AW.store.get('prefs', {}), mismatched = Object.keys(raw).filter((k) => JSON.stringify(raw[k]) !== JSON.stringify(AW.prefs[k]));
          const c = svc.config.get(), reread = AW.store.get('ctl.config', null);
          const ok = AW.store.persistent && !mismatched.length && (!reread || reread.version === c.version);
          P.verify = { ok, text: ok ? t('Re-read from storage at {time}: {n} user preferences and controller configuration version {v} match what is in use.', { time: AW.fmtTime(), n: Object.keys(raw).length, v: c.version }) : !AW.store.persistent ? t('Browser storage is not available, so settings cannot persist beyond this tab.') : t('Mismatch found in: {k}', { k: mismatched.join(', ') || 'controller version' }) };
        } else if (a === 'export') { const obj = svc.config.export(); const r = await AW.saveFile('aegiswall-config-v' + obj.sourceVersion + '.json', JSON.stringify(obj, null, 2)); if (r.ok) AW.toast('ok', t('Configuration exported without secrets.')); }
        else if (a === 'import') {
          const f = await AW.pickFile('.json,application/json'); if (!f) return false;
          const pv = svc.config.previewImport(f.text);
          const fmt = (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v));
          const ok = await AW.confirm({ title: t('Import configuration?'), confirmLabel: t('Import {n} change(s)', { n: pv.changes.length }), html: '<p>' + esc(t('File "{f}" exported from {h} on {d}.', { f: f.name, h: pv.sourceHost || '?', d: pv.exportedAt ? AW.fmtDateTime(pv.exportedAt) : '?' })) + '</p>' +
            (pv.problems.length ? '<div class="callout-box bad">' + icon('alert') + '<span>' + esc(t('Invalid values — this file cannot be imported:')) + ' ' + pv.problems.map(esc).join('; ') + '</span></div>' : pv.changes.length ? '<div class="table-wrap"><table><thead><tr><th>' + esc(t('Setting')) + '</th><th>' + esc(t('Current')) + '</th><th>' + esc(t('After import')) + '</th></tr></thead><tbody>' + pv.changes.map((c) => '<tr><td class="mono">' + esc(c.section + '.' + c.key) + '</td><td>' + esc(fmt(c.from)) + '</td><td><b>' + esc(fmt(c.to)) + '</b></td></tr>').join('') + '</tbody></table></div>' : '<p>' + esc(t('The file matches the current configuration. Nothing would change.')) + '</p>') +
            '<p class="note">' + esc(t('The current configuration is kept and can be restored afterwards. Secrets are not part of the file and stay as they are.')) + '</p>' });
          if (ok && !pv.problems.length && pv.changes.length) { await svc.config.applyImport(pv); P.drafts = {}; AW.toast('ok', t('Configuration imported. The previous one is available under "Restore previous configuration".')); }
        } else if (a === 'previous') { if (await AW.confirm({ title: t('Restore previous configuration?'), message: t('Controller settings return to how they were before the last save or import. The current ones become the "previous" configuration.'), confirmLabel: t('Restore') })) { await svc.config.restorePrevious(); P.drafts = {}; AW.toast('ok', t('Previous configuration restored.')); } }
      } catch (e) { AW.toast('error', e.message); }
      return true;
    },
  };

  // ------------------------------------------------------------------ Demo tools
  const FLAGS = [
    ['failNextApply', 'Fail the next Apply', 'The controller rejects the next composition once. Your draft must survive and Retry must work.'],
    ['controllerOffline', 'Disconnect the controller', 'Behaves like a lost connection: Apply, audio and telemetry become unavailable until you switch it off.'],
    ['unplugOutput', 'Unplug graphics output GPU2-DP4', 'Tile C4 loses its signal: the tile is marked, System Information raises an alert, Apply warns.'],
    ['unplugUsbAudio', 'Unplug the USB audio device', 'Sources routed to it go silent and keep their mapping. Nothing is rerouted.'],
    ['licenseOffline', 'License service offline', 'Generate, validate and activate report "service unavailable" and change nothing.'],
    ['endpointUnreachable', 'New network endpoint unreachable', 'After a listener change the new address never answers, so the previous configuration is restored.'],
    ['maintNoAck', 'Maintenance: no acknowledgement', 'Restart and reboot requests are never acknowledged; nothing is executed.'],
    ['maintNoReturn', 'Maintenance: host does not come back', 'After a restart or reboot the controller never answers the health probe.'],
  ];
  P.panels.demo = {
    render(host) {
      host.innerHTML = '<header class="set-head"><h2>' + esc(t('Demo tools')) + '</h2>' + AW.ui.demo() + '<p>' + esc(t('Switches that make the simulated services misbehave on purpose, so failure handling can be tested. They exist only in the demo adapter and reset when the page reloads.')) + '</p></header>' +
        '<section class="card"><div class="card-body set-form">' + FLAGS.map(([k, label, help]) => '<div class="set-row"><div class="set-label"><label for="demo-' + k + '">' + esc(t(label)) + '</label><p class="note">' + esc(t(help)) + '</p></div><div class="set-control"><input class="switch" type="checkbox" id="demo-' + k + '" data-demo="' + k + '"' + (AW.demo[k] ? ' checked' : '') + '></div></div>').join('') +
        '<div class="set-row"><div class="set-label"><label for="demo-noWebGL">' + esc(t('Force the 2D fallback')) + '</label><p class="note">' + esc(t('Pretends WebGL cannot start. Takes effect after reloading the page; everything except 3D must keep working.')) + '</p></div><div class="set-control"><input class="switch" type="checkbox" id="demo-noWebGL" data-demo-store="noWebGL"' + (AW.store.get('demo.noWebGL', false) ? ' checked' : '') + '><button class="btn btn-small" type="button" data-form="reload-page">' + esc(t('Reload page now')) + '</button></div></div></div></section>' +
        '<section class="card"><div class="card-body"><div class="btn-row"><button class="btn" type="button" data-form="concurrent">' + esc(t('Simulate a concurrent settings edit')) + '</button><button class="btn btn-danger-quiet" type="button" data-form="wipe">' + esc(t('Reset all demo data…')) + '</button></div>' +
        '<p class="note">' + esc(t('"Concurrent edit" saves controller settings as another session, so a form you already opened becomes stale and its Save is refused.')) + '</p></div></section>';
      host.querySelectorAll('[data-demo]').forEach((n) => n.addEventListener('change', (e) => { e.stopPropagation(); AW.demo[n.dataset.demo] = n.checked; AW.log('warn', 'demo', 'Demo switch ' + n.dataset.demo + ' = ' + n.checked, {}); AW.bus.emit('demo', AW.demo); }));
      host.querySelector('[data-demo-store]').addEventListener('change', (e) => { e.stopPropagation(); AW.store.set('demo.noWebGL', e.target.checked); AW.toast('info', t('Reload the page to apply.')); });
    },
    async action(a) {
      if (a === 'reload-page') location.reload();
      else if (a === 'concurrent') { const v = svc.config.simulateConcurrentEdit(); AW.toast('info', t('Another session saved controller settings (now version {v}).', { v })); }
      else if (a === 'wipe') { if (await AW.confirm({ title: t('Reset all demo data?'), message: t('Erases everything this prototype stored in this browser: layouts, draft, licenses, settings, logs and presets. The page then reloads.'), confirmLabel: t('Reset everything'), danger: true, type: 'RESET' })) { AW.store.keys().forEach((k) => AW.store.remove(k)); location.reload(); } }
      return false;
    },
  };
})();
