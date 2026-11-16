/* AegisWall — Settings workspace, part 2: network listener (HTTP/HTTPS), database and backups,
 * logs with the separate audit trail, and the technician console. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$, svc = AW.svc, clone = AW.clone;
  const P = AW.settingsUI;
  const rerender = () => { P.renderMain(); P.renderNav(); };
  const meta = (scope, applies) => '<p class="set-meta">' + esc(t('Scope') + ': ' + t(scope) + ' · ' + t(applies)) + '</p>';
  const rowHtml = (key, label, help, metaTxt, ctl, err) => '<div class="set-row" data-row="' + key + '"><div class="set-label"><label for="' + ctl.id + '">' + esc(t(label)) + '</label>' + (help ? '<p class="note">' + esc(t(help)) + '</p>' : '') + (metaTxt || '') + '</div><div class="set-control">' + ctl.html + (err ? '<p class="field-error" role="alert">' + esc(err) + '</p>' : '') + '</div></div>';
  const numCtl = (id, v, min, max, dis, unit) => ({ id, html: '<div class="with-unit"><input type="number" id="' + id + '" min="' + min + '" max="' + max + '" step="1" value="' + esc(v) + '"' + (dis ? ' disabled' : '') + '>' + (unit ? '<span>' + esc(unit) + '</span>' : '') + '</div>' });
  const txtCtl = (id, v, dis, extra) => ({ id, html: '<input type="text" id="' + id + '" value="' + esc(v == null ? '' : v) + '" spellcheck="false" autocomplete="off"' + (dis ? ' disabled' : '') + (extra || '') + '>' });
  const selCtl = (id, v, options, dis) => ({ id, html: '<select id="' + id + '"' + (dis ? ' disabled' : '') + '>' + options.map(([val, label, off]) => '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + (off ? ' disabled' : '') + '>' + esc(label) + '</option>').join('') + '</select>' });
  const HOSTM = 'Controller host';

  // =====================================================================================
  // Network access
  // =====================================================================================
  const N = { test: null, testing: false };
  P.panels.network = {
    dirty: () => !!P.drafts.network && JSON.stringify(P.drafts.network) !== JSON.stringify(svc.config.section('network')),
    render(host) {
      const admin = AW.can('administrator'), online = svc.conn.state === 'online', cur = svc.config.section('network');
      if (!P.drafts.network) { P.drafts.network = clone(cur); P.ver.network = svc.config.sectionVersion('network'); N.test = null; }
      const d = P.drafts.network, dis = !admin || !!P.busy, https = d.mode !== 'http', http = d.mode !== 'https', dirty = this.dirty();
      const certs = svc.net.certs(), cert = certs.find((c) => c.id === d.certId);
      const APPLIES = 'Applies after a listener restart';
      host.innerHTML = '<header class="set-head"><h2>' + esc(t('Network access')) + '</h2>' + AW.ui.demo() + '<p>' + esc(t('How browsers reach AegisWall on the controller host. Changes restart the listener; if the new address cannot be reached the previous configuration is restored automatically.')) + '</p></header>' +
        (admin ? '' : '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Read-only: changing the listener requires the Administrator profile.')) + '</span></div>') +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Access addresses')) + '</h2></div><div class="card-body"><dl class="kv"><div><dt>' + esc(t('Current')) + '</dt><dd>' + svc.net.urls(cur).map((u) => '<span class="mono">' + esc(u) + '</span>').join('<br>') + '</dd></div>' +
        '<div><dt>' + esc(t('Proposed')) + '</dt><dd>' + (dirty ? svc.net.urls(d).map((u) => '<span class="mono">' + esc(u) + '</span>').join('<br>') : '<span class="muted">' + esc(t('Same as current')) + '</span>') + '</dd></div></dl></div></section>' +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Basic')) + '</h2></div><div class="card-body set-form">' +
        rowHtml('mode', 'Protocol', 'HTTPS needs a certificate that the controller already holds. A switch here cannot create one.', meta(HOSTM, APPLIES), { id: 'net-mode', html: '<div id="net-mode">' + AW.ui.segmented('net-mode-r', [['http', 'HTTP only'], ['https', 'HTTPS only'], ['https+redirect', 'HTTPS, redirect HTTP']], d.mode, dis) + '</div>' }) +
        rowHtml('httpsPort', 'HTTPS port', '', meta(HOSTM, t('Range') + ': 1–65535 · ' + t('Default') + ': 8443'), numCtl('net-httpsPort', d.httpsPort, 1, 65535, dis || !https)) +
        rowHtml('httpPort', https ? 'HTTP port (redirect)' : 'HTTP port', '', meta(HOSTM, t('Range') + ': 1–65535 · ' + t('Default') + ': 8765'), numCtl('net-httpPort', d.httpPort, 1, 65535, dis || !http)) +
        rowHtml('hostname', 'Public hostname', 'The name people type. With HTTPS it must be covered by the certificate.', meta(HOSTM, APPLIES), txtCtl('net-hostname', d.hostname, dis)) +
        rowHtml('certId', 'Certificate', 'Chosen from the controller\'s certificate store. Private keys stay on the host and are never sent to a browser or written to logs.', meta(HOSTM, APPLIES),
          selCtl('net-certId', d.certId, [['', t('— none —')]].concat(certs.map((c) => [c.id, c.subject + ' · ' + (c.notAfter > Date.now() ? t('valid until {d}', { d: AW.fmtDate(c.notAfter) }) : t('expired {d}', { d: AW.fmtDate(c.notAfter) })) + ' (' + c.id + ')'])), dis || !https)) +
        (cert && https ? '<div class="set-row"><div class="set-label"><label>' + esc(t('Certificate details')) + '</label></div><div class="set-control"><div class="set-ro"><b>' + esc(cert.subject) + '</b><small class="muted">' + esc(t('Names')) + ': ' + esc(cert.san.join(', ')) + ' · ' + esc(t('Issuer')) + ': ' + esc(cert.issuer) + ' · ' + esc(t('Not after')) + ': ' + esc(AW.fmtDate(cert.notAfter)) + '</small></div></div></div>' : '') +
        '</div></section>' +
        '<section class="card"><details' + (P['adv-network'] ? ' open' : '') + ' data-adv><summary class="card-head"><h2>' + esc(t('Advanced')) + '</h2></summary><div class="card-body set-form">' +
        rowHtml('bind', 'Bind address', 'Which network interface accepts connections. 0.0.0.0 means all of them.', meta(HOSTM, t('Default') + ': 0.0.0.0'), selCtl('net-bind', d.bind, svc.net.bindAddresses().map((a) => [a, a]).concat(BIND_EXTRA(d.bind)), dis)) + '</div></details></section>' +
        (N.test ? '<section class="card"><div class="card-head"><h2>' + esc(t('Validation result')) + '</h2>' + AW.ui.badge(N.test.ok ? 'ok' : 'bad', N.test.ok ? 'Passed' : 'Failed') + '</div><div class="card-body"><ul class="checks-list">' + N.test.checks.map((c) => '<li class="' + (c.ok ? 'ok' : 'bad') + '">' + icon(c.ok ? 'ok' : 'alert') + '<span><b>' + esc(c.label) + '</b> — ' + esc(c.detail) + '</span></li>').join('') + '</ul>' +
          (N.test.ok ? '' : '<p class="note">' + esc(t('Fix the failed checks. Certificate validation is never switched off as a workaround.')) + '</p>') + '</div></section>' : '') +
        '<div class="set-actions"><button class="btn" type="button" data-form="test"' + (admin && online && !P.busy ? '' : ' disabled') + '>' + (N.testing ? '<span class="spinner"></span>' : '') + esc(t('Test configuration')) + '</button>' +
        '<button class="btn btn-primary" type="button" data-form="apply"' + (admin && dirty && online && !P.busy ? '' : ' disabled') + ' title="' + esc(!dirty ? t('Nothing to apply') : '') + '">' + esc(t('Apply…')) + '</button>' +
        '<button class="btn" type="button" data-form="cancel"' + (dirty ? '' : ' disabled') + '>' + esc(t('Cancel')) + '</button><button class="btn" type="button" data-form="defaults"' + (admin ? '' : ' disabled') + '>' + esc(t('Restore Defaults')) + '</button></div>';
      const det = host.querySelector('[data-adv]'); det.addEventListener('toggle', () => { P['adv-network'] = det.open; });
      const set = (key, v) => { d[key] = v; N.test = null; P.renderMain('net-' + key); P.renderNav(); };
      host.querySelectorAll('input[name="net-mode-r"]').forEach((r) => r.addEventListener('change', (e) => { e.stopPropagation(); d.mode = r.value; N.test = null; P.renderMain('net-mode'); P.renderNav(); }));
      for (const k of ['httpsPort', 'httpPort']) $('#net-' + k, host).addEventListener('change', (e) => { e.stopPropagation(); set(k, e.target.value.trim() === '' ? NaN : Number(e.target.value)); });
      for (const k of ['hostname', 'certId', 'bind']) $('#net-' + k, host).addEventListener('change', (e) => { e.stopPropagation(); set(k, e.target.value.trim()); });
    },
    async action(a) {
      const d = P.drafts.network;
      try {
        if (a === 'cancel') { delete P.drafts.network; N.test = null; }
        else if (a === 'defaults') { Object.assign(d, clone(svc.config.DEFAULTS.network)); N.test = null; }
        else if (a === 'test') { N.testing = true; P.busy = 'network'; P.renderMain(); try { N.test = await svc.net.test(d); } finally { N.testing = false; P.busy = ''; } }
        else if (a === 'apply') {
          const cur = svc.config.section('network');
          const ok = await AW.confirm({ title: t('Apply listener changes?'), confirmLabel: t('Validate, apply and restart listener'), html: '<p>' + esc(t('The listener on {h} restarts. Every connected browser is disconnected for a moment and must reconnect on the new address.', { h: svc.host.name })) + ' ' + AW.ui.demo() + '</p>' +
            '<ul><li><b>' + esc(t('Current')) + ':</b> <span class="mono">' + esc(svc.net.urls(cur).join(' , ')) + '</span></li><li><b>' + esc(t('New')) + ':</b> <span class="mono">' + esc(svc.net.urls(d).join(' , ')) + '</span></li></ul>' +
            '<p class="note">' + esc(t('The configuration is validated first. If the new address does not answer after three attempts, the previous listener is restored and you stay connected.')) + '</p>' });
          if (!ok) return false;
          await applyNetwork(d);
        }
      } catch (e) { AW.toast('error', e.message); if (e.checks) N.test = { ok: false, checks: e.checks }; }
      return true;
    },
  };
  const BIND_EXTRA = (v) => (svc.net.bindAddresses().indexOf(v) < 0 && v ? [[v, v]] : []);
  async function applyNetwork(d) {
    const body = AW.el('<div class="progress-steps"></div>');
    const lines = []; let done = false, failed = '', api;
    const LABEL = { saving: 'Saving the validated configuration', restarting: 'Restarting the listener', probing: 'Probing the new address', connected: 'Connected on the new address', rollback: 'Rolling back', recovered: 'Reconnected on the previous address' };
    const draw = () => {
      body.innerHTML = '<ol>' + lines.map((l, i) => '<li class="' + (i < lines.length - 1 || done || failed ? (l.bad ? 'fail' : 'done') : 'now') + '">' + (i < lines.length - 1 || done || failed ? icon(l.bad ? 'alert' : 'ok') : '<span class="spinner"></span>') + '<span>' + esc(t(LABEL[l.phase] || l.phase)) + (l.detail ? ' — ' + esc(l.detail) : '') + '</span></li>').join('') + '</ol>' +
        (failed ? '<div class="callout-box warn" role="alert">' + icon('alert') + '<span>' + esc(failed) + '</span></div>' : done ? '<div class="callout-box ok">' + icon('ok') + '<span>' + esc(t('The new address answered. Share it with the other operators.')) + '</span></div>' : '');
      if (api) api.setActions(done || failed ? [{ label: t('Close'), kind: 'primary', value: null }] : []);
    };
    AW.dialog({ title: t('Applying listener configuration'), body, dismissible: false, actions: [], onMount(a) { api = a; draw(); } });
    P.busy = 'network';
    try { await svc.net.apply(d, P.ver.network, (phase, detail) => { lines.push({ phase, detail, bad: phase === 'rollback' }); draw(); }); done = true; delete P.drafts.network; N.test = null; AW.toast('ok', t('Listener configuration applied.') + ' ' + t('(Demo)')); }
    catch (e) { failed = e.message; if (e.checks) N.test = { ok: false, checks: e.checks }; if (e.code === 'conflict') P.conflict = 'network'; if (e.code === 'rolled_back') P.ver.network = svc.config.sectionVersion('network'); }
    finally { P.busy = ''; draw(); rerender(); }
  }
  P.index.network = [{ key: 'mode', label: 'Protocol' }, { key: 'httpsPort', label: 'HTTPS port' }, { key: 'httpPort', label: 'HTTP port' }, { key: 'hostname', label: 'Public hostname' }, { key: 'certId', label: 'Certificate' }, { key: 'bind', label: 'Bind address' }];

  // =====================================================================================
  // Database and backups
  // =====================================================================================
  const DBS = { test: null, testing: false, password: '', bkErr: {} };
  P.panels.database = {
    dirty: () => (!!P.drafts.database && JSON.stringify(P.drafts.database) !== JSON.stringify(svc.config.section('db'))) || (!!P.drafts.backup && JSON.stringify(P.drafts.backup) !== JSON.stringify(svc.config.section('backup'))) || !!DBS.password,
    render(host) {
      const admin = AW.can('administrator'), tech = AW.can('technician'), online = svc.conn.state === 'online', cur = svc.config.section('db'), st = svc.db.status();
      if (!P.drafts.database) { P.drafts.database = clone(cur); P.ver.database = svc.config.sectionVersion('db'); DBS.test = null; }
      if (!P.drafts.backup) { P.drafts.backup = svc.config.section('backup'); P.ver.backup = svc.config.sectionVersion('backup'); }
      const d = P.drafts.database, b = P.drafts.backup, dis = !admin || !!P.busy, pg = d.engine === 'postgresql';
      const connChanged = svc.db.signature(cur) !== svc.db.signature(d), dbDirty = JSON.stringify(d) !== JSON.stringify(cur) || !!DBS.password, tested = svc.db.tested(d);
      const bkDirty = JSON.stringify(b) !== JSON.stringify(svc.config.section('backup')), errs = P.errors.database || {}, list = svc.db.backups().slice().reverse();
      const M = (extra) => meta(HOSTM, extra || 'Applies on Save');
      host.innerHTML = '<header class="set-head"><h2>' + esc(t('Database')) + '</h2>' + AW.ui.demo() + '<p>' + esc(t('Where AegisWall keeps layouts, presets and configuration, and how it is backed up. The last working connection stays active until a proposed one has passed its test.')) + '</p></header>' +
        (admin ? '' : '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Read-only: database settings and restore require the Administrator profile. Technicians can create backups.')) + '</span></div>') +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Status')) + '</h2></div><div class="card-body"><dl class="kv"><div><dt>' + esc(t('Active engine')) + '</dt><dd>' + esc(cur.engine === 'sqlite' ? 'SQLite (embedded)' : 'PostgreSQL') + '</dd></div><div><dt>' + esc(t('Connection')) + '</dt><dd>' + AW.ui.badge(st.connected ? 'ok' : 'bad', st.connected ? 'Connected' : 'Unavailable') + '</dd></div><div><dt>' + esc(t('Schema version')) + '</dt><dd>' + st.schemaVersion + '</dd></div><div><dt>' + esc(t('Last backup')) + '</dt><dd>' + (st.lastBackupAt ? esc(AW.fmtDateTime(st.lastBackupAt)) : esc(t('Never'))) + '</dd></div></dl></div></section>' +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Connection')) + '</h2></div><div class="card-body set-form">' +
        rowHtml('engine', 'Engine', 'Engines are not interchangeable: switching needs a data migration.', M(), selCtl('db-engine', d.engine, [['sqlite', 'SQLite (embedded)'], ['postgresql', 'PostgreSQL'], ['mysql', 'MySQL — ' + t('not supported by this build'), true]], dis), errs.engine) +
        rowHtml('name', 'Database name', '', M(), txtCtl('db-name', d.name, dis), errs.name) +
        rowHtml('host', 'Host', pg ? '' : 'Not used by the embedded engine.', M(), txtCtl('db-host', d.host, dis || !pg), errs.host) +
        rowHtml('port', 'Port', '', M(t('Range') + ': 1–65535 · ' + t('Default') + ': 5432'), numCtl('db-port', d.port, 1, 65535, dis || !pg), errs.port) +
        rowHtml('user', 'Connection account', '', M(), txtCtl('db-user', d.user, dis || !pg), errs.user) +
        rowHtml('password', 'Password', 'Stored on the controller only. It is never shown again, never kept in this browser and never written to logs. Leave blank to keep the current one.', M(), { id: 'db-password', html: '<input type="password" id="db-password" autocomplete="new-password" value="' + esc(DBS.password) + '" placeholder="' + esc(st.hasPassword ? '•••••••• (' + t('set') + ')' : t('not set')) + '"' + (dis || !pg ? ' disabled' : '') + '>' }) +
        rowHtml('tls', 'TLS', '', M(), selCtl('db-tls', d.tls, [['disable', t('Disabled')], ['prefer', t('Prefer')], ['require', t('Require')], ['verify-full', t('Require and verify the server certificate')]], dis || !pg), errs.tls) +
        rowHtml('timeoutS', 'Connection timeout', '', M(t('Range') + ': 1–120 s · ' + t('Default') + ': 10 s'), numCtl('db-timeoutS', d.timeoutS, 1, 120, dis, 's'), errs.timeoutS) +
        rowHtml('pool', 'Connection pool size', '', M(t('Range') + ': 1–100 · ' + t('Default') + ': 5'), numCtl('db-pool', d.pool, 1, 100, dis || !pg), errs.pool) +
        (cur.engine !== d.engine ? '<div class="callout-box warn">' + icon('alert') + '<span>' + esc(t('Switching from {a} to {b} requires migrating the data. Back up first; saving here changes only where AegisWall connects.', { a: cur.engine, b: d.engine })) + '</span></div>' : '') +
        (DBS.test ? '<div class="callout-box ' + (DBS.test.ok ? 'ok' : 'bad') + '" role="status">' + icon(DBS.test.ok ? 'ok' : 'alert') + '<span><b>' + esc(t(DBS.test.ok ? 'Connection test passed' : 'Connection test failed')) + '</b> — ' + esc(DBS.test.detail) + '</span></div>' : '') +
        '<div class="set-actions inline"><button class="btn" type="button" data-form="db-test"' + (admin && online && !P.busy ? '' : ' disabled') + '>' + (DBS.testing ? '<span class="spinner"></span>' : '') + esc(t('Test Connection')) + '</button>' +
        '<button class="btn btn-primary" type="button" data-form="db-save"' + (admin && dbDirty && (!connChanged || tested) && !P.busy ? '' : ' disabled') + ' title="' + esc(connChanged && !tested ? t('Test the proposed connection first') : !dbDirty ? t('Nothing to save') : '') + '">' + esc(t('Save connection')) + '</button>' +
        '<button class="btn" type="button" data-form="db-cancel"' + (dbDirty ? '' : ' disabled') + '>' + esc(t('Cancel')) + '</button><button class="btn" type="button" data-form="db-defaults"' + (admin ? '' : ' disabled') + '>' + esc(t('Restore Defaults')) + '</button></div></div></section>' +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Backups')) + '</h2><span class="grow"></span><button class="btn btn-small" type="button" data-form="bk-now"' + (tech && online && !P.busy ? '' : ' disabled title="' + esc(!tech ? t('Requires the Technician profile') : '') + '"') + '>' + (P.busy === 'backup' ? '<span class="spinner"></span>' : icon('db')) + esc(t('Backup Now')) + '</button>' +
        '<button class="btn btn-small" type="button" data-form="bk-file"' + (admin && online && !P.busy ? '' : ' disabled title="' + esc(!admin ? t('Requires the Administrator profile') : '') + '"') + '>' + icon('upload') + esc(t('Restore from file…')) + '</button></div><div class="card-body set-form">' +
        rowHtml('schedule', 'Backup schedule', '', M(), selCtl('bk-schedule', b.schedule, [['off', t('Off')], ['daily', t('Daily')], ['weekly', t('Weekly (Sunday)')]], dis), DBS.bkErr.schedule) +
        rowHtml('time', 'Backup time', 'Controller host local time.', M(), { id: 'bk-time', html: '<input type="time" id="bk-time" value="' + esc(b.time) + '"' + (dis || b.schedule === 'off' ? ' disabled' : '') + '>' }, DBS.bkErr.time) +
        rowHtml('retention', 'Retention', 'Older backups are removed automatically.', M(t('Range') + ': 1–30 · ' + t('Default') + ': 5'), numCtl('bk-retention', b.retention, 1, 30, dis, t('backups')), DBS.bkErr.retention) +
        rowHtml('destination', 'Backup destination', 'A folder on the controller host.', M(), txtCtl('bk-destination', b.destination, dis), DBS.bkErr.destination) +
        '<div class="set-actions inline"><button class="btn btn-primary" type="button" data-form="bk-save"' + (admin && bkDirty && !P.busy ? '' : ' disabled') + '>' + esc(t('Save backup settings')) + '</button><button class="btn" type="button" data-form="bk-cancel"' + (bkDirty ? '' : ' disabled') + '>' + esc(t('Cancel')) + '</button></div>' +
        (list.length ? '<div class="table-wrap"><table><thead><tr><th>' + esc(t('Created')) + '</th><th>' + esc(t('Reason')) + '</th><th>' + esc(t('Size')) + '</th><th>' + esc(t('Schema')) + '</th><th></th></tr></thead><tbody>' + list.map((x) => '<tr><td>' + esc(AW.fmtDateTime(x.createdAt)) + '</td><td>' + esc(t({ manual: 'Manual', scheduled: 'Scheduled', 'pre-restore': 'Safety copy before restore' }[x.reason] || x.reason)) + '</td><td>' + AW.bytes(x.sizeBytes) + '</td><td>' + x.schema + '</td><td class="actions"><button class="btn btn-small" type="button" data-form="bk-dl" data-id="' + x.id + '">' + icon('download') + esc(t('Download')) + '</button><button class="btn btn-small btn-danger-quiet" type="button" data-form="bk-restore" data-id="' + x.id + '"' + (admin && online && !P.busy ? '' : ' disabled') + '>' + esc(t('Restore…')) + '</button></td></tr>').join('') + '</tbody></table></div>'
          : '<p class="empty">' + esc(t('No backups yet. Backup Now creates a usable file with layouts, presets, hardware mapping and configuration (secrets excluded).')) + '</p>') + '</div></section>';
      const on = (id, fn) => { const n = $('#' + id, host); if (n) n.addEventListener('change', (e) => { e.stopPropagation(); fn(e.target); P.errors.database = pg || d.engine === 'postgresql' || true ? svc.config.validate('db', d) : {}; DBS.bkErr = svc.config.validate('backup', b); P.renderMain(id); P.renderNav(); }); };
      const num = (n) => (n.value.trim() === '' ? NaN : Number(n.value));
      on('db-engine', (n) => { d.engine = n.value; DBS.test = null; }); on('db-name', (n) => { d.name = n.value.trim(); DBS.test = null; }); on('db-host', (n) => { d.host = n.value.trim(); DBS.test = null; });
      on('db-port', (n) => { d.port = num(n); DBS.test = null; }); on('db-user', (n) => { d.user = n.value.trim(); DBS.test = null; }); on('db-password', (n) => { DBS.password = n.value; }); on('db-tls', (n) => { d.tls = n.value; DBS.test = null; });
      on('db-timeoutS', (n) => { d.timeoutS = num(n); }); on('db-pool', (n) => { d.pool = num(n); });
      on('bk-schedule', (n) => { b.schedule = n.value; }); on('bk-time', (n) => { b.time = n.value; }); on('bk-retention', (n) => { b.retention = num(n); }); on('bk-destination', (n) => { b.destination = n.value.trim(); });
    },
    async action(a, _d, btn) {
      const d = P.drafts.database, b = P.drafts.backup;
      try {
        if (a === 'db-cancel') { delete P.drafts.database; DBS.password = ''; DBS.test = null; P.errors.database = {}; }
        else if (a === 'db-defaults') { Object.assign(d, clone(svc.config.DEFAULTS.db)); DBS.test = null; P.errors.database = {}; }
        else if (a === 'db-test') { DBS.testing = true; P.busy = 'db'; P.renderMain(); try { DBS.test = await svc.db.test(d, DBS.password); } catch (e) { DBS.test = { ok: false, detail: e.message }; if (e.fields) P.errors.database = e.fields; } finally { DBS.testing = false; P.busy = ''; } }
        else if (a === 'db-save') {
          const cur = svc.config.section('db');
          if (svc.db.signature(cur) !== svc.db.signature(d)) { const ok = await AW.confirm({ title: t('Switch the database connection?'), confirmLabel: t('Switch connection'), danger: true, html: '<p>' + esc(t('AegisWall on {h} will reconnect to the tested database. The previous connection settings are kept for recovery under Settings → Configuration.', { h: svc.host.name })) + '</p><ul><li><b>' + esc(t('Current')) + ':</b> ' + esc(cur.engine + (cur.engine === 'postgresql' ? ' @ ' + cur.host + ':' + cur.port : '')) + ' / ' + esc(cur.name) + '</li><li><b>' + esc(t('New')) + ':</b> ' + esc(d.engine + (d.engine === 'postgresql' ? ' @ ' + d.host + ':' + d.port : '')) + ' / ' + esc(d.name) + '</li></ul>' + (cur.engine !== d.engine ? '<p class="note">' + esc(t('Different engine: existing data is NOT migrated by this action.')) + '</p>' : '') }); if (!ok) return false; }
          P.busy = 'db'; P.renderMain();
          await svc.db.save(d, DBS.password, P.ver.database); delete P.drafts.database; DBS.password = ''; DBS.test = null; AW.toast('ok', t('Database connection saved.') + ' ' + t('(Demo)'));
        }
        else if (a === 'bk-cancel') { delete P.drafts.backup; DBS.bkErr = {}; }
        else if (a === 'bk-save') { P.busy = 'bk'; P.renderMain(); await svc.config.save('backup', b, P.ver.backup); delete P.drafts.backup; AW.toast('ok', t('Backup settings saved.')); }
        else if (a === 'bk-now') { P.busy = 'backup'; P.renderMain(); const r = await svc.db.backupNow('manual'); P.busy = ''; P.renderMain(); const s = await AW.saveFile('aegiswall-backup-' + AW.fmtDate(r.meta.createdAt) + '-' + r.meta.id.slice(-6) + '.json', r.text); AW.toast('ok', t('Backup created ({size}).', { size: AW.bytes(r.meta.sizeBytes) }) + (s.ok ? ' ' + t('A copy was saved to your downloads.') : '')); }
        else if (a === 'bk-dl') { const id = btn.dataset.id, x = svc.db.backups().find((k) => k.id === id); await AW.saveFile('aegiswall-backup-' + AW.fmtDate(x.createdAt) + '-' + id.slice(-6) + '.json', svc.db.backupText(id)); }
        else if (a === 'bk-restore') await restore(svc.db.backupText(btn.dataset.id), t('backup of {d}', { d: AW.fmtDateTime(svc.db.backups().find((k) => k.id === btn.dataset.id).createdAt) }));
        else if (a === 'bk-file') { const f = await AW.pickFile('.json,application/json'); if (f) { svc.db.parseBackup(f.text); await restore(f.text, t('file "{n}"', { n: f.name })); } }
      } catch (e) { if (e.fields) { P.errors.database = e.fields; DBS.bkErr = e.fields; } if (e.code === 'conflict') P.conflict = 'database'; AW.toast('error', e.message); }
      P.busy = '';
      return true;
    },
  };
  async function restore(text, what) {
    const obj = svc.db.parseBackup(text), dd = obj.data;
    const ok = await AW.confirm({ title: t('Restore database?'), danger: true, type: 'RESTORE', confirmLabel: t('Restore'), html: '<p>' + esc(t('Selected: {w}, created {d} on {h} (schema {s}).', { w: what, d: AW.fmtDateTime(obj.createdAt), h: obj.host, s: obj.schema })) + ' ' + AW.ui.demo() + '</p><ul>' +
      '<li><b>' + esc(t('Replaced')) + ':</b> ' + esc(t('{l} saved layout(s), {p} audio preset(s), hardware mapping, confirmed wall composition and audio configuration.', { l: (dd.layouts || []).length, p: (dd.audioPresets || []).length })) + '</li>' +
      '<li><b>' + esc(t('Downtime')) + ':</b> ' + esc(t('the application service is unavailable while data is replaced (a few seconds in this demo).')) + '</li>' +
      '<li><b>' + esc(t('Recovery')) + ':</b> ' + esc(t('a safety backup of the current data is created first and appears in the list.')) + '</li>' +
      '<li><b>' + esc(t('Kept')) + ':</b> ' + esc(t('your unsaved wall draft, licenses and stored passwords.')) + '</li></ul>' });
    if (!ok) return;
    P.busy = 'restore'; P.renderMain();
    const close = AW.toast('info', t('Restoring… creating a safety backup first.'), { ms: 20000 });
    try { const r = await svc.db.restore(text); close(); AW.toast('ok', t('Restore complete. Safety backup {id} holds the data that was replaced.', { id: r.safetyId }) + ' ' + t('(Demo)'), { ms: 9000 }); }
    catch (e) { close(); AW.toast('error', t('Restore failed: {m}', { m: e.message })); }
    finally { P.busy = ''; }
  }
  // the form engine passes only the action name; give this panel the clicked button as well
  document.addEventListener('click', (e) => { const b = e.target.closest('#set-main [data-form]'); if (b) P._btn = b; }, true);
  { const p = P.panels.database, act = p.action; p.action = (a) => act.call(p, a, null, P._btn); }
  P.index.database = [{ key: 'engine', label: 'Engine' }, { key: 'host', label: 'Host' }, { key: 'port', label: 'Port' }, { key: 'password', label: 'Password' }, { key: 'tls', label: 'TLS' }, { key: 'pool', label: 'Connection pool size' }, { key: 'schedule', label: 'Backup schedule' }, { key: 'retention', label: 'Retention' }, { key: 'destination', label: 'Backup destination' }];

  // =====================================================================================
  // Logs (operational) and audit trail (administrative) — separate stores, separate tabs
  // =====================================================================================
  const LG = { tab: 'ops', level: 'debug', service: '', from: '', to: '', q: '', follow: true, clearedAt: 0, frozen: null, cfg: null, cfgErr: '' };
  const LV = AW.LOG_LEVELS;
  function logRows() {
    const src = LG.tab === 'ops' ? AW.logs.all() : AW.logs.audit();
    let list = LG.follow || !LG.frozen ? src : LG.frozen;
    const q = AW.norm(LG.q), from = LG.from ? Date.parse(LG.from + 'T00:00:00') : 0, to = LG.to ? Date.parse(LG.to + 'T23:59:59') : Infinity;
    list = list.filter((e) => e.ts > LG.clearedAt && e.ts >= from && e.ts <= to);
    if (LG.tab === 'ops') list = list.filter((e) => LV[e.level] >= LV[LG.level] && (!LG.service || e.service === LG.service) && (!q || AW.norm(e.message + ' ' + e.service + ' ' + JSON.stringify(e.meta)).includes(q)));
    else list = list.filter((e) => !q || AW.norm(e.action + ' ' + e.actor + ' ' + JSON.stringify(e.detail)).includes(q));
    return list;
  }
  function logTable() {
    const list = logRows().slice(-300).reverse();
    if (!list.length) return '<p class="empty">' + esc(t('No entries match the current filters.')) + '</p>';
    if (LG.tab === 'ops') return '<div class="table-wrap log-wrap"><table class="log"><thead><tr><th>' + esc(t('Time')) + '</th><th>' + esc(t('Severity')) + '</th><th>' + esc(t('Service')) + '</th><th>' + esc(t('Message')) + '</th><th>' + esc(t('Correlation')) + '</th></tr></thead><tbody>' + list.map((e) => '<tr class="lv-' + e.level + '"><td class="mono">' + esc(AW.fmtDateTime(e.ts)) + '</td><td>' + AW.ui.badge({ debug: '', info: 'info', warn: 'warn', error: 'bad' }[e.level], e.level.toUpperCase()) + '</td><td>' + esc(e.service) + '</td><td>' + esc(e.message) + '</td><td class="mono">' + esc(e.meta && (e.meta.req || e.meta.id || e.meta.target) || '') + '</td></tr>').join('') + '</tbody></table></div>';
    return '<div class="table-wrap log-wrap"><table class="log"><thead><tr><th>' + esc(t('Time')) + '</th><th>' + esc(t('Actor')) + '</th><th>' + esc(t('Profile')) + '</th><th>' + esc(t('Action')) + '</th><th>' + esc(t('Detail')) + '</th></tr></thead><tbody>' + list.map((e) => '<tr><td class="mono">' + esc(AW.fmtDateTime(e.ts)) + '</td><td>' + esc(e.actor) + '</td><td>' + esc(e.role) + '</td><td class="mono">' + esc(e.action) + '</td><td class="mono log-detail">' + esc(JSON.stringify(e.detail)) + '</td></tr>').join('') + '</tbody></table></div>';
  }
  P.panels.logs = {
    live: true,
    render(host) {
      const tech = AW.can('technician'), admin = AW.can('administrator'), cfg = (LG.cfg = LG.cfg || AW.logs.config()), saved = AW.logs.config();
      const services = [...new Set(AW.logs.all().map((e) => e.service))].sort(), cfgDirty = JSON.stringify(cfg) !== JSON.stringify(saved);
      host.innerHTML = '<header class="set-head"><h2>' + esc(t('Logs')) + '</h2><p>' + esc(t('Operational events and the administrative audit trail are kept separately. Timestamps use the time zone {tz}. Secrets are redacted before anything is stored.', { tz: AW.tz() })) + '</p></header>' +
        '<section class="card"><div class="tabs" role="tablist"><button type="button" role="tab" data-form="tab-ops" aria-selected="' + (LG.tab === 'ops') + '">' + esc(t('Operational log')) + '</button><button type="button" role="tab" data-form="tab-audit" aria-selected="' + (LG.tab === 'audit') + '">' + esc(t('Audit trail')) + '</button></div>' +
        '<div class="card-body"><div class="log-filters">' +
        (LG.tab === 'ops' ? '<label class="field"><span>' + esc(t('Severity')) + '</span><select id="lg-level">' + [['debug', 'All'], ['info', 'Info and above'], ['warn', 'Warnings and errors'], ['error', 'Errors only']].map(([v, l]) => '<option value="' + v + '"' + (v === LG.level ? ' selected' : '') + '>' + esc(t(l)) + '</option>').join('') + '</select></label>' +
          '<label class="field"><span>' + esc(t('Service / source')) + '</span><select id="lg-service"><option value="">' + esc(t('All')) + '</option>' + services.map((s) => '<option' + (s === LG.service ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' : '') +
        '<label class="field"><span>' + esc(t('From')) + '</span><input type="date" id="lg-from" value="' + esc(LG.from) + '"></label><label class="field"><span>' + esc(t('To')) + '</span><input type="date" id="lg-to" value="' + esc(LG.to) + '"></label>' +
        '<label class="field grow2"><span>' + esc(t('Search')) + '</span><input type="search" id="lg-q" value="' + esc(LG.q) + '" placeholder="' + esc(t('Text, request ID, device…')) + '" spellcheck="false"></label></div>' +
        '<div class="btn-row"><button class="btn btn-small" type="button" data-form="follow" aria-pressed="' + LG.follow + '">' + (LG.follow ? icon('pause') + esc(t('Pause')) : icon('play') + esc(t('Follow'))) + '</button>' +
        '<button class="btn btn-small" type="button" data-form="clear-view" title="' + esc(t('Empties this view only. Stored entries are not deleted.')) + '">' + esc(t('Clear View')) + '</button>' +
        (LG.clearedAt ? '<button class="btn btn-small" type="button" data-form="unclear">' + esc(t('Show cleared entries again')) + '</button>' : '') +
        '<button class="btn btn-small" type="button" data-form="export">' + icon('download') + esc(t('Export filtered entries')) + '</button><span class="grow"></span>' +
        '<span class="note" id="lg-count" role="status"></span></div><div id="lg-table"></div></div></section>' +
        '<section class="card"><details' + (P['adv-logs'] ? ' open' : '') + ' data-adv><summary class="card-head"><h2>' + esc(t('Log storage')) + '</h2><span class="muted">' + esc(t('Level, retention and rotation')) + '</span></summary><div class="card-body set-form">' +
        rowHtml('level', 'Stored log level', 'Entries below this level are not stored at all.', meta(HOSTM, t('Default') + ': Info · ' + t('Applies to new entries on Save')), selCtl('lg-cfg-level', cfg.level, [['debug', 'Debug'], ['info', 'Info'], ['warn', 'Warning'], ['error', 'Error']], !tech)) +
        rowHtml('retention', 'Retention', 'Older operational entries are removed.', meta(HOSTM, t('Range') + ': 1–365 · ' + t('Default') + ': 14'), numCtl('lg-cfg-retentionDays', cfg.retentionDays, 1, 365, !tech, t('days'))) +
        rowHtml('rotation', 'Rotation limit', 'When the store holds more entries than this, the oldest leave first.', meta(HOSTM, t('Range') + ': 50–5000 · ' + t('Default') + ': 500'), numCtl('lg-cfg-maxEntries', cfg.maxEntries, 50, 5000, !tech, t('entries'))) +
        (LG.cfgErr ? '<p class="field-error" role="alert">' + esc(LG.cfgErr) + '</p>' : '') +
        '<div class="set-actions inline"><button class="btn btn-primary" type="button" data-form="cfg-save"' + (tech && cfgDirty ? '' : ' disabled') + '>' + esc(t('Save')) + '</button><button class="btn" type="button" data-form="cfg-cancel"' + (cfgDirty ? '' : ' disabled') + '>' + esc(t('Cancel')) + '</button><button class="btn" type="button" data-form="cfg-defaults"' + (tech ? '' : ' disabled') + '>' + esc(t('Restore Defaults')) + '</button><span class="grow"></span>' +
        '<button class="btn btn-danger-quiet" type="button" data-form="delete-stored"' + (admin ? '' : ' disabled title="' + esc(t('Requires the Administrator profile')) + '"') + '>' + icon('trash') + esc(t('Delete stored logs…')) + '</button></div>' +
        '<p class="note">' + esc(t('Deleting stored logs is different from Clear View and is recorded in the audit trail. The audit trail itself cannot be deleted here.')) + '</p></div></details></section>';
      const det = host.querySelector('[data-adv]'); det.addEventListener('toggle', () => { P['adv-logs'] = det.open; });
      const bind = (id, fn, evt) => { const n = $('#' + id, host); if (n) n.addEventListener(evt || 'change', (e) => { e.stopPropagation(); fn(e.target); drawLogs(); }); };
      bind('lg-level', (n) => { LG.level = n.value; }); bind('lg-service', (n) => { LG.service = n.value; }); bind('lg-from', (n) => { LG.from = n.value; }); bind('lg-to', (n) => { LG.to = n.value; }); bind('lg-q', (n) => { LG.q = n.value; }, 'input');
      const cb = (id, key, numeric) => { const n = $('#' + id, host); n.addEventListener('change', (e) => { e.stopPropagation(); cfg[key] = numeric ? Number(n.value) : n.value; LG.cfgErr = ''; P.renderMain(id); }); };
      cb('lg-cfg-level', 'level'); cb('lg-cfg-retentionDays', 'retentionDays', true); cb('lg-cfg-maxEntries', 'maxEntries', true);
      drawLogs();
    },
    async action(a) {
      if (a === 'tab-ops' || a === 'tab-audit') { LG.tab = a.slice(4); LG.frozen = null; LG.follow = true; return true; }
      if (a === 'follow') { LG.follow = !LG.follow; LG.frozen = LG.follow ? null : (LG.tab === 'ops' ? AW.logs.all() : AW.logs.audit()).slice(); return true; }
      if (a === 'clear-view') { LG.clearedAt = Date.now(); return true; }
      if (a === 'unclear') { LG.clearedAt = 0; return true; }
      if (a === 'export') {
        const rows = logRows();
        if (!rows.length) { AW.toast('warn', t('There is nothing to export with the current filters.')); return false; }
        const header = '# AegisWall ' + (LG.tab === 'ops' ? 'operational log' : 'audit trail') + ' export — ' + new Date().toISOString() + ' — timezone ' + AW.tz() + ' — ' + rows.length + ' entries — secrets redacted';
        const body = rows.map((e) => LG.tab === 'ops' ? [new Date(e.ts).toISOString(), e.level.toUpperCase(), e.service, e.message, JSON.stringify(AW.redact(e.meta))].join('\t') : [new Date(e.ts).toISOString(), e.actor, e.role, e.action, JSON.stringify(AW.redact(e.detail))].join('\t')).join('\n');
        const r = await AW.saveFile('aegiswall-' + (LG.tab === 'ops' ? 'log' : 'audit') + '-' + AW.fmtDate(Date.now()) + '.txt', header + '\n' + body + '\n');
        if (r.ok) AW.toast('ok', t('{n} entries exported.', { n: rows.length }));
        return false;
      }
      if (a === 'cfg-cancel') { LG.cfg = null; LG.cfgErr = ''; return true; }
      if (a === 'cfg-defaults') { LG.cfg = { level: 'info', retentionDays: 14, maxEntries: 500 }; return true; }
      if (a === 'cfg-save') {
        const c = LG.cfg;
        if (!AW.can('technician')) { AW.toast('error', t('Requires the Technician profile.')); return false; }
        if (!Number.isInteger(c.retentionDays) || c.retentionDays < 1 || c.retentionDays > 365) LG.cfgErr = t('Retention must be 1–365 days.');
        else if (!Number.isInteger(c.maxEntries) || c.maxEntries < 50 || c.maxEntries > 5000) LG.cfgErr = t('Rotation limit must be 50–5000 entries.');
        else { AW.logs.setConfig(c); AW.audit('logs.config_saved', c); LG.cfg = null; LG.cfgErr = ''; AW.toast('ok', t('Log storage settings saved. Scope: controller host.')); }
        return true;
      }
      if (a === 'delete-stored') {
        try { AW.requireRole('administrator', t('Deleting stored logs')); } catch (e) { AW.toast('error', e.message); return false; }
        if (await AW.confirm({ title: t('Delete stored logs?'), danger: true, type: 'DELETE', confirmLabel: t('Delete stored logs'), message: t('All {n} stored operational entries are permanently deleted. The audit trail is kept and records this action.', { n: AW.logs.all().length }) })) { const n = AW.logs.all().length; AW.logs.deleteStored(); AW.audit('logs.stored_deleted', { entries: n }); AW.toast('info', t('{n} stored log entries deleted.', { n })); }
        return true;
      }
      return false;
    },
  };
  function drawLogs() {
    const box = document.getElementById('lg-table'); if (!box) return;
    const sc = box.querySelector('.log-wrap'), top = sc ? sc.scrollTop : 0;
    box.innerHTML = logTable();
    const n = logRows().length, c = document.getElementById('lg-count');
    if (c) c.textContent = t('{n} entries', { n }) + (n > 300 ? ' · ' + t('showing the newest 300') : '') + ' · ' + (LG.follow ? t('following live') : t('paused'));
    const sc2 = box.querySelector('.log-wrap'); if (sc2 && !LG.follow) sc2.scrollTop = top;
  }
  ['log', 'audit'].forEach((evt) => AW.bus.on(evt, () => { if (P.visible && P.cat === 'logs' && LG.follow) drawLogs(); }));
  P.index.logs = [{ key: 'level', label: 'Stored log level' }, { key: 'retention', label: 'Log retention' }, { key: 'rotation', label: 'Log rotation limit' }];

  // =====================================================================================
  // Technician console
  // =====================================================================================
  const CN = { lines: [], history: AW.store.get('console.history', []), hIndex: -1, running: null, input: '' };
  const push = (stream, text) => { CN.lines.push({ ts: Date.now(), stream, text }); if (CN.lines.length > 600) CN.lines.splice(0, CN.lines.length - 600); };
  function drawConsole() {
    const out = document.getElementById('cn-out'); if (!out) return;
    out.innerHTML = CN.lines.length ? CN.lines.map((l) => '<div class="cn-' + l.stream + '"><time>' + esc(AW.fmtTime(l.ts)) + '</time><span class="cn-tag">' + (l.stream === 'stdout' ? 'out' : l.stream === 'stderr' ? 'err' : l.stream === 'cmd' ? '$' : '•') + '</span><span>' + esc(l.text) + '</span></div>').join('') : '<p class="empty">' + esc(t('No output yet. Type "help" to list the diagnostic commands.')) + '</p>';
    out.scrollTop = out.scrollHeight;
  }
  async function runCommand(line) {
    line = line.trim(); if (!line || CN.running) return;
    CN.history = CN.history.filter((h) => h !== line).concat(line).slice(-50); AW.store.set('console.history', CN.history); CN.hIndex = -1;
    push('cmd', line);
    const ctl = new AbortController(); CN.running = { ctl, line };
    P.renderMain('cn-in');
    try {
      const r = await svc.console.run(line, { signal: ctl.signal, onLine: (s, x) => { push(s, x); drawConsole(); } });
      push('status', t('exit {code} · {ms} ms · {state}', { code: r.exit, ms: r.ms, state: r.cancelled ? t('cancelled') : r.exit === 0 ? t('success') : t('failed') }) + ' · Demo');
    } catch (e) { push('stderr', e.message); push('status', t('not executed') + ' · ' + (e.code || 'error')); }
    CN.running = null;
    if (P.visible && P.cat === 'console') P.renderMain('cn-in');
  }
  P.panels.console = {
    live: true,
    render(host) {
      const tech = AW.can('technician'), licensed = svc.license.has('maint.console'), online = svc.conn.state === 'online', ok = tech && licensed && online;
      host.innerHTML = '<header class="set-head"><h2>' + esc(t('Technician console')) + '</h2>' + AW.ui.demo() + '<p>' + esc(t('Runs documented diagnostic commands on the controller through the authenticated backend. It is not a host shell: only allowlisted commands run, output and runtime are bounded, and every command is recorded in the audit trail.')) + '</p></header>' +
        (!licensed ? '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('The technician console is a licensed feature and is locked on this installation.')) + ' <button class="btn btn-small" type="button" data-form="licensing">' + esc(t('Open Licensing')) + '</button></span></div>' : '') +
        (!tech ? '<div class="callout-box">' + icon('lock') + '<span>' + esc(t('Requires the Technician profile. The service refuses commands from other profiles.')) + '</span></div>' : '') +
        (!online ? '<div class="callout-box warn">' + icon('alert') + '<span>' + esc(t('The controller is {s}; commands cannot run.', { s: t(svc.conn.state) })) + '</span></div>' : '') +
        '<section class="card"><div class="card-head"><h2>' + esc(t('Target host')) + ': <span class="mono">' + esc(svc.console.target()) + '</span></h2><span class="muted">' + esc(svc.host.address) + '</span><span class="grow"></span>' +
        '<button class="btn btn-small" type="button" data-form="cn-clear"' + (CN.lines.length ? '' : ' disabled') + '>' + esc(t('Clear')) + '</button><button class="btn btn-small" type="button" data-form="cn-export"' + (CN.lines.length ? '' : ' disabled') + '>' + icon('download') + esc(t('Export')) + '</button></div>' +
        '<div class="card-body"><div id="cn-out" class="cn-out" role="log" aria-live="polite" aria-label="' + esc(t('Console output')) + '" tabindex="0"></div>' +
        '<form id="cn-form" class="cn-form"><span class="mono" aria-hidden="true">' + esc(svc.console.target()) + ' &gt;</span><input type="text" id="cn-in" class="mono" value="' + esc(CN.input) + '" placeholder="' + esc(t('help')) + '" aria-label="' + esc(t('Command')) + '" autocomplete="off" spellcheck="false" autocapitalize="none"' + (ok && !CN.running ? '' : ' disabled') + '>' +
        (CN.running ? '<button class="btn btn-danger-quiet" type="button" data-form="cn-cancel">' + icon('stop') + esc(t('Cancel')) + '</button>' : '<button class="btn btn-primary" type="submit"' + (ok ? '' : ' disabled') + '>' + esc(t('Run')) + '</button>') + '</form>' +
        '<div class="chips cn-quick">' + ['help', 'service status', 'devices list', 'outputs list', 'net check', 'ping gateway', 'ping license-service', 'logs query apply'].map((c) => '<button type="button" data-form="cn-q" data-cmd="' + esc(c) + '"' + (ok && !CN.running ? '' : ' disabled') + '>' + esc(c) + '</button>').join('') + '</div>' +
        '<p class="note">' + esc(t('Arrow up and down recall earlier commands. Disruptive operations are refused here and are done from System & Maintenance, with confirmation.')) + '</p></div></section>';
      drawConsole();
      const input = $('#cn-in', host);
      $('#cn-form', host).addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; CN.input = ''; runCommand(v); });
      input.addEventListener('input', () => { CN.input = input.value; });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault(); if (!CN.history.length) return;
        CN.hIndex = e.key === 'ArrowUp' ? (CN.hIndex < 0 ? CN.history.length - 1 : Math.max(0, CN.hIndex - 1)) : (CN.hIndex < 0 ? -1 : CN.hIndex + 1 >= CN.history.length ? -1 : CN.hIndex + 1);
        input.value = CN.input = CN.hIndex < 0 ? '' : CN.history[CN.hIndex];
      });
    },
    async action(a) {
      if (a === 'licensing') { P.open('licensing'); return false; }
      if (a === 'cn-clear') { CN.lines = []; return true; }
      if (a === 'cn-cancel') { if (CN.running) CN.running.ctl.abort(); return false; }
      if (a === 'cn-q') { runCommand(P._btn.dataset.cmd); return false; }
      if (a === 'cn-export') { const text = '# AegisWall technician console — target ' + svc.console.target() + ' — exported ' + new Date().toISOString() + ' — DEMO results\n' + CN.lines.map((l) => new Date(l.ts).toISOString() + '\t' + l.stream + '\t' + l.text).join('\n') + '\n'; await AW.saveFile('aegiswall-console-' + AW.fmtDate(Date.now()) + '.txt', text); return false; }
      return false;
    },
  };
  P.index.console = [{ key: 'console', label: 'Diagnostic commands' }];
})();
