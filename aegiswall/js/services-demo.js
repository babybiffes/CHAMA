/* AegisWall — DEMO adapters, part 1: authentication, connection, sources, physical outputs,
 * wall composition and licensing.
 *
 * This file and services-ops.js are the only boundary between the interface and the controller.
 * Everything here is simulated in the browser and labeled "Demo" in the UI: no command leaves this page.
 * To integrate with AllService / Plot Control, provide another file exposing the same `AW.svc` contract,
 * written from those products' documentation. No API of theirs is assumed here. See docs/INTEGRATION.md.
 */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, AppError = AW.AppError;
  const wait = AW.wait;

  const MON = { w: 1920, h: 1080, hz: 60 };
  const svc = (AW.svc = {
    mode: 'demo',
    label: 'Demo adapter',
    limits: { maxCols: 8, maxRows: 6, monitor: MON },   // in a live system these come from the integration
    host: { name: 'AEGIS-CTRL-01', role: 'Videowall controller host', address: '192.168.10.20' },
  });

  // Developer-accessible switches that make the simulated services misbehave on purpose (Settings > Demo tools).
  AW.demo = {
    failNextApply: false, controllerOffline: false, licenseOffline: false, unplugUsbAudio: false, unplugOutput: false,
    endpointUnreachable: false, maintNoAck: false, maintNoReturn: false, noWebGL: AW.store.get('demo.noWebGL', false),
  };

  // ---------- connection to the controller ----------
  svc.conn = {
    state: 'online', detail: '', since: Date.now(),
    set(state, detail) { if (state === this.state && detail === this.detail) return; this.state = state; this.detail = detail || ''; this.since = Date.now(); AW.bus.emit('conn', this); },
    require() { if (this.state !== 'online') throw new AppError('offline', t('The controller is not reachable ({state}). Nothing was sent.', { state: t(this.state) })); },
  };

  // ---------- authentication (reference accounts, valid only in this demo adapter) ----------
  const ACCOUNTS = {
    operator: { pass: 'operator', role: 'operator', name: 'Olivia Operator' },
    tech: { pass: 'tech', role: 'technician', name: 'Tomás Technician' },
    admin: { pass: 'admin', role: 'administrator', name: 'Ada Administrator' },
  };
  svc.auth = {
    accounts: Object.keys(ACCOUNTS).map((u) => ({ user: u, pass: ACCOUNTS[u].pass, role: ACCOUNTS[u].role })),
    async login(user, pass) {
      await wait(250);
      const a = ACCOUNTS[String(user).trim().toLowerCase()];
      if (!a || a.pass !== pass) { AW.log('warn', 'auth', 'Sign-in rejected', { user }); throw new AppError('auth', t('Unknown user or wrong password.')); }
      const session = { user: String(user).trim().toLowerCase(), role: a.role, name: a.name, since: Date.now() };
      AW.session = session;
      AW.audit('auth.sign_in', { role: a.role });
      return session;
    },
    logout() { if (AW.session) AW.audit('auth.sign_out', {}); AW.session = null; },
  };

  // ---------- demo source catalogue ----------
  function buildSources() {
    const out = [];
    const areas = ['North Gate', 'South Gate', 'Parking', 'Loading Dock', 'Reception', 'Corridor A', 'Corridor B', 'Server Room', 'East Perimeter', 'West Perimeter', 'Warehouse', 'Cafeteria'];
    for (let i = 1; i <= 36; i++) {
      const n = String(i).padStart(3, '0');
      out.push({ id: 'cam-' + n, type: 'camera', name: 'Camera ' + n, detail: areas[(i - 1) % areas.length], audio: i % 6 === 0, preview: 'live' });
    }
    [['Gates', 2], ['Parking', 3], ['Perimeter', 4], ['Dock', 2], ['Corridors', 3], ['Servers', 2]].forEach(([name, n], i) =>
      out.push({ id: 'mos-' + (i + 1), type: 'mosaic', name: name + ' mosaic', detail: n * n + ' cameras', mosaic: n, audio: false, preview: 'live' }));
    ['KPI dashboard', 'Traffic map', 'Weather forecast', 'Intranet', 'Ticket queue', 'Shift roster', 'Energy panel', 'Room schedule'].forEach((name, i) =>
      out.push({ id: 'web-' + (i + 1), type: 'web', name, detail: 'Web page', audio: false, preview: 'static' }));
    ['Live stream 1', 'Live stream 2', 'Corporate channel', 'Training video', 'News broadcast'].forEach((name, i) =>
      out.push({ id: 'yt-' + (i + 1), type: 'youtube', name, detail: 'YouTube', audio: true, preview: 'live' }));
    [['Chrome', 'Service desk'], ['Chrome', 'Reports'], ['Word', 'Operating procedure.docx'], ['Excel', 'Duty roster.xlsx'], ['Excel', 'Monthly KPIs.xlsx'],
      ['PowerPoint', 'Daily briefing.pptx'], ['PowerShell', 'Service monitor'], ['PowerShell', 'Admin session']].forEach(([app, title], i) =>
      out.push({ id: 'app-' + (i + 1), type: 'app', app, name: app + ' — ' + title, detail: 'Application window', audio: app === 'PowerPoint' || app === 'Chrome', preview: 'static' }));
    // A few sources are deliberately unavailable so the unavailable-source handling can be exercised.
    ['cam-007', 'cam-019', 'web-5'].forEach((id) => { out.find((s) => s.id === id).available = false; });
    out.forEach((s) => { if (s.available === undefined) s.available = true; });
    return out;
  }
  const SOURCES = buildSources();
  const byId = new Map(SOURCES.map((s) => [s.id, s]));
  svc.sources = {
    async list() { await wait(120); return SOURCES; },
    get: (id) => byId.get(id),
  };
  svc.makeItem = (source, rect, extra) => Object.assign({
    id: AW.uid('it'), sourceId: source.id, name: source.name, type: source.type, app: source.app || '',
    x: rect.x, y: rect.y, w: rect.w, h: rect.h, aspect: false, locked: false, contentOnly: false, mosaic: source.mosaic || 1, link: '',
  }, extra || {});

  // ---------- physical outputs and hardware mapping ----------
  // Three different things: a planned (virtual) tile, a detected physical output, and a confirmed mapping.
  const OUTPUTS = [];
  for (let g = 0; g < 3; g++) for (let p = 1; p <= 4; p++) OUTPUTS.push({ id: 'GPU' + g + '-DP' + p, adapter: 'GPU ' + g, connected: true, width: MON.w, height: MON.h, hz: MON.hz });
  function defaultMapping() { const m = {}; OUTPUTS.forEach((o, i) => { m[Math.floor(i / 4) + ',' + (i % 4)] = { output: o.id, confirmed: true }; }); return m; }
  svc.outputs = {
    wallName: () => AW.store.get('hw.wallName', 'Control Room A'),
    mapping: () => AW.store.get('hw.mapping', defaultMapping()),
    list: () => OUTPUTS.map((o) => Object.assign({}, o, { connected: o.id === 'GPU2-DP4' && AW.demo.unplugOutput ? false : o.connected })),
    async detect() { svc.conn.require(); await wait(500); AW.log('info', 'outputs', 'Output detection completed', { detected: OUTPUTS.length }); return this.list(); },
    // 'planned' | 'detected' | 'confirmed' | 'missing'
    tileState(key) {
      const m = this.mapping()[key];
      if (!m || !m.output) return { state: 'planned' };
      const o = this.list().find((x) => x.id === m.output);
      if (!o || !o.connected) return { state: 'missing', output: m.output };
      return { state: m.confirmed ? 'confirmed' : 'detected', output: o };
    },
    validate(mapping) {
      const seen = {}, problems = [];
      for (const key in mapping) {
        const id = mapping[key] && mapping[key].output; if (!id) continue;
        if (!OUTPUTS.find((o) => o.id === id)) problems.push(t('Tile {tile}: output {id} does not exist.', { tile: AW.wall.tileName(key), id }));
        if (seen[id]) problems.push(t('Output {id} is assigned to both {a} and {b}.', { id, a: AW.wall.tileName(seen[id]), b: AW.wall.tileName(key) }));
        seen[id] = key;
      }
      return problems;
    },
    async saveMapping(mapping, wallName) {
      AW.requireRole('technician', t('Changing the hardware mapping'));
      svc.conn.require();
      const problems = this.validate(mapping);
      if (problems.length) throw new AppError('invalid', problems[0], { problems });
      await wait(350);
      const prev = this.mapping(), next = {};
      for (const key in mapping) {
        const id = mapping[key] && mapping[key].output; if (!id) continue;
        next[key] = { output: id, confirmed: !!(prev[key] && prev[key].output === id && prev[key].confirmed) };   // a changed assignment is unconfirmed again
      }
      AW.store.set('hw.mapping', next);
      if (wallName) AW.store.set('hw.wallName', wallName);
      AW.audit('hardware.mapping_saved', { tiles: Object.keys(next).length });
      AW.bus.emit('mapping', next);
      return next;
    },
    // In a live system the controller shows an identification pattern and reports back. Here the acknowledgement is simulated.
    async confirmMapping() {
      AW.requireRole('technician', t('Confirming the hardware mapping'));
      svc.conn.require();
      await wait(700);
      const m = this.mapping(); let n = 0;
      for (const key in m) { const st = this.tileState(key).state; if (st === 'detected') { m[key].confirmed = true; n++; } }
      AW.store.set('hw.mapping', m);
      AW.audit('hardware.mapping_confirmed', { confirmed: n });
      AW.bus.emit('mapping', m);
      return { confirmed: n, ack: 'Demo acknowledgement' };
    },
  };

  // ---------- wall composition: last state confirmed by the (simulated) hardware service ----------
  function seedComposition() {
    const it = (id, sid, x, y, w, h, extra) => Object.assign(svc.makeItem(byId.get(sid), { x, y, w, h }, extra), { id });
    return {
      cols: 4, rows: 3,
      items: [
        it('c1', 'mos-1', 0, 0, 1920, 1080, { locked: true }),
        it('c2', 'cam-001', 1920, 0, 1920, 1080, { aspect: true }),
        it('c3', 'app-1', 3840, 0, 3840, 2160),
        it('c4', 'app-4', 0, 1080, 3840, 1080),
        it('c5', 'yt-1', 0, 2160, 1920, 1080, { aspect: true }),
        it('c6', 'web-3', 1920, 2160, 960, 1080),
      ],
    };
  }
  let applying = false;
  svc.wall = {
    async getConfirmed() {
      await wait(80);
      const saved = AW.store.get('wall.confirmed', null);
      return saved ? { composition: saved.composition, confirmedAt: saved.confirmedAt } : { composition: seedComposition(), confirmedAt: Date.now() };
    },
    // Resolves only when the service acknowledges. Rejects on failure; the caller keeps its draft.
    async apply(composition) {
      AW.requireRole('operator', t('Applying a composition'));
      if (applying) throw new AppError('busy', t('An apply request is already in progress.'));
      svc.conn.require();
      applying = true;
      const req = AW.requestId();
      AW.log('info', 'wall', 'Apply requested', { req, cols: composition.cols, rows: composition.rows, items: composition.items.length });
      try {
        await wait(900);
        if (svc.conn.state !== 'online') throw new AppError('offline', t('The connection dropped before the controller acknowledged. Nothing was confirmed.'));
        if (AW.demo.failNextApply) {
          AW.demo.failNextApply = false; AW.bus.emit('demo', AW.demo);
          throw new AppError('apply_failed', t('The controller rejected the composition (simulated failure). Your draft is unchanged.'));
        }
        const warnings = [];
        let planned = 0, missing = 0;
        for (let r = 0; r < composition.rows; r++) for (let c = 0; c < composition.cols; c++) {
          const st = svc.outputs.tileState(r + ',' + c).state;
          if (st === 'planned') planned++; else if (st === 'missing') missing++;
        }
        if (planned) warnings.push(t('{n} planned tile(s) have no physical output and show nothing.', { n: planned }));
        if (missing) warnings.push(t('{n} mapped output(s) are not detected.', { n: missing }));
        const off = composition.items.filter((i) => { const s = byId.get(i.sourceId); return s && !s.available; }).length;
        if (off) warnings.push(t('{n} content item(s) use an unavailable source.', { n: off }));
        const confirmedAt = Date.now();
        AW.store.set('wall.confirmed', { composition, confirmedAt });
        AW.log('info', 'wall', 'Apply acknowledged (demo)', { req, warnings: warnings.length });
        AW.audit('wall.apply', { req, items: composition.items.length, grid: composition.cols + 'x' + composition.rows });
        return { confirmedAt, ack: 'Demo acknowledgement', warnings, req };
      } catch (e) {
        AW.log('error', 'wall', 'Apply failed: ' + e.message, { req });
        throw e;
      } finally { applying = false; }
    },
  };

  // ---------- licensing (complete local demonstration; NOT a production protection scheme) ----------
  const FEATURES = {
    'audio.presets': 'Audio presets',
    'maint.console': 'Technician console',
    'config.transfer': 'Configuration export and import',
  };
  const EDITIONS = {
    standard: { label: 'Standard', features: ['audio.presets'] },
    professional: { label: 'Professional', features: ['audio.presets', 'maint.console'] },
    enterprise: { label: 'Enterprise', features: ['audio.presets', 'maint.console', 'config.transfer'] },
  };
  const SALT = 'aegiswall-demo-integrity';   // public constant: an integrity check, not a secret and not a signature
  const b64u = {
    enc: (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    dec: (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))),
  };
  const issued = () => AW.store.get('lic.issued', []);
  const installation = () => { let id = AW.store.get('lic.installation', null); if (!id) { id = AW.uid('inst'); AW.store.set('lic.installation', id); } return id; };
  function newLicenseId() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = AW.randomBytes(20);
    let s = '';
    for (let i = 0; i < 20; i++) { s += A[bytes[i] % 32]; if (i % 5 === 4 && i < 19) s += '-'; }
    return 'AW-DEMO-' + s;
  }
  function tokenFor(payload) { const body = JSON.stringify(payload); return 'AWDEMO1.' + b64u.enc(body) + '.' + AW.checksum(body + SALT); }
  function parse(text) {
    let s = String(text || '').trim();
    if (!s) throw new AppError('invalid', t('Enter or import a license first.'));
    if (s[0] === '{') {   // license file
      let obj; try { obj = JSON.parse(s); } catch (_) { throw new AppError('invalid', t('The license file is not valid JSON.')); }
      if (!obj || obj.format !== 'aegiswall-license/1' || typeof obj.token !== 'string') throw new AppError('invalid', t('This file is not an AegisWall license file.'));
      s = obj.token;
    }
    const parts = s.split('.');
    if (parts.length !== 3 || parts[0] !== 'AWDEMO1') throw new AppError('invalid', t('The license text is not in a recognized format.'));
    let body; try { body = b64u.dec(parts[1]); } catch (_) { throw new AppError('invalid', t('The license text is damaged.')); }
    if (AW.checksum(body + SALT) !== parts[2]) throw new AppError('invalid', t('The license failed its integrity check. It was altered or copied incompletely.'));
    let payload; try { payload = JSON.parse(body); } catch (_) { throw new AppError('invalid', t('The license text is damaged.')); }
    return { payload, token: s };
  }
  function evaluate(payload) {
    const rec = issued().find((r) => r.id === payload.id);
    if (!rec) return { state: 'invalid', reason: t('This license was not issued by this demo service.') };
    if (rec.revoked) return { state: 'revoked', reason: t('This license was revoked on {date}.', { date: AW.fmtDate(rec.revokedAt) }), rec };
    if (rec.expiresAt && Date.parse(rec.expiresAt) < Date.now()) return { state: 'expired', reason: t('This license expired on {date}.', { date: AW.fmtDate(rec.expiresAt) }), rec };
    return { state: 'valid', rec };
  }
  const offline = () => { if (AW.demo.licenseOffline) throw new AppError('unavailable', t('The license service is unavailable. Try again later; nothing was changed.')); };
  svc.license = {
    FEATURES, EDITIONS,
    installation,
    file(token, payload) { return JSON.stringify({ format: 'aegiswall-license/1', demoOnly: true, notice: 'Demo Only — issued by the AegisWall prototype. Not a production license.', license: payload, token }, null, 2); },
    list() { return issued(); },
    // Generates a unique identifier with a cryptographically secure source, checks uniqueness and persists the record.
    async generate(opts) {
      AW.requireRole('administrator', t('Generating licenses'));
      offline();
      await wait(1100);
      offline();
      const list = issued();
      let id; do { id = newLicenseId(); } while (list.some((r) => r.id === id));
      const features = (opts.features || []).filter((f) => FEATURES[f]);
      const payload = {
        id, demoOnly: true, product: AW.PRODUCT, edition: opts.edition, features,
        issuedAt: new Date().toISOString(), expiresAt: opts.expiresAt || null, deviceLimit: AW.clamp(Math.round(opts.deviceLimit) || 1, 1, 999),
      };
      const token = tokenFor(payload);
      list.push(Object.assign({}, payload, { token, activations: [], revoked: false }));
      AW.store.set('lic.issued', list);
      AW.audit('license.generated', { id, edition: payload.edition, expiresAt: payload.expiresAt, deviceLimit: payload.deviceLimit });
      AW.log('info', 'license', 'License issued (demo)', { id });
      AW.bus.emit('license', null);
      return { payload, token };
    },
    // Validates a license against the demo record without activating it.
    async validate(text) {
      offline(); await wait(300);
      const { payload, token } = parse(text);
      const ev = evaluate(payload);
      return { state: ev.state, reason: ev.reason || '', payload, token, activations: ev.rec ? ev.rec.activations.length : 0 };
    },
    async activate(text) {
      offline(); await wait(600); offline();
      const { payload, token } = parse(text);
      const ev = evaluate(payload);
      if (ev.state !== 'valid') { AW.log('warn', 'license', 'Activation refused: ' + ev.state, { id: payload.id }); throw new AppError(ev.state, ev.reason, { payload }); }
      const list = issued(), rec = list.find((r) => r.id === payload.id), me = installation();
      const mine = rec.activations.some((a) => a.installation === me);
      const current = AW.store.get('lic.activation', null);
      if (mine && current && current.id === rec.id) return { state: 'already_activated', payload };
      if (!mine && rec.activations.length >= rec.deviceLimit) {
        throw new AppError('limit', t('Activation limit reached: this license allows {n} installation(s) and all are in use.', { n: rec.deviceLimit }), { payload });
      }
      if (!mine) rec.activations.push({ installation: me, at: new Date().toISOString() });
      AW.store.set('lic.issued', list);
      AW.store.set('lic.activation', { id: rec.id, token, activatedAt: new Date().toISOString() });
      AW.audit('license.activated', { id: rec.id, installation: me });
      AW.log('info', 'license', 'Installation activated (demo)', { id: rec.id });
      AW.bus.emit('license', null);
      return { state: 'activated', payload };
    },
    // Current activation state of this installation, re-evaluated on every call.
    status() {
      const act = AW.store.get('lic.activation', null);
      if (!act) return { state: 'not_activated', features: [], message: t('Not activated. Core wall control is available; licensed features are locked.') };
      let payload; try { payload = parse(act.token).payload; } catch (e) { return { state: 'invalid', features: [], message: e.message }; }
      const ev = evaluate(payload);
      if (ev.state !== 'valid') return { state: ev.state, features: [], message: ev.reason, payload, activatedAt: act.activatedAt };
      return { state: 'valid', features: payload.features, payload, activatedAt: act.activatedAt, message: t('Activated — {edition} edition.', { edition: t(EDITIONS[payload.edition] ? EDITIONS[payload.edition].label : payload.edition) }) };
    },
    has(feature) { return this.status().features.indexOf(feature) >= 0; },
    // Service-layer enforcement of licensed capabilities.
    require(feature) {
      if (!this.has(feature)) throw new AppError('license', t('"{feature}" is not included in the active license.', { feature: t(FEATURES[feature] || feature) }), { feature });
    },
    async revoke(id) {
      AW.requireRole('administrator', t('Revoking licenses')); offline(); await wait(300);
      const list = issued(), rec = list.find((r) => r.id === id);
      if (!rec) throw new AppError('invalid', t('License not found.'));
      rec.revoked = true; rec.revokedAt = new Date().toISOString();
      AW.store.set('lic.issued', list);
      AW.audit('license.revoked', { id });
      AW.bus.emit('license', null);
    },
    deactivate() {
      const act = AW.store.get('lic.activation', null); if (!act) return;
      const list = issued(), rec = list.find((r) => r.id === act.id), me = installation();
      if (rec) { rec.activations = rec.activations.filter((a) => a.installation !== me); AW.store.set('lic.issued', list); }
      AW.store.remove('lic.activation');
      AW.audit('license.deactivated', { id: act.id });
      AW.bus.emit('license', null);
    },
    // Developer tools for repeating the flow.
    newInstallationId() { AW.store.remove('lic.installation'); AW.store.remove('lic.activation'); const id = installation(); AW.bus.emit('license', null); return id; },
    resetDemo() { ['lic.issued', 'lic.activation', 'lic.installation'].forEach((k) => AW.store.remove(k)); AW.audit('license.demo_reset', {}); AW.bus.emit('license', null); },
  };
})();
