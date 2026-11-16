/* AegisWall — logical wall model. Authoritative state for the Wall workspace:
 * draft vs confirmed composition, edit history, pending changes, layouts and all geometry.
 * The logical surface is one continuous plane in pixels with a top-left origin; it is independent of the camera. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, clamp = AW.clamp, clone = AW.clone;
  const MW = AW.svc.limits.monitor.w, MH = AW.svc.limits.monitor.h;
  const MIN_W = 160, MIN_H = 90;

  const S = {
    draft: null, confirmed: null, confirmedAt: null,
    sel: null,             // {kind: 'monitor', id: 'r,c'} | {kind: 'item', id}
    hist: [], fut: [],
    view: 'draft',         // 'draft' | 'onair'
    applying: false, applyError: null, lastAck: null,
  };

  const W = (AW.wall = {
    MW, MH, MIN_W, MIN_H, S,
    tileName(a, b) { if (typeof a === 'string') { const p = a.split(','); a = +p[0]; b = +p[1]; } return String.fromCharCode(65 + a) + (b + 1); },
    comp: () => (S.view === 'draft' ? S.draft : S.confirmed),
    find: (c, id) => c.items.find((i) => i.id === id),
    selectedItem() { return S.sel && S.sel.kind === 'item' && S.view === 'draft' ? W.find(S.draft, S.sel.id) : null; },
    selectedTile() { return S.sel && S.sel.kind === 'monitor' ? S.sel.id : null; },
    size: (c) => ({ w: c.cols * MW, h: c.rows * MH }),

    // ----- geometry -----
    situation(it, c) {
      const w = c.cols * MW, h = c.rows * MH;
      if (it.x >= w || it.y >= h || it.x + it.w <= 0 || it.y + it.h <= 0) return 'outside';
      if (it.x < 0 || it.y < 0 || it.x + it.w > w || it.y + it.h > h) return 'partial';
      return 'inside';
    },
    tileRange(it, c) {
      return {
        c0: clamp(Math.floor(it.x / MW), 0, c.cols - 1), c1: clamp(Math.ceil((it.x + it.w) / MW) - 1, 0, c.cols - 1),
        r0: clamp(Math.floor(it.y / MH), 0, c.rows - 1), r1: clamp(Math.ceil((it.y + it.h) / MH) - 1, 0, c.rows - 1),
      };
    },
    where(it, c) {
      if (W.situation(it, c) === 'outside') return t('outside the wall');
      const f = W.tileRange(it, c), a = W.tileName(f.r0, f.c0), b = W.tileName(f.r1, f.c1);
      return a === b ? a : a + '–' + b;
    },
    itemsOnTile(c, r, k) {
      const x0 = k * MW, y0 = r * MH;
      return c.items.filter((it) => it.x < x0 + MW && it.x + it.w > x0 && it.y < y0 + MH && it.y + it.h > y0);
    },
    fitInto(it, target) {
      if (!it.aspect) return target;
      const q = it.w / it.h;
      let w = target.w, h = w / q;
      if (h > target.h) { h = target.h; w = h * q; }
      return { x: target.x + (target.w - w) / 2, y: target.y + (target.h - h) / 2, w, h };
    },
    round: (r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) }),
    tileCounts(c) {
      const n = { total: c.cols * c.rows, planned: 0, detected: 0, confirmed: 0, missing: 0 };
      for (let r = 0; r < c.rows; r++) for (let k = 0; k < c.cols; k++) n[AW.svc.outputs.tileState(r + ',' + k).state]++;
      return n;
    },
    // Internal split of one monitor into quadrants: [columns, rows]. No record = whole monitor.
    divOf: (c, r, k) => (c.div && c.div[r + ',' + k]) || [1, 1],
    quadrant(c, r, k, i) {
      const [dc, dr] = W.divOf(c, r, k), w = MW / dc, h = MH / dr;
      return { x: k * MW + (i % dc) * w, y: r * MH + Math.floor(i / dc) * h, w, h };
    },
    quadrantAt(c, x, y) {
      const k = clamp(Math.floor(x / MW), 0, c.cols - 1), r = clamp(Math.floor(y / MH), 0, c.rows - 1);
      const [dc, dr] = W.divOf(c, r, k);
      const qc = clamp(Math.floor((x - k * MW) / (MW / dc)), 0, dc - 1), qr = clamp(Math.floor((y - r * MH) / (MH / dr)), 0, dr - 1);
      return Object.assign(W.quadrant(c, r, k, qr * dc + qc), { tile: r + ',' + k });
    },

    // ----- history: real snapshots of the draft -----
    mutate(label, fn, group) {
      if (S.applying) return false;
      if (S.view !== 'draft') W.setView('draft');
      const now = Date.now();
      if (!(group && label === lastLabel && now - lastTime < 900)) { S.hist.push(clone(S.draft)); if (S.hist.length > 80) S.hist.shift(); }
      lastLabel = label; lastTime = now;
      S.fut.length = 0;
      fn(S.draft);
      // `base` remembers the grid before a run of grid changes so "Fit proportionally" knows what to scale from.
      if (label !== 'grid') delete S.draft.base;
      changed(label);
      return true;
    },
    undo() { if (!S.hist.length || S.applying) return false; if (S.view !== 'draft') W.setView('draft'); S.fut.push(clone(S.draft)); S.draft = S.hist.pop(); afterHistory('undo'); return true; },
    redo() { if (!S.fut.length || S.applying) return false; if (S.view !== 'draft') W.setView('draft'); S.hist.push(clone(S.draft)); S.draft = S.fut.pop(); afterHistory('redo'); return true; },

    // ----- pending changes: draft vs confirmed -----
    pending() {
      const a = S.confirmed, r = S.draft;
      let n = 0; const ids = new Set(), notes = [];
      if (a.cols !== r.cols || a.rows !== r.rows) { n++; notes.push(t('Grid {a} → {b}', { a: a.cols + ' × ' + a.rows, b: r.cols + ' × ' + r.rows })); }
      if (sigDiv(a) !== sigDiv(r)) { n++; notes.push(t('Monitor splits changed')); }
      const old = new Map(a.items.map((i) => [i.id, i]));
      let added = 0, edited = 0;
      for (const it of r.items) {
        const o = old.get(it.id);
        if (!o) { n++; added++; ids.add(it.id); } else { if (sig(o) !== sig(it)) { n++; edited++; ids.add(it.id); } old.delete(it.id); }
      }
      n += old.size;
      if (added) notes.push(AW.plural(added, 'content item added', 'content items added'));
      if (edited) notes.push(AW.plural(edited, 'content item changed', 'content items changed'));
      if (old.size) notes.push(AW.plural(old.size, 'content item removed', 'content items removed'));
      const inR = new Set(r.items.map((i) => i.id)), inA = new Set(a.items.map((i) => i.id));
      if (r.items.filter((i) => inA.has(i.id)).map((i) => i.id).join() !== a.items.filter((i) => inR.has(i.id)).map((i) => i.id).join()) { n++; notes.push(t('Layer order changed')); }
      return { n, ids, notes };
    },

    // ----- selection and view -----
    select(sel) {
      const same = (!sel && !S.sel) || (sel && S.sel && sel.kind === S.sel.kind && sel.id === S.sel.id);
      if (same) return;
      S.sel = sel; AW.bus.emit('wall', { reason: 'select' });
    },
    setView(v) { if (S.view === v) return; S.view = v; if (v !== 'draft' && S.sel && S.sel.kind === 'item') S.sel = null; AW.bus.emit('wall', { reason: 'view' }); },

    // ----- grid -----
    setGrid(cols, rows) {
      const L = AW.svc.limits, r = S.draft;
      cols = clamp(Math.round(cols) || 1, 1, L.maxCols); rows = clamp(Math.round(rows) || 1, 1, L.maxRows);
      if (cols === r.cols && rows === r.rows) return false;
      const before = { cols: r.cols, rows: r.rows };
      W.mutate('grid', (d) => {
        const base = d.base || { cols: d.cols, rows: d.rows };
        d.cols = cols; d.rows = rows;
        if (d.div) { for (const key of Object.keys(d.div)) { const [rr, kk] = key.split(',').map(Number); if (rr >= rows || kk >= cols) delete d.div[key]; } if (!Object.keys(d.div).length) delete d.div; }
        if (base.cols === cols && base.rows === rows) delete d.base; else d.base = base;
      });
      if (S.sel && S.sel.kind === 'monitor') { const [rr, kk] = S.sel.id.split(',').map(Number); if (rr >= rows || kk >= cols) S.sel = null; }
      AW.bus.emit('grid', { before, after: { cols, rows } });
      return true;
    },
    outOfBounds() { const r = S.draft; return r.items.filter((i) => W.situation(i, r) !== 'inside'); },
    // "Reposition": move every stray item back inside, shrinking only if it is larger than the wall.
    bringInside() {
      W.mutate('reposition', (d) => {
        const w = d.cols * MW, h = d.rows * MH;
        for (const it of d.items) {
          if (W.situation(it, d) === 'inside') continue;
          if (it.w > w || it.h > h) Object.assign(it, W.round(W.fitInto(Object.assign({}, it, { aspect: true }), { x: 0, y: 0, w: Math.min(it.w, w), h: Math.min(it.h, h) })));
          it.x = clamp(it.x, 0, w - it.w); it.y = clamp(it.y, 0, h - it.h);
        }
      });
    },
    // "Fit proportionally": rescale the whole composition from the grid it was designed for to the current grid.
    fitProportional() {
      const g = S.draft.base; if (!g) return false;
      W.mutate('proportional', (d) => {
        const sx = d.cols / g.cols, sy = d.rows / g.rows;
        for (const it of d.items) {
          const x = Math.round(it.x * sx), y = Math.round(it.y * sy);
          it.w = Math.max(MIN_W, Math.round((it.x + it.w) * sx) - x); it.h = Math.max(MIN_H, Math.round((it.y + it.h) * sy) - y);
          it.x = x; it.y = y;
        }
      });
      return true;
    },

    // ----- content items -----
    firstFreeSlot() {
      const r = S.draft;
      // Pass 0: an empty quadrant on a tile that has a physical output. Pass 1: any empty quadrant.
      // Pass 2: a quadrant whose centre is free.
      for (let pass = 0; pass < 3; pass++) {
        for (let row = 0; row < r.rows; row++) for (let k = 0; k < r.cols; k++) {
          if (pass === 0 && AW.svc.outputs.tileState(row + ',' + k).state === 'planned') continue;
          const [dc, dr] = W.divOf(r, row, k);
          for (let i = 0; i < dc * dr; i++) {
            const q = W.quadrant(r, row, k, i), cx = q.x + q.w / 2, cy = q.y + q.h / 2;
            const busy = r.items.some((it) => (pass < 2 ? it.x < q.x + q.w && it.x + it.w > q.x && it.y < q.y + q.h && it.y + it.h > q.y : cx >= it.x && cx < it.x + it.w && cy >= it.y && cy < it.y + it.h));
            if (!busy) return q;
          }
        }
      }
      return W.quadrant(r, 0, 0, 0);
    },
    addSource(sourceId, target) {
      const src = AW.svc.sources.get(sourceId); if (!src) return null;
      const slot = target || W.firstFreeSlot();
      const item = AW.svc.makeItem(src, { x: 0, y: 0, w: MW, h: MH }, { aspect: src.type === 'camera' || src.type === 'youtube' });
      Object.assign(item, W.round(W.fitInto(item, slot)));
      if (!W.mutate('add', (d) => { d.items.push(item); })) return null;
      W.select({ kind: 'item', id: item.id });
      return item;
    },
    // Removing content never closes or stops its source application.
    removeItem(id) { const ok = W.mutate('remove', (d) => { d.items = d.items.filter((i) => i.id !== id); }); if (ok && S.sel && S.sel.id === id) W.select(null); return ok; },
    duplicate(id) {
      const src = W.find(S.draft, id); if (!src) return null;
      const copy = Object.assign(clone(src), { id: AW.uid('it'), locked: false });
      const sz = W.size(S.draft);
      copy.x = clamp(src.x + 120, 0, Math.max(0, sz.w - copy.w)); copy.y = clamp(src.y + 120, 0, Math.max(0, sz.h - copy.h));
      if (!W.mutate('duplicate', (d) => { d.items.push(copy); })) return null;
      W.select({ kind: 'item', id: copy.id });
      return copy;
    },
    reorder(id, how) {
      W.mutate('order', (d) => {
        const i = d.items.findIndex((x) => x.id === id); if (i < 0) return;
        const [it] = d.items.splice(i, 1);
        const j = how === 'front' ? d.items.length : how === 'back' ? 0 : clamp(i + (how === 'forward' ? 1 : -1), 0, d.items.length);
        d.items.splice(j, 0, it);
      });
    },
    setRect(id, rect, label, group) { W.mutate(label || 'rect', (d) => { const it = W.find(d, id); if (it && !it.locked) Object.assign(it, W.round(rect)); }, group); },
    setProp(id, key, value) { W.mutate('prop-' + key, (d) => { const it = W.find(d, id); if (it) it[key] = value; }, key === 'link'); },
    fit(id, how) {
      const r = S.draft, it = W.find(r, id); if (!it || it.locked) return;
      let target;
      if (how === 'monitor') target = W.quadrantAt(r, it.x + it.w / 2, it.y + it.h / 2);
      else if (how === 'span') { const f = W.tileRange(it, r); target = { x: f.c0 * MW, y: f.r0 * MH, w: (f.c1 - f.c0 + 1) * MW, h: (f.r1 - f.r0 + 1) * MH }; }
      else target = { x: 0, y: 0, w: r.cols * MW, h: r.rows * MH };
      W.setRect(id, W.fitInto(it, target), 'fit');
    },
    // Split monitors into quadrants; content fully inside a monitor is distributed over the new quadrants in reading order.
    split(keys, dc, dr) {
      W.mutate('split', (d) => {
        d.div = d.div || {};
        for (const key of keys) {
          if (dc * dr === 1) { delete d.div[key]; continue; }
          d.div[key] = [dc, dr];
          const [r, k] = key.split(',').map(Number), x0 = k * MW, y0 = r * MH;
          d.items.filter((it) => !it.locked && it.x >= x0 && it.y >= y0 && it.x + it.w <= x0 + MW && it.y + it.h <= y0 + MH)
            .sort((a, b) => a.y - b.y || a.x - b.x).slice(0, dc * dr)
            .forEach((it, i) => Object.assign(it, W.round(W.fitInto(it, W.quadrant(d, r, k, i)))));
        }
        if (!Object.keys(d.div).length) delete d.div;
      });
    },

    // ----- snapping and drag math (pure functions; the UI calls them every frame while dragging) -----
    snapLines(ignoreId) {
      const r = S.draft, xs = [], ys = [];
      for (let k = 0; k <= r.cols; k++) xs.push(k * MW);
      for (let y = 0; y <= r.rows; y++) ys.push(y * MH);
      for (const key in r.div || {}) {
        const [row, k] = key.split(',').map(Number), [dc, dr] = r.div[key];
        for (let i = 1; i < dc; i++) xs.push(k * MW + (MW * i) / dc);
        for (let i = 1; i < dr; i++) ys.push(row * MH + (MH * i) / dr);
      }
      for (const it of r.items) { if (it.id === ignoreId) continue; xs.push(it.x, it.x + it.w); ys.push(it.y, it.y + it.h); }
      return { xs, ys };
    },
    snapTo(v, lines, tol) { let best = null, bd = tol; for (const l of lines) { const d = Math.abs(l - v); if (d < bd) { bd = d; best = l; } } return best; },
    calcMove(start, dx, dy, lines, tol) {
      let x = start.x + dx, y = start.y + dy, gx = null, gy = null;
      if (lines) {
        const a = W.snapTo(x, lines.xs, tol), b = W.snapTo(x + start.w, lines.xs, tol);
        if (a != null) { x = a; gx = a; } else if (b != null) { x = b - start.w; gx = b; }
        const c = W.snapTo(y, lines.ys, tol), d = W.snapTo(y + start.h, lines.ys, tol);
        if (c != null) { y = c; gy = c; } else if (d != null) { y = d - start.h; gy = d; }
      }
      return { x, y, w: start.w, h: start.h, gx, gy };
    },
    calcResize(start, dir, dx, dy, lines, tol, aspect) {
      let x0 = start.x, y0 = start.y, x1 = start.x + start.w, y1 = start.y + start.h, gx = null, gy = null;
      if (dir.includes('w')) x0 += dx; if (dir.includes('e')) x1 += dx;
      if (dir.includes('n')) y0 += dy; if (dir.includes('s')) y1 += dy;
      if (lines) {
        if (dir.includes('w')) { const s = W.snapTo(x0, lines.xs, tol); if (s != null) { x0 = s; gx = s; } }
        if (dir.includes('e')) { const s = W.snapTo(x1, lines.xs, tol); if (s != null) { x1 = s; gx = s; } }
        if (dir.includes('n')) { const s = W.snapTo(y0, lines.ys, tol); if (s != null) { y0 = s; gy = s; } }
        if (dir.includes('s')) { const s = W.snapTo(y1, lines.ys, tol); if (s != null) { y1 = s; gy = s; } }
      }
      if (dir.includes('w')) x0 = Math.min(x0, x1 - MIN_W); else x1 = Math.max(x1, x0 + MIN_W);
      if (dir.includes('n')) y0 = Math.min(y0, y1 - MIN_H); else y1 = Math.max(y1, y0 + MIN_H);
      if (aspect) {
        const q = start.w / start.h;
        let w = x1 - x0, h = y1 - y0;
        if (dir === 'n' || dir === 's') w = h * q; else if (dir === 'e' || dir === 'w') h = w / q; else if (w / h > q) h = w / q; else w = h * q;
        if (dir.includes('w')) x0 = x1 - w; else if (dir === 'n' || dir === 's') { x0 = start.x + (start.w - w) / 2; } x1 = x0 + w;
        if (dir.includes('n')) y0 = y1 - h; else if (dir === 'e' || dir === 'w') { y0 = start.y + (start.h - h) / 2; } y1 = y0 + h;
      }
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, gx, gy };
    },

    // ----- apply / discard -----
    async apply() {
      if (S.applying) return null;
      const p = W.pending(); if (!p.n) return null;
      const sent = clone(S.draft); delete sent.base;
      S.applying = true; S.applyError = null;
      AW.bus.emit('wall', { reason: 'applying' });
      try {
        const ack = await AW.svc.wall.apply(sent);
        // Only the acknowledged composition becomes "confirmed".
        S.confirmed = sent; S.confirmedAt = ack.confirmedAt; S.lastAck = ack;
        delete S.draft.base;
        S.applying = false;
        AW.bus.emit('wall', { reason: 'applied', ack });
        return ack;
      } catch (e) {
        S.applying = false; S.applyError = e.message;   // the draft is untouched
        AW.bus.emit('wall', { reason: 'apply-failed', error: e });
        throw e;
      }
    },
    discard() {
      if (S.applying) return;
      const from = clone(S.draft);
      S.hist.push(from); S.fut.length = 0;      // discarding is itself undoable
      S.draft = clone(S.confirmed); S.applyError = null;
      if (S.sel && S.sel.kind === 'item' && !W.find(S.draft, S.sel.id)) S.sel = null;
      changed('discard', from);
    },

    // ----- named layouts (persisted locally) -----
    layouts: {
      list: () => AW.store.get('layouts', []),
      save(name) {
        const list = this.list(), c = clone(S.draft); delete c.base;
        const entry = { id: AW.uid('lay'), name, savedAt: Date.now(), composition: c };
        list.push(entry); AW.store.set('layouts', list);
        AW.audit('layout.saved', { name });
        AW.bus.emit('layouts', list);
        return entry;
      },
      overwrite(id) { const list = this.list(), e = list.find((x) => x.id === id); if (!e) return; const c = clone(S.draft); delete c.base; e.composition = c; e.savedAt = Date.now(); AW.store.set('layouts', list); AW.bus.emit('layouts', list); },
      rename(id, name) { const list = this.list(), e = list.find((x) => x.id === id); if (!e) return; e.name = name; AW.store.set('layouts', list); AW.bus.emit('layouts', list); },
      remove(id) { const list = this.list().filter((x) => x.id !== id); AW.store.set('layouts', list); AW.audit('layout.deleted', { id }); AW.bus.emit('layouts', list); },
      // Loading changes only the draft. Sending it to the hardware stays an explicit Apply.
      load(id) {
        const e = this.list().find((x) => x.id === id); if (!e || S.applying) return false;
        const from = clone(S.draft);
        const next = clone(e.composition), L = AW.svc.limits;
        next.cols = clamp(next.cols, 1, L.maxCols); next.rows = clamp(next.rows, 1, L.maxRows);
        if (S.view !== 'draft') S.view = 'draft';
        S.hist.push(from); S.fut.length = 0; S.draft = next; S.sel = null;
        if (from.cols !== next.cols || from.rows !== next.rows) AW.bus.emit('grid', { before: { cols: from.cols, rows: from.rows }, after: { cols: next.cols, rows: next.rows } });
        changed('recall', from);
        return true;
      },
    },

    async init() {
      const c = await AW.svc.wall.getConfirmed();
      S.confirmed = c.composition; S.confirmedAt = c.confirmedAt;
      const saved = AW.store.get('wall.draft', null);
      S.draft = saved && saved.items ? saved : clone(S.confirmed);
      S.hist = []; S.fut = []; S.sel = null; S.view = 'draft';
    },
  });

  let lastLabel = '', lastTime = 0, saveTimer = 0;
  const sig = (i) => [i.sourceId, i.x, i.y, i.w, i.h, i.locked, i.aspect, i.contentOnly, i.mosaic, i.link || ''].join(',');
  const sigDiv = (c) => Object.keys(c.div || {}).sort().map((k) => k + ':' + c.div[k].join('x')).join('|');
  function changed(reason, from) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => AW.store.set('wall.draft', S.draft), 300);   // unsaved edits survive a reload
    AW.bus.emit('wall', { reason, from });
  }
  function afterHistory(reason) {
    lastLabel = '';
    if (S.sel && S.sel.kind === 'item' && !W.find(S.draft, S.sel.id)) S.sel = null;
    if (S.sel && S.sel.kind === 'monitor') { const [r, k] = S.sel.id.split(',').map(Number); if (r >= S.draft.rows || k >= S.draft.cols) S.sel = null; }
    AW.bus.emit('grid', { before: null, after: { cols: S.draft.cols, rows: S.draft.rows } });
    changed(reason);
  }
})();
