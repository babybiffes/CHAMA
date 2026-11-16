/* AegisWall — System & Maintenance workspace.
 * One System Information card with tabs (never every metric at once), a separate card for the operator's
 * own browser, editable alert thresholds, and the two maintenance actions with honest state tracking. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$, svc = AW.svc;
  const TABS = [['overview', 'Overview'], ['cpu', 'CPU'], ['mem', 'Memory'], ['storage', 'Storage'], ['os', 'OS & services'], ['gpu', 'Graphics cards'], ['capture', 'Capture cards'], ['drivers', 'Drivers'], ['net', 'Networks'], ['app', 'Application health']];
  const Y = (AW.systemUI = { visible: false, tab: 'overview', filter: '', busy: '', diagStep: '', error: '', histOpen: false, thDraft: null, thError: '', maint: null });
  let root, ageTimer = 0;
  const NA = (reason) => AW.ui.unavailable(reason || t('Not exposed by the telemetry agent'));
  const val = (v, unit, reason) => (v == null ? NA(reason) : esc(v) + (unit ? ' ' + unit : ''));
  const kv = (pairs) => '<dl class="kv">' + pairs.map(([k, v]) => '<div><dt>' + esc(t(k)) + '</dt><dd>' + v + '</dd></div>').join('') + '</dl>';
  const bar = (pct, warnAt) => '<div class="bar' + (pct >= (warnAt || 85) ? ' warn' : '') + '" role="img" aria-label="' + pct + '%"><i style="width:' + AW.clamp(pct, 0, 100) + '%"></i></div>';
  const dur = (s) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return (d ? d + ' d ' : '') + h + ' h ' + m + ' min'; };
  const match = (text) => !Y.filter || AW.norm(text).includes(AW.norm(Y.filter));
  const table = (heads, rows, empty) => rows.length ? '<div class="table-wrap"><table><thead><tr>' + heads.map((h) => '<th>' + esc(t(h)) + '</th>').join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' : '<p class="empty">' + esc(empty || t('Nothing matches "{q}".', { q: Y.filter })) + '</p>';
  const detailBtn = (kind, i) => '<button class="btn btn-small" type="button" data-detail="' + kind + ':' + i + '">' + esc(t('Details')) + '</button>';

  Y.build = function (el) {
    root = el;
    root.innerHTML = '<div class="page"><header class="page-head"><h1>' + esc(t('System & Maintenance')) + '</h1><p>' + esc(t('Health of the videowall controller host, diagnostics and maintenance. Technical detail lives here so the Wall view stays clean.')) + '</p></header>' +
      '<section class="card" id="sys-info" tabindex="-1"><div class="card-head"><h2>' + esc(t('System Information')) + '</h2>' + AW.ui.demo() + '<span class="grow"></span><span id="sys-fresh"></span></div>' +
      '<div class="sys-ident" id="sys-ident"></div>' +
      '<div class="sys-tools"><button class="btn btn-small" type="button" data-s="refresh">' + icon('refresh') + esc(t('Refresh')) + '</button>' +
      '<button class="btn btn-small" type="button" data-s="pause" aria-pressed="false"></button>' +
      '<label class="inline-field"><span>' + esc(t('Sampling interval')) + '</span><select id="sys-interval">' + [2, 5, 10, 30].map((n) => '<option value="' + n + '">' + n + ' s</option>').join('') + '</select></label>' +
      '<label class="search search-inline">' + icon('search') + '<input id="sys-filter" type="search" placeholder="' + esc(t('Filter devices and details')) + '" aria-label="' + esc(t('Filter devices and details')) + '" spellcheck="false"></label><span class="grow"></span>' +
      '<button class="btn btn-small" type="button" data-s="diag">' + icon('target') + esc(t('Run Diagnostics')) + '</button>' +
      '<button class="btn btn-small" type="button" data-s="export">' + icon('download') + esc(t('Export Diagnostic Report')) + '</button></div>' +
      '<div class="tabs" role="tablist" id="sys-tabs">' + TABS.map(([id, label]) => '<button type="button" role="tab" data-tab="' + id + '" aria-selected="false">' + esc(t(label)) + '</button>').join('') + '</div>' +
      '<div class="card-body" id="sys-body" role="tabpanel"></div>' +
      '<details id="sys-hist"><summary class="card-head"><h2>' + esc(t('Historical charts')) + '</h2><span class="muted">' + esc(t('Recent samples kept in this browser session')) + '</span></summary><div class="card-body" id="sys-hist-body"></div></details></section>' +
      '<section class="card"><div class="card-head"><h2>' + esc(t('This browser')) + '</h2><span class="badge info">' + esc(t('Live · operator machine')) + '</span></div><div class="card-body" id="sys-browser"></div></section>' +
      '<section class="card"><div class="card-head"><h2>' + esc(t('Alert thresholds')) + '</h2><span class="muted">' + esc(t('Scope: controller host · applies immediately')) + '</span></div><div class="card-body" id="sys-th"></div></section>' +
      '<section class="card"><div class="card-head"><h2>' + esc(t('Maintenance')) + '</h2>' + AW.ui.demo() + '</div><div class="card-body" id="sys-maint"></div></section></div>';
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    $('#sys-filter', root).addEventListener('input', (e) => { Y.filter = e.target.value.trim(); renderBody(); });
    $('#sys-hist', root).addEventListener('toggle', (e) => { Y.histOpen = e.target.open; renderHistory(); });
    AW.bus.on('health', () => { if (Y.visible) { renderStatus(); if (!svc.telemetry.paused) { renderBody(); renderHistory(); } } });
    AW.bus.on('conn', () => { if (Y.visible) renderAll(); });
    AW.bus.on('config', () => { if (Y.visible) { Y.thDraft = null; renderThresholds(); } });
    AW.bus.on('demo', () => { if (Y.visible) renderAll(); });
  };
  Y.onSession = function () { Y.thDraft = null; };
  Y.show = function (v, section) {
    Y.visible = v; clearInterval(ageTimer);
    if (!v) return;
    renderAll();
    ageTimer = setInterval(renderStatus, 1000);
    if (section === 'info') { const c = $('#sys-info', root); root.scrollTop = 0; c.focus({ preventScroll: true }); }
  };
  function renderAll() { renderStatus(); renderBody(); renderHistory(); renderBrowser(); renderThresholds(); renderMaint(); }

  function renderStatus() {
    const s = svc.telemetry.last(), online = svc.conn.state === 'online', paused = svc.telemetry.paused, iv = AW.prefs.telemetryInterval;
    const age = s ? Date.now() - s.ts : null;
    const kind = !online ? ['bad', 'Unavailable — controller ' + svc.conn.state] : paused ? ['warn', 'Paused'] : !s ? ['info', 'Waiting for first sample'] : age > iv * 3000 ? ['warn', 'Stale'] : ['ok', 'Live'];
    $('#sys-fresh', root).innerHTML = AW.ui.badge(kind[0], kind[1]);
    $('#sys-ident', root).innerHTML = kv([
      ['Monitored machine', '<b>' + esc(svc.host.name) + '</b> — ' + esc(t(svc.host.role)) + ' (' + esc(svc.host.address) + ')'],
      ['Collection source', s ? esc(t(s.source)) : NA(t('No sample yet'))],
      ['Sample timestamp', s ? esc(AW.fmtDateTime(s.ts)) + ' <span class="muted">' + esc(AW.tz()) + '</span>' : NA(t('No sample yet'))],
      ['Data freshness', s ? esc(AW.ago(s.ts)) + (paused ? ' · ' + esc(t('updates paused')) : ' · ' + esc(t('every {n} s', { n: iv }))) : NA(t('No sample yet'))],
    ]);
    const p = root.querySelector('[data-s="pause"]');
    p.innerHTML = paused ? icon('play') + esc(t('Resume Live Updates')) : icon('pause') + esc(t('Pause Live Updates')); p.setAttribute('aria-pressed', paused);
    const tech = AW.can('technician');
    root.querySelector('[data-s="refresh"]').disabled = !online || Y.busy === 'refresh';
    for (const k of ['diag', 'export']) { const b = root.querySelector('[data-s="' + k + '"]'); b.disabled = !tech || !online || !!Y.busy; b.title = !tech ? t('Requires the Technician profile') : !online ? t('Unavailable while the controller is not reachable') : ''; }
    $('#sys-interval', root).value = String(iv);
    AW.$$('#sys-tabs [data-tab]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === Y.tab));
  }

  function renderBody() {
    const body = $('#sys-body', root), s = svc.telemetry.last();
    let h = '';
    if (Y.error) h += '<div class="callout-box bad" role="alert">' + icon('alert') + '<span>' + esc(Y.error) + '</span></div>';
    if (Y.busy === 'diag') h += '<div class="callout-box">' + '<span class="spinner"></span><span>' + esc(t('Running diagnostics…')) + ' ' + esc(Y.diagStep) + '</span></div>';
    if (!s) { body.innerHTML = h + '<p class="empty">' + esc(svc.conn.state === 'online' ? t('Waiting for the first telemetry sample…') : t('Telemetry is unavailable while the controller is {s}. No values are shown rather than guessed ones.', { s: t(svc.conn.state) })) + '</p>'; return; }
    const th = svc.config.section('thresholds');
    if (Y.tab === 'overview') {
      const alerts = svc.telemetry.alerts(), diag = svc.telemetry.lastDiagnostics();
      h += alerts.length ? '<div class="alerts">' + alerts.map((a) => '<div class="callout-box ' + (a.level === 'error' ? 'bad' : 'warn') + '">' + icon('alert') + '<span>' + esc(a.text) + '</span></div>').join('') + '</div>'
        : '<div class="callout-box ok">' + icon('ok') + '<span>' + esc(t('No active alerts for {h}.', { h: s.host.name })) + '</span></div>';
      h += '<div class="tiles">' +
        tile('CPU', s.cpu.total + ' %', bar(s.cpu.total, th.cpu), 'cpu') + tile('Memory', s.mem.pct + ' %', bar(s.mem.pct, th.mem), 'mem') +
        tile('Storage', s.storage.map((v) => v.vol + ' ' + Math.round((v.freeGB / v.capacityGB) * 100) + ' % ' + t('free')).join(' · '), '', 'storage') +
        tile('Outputs', s.app.outputsDetected + ' / ' + s.app.outputsTotal + ' ' + t('active'), '', 'gpu') +
        tile('Sources on wall', s.app.sourcesOnline + ' / ' + s.app.sourcesTotal + ' ' + t('answering'), '', 'app') +
        tile('Uptime', dur(s.os.uptimeS), '', 'os') + '</div>';
      if (diag) h += '<h3>' + esc(t('Last diagnostics')) + ' <span class="muted">' + esc(AW.fmtDateTime(diag.ts)) + '</span></h3>' + table(['Check', 'Result', 'Detail'], diag.results.map((r) => '<tr><td>' + esc(t(r.name)) + '</td><td>' + AW.ui.badge(r.status === 'pass' ? 'ok' : r.status === 'warn' ? 'warn' : 'bad', r.status === 'pass' ? 'Pass' : r.status === 'warn' ? 'Warning' : 'Fail') + '</td><td>' + esc(r.detail) + '</td></tr>'));
    } else if (Y.tab === 'cpu') {
      h += kv([['Model', esc(s.cpu.model)], ['Cores / threads', s.cpu.cores + ' / ' + s.cpu.threads], ['Total utilization', s.cpu.total + ' %'], ['Frequency', val(s.cpu.freqMHz, 'MHz')], ['Temperature', val(s.cpu.tempC, '°C')], ['Alert threshold', th.cpu + ' % · ' + th.temp + ' °C']]) +
        '<h3>' + esc(t('Per-core utilization')) + '</h3><div class="cores">' + s.cpu.perCore.map((p, i) => '<div><span>' + esc(t('Core {n}', { n: i })) + '</span>' + bar(p, th.cpu) + '<b>' + p + ' %</b></div>').join('') + '</div>';
    } else if (Y.tab === 'mem') {
      h += kv([['Installed', s.mem.installedGB + ' GB'], ['Used', s.mem.usedGB + ' GB'], ['Available', s.mem.availableGB + ' GB'], ['Utilization', s.mem.pct + ' %'], ['Memory pressure', val(s.mem.pressure, '', t('The demo agent does not report memory pressure'))], ['Alert threshold', th.mem + ' %']]) + bar(s.mem.pct, th.mem);
    } else if (Y.tab === 'storage') {
      h += table(['Volume', 'File system', 'Capacity', 'Free', 'Free %', 'Read', 'Write', 'Health'], s.storage.filter((v) => match(v.vol + v.label + v.fs)).map((v) => { const pct = Math.round((v.freeGB / v.capacityGB) * 100); return '<tr><td><b>' + esc(v.vol) + '</b> ' + esc(v.label) + '</td><td>' + esc(v.fs) + '</td><td>' + v.capacityGB + ' GB</td><td>' + v.freeGB + ' GB</td><td>' + pct + ' %' + (pct <= th.diskFree ? ' ' + AW.ui.badge('warn', 'Low') : '') + '</td><td>' + v.readMBs + ' MB/s</td><td>' + v.writeMBs + ' MB/s</td><td>' + val(v.health, '', t('This volume does not expose SMART data')) + '</td></tr>'; }));
    } else if (Y.tab === 'os') {
      h += kv([['Hostname', esc(s.os.hostname)], ['Operating system', esc(s.os.os)], ['Build', esc(s.os.build)], ['Application version', esc(s.os.appVersion)], ['Agent version', esc(s.os.agentVersion)], ['Uptime', dur(s.os.uptimeS)], ['Last boot', esc(AW.fmtDateTime(s.os.bootAt))], ['Time synchronization', esc(t(s.os.timeSync.state)) + ' · ' + s.os.timeSync.offsetMs + ' ms · ' + esc(s.os.timeSync.source)]]) +
        '<h3>' + esc(t('Services')) + '</h3>' + table(['Service', 'State', 'Last restart'], s.os.services.filter((x) => match(x.name + x.state)).map((x) => '<tr><td>' + esc(x.name) + '</td><td>' + AW.ui.badge(x.state === 'Running' ? 'ok' : 'info', x.state) + '</td><td>' + (x.lastRestart ? esc(AW.fmtDateTime(x.lastRestart)) : NA(t('Integration not configured'))) + '</td></tr>'));
    } else if (Y.tab === 'gpu') {
      s.gpus.forEach((g, i) => {
        const rows = g.outputs.filter((o) => match(g.name + o.id + (o.tile || '') + o.signal)).map((o) => '<tr><td class="mono">' + esc(o.id) + '</td><td>' + (o.tile ? esc(o.tile) : '<span class="muted">' + esc(t('Not mapped')) + '</span>') + '</td><td>' + esc(o.res) + '</td><td>' + o.hz + ' Hz</td><td>' + AW.ui.badge(o.signal === 'Active' ? 'ok' : 'bad', o.signal) + '</td></tr>');
        if (Y.filter && !rows.length && !match(g.name)) return;
        h += '<div class="dev"><div class="dev-head"><b>' + esc(g.name) + '</b><span class="muted">' + esc(t('Driver')) + ' ' + esc(g.driver) + ' · VRAM ' + g.vramUsedMB + ' / ' + g.vramMB + ' MB · ' + esc(t('Utilization')) + ' ' + g.util + ' % · ' + esc(t('Temperature')) + ' ' + (g.tempC == null ? t('Unavailable') : g.tempC + ' °C') + '</span><span class="grow"></span>' + detailBtn('gpu', i) + '</div>' + table(['Output', 'Wall tile', 'Resolution', 'Refresh', 'Signal'], rows, t('No outputs match the filter.')) + '</div>';
      });
      if (!h) h = '<p class="empty">' + esc(t('Nothing matches "{q}".', { q: Y.filter })) + '</p>';
    } else if (Y.tab === 'capture') {
      s.capture.forEach((c, i) => { h += '<div class="dev"><div class="dev-head"><b>' + esc(c.model) + '</b><span class="muted">' + esc(t('Driver')) + ' ' + esc(c.driver) + '</span><span class="grow"></span>' + detailBtn('capture', i) + '</div>' + table(['Input', 'Detected format', 'Resolution', 'Frame rate', 'Signal lock', 'Dropped frames', 'Audio'], c.inputs.filter((x) => match(c.model + x.id + (x.format || 'no signal'))).map((x) => '<tr><td>' + esc(x.id) + '</td><td>' + val(x.format, '', t('No signal on this input')) + '</td><td>' + val(x.res, '', t('No signal on this input')) + '</td><td>' + val(x.fps, 'fps', t('No signal on this input')) + '</td><td>' + AW.ui.badge(x.lock ? 'ok' : 'info', x.lock ? 'Locked' : 'No signal') + '</td><td>' + val(x.dropped, '', t('No signal on this input')) + '</td><td>' + val(x.audio, '', t('No signal on this input')) + '</td></tr>')) + '</div>'; });
    } else if (Y.tab === 'drivers') {
      h += table(['Device', 'Class', 'Vendor', 'Version', 'Date', 'Reported error', ''], s.drivers.map((d, i) => [d, i]).filter(([d]) => match(d.device + d.cls + d.vendor + d.version)).map(([d, i]) => '<tr><td>' + esc(d.device) + '</td><td>' + esc(t(d.cls)) + '</td><td>' + esc(d.vendor) + '</td><td class="mono">' + esc(d.version) + '</td><td>' + esc(d.date) + '</td><td>' + (d.error ? '<span class="st-bad">' + esc(d.error) + '</span>' : esc(t('None'))) + '</td><td>' + detailBtn('driver', i) + '</td></tr>')) +
        '<p class="note">' + esc(t('Inventory only. AegisWall does not recommend, download or install drivers.')) + '</p>';
    } else if (Y.tab === 'net') {
      h += table(['Adapter', 'Link', 'Speed', 'IP address', 'Gateway', 'DNS', 'Receive', 'Send', ''], s.net.map((n, i) => [n, i]).filter(([n]) => match(n.name + n.link + (n.ip || ''))).map(([n, i]) => '<tr><td>' + esc(n.name) + '</td><td>' + AW.ui.badge(n.link === 'Up' ? 'ok' : 'info', n.link) + '</td><td>' + val(n.speed, '', t('Link is down')) + '</td><td class="mono">' + val(n.ip, '', t('Link is down')) + (n.mask ? ' / ' + esc(n.mask) : '') + '</td><td class="mono">' + val(n.gateway, '', t('No gateway on this network')) + '</td><td class="mono">' + (n.dns.length ? esc(n.dns.join(', ')) : NA(t('No DNS on this network'))) + '</td><td>' + val(n.rxKbps == null ? null : (n.rxKbps / 1000).toFixed(1), 'Mbps', t('Link is down')) + '</td><td>' + val(n.txKbps == null ? null : (n.txKbps / 1000).toFixed(1), 'Mbps', t('Link is down')) + '</td><td>' + detailBtn('net', i) + '</td></tr>')) +
        '<h3>' + esc(t('Connectivity checks')) + ' <span class="muted">' + esc(t('only to explicitly configured endpoints')) + '</span></h3>' + table(['Endpoint', 'Result', 'Round trip'], s.checks.filter((c) => match(c.endpoint)).map((c) => '<tr><td>' + esc(c.endpoint) + '</td><td>' + AW.ui.badge(c.ok ? 'ok' : 'bad', c.ok ? 'Reachable' : 'Failed') + '</td><td>' + val(c.ms, 'ms', t('No reply')) + '</td></tr>'));
    } else if (Y.tab === 'app') {
      const errs = AW.logs.all().filter((e) => e.level === 'error').slice(-5).reverse();
      h += kv([['Application services', AW.ui.badge('ok', 'Available')], ['Database', AW.ui.badge('ok', 'Connected') + ' ' + esc(svc.db.status().engine)], ['Sources on the wall', s.app.sourcesOnline + ' / ' + s.app.sourcesTotal + ' ' + esc(t('answering'))], ['Graphics outputs', s.app.outputsDetected + ' / ' + s.app.outputsTotal + ' ' + esc(t('active'))], ['Resource pressure', (s.cpu.total >= th.cpu || s.mem.pct >= th.mem ? AW.ui.badge('warn', 'Elevated') : AW.ui.badge('ok', 'Normal'))], ['Errors in the last hour', String(s.app.recentErrors)]]) +
        '<h3>' + esc(t('Recent errors')) + '</h3>' + (errs.length ? table(['Time', 'Service', 'Message'], errs.map((e) => '<tr><td>' + esc(AW.fmtDateTime(e.ts)) + '</td><td>' + esc(e.service) + '</td><td>' + esc(e.message) + '</td></tr>')) : '<p class="empty">' + esc(t('No errors recorded.')) + '</p>') +
        '<div class="btn-row"><button class="btn btn-small" type="button" data-s="logs">' + icon('list') + esc(t('Open logs')) + '</button><button class="btn btn-small" type="button" data-s="console">' + icon('terminal') + esc(t('Open technician console')) + '</button></div>';
    }
    body.innerHTML = h;
  }
  const tile = (label, value, extra, tab) => '<button class="tile" type="button" data-tab="' + tab + '"><span>' + esc(t(label)) + '</span><b>' + esc(value) + '</b>' + extra + '</button>';

  function renderHistory() {
    if (!Y.histOpen) return;
    const hist = svc.telemetry.history(), box = $('#sys-hist-body', root);
    if (hist.length < 2) { box.innerHTML = '<p class="empty">' + esc(t('Charts appear after a few samples.')) + '</p>'; return; }
    const chart = (key, label, unit, max) => {
      const w = 520, hgt = 84, pad = 4, n = hist.length;
      const pts = hist.map((p, i) => (pad + (i / (n - 1)) * (w - 2 * pad)).toFixed(1) + ',' + (hgt - pad - (AW.clamp(p[key], 0, max) / max) * (hgt - 2 * pad)).toFixed(1));
      const lastP = hist[n - 1][key];
      return '<figure class="chart"><figcaption><b>' + esc(t(label)) + '</b><span>' + lastP + ' ' + unit + ' · ' + esc(t('{n} samples from {a} to {b}', { n, a: AW.fmtTime(hist[0].ts), b: AW.fmtTime(hist[n - 1].ts) })) + '</span></figcaption>' +
        '<svg viewBox="0 0 ' + w + ' ' + hgt + '" preserveAspectRatio="none" role="img" aria-label="' + esc(t(label)) + '"><path class="ch-grid" d="M0 ' + hgt / 2 + 'H' + w + 'M0 ' + (hgt - pad) + 'H' + w + 'M0 ' + pad + 'H' + w + '"/><polygon class="ch-area" points="' + pad + ',' + (hgt - pad) + ' ' + pts.join(' ') + ' ' + (w - pad) + ',' + (hgt - pad) + '"/><polyline class="ch-line" points="' + pts.join(' ') + '"/><circle class="ch-dot" r="3" cx="' + pts[n - 1].split(',')[0] + '" cy="' + pts[n - 1].split(',')[1] + '"/></svg>' +
        '<div class="chart-scale"><span>0</span><span>' + max + ' ' + unit + '</span></div></figure>';
    };
    box.innerHTML = '<div class="charts">' + chart('cpu', 'CPU utilization', '%', 100) + chart('mem', 'Memory utilization', '%', 100) + chart('temp', 'CPU temperature', '°C', 100) + '</div><p class="note">' + AW.ui.demo() + ' ' + esc(t('Simulated values. History is not stored on the controller in this prototype.')) + '</p>';
  }
  function renderBrowser() {
    const b = svc.telemetry.browser();
    $('#sys-browser', root).innerHTML = '<p class="note">' + esc(t('This is the computer you are using to operate AegisWall. It is not the controller host and its values never mix with the telemetry above.')) + '</p>' +
      kv([['Browser', esc(b.userAgent)], ['Logical processors', val(b.cores, '', t('The browser does not report this'))], ['Device memory', val(b.memoryGB, 'GB (approx.)', t('The browser does not report this'))], ['Screen', esc(b.screen) + ' @ ' + b.pixelRatio + 'x'], ['Language', esc(b.language)], ['Network', esc(t(b.online ? 'Online' : 'Offline'))], ['3D renderer', esc(AW.stage.kind === '3d' ? t('WebGL active') : t('2D fallback') + (AW.stage.fallbackReason ? ' — ' + AW.stage.fallbackReason : ''))]]);
  }
  function renderThresholds() {
    const can = AW.can('technician'), d = (Y.thDraft = Y.thDraft || svc.config.section('thresholds')), cur = svc.config.section('thresholds');
    const dirty = JSON.stringify(d) !== JSON.stringify(cur);
    const f = (key, label, unit, min, max) => '<label class="field"><span>' + esc(t(label)) + ' <small class="muted">' + unit + ', ' + min + '–' + max + '</small></span><input type="number" id="th-' + key + '" data-th="' + key + '" min="' + min + '" max="' + max + '" step="1" value="' + d[key] + '"' + (can ? '' : ' disabled') + '></label>';
    $('#sys-th', root).innerHTML = '<div class="form-cols">' + f('cpu', 'CPU utilization', '%', 50, 100) + f('mem', 'Memory utilization', '%', 50, 100) + f('diskFree', 'Minimum free disk space', '%', 1, 50) + f('temp', 'CPU temperature', '°C', 50, 105) + '</div>' +
      (Y.thError ? '<p class="field-error" role="alert">' + esc(Y.thError) + '</p>' : '') +
      '<div class="btn-row"><button class="btn btn-primary" type="button" data-s="th-save"' + (can && dirty ? '' : ' disabled') + '>' + esc(t('Save thresholds')) + '</button><button class="btn" type="button" data-s="th-cancel"' + (dirty ? '' : ' disabled') + '>' + esc(t('Cancel')) + '</button><button class="btn" type="button" data-s="th-defaults"' + (can ? '' : ' disabled') + '>' + esc(t('Restore Defaults')) + '</button></div>' +
      '<p class="note">' + esc(can ? t('Crossing a threshold raises an alert in the header indicator and on the Overview tab.') : t('Read-only: changing thresholds requires the Technician profile.')) + '</p>';
  }
  function renderMaint() {
    const can = AW.can('technician'), online = svc.conn.state === 'online', busy = svc.maint.busy();
    const dis = !can || !online || busy, why = !can ? t('Requires the Technician profile') : !online ? t('Unavailable while the controller is not reachable') : busy ? t('A maintenance action is running') : '';
    $('#sys-maint', root).innerHTML =
      '<div class="maint-grid"><div class="maint"><h3>' + esc(t('Restart Application Service')) + '</h3><p class="note">' + esc(t('Restarts only the AegisWall service on {h}. The operating system keeps running. Wall playback is interrupted for a few seconds.', { h: svc.host.name })) + '</p><button class="btn" type="button" data-s="restart-service"' + (dis ? ' disabled title="' + esc(why) + '"' : '') + '>' + icon('refresh') + esc(t('Restart Application Service…')) + '</button></div>' +
      '<div class="maint"><h3>' + esc(t('Reboot Controller Host')) + '</h3><p class="note">' + esc(t('Reboots the whole machine {h}. Every display goes dark until the host and the service are back. This is not a browser reload.', { h: svc.host.name })) + '</p><button class="btn btn-danger-quiet" type="button" data-s="restart-host"' + (dis ? ' disabled title="' + esc(why) + '"' : '') + '>' + icon('power') + esc(t('Reboot Controller Host…')) + '</button></div></div>' +
      (!online && !busy ? '<div class="callout-box warn" role="alert">' + icon('alert') + '<span>' + esc(t('The controller is {s}. {d}', { s: t(svc.conn.state), d: svc.conn.detail })) + '</span> <button class="btn btn-small" type="button" data-s="reconnect">' + esc(t('Retry connection')) + '</button></div>' : '') +
      (Y.maint ? '<p class="note" role="status">' + esc(Y.maint) + '</p>' : '') +
      '<p class="note">' + esc(t('Both actions need an authorized technician, an explicit confirmation and an acknowledgement from the controller before anything is executed.')) + '</p>';
  }

  // ------------------------------------------------------------------ maintenance flow
  async function maintenance(kind) {
    const host = svc.host.name, isHost = kind === 'host', pend = AW.wall.pending().n, audioPend = AW.audioUI && AW.audioUI.draft && JSON.stringify(AW.audioUI.draft) !== JSON.stringify(svc.audio.confirmed());
    const ok = await AW.confirm({
      title: isHost ? t('Reboot controller host?') : t('Restart application service?'), danger: true, type: isHost ? host : null,
      confirmLabel: isHost ? t('Reboot {h}', { h: host }) : t('Restart service on {h}', { h: host }),
      html: '<p>' + esc(isHost ? t('You are about to reboot the controller host.') : t('You are about to restart the AegisWall application service.')) + ' ' + AW.ui.demo() + '</p><ul>' +
        '<li><b>' + esc(t('Target')) + ':</b> ' + esc(host) + ' (' + esc(svc.host.address) + ') — ' + esc(isHost ? t('whole machine') : t('AegisWall Application Service only')) + '</li>' +
        '<li><b>' + esc(t('Affected playback')) + ':</b> ' + esc(isHost ? t('all wall outputs and audio stop until the host has booted and the service is running again') : t('all wall outputs and audio freeze or go blank while the service restarts')) + '</li>' +
        '<li><b>' + esc(t('Expected interruption')) + ':</b> ' + esc(isHost ? t('about 1–2 minutes on real hardware (shortened in this demo)') : t('about 5–15 seconds on real hardware (shortened in this demo)')) + '</li>' +
        '<li><b>' + esc(t('Pending edits')) + ':</b> ' + esc(pend || audioPend ? t('{n} unapplied wall change(s){a} stay in this browser. They are not sent and not lost.', { n: pend, a: audioPend ? t(' and staged audio changes') : '' }) : t('none')) + '</li></ul>' +
        '<p class="note">' + esc(t('Nothing happens until the controller acknowledges the request. Signed in as {u} ({r}).', { u: AW.session.user, r: t(AW.ROLE_LABEL[AW.session.role]) })) + '</p>',
    });
    if (!ok) return;
    const STEPS = [['requested', 'Request sent to the controller'], ['acknowledged', 'Acknowledged by the controller (Demo)'], ['stopping', isHost ? 'Host is shutting down' : 'Service is stopping'], ['offline', 'Controller offline'], ['reconnecting', 'Reconnecting'], ['online', 'Controller back online']];
    const body = AW.el('<div class="progress-steps"></div>');
    let cur = -1, detail = '', failed = '', done = false, api;
    const draw = () => {
      body.innerHTML = '<p>' + esc(t('Target')) + ': <b>' + esc(host) + '</b> ' + AW.ui.demo() + '</p><ol>' + STEPS.map(([id, label], i) => '<li class="' + (i < cur || done ? 'done' : i === cur ? (failed ? 'fail' : 'now') : '') + '">' + (i < cur || done ? icon('ok') : i === cur && failed ? icon('alert') : i === cur ? '<span class="spinner"></span>' : '<span class="pip"></span>') + '<span>' + esc(t(label)) + (i === cur && detail ? ' — ' + esc(detail) : '') + '</span></li>').join('') + '</ol>' +
        (failed ? '<div class="callout-box bad" role="alert">' + icon('alert') + '<span>' + esc(failed) + '</span></div>' : done ? '<div class="callout-box ok">' + icon('ok') + '<span>' + esc(t('{h} answered the health probe. Uptime counters were reset.', { h: host })) + '</span></div>' : '<p class="note">' + esc(t('Progress follows what the controller reports, not a timer.')) + '</p>');
      if (api) api.setActions(done || failed ? [{ label: t('Close'), kind: 'primary', value: null }] : []);
    };
    AW.dialog({ title: isHost ? t('Rebooting controller host') : t('Restarting application service'), body, dismissible: false, actions: [], onMount(a) { api = a; draw(); } });
    try {
      await svc.maint.restart(kind, (phase, d) => { cur = STEPS.findIndex((s) => s[0] === phase); if (cur < 0) cur = STEPS.length - 2; detail = phase === 'reconnecting' && d ? t('attempt {i} of {n}', { i: d.attempt, n: d.max }) : ''; if (phase === 'online') done = true; draw(); });
      Y.maint = t('{what} completed at {time}. (Demo)', { what: isHost ? t('Host reboot') : t('Service restart'), time: AW.fmtTime() });
      svc.telemetry.sample().catch(() => {});
    } catch (e) { failed = e.message; Y.maint = t('Last action failed: {m}', { m: e.message }); draw(); }
    renderAll();
  }

  function showDetail(kind, i) {
    const s = svc.telemetry.last(); if (!s) return;
    const obj = kind === 'gpu' ? s.gpus[i] : kind === 'capture' ? s.capture[i] : kind === 'driver' ? s.drivers[i] : s.net[i];
    const rows = (o, prefix) => Object.keys(o).map((k) => { const v = o[k]; if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v.map((x, j) => '<tr><th colspan="2">' + esc(prefix + k + ' ' + (j + 1)) + '</th></tr>' + rows(x, '')).join(''); return '<tr><td>' + esc(prefix + k) + '</td><td class="mono">' + (v == null ? NA() : esc(Array.isArray(v) ? v.join(', ') : v)) + '</td></tr>'; }).join('');
    AW.dialog({ title: obj.name || obj.model || obj.device, wide: true, body: '<p class="note">' + esc(t('Reported by {src} at {time}.', { src: s.source, time: AW.fmtTime(s.ts) })) + ' ' + AW.ui.demo() + '</p><div class="table-wrap"><table><tbody>' + rows(obj, '') + '</tbody></table></div>', actions: [{ label: t('Close'), kind: 'primary', value: null }] });
  }

  async function onClick(e) {
    const tab = e.target.closest('[data-tab]'); if (tab) { Y.tab = tab.dataset.tab; renderStatus(); renderBody(); return; }
    const det = e.target.closest('[data-detail]'); if (det) { const [k, i] = det.dataset.detail.split(':'); showDetail(k, +i); return; }
    const b = e.target.closest('[data-s]'); if (!b) return;
    const a = b.dataset.s;
    try {
      Y.error = '';
      if (a === 'refresh') { Y.busy = 'refresh'; renderStatus(); try { await svc.telemetry.sample(); renderBody(); renderHistory(); } finally { Y.busy = ''; renderStatus(); } }
      else if (a === 'pause') { svc.telemetry.paused = !svc.telemetry.paused; renderStatus(); if (!svc.telemetry.paused) svc.telemetry.sample().catch(() => {}); }
      else if (a === 'diag') { Y.busy = 'diag'; Y.tab = 'overview'; renderStatus(); try { await svc.telemetry.diagnostics((i, n, name) => { Y.diagStep = (i + 1) + ' / ' + n + ' — ' + t(name); renderBody(); }); AW.toast('ok', t('Diagnostics finished. Results are on the Overview tab.')); } finally { Y.busy = ''; renderStatus(); renderBody(); } }
      else if (a === 'export') { const rep = svc.telemetry.report(); const r = await AW.saveFile('aegiswall-diagnostics-' + svc.host.name.toLowerCase() + '-' + AW.fmtDate(Date.now()) + '.json', JSON.stringify(rep, null, 2)); if (r.ok) AW.toast('ok', t('Diagnostic report saved. Secrets are redacted.')); }
      else if (a === 'logs') AW.app.go('settings', 'logs');
      else if (a === 'console') AW.app.go('settings', 'console');
      else if (a === 'th-save') { Y.thError = ''; try { await svc.config.save('thresholds', Y.thDraft, svc.config.sectionVersion('thresholds')); AW.toast('ok', t('Alert thresholds saved.')); svc.telemetry.sample().catch(() => {}); } catch (err) { Y.thError = err.message; renderThresholds(); } }
      else if (a === 'th-cancel') { Y.thDraft = null; Y.thError = ''; renderThresholds(); }
      else if (a === 'th-defaults') { Y.thDraft = AW.clone(svc.config.DEFAULTS.thresholds); Y.thError = ''; renderThresholds(); }
      else if (a === 'restart-service') await maintenance('service');
      else if (a === 'restart-host') await maintenance('host');
      else if (a === 'reconnect') { b.disabled = true; const ok = await svc.maint.retryConnection(); AW.toast(ok ? 'ok' : 'warn', ok ? t('Controller is back online.') : t('Still no answer from {h}.', { h: svc.host.name })); renderAll(); }
    } catch (err) { Y.error = err.message; AW.toast('error', err.message); renderBody(); }
  }
  function onChange(e) {
    const n = e.target;
    if (n.id === 'sys-interval') { AW.savePrefs({ telemetryInterval: +n.value }); renderStatus(); }
    else if (n.dataset.th) {
      const v = Number(n.value);
      Y.thDraft[n.dataset.th] = Number.isFinite(v) && n.value.trim() !== '' ? Math.round(v) : NaN;
      const errs = svc.config.validate('thresholds', Y.thDraft);
      Y.thError = Object.values(errs)[0] || '';
      renderThresholds();
      const again = document.getElementById(n.id); if (again) { again.focus(); if (errs[n.dataset.th]) again.setAttribute('aria-invalid', 'true'); }
    }
  }
})();
