/* AegisWall — core: utilities, i18n hook, storage, events, dialogs, motion, logging.
 * Everything here is application infrastructure shared by all workspaces. */
(function () {
  'use strict';
  const AW = (window.AW = window.AW || {});
  AW.PRODUCT = 'AegisWall';          // configurable product name
  AW.VERSION = '2.0.0-prototype';

  // ---------- small helpers ----------
  AW.$ = (s, r) => (r || document).querySelector(s);
  AW.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  AW.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  AW.clone = (o) => JSON.parse(JSON.stringify(o));
  AW.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AW.icon = (id, cls) => '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#i-' + id + '"/></svg>';
  AW.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  AW.norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  AW.el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

  // Localization-ready strings: every UI string passes through t(). The English text is the key;
  // AW.i18n.add('pt-BR', {...}) supplies translations without touching call sites.
  AW.i18n = { lang: 'en', dict: {}, add(lang, map) { this.dict[lang] = Object.assign(this.dict[lang] || {}, map); } };
  AW.t = (s, vars) => {
    const d = AW.i18n.dict[AW.i18n.lang];
    let out = (d && d[s]) || s;
    if (vars) for (const k in vars) out = out.split('{' + k + '}').join(vars[k]);
    return out;
  };
  AW.plural = (n, one, many) => n + ' ' + AW.t(n === 1 ? one : many);

  // ---------- secure random ids ----------
  AW.randomBytes = (n) => { const a = new Uint8Array(n); (window.crypto || window.msCrypto).getRandomValues(a); return a; };
  AW.uid = (prefix) => (prefix || 'id') + '-' + Array.from(AW.randomBytes(6), (b) => b.toString(16).padStart(2, '0')).join('');
  // Deterministic, non-cryptographic checksum (53-bit). Used for demo integrity checks only — never as a signature.
  AW.checksum = (str) => {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };

  // ---------- storage (localStorage with an in-memory fallback) ----------
  const mem = {};
  const PREFIX = 'aegiswall.';
  AW.store = {
    persistent: true,
    get(key, def) {
      try { const v = localStorage.getItem(PREFIX + key); return v == null ? (key in mem ? mem[key] : def) : JSON.parse(v); }
      catch (_) { return key in mem ? mem[key] : def; }
    },
    set(key, val) {
      mem[key] = val;
      try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); } catch (_) { this.persistent = false; }
    },
    remove(key) { delete mem[key]; try { localStorage.removeItem(PREFIX + key); } catch (_) { /* unavailable */ } },
    keys() {
      const out = new Set(Object.keys(mem));
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(PREFIX)) out.add(k.slice(PREFIX.length)); } } catch (_) { /* unavailable */ }
      return [...out];
    },
  };

  // ---------- events ----------
  const listeners = {};
  AW.bus = {
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return () => { listeners[evt] = listeners[evt].filter((f) => f !== fn); }; },
    emit(evt, data) { (listeners[evt] || []).slice().forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
  };

  // ---------- user preferences (scope: this browser) ----------
  AW.PREF_DEFAULTS = {
    theme: 'system', motion: 'system', monitorIds: 'always', intro: true, clock: '24h', snapping: true,
    quality: 'balanced', renderScale: 1, shadows: 'contact', reflections: true, previewRes: 480,
    previewMode: 'static', previewFps: 5, thumbInterval: 30, liveLimit: 4,
    sessionTimeout: 60, telemetryInterval: 5,
  };
  AW.prefs = Object.assign({}, AW.PREF_DEFAULTS, AW.store.get('prefs', {}));
  AW.savePrefs = (patch) => { Object.assign(AW.prefs, patch || {}); AW.store.set('prefs', AW.prefs); AW.applyPrefs(); AW.bus.emit('prefs', AW.prefs); };
  AW.applyPrefs = () => {
    const root = document.documentElement;
    if (AW.prefs.theme === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', AW.prefs.theme);
    root.setAttribute('data-motion', AW.motion.level());
  };

  // ---------- time ----------
  AW.fmtTime = (d) => new Date(d || Date.now()).toLocaleTimeString('en-GB', { hour12: AW.prefs.clock === '12h' });
  AW.fmtDate = (d) => new Date(d).toLocaleDateString('en-CA');
  AW.fmtDateTime = (d) => AW.fmtDate(d) + ' ' + AW.fmtTime(d);
  AW.tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'; } catch (_) { return 'local'; } };
  AW.ago = (ts) => {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    return s < 2 ? AW.t('just now') : s < 60 ? AW.t('{n} s ago', { n: s }) : s < 3600 ? AW.t('{n} min ago', { n: Math.round(s / 60) }) : AW.t('{n} h ago', { n: Math.round(s / 3600) });
  };
  AW.bytes = (n) => { const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; } return (i ? n.toFixed(1) : n) + ' ' + u[i]; };

  // ---------- motion: one small tween engine, one owner per key ----------
  const tweens = new Map();
  let rafId = 0;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const EASE = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    in: (t) => t * t * t,
    linear: (t) => t,
  };
  function tick(now) {
    rafId = 0;
    for (const [key, tw] of tweens) {
      if (now < tw.start) continue;
      const p = tw.dur <= 0 ? 1 : Math.min(1, (now - tw.start) / tw.dur);
      const v = tw.from + (tw.to - tw.from) * tw.ease(p);
      tw.value = v;
      try { tw.update(v, p); } catch (e) { console.error(e); }
      if (p >= 1) { tweens.delete(key); if (tw.done) tw.done(); }
    }
    if (tweens.size) rafId = requestAnimationFrame(tick);
  }
  AW.motion = {
    // 'full' | 'reduced' | 'off'. The OS preference wins when the setting is "system".
    level() { const m = AW.prefs ? AW.prefs.motion : 'system'; return m === 'system' ? (mq.matches ? 'reduced' : 'full') : m; },
    reduced() { return this.level() !== 'full'; },
    // Starts (or retargets) the tween that owns `key`. A new call replaces the running one from the
    // value the caller passes as `from` — callers pass their current value, so there is never a jump or a queue.
    to(key, o) {
      const lvl = this.level();
      let dur = o.dur == null ? 300 : o.dur, delay = o.delay || 0;
      if (lvl === 'off' || (lvl === 'reduced' && o.spatial !== false)) { dur = 0; delay = 0; }
      tweens.set(key, { from: o.from, to: o.to, dur, start: performance.now() + delay, ease: EASE[o.ease || 'out'], update: o.update, done: o.done, value: o.from });
      if (!rafId) rafId = requestAnimationFrame(tick);
    },
    cancel(key) { tweens.delete(key); },
    cancelPrefix(prefix) { for (const k of tweens.keys()) if (k.startsWith(prefix)) tweens.delete(k); },
    // Completes matching tweens immediately (used by "Skip").
    finishPrefix(prefix) {
      for (const [k, tw] of [...tweens]) if (k.startsWith(prefix)) { tweens.delete(k); try { tw.update(tw.to, 1); } catch (_) { /* ignore */ } if (tw.done) tw.done(); }
    },
    active(prefix) { for (const k of tweens.keys()) if (!prefix || k.startsWith(prefix)) return true; return false; },
    ease: EASE,
  };
  if (mq.addEventListener) mq.addEventListener('change', () => { AW.applyPrefs(); AW.bus.emit('prefs', AW.prefs); });

  // ---------- session and permission profiles ----------
  AW.ROLES = { operator: 1, technician: 2, administrator: 3 };
  AW.ROLE_LABEL = { operator: 'Operator', technician: 'Technician', administrator: 'Administrator' };
  AW.session = null;
  AW.can = (minRole) => !!AW.session && AW.ROLES[AW.session.role] >= AW.ROLES[minRole];
  class AppError extends Error { constructor(code, message, extra) { super(message); this.code = code; Object.assign(this, extra || {}); } }
  AW.AppError = AppError;
  // Service-layer guards: adapters call these, so a hidden or disabled button is never the only protection.
  AW.requireRole = (minRole, what) => {
    if (!AW.can(minRole)) throw new AppError('forbidden', AW.t('{what} requires the {role} profile.', { what: what || AW.t('This action'), role: AW.t(AW.ROLE_LABEL[minRole]) }));
  };

  // ---------- redaction ----------
  const SECRET = /pass(word)?|secret|token|private|credential|api[-_]?key/i;
  AW.redact = (value) => {
    if (Array.isArray(value)) return value.map(AW.redact);
    if (value && typeof value === 'object') {
      const out = {};
      for (const k in value) out[k] = SECRET.test(k) && value[k] ? '[redacted]' : AW.redact(value[k]);
      return out;
    }
    return typeof value === 'string' ? value.replace(/(password|token|secret)=\S+/gi, '$1=[redacted]') : value;
  };

  // ---------- logging: operational log and administrative audit trail are separate stores ----------
  const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
  AW.LOG_LEVELS = LEVELS;
  const logCfg = () => Object.assign({ level: 'info', retentionDays: 14, maxEntries: 500 }, AW.store.get('log.config', {}));
  function prune(list, cfg) {
    const min = Date.now() - cfg.retentionDays * 86400000;
    let out = list.filter((e) => e.ts >= min);
    if (out.length > cfg.maxEntries) out = out.slice(out.length - cfg.maxEntries);   // rotation: oldest entries leave first
    return out;
  }
  let reqSeq = 0;
  AW.requestId = () => 'req-' + (Date.now() % 1e6).toString(36) + '-' + (++reqSeq).toString(36);
  AW.logs = {
    config: logCfg,
    setConfig(patch) { const c = Object.assign(logCfg(), patch); AW.store.set('log.config', c); AW.store.set('log.entries', prune(this.all(), c)); return c; },
    all() { return AW.store.get('log.entries', []); },
    audit() { return AW.store.get('log.audit', []); },
    deleteStored() { AW.store.set('log.entries', []); AW.bus.emit('log', null); },
  };
  AW.log = (level, service, message, meta) => {
    const cfg = logCfg();
    if (LEVELS[level] < LEVELS[cfg.level]) return null;     // below the configured level: not stored
    const entry = { id: AW.uid('log'), ts: Date.now(), level, service, message: AW.redact(message), meta: AW.redact(meta || {}) };
    const list = AW.logs.all(); list.push(entry);
    AW.store.set('log.entries', prune(list, cfg));
    AW.bus.emit('log', entry);
    return entry;
  };
  AW.audit = (action, detail) => {
    const entry = { id: AW.uid('aud'), ts: Date.now(), actor: AW.session ? AW.session.user : 'anonymous', role: AW.session ? AW.session.role : '-', action, detail: AW.redact(detail || {}) };
    const list = AW.logs.audit(); list.push(entry);
    AW.store.set('log.audit', list.slice(-400));
    AW.bus.emit('audit', entry);
    return entry;
  };

  // ---------- toasts ----------
  AW.toast = (kind, text, opts) => {
    const host = AW.$('#toasts');
    const o = opts || {};
    const d = AW.el('<div class="toast ' + kind + '" role="' + (kind === 'error' ? 'alert' : 'status') + '">' +
      AW.icon(kind === 'ok' ? 'ok' : kind === 'error' || kind === 'warn' ? 'alert' : 'info') + '<p></p>' +
      (o.action ? '<button class="btn btn-small" type="button" data-act></button>' : '') +
      '<button class="icon-btn" type="button" data-close aria-label="' + AW.esc(AW.t('Dismiss')) + '">' + AW.icon('x') + '</button></div>');
    d.querySelector('p').textContent = text;
    const close = () => { clearTimeout(timer); d.remove(); };
    const timer = setTimeout(close, o.ms || (kind === 'error' ? 10000 : 5000));
    d.querySelector('[data-close]').addEventListener('click', close);
    if (o.action) { const b = d.querySelector('[data-act]'); b.textContent = o.action.label; b.addEventListener('click', () => { close(); o.action.run(); }); }
    host.appendChild(d);
    while (host.children.length > 3) host.firstChild.remove();
    return close;
  };

  // ---------- dialogs (one at a time on top; focus is trapped and restored) ----------
  const stack = [];
  AW.dialog = (o) => new Promise((resolve) => {
    const host = AW.$('#dialogs');
    const prevFocus = document.activeElement;
    const wrap = AW.el('<div class="dialog-backdrop"><div class="dialog' + (o.wide ? ' wide' : '') + (o.cls ? ' ' + o.cls : '') + '" role="dialog" aria-modal="true" aria-labelledby="dlg-title-' + stack.length + '">' +
      '<header><h2 id="dlg-title-' + stack.length + '"></h2><button class="icon-btn" type="button" data-x aria-label="' + AW.esc(AW.t('Close')) + '">' + AW.icon('x') + '</button></header>' +
      '<div class="dialog-body"></div><footer></footer></div></div>');
    const box = wrap.firstElementChild, body = wrap.querySelector('.dialog-body'), foot = wrap.querySelector('footer');
    wrap.querySelector('h2').textContent = o.title;
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    let closed = false;
    const api = {
      el: box, body, foot,
      close(value) {
        if (closed) return; closed = true;
        document.removeEventListener('keydown', onKey, true);
        stack.splice(stack.indexOf(api), 1);
        wrap.remove();
        if (o.onClose) o.onClose(value);
        if (prevFocus && prevFocus.focus && document.contains(prevFocus)) prevFocus.focus();
        resolve(value);
      },
      setActions(actions) {
        foot.innerHTML = '';
        (actions || []).forEach((a) => {
          const b = AW.el('<button class="btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'danger' ? 'btn-danger' : '') + '" type="button"></button>');
          b.textContent = a.label; if (a.id) b.dataset.id = a.id; b.disabled = !!a.disabled; if (a.title) b.title = a.title;
          b.addEventListener('click', () => { if (a.run) { const r = a.run(api, b); if (r === false) return; if (r && r.then) return; } if (!a.keepOpen) api.close(a.value); });
          foot.appendChild(b);
        });
        foot.hidden = !foot.children.length;
      },
    };
    const onKey = (e) => {
      if (stack[stack.length - 1] !== api) return;
      if (e.key === 'Escape' && o.dismissible !== false) { e.stopPropagation(); api.close(null); }
      if (e.key === 'Tab') {
        const f = AW.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', box).filter((n) => !n.disabled && n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    wrap.querySelector('[data-x]').addEventListener('click', () => api.close(null));
    if (o.dismissible === false) wrap.querySelector('[data-x]').hidden = true;
    wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap && o.dismissible !== false) api.close(null); });
    document.addEventListener('keydown', onKey, true);
    api.setActions(o.actions);
    host.appendChild(wrap);
    stack.push(api);
    if (o.onMount) o.onMount(api);
    const auto = box.querySelector('[autofocus]') || body.querySelector('input, select, textarea, button') || foot.querySelector('.btn-primary, button') || box;
    setTimeout(() => auto.focus && auto.focus(), 0);
  });
  AW.dialogOpen = () => stack.length > 0;

  // Confirmation with an optional typed phrase for disruptive actions.
  AW.confirm = (o) => new Promise((resolve) => {
    const body = AW.el('<div class="confirm"></div>');
    body.innerHTML = (o.html || '<p>' + AW.esc(o.message || '') + '</p>') +
      (o.type ? '<label class="field"><span>' + AW.esc(AW.t('Type {phrase} to confirm', { phrase: o.type })) + '</span><input type="text" id="confirm-phrase" autocomplete="off" spellcheck="false"></label>' : '');
    AW.dialog({
      title: o.title, body, cls: o.danger ? 'danger' : '',
      actions: [
        { label: o.cancelLabel || AW.t('Cancel'), value: false },
        { label: o.confirmLabel || AW.t('Confirm'), kind: o.danger ? 'danger' : 'primary', value: true, id: 'ok', disabled: !!o.type },
      ],
      onMount(api) {
        if (!o.type) return;
        const input = body.querySelector('input'), ok = api.foot.querySelector('[data-id="ok"]');
        input.addEventListener('input', () => { ok.disabled = input.value.trim() !== o.type; });
      },
    }).then((v) => resolve(v === true));
  });

  // Small text prompt (rename, save as…). Resolves null when cancelled.
  AW.promptText = (o) => new Promise((resolve) => {
    const body = AW.el('<form class="confirm"><label class="field"><span></span><input type="text" id="prompt-text" maxlength="' + (o.max || 48) + '" autocomplete="off" spellcheck="false"></label><p class="field-error" role="alert" hidden></p></form>');
    body.querySelector('span').textContent = o.label;
    const input = body.querySelector('input'), err = body.querySelector('.field-error');
    input.value = o.value || '';
    let api;
    const submit = () => {
      const v = input.value.trim();
      const problem = !v ? AW.t('Enter a name.') : (o.validate ? o.validate(v) : null);
      if (problem) { err.textContent = problem; err.hidden = false; input.focus(); return false; }
      api.close(v);
    };
    body.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
    AW.dialog({
      title: o.title, body,
      actions: [{ label: AW.t('Cancel'), value: null }, { label: o.confirmLabel || AW.t('Save'), kind: 'primary', keepOpen: true, run: () => { submit(); return false; } }],
      onMount(a) { api = a; setTimeout(() => input.select(), 0); },
    }).then(resolve);
  });

  // ---------- popover (anchored, closes on outside click / Escape) ----------
  let popAnchor = null;
  AW.closePopover = () => { const p = AW.$('#popover'); if (p.hidden) return; p.hidden = true; p.innerHTML = ''; p.onclick = p.onchange = p.oninput = null; if (popAnchor) popAnchor.setAttribute('aria-expanded', 'false'); popAnchor = null; };
  AW.popover = (anchor, html, onMount, place) => {
    const p = AW.$('#popover');
    if (popAnchor === anchor) { AW.closePopover(); return null; }
    AW.closePopover();
    p.innerHTML = html; p.hidden = false; popAnchor = anchor; anchor.setAttribute('aria-expanded', 'true');
    const r = anchor.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    let top = place === 'above' ? r.top - h - 8 : r.bottom + 6;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - h - 8);
    if (top < 8) top = 8;
    p.style.left = AW.clamp(place === 'above' ? r.left + r.width / 2 - w / 2 : r.right - w, 8, Math.max(8, innerWidth - w - 8)) + 'px';
    p.style.top = top + 'px';
    if (onMount) onMount(p);
    const f = p.querySelector('button, input, select'); if (f) f.focus();
    return p;
  };
  document.addEventListener('pointerdown', (e) => {
    const p = AW.$('#popover');
    if (p && !p.hidden && !p.contains(e.target) && !(popAnchor && popAnchor.contains(e.target))) AW.closePopover();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popAnchor && !AW.dialogOpen()) { const a = popAnchor; AW.closePopover(); a.focus(); } });

  // ---------- clipboard and file export ----------
  AW.copyText = async (text) => {
    try { await navigator.clipboard.writeText(text); return true; } catch (_) { /* fall through */ }
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch (_) { return false; }
  };
  // Shows the data itself so it can always be copied, even where the viewer blocks file saves.
  AW.showText = (title, text, note) => {
    const body = AW.el('<div class="showtext">' + (note ? '<p class="note"></p>' : '') + '<textarea readonly spellcheck="false" rows="12" aria-label="' + AW.esc(title) + '"></textarea></div>');
    if (note) body.querySelector('.note').textContent = note;
    body.querySelector('textarea').value = text;
    return AW.dialog({
      title, body, wide: true,
      actions: [{ label: AW.t('Copy'), kind: 'primary', keepOpen: true, run: (api, b) => { AW.copyText(text).then((ok) => { if (ok) { b.textContent = AW.t('Copied'); } else { body.querySelector('textarea').select(); } }); return false; } }, { label: AW.t('Close'), value: null }],
    });
  };
  // Saves real data to a file. Resolves {ok, method}. In embedded viewers that block direct downloads it uses the
  // viewer's save prompt; if no save path exists, it shows the content for copying instead of pretending.
  AW.saveFile = async (filename, text) => {
    const cl = window.claude;
    if (cl && typeof cl.use === 'function') {
      let dl = null;
      try { dl = await cl.use('downloads'); } catch (_) { dl = null; }
      if (dl) {
        try { await dl.save({ filename, data: text }); return { ok: true, method: 'viewer' }; }
        catch (e) {
          if (e && e.code === 'declined') return { ok: false, method: 'declined' };
        }
      }
      await AW.showText(filename, text, AW.t('This viewer cannot save files directly. Copy the content below instead.'));
      return { ok: false, method: 'shown' };
    }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: /\.json$/.test(filename) ? 'application/json' : 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { ok: true, method: 'download' };
    } catch (_) {
      await AW.showText(filename, text, AW.t('The browser blocked the download. Copy the content below instead.'));
      return { ok: false, method: 'shown' };
    }
  };
  // Reads a user-chosen text file. Resolves {name, text} or null when cancelled.
  AW.pickFile = (accept) => new Promise((resolve) => {
    const input = document.createElement('input'); input.type = 'file'; if (accept) input.accept = accept;
    input.addEventListener('change', () => {
      const f = input.files && input.files[0]; if (!f) return resolve(null);
      const r = new FileReader(); r.onload = () => resolve({ name: f.name, text: String(r.result) }); r.onerror = () => resolve(null); r.readAsText(f);
    });
    input.click();
  });

  // ---------- shared form fragments ----------
  AW.ui = {
    switch(id, checked, disabled) { return '<input class="switch" type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>'; },
    badge(kind, text) { return '<span class="badge ' + kind + '">' + AW.esc(AW.t(text)) + '</span>'; },
    demo() { return '<span class="badge demo" title="' + AW.esc(AW.t('Simulated by the demo adapter. No real device is involved.')) + '">' + AW.t('Demo') + '</span>'; },
    unavailable(reason) { return '<span class="unavail" title="' + AW.esc(reason || '') + '">' + AW.t('Unavailable') + '</span>'; },
    // Segmented single-choice control built from real radio inputs (keyboard and screen-reader friendly).
    segmented(name, options, value, disabled) {
      return '<div class="seg" role="radiogroup">' + options.map(([v, label]) =>
        '<label><input type="radio" name="' + name + '" value="' + AW.esc(v) + '"' + (String(v) === String(value) ? ' checked' : '') + (disabled ? ' disabled' : '') + '><span>' + AW.esc(AW.t(label)) + '</span></label>').join('') + '</div>';
    },
  };
})();
