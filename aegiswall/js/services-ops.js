/* AegisWall — DEMO adapters, part 2: telemetry, maintenance, audio, controller configuration,
 * network listener, database, content reload and the technician console.
 * Stateful simulations with the same shape a real backend would expose. Every result is labeled Demo in the UI;
 * nothing here touches a real machine. Role and license checks live HERE (service layer), not only in the UI. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, AppError = AW.AppError, wait = AW.wait, svc = AW.svc, clone = AW.clone;
  const DAY = 86400000;

  // =====================================================================================
  // Controller configuration store (scope: controller host). Versioned to catch stale concurrent edits.
  // =====================================================================================
  const CFG_DEFAULT = {
    network: { mode: 'http', httpPort: 8765, httpsPort: 8443, bind: '0.0.0.0', hostname: 'aegis-ctrl-01.local', certId: '' },
    reload: { defaultInterval: 0, timeoutS: 15, retries: 2, backoffS: 5, cache: 'default', scheduleEnabled: false, scheduleTime: '06:00', perSource: {} },
    db: { engine: 'sqlite', host: '', port: 5432, name: 'aegiswall', user: '', tls: 'prefer', timeoutS: 10, pool: 5 },
    backup: { schedule: 'off', time: '02:00', retention: 5, destination: 'D:\\AegisWall\\Backups' },
    thresholds: { cpu: 85, mem: 85, diskFree: 10, temp: 80 },
  };
  const SECTION_ROLE = { network: 'administrator', db: 'administrator', backup: 'administrator', reload: 'technician', thresholds: 'technician' };
  const INTERVALS = [0, 30, 60, 300, 900, 3600];
  const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));
  const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
  const VALIDATE = {
    reload(v) {
      const e = {};
      if (!int(v.defaultInterval, 0, 86400) || (v.defaultInterval > 0 && v.defaultInterval < 10)) e.defaultInterval = t('Use Disabled or 10–86400 seconds.');
      if (!int(v.timeoutS, 1, 120)) e.timeoutS = t('Timeout must be 1–120 seconds.');
      if (!int(v.retries, 0, 10)) e.retries = t('Retries must be 0–10.');
      if (!int(v.backoffS, 0, 300)) e.backoffS = t('Backoff must be 0–300 seconds.');
      if (['default', 'no-cache', 'force-refresh'].indexOf(v.cache) < 0) e.cache = t('Choose a supported cache policy.');
      if (!isTime(v.scheduleTime)) e.scheduleTime = t('Use a 24-hour time such as 06:00.');
      for (const k in v.perSource || {}) if (!int(v.perSource[k], 0, 86400) || (v.perSource[k] > 0 && v.perSource[k] < 10)) e.perSource = t('Per-source intervals must be Disabled or 10–86400 seconds.');
      return e;
    },
    thresholds(v) {
      const e = {};
      if (!int(v.cpu, 50, 100)) e.cpu = t('CPU threshold must be 50–100 %.');
      if (!int(v.mem, 50, 100)) e.mem = t('Memory threshold must be 50–100 %.');
      if (!int(v.diskFree, 1, 50)) e.diskFree = t('Free-space threshold must be 1–50 %.');
      if (!int(v.temp, 50, 105)) e.temp = t('Temperature threshold must be 50–105 °C.');
      return e;
    },
    backup(v) {
      const e = {};
      if (['off', 'daily', 'weekly'].indexOf(v.schedule) < 0) e.schedule = t('Choose Off, Daily or Weekly.');
      if (!isTime(v.time)) e.time = t('Use a 24-hour time such as 02:00.');
      if (!int(v.retention, 1, 30)) e.retention = t('Keep 1–30 backups.');
      if (!String(v.destination || '').trim()) e.destination = t('Enter a destination folder on the controller host.');
      return e;
    },
    db(v) {
      const e = {};
      if (['sqlite', 'postgresql'].indexOf(v.engine) < 0) e.engine = t('This build supports SQLite and PostgreSQL only.');
      if (!/^[A-Za-z0-9_]{1,63}$/.test(v.name || '')) e.name = t('Use 1–63 letters, digits or underscores.');
      if (!int(v.timeoutS, 1, 120)) e.timeoutS = t('Timeout must be 1–120 seconds.');
      if (!int(v.pool, 1, 100)) e.pool = t('Pool size must be 1–100 connections.');
      if (v.engine === 'postgresql') {
        if (!String(v.host || '').trim()) e.host = t('Enter the database host.');
        if (!int(v.port, 1, 65535)) e.port = t('Port must be 1–65535.');
        if (!String(v.user || '').trim()) e.user = t('Enter the connection account.');
        if (['disable', 'prefer', 'require', 'verify-full'].indexOf(v.tls) < 0) e.tls = t('Choose a TLS mode.');
      }
      return e;
    },
  };
  function readCfg() {
    const c = AW.store.get('ctl.config', null);
    if (c && c.data) { for (const k in CFG_DEFAULT) c.data[k] = Object.assign({}, CFG_DEFAULT[k], c.data[k]); return c; }
    return { version: 1, updatedAt: Date.now(), updatedBy: 'factory', data: clone(CFG_DEFAULT) };
  }
  function writeCfg(c, by) { c.version++; c.updatedAt = Date.now(); c.updatedBy = by || (AW.session ? AW.session.user : 'system'); AW.store.set('ctl.config', c); AW.bus.emit('config', c); return c; }
  svc.config = {
    DEFAULTS: CFG_DEFAULT, INTERVALS,
    get: () => clone(readCfg()),
    section: (name) => clone(readCfg().data[name]),
    validate: (section, values) => (VALIDATE[section] ? VALIDATE[section](values) : {}),
    async save(section, values, baseVersion) {
      AW.requireRole(SECTION_ROLE[section] || 'administrator', t('Changing {section} settings', { section }));
      svc.conn.require();
      await wait(350);
      const cur = readCfg();
      if (baseVersion != null && baseVersion !== cur.version) {
        throw new AppError('conflict', t('These settings were changed by {who} at {time} after you opened them. Reload to see the newer configuration; your edits were not saved.', { who: cur.updatedBy, time: AW.fmtTime(cur.updatedAt) }), { current: cur.version });
      }
      const errors = this.validate(section, values);
      if (Object.keys(errors).length) throw new AppError('invalid', Object.values(errors)[0], { fields: errors });
      AW.store.set('ctl.configPrev', clone(cur));      // kept for recovery
      const before = clone(cur.data[section]);
      cur.data[section] = clone(values);
      writeCfg(cur);
      AW.audit('config.' + section + '_saved', { before, after: values });
      AW.log('info', 'config', 'Settings saved: ' + section, { version: cur.version });
      return clone(cur);
    },
    // Developer tool: pretend another session saved first.
    simulateConcurrentEdit() { const c = readCfg(); c.data.thresholds.cpu = c.data.thresholds.cpu === 85 ? 90 : 85; writeCfg(c, 'another session'); return c.version; },
    hasPrevious: () => !!AW.store.get('ctl.configPrev', null),
    async restorePrevious() {
      AW.requireRole('administrator', t('Restoring the previous configuration'));
      const prev = AW.store.get('ctl.configPrev', null); if (!prev) throw new AppError('invalid', t('There is no previous configuration to restore.'));
      const cur = readCfg(); AW.store.set('ctl.configPrev', clone(cur));
      cur.data = prev.data; writeCfg(cur);
      AW.audit('config.previous_restored', {});
      return clone(cur);
    },
    // Versioned export. Secrets are never part of it.
    export() {
      AW.requireRole('technician', t('Exporting configuration')); svc.license.require('config.transfer');
      const c = readCfg();
      AW.audit('config.exported', { version: c.version });
      return { format: 'aegiswall-config/1', product: AW.PRODUCT, exportedAt: new Date().toISOString(), sourceHost: svc.host.name, sourceVersion: c.version, secretsIncluded: false, controller: AW.redact(c.data), hardware: { wallName: svc.outputs.wallName(), mapping: svc.outputs.mapping() } };
    },
    // Validates a file and returns the list of differences without changing anything.
    previewImport(text) {
      svc.license.require('config.transfer');
      let obj; try { obj = JSON.parse(text); } catch (_) { throw new AppError('invalid', t('The file is not valid JSON.')); }
      if (!obj || obj.format !== 'aegiswall-config/1' || !obj.controller) throw new AppError('invalid', t('This is not an AegisWall configuration file (format aegiswall-config/1).'));
      const cur = readCfg().data, changes = [], problems = [];
      for (const section in CFG_DEFAULT) {
        const inc = obj.controller[section]; if (!inc) continue;
        const merged = Object.assign({}, CFG_DEFAULT[section], inc);
        const errs = section === 'network' ? {} : this.validate(section, merged);
        for (const f in errs) problems.push(section + '.' + f + ': ' + errs[f]);
        for (const key in merged) if (JSON.stringify(merged[key]) !== JSON.stringify(cur[section][key])) changes.push({ section, key, from: cur[section][key], to: merged[key] });
      }
      if (obj.hardware && obj.hardware.wallName && obj.hardware.wallName !== svc.outputs.wallName()) changes.push({ section: 'hardware', key: 'wallName', from: svc.outputs.wallName(), to: obj.hardware.wallName });
      return { obj, changes, problems, exportedAt: obj.exportedAt, sourceHost: obj.sourceHost };
    },
    async applyImport(preview) {
      AW.requireRole('administrator', t('Importing configuration')); svc.license.require('config.transfer'); svc.conn.require();
      if (preview.problems.length) throw new AppError('invalid', t('The file has invalid values and was not imported.'));
      await wait(500);
      const cur = readCfg(); AW.store.set('ctl.configPrev', clone(cur));
      for (const section in CFG_DEFAULT) if (preview.obj.controller[section]) cur.data[section] = Object.assign({}, CFG_DEFAULT[section], cur.data[section], preview.obj.controller[section]);
      writeCfg(cur);
      if (preview.obj.hardware && preview.obj.hardware.wallName) { AW.store.set('hw.wallName', preview.obj.hardware.wallName); AW.bus.emit('mapping', null); }
      AW.audit('config.imported', { changes: preview.changes.length, sourceHost: preview.sourceHost });
      return clone(cur);
    },
  };

  // =====================================================================================
  // Network listener (HTTP/HTTPS). A checkbox cannot provision TLS: the backend validates and loads certificates.
  // =====================================================================================
  const CERTS = [
    { id: 'cert-ok', subject: 'aegis-ctrl-01.local', san: ['aegis-ctrl-01.local', 'aegis-ctrl-01', '192.168.10.20'], issuer: 'Site CA (demo)', notAfter: Date.now() + 300 * DAY, keyMatch: true },
    { id: 'cert-expired', subject: 'aegis-ctrl-01.local', san: ['aegis-ctrl-01.local'], issuer: 'Site CA (demo)', notAfter: Date.now() - 20 * DAY, keyMatch: true },
    { id: 'cert-wronghost', subject: 'videowall.example.org', san: ['videowall.example.org'], issuer: 'Site CA (demo)', notAfter: Date.now() + 200 * DAY, keyMatch: true },
    { id: 'cert-keymismatch', subject: 'aegis-ctrl-01.local', san: ['aegis-ctrl-01.local'], issuer: 'Site CA (demo)', notAfter: Date.now() + 200 * DAY, keyMatch: false },
  ];
  const PORTS_IN_USE = { 3389: 'Remote Desktop', 5432: 'PostgreSQL', 445: 'SMB', 9000: 'Plot Control (reference)' };
  const BIND_OK = ['0.0.0.0', '127.0.0.1', '192.168.10.20'];
  svc.net = {
    certs: () => CERTS.map((c) => ({ id: c.id, subject: c.subject, san: c.san.slice(), issuer: c.issuer, notAfter: c.notAfter })),   // metadata only; private keys never leave the host
    bindAddresses: () => BIND_OK.slice(),
    urls(n) {
      const host = n.hostname || svc.host.address, out = [];
      if (n.mode === 'http') out.push('http://' + host + (n.httpPort === 80 ? '' : ':' + n.httpPort));
      else { out.push('https://' + host + (n.httpsPort === 443 ? '' : ':' + n.httpsPort)); if (n.mode === 'https+redirect') out.push('http://' + host + (n.httpPort === 80 ? '' : ':' + n.httpPort) + '  → ' + t('redirects to HTTPS')); }
      return out;
    },
    async test(n) {
      AW.requireRole('administrator', t('Testing the listener configuration')); svc.conn.require();
      await wait(700);
      const checks = [], add = (label, ok, detail) => checks.push({ label, ok, detail });
      const https = n.mode !== 'http', usesHttp = n.mode !== 'https';
      const portOk = (p) => Number.isInteger(p) && p >= 1 && p <= 65535;
      const ports = [];
      if (usesHttp) ports.push(['HTTP', n.httpPort]); if (https) ports.push(['HTTPS', n.httpsPort]);
      for (const [name, p] of ports) {
        add(t('{name} port range', { name }), portOk(p), portOk(p) ? String(p) : t('{p} is not a valid port (1–65535).', { p }));
        if (portOk(p)) {
          add(t('{name} port availability', { name }), !PORTS_IN_USE[p], PORTS_IN_USE[p] ? t('Port {p} is in use by {svc}.', { p, svc: PORTS_IN_USE[p] }) : t('Port {p} is free on {host}.', { p, host: svc.host.name }));
          add(t('{name} service privileges', { name }), p >= 1024, p >= 1024 ? t('No elevated privileges needed.') : t('Ports below 1024 need elevated privileges; the AegisWall service account does not have them.'));
        }
      }
      if (usesHttp && https && n.httpPort === n.httpsPort) add(t('Distinct ports'), false, t('HTTP and HTTPS cannot share port {p}.', { p: n.httpPort }));
      add(t('Bind address'), BIND_OK.indexOf(n.bind) >= 0, BIND_OK.indexOf(n.bind) >= 0 ? n.bind : t('{a} is not an address of this host.', { a: n.bind }));
      const hostOk = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(n.hostname || '');
      add(t('Public hostname'), hostOk, hostOk ? n.hostname : t('Enter a valid DNS name.'));
      if (https) {
        const c = CERTS.find((x) => x.id === n.certId);
        add(t('Certificate selected'), !!c, c ? c.subject : t('HTTPS needs a certificate from the controller\'s certificate store.'));
        if (c) {
          add(t('Certificate and private key match'), c.keyMatch, c.keyMatch ? t('Key pair verified on the host.') : t('The private key does not belong to this certificate.'));
          add(t('Hostname coverage'), c.san.indexOf(n.hostname) >= 0, c.san.indexOf(n.hostname) >= 0 ? t('{h} is listed in the certificate.', { h: n.hostname }) : t('The certificate covers {san}, not {h}.', { san: c.san.join(', '), h: n.hostname }));
          add(t('Certificate validity'), c.notAfter > Date.now(), c.notAfter > Date.now() ? t('Valid until {d}.', { d: AW.fmtDate(c.notAfter) }) : t('Expired on {d}.', { d: AW.fmtDate(c.notAfter) }));
        }
      }
      const ok = checks.every((c) => c.ok);
      AW.log(ok ? 'info' : 'warn', 'network', 'Listener configuration test ' + (ok ? 'passed' : 'failed'), { mode: n.mode });
      return { ok, checks };
    },
    // Applies a tested configuration, restarts the listener and proves the new endpoint answers; otherwise rolls back.
    async apply(n, baseVersion, onPhase) {
      AW.requireRole('administrator', t('Changing the network listener')); svc.conn.require();
      const cur = readCfg();
      if (baseVersion != null && baseVersion !== cur.version) throw new AppError('conflict', t('The configuration changed after you opened it. Reload and try again.'));
      const res = await this.test(n);
      if (!res.ok) throw new AppError('invalid', t('The configuration did not pass validation. Nothing was changed.'), { checks: res.checks });
      const prev = clone(cur.data.network);
      const phase = (p, detail) => { if (onPhase) onPhase(p, detail); };
      phase('saving'); await wait(400);
      AW.store.set('ctl.configPrev', clone(cur)); cur.data.network = clone(n); writeCfg(cur);
      phase('restarting'); svc.conn.set('reconnecting', t('Listener restarting on the new endpoint')); await wait(900);
      for (let i = 1; i <= 3; i++) {
        phase('probing', t('Attempt {i} of 3 — {url}', { i, url: this.urls(n)[0] })); await wait(800);
        if (!AW.demo.endpointUnreachable) {
          svc.conn.set('online'); phase('connected', this.urls(n)[0]);
          AW.audit('network.listener_changed', { before: prev, after: n });
          return { ok: true, url: this.urls(n)[0] };
        }
      }
      // Recovery: the previous listener configuration is put back and proven reachable.
      phase('rollback', t('The new endpoint did not answer. Restoring the previous listener.')); await wait(900);
      const c2 = readCfg(); c2.data.network = prev; writeCfg(c2, 'automatic rollback');
      svc.conn.set('online'); phase('recovered', this.urls(prev)[0]);
      AW.log('error', 'network', 'New endpoint unreachable; rolled back to the previous listener', {});
      AW.audit('network.listener_rollback', { attempted: n });
      throw new AppError('rolled_back', t('The new endpoint could not be reached, so the previous configuration was restored. You are still connected on {url}.', { url: this.urls(prev)[0] }));
    },
  };

  // =====================================================================================
  // Database
  // =====================================================================================
  const dbSig = (p) => [p.engine, p.host, p.port, p.name, p.user, p.tls].join('|');
  let lastDbTest = null;
  const backups = () => AW.store.get('db.backups', []);
  function snapshotData() {
    return {
      layouts: AW.store.get('layouts', []), audioPresets: AW.store.get('audio.presets', []), audioConfirmed: AW.store.get('audio.confirmed', null),
      hardware: { wallName: svc.outputs.wallName(), mapping: svc.outputs.mapping() }, confirmedWall: AW.store.get('wall.confirmed', null),
      controllerConfig: AW.redact(readCfg().data), issuedLicenses: svc.license.list().length,
    };
  }
  svc.db = {
    SCHEMA: 12,
    status() { const c = readCfg().data.db, list = backups(); return { engine: c.engine, connected: svc.conn.state === 'online', schemaVersion: this.SCHEMA, lastBackupAt: list.length ? list[list.length - 1].createdAt : null, hasPassword: !!AW.store.get('ctl.secrets', {}).dbPassword }; },
    signature: dbSig,
    tested: (p) => !!lastDbTest && lastDbTest === dbSig(p),
    async test(p, password) {
      AW.requireRole('administrator', t('Testing a database connection')); svc.conn.require();
      const errors = VALIDATE.db(p);
      if (Object.keys(errors).length) throw new AppError('invalid', Object.values(errors)[0], { fields: errors });
      await wait(900);
      let ok = true, detail = '';
      if (p.engine === 'sqlite') detail = t('Embedded database file opened read/write. Schema version {v}.', { v: this.SCHEMA });
      else if (/invalid|unknown|nxdomain/i.test(p.host)) { ok = false; detail = t('Host "{h}" could not be resolved.', { h: p.host }); }
      else if (p.port !== 5432) { ok = false; detail = t('Connection refused on {h}:{p}.', { h: p.host, p: p.port }); }
      else if (!password && !this.status().hasPassword) { ok = false; detail = t('Authentication failed: no password is stored for this account.'); }
      else if (p.tls === 'verify-full' && !/\./.test(p.host)) { ok = false; detail = t('TLS verification failed: the server certificate does not cover "{h}".', { h: p.host }); }
      else detail = t('Connected in {ms} ms as {u}. Server schema version {v}.', { ms: 42, u: p.user, v: this.SCHEMA });
      lastDbTest = ok ? dbSig(p) : null;
      AW.log(ok ? 'info' : 'warn', 'database', 'Connection test ' + (ok ? 'succeeded' : 'failed') + ' (' + p.engine + ')', { host: p.host });
      const cur = readCfg().data.db;
      return { ok, detail, migration: ok && cur.engine !== p.engine };
    },
    async save(p, password, baseVersion) {
      AW.requireRole('administrator', t('Changing the database connection'));
      const cur = readCfg().data.db;
      const connectionChanged = dbSig(cur) !== dbSig(p);
      if (connectionChanged && !this.tested(p)) throw new AppError('untested', t('Test the proposed connection successfully before saving. The last working connection stays active until then.'));
      const out = await svc.config.save('db', p, baseVersion);
      if (password) { const s = AW.store.get('ctl.secrets', {}); s.dbPassword = 'stored-server-side'; AW.store.set('ctl.secrets', s); }   // the demo never keeps the real value
      return out;
    },
    backups: () => backups().map((b) => ({ id: b.id, createdAt: b.createdAt, sizeBytes: b.sizeBytes, reason: b.reason, schema: b.schema })),
    backupText(id) { const b = backups().find((x) => x.id === id); return b ? b.text : null; },
    async backupNow(reason) {
      if (reason !== 'scheduled') AW.requireRole('technician', t('Creating a backup'));
      svc.conn.require(); await wait(reason === 'scheduled' ? 0 : 800);
      const body = { format: 'aegiswall-backup/1', product: AW.PRODUCT, createdAt: new Date().toISOString(), host: svc.host.name, schema: this.SCHEMA, reason: reason || 'manual', demo: true, data: snapshotData() };
      const text = JSON.stringify(body, null, 2);
      const entry = { id: AW.uid('bak'), createdAt: Date.now(), sizeBytes: text.length, reason: body.reason, schema: this.SCHEMA, text };
      const keep = readCfg().data.backup.retention;
      const list = backups(); list.push(entry);
      AW.store.set('db.backups', list.slice(-keep));     // retention
      AW.audit('database.backup_created', { id: entry.id, reason: body.reason });
      AW.log('info', 'database', 'Backup created (' + body.reason + ')', { id: entry.id, bytes: text.length });
      AW.bus.emit('backups', null);
      return { meta: entry, text };
    },
    parseBackup(text) {
      let obj; try { obj = JSON.parse(text); } catch (_) { throw new AppError('invalid', t('The file is not valid JSON.')); }
      if (!obj || obj.format !== 'aegiswall-backup/1' || !obj.data) throw new AppError('invalid', t('This is not an AegisWall backup (format aegiswall-backup/1).'));
      if (obj.schema > this.SCHEMA) throw new AppError('invalid', t('This backup uses schema {a}, newer than this installation ({b}).', { a: obj.schema, b: this.SCHEMA }));
      return obj;
    },
    // Replaces application data with a backup. A safety backup of the current data is always taken first.
    async restore(text, onPhase) {
      AW.requireRole('administrator', t('Restoring a backup')); svc.conn.require();
      const obj = this.parseBackup(text), d = obj.data;
      const phase = (p) => onPhase && onPhase(p);
      phase('safety'); const safety = await this.backupNow('pre-restore');
      phase('stopping'); svc.conn.set('restarting', t('Database restore in progress')); await wait(900);
      phase('restoring'); await wait(900);
      AW.store.set('layouts', d.layouts || []); AW.store.set('audio.presets', d.audioPresets || []);
      if (d.audioConfirmed) AW.store.set('audio.confirmed', d.audioConfirmed);
      if (d.hardware) { AW.store.set('hw.wallName', d.hardware.wallName); AW.store.set('hw.mapping', d.hardware.mapping); }
      if (d.confirmedWall) { AW.store.set('wall.confirmed', d.confirmedWall); AW.wall.S.confirmed = clone(d.confirmedWall.composition); AW.wall.S.confirmedAt = d.confirmedWall.confirmedAt; }
      phase('starting'); await wait(700); svc.conn.set('online');
      AW.audit('database.restored', { from: obj.createdAt, safetyBackup: safety.meta.id });
      AW.log('warn', 'database', 'Database restored from backup', { from: obj.createdAt });
      ['layouts', 'mapping', 'audio', 'backups'].forEach((e) => AW.bus.emit(e, null)); AW.bus.emit('wall', { reason: 'restored' });
      return { safetyId: safety.meta.id, from: obj.createdAt };
    },
  };

  // =====================================================================================
  // Content reload (separate from UI refresh, telemetry polling, preview updates and service restart)
  // =====================================================================================
  const reloadState = {};    // sourceId -> {lastAt, status, busy, message}
  const reloadable = (s) => s && (s.type === 'web' || s.type === 'youtube');
  svc.reload = {
    sources() { const seen = new Set(), out = []; for (const it of AW.wall.S.confirmed.items) { const s = svc.sources.get(it.sourceId); if (reloadable(s) && !seen.has(s.id)) { seen.add(s.id); out.push(s); } } return out; },
    effective(sourceId) { const r = readCfg().data.reload, v = r.perSource[sourceId]; return v == null ? r.defaultInterval : v; },
    state: (id) => reloadState[id] || { lastAt: null, status: 'never', busy: false },
    // One reload at a time per source. A second request while busy is refused, never queued.
    async now(sourceId, cause) {
      const s = svc.sources.get(sourceId);
      if (!reloadable(s)) throw new AppError('invalid', t('This source type does not support reload.'));
      if (cause === 'manual') { AW.requireRole('operator', t('Reloading content')); svc.conn.require(); }
      const st = (reloadState[sourceId] = reloadState[sourceId] || { lastAt: null, status: 'never', busy: false });
      if (st.busy) throw new AppError('busy', t('A reload is already running for {name}.', { name: s.name }));
      const r = readCfg().data.reload;
      st.busy = true; AW.compositor.reloading.add(sourceId); AW.bus.emit('reload', { sourceId, phase: 'start' });
      try {
        await wait(1300);
        if (!s.available) throw new AppError('timeout', t('{name} did not answer within {s} s after {n} retries.', { name: s.name, s: r.timeoutS, n: r.retries }));
        st.status = 'ok'; st.message = '';
        AW.log('info', 'reload', 'Content reloaded: ' + s.name, { cause: cause || 'interval', cache: r.cache });
      } catch (e) { st.status = 'failed'; st.message = e.message; AW.log('warn', 'reload', 'Reload failed: ' + s.name, { cause }); throw e; }
      finally { st.busy = false; st.lastAt = Date.now(); AW.compositor.reloading.delete(sourceId); AW.bus.emit('reload', { sourceId, phase: 'done' }); }
      return st;
    },
    tick() {
      if (svc.conn.state !== 'online' || !AW.wall.S.confirmed) return;
      const r = readCfg().data.reload, now = Date.now();
      const d = new Date(), hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), today = d.toDateString();
      const scheduled = r.scheduleEnabled && hhmm === r.scheduleTime && this._schedDay !== today;
      if (scheduled) this._schedDay = today;
      for (const s of this.sources()) {
        const st = this.state(s.id), iv = this.effective(s.id);
        if (st.busy) continue;
        if (scheduled || (iv > 0 && now - (st.lastAt || this._started) >= iv * 1000)) this.now(s.id, scheduled ? 'schedule' : 'interval').catch(() => {});
      }
    },
    _started: Date.now(),
  };

  // =====================================================================================
  // Telemetry of the CONTROLLER HOST (not this browser). Deterministic demo values.
  // =====================================================================================
  const bootAt = () => { let v = AW.store.get('host.bootAt', null); if (!v) { v = Date.now() - (6 * DAY + 4 * 3600000); AW.store.set('host.bootAt', v); } return v; };
  const svcStartAt = () => { let v = AW.store.get('host.svcStartAt', null); if (!v) { v = Date.now() - 2 * DAY; AW.store.set('host.svcStartAt', v); } return v; };
  const wave = (ts, base, amp, period, phase) => base + amp * Math.sin(ts / period + phase) + amp * 0.35 * Math.sin(ts / (period * 0.37) + phase * 2.1);
  let lastSample = null, lastDiag = null;
  const history = [];
  svc.telemetry = {
    paused: false,
    last: () => lastSample,
    history: () => history,
    browser() {   // real values of the operator's machine, clearly separate from the controller host
      const n = navigator;
      return { userAgent: n.userAgent, platform: n.platform || null, cores: n.hardwareConcurrency || null, memoryGB: n.deviceMemory || null, language: n.language, screen: screen.width + ' × ' + screen.height, pixelRatio: window.devicePixelRatio || 1, online: n.onLine };
    },
    async sample() {
      if (svc.conn.state !== 'online') throw new AppError('offline', t('Telemetry unavailable: the controller is {state}.', { state: t(svc.conn.state) }));
      await wait(120);
      const ts = Date.now(), r1 = (v) => Math.round(v * 10) / 10;
      const perCore = Array.from({ length: 8 }, (_, i) => AW.clamp(Math.round(wave(ts, 24 + i * 3, 14, 9000 + i * 1700, i)), 1, 99));
      const cpuTotal = Math.round(perCore.reduce((a, b) => a + b, 0) / perCore.length);
      const memUsed = r1(wave(ts, 13.6, 1.1, 61000, 0.6)), installed = 32;
      const outputs = svc.outputs.list(), mapping = svc.outputs.mapping();
      const tileOf = (id) => { for (const k in mapping) if (mapping[k].output === id) return AW.wall.tileName(k); return null; };
      const srcAll = AW.wall.S.confirmed ? AW.wall.S.confirmed.items.map((i) => svc.sources.get(i.sourceId)).filter(Boolean) : [];
      const audioDevs = svc.audio.devices();
      const s = {
        ts, demo: true, source: 'Demo telemetry agent (simulated values)',
        host: { name: svc.host.name, role: svc.host.role, address: svc.host.address },
        cpu: { model: 'Intel Xeon W-2245 (8C/16T)', cores: 8, threads: 16, total: cpuTotal, perCore, freqMHz: Math.round(wave(ts, 3900, 260, 14000, 1)), tempC: Math.round(wave(ts, 58, 6, 30000, 2)) },
        mem: { installedGB: installed, usedGB: memUsed, availableGB: r1(installed - memUsed), pct: Math.round((memUsed / installed) * 100), pressure: null },
        storage: [
          { vol: 'C:', label: 'System', fs: 'NTFS', capacityGB: 476, freeGB: r1(wave(ts, 212, 0.4, 500000, 0)), readMBs: r1(Math.max(0, wave(ts, 4, 3, 7000, 0))), writeMBs: r1(Math.max(0, wave(ts, 2.4, 2, 5200, 1))), health: 'OK (SMART)' },
          { vol: 'D:', label: 'Media & backups', fs: 'NTFS', capacityGB: 1863, freeGB: r1(wave(ts, 141, 0.6, 400000, 1)), readMBs: r1(Math.max(0, wave(ts, 18, 12, 6100, 2))), writeMBs: r1(Math.max(0, wave(ts, 6, 5, 4300, 3))), health: null },
        ],
        os: {
          hostname: svc.host.name, os: 'Windows 11 IoT Enterprise LTSC', build: '26100.2314', appVersion: AW.VERSION, agentVersion: 'demo-agent 0.9.3',
          uptimeS: Math.round((ts - bootAt()) / 1000), bootAt: bootAt(),
          services: [
            { name: 'AegisWall Application Service', state: 'Running', lastRestart: svcStartAt() },
            { name: 'AegisWall Telemetry Agent', state: 'Running', lastRestart: bootAt() },
            { name: 'AllService connector', state: 'Not configured', lastRestart: null },
            { name: 'Plot Control connector', state: 'Not configured', lastRestart: null },
          ],
          timeSync: { source: 'time.windows.com', offsetMs: Math.round(wave(ts, 12, 9, 80000, 0)), state: 'Synchronized' },
        },
        gpus: [0, 1, 2].map((g) => ({
          name: 'NVIDIA RTX A4000 #' + g, driver: '553.62', driverDate: '2025-03-11', vramMB: 16384, vramUsedMB: Math.round(wave(ts, 5200 + g * 400, 300, 40000, g)), util: AW.clamp(Math.round(wave(ts, 31 + g * 4, 12, 11000, g)), 0, 100), tempC: g === 1 ? null : Math.round(wave(ts, 61, 5, 26000, g)),
          outputs: outputs.filter((o) => o.adapter === 'GPU ' + g).map((o) => ({ id: o.id, tile: tileOf(o.id), res: o.width + ' × ' + o.height, hz: o.hz, signal: o.connected ? 'Active' : 'No signal' })),
        })),
        capture: [{ model: 'Magewell Pro Capture Quad HDMI', driver: '1.3.0.4410', inputs: [
          { id: 'HDMI In 1', format: '1080p59.94 YUV 4:2:2', res: '1920 × 1080', fps: 59.94, lock: true, dropped: Math.floor((ts - bootAt()) / 3.1e7), audio: 'Embedded 2ch 48 kHz' },
          { id: 'HDMI In 2', format: '1080p50 YUV 4:2:2', res: '1920 × 1080', fps: 50, lock: true, dropped: 0, audio: 'Embedded 2ch 48 kHz' },
          { id: 'HDMI In 3', format: null, res: null, fps: null, lock: false, dropped: null, audio: null },
          { id: 'HDMI In 4', format: null, res: null, fps: null, lock: false, dropped: null, audio: null },
        ] }],
        drivers: [
          { device: 'NVIDIA RTX A4000 (×3)', vendor: 'NVIDIA', version: '553.62', date: '2025-03-11', cls: 'Display', error: null },
          { device: 'Magewell Pro Capture Quad HDMI', vendor: 'Magewell', version: '1.3.0.4410', date: '2024-11-02', cls: 'Capture', error: null },
          { device: 'Intel I210 Gigabit Network', vendor: 'Intel', version: '14.0.7.0', date: '2024-06-18', cls: 'Network', error: null },
          { device: 'Intel X550 10GbE', vendor: 'Intel', version: '4.1.254.0', date: '2024-08-29', cls: 'Network', error: null },
          { device: 'USB Audio Device (speakerphone)', vendor: 'Generic', version: '10.0.26100.1', date: '2024-04-01', cls: 'Audio', error: AW.demo.unplugUsbAudio ? 'Code 45: device not connected' : null },
          { device: 'High Definition Audio (HDMI/DP)', vendor: 'NVIDIA', version: '1.4.2.6', date: '2025-01-20', cls: 'Audio', error: null },
        ],
        net: [
          { name: 'LAN 1 (Intel I210)', link: 'Up', speed: '1 Gbps', ip: svc.host.address, mask: '255.255.255.0', gateway: '192.168.10.1', dns: ['192.168.10.2', '192.168.10.3'], rxKbps: Math.round(Math.max(0, wave(ts, 5200, 2600, 8000, 0))), txKbps: Math.round(Math.max(0, wave(ts, 840, 500, 6000, 1))) },
          { name: 'Video LAN (Intel X550)', link: 'Up', speed: '10 Gbps', ip: '10.20.0.5', mask: '255.255.0.0', gateway: null, dns: [], rxKbps: Math.round(Math.max(0, wave(ts, 182000, 40000, 9000, 2))), txKbps: Math.round(Math.max(0, wave(ts, 2100, 900, 7000, 3))) },
          { name: 'LAN 2 (Intel I210)', link: 'Down', speed: null, ip: null, mask: null, gateway: null, dns: [], rxKbps: null, txKbps: null },
        ],
        checks: [
          { endpoint: 'Gateway 192.168.10.1', ok: true, ms: Math.round(wave(ts, 1.2, 0.4, 5000, 0) * 10) / 10 },
          { endpoint: 'Camera VLAN 10.20.0.1', ok: true, ms: Math.round(wave(ts, 0.8, 0.3, 4000, 1) * 10) / 10 },
          { endpoint: 'License service', ok: !AW.demo.licenseOffline, ms: AW.demo.licenseOffline ? null : 38 },
        ],
        app: {
          servicesOk: true, dbOk: true, sourcesOnline: srcAll.filter((x) => x.available).length, sourcesTotal: srcAll.length,
          outputsDetected: outputs.filter((o) => o.connected).length, outputsTotal: outputs.length,
          audioMissing: audioDevs.filter((d) => !d.available).length,
          recentErrors: AW.logs.all().filter((e) => e.level === 'error' && e.ts > ts - 3600000).length,
        },
      };
      lastSample = s;
      history.push({ ts, cpu: cpuTotal, mem: s.mem.pct, temp: s.cpu.tempC }); if (history.length > 120) history.shift();
      AW.bus.emit('health', s);
      return s;
    },
    alerts() {
      const s = lastSample; if (!s) return [];
      const th = readCfg().data.thresholds, out = [];
      if (s.cpu.total >= th.cpu) out.push({ level: 'warn', text: t('CPU utilization {v}% is at or above the {t}% threshold.', { v: s.cpu.total, t: th.cpu }) });
      if (s.mem.pct >= th.mem) out.push({ level: 'warn', text: t('Memory utilization {v}% is at or above the {t}% threshold.', { v: s.mem.pct, t: th.mem }) });
      if (s.cpu.tempC >= th.temp) out.push({ level: 'warn', text: t('CPU temperature {v} °C is at or above the {t} °C threshold.', { v: s.cpu.tempC, t: th.temp }) });
      for (const v of s.storage) { const pct = Math.round((v.freeGB / v.capacityGB) * 100); if (pct <= th.diskFree) out.push({ level: 'warn', text: t('Volume {vol} has {p}% free space (threshold {t}%).', { vol: v.vol, p: pct, t: th.diskFree }) }); }
      if (s.app.outputsDetected < s.app.outputsTotal) out.push({ level: 'error', text: t('{n} graphics output(s) report no signal.', { n: s.app.outputsTotal - s.app.outputsDetected }) });
      if (s.app.sourcesOnline < s.app.sourcesTotal) out.push({ level: 'warn', text: t('{n} source(s) on the wall are unavailable.', { n: s.app.sourcesTotal - s.app.sourcesOnline }) });
      if (s.app.audioMissing) out.push({ level: 'warn', text: t('{n} audio device(s) are disconnected.', { n: s.app.audioMissing }) });
      for (const c of s.checks) if (!c.ok) out.push({ level: 'error', text: t('Connectivity check failed: {e}.', { e: c.endpoint }) });
      for (const d of s.drivers) if (d.error) out.push({ level: 'warn', text: t('Device error on {d}: {e}', { d: d.device, e: d.error }) });
      return out;
    },
    lastDiagnostics: () => lastDiag,
    async diagnostics(onStep) {
      AW.requireRole('technician', t('Running diagnostics')); svc.conn.require();
      const s = await this.sample(), th = readCfg().data.thresholds, res = [];
      const steps = [
        ['Controller reachability', () => ['pass', t('{h} answered in {ms} ms.', { h: s.host.name, ms: 3 })]],
        ['Application services', () => ['pass', t('{n} service(s) running; integrations not configured are skipped.', { n: s.os.services.filter((x) => x.state === 'Running').length })]],
        ['Graphics outputs vs mapping', () => (s.app.outputsDetected < s.app.outputsTotal ? ['fail', t('{n} mapped output(s) have no signal.', { n: s.app.outputsTotal - s.app.outputsDetected })] : ['pass', t('{n} outputs active.', { n: s.app.outputsTotal })])],
        ['Source connectivity', () => (s.app.sourcesOnline < s.app.sourcesTotal ? ['warn', t('{a} of {b} sources on the wall answer.', { a: s.app.sourcesOnline, b: s.app.sourcesTotal })] : ['pass', t('All {b} sources on the wall answer.', { b: s.app.sourcesTotal })])],
        ['Database connectivity', () => ['pass', t('{e} reachable, schema {v}.', { e: readCfg().data.db.engine, v: svc.db.SCHEMA })]],
        ['Disk space', () => { const low = s.storage.filter((v) => (v.freeGB / v.capacityGB) * 100 <= th.diskFree); return low.length ? ['warn', t('Low free space on {v}.', { v: low.map((x) => x.vol).join(', ') })] : ['pass', t('All volumes above {t}% free.', { t: th.diskFree })]; }],
        ['Time synchronization', () => ['pass', t('Offset {ms} ms against {src}.', { ms: s.os.timeSync.offsetMs, src: s.os.timeSync.source })]],
        ['Audio endpoints', () => (s.app.audioMissing ? ['warn', t('{n} mapped audio device(s) disconnected.', { n: s.app.audioMissing })] : ['pass', t('All audio endpoints present.')])],
      ];
      for (let i = 0; i < steps.length; i++) {
        if (onStep) onStep(i, steps.length, steps[i][0]);
        await wait(380);
        const [status, detail] = steps[i][1](); res.push({ name: steps[i][0], status, detail });
      }
      lastDiag = { ts: Date.now(), results: res };
      AW.audit('maintenance.diagnostics_run', { fail: res.filter((r) => r.status === 'fail').length, warn: res.filter((r) => r.status === 'warn').length });
      return lastDiag;
    },
    // Diagnostic report: telemetry, alerts, relevant configuration and recent logs, with secrets redacted.
    report() {
      AW.requireRole('technician', t('Exporting a diagnostic report'));
      const c = readCfg();
      AW.audit('maintenance.report_exported', {});
      return AW.redact({
        report: 'AegisWall diagnostic report', generatedAt: new Date().toISOString(), timezone: AW.tz(), generatedBy: AW.session.user,
        notice: 'DEMO — values are simulated by the demo telemetry agent and do not describe a real machine.',
        monitoredHost: svc.host, collectionSource: lastSample ? lastSample.source : null, sampleTimestamp: lastSample ? new Date(lastSample.ts).toISOString() : null,
        telemetry: lastSample, alerts: this.alerts(), diagnostics: lastDiag,
        configuration: { version: c.version, updatedAt: new Date(c.updatedAt).toISOString(), controller: c.data, databasePassword: svc.db.status().hasPassword ? 'set' : '', hardware: { wallName: svc.outputs.wallName(), mapping: svc.outputs.mapping() } },
        license: (() => { const st = svc.license.status(); return { state: st.state, edition: st.payload ? st.payload.edition : null }; })(),
        recentLogs: AW.logs.all().slice(-100), recentAudit: AW.logs.audit().slice(-50),
        operatorBrowser: this.browser(),
      });
    },
  };

  // =====================================================================================
  // Maintenance: restart the application service or reboot the controller host (never a browser reload)
  // =====================================================================================
  let downUntil = 0, maintBusy = false;
  svc.maint = {
    busy: () => maintBusy,
    // Health probe used while reconnecting. It answers only when the (simulated) host is really back.
    async ping() { await wait(250); return Date.now() >= downUntil && !AW.demo.maintNoReturn; },
    async restart(kind, onPhase) {
      AW.requireRole('technician', kind === 'host' ? t('Rebooting the controller host') : t('Restarting the application service'));
      if (maintBusy) throw new AppError('busy', t('A maintenance action is already running.'));
      svc.conn.require();
      maintBusy = true;
      const phase = (p, detail) => { AW.bus.emit('maint', { kind, phase: p, detail }); if (onPhase) onPhase(p, detail); };
      const req = AW.requestId();
      try {
        phase('requested'); AW.log('warn', 'maintenance', (kind === 'host' ? 'Host reboot' : 'Service restart') + ' requested', { req, target: svc.host.name });
        await wait(900);
        if (AW.demo.maintNoAck) throw new AppError('no_ack', t('The controller did not acknowledge the request within the time limit. Nothing was executed.'));
        phase('acknowledged'); AW.audit(kind === 'host' ? 'maintenance.host_reboot' : 'maintenance.service_restart', { req, target: svc.host.name });
        await wait(600);
        phase('stopping'); svc.conn.set('restarting', kind === 'host' ? t('Controller host is rebooting') : t('Application service is restarting'));
        downUntil = Date.now() + (kind === 'host' ? 7000 : 3200);
        await wait(1200);
        svc.conn.set('offline', t('Waiting for {h} to come back', { h: svc.host.name })); phase('offline');
        const max = kind === 'host' ? 9 : 6;
        for (let i = 1; i <= max; i++) {
          svc.conn.set('reconnecting', t('Reconnection attempt {i} of {n}', { i, n: max })); phase('reconnecting', { attempt: i, max });
          await wait(900);
          if (await this.ping()) {
            AW.store.set('host.svcStartAt', Date.now()); if (kind === 'host') AW.store.set('host.bootAt', Date.now());
            svc.conn.set('online'); phase('online'); AW.log('info', 'maintenance', 'Controller back online', { req });
            return { ok: true };
          }
        }
        phase('failed');
        throw new AppError('no_return', t('{h} did not answer after {n} reconnection attempts. The outcome of the action is unknown; check the host directly.', { h: svc.host.name, n: max }));
      } catch (e) { AW.log('error', 'maintenance', 'Maintenance action failed: ' + e.message, { req }); throw e; }
      finally { maintBusy = false; }
    },
    async retryConnection() {
      svc.conn.set('reconnecting', t('Manual reconnection attempt'));
      if (await this.ping()) { AW.store.set('host.svcStartAt', Date.now()); svc.conn.set('online'); return true; }
      svc.conn.set('offline', t('Waiting for {h} to come back', { h: svc.host.name })); return false;
    },
  };

  // =====================================================================================
  // Audio
  // =====================================================================================
  const AUDIO_OUT = [
    { id: 'hdmi-1', name: 'HDMI/DP audio — GPU 0 (wall, row A)', kind: 'HDMI/DisplayPort', rates: [44100, 48000, 96000], maxCh: 8 },
    { id: 'hdmi-2', name: 'HDMI/DP audio — GPU 1 (wall, row B)', kind: 'HDMI/DisplayPort', rates: [44100, 48000, 96000], maxCh: 8 },
    { id: 'sys', name: 'System default (controller line-out)', kind: 'System', rates: [44100, 48000], maxCh: 2 },
    { id: 'usb-1', name: 'USB speakerphone', kind: 'USB', rates: [48000], maxCh: 2 },
    { id: 'cap-out', name: 'Capture card loop-out', kind: 'Capture device', rates: [48000], maxCh: 2 },
  ];
  const AUDIO_IN = [{ id: 'cap-in-1', name: 'Capture card HDMI In 1 (embedded)', kind: 'Capture device' }, { id: 'usb-mic', name: 'USB speakerphone microphone', kind: 'USB' }];
  const OUT_DEFAULT = { mode: 'stereo', swap: false, balance: 0, sampleRate: 48000, channels: 2, gainDb: 0, bufferMs: 40, syncMs: 0 };
  const SRC_DEFAULT = { enabled: false, mute: false, level: 70, output: 'hdmi-1' };
  const AUDIO_DEFAULT = { master: { volume: 55, mute: false }, policy: 'single', active: 'yt-1', sources: { 'yt-1': { enabled: true, mute: false, level: 70, output: 'hdmi-1' } }, outputs: {} };
  let testHandle = null;
  svc.audio = {
    OUT_DEFAULT, SRC_DEFAULT,
    devices() { const gone = (d) => AW.demo.unplugUsbAudio && d.kind === 'USB'; return AUDIO_OUT.map((d) => Object.assign({ dir: 'output', available: !gone(d) }, d)).concat(AUDIO_IN.map((d) => Object.assign({ dir: 'input', available: !gone(d) }, d))); },
    async refreshDevices() { svc.conn.require(); await wait(500); AW.log('info', 'audio', 'Audio device discovery completed', {}); return this.devices(); },
    device(id) { return this.devices().find((d) => d.id === id); },
    confirmed() { const c = AW.store.get('audio.confirmed', null); return c ? Object.assign(clone(AUDIO_DEFAULT), c) : clone(AUDIO_DEFAULT); },
    srcCfg: (cfg, id) => Object.assign({}, SRC_DEFAULT, cfg.sources[id]),
    outCfg: (cfg, id) => Object.assign({}, OUT_DEFAULT, cfg.outputs[id]),
    // Audio is keyed by SOURCE, so a source shown on several tiles still plays once.
    sourcesOnWall(comp) {
      const map = new Map();
      for (const it of comp.items) { const s = svc.sources.get(it.sourceId); if (!s || !s.audio) continue; const e = map.get(s.id) || { source: s, tiles: 0 }; e.tiles++; map.set(s.id, e); }
      return [...map.values()];
    },
    validate(cfg) {
      const problems = [];
      for (const id in cfg.outputs) {
        const o = cfg.outputs[id], d = AUDIO_OUT.find((x) => x.id === id); if (!d) continue;
        if (d.rates.indexOf(o.sampleRate) < 0) problems.push(t('{d} does not support {r} Hz.', { d: d.name, r: o.sampleRate }));
        if (o.channels > d.maxCh) problems.push(t('{d} supports at most {n} channels.', { d: d.name, n: d.maxCh }));
        if (o.gainDb < -24 || o.gainDb > 12) problems.push(t('Gain must be between −24 and +12 dB.'));
        if (o.bufferMs < 10 || o.bufferMs > 500) problems.push(t('Buffer must be between 10 and 500 ms.'));
        if (o.syncMs < -500 || o.syncMs > 500) problems.push(t('A/V offset must be between −500 and +500 ms.'));
      }
      return problems;
    },
    // Live routing changes are confirmed by the backend before they count as active.
    async apply(cfg) {
      AW.requireRole('operator', t('Applying audio changes')); svc.conn.require();
      const problems = this.validate(cfg);
      if (problems.length) throw new AppError('invalid', problems[0], { problems });
      await wait(700);
      AW.store.set('audio.confirmed', clone(cfg));
      AW.audit('audio.applied', { policy: cfg.policy, active: cfg.active });
      AW.log('info', 'audio', 'Audio configuration acknowledged (demo)', {});
      AW.bus.emit('audio', null);
      return { confirmedAt: Date.now(), ack: 'Demo acknowledgement' };
    },
    async setMasterMute(mute) {
      AW.requireRole('operator', t('Muting wall audio')); svc.conn.require();
      await wait(180);
      const c = this.confirmed(); c.master.mute = !!mute; AW.store.set('audio.confirmed', c);
      AW.log('info', 'audio', mute ? 'Master mute ON (demo ack)' : 'Master mute OFF (demo ack)', {});
      AW.bus.emit('audio', { masterMute: !!mute });
      return c.master.mute;
    },
    testState: () => (testHandle ? { deviceId: testHandle.deviceId, endsAt: testHandle.endsAt } : null),
    // Short test tone on one endpoint. Always stoppable. In demo nothing is sent to hardware.
    startTest(deviceId, level, seconds) {
      AW.requireRole('operator', t('Testing an audio output')); svc.conn.require();
      const d = this.device(deviceId);
      if (!d || d.dir !== 'output') throw new AppError('invalid', t('Choose an output device.'));
      if (!d.available) throw new AppError('unavailable', t('{d} is disconnected. The test was not started and no other device was used.', { d: d.name }));
      this.stopTest();
      const ms = AW.clamp(seconds || 3, 1, 10) * 1000;
      testHandle = { deviceId, endsAt: Date.now() + ms, timer: setTimeout(() => this.stopTest('finished'), ms) };
      AW.log('info', 'audio', 'Test tone started on ' + d.name, { level });
      AW.bus.emit('audio-test', { state: 'playing', deviceId, level, ms });
      return testHandle;
    },
    stopTest(reason) { if (!testHandle) return; clearTimeout(testHandle.timer); const id = testHandle.deviceId; testHandle = null; AW.bus.emit('audio-test', { state: 'stopped', deviceId: id, reason: reason || 'stopped' }); },
    // Demo signal levels (0..1). Deterministic, clearly not real telemetry.
    meters(cfg, sources, ts) {
      const out = {};
      for (const e of sources) {
        const sc = this.srcCfg(cfg, e.source.id), dev = this.device(sc.output);
        const audible = sc.enabled && !sc.mute && !cfg.master.mute && (cfg.policy === 'mix' || cfg.active === e.source.id) && dev && dev.available;
        const seed = e.source.id.charCodeAt(e.source.id.length - 1);
        const raw = 0.55 + 0.3 * Math.sin(ts / 310 + seed) + 0.16 * Math.sin(ts / 97 + seed * 3);
        const level = audible ? AW.clamp(raw * (sc.level / 70) * (cfg.master.volume / 60), 0, 1.05) : 0;
        out[e.source.id] = { level: Math.min(1, level), clip: level > 1, audible };
      }
      return out;
    },
    presets: {
      list: () => AW.store.get('audio.presets', []),
      save(name, cfg) { svc.license.require('audio.presets'); AW.requireRole('operator', t('Saving audio presets')); const list = this.list(), e = { id: AW.uid('ap'), name, savedAt: Date.now(), cfg: clone(cfg) }; list.push(e); AW.store.set('audio.presets', list); AW.audit('audio.preset_saved', { name }); AW.bus.emit('audio-presets', null); return e; },
      get(id) { svc.license.require('audio.presets'); const e = this.list().find((x) => x.id === id); return e ? clone(e.cfg) : null; },
      rename(id, name) { svc.license.require('audio.presets'); const list = this.list(), e = list.find((x) => x.id === id); if (e) { e.name = name; AW.store.set('audio.presets', list); AW.bus.emit('audio-presets', null); } },
      remove(id) { svc.license.require('audio.presets'); AW.store.set('audio.presets', this.list().filter((x) => x.id !== id)); AW.audit('audio.preset_deleted', { id }); AW.bus.emit('audio-presets', null); },
    },
  };

  // =====================================================================================
  // Technician console: an allowlist of diagnostic commands, bounded output and runtime, fully audited.
  // =====================================================================================
  const ENDPOINTS = { controller: svc.host.address, gateway: '192.168.10.1', 'camera-vlan': '10.20.0.1', 'license-service': 'licensing.demo.invalid' };
  const COMMANDS = [
    ['help', 'List the available diagnostic commands'],
    ['version', 'Application and agent versions'],
    ['service status', 'State of the controller services'],
    ['devices list', 'Graphics outputs, capture inputs and audio endpoints'],
    ['outputs list', 'Physical outputs and their wall mapping'],
    ['net check', 'Connectivity checks to the configured endpoints'],
    ['ping <endpoint>', 'Four probes to a configured endpoint: ' + Object.keys(ENDPOINTS).join(', ')],
    ['logs query <text>', 'Last 20 operational log entries containing <text>'],
  ];
  svc.console = {
    COMMANDS, target: () => svc.host.name,
    async run(line, o) {
      AW.requireRole('technician', t('Using the technician console')); svc.license.require('maint.console'); svc.conn.require();
      const cmd = String(line).trim().replace(/\s+/g, ' '), started = Date.now();
      let lines = 0, cancelled = false;
      const out = (stream, text) => { if (lines++ < 200) o.onLine(stream, text); else if (lines === 201) o.onLine('stderr', '[output truncated at 200 lines]'); };
      const pause = async (ms) => { const end = Date.now() + ms; while (Date.now() < end) { if (o.signal && o.signal.aborted) { cancelled = true; throw new AppError('cancelled', 'cancelled'); } if (Date.now() - started > 15000) throw new AppError('timeout', 'runtime limit of 15 s exceeded'); await wait(60); } };
      AW.audit('console.command', { command: cmd, target: svc.host.name });
      let exit = 0;
      try {
        await pause(200);
        const s = svc.telemetry.last() || (await svc.telemetry.sample());
        if (cmd === 'help') COMMANDS.forEach(([c, d]) => out('stdout', c.padEnd(20) + d));
        else if (cmd === 'version') { out('stdout', AW.PRODUCT + ' ' + AW.VERSION); out('stdout', 'agent      ' + s.os.agentVersion); out('stdout', 'os         ' + s.os.os + ' build ' + s.os.build); }
        else if (cmd === 'service status') s.os.services.forEach((x) => out(x.state === 'Running' ? 'stdout' : 'stderr', x.name.padEnd(34) + x.state));
        else if (cmd === 'outputs list') { const m = svc.outputs.mapping(); svc.outputs.list().forEach((x) => { let tile = '-'; for (const k in m) if (m[k].output === x.id) tile = AW.wall.tileName(k) + (m[k].confirmed ? ' (confirmed)' : ' (unconfirmed)'); out(x.connected ? 'stdout' : 'stderr', x.id.padEnd(10) + (x.connected ? 'connected  ' : 'NO SIGNAL  ') + (x.width + 'x' + x.height + '@' + x.hz).padEnd(16) + tile); }); }
        else if (cmd === 'devices list') {
          out('stdout', 'GRAPHICS'); s.gpus.forEach((g) => out('stdout', '  ' + g.name + '  driver ' + g.driver + '  outputs ' + g.outputs.length));
          out('stdout', 'CAPTURE'); s.capture.forEach((c) => c.inputs.forEach((i) => out('stdout', '  ' + c.model + ' / ' + i.id + '  ' + (i.lock ? i.format : 'no signal'))));
          out('stdout', 'AUDIO'); svc.audio.devices().forEach((d) => out(d.available ? 'stdout' : 'stderr', '  ' + d.dir.padEnd(7) + d.name + (d.available ? '' : '  [disconnected]')));
        } else if (cmd === 'net check') { for (const c of s.checks) { await pause(300); out(c.ok ? 'stdout' : 'stderr', c.endpoint.padEnd(26) + (c.ok ? 'ok  ' + c.ms + ' ms' : 'FAILED')); if (!c.ok) exit = 1; } }
        else if (cmd.startsWith('ping')) {
          const name = cmd.split(' ')[1];
          if (!name || !ENDPOINTS[name]) { out('stderr', 'ping: "' + (name || '') + '" is not a configured endpoint. Use: ' + Object.keys(ENDPOINTS).join(', ')); exit = 2; }
          else {
            const down = name === 'license-service' && AW.demo.licenseOffline;
            out('stdout', 'PING ' + name + ' (' + ENDPOINTS[name] + ') from ' + svc.host.name);
            let ok = 0;
            for (let i = 1; i <= 4; i++) { await pause(700); if (down) out('stderr', 'probe ' + i + ': request timed out'); else { ok++; out('stdout', 'probe ' + i + ': reply in ' + (1 + ((i * 7 + name.length) % 5) / 10).toFixed(1) + ' ms'); } }
            out(ok ? 'stdout' : 'stderr', '4 sent, ' + ok + ' received, ' + (100 - ok * 25) + '% loss'); if (!ok) exit = 1;
          }
        } else if (cmd.startsWith('logs query')) {
          const q = cmd.slice(10).trim().toLowerCase();
          if (!q) { out('stderr', 'logs query: missing <text>'); exit = 2; }
          else { const hits = AW.logs.all().filter((e) => (e.message + ' ' + e.service).toLowerCase().includes(q)).slice(-20); hits.forEach((e) => out('stdout', new Date(e.ts).toISOString() + ' ' + e.level.toUpperCase().padEnd(5) + ' ' + e.service.padEnd(12) + e.message)); out('stdout', hits.length + ' matching entr' + (hits.length === 1 ? 'y' : 'ies')); }
        } else if (/^(service (restart|stop)|reboot|shutdown)/.test(cmd)) { out('stderr', 'refused: disruptive operations are not run from the console. Use System & Maintenance, which asks for confirmation and tracks reconnection.'); exit = 13; }
        else { out('stderr', (cmd.split(' ')[0] || '(empty)') + ': not in the diagnostic allowlist. Type "help" for the available commands.'); exit = 127; }
      } catch (e) {
        if (e.code === 'cancelled') { out('stderr', '^C cancelled by operator'); exit = 130; }
        else if (e.code === 'timeout') { out('stderr', 'terminated: ' + e.message); exit = 124; }
        else throw e;
      }
      AW.log(exit ? 'warn' : 'info', 'console', 'Command "' + cmd + '" exited ' + exit, { target: svc.host.name });
      return { exit, ms: Date.now() - started, cancelled };
    },
  };

  // =====================================================================================
  // Background work while a session is open
  // =====================================================================================
  let timers = [];
  AW.ops = {
    start() {
      this.stop();
      const sample = () => { if (AW.session && !svc.telemetry.paused && svc.conn.state === 'online') svc.telemetry.sample().catch(() => {}); };
      sample();
      const arm = () => setInterval(sample, AW.prefs.telemetryInterval * 1000);
      let tele = arm();
      AW.bus.on('prefs', () => { clearInterval(tele); tele = arm(); timers[0] = tele; });
      timers = [tele,
        setInterval(() => { if (AW.session) svc.reload.tick(); }, 1000),
        setInterval(() => {   // scheduled backups
          if (!AW.session || svc.conn.state !== 'online') return;
          const b = readCfg().data.backup; if (b.schedule === 'off') return;
          const d = new Date(), hhmm = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'), key = d.toDateString();
          if (hhmm === b.time && AW.store.get('db.lastSched', '') !== key && (b.schedule === 'daily' || d.getDay() === 0)) { AW.store.set('db.lastSched', key); svc.db.backupNow('scheduled').catch(() => {}); }
        }, 20000)];
    },
    stop() { timers.forEach(clearInterval); timers = []; },
  };
  // A controller that is "offline" by demo switch behaves like a lost connection everywhere.
  AW.bus.on('demo', () => { if (AW.demo.controllerOffline && svc.conn.state === 'online') svc.conn.set('offline', t('Disconnected by the demo switch')); else if (!AW.demo.controllerOffline && svc.conn.state === 'offline' && !maintBusy && Date.now() >= downUntil) svc.conn.set('online'); AW.bus.emit('health', null); });
})();
