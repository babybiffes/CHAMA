/* AegisWall — Wall workspace, part 1: stage wiring, motion-graphics layer, edit overlay,
 * source library, dock, apply flow and the opening sequence.
 * Rule of the house: the stage stays quiet. Only the tools for the current task are on screen. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t, esc = AW.esc, icon = AW.icon, $ = AW.$, clamp = AW.clamp;
  const W = AW.wall, S = W.S, MW = W.MW, MH = W.MH, stage = AW.stage, C = AW.compositor;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const TYPES = {
    camera: { label: 'Camera', ic: 'camera' }, mosaic: { label: 'Camera mosaic', ic: 'mosaic' }, web: { label: 'Web page', ic: 'web' },
    youtube: { label: 'YouTube', ic: 'youtube' }, app: { label: 'Application', ic: 'app' },
  };
  const CATEGORIES = [['all', 'All'], ['camera', 'Cameras'], ['mosaic', 'Mosaics'], ['web', 'Web'], ['youtube', 'YouTube'], ['app', 'Apps']];

  const U = (AW.wallUI = {
    TYPES, mode: 'explore', libOpen: true, inspOpen: true, shelfOpen: false, ready: false, visible: true,
    sources: [], category: 'all', query: '', shown: 60, bannerDismissed: '', drag: null,
  });
  const el = {};

  // ------------------------------------------------------------------ build
  U.build = function (root) {
    root.innerHTML =
      '<div id="stage" class="stage" tabindex="0" role="application" aria-label="' + esc(t('Videowall stage. Arrow keys orbit, Shift+arrows pan, plus and minus zoom.')) + '">' +
        '<svg id="fx" class="fx" aria-hidden="true"></svg>' +
        '<div id="edit-layer" class="edit-layer" hidden></div>' +
        '<div id="callout" class="callout" hidden></div>' +
        '<div id="stage-banner" class="stage-banner" role="status" hidden></div>' +
        '<div id="stage-note" class="stage-note" hidden></div>' +
        '<div id="apply-bar" class="apply-bar" hidden><i></i></div>' +
        '<div id="intro" class="intro" hidden><div class="intro-title"><span>' + esc(AW.PRODUCT) + '</span><small>' + esc(t('Videowall control')) + '</small></div>' +
        '<button id="intro-skip" class="btn btn-small" type="button">' + esc(t('Skip intro')) + '</button></div>' +
      '</div>' +
      '<aside id="library" class="panel panel-left" aria-label="' + esc(t('Source library')) + '"></aside>' +
      '<button id="lib-tab" class="panel-tab tab-left" type="button" hidden>' + icon('panel-l') + '<span>' + esc(t('Sources')) + '</span></button>' +
      '<aside id="inspector" class="panel panel-right" aria-label="' + esc(t('Inspector')) + '"></aside>' +
      '<button id="insp-tab" class="panel-tab tab-right" type="button" hidden>' + icon('panel-r') + '<span>' + esc(t('Inspector')) + '</span></button>' +
      '<section id="shelf" class="shelf" aria-label="' + esc(t('Saved layouts')) + '" hidden></section>' +
      '<div id="dock" class="dock" role="toolbar" aria-label="' + esc(t('View and history')) + '"></div>' +
      '<div id="drag-chip" class="drag-chip" hidden></div>';
    ['stage', 'fx', 'edit-layer', 'callout', 'stage-banner', 'stage-note', 'apply-bar', 'intro', 'intro-skip', 'library', 'lib-tab', 'inspector', 'insp-tab', 'shelf', 'dock', 'drag-chip']
      .forEach((id) => { el[id] = document.getElementById(id); });
    U.el = el;
    buildFx(); buildLibrary(); buildDock();
    bindStage(); bindEditLayer();
    el['lib-tab'].addEventListener('click', () => U.togglePanel('lib', true));
    el['insp-tab'].addEventListener('click', () => U.togglePanel('insp', true));
    el['intro-skip'].addEventListener('click', () => stage.skipIntro());
    if (window.innerWidth < 900) { U.libOpen = false; U.inspOpen = false; }
  };

  // ------------------------------------------------------------------ start (after login)
  U.start = async function () {
    U.sources = await AW.svc.sources.list();
    const kind = stage.init(el.stage);
    stage.onFrame(onStageFrame);
    stage.applyTheme(); stage.applyQuality();
    stage.syncGrid(W.comp().cols, W.comp().rows, false);
    stage.setMode(U.mode);
    stage.redraw();
    stage.start();
    U.ready = true;
    layoutPanels(true);
    renderLibrary(); renderAll('init');
    if (kind === '2d') {
      el['stage-note'].hidden = false;
      el['stage-note'].innerHTML = icon('info') + '<span>' + esc(t('2D fallback view.')) + ' ' + esc(stage.fallbackReason) + ' ' + esc(t('Editing, layouts and Apply still work; orbit, lighting and the opening sequence are unavailable.')) + '</span>';
    }
    if (kind === '3d' && AW.prefs.intro && !U.introShown) U.playIntro();
    else setControlsShown(true, false);
    U.introShown = true;
    startPreviewClock();
  };
  U.playIntro = function () {
    if (stage.kind !== '3d' || AW.motion.reduced()) { setControlsShown(true, false); return; }
    setControlsShown(false, false);
    el.intro.hidden = false; el.intro.classList.remove('out'); void el.intro.offsetWidth; el.intro.classList.add('in');
    stage.threeQuarter();
    stage.playIntro(() => {
      el.intro.classList.add('out'); el.intro.classList.remove('in');
      setTimeout(() => { el.intro.hidden = true; }, 260);
      setControlsShown(true, true);
    });
  };
  function setControlsShown(shown, animate) {
    const root = el.stage.parentElement;
    root.classList.toggle('controls-hidden', !shown);
    root.classList.toggle('controls-animate', !!animate);
  }
  document.addEventListener('keydown', (e) => { if (stage.introPlaying && !AW.dialogOpen()) { stage.skipIntro(); if (e.key === 'Escape') e.preventDefault(); } }, true);

  U.show = function (visible) {
    U.visible = visible;
    if (!U.ready) return;
    stage.pause(!visible);
    if (visible) { layoutPanels(true); renderAll('show'); } else if (AW.wallInspector) AW.wallInspector.stopPreview();
  };

  // ------------------------------------------------------------------ panels and camera framing
  U.togglePanel = function (which, open) {
    if (which === 'lib') U.libOpen = open == null ? !U.libOpen : open; else U.inspOpen = open == null ? !U.inspOpen : open;
    if (window.innerWidth < 900 && open) { if (which === 'lib') U.inspOpen = false; else U.libOpen = false; }   // one sheet at a time on small screens
    layoutPanels();
    if (which === 'insp' && U.inspOpen && AW.wallInspector) AW.wallInspector.render(true);
  };
  function layoutPanels() {
    if (!el.library) return;
    const small = window.innerWidth < 900;
    el.library.classList.toggle('closed', !U.libOpen); el.inspector.classList.toggle('closed', !U.inspOpen);
    el.library.inert = !U.libOpen; el.inspector.inert = !U.inspOpen;
    el['lib-tab'].hidden = U.libOpen; el['insp-tab'].hidden = U.inspOpen;
    el.shelf.hidden = !U.shelfOpen;
    if (!U.ready) return;
    // The camera reframes so the wall stays centred in the area the panels leave free.
    const dockH = el.dock.offsetHeight + 24, shelfH = U.shelfOpen ? el.shelf.offsetHeight + 8 : 0;
    el.stage.parentElement.style.setProperty('--shelf-h', shelfH ? shelfH + 4 + 'px' : '0px');   // side panels make room for the shelf
    stage.setInsets({
      left: !small && U.libOpen ? el.library.offsetWidth + 20 : 0,
      right: !small && U.inspOpen ? el.inspector.offsetWidth + 20 : 0,
      top: 8, bottom: dockH + shelfH,
    });
  }
  U.layoutPanels = layoutPanels;
  window.addEventListener('resize', () => { if (U.ready && U.visible) layoutPanels(); });

  // ------------------------------------------------------------------ dock
  function buildDock() {
    el.dock.innerHTML =
      '<div class="seg seg-icons" role="radiogroup" aria-label="' + esc(t('Interaction mode')) + '">' +
        '<label title="' + esc(t('Drag orbits the camera; click selects a monitor')) + '"><input type="radio" name="wall-mode" value="explore" checked><span>' + icon('orbit') + esc(t('Explore 3D')) + '</span></label>' +
        '<label title="' + esc(t('Front-aligned view; drag moves and resizes content')) + '"><input type="radio" name="wall-mode" value="edit"><span>' + icon('edit') + esc(t('Edit Layout')) + '</span></label></div>' +
      '<span class="dock-sep"></span>' +
      '<button class="btn btn-quiet" type="button" data-dock="front">' + icon('front') + '<span>' + esc(t('Front View')) + '</span></button>' +
      '<button class="btn btn-quiet" type="button" data-dock="fit">' + icon('fit') + '<span>' + esc(t('Fit All')) + '</span></button>' +
      '<span class="dock-sep"></span>' +
      '<button class="btn btn-quiet" type="button" data-dock="undo" title="Ctrl+Z">' + icon('undo') + '<span>' + esc(t('Undo')) + '</span></button>' +
      '<button class="btn btn-quiet" type="button" data-dock="redo" title="Ctrl+Y">' + icon('redo') + '<span>' + esc(t('Redo')) + '</span></button>' +
      '<span class="dock-sep"></span>' +
      '<button class="btn btn-quiet" type="button" data-dock="layouts" aria-expanded="false">' + icon('layouts') + '<span>' + esc(t('Saved Layouts')) + '</span></button>';
    el.dock.addEventListener('change', (e) => { if (e.target.name === 'wall-mode') U.setMode(e.target.value); });
    el.dock.addEventListener('click', (e) => {
      const b = e.target.closest('[data-dock]'); if (!b) return;
      const a = b.dataset.dock;
      if (a === 'front') stage.frontView();
      else if (a === 'fit') stage.fitAll();
      else if (a === 'undo') W.undo();
      else if (a === 'redo') W.redo();
      else if (a === 'layouts') U.toggleShelf();
    });
  }
  function renderDock() {
    const q = (a) => el.dock.querySelector('[data-dock="' + a + '"]');
    const busy = S.applying;
    q('undo').disabled = !S.hist.length || busy; q('redo').disabled = !S.fut.length || busy;
    q('undo').title = busy ? t('Unavailable while a composition is being sent') : S.hist.length ? 'Ctrl+Z' : t('Nothing to undo');
    q('redo').title = busy ? t('Unavailable while a composition is being sent') : S.fut.length ? 'Ctrl+Y' : t('Nothing to redo');
    q('layouts').setAttribute('aria-expanded', U.shelfOpen); q('layouts').classList.toggle('on', U.shelfOpen);
    el.dock.querySelector('input[value="' + U.mode + '"]').checked = true;
  }
  U.setMode = function (mode) {
    if (mode === U.mode) return;
    U.mode = mode;
    stage.setMode(mode);          // one coherent camera move between the perspective and the aligned view
    stage.redraw();
    renderAll('mode');
    el.stage.setAttribute('aria-label', mode === 'edit'
      ? t('Videowall stage, layout editing. Tab to a content item, arrow keys move it, Delete removes it.')
      : t('Videowall stage. Arrow keys orbit, Shift+arrows pan, plus and minus zoom.'));
  };
  U.toggleShelf = function (open) {
    U.shelfOpen = open == null ? !U.shelfOpen : open;
    if (U.shelfOpen && AW.wallInspector) AW.wallInspector.renderShelf();
    layoutPanels(); renderDock();
  };

  // ------------------------------------------------------------------ source library
  function buildLibrary() {
    el.library.innerHTML =
      '<header class="panel-head"><h2>' + esc(t('Sources')) + '</h2><span id="src-count" class="muted"></span>' +
      '<button class="icon-btn" type="button" data-collapse aria-label="' + esc(t('Collapse source library')) + '" title="' + esc(t('Collapse')) + '">' + icon('panel-l') + '</button></header>' +
      '<label class="search">' + icon('search') + '<input id="src-search" type="search" placeholder="' + esc(t('Search sources')) + '" aria-label="' + esc(t('Search sources')) + '" spellcheck="false" autocomplete="off"></label>' +
      '<div id="src-cats" class="chips" role="tablist" aria-label="' + esc(t('Source categories')) + '">' +
      CATEGORIES.map(([id, label], i) => '<button type="button" role="tab" data-cat="' + id + '" aria-selected="' + (i === 0) + '">' + esc(t(label)) + '</button>').join('') + '</div>' +
      '<div id="src-list" class="src-list" role="list"></div>' +
      '<p class="panel-foot">' + esc(t('Drag a source onto a monitor, or use Add.')) + '</p>';
    el.library.querySelector('[data-collapse]').addEventListener('click', () => U.togglePanel('lib', false));
    $('#src-search', el.library).addEventListener('input', (e) => { U.query = e.target.value; U.shown = 60; renderLibrary(); });
    $('#src-cats', el.library).addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      U.category = b.dataset.cat; U.shown = 60;
      AW.$$('[data-cat]', el.library).forEach((x) => x.setAttribute('aria-selected', x === b));
      renderLibrary();
    });
    const list = $('#src-list', el.library);
    list.addEventListener('click', (e) => {
      const more = e.target.closest('[data-more]'); if (more) { U.shown += 60; renderLibrary(); return; }
      const add = e.target.closest('[data-add]'); if (add) addFromLibrary(add.closest('.src').dataset.id);
    });
    list.addEventListener('keydown', (e) => { const row = e.target.closest('.src'); if (row && e.target === row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); addFromLibrary(row.dataset.id); } });
    list.addEventListener('pointerdown', onSourcePointerDown);
  }
  function filteredSources() {
    const q = AW.norm(U.query.trim());
    return U.sources.filter((s) => (U.category === 'all' || s.type === U.category) && (!q || AW.norm(s.name + ' ' + s.detail + ' ' + s.id).includes(q)));
  }
  function renderLibrary() {
    const list = $('#src-list', el.library), all = filteredSources();
    $('#src-count', el.library).textContent = all.length === U.sources.length ? String(all.length) : all.length + ' / ' + U.sources.length;
    if (!all.length) { list.innerHTML = '<p class="empty">' + esc(t('No sources match "{q}".', { q: U.query.trim() })) + '<br><button class="btn btn-small" type="button" id="src-clear">' + esc(t('Clear search')) + '</button></p>'; $('#src-clear', list).addEventListener('click', () => { U.query = ''; $('#src-search', el.library).value = ''; renderLibrary(); }); return; }
    const inUse = new Set(S.draft.items.map((i) => i.sourceId));
    list.innerHTML = all.slice(0, U.shown).map((s) =>
      '<div class="src' + (s.available ? '' : ' off') + '" role="listitem" tabindex="0" data-id="' + s.id + '" aria-label="' + esc(s.name + ', ' + t(TYPES[s.type].label) + ', ' + t(s.available ? 'available' : 'unavailable')) + '">' +
      '<span class="src-grip" aria-hidden="true" title="' + esc(t('Drag to a monitor')) + '">' + icon(TYPES[s.type].ic) + '</span>' +
      '<span class="src-text"><b>' + esc(s.name) + '</b><small>' + esc(s.detail) + ' · <span class="' + (s.available ? 'st-ok' : 'st-bad') + '">' + esc(t(s.available ? 'Available' : 'Unavailable')) + '</span>' +
      ' · ' + esc(t(s.preview === 'live' ? 'Live preview' : 'Static preview')) + (inUse.has(s.id) ? ' · ' + esc(t('On wall')) : '') + '</small></span>' +
      '<button class="btn btn-small" type="button" data-add aria-label="' + esc(t('Add {name} to the wall', { name: s.name })) + '">' + esc(t('Add')) + '</button></div>').join('') +
      (all.length > U.shown ? '<button class="btn btn-wide" type="button" data-more>' + esc(t('Show {n} more', { n: Math.min(60, all.length - U.shown) })) + '</button>' : '');
  }
  U.renderLibrary = renderLibrary;
  function addFromLibrary(id, target) {
    if (S.applying) { AW.toast('warn', t('Wait for the current Apply to finish before editing.')); return; }
    const item = W.addSource(id, target);
    if (!item) return;
    trace(item);
    const src = AW.svc.sources.get(id);
    if (src && !src.available) AW.toast('warn', t('{name} is currently unavailable. It was placed, but shows no picture until the source returns.', { name: src.name }));
  }

  // dragging a source: ghost preview + temporary connection path to the intended destination
  function onSourcePointerDown(e) {
    const row = e.target.closest('.src'); if (!row || e.target.closest('[data-add]') || e.button > 0) return;
    if (e.pointerType !== 'mouse' && !e.target.closest('.src-grip')) return;     // touch: the grip drags, the row scrolls
    const src = AW.svc.sources.get(row.dataset.id);
    const d = { id: src.id, sx: e.clientX, sy: e.clientY, active: false, target: null, origin: row.getBoundingClientRect(), pid: e.pointerId };
    U.drag = d;
    const move = (ev) => {
      if (ev.pointerId !== d.pid) return;
      if (!d.active) {
        if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return;
        d.active = true; el['drag-chip'].hidden = false; el['drag-chip'].innerHTML = icon(TYPES[src.type].ic) + '<span>' + esc(src.name) + '</span>';
        document.body.classList.add('dragging-source');
      }
      ev.preventDefault();
      el['drag-chip'].style.transform = 'translate(' + (ev.clientX + 12) + 'px,' + (ev.clientY + 12) + 'px)';
      const r = el.stage.getBoundingClientRect();
      const over = document.elementFromPoint(ev.clientX, ev.clientY);
      const onStage = over && el.stage.contains(over) && !over.closest('.panel');
      const pick = onStage ? stage.pick(ev.clientX - r.left, ev.clientY - r.top) : null;
      if (pick && pick.inside && !S.applying && S.view === 'draft') {
        const q = W.quadrantAt(S.draft, pick.x, pick.y);
        const fitted = W.round(W.fitInto({ w: MW, h: MH, aspect: src.type === 'camera' || src.type === 'youtube' }, q));
        d.target = q; d.rect = fitted;
        showGhost(fitted, { x: d.origin.right - r.left, y: d.origin.top + d.origin.height / 2 - r.top });
      } else { d.target = null; hideGhost(); }
    };
    const up = (ev) => {
      if (ev.pointerId !== d.pid) return;
      window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true);
      el['drag-chip'].hidden = true; document.body.classList.remove('dragging-source'); hideGhost();
      U.drag = null;
      if (d.active && d.target && ev.type === 'pointerup') addFromLibrary(d.id, d.target);
    };
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
  }

  // ------------------------------------------------------------------ motion-graphics layer (SVG, stage pixels)
  const fx = {};
  function svg(tag, attrs, parent) { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); (parent || el.fx).appendChild(n); return n; }
  function buildFx() {
    const defs = svg('defs', {});
    const grad = svg('linearGradient', { id: 'fx-sweep-grad', x1: 0, x2: 1, y1: 0, y2: 0 }, defs);
    svg('stop', { offset: 0, 'stop-color': '#8aa6ff', 'stop-opacity': 0 }, grad); svg('stop', { offset: 0.5, 'stop-color': '#cfdcff', 'stop-opacity': 0.55 }, grad); svg('stop', { offset: 1, 'stop-color': '#8aa6ff', 'stop-opacity': 0 }, grad);
    fx.clip = svg('clipPath', { id: 'fx-wall-clip' }, defs); fx.clipPoly = svg('polygon', {}, fx.clip);
    fx.grid = svg('g', { class: 'fx-grid' });
    fx.sel = svg('polygon', { class: 'fx-sel', pathLength: 1 });
    fx.item = svg('polygon', { class: 'fx-item', pathLength: 1 });
    fx.leader = svg('path', { class: 'fx-leader' });
    fx.link = svg('path', { class: 'fx-link' });
    fx.ghost = svg('polygon', { class: 'fx-ghost' });
    fx.trace = svg('polygon', { class: 'fx-trace', pathLength: 1 });
    fx.sweepG = svg('g', { 'clip-path': 'url(#fx-wall-clip)' }); fx.sweep = svg('rect', { class: 'fx-sweep', fill: 'url(#fx-sweep-grad)' }, fx.sweepG);
    for (const k of ['sel', 'item', 'leader', 'link', 'ghost', 'trace', 'sweep']) fx[k].style.display = 'none';
  }
  const pts = (q) => q.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  const restart = (node, cls) => { node.classList.remove(cls); void node.getBoundingClientRect(); node.classList.add(cls); };
  let ghostRect = null, ghostFrom = null, traceRect = null, traceTimer = 0, gridFx = null, selKey = '';
  function showGhost(rect, from) { ghostRect = rect; ghostFrom = from; fx.ghost.style.display = fx.link.style.display = ''; updateFx(); }
  function hideGhost() { ghostRect = null; fx.ghost.style.display = fx.link.style.display = 'none'; }
  // Briefly traces the bounds of a newly placed item so the eye lands on the real content region.
  function trace(item) {
    traceRect = { x: item.x, y: item.y, w: item.w, h: item.h };
    fx.trace.style.display = ''; restart(fx.trace, 'run'); updateFx();
    clearTimeout(traceTimer); traceTimer = setTimeout(() => { fx.trace.style.display = 'none'; traceRect = null; }, 900);
  }
  U.trace = trace;
  // Grid guides + dimension label while the grid changes. The label always shows the true target count.
  function showGridFx(before, after) {
    clearTimeout(gridFx && gridFx.timer);
    gridFx = { before, after, timer: setTimeout(() => { fx.grid.classList.remove('on'); gridFx = null; }, 1500) };
    fx.grid.classList.add('on'); updateFx();
  }
  function sweep() {
    if (AW.motion.level() === 'off') return;
    fx.sweep.style.display = '';
    const q = stage.wallQuad(), xs = q.map((p) => p.x), ys = q.map((p) => p.y);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), bw = (x1 - x0) * 0.35;
    fx.clipPoly.setAttribute('points', pts(q));
    fx.sweep.setAttribute('y', y0); fx.sweep.setAttribute('height', y1 - y0); fx.sweep.setAttribute('width', bw);
    AW.motion.to('fx:sweep', { from: x0 - bw, to: x1, dur: 700, ease: 'inOut', spatial: false, update: (v) => fx.sweep.setAttribute('x', v), done: () => { fx.sweep.style.display = 'none'; } });
  }
  function freeArea() {
    const i = stage.insets, w = el.stage.clientWidth, h = el.stage.clientHeight;
    return { x0: i.left, y0: i.top, x1: w - i.right, y1: h - i.bottom };
  }
  function updateFx() {
    if (!U.ready) return;
    const comp = W.comp(), free = freeArea();
    // selected monitor: outline + anchored callout with a leader to the inspector
    const tile = W.selectedTile();
    const tileOk = tile && +tile.split(',')[0] < comp.rows && +tile.split(',')[1] < comp.cols;
    if (tileOk) {
      const q = stage.quad(stage.tileRect(tile));
      fx.sel.style.display = ''; fx.sel.setAttribute('points', pts(q));
      if (selKey !== 'm' + tile) { selKey = 'm' + tile; restart(fx.sel, 'run'); el.callout.classList.remove('in'); void el.callout.offsetWidth; el.callout.classList.add('in'); }
      const a = q[1];   // top-right corner
      const visible = q.every((p) => p.visible) && a.x > free.x0 + 8 && a.x < free.x1 - 8 && a.y > free.y0 + 8 && a.y < free.y1 - 8;
      el.callout.hidden = !visible; fx.leader.style.display = visible ? '' : 'none';
      if (visible) {
        const st = AW.svc.outputs.tileState(tile);
        const stLabel = { planned: 'Planned', detected: 'Detected output', confirmed: 'Confirmed mapping', missing: 'Output missing' }[st.state];
        const html = '<b>' + W.tileName(tile) + '</b><span>' + esc(t(stLabel)) + (st.output && st.output.id ? ' · ' + esc(st.output.id) : '') + '</span>';
        if (el.callout._html !== html) { el.callout.innerHTML = html; el.callout._html = html; }
        const cw = el.callout.offsetWidth, ch = el.callout.offsetHeight;
        // the chip sits above the wall so it never covers screen content
        const wq = stage.wallQuad(), wallTop = Math.min(wq[0].y, wq[1].y);
        const cx = clamp(a.x - cw / 2, free.x0 + 6, free.x1 - cw - 6), cy = clamp(Math.min(a.y - ch - 18, wallTop - ch - 12), free.y0 + 6, free.y1 - ch - 6);
        el.callout.style.transform = 'translate(' + Math.round(cx) + 'px,' + Math.round(cy) + 'px)';
        let d = 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ' L' + clamp(a.x, cx + 4, cx + cw - 4).toFixed(1) + ' ' + (cy + ch).toFixed(1);
        if (U.inspOpen && window.innerWidth >= 900) { const ex = el.stage.clientWidth - stage.insets.right + 8, ey = Math.max(cy + ch / 2, 34); d += ' M' + (cx + cw).toFixed(1) + ' ' + (cy + ch / 2).toFixed(1) + ' L' + ex.toFixed(1) + ' ' + ey.toFixed(1); }
        fx.leader.setAttribute('d', d);
      }
    } else { fx.sel.style.display = fx.leader.style.display = 'none'; el.callout.hidden = true; if (selKey[0] === 'm') selKey = ''; }
    // selected content in the perspective view (the edit overlay shows it in Edit Layout)
    const it = W.selectedItem();
    if (it && !(U.mode === 'edit' && stage.aligned())) {
      fx.item.style.display = ''; fx.item.setAttribute('points', pts(stage.quad(U.dragRect && U.dragRect.id === it.id ? U.dragRect : it)));
      if (selKey !== 'i' + it.id) { selKey = 'i' + it.id; restart(fx.item, 'run'); }
    } else { fx.item.style.display = 'none'; if (selKey[0] === 'i') selKey = ''; }
    if (ghostRect) {
      const q = stage.quad(ghostRect); fx.ghost.setAttribute('points', pts(q));
      const cx = (q[0].x + q[2].x) / 2, cy = (q[0].y + q[2].y) / 2, f = ghostFrom;
      fx.link.setAttribute('d', 'M' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + ' C' + (f.x + 90).toFixed(1) + ' ' + f.y.toFixed(1) + ' ' + (cx - 90).toFixed(1) + ' ' + cy.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1));
    }
    if (traceRect) fx.trace.setAttribute('points', pts(stage.quad(traceRect)));
    if (gridFx) {
      const q = stage.wallQuad(), a = gridFx.after;
      let h = '<polygon class="fx-grid-frame" points="' + pts(q) + '"/>';
      const lerp = (p, r, f) => ({ x: p.x + (r.x - p.x) * f, y: p.y + (r.y - p.y) * f });
      const seamLine = (axis, n) => { const [p, r] = stage.seam(axis, n); return '<line x1="' + p.x.toFixed(1) + '" y1="' + p.y.toFixed(1) + '" x2="' + r.x.toFixed(1) + '" y2="' + r.y.toFixed(1) + '"/>'; };
      for (let k = 1; k < stage.cols; k++) h += seamLine('col', k);
      for (let r0 = 1; r0 < stage.rows; r0++) h += seamLine('row', r0);
      const top = lerp(q[0], q[1], 0.5), ty = Math.max(free.y0 + 34, top.y - 16);
      const label = a.cols + ' × ' + a.rows + ' = ' + AW.plural(a.cols * a.rows, 'monitor', 'monitors');
      h += '<g transform="translate(' + top.x.toFixed(1) + ',' + ty.toFixed(1) + ')"><rect class="fx-grid-chip" x="' + (-label.length * 4.1 - 12) + '" y="-15" width="' + (label.length * 8.2 + 24) + '" height="26" rx="13"/><text class="fx-grid-text" text-anchor="middle" y="3">' + esc(label) + '</text></g>';
      if (fx.grid._h !== h) { fx.grid.innerHTML = h; fx.grid._h = h; }
    }
  }

  // ------------------------------------------------------------------ edit overlay (front-aligned view)
  let frames = new Map(), layerSig = '';
  function bindEditLayer() {
    const layer = el['edit-layer'];
    layer.innerHTML = '<div id="guide-v" class="guide guide-v" hidden></div><div id="guide-h" class="guide guide-h" hidden></div><div id="frames"></div>' +
      '<div id="handles" class="handles" hidden>' + ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'].map((d) => '<i data-h="' + d + '"></i>').join('') + '<span id="measure" class="measure" hidden></span></div>';
    el.frames = $('#frames', layer); el.handles = $('#handles', layer); el.measure = $('#measure', layer); el.gv = $('#guide-v', layer); el.gh = $('#guide-h', layer);
    layer.addEventListener('pointerdown', onFramePointerDown);
    layer.addEventListener('keydown', onFrameKey);
    layer.addEventListener('focusin', (e) => { const f = e.target.closest('.frame'); if (f && !U.editDrag) W.select({ kind: 'item', id: f.dataset.id }); });
  }
  function renderEditLayer() {
    const on = U.mode === 'edit' && S.view === 'draft';
    el['edit-layer'].hidden = !on;
    if (!on) return;
    const pend = W.pending().ids;
    const sigNow = S.draft.items.map((i) => i.id + (i.locked ? 'L' : '') + i.name + W.situation(i, S.draft) + (pend.has(i.id) ? 'P' : '')).join('|');
    if (sigNow !== layerSig) {
      layerSig = sigNow;
      const seen = new Set();
      S.draft.items.forEach((it) => {
        seen.add(it.id);
        let f = frames.get(it.id);
        if (!f) { f = AW.el('<div class="frame" tabindex="0" role="button"><span class="frame-tag"></span><span class="frame-flag"></span></div>'); f.dataset.id = it.id; frames.set(it.id, f); }
        el.frames.appendChild(f);        // DOM order = layer order
        const sit = W.situation(it, S.draft);
        f.className = 'frame' + (it.locked ? ' locked' : '') + (sit !== 'inside' ? ' out' : '') + (pend.has(it.id) ? ' pending' : '');
        f.querySelector('.frame-tag').innerHTML = (it.locked ? icon('lock') : '') + '<span>' + esc(it.name) + '</span>';
        f.querySelector('.frame-flag').textContent = sit === 'outside' ? t('Outside the wall') : sit === 'partial' ? t('Partly outside') : '';
        f.setAttribute('aria-label', it.name + ', ' + t(TYPES[it.type].label) + ', ' + W.where(it, S.draft) + (it.locked ? ', ' + t('locked') : ''));
      });
      for (const [id, f] of frames) if (!seen.has(id)) { f.remove(); frames.delete(id); }
    }
    positionFrames();
  }
  function positionFrames() {
    if (el['edit-layer'].hidden) return;
    const ready = stage.aligned();
    el['edit-layer'].classList.toggle('settling', !ready);
    const sel = W.selectedItem();
    for (const it of S.draft.items) {
      const f = frames.get(it.id); if (!f) continue;
      const r = U.dragRect && U.dragRect.id === it.id ? U.dragRect : it;
      const q = stage.quad(r), x = q[0].x, y = q[0].y, w = Math.max(4, q[2].x - q[0].x), h = Math.max(4, q[2].y - q[0].y);
      f.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; f.style.width = w.toFixed(1) + 'px'; f.style.height = h.toFixed(1) + 'px';
      f.classList.toggle('sel', !!sel && sel.id === it.id); f.classList.toggle('tiny', w < 70 || h < 26);
      if (sel && sel.id === it.id) {
        el.handles.hidden = false; el.handles.classList.toggle('locked', !!it.locked);
        el.handles.style.transform = f.style.transform; el.handles.style.width = f.style.width; el.handles.style.height = f.style.height;
      }
    }
    if (!sel) el.handles.hidden = true;
  }
  function onFramePointerDown(e) {
    if (e.button > 0 || S.applying) return;
    const handle = e.target.closest('[data-h]'), frame = e.target.closest('.frame');
    let it = handle ? W.selectedItem() : frame ? W.find(S.draft, frame.dataset.id) : null;
    if (!it) return;
    e.preventDefault();
    W.select({ kind: 'item', id: it.id });
    if (frame) frame.focus({ preventScroll: true });
    if (it.locked) return;
    const d = { id: it.id, dir: handle ? handle.dataset.h : null, sx: e.clientX, sy: e.clientY, start: { x: it.x, y: it.y, w: it.w, h: it.h }, moved: false, pid: e.pointerId, aspect: it.aspect, raf: 0 };
    U.editDrag = d;
    const lines = W.snapLines(it.id);
    const step = (ev) => {
      d.raf = 0;
      const sc = stage.scale(), dx = (d.cx - d.sx) / sc, dy = (d.cy - d.sy) / sc;
      const snap = AW.prefs.snapping && !d.alt ? lines : null, tol = 9 / sc;
      const r = d.dir ? W.calcResize(d.start, d.dir, dx, dy, snap, tol, d.aspect) : W.calcMove(d.start, dx, dy, snap, tol);
      U.dragRect = Object.assign({ id: d.id }, W.round(r));
      // only the dragged item is redrawn each frame; state changes on release
      stage.redraw({ items: S.draft.items.map((x) => (x.id === d.id ? Object.assign({}, x, U.dragRect) : x)) });
      showGuides(r.gx, r.gy);
      el.measure.hidden = false; el.measure.textContent = U.dragRect.w + ' × ' + U.dragRect.h + '  ·  ' + U.dragRect.x + ', ' + U.dragRect.y;
      positionFrames();
    };
    const move = (ev) => {
      if (ev.pointerId !== d.pid) return;
      d.cx = ev.clientX; d.cy = ev.clientY; d.alt = ev.altKey;
      if (!d.moved && Math.hypot(d.cx - d.sx, d.cy - d.sy) < 3) return;
      d.moved = true;
      if (!d.raf) d.raf = requestAnimationFrame(step);
    };
    const finish = (commit) => {
      window.removeEventListener('pointermove', move, true); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', cancel, true); window.removeEventListener('keydown', key, true);
      cancelAnimationFrame(d.raf);
      const rect = U.dragRect; U.dragRect = null; U.editDrag = null;
      showGuides(null, null); el.measure.hidden = true;
      if (commit && d.moved && rect) W.setRect(d.id, rect, d.dir ? 'resize' : 'move'); else { stage.redraw(); positionFrames(); }
    };
    const up = (ev) => { if (ev.pointerId === d.pid) finish(true); };
    const cancel = (ev) => { if (ev.pointerId === d.pid) finish(false); };
    const key = (ev) => { if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); } };
    window.addEventListener('pointermove', move, true); window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', cancel, true); window.addEventListener('keydown', key, true);
  }
  function showGuides(gx, gy) {
    el.gv.hidden = gx == null; el.gh.hidden = gy == null;
    const sz = W.size(S.draft);
    if (gx != null) { const a = stage.quad({ x: gx, y: 0, w: 0, h: sz.h }); el.gv.style.transform = 'translateX(' + a[0].x.toFixed(1) + 'px)'; }
    if (gy != null) { const a = stage.quad({ x: 0, y: gy, w: sz.w, h: 0 }); el.gh.style.transform = 'translateY(' + a[0].y.toFixed(1) + 'px)'; }
  }
  // Keyboard alternative to dragging.
  function onFrameKey(e) {
    const f = e.target.closest('.frame'); if (!f || S.applying) return;
    const it = W.find(S.draft, f.dataset.id); if (!it) return;
    const stepSize = e.altKey ? 1 : e.shiftKey ? 100 : 10;
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key]) {
      e.preventDefault(); if (it.locked) return;
      const [dx, dy] = arrows[e.key];
      if (e.ctrlKey || e.metaKey) W.setRect(it.id, { x: it.x, y: it.y, w: Math.max(W.MIN_W, it.w + dx * stepSize), h: Math.max(W.MIN_H, it.h + dy * stepSize) }, 'key-resize', true);
      else W.setRect(it.id, { x: it.x + dx * stepSize, y: it.y + dy * stepSize, w: it.w, h: it.h }, 'key-move', true);
      refocus(it.id);
    } else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); U.removeItem(it.id); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); const c = W.duplicate(it.id); if (c) refocus(c.id); }
    else if (e.key === ']') { W.reorder(it.id, 'forward'); refocus(it.id); } else if (e.key === '[') { W.reorder(it.id, 'backward'); refocus(it.id); }
  }
  function refocus(id) { const f = frames.get(id); if (f) f.focus({ preventScroll: true }); }
  U.removeItem = function (id) {
    const it = W.find(S.draft, id); if (!it) return;
    if (W.removeItem(id)) AW.toast('info', t('{name} removed from the wall. Its source keeps running.', { name: it.name }), { action: { label: t('Undo'), run: () => W.undo() } });
  };

  // ------------------------------------------------------------------ stage events
  function bindStage() {
    AW.bus.on('stage-click', (e) => {
      if (!U.visible) return;
      const p = e.pick;
      if (p && p.inside && p.tile) W.select({ kind: 'monitor', id: p.tile }); else W.select(null);
      if (p && p.inside && !U.inspOpen && window.innerWidth >= 900) U.togglePanel('insp', true);
    });
    AW.bus.on('stage-dblclick', (e) => { if (e.pick && e.pick.tile) stage.focusTile(e.pick.tile); });
    AW.bus.on('stage-lost', () => {
      // WebGL died mid-session: keep working in the 2D fallback without losing any state.
      stage.dispose(); AW.demo.noWebGL = true; stage.kind = 'none'; stage.cols = 0;
      stage.fallbackReason = t('The graphics context was lost.');
      const k = stage.init(el.stage); stage.syncGrid(W.comp().cols, W.comp().rows, false); stage.setMode(U.mode); stage.redraw(); stage.start(); layoutPanels();
      AW.demo.noWebGL = AW.store.get('demo.noWebGL', false);
      el['stage-note'].hidden = false; el['stage-note'].innerHTML = icon('alert') + '<span>' + esc(t('3D stopped working ({kind} fallback active). Your composition is intact.', { kind: k.toUpperCase() })) + '</span>';
      renderAll('lost');
    });
    el.stage.addEventListener('keydown', (e) => {
      if (e.target !== el.stage) return;
      const k = e.key, s = 0.09;
      const edit = U.mode === 'edit' || e.shiftKey;
      if (k === 'ArrowLeft') edit ? stage.nudge(0, 0, -1, 0) : stage.nudge(-s, 0, 0, 0);
      else if (k === 'ArrowRight') edit ? stage.nudge(0, 0, 1, 0) : stage.nudge(s, 0, 0, 0);
      else if (k === 'ArrowUp') edit ? stage.nudge(0, 0, 0, 1) : stage.nudge(0, s, 0, 0);
      else if (k === 'ArrowDown') edit ? stage.nudge(0, 0, 0, -1) : stage.nudge(0, -s, 0, 0);
      else if (k === '+' || k === '=') stage.nudge(0, 0, 0, 0, 0.85);
      else if (k === '-' || k === '_') stage.nudge(0, 0, 0, 0, 1.18);
      else if (k === 'Home') stage.fitAll();
      else return;
      e.preventDefault();
    });
  }
  function onStageFrame() {
    if (!U.visible) return;
    updateFx();
    if (U.mode === 'edit') positionFrames();
  }

  // ------------------------------------------------------------------ out-of-bounds banner
  function renderBanner() {
    const out = S.view === 'draft' ? W.outOfBounds() : [];
    const g = S.draft.base, key = out.map((i) => i.id).join() + '|' + (g ? g.cols + 'x' + g.rows : '') + '|' + S.draft.cols + 'x' + S.draft.rows;
    const show = out.length > 0 && U.bannerDismissed !== key;
    el['stage-banner'].hidden = !show;
    if (!show) { if (!out.length) U.bannerDismissed = ''; return; }
    if (el['stage-banner']._key === key) return;
    el['stage-banner']._key = key;
    el['stage-banner'].innerHTML = icon('alert') + '<span>' + esc(out.length === 1 ? t('1 content item is outside the wall.') : t('{n} content items are outside the wall.', { n: out.length })) + ' ' + esc(t('Nothing was removed or closed.')) + '</span>' +
      '<span class="banner-actions"><button class="btn btn-small" type="button" data-b="reposition" title="' + esc(t('Move stray items back inside the wall')) + '">' + esc(t('Reposition')) + '</button>' +
      (g ? '<button class="btn btn-small" type="button" data-b="fit" title="' + esc(t('Rescale everything from {a} to {b}', { a: g.cols + '×' + g.rows, b: S.draft.cols + '×' + S.draft.rows })) + '">' + esc(t('Fit Proportionally')) + '</button>' : '') +
      '<button class="btn btn-small" type="button" data-b="undo">' + esc(t('Undo')) + '</button>' +
      '<button class="btn btn-small" type="button" data-b="cancel" title="' + esc(t('Keep the items where they are; they stay marked')) + '">' + esc(t('Cancel')) + '</button></span>';
    el['stage-banner'].onclick = (e) => {
      const b = e.target.closest('[data-b]'); if (!b) return;
      const a = b.dataset.b;
      if (a === 'reposition') W.bringInside(); else if (a === 'fit') W.fitProportional(); else if (a === 'undo') W.undo();
      else { U.bannerDismissed = key; renderBanner(); }
    };
  }

  // ------------------------------------------------------------------ apply / discard
  U.apply = async function () {
    if (S.applying) return;
    const p = W.pending(); if (!p.n) return;
    const out = W.outOfBounds().length;
    if (out) {
      const go = await AW.confirm({ title: t('Apply with content outside the wall?'), message: t('{n} content item(s) are outside the wall and will not be visible on the displays. You can reposition them first.', { n: out }), confirmLabel: t('Apply anyway') });
      if (!go) return;
    }
    try {
      const ack = await W.apply();
      if (!ack) return;
      sweep();     // shown only after the acknowledgement
      AW.toast(ack.warnings.length ? 'warn' : 'ok', t('Composition confirmed by the controller at {time}.', { time: AW.fmtTime(ack.confirmedAt) }) + ' ' + t('(Demo acknowledgement — no physical display changed.)') + (ack.warnings.length ? ' ' + ack.warnings.join(' ') : ''), { ms: ack.warnings.length ? 9000 : 5000 });
    } catch (e) {
      AW.toast('error', t('Apply failed: {reason}', { reason: e.message }), { action: { label: t('Retry'), run: () => U.apply() } });
    }
  };
  U.discard = async function () {
    const p = W.pending(); if (!p.n || S.applying) return;
    W.discard();
    AW.toast('info', t('Draft reset to the confirmed composition.'), { action: { label: t('Undo'), run: () => W.undo() } });
  };

  // ------------------------------------------------------------------ render orchestration
  function renderAll(reason, data) {
    if (!U.ready || !U.visible) return;
    const comp = W.comp();
    if (comp.cols !== stage.cols || comp.rows !== stage.rows) stage.syncGrid(comp.cols, comp.rows, reason !== 'init' && reason !== 'show');
    el.stage.classList.toggle('busy', S.applying);
    el.stage.classList.toggle('onair', S.view !== 'draft');
    el['apply-bar'].hidden = !S.applying;
    // layout recall / discard: content rectangles travel from where they are to the recalled composition
    const from = data && data.from;
    if ((reason === 'recall' || reason === 'discard') && from && from.cols === comp.cols && from.rows === comp.rows && !AW.motion.reduced()) {
      AW.motion.to('wall:blend', { from: 0, to: 1, dur: 620, ease: 'inOut', update: (p) => stage.redraw({ items: C.blend(from, W.comp(), p) }), done: () => stage.redraw() });
    } else { AW.motion.cancel('wall:blend'); if (!U.dragRect) stage.redraw(); }
    renderEditLayer(); renderDock(); renderBanner(); updateFx();
    if (AW.wallInspector) AW.wallInspector.render();
    if (reason === 'add' || reason === 'remove' || reason === 'init' || reason === 'undo' || reason === 'redo' || reason === 'recall' || reason === 'discard') renderLibrary();
  }
  U.renderAll = renderAll;
  AW.bus.on('wall', (e) => renderAll(e.reason, e));
  AW.bus.on('grid', (e) => { if (U.ready && U.visible && e.after) showGridFx(e.before, e.after); });
  AW.bus.on('mapping', () => { if (U.ready) { stage.redraw(); renderAll('mapping'); } });
  AW.bus.on('reload', () => { if (U.ready && U.visible) stage.redraw(); });
  AW.bus.on('prefs', () => { if (!U.ready) return; stage.applyTheme(); stage.applyQuality(); startPreviewClock(); renderAll('prefs'); });

  // Preview refresh: static thumbnails at a slow interval, or "live" demo motion at a capped frame rate.
  // Preview settings only affect this browser; they never change what the wall outputs.
  let clock = 0;
  function startPreviewClock() {
    clearInterval(clock);
    const live = AW.prefs.previewMode === 'live';
    const ms = live ? 1000 / AW.prefs.previewFps : AW.prefs.thumbInterval * 1000;
    clock = setInterval(() => { if (U.ready && U.visible && !document.hidden && !U.dragRect && !AW.motion.active('wall:')) stage.redraw(); }, ms);
  }
})();
