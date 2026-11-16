/* AegisWall — Wall workspace, part 2: the single contextual inspector (wall / monitor / content),
 * monitor splitting, per-content link preview and the saved-layouts shelf. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$, clamp = AW.clamp;
  const W = AW.wall, S = W.S, MW = W.MW, MH = W.MH, U = AW.wallUI, stage = AW.stage;
  const TYPES = U.TYPES;
  const SPLITS = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 3], [4, 4]];
  const STATE = {
    planned: ['warn', 'Planned', 'A virtual tile in the layout. It has no physical output, so nothing is displayed.'],
    detected: ['info', 'Detected output', 'A physical output is assigned but the mapping has not been confirmed on the hardware.'],
    confirmed: ['ok', 'Confirmed mapping', 'The controller confirmed that this output drives this tile.'],
    missing: ['bad', 'Output missing', 'The mapped output is not detected. Check the cable and the graphics adapter.'],
  };
  const I = (AW.wallInspector = { sig: '', preview: { id: null, on: false }, shelfView: AW.store.get('shelf.view', 'cards'), shelfSel: null });
  let host;

  // ------------------------------------------------------------------ fragments
  const num = (label, prop, v, dis) => '<label class="numfield"><span>' + label + '</span><input type="number" step="1" data-prop="' + prop + '" value="' + v + '"' + (dis ? ' disabled' : '') + ' aria-label="' + label + '"></label>';
  const toggle = (label, key, on, note, dis) => '<label class="opt"><span class="opt-label">' + esc(t(label)) + '</span>' +
    '<input class="switch" type="checkbox" data-toggle="' + key + '"' + (on ? ' checked' : '') + (dis ? ' disabled' : '') + '><small>' + esc(t(note)) + '</small></label>';
  const stepper = (label, key, v, min, max, dis) => '<div class="stepper" role="group" aria-label="' + esc(t(label)) + '"><span class="stepper-label">' + esc(t(label)) + '</span>' +
    '<button type="button" data-step="' + key + '" data-d="-1" aria-label="' + esc(t('Decrease {x}', { x: t(label).toLowerCase() })) + '"' + (dis || v <= min ? ' disabled' : '') + '>' + icon('minus') + '</button>' +
    '<input type="number" inputmode="numeric" min="' + min + '" max="' + max + '" step="1" data-grid="' + key + '" value="' + v + '" aria-label="' + esc(t(label)) + '"' + (dis ? ' disabled' : '') + '>' +
    '<button type="button" data-step="' + key + '" data-d="1" aria-label="' + esc(t('Increase {x}', { x: t(label).toLowerCase() })) + '"' + (dis || v >= max ? ' disabled' : '') + '>' + icon('plus') + '</button></div>';
  const glyph = (dc, dr) => { let d = ''; for (let i = 1; i < dc; i++) d += 'M' + (1 + (22 * i) / dc) + ' 1v13'; for (let i = 1; i < dr; i++) d += 'M1 ' + (1 + (13 * i) / dr) + 'h22'; return '<svg viewBox="0 0 24 15" aria-hidden="true"><rect x="1" y="1" width="22" height="13" rx="1.5"/>' + (d ? '<path d="' + d + '"/>' : '') + '</svg>'; };
  const head = (title, sub, closeLabel) => '<header class="panel-head"><div class="panel-title"><h2>' + title + '</h2>' + (sub ? '<span class="muted">' + sub + '</span>' : '') + '</div>' +
    (closeLabel ? '<button class="icon-btn" type="button" data-act="deselect" aria-label="' + esc(closeLabel) + '" title="' + esc(closeLabel) + '">' + icon('left') + '</button>' : '') +
    '<button class="icon-btn" type="button" data-act="collapse" aria-label="' + esc(t('Collapse inspector')) + '" title="' + esc(t('Collapse')) + '">' + icon('panel-r') + '</button></header>';
  const layerRow = (it, c) => '<button class="layer" type="button" data-select="' + it.id + '">' + icon(TYPES[it.type].ic) + '<span><b>' + esc(it.name) + '</b><small>' + esc(W.where(it, c)) + '</small></span>' + (it.locked ? icon('lock', 'ic-s') : '') + '</button>';

  // ------------------------------------------------------------------ the three inspectors
  function wallView() {
    const c = W.comp(), L = AW.svc.limits, ro = S.view !== 'draft' || S.applying, n = W.tileCounts(c);
    const real = n.total - n.planned;
    return head(esc(t('Wall')), esc(AW.svc.outputs.wallName())) + '<div class="panel-body">' +
      '<section class="block"><h3>' + esc(t('Monitor grid')) + '</h3>' +
      stepper('Columns', 'cols', c.cols, 1, L.maxCols, ro) + stepper('Rows', 'rows', c.rows, 1, L.maxRows, ro) +
      '<p class="grid-total" aria-live="polite"><span>' + c.cols + ' × ' + c.rows + ' =</span> <b>' + AW.plural(n.total, 'monitor', 'monitors') + '</b></p>' +
      '<p class="note">' + (n.planned ? esc(t('{real} with a physical output · {planned} planned (virtual). A planned tile does not create an output.', { real, planned: n.planned })) : esc(t('All tiles have a physical output.'))) +
      ' ' + esc(t('Limit from the controller: {c} × {r}.', { c: L.maxCols, r: L.maxRows })) + '</p>' +
      (ro ? '<p class="note">' + esc(S.applying ? t('Locked while the composition is being sent.') : t('The on-air view is read-only. Switch to Draft to edit.')) + '</p>' : '') +
      '<button class="btn" type="button" data-act="split"' + (ro ? ' disabled' : '') + ' aria-haspopup="true">' + icon('mosaic') + esc(t('Split monitors…')) + '</button></section>' +
      '<section class="block"><h3>' + esc(t('Showing')) + '</h3>' + AW.ui.segmented('wall-view', [['draft', 'Draft'], ['onair', 'On air']], S.view) +
      '<p class="note">' + esc(S.view === 'draft' ? t('The draft is what you edit. Nothing reaches the displays until you Apply.') : t('Last composition confirmed by the controller at {time}.', { time: AW.fmtTime(S.confirmedAt) })) + '</p></section>' +
      '<section class="block"><h3>' + esc(t('Editing')) + '</h3>' + toggle('Snapping', 'snapping', AW.prefs.snapping, 'Snap to monitor, split and content edges. Hold Alt to bypass.') + '</section>' +
      '<section class="block"><h3>' + esc(t('Content')) + ' <span class="muted">' + c.items.length + '</span></h3>' +
      (c.items.length ? '<div class="layers">' + c.items.slice().reverse().map((it) => layerRow(it, c)).join('') + '</div>' : '<p class="empty">' + esc(t('No content yet. Drag a source onto a monitor or use Add in the source library.')) + '</p>') + '</section>' +
      '<section class="block facts"><p><span>' + esc(t('Logical surface')) + '</span><b>' + c.cols * MW + ' × ' + c.rows * MH + ' px</b></p>' +
      '<p><span>' + esc(t('Last confirmation')) + '</span><b>' + AW.fmtTime(S.confirmedAt) + '</b> ' + AW.ui.demo() + '</p></section></div>';
  }
  function monitorView(key) {
    const c = W.comp(), [r, k] = key.split(',').map(Number), st = AW.svc.outputs.tileState(key), info = STATE[st.state];
    const o = st.output && st.output.id ? st.output : null, ro = S.view !== 'draft' || S.applying;
    const items = W.itemsOnTile(c, r, k), [dc, dr] = W.divOf(c, r, k);
    let opts = '';
    for (let rr = 0; rr < c.rows; rr++) for (let kk = 0; kk < c.cols; kk++) opts += '<option value="' + rr + ',' + kk + '"' + (rr + ',' + kk === key ? ' selected' : '') + '>' + W.tileName(rr, kk) + '</option>';
    return head(esc(t('Monitor {id}', { id: W.tileName(key) })), esc(t('Row {r}, column {c}', { r: r + 1, c: k + 1 })), t('Back to wall')) + '<div class="panel-body">' +
      '<section class="block"><label class="rowfield"><span>' + esc(t('Monitor')) + '</span><select data-pick-monitor aria-label="' + esc(t('Select a monitor')) + '">' + opts + '</select></label></section>' +
      '<section class="block"><h3>' + esc(t('Hardware')) + '</h3><p>' + AW.ui.badge(info[0], info[1]) + '</p><p class="note">' + esc(t(info[2])) + '</p>' +
      '<div class="facts"><p><span>' + esc(t('Output')) + '</span><b>' + (o ? esc(o.id) : st.state === 'missing' ? esc(st.output) : '—') + '</b></p>' +
      '<p><span>' + esc(t('Resolution')) + '</span><b>' + (o ? o.width + ' × ' + o.height : AW.ui.unavailable(t('No physical output'))) + '</b></p>' +
      '<p><span>' + esc(t('Refresh rate')) + '</span><b>' + (o ? o.hz + ' Hz' : AW.ui.unavailable(t('No physical output'))) + '</b></p>' +
      '<p><span>' + esc(t('Logical region')) + '</span><b>' + k * MW + ', ' + r * MH + ' · ' + MW + ' × ' + MH + '</b></p></div>' +
      '<p class="note">' + esc(t('Output properties are read-only here: they are reported by the hardware.')) + '</p>' +
      '<button class="btn" type="button" data-act="mapping">' + esc(t('Open hardware mapping')) + '</button></section>' +
      '<section class="block"><h3>' + esc(t('Split this monitor')) + '</h3><div class="split-opts">' +
      SPLITS.map(([a, b]) => '<button type="button" data-split="' + a + ',' + b + '" aria-pressed="' + (a === dc && b === dr) + '"' + (ro ? ' disabled' : '') + ' title="' + esc(a * b === 1 ? t('Whole monitor') : t('{a} columns by {b} rows', { a, b })) + '">' + glyph(a, b) + '<span>' + (a * b === 1 ? '1' : a + '×' + b) + '</span></button>').join('') + '</div>' +
      '<p class="note">' + esc(t('Quadrants are placement guides inside one display. They do not change the physical grid.')) + '</p></section>' +
      '<section class="block"><h3>' + esc(t('Content on this monitor')) + ' <span class="muted">' + items.length + '</span></h3>' +
      (items.length ? '<div class="layers">' + items.slice().reverse().map((it) => layerRow(it, c)).join('') + '</div>' : '<p class="empty">' + esc(t('Nothing here yet.')) + '</p>') + '</section>' +
      '<section class="block"><button class="btn" type="button" data-act="focus">' + icon('target') + esc(t('Focus view on this monitor')) + '</button></section></div>';
  }
  function contentView(it) {
    const c = S.draft, sit = W.situation(it, c), lk = it.locked, busy = S.applying, dis = lk || busy;
    const src = AW.svc.sources.get(it.sourceId), link = parseLink(it.link);
    const idx = c.items.indexOf(it), top = idx === c.items.length - 1, bottom = idx === 0;
    let h = head(esc(it.name), esc(t(TYPES[it.type].label)) + ' · ' + esc(W.where(it, c)), t('Back to wall')) + '<div class="panel-body">';
    const flags = (sit !== 'inside' ? AW.ui.badge('warn', sit === 'outside' ? 'Outside the wall' : 'Partly outside the wall') : '') + (src && !src.available ? AW.ui.badge('bad', 'Source unavailable') : '');
    if (flags) h += '<section class="block"><p class="badges">' + flags + '</p></section>';
    h += '<section class="block"><h3>' + esc(t('Position and size')) + '</h3><div class="grid-2">' + num('X', 'x', it.x, dis) + num('Y', 'y', it.y, dis) + num('W', 'w', it.w, dis) + num('H', 'h', it.h, dis) + '</div>' +
      '<p class="field-error" data-err role="alert" hidden></p>' +
      '<p class="note">' + esc(t('Pixels on the logical wall surface, independent of the camera.')) + '</p>' +
      '<div class="btn-row"><button class="btn btn-small" type="button" data-fit="monitor"' + (dis ? ' disabled' : '') + '>' + esc(t('Fit to monitor')) + '</button>' +
      '<button class="btn btn-small" type="button" data-fit="span"' + (dis ? ' disabled' : '') + '>' + esc(t('Fill spanned monitors')) + '</button>' +
      '<button class="btn btn-small" type="button" data-fit="wall"' + (dis ? ' disabled' : '') + '>' + esc(t('Entire wall')) + '</button></div>' +
      toggle('Lock aspect ratio', 'aspect', it.aspect, 'Resizing and fitting keep the picture undistorted.', busy) +
      toggle('Lock position', 'locked', it.locked, 'Prevents moving or resizing by accident.', busy) + '</section>';
    h += '<section class="block"><h3>' + esc(t('Layer order')) + '</h3><div class="btn-row">' +
      '<button class="btn btn-small" type="button" data-order="front"' + (top || busy ? ' disabled' : '') + '>' + esc(t('To front')) + '</button><button class="btn btn-small" type="button" data-order="forward"' + (top || busy ? ' disabled' : '') + '>' + esc(t('Forward')) + '</button>' +
      '<button class="btn btn-small" type="button" data-order="backward"' + (bottom || busy ? ' disabled' : '') + '>' + esc(t('Backward')) + '</button><button class="btn btn-small" type="button" data-order="back"' + (bottom || busy ? ' disabled' : '') + '>' + esc(t('To back')) + '</button></div>' +
      '<p class="note">' + esc(t('Layer {n} of {m}.', { n: idx + 1, m: c.items.length })) + '</p></section>';
    if (it.type === 'mosaic') h += '<section class="block"><h3>' + esc(t('Camera mosaic')) + '</h3><label class="rowfield"><span>' + esc(t('Division')) + '</span><select data-mosaic' + (busy ? ' disabled' : '') + '>' +
      [2, 3, 4].map((n) => '<option value="' + n + '"' + (n === it.mosaic ? ' selected' : '') + '>' + n + ' × ' + n + ' · ' + n * n + ' ' + esc(t('cameras')) + '</option>').join('') + '</select></label>' +
      '<p class="note">' + esc(t('Divides this content internally. It does not change the grid of physical monitors.')) + '</p></section>';
    if (it.type === 'app') h += '<section class="block"><h3>' + esc(t('Source window')) + ' ' + AW.ui.demo() + '</h3>' +
      toggle('Content area only', 'contentOnly', it.contentOnly, 'Hides the title bar in this demo preview. On a live system, cropping window chrome needs documented integration support.', busy) + '</section>';
    h += '<section class="block"><h3>' + esc(t('Link')) + '</h3><input type="url" data-link value="' + esc(it.link || '') + '" placeholder="https://…" spellcheck="false" aria-label="' + esc(t('Content link')) + '"' + (busy ? ' disabled' : '') + '>' +
      '<p class="note' + (link && link.kind === 'invalid' ? ' bad' : '') + '">' + esc(link ? link.note : t('Optional. A YouTube, web page, image or video address to preview for this content.')) + '</p>' +
      (link && link.kind !== 'invalid' ? '<div class="link-preview" data-preview-box hidden></div><div class="btn-row"><button class="btn btn-small" type="button" data-act="preview">' + icon('play') + esc(t('Play link preview')) + '</button>' +
        '<a class="btn btn-small" href="' + esc(link.href) + '" target="_blank" rel="noopener noreferrer">' + icon('link') + esc(t('Open in new tab')) + '</a></div>' : '') + '</section>';
    h += '<section class="block"><div class="btn-row"><button class="btn" type="button" data-act="duplicate"' + (busy ? ' disabled' : '') + '>' + icon('copy') + esc(t('Duplicate')) + '</button>' +
      '<button class="btn btn-danger-quiet" type="button" data-act="remove"' + (busy ? ' disabled' : '') + '>' + icon('trash') + esc(t('Remove from wall')) + '</button></div>' +
      '<p class="note">' + esc(t('Removing content never closes its source application.')) + '</p></section></div>';
    return h;
  }

  // ------------------------------------------------------------------ render (only when something relevant changed)
  I.render = function (force) {
    host = host || U.el.inspector;
    if (!U.inspOpen && !force) return;
    const it = W.selectedItem(), tile = W.selectedTile(), c = W.comp();
    const tileOk = tile && +tile.split(',')[0] < c.rows && +tile.split(',')[1] < c.cols;
    const kind = it ? 'item' : tileOk ? 'monitor' : 'wall';
    const sig = JSON.stringify([kind, it || tile, S.view, S.applying, c.cols, c.rows, c.div || 0, AW.prefs.snapping, S.confirmedAt, kind === 'item' ? S.draft.items.indexOf(it) + '/' + S.draft.items.length : c.items.map((i) => [i.id, i.name, i.locked, i.x, i.y, i.w, i.h]),
      AW.store.get('hw.mapping', 0), AW.demo.unplugOutput, AW.svc.outputs.wallName(), AW.prefs.clock]);
    if (sig === I.sig && !force) return;
    I.sig = sig;
    const active = document.activeElement, focusKey = host.contains(active) ? (active.dataset.prop ? 'prop:' + active.dataset.prop : active.dataset.grid ? 'grid:' + active.dataset.grid : active.dataset.step ? 'step:' + active.dataset.step + active.dataset.d : active.hasAttribute('data-link') ? 'link' : null) : null;
    const scroll = host.querySelector('.panel-body') ? host.querySelector('.panel-body').scrollTop : 0;
    if (!(it && I.preview.id === it.id)) I.stopPreview();
    const keepPreview = it && I.preview.on && I.preview.id === it.id ? host.querySelector('[data-preview-box]') : null;
    host.innerHTML = kind === 'item' ? contentView(it) : kind === 'monitor' ? monitorView(tile) : wallView();
    host.dataset.kind = kind;
    if (keepPreview) { const box = host.querySelector('[data-preview-box]'); if (box) { box.replaceWith(keepPreview); setPreviewButton(true); } else I.stopPreview(); }
    if (I.lastKind === kind) host.querySelector('.panel-body').scrollTop = scroll;
    I.lastKind = kind;
    if (focusKey) {
      const [a, b] = focusKey.split(':');
      const n = a === 'prop' ? host.querySelector('[data-prop="' + b + '"]') : a === 'grid' ? host.querySelector('[data-grid="' + b + '"]') : a === 'step' ? host.querySelector('[data-step="' + b.slice(0, -1).replace(/-$/, '') + '"][data-d="' + (b.endsWith('-1') ? '-1' : '1') + '"]') : host.querySelector('[data-link]');
      if (n && !n.disabled) n.focus({ preventScroll: true }); else if (a === 'step') { const g = host.querySelector('[data-grid]'); if (g) g.focus({ preventScroll: true }); }
    }
  };

  I.bind = function () {
    host = U.el.inspector;
    host.addEventListener('click', (e) => {
      const q = (sel) => e.target.closest(sel);
      let b;
      if ((b = q('[data-step]'))) { const c = S.draft; const cols = c.cols + (b.dataset.step === 'cols' ? +b.dataset.d : 0), rows = c.rows + (b.dataset.step === 'rows' ? +b.dataset.d : 0); W.setGrid(cols, rows); return; }
      if ((b = q('[data-select]'))) { if (S.view !== 'draft') W.setView('draft'); W.select({ kind: 'item', id: b.dataset.select }); return; }
      if ((b = q('[data-fit]'))) { const it = W.selectedItem(); if (it) W.fit(it.id, b.dataset.fit); return; }
      if ((b = q('[data-order]'))) { const it = W.selectedItem(); if (it) W.reorder(it.id, b.dataset.order); return; }
      if ((b = q('[data-split]'))) { const tile = W.selectedTile(); if (tile) { const [a, c2] = b.dataset.split.split(',').map(Number); W.split([tile], a, c2); } return; }
      if ((b = q('[data-act]'))) {
        const a = b.dataset.act, it = W.selectedItem(), tile = W.selectedTile();
        if (a === 'collapse') U.togglePanel('insp', false);
        else if (a === 'deselect') W.select(null);
        else if (a === 'split') openSplit(b);
        else if (a === 'focus' && tile) stage.focusTile(tile);
        else if (a === 'mapping') AW.app.go('settings', 'hardware');
        else if (a === 'duplicate' && it) W.duplicate(it.id);
        else if (a === 'remove' && it) U.removeItem(it.id);
        else if (a === 'preview' && it) (I.preview.on ? I.stopPreview() : startPreview(it));
      }
    });
    host.addEventListener('change', (e) => {
      const n = e.target, it = W.selectedItem();
      if (n.name === 'wall-view') { W.setView(n.value); return; }
      if (n.dataset.grid) { commitGrid(n); return; }
      if (n.hasAttribute('data-pick-monitor')) { W.select({ kind: 'monitor', id: n.value }); return; }
      if (n.dataset.toggle === 'snapping') { AW.savePrefs({ snapping: n.checked }); return; }
      if (!it) return;
      if (n.dataset.toggle) W.setProp(it.id, n.dataset.toggle, n.checked);
      else if (n.dataset.prop) commitNumber(n, it);
      else if (n.hasAttribute('data-mosaic')) W.setProp(it.id, 'mosaic', +n.value);
      else if (n.hasAttribute('data-link')) { I.stopPreview(); W.setProp(it.id, 'link', n.value.trim()); }
    });
    host.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input[type="number"], input[type="url"]')) { e.preventDefault(); e.target.blur(); e.target.focus(); } });
  };
  function commitGrid(input) {
    const L = AW.svc.limits, key = input.dataset.grid, max = key === 'cols' ? L.maxCols : L.maxRows;
    const v = Number(input.value);
    if (!Number.isInteger(v) || v < 1 || v > max) {
      AW.toast('warn', t('{what} must be a whole number from 1 to {max}.', { what: t(key === 'cols' ? 'Columns' : 'Rows'), max }));
      input.value = S.draft[key]; return;
    }
    W.setGrid(key === 'cols' ? v : S.draft.cols, key === 'rows' ? v : S.draft.rows);
  }
  function commitNumber(input, it) {
    const prop = input.dataset.prop, v = Number(input.value), err = host.querySelector('[data-err]');
    const min = prop === 'w' ? W.MIN_W : prop === 'h' ? W.MIN_H : -1e6;
    const problem = !Number.isFinite(v) || input.value.trim() === '' ? t('Enter a number.') : v < min ? t('Minimum is {min} px.', { min }) : Math.abs(v) > 1e6 ? t('Value is out of range.') : null;
    if (problem) { err.textContent = problem; err.hidden = false; input.value = it[prop]; input.setAttribute('aria-invalid', 'true'); return; }
    const rect = { x: it.x, y: it.y, w: it.w, h: it.h };
    rect[prop] = Math.round(v);
    if (it.aspect && (prop === 'w' || prop === 'h')) { const q = it.w / it.h; if (prop === 'w') rect.h = Math.max(W.MIN_H, Math.round(rect.w / q)); else rect.w = Math.max(W.MIN_W, Math.round(rect.h * q)); }
    W.setRect(it.id, rect, 'numeric');
  }

  // ------------------------------------------------------------------ split several monitors at once
  function openSplit(anchor) {
    const all = () => { const s = new Set(), r = S.draft; for (let a = 0; a < r.rows; a++) for (let b = 0; b < r.cols; b++) s.add(a + ',' + b); return s; };
    let sel = all();
    const html = () => {
      const r = S.draft; let map = '';
      for (let a = 0; a < r.rows; a++) for (let b = 0; b < r.cols; b++) {
        const key = a + ',' + b, d = r.div && r.div[key];
        map += '<button type="button" data-mon="' + key + '" aria-pressed="' + sel.has(key) + '" aria-label="' + esc(t('Monitor {id}', { id: W.tileName(a, b) })) + '"><b>' + W.tileName(a, b) + '</b><span>' + (d ? d[0] + '×' + d[1] : '') + '</span></button>';
      }
      return '<h3>' + esc(t('Split monitors')) + '</h3><div class="split-map" style="grid-template-columns:repeat(' + r.cols + ',1fr)">' + map + '</div>' +
        '<div class="pop-row"><span class="muted">' + esc(AW.plural(sel.size, 'monitor selected', 'monitors selected')) + '</span><button class="btn btn-small" type="button" data-all>' + esc(t(sel.size === r.cols * r.rows ? 'None' : 'All')) + '</button></div>' +
        '<div class="split-opts">' + SPLITS.map(([a, b]) => '<button type="button" data-div="' + a + ',' + b + '"' + (sel.size ? '' : ' disabled') + ' title="' + esc(a * b === 1 ? t('Whole monitor') : t('{a} columns by {b} rows', { a, b })) + '">' + glyph(a, b) + '<span>' + (a * b === 1 ? '1' : a + '×' + b) + '</span></button>').join('') + '</div>' +
        '<p class="note">' + esc(t('Content inside each monitor is distributed over its quadrants; new sources go to the first free quadrant.')) + '</p>';
    };
    AW.popover(anchor, html(), (p) => {
      p.classList.add('pop-split');
      p.onclick = (e) => {
        const m = e.target.closest('[data-mon]'), a = e.target.closest('[data-all]'), d = e.target.closest('[data-div]');
        if (m) { if (!sel.delete(m.dataset.mon)) sel.add(m.dataset.mon); }
        else if (a) sel = sel.size === S.draft.cols * S.draft.rows ? new Set() : all();
        else if (d && sel.size) { const [x, y] = d.dataset.div.split(',').map(Number); W.split([...sel], x, y); }
        else return;
        p.innerHTML = html();
      };
    });
  }

  // ------------------------------------------------------------------ link preview (on demand, released when not needed)
  function parseLink(link) {
    if (!link) return null;
    let u;
    try { u = new URL(link); } catch (_) { return { kind: 'invalid', note: t('Invalid address. Use the form https://…') }; }
    if (u.protocol === 'rtsp:' || u.protocol === 'rtmp:') return { kind: 'invalid', note: t('Browsers cannot play {p}. Use the camera\'s HTTP address (MJPEG, HLS or its web page).', { p: u.protocol.slice(0, -1).toUpperCase() }) };
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { kind: 'invalid', note: t('Only http:// and https:// addresses are accepted.') };
    const hostName = u.hostname.replace(/^www\./, ''), path = u.pathname.toLowerCase();
    let yt = null;
    if (hostName === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(hostName)) { const m = u.pathname.match(/^\/(embed|live|shorts)\/([\w-]+)/); yt = m ? m[2] : u.searchParams.get('v'); }
    if (yt && /^[\w-]{6,20}$/.test(yt)) return { kind: 'youtube', href: u.href, src: 'https://www.youtube.com/embed/' + yt + '?autoplay=1&mute=1&playsinline=1', note: t('YouTube video. Plays muted in the preview below.') };
    if (/\.(jpe?g|png|gif|webp|mjpe?g)$/.test(path) || /mjpe?g/.test(path + u.search.toLowerCase())) return { kind: 'image', href: u.href, src: u.href, note: t('Image or MJPEG camera stream.') };
    if (/\.(mp4|webm|ogv|m3u8)$/.test(path)) return { kind: 'video', href: u.href, src: u.href, note: t('Video. Plays muted in the preview below.') + (path.endsWith('.m3u8') ? ' ' + t('HLS support depends on the browser.') : '') };
    return { kind: 'page', href: u.href, src: u.href, note: t('Web page. Sites that forbid embedding stay blank; use Open in new tab.') };
  }
  function setPreviewButton(on) { const b = host.querySelector('[data-act="preview"]'); if (b) b.innerHTML = on ? icon('stop') + esc(t('Stop preview')) : icon('play') + esc(t('Play link preview')); }
  function startPreview(it) {
    const link = parseLink(it.link), box = host.querySelector('[data-preview-box]'); if (!link || !box) return;
    box.hidden = false; box.innerHTML = '';
    if ((window.AW_ENV && window.AW_ENV.viewer) && (link.kind === 'youtube' || link.kind === 'page')) {
      box.innerHTML = '<p class="note">' + esc(t('This viewer does not allow embedding other sites. Use Open in new tab; embedding works when AegisWall runs from its own address.')) + '</p>';
    } else if (link.kind === 'image') { const img = new Image(); img.alt = t('Link preview'); img.src = link.src; img.onerror = () => { box.innerHTML = '<p class="note bad">' + esc(t('The image could not be loaded.')) + '</p>'; }; box.appendChild(img); }
    else if (link.kind === 'video') { const v = document.createElement('video'); v.muted = true; v.autoplay = true; v.loop = true; v.playsInline = true; v.controls = true; v.src = link.src; v.onerror = () => { box.innerHTML = '<p class="note bad">' + esc(t('The video could not be played in this browser.')) + '</p>'; }; box.appendChild(v); }
    else { const f = document.createElement('iframe'); f.title = t('Link preview'); f.src = link.src; f.setAttribute('allow', 'autoplay; encrypted-media'); f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin'); if (link.kind === 'page') f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms'); box.appendChild(f); }
    I.preview = { id: it.id, on: true }; setPreviewButton(true);
  }
  I.stopPreview = function () {
    if (!I.preview.on) return;
    I.preview = { id: null, on: false };
    const box = host && host.querySelector('[data-preview-box]');
    if (box) { box.innerHTML = ''; box.hidden = true; }      // drops the iframe/stream and frees its memory
    if (host) setPreviewButton(false);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) I.stopPreview(); });

  // ------------------------------------------------------------------ saved layouts shelf (carousel + accessible list)
  const thumb = (c) => {
    const w = c.cols * 16, h = c.rows * 9; let s = '';
    for (const it of c.items) s += '<rect class="th-item" x="' + ((it.x / MW) * 16).toFixed(2) + '" y="' + ((it.y / MH) * 9).toFixed(2) + '" width="' + ((it.w / MW) * 16).toFixed(2) + '" height="' + ((it.h / MH) * 9).toFixed(2) + '" rx=".4"/>';
    for (let k = 1; k < c.cols; k++) s += '<path class="th-line" d="M' + k * 16 + ' 0V' + h + '"/>';
    for (let r = 1; r < c.rows; r++) s += '<path class="th-line" d="M0 ' + r * 9 + 'H' + w + '"/>';
    return '<svg class="thumb" viewBox="-0.5 -0.5 ' + (w + 1) + ' ' + (h + 1) + '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><rect class="th-wall" width="' + w + '" height="' + h + '" rx="1"/>' + s + '</svg>';
  };
  I.renderShelf = function () {
    const shelf = U.el.shelf, list = W.layouts.list(), busy = S.applying;
    if (I.shelfSel && !list.find((l) => l.id === I.shelfSel)) I.shelfSel = null;
    const actions = (l) => '<div class="shelf-actions"><button class="btn btn-small btn-primary" type="button" data-lay="load" data-id="' + l.id + '"' + (busy ? ' disabled' : '') + '>' + esc(t('Load')) + '</button>' +
      '<button class="btn btn-small" type="button" data-lay="rename" data-id="' + l.id + '">' + esc(t('Rename')) + '</button>' +
      '<button class="btn btn-small" type="button" data-lay="update" data-id="' + l.id + '" title="' + esc(t('Replace this layout with the current draft')) + '">' + esc(t('Update')) + '</button>' +
      '<button class="btn btn-small btn-danger-quiet" type="button" data-lay="delete" data-id="' + l.id + '">' + esc(t('Delete')) + '</button></div>';
    const meta = (l) => l.composition.cols + ' × ' + l.composition.rows + ' · ' + AW.plural(l.composition.items.length, 'item', 'items') + ' · ' + AW.fmtDateTime(l.savedAt);
    let body;
    if (!list.length) body = '<p class="empty">' + esc(t('No saved layouts yet. Save the current draft to reuse it later.')) + '</p>';
    else if (I.shelfView === 'list') body = '<div class="shelf-list" role="list">' + list.map((l) => '<div class="shelf-row" role="listitem"><div><b>' + esc(l.name) + '</b><small>' + esc(meta(l)) + '</small></div>' + actions(l) + '</div>').join('') + '</div>';
    else body = '<div class="carousel"><button class="icon-btn" type="button" data-lay="prev" aria-label="' + esc(t('Previous layout')) + '">' + icon('left') + '</button>' +
      '<div class="track" id="shelf-track" tabindex="0" aria-label="' + esc(t('Saved layouts. Use arrow keys to move between cards.')) + '">' + list.map((l) => '<article class="card' + (l.id === I.shelfSel ? ' sel' : '') + '" data-card="' + l.id + '">' +
        '<button class="card-pick" type="button" data-lay="pick" data-id="' + l.id + '" aria-pressed="' + (l.id === I.shelfSel) + '" aria-label="' + esc(l.name + ', ' + meta(l)) + '">' + thumb(l.composition) + '<b>' + esc(l.name) + '</b><small>' + esc(meta(l)) + '</small></button>' +
        (l.id === I.shelfSel ? actions(l) : '') + '</article>').join('') + '</div>' +
      '<button class="icon-btn" type="button" data-lay="next" aria-label="' + esc(t('Next layout')) + '">' + icon('right') + '</button></div>';
    shelf.innerHTML = '<header class="shelf-head"><h2>' + esc(t('Saved layouts')) + '</h2><span class="muted">' + list.length + '</span><span class="grow"></span>' +
      AW.ui.segmented('shelf-view', [['cards', 'Cards'], ['list', 'List']], I.shelfView) +
      '<button class="btn btn-small" type="button" data-lay="save">' + icon('plus') + esc(t('Save current draft…')) + '</button>' +
      '<button class="icon-btn" type="button" data-lay="close" aria-label="' + esc(t('Close saved layouts')) + '">' + icon('x') + '</button></header>' + body +
      '<p class="note">' + esc(t('Loading a layout changes the draft only. Use Apply to send it to the wall.')) + '</p>';
    const sel = shelf.querySelector('.card.sel'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
  };
  I.bindShelf = function () {
    const shelf = U.el.shelf;
    const nameTaken = (name, exceptId) => W.layouts.list().some((l) => l.id !== exceptId && l.name.toLowerCase() === name.toLowerCase()) ? t('A layout with this name already exists.') : null;
    const step = (dir) => { const list = W.layouts.list(); if (!list.length) return; const i = list.findIndex((l) => l.id === I.shelfSel); I.shelfSel = list[clamp((i < 0 ? (dir > 0 ? -1 : list.length) : i) + dir, 0, list.length - 1)].id; I.renderShelf(); const tr = $('#shelf-track'); if (tr) tr.focus({ preventScroll: true }); };
    shelf.addEventListener('change', (e) => { if (e.target.name === 'shelf-view') { I.shelfView = e.target.value; AW.store.set('shelf.view', I.shelfView); I.renderShelf(); U.layoutPanels(); } });
    shelf.addEventListener('keydown', (e) => { if (e.target.id !== 'shelf-track') return; if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.key === 'Enter' && I.shelfSel) { e.preventDefault(); load(I.shelfSel); } });
    function load(id) {
      const l = W.layouts.list().find((x) => x.id === id);
      if (W.layouts.load(id)) AW.toast('info', t('"{name}" loaded into the draft as a preview. The wall is unchanged until you Apply.', { name: l.name }), { action: { label: t('Undo'), run: () => W.undo() } });
    }
    shelf.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-lay]'); if (!b) return;
      const a = b.dataset.lay, id = b.dataset.id, l = id && W.layouts.list().find((x) => x.id === id);
      if (a === 'close') U.toggleShelf(false);
      else if (a === 'prev') step(-1); else if (a === 'next') step(1);
      else if (a === 'pick') { I.shelfSel = I.shelfSel === id ? null : id; I.renderShelf(); U.layoutPanels(); }
      else if (a === 'save') {
        const name = await AW.promptText({ title: t('Save layout'), label: t('Layout name'), value: t('Layout {n}', { n: W.layouts.list().length + 1 }), validate: (v) => nameTaken(v) });
        if (name) { const entry = W.layouts.save(name); I.shelfSel = entry.id; AW.toast('ok', t('Layout "{name}" saved on this browser.', { name })); }
      } else if (a === 'load' && l) load(id);
      else if (a === 'rename' && l) { const name = await AW.promptText({ title: t('Rename layout'), label: t('Layout name'), value: l.name, validate: (v) => nameTaken(v, id) }); if (name) W.layouts.rename(id, name); }
      else if (a === 'update' && l) { if (await AW.confirm({ title: t('Update layout?'), message: t('"{name}" will be replaced by the current draft.', { name: l.name }), confirmLabel: t('Update') })) { W.layouts.overwrite(id); AW.toast('ok', t('Layout "{name}" updated.', { name: l.name })); } }
      else if (a === 'delete' && l) { if (await AW.confirm({ title: t('Delete layout?'), message: t('"{name}" will be deleted from this browser. The wall and the draft are not affected.', { name: l.name }), confirmLabel: t('Delete'), danger: true })) { W.layouts.remove(id); AW.toast('info', t('Layout "{name}" deleted.', { name: l.name })); } }
    });
    // drag the carousel like a physical strip (mouse); touch scrolls natively
    let dragX = null;
    shelf.addEventListener('pointerdown', (e) => { const tr = e.target.closest('.track'); if (tr && e.pointerType === 'mouse' && !e.target.closest('.shelf-actions')) dragX = { x: e.clientX, left: tr.scrollLeft, tr, moved: false }; });
    window.addEventListener('pointermove', (e) => { if (!dragX) return; const d = e.clientX - dragX.x; if (Math.abs(d) > 4) dragX.moved = true; dragX.tr.scrollLeft = dragX.left - d; });
    window.addEventListener('pointerup', () => { if (dragX && dragX.moved) { const s = (ev) => { ev.stopPropagation(); ev.preventDefault(); }; shelf.addEventListener('click', s, { capture: true, once: true }); setTimeout(() => shelf.removeEventListener('click', s, true), 0); } dragX = null; });
    AW.bus.on('layouts', () => { if (U.shelfOpen) { I.renderShelf(); U.layoutPanels(); } });
    AW.bus.on('wall', (e) => { if (U.shelfOpen && (e.reason === 'applying' || e.reason === 'applied' || e.reason === 'apply-failed')) I.renderShelf(); });
  };
})();
