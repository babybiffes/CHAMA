/* AegisWall — stage. Presents the logical wall either as a real-time 3D scene (Three.js) or, when WebGL
 * cannot start, as a flat 2D canvas with the same interface. The stage never owns wall state: it renders
 * what the model says and reports pointer picks back in logical wall coordinates. */
(function () {
  'use strict';
  const AW = window.AW, clamp = AW.clamp;
  const W = AW.wall, MW = W.MW, MH = W.MH, C = AW.compositor;

  // Physical proportions in world units (1 unit ≈ 0.76 m for a 55" panel; only proportions matter here).
  const SW = 1.6, SH = 0.9, BEZEL = 0.014, GAP = 0.006, DEPTH = 0.07;
  const PX = SW + 2 * BEZEL + GAP, PY = SH + 2 * BEZEL + GAP;
  const CLEAR = 0.62;         // gap between the floor and the bottom row
  const FOV = 32;

  // logical pixels <-> wall-local units (origin: top-left outer corner, x right, y down).
  // The logical surface is continuous; physically each monitor's picture area is separated by bezels.
  const toLocalX = (x, max) => { const k = max ? Math.ceil(x / MW) - 1 : Math.floor(x / MW); return k * PX + BEZEL + GAP / 2 + ((x - k * MW) / MW) * SW; };
  const toLocalY = (y, max) => { const r = max ? Math.ceil(y / MH) - 1 : Math.floor(y / MH); return r * PY + BEZEL + GAP / 2 + ((y - r * MH) / MH) * SH; };
  const toLogicalX = (lx) => { const k = Math.floor(lx / PX); return (k + clamp((lx - k * PX - BEZEL - GAP / 2) / SW, 0, 1)) * MW; };
  const toLogicalY = (ly) => { const r = Math.floor(ly / PY); return (r + clamp((ly - r * PY - BEZEL - GAP / 2) / SH, 0, 1)) * MH; };

  const hooks = [];
  const S = (AW.stage = {
    kind: 'none', el: null, mode: 'explore', cols: 0, rows: 0, idAlpha: 1, introPlaying: false, fallbackReason: '',
    insets: { left: 0, right: 0, top: 0, bottom: 0 },
    onFrame(fn) { hooks.push(fn); },
    init(container) {
      S.el = container;
      let impl = null;
      if (AW.demo.noWebGL) S.fallbackReason = AW.t('3D was turned off in Demo tools.');
      else if (!window.THREE) S.fallbackReason = AW.t('The 3D library did not load.');
      else {
        try { impl = create3D(container); }            // 3D failures are isolated here
        catch (e) { S.fallbackReason = AW.t('WebGL could not start on this device ({reason}).', { reason: e.message || 'unknown' }); AW.log('warn', 'stage', '3D initialization failed: ' + e.message); }
      }
      if (!impl) impl = create2D(container);
      Object.assign(S, impl);
      return S.kind;
    },
    // Logical rect -> four stage-pixel points (clockwise from top-left).
    quad(rect) {
      const x0 = toLocalX(rect.x), y0 = toLocalY(rect.y), x1 = toLocalX(rect.x + rect.w, true), y1 = toLocalY(rect.y + rect.h, true);
      return [S.projectLocal(x0, y0), S.projectLocal(x1, y0), S.projectLocal(x1, y1), S.projectLocal(x0, y1)];
    },
    tileRect(key) { const [r, k] = key.split(',').map(Number); return { x: k * MW, y: r * MH, w: MW, h: MH }; },
    // A seam between monitors as two stage-pixel points (follows the perspective exactly).
    seam(axis, i) { return axis === 'col' ? [S.projectLocal(i * PX, 0), S.projectLocal(i * PX, S.rows * PY)] : [S.projectLocal(0, i * PY), S.projectLocal(S.cols * PX, i * PY)]; },
    // Outer wall bounds (including bezels) as a quad.
    wallQuad() { const w = S.cols * PX, h = S.rows * PY; return [S.projectLocal(0, 0), S.projectLocal(w, 0), S.projectLocal(w, h), S.projectLocal(0, h)]; },
  });

  // =====================================================================================
  // 3D implementation
  // =====================================================================================
  function create3D(container) {
    const THREE = window.THREE;
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas';
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('no context');
    container.insertBefore(canvas, container.firstChild);   // below the SVG and edit overlays
    renderer.autoClear = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 200);
    const root = new THREE.Group();            // everything that gets mirrored for the floor reflection
    const wallGroup = new THREE.Group();
    const standGroup = new THREE.Group();
    root.add(wallGroup); root.add(standGroup); scene.add(root);

    // controlled studio lighting
    const hemi = new THREE.HemisphereLight(0xdfe6ff, 0x0b0d10, 0.95);
    const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-4, 7, 9);
    key.shadow.mapSize.set(1024, 1024); key.shadow.radius = 6; key.shadow.bias = -0.0004;
    const rim = new THREE.DirectionalLight(0x8aa6ff, 0.45); rim.position.set(6, 4, -6);
    scene.add(hemi, key, key.target, rim);

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x14181e, roughness: 0.85, metalness: 0.1, transparent: true, opacity: 0.84 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

    // soft contact shadow: a blurred blob under the wall, no per-frame cost
    const blob = document.createElement('canvas'); blob.width = blob.height = 128;
    { const b = blob.getContext('2d'), gr = b.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); b.fillStyle = gr; b.fillRect(0, 0, 128, 128); }
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(blob), transparent: true, depthWrite: false }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002; scene.add(contact);

    const bodyGeo = new THREE.BoxGeometry(SW + 2 * BEZEL, SH + 2 * BEZEL, DEPTH);
    const rearGeo = new THREE.BoxGeometry(SW * 0.62, SH * 0.56, 0.05);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b2028, roughness: 0.48, metalness: 0.45 });
    const rearMat = new THREE.MeshStandardMaterial({ color: 0x12161b, roughness: 0.7, metalness: 0.2 });
    const standMat = new THREE.MeshStandardMaterial({ color: 0x232932, roughness: 0.6, metalness: 0.5 });
    const offMat = new THREE.MeshBasicMaterial({ color: 0x07090b });

    let texture = null;
    const monitors = new Map();            // key -> {group, screen, mat, body, z, scale, power, leaving}
    let running = true, dirty = true, raf = 0, last = performance.now(), width = 1, height = 1;

    // ---- camera rig: one owner for the camera. Input and programmatic moves only change `goal`. ----
    const rig = {
      cur: { theta: -0.42, phi: 0.16, radius: 9, tx: 0, ty: 1.6, ox: 0, oy: 0, gx: 0, gy: 2 },
      goal: { theta: -0.42, phi: 0.16, radius: 9, tx: 0, ty: 1.6, ox: 0, oy: 0, gx: 0, gy: 2 },
      rate: 9, auto: 'three', settled: false,
    };
    const invalidate = () => { dirty = true; };
    const freeRect = () => ({ w: Math.max(120, width - S.insets.left - S.insets.right), h: Math.max(100, height - S.insets.top - S.insets.bottom) });
    const wallSize = () => ({ w: S.cols * PX, h: S.rows * PY });
    function fitRadius(margin) {
      const f = freeRect(), ws = wallSize(), tan = Math.tan((FOV * Math.PI) / 360);
      return Math.max((ws.w * height) / (f.w * margin), (ws.h * height) / (f.h * margin)) / (2 * tan);
    }
    function frame(kind) {
      const ws = wallSize(), g = rig.goal;
      rig.auto = kind;
      g.tx = 0; g.ty = CLEAR + ws.h / 2;
      if (kind === 'front') { g.theta = 0; g.phi = 0; g.radius = fitRadius(0.9); }
      else if (kind === 'fit') { g.radius = fitRadius(0.9) * (1 + Math.abs(g.theta) * 0.12 + Math.abs(g.phi) * 0.2); }
      else { g.theta = -0.42; g.phi = 0.15; g.radius = fitRadius(0.9) * 1.04; }
      invalidate();
    }
    function limits() { const fit = fitRadius(0.9); return { rmin: Math.max(0.9, fit * 0.22), rmax: fit * 2.4 }; }
    function constrain() {
      const g = rig.goal, L = limits(), ws = wallSize();
      if (S.mode === 'edit') { g.theta = 0; g.phi = 0; } else { g.theta = clamp(g.theta, -0.95, 0.95); g.phi = clamp(g.phi, -0.08, 0.7); }
      g.radius = clamp(g.radius, L.rmin, L.rmax);
      g.tx = clamp(g.tx, -ws.w / 2 - 0.3, ws.w / 2 + 0.3); g.ty = clamp(g.ty, CLEAR - 0.3, CLEAR + ws.h + 0.3);   // the wall can never be lost
    }
    function stepRig(dt) {
      const c = rig.cur, g = rig.goal;
      g.ox = (S.insets.left - S.insets.right) / 2; g.oy = (S.insets.top - S.insets.bottom) / 2;
      const k = AW.motion.reduced() ? 1 : 1 - Math.exp(-rig.rate * dt);
      let moving = false;
      for (const p in g) {
        const d = g[p] - c[p];
        if (Math.abs(d) > (p === 'ox' || p === 'oy' ? 0.3 : 0.0004)) { c[p] += d * k; moving = true; } else c[p] = g[p];
      }
      rig.settled = !moving;
      const cp = Math.cos(c.phi);
      camera.position.set(c.tx + c.radius * Math.sin(c.theta) * cp, c.ty + c.radius * Math.sin(c.phi), c.radius * Math.cos(c.theta) * cp);
      camera.lookAt(c.tx, c.ty, 0);
      camera.setViewOffset(width, height, -c.ox, -c.oy, width, height);   // keeps the wall centred in the area the panels leave free
      camera.updateMatrixWorld();
      wallGroup.position.set(c.gx, c.gy, 0);
      return moving;
    }

    // ---- monitors ----
    function setUV(geo, r, k) {
      const uv = geo.attributes.uv, u0 = k / S.cols, u1 = (k + 1) / S.cols, v1 = 1 - r / S.rows, v0 = 1 - (r + 1) / S.rows;
      uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true;
    }
    function place(m) { const [r, k] = m.key.split(',').map(Number); m.group.position.set(k * PX + PX / 2, -(r * PY + PY / 2), m.z); m.group.scale.setScalar(m.scale); m.mat.color.setScalar(m.power); invalidate(); }
    function makeMonitor(key) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, bodyMat.clone()); body.position.z = -DEPTH / 2; body.castShadow = true;
      const rear = new THREE.Mesh(rearGeo, rearMat); rear.position.z = -DEPTH - 0.025;
      const geo = new THREE.PlaneGeometry(SW, SH);
      const mat = new THREE.MeshBasicMaterial({ map: texture, color: 0x000000 });
      const screen = new THREE.Mesh(geo, mat); screen.position.z = 0.0015;
      group.add(body, rear, screen);
      wallGroup.add(group);
      const m = { key, group, body, screen, mat, z: -2.4, scale: 0.86, power: 0, leaving: false };
      monitors.set(key, m);
      return m;
    }
    function arrive(m, delay, quick) {
      m.leaving = false; m.screen.material = m.mat; m.body.material.emissive.setHex(0x000000);
      const k = 'mon:' + m.key;
      AW.motion.to(k + ':z', { from: m.z, to: 0, dur: quick ? 0 : 520, delay, ease: 'out', update: (v) => { m.z = v; place(m); } });
      AW.motion.to(k + ':s', { from: m.scale, to: 1, dur: quick ? 0 : 520, delay, ease: 'out', update: (v) => { m.scale = v; place(m); } });
      AW.motion.to(k + ':p', { from: m.power, to: 1, dur: quick ? 0 : 320, delay: quick ? 0 : delay + 380, ease: 'inOut', spatial: false, update: (v) => { m.power = v; place(m); } });
    }
    function leave(m) {
      m.leaving = true;
      m.screen.material = offMat;                         // its picture region no longer exists in the new grid
      m.body.material.emissive.setHex(0x5a3d0c);          // identify the affected display while it leaves
      const k = 'mon:' + m.key;
      AW.motion.cancel(k + ':p');
      AW.motion.to(k + ':z', { from: m.z, to: -1.5, dur: 420, ease: 'in', update: (v) => { m.z = v; place(m); } });
      AW.motion.to(k + ':s', { from: m.scale, to: 0.001, dur: 420, ease: 'in', update: (v) => { m.scale = v; place(m); },
        done: () => { if (!m.leaving) return; wallGroup.remove(m.group); m.screen.geometry.dispose(); m.mat.dispose(); m.body.material.dispose(); monitors.delete(m.key); invalidate(); } });
    }
    function rebuildTexture() {
      if (texture) texture.dispose();
      texture = new THREE.CanvasTexture(C.canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter;
      for (const m of monitors.values()) { m.mat.map = texture; m.mat.needsUpdate = true; }
    }
    function rebuildStand() {
      while (standGroup.children.length) { const o = standGroup.children.pop(); o.geometry.dispose(); }
      const ws = wallSize(), top = CLEAR + ws.h;
      for (let k = 0; k < S.cols; k++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, top - 0.05, 0.09), standMat);
        post.position.set(-ws.w / 2 + k * PX + PX / 2, (top - 0.05) / 2, -DEPTH - 0.1); post.castShadow = true;
        standGroup.add(post);
      }
      const foot = new THREE.Mesh(new THREE.BoxGeometry(ws.w * 0.96, 0.05, 0.7), standMat); foot.position.set(0, 0.025, -DEPTH - 0.1); standGroup.add(foot);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(ws.w * 0.98, 0.06, 0.05), standMat); rail.position.set(0, CLEAR - 0.06, -DEPTH - 0.06); standGroup.add(rail);
      contact.scale.set(ws.w * 1.5, 2.4, 1); contact.position.z = -0.1;
      key.target.position.set(0, CLEAR + ws.h / 2, 0);
      const sc = key.shadow.camera; sc.left = -ws.w; sc.right = ws.w; sc.top = ws.h + 2; sc.bottom = -2; sc.near = 1; sc.far = 40; sc.updateProjectionMatrix();
    }

    function resize() {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      width = w; height = h;
      renderer.setPixelRatio(Math.min((window.devicePixelRatio || 1) * AW.prefs.renderScale, 3));
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      if (rig.auto) frame(rig.auto);
      invalidate();
    }
    const ro = new ResizeObserver(resize); ro.observe(container);

    function render() {
      renderer.clear();
      if (AW.prefs.reflections) {
        // mirror pass: the same objects, flipped about the floor plane, seen through a mostly opaque floor
        root.scale.y = -1; root.updateMatrixWorld(true); floor.visible = false; contact.visible = false;
        renderer.render(scene, camera);
        renderer.clearDepth();
        root.scale.y = 1; root.updateMatrixWorld(true); floor.visible = true;
      }
      contact.visible = AW.prefs.shadows !== 'off';
      renderer.render(scene, camera);
    }
    function loop(now) {
      raf = requestAnimationFrame(loop);
      if (!running) { last = now; return; }
      const dt = Math.min(0.12, (now - last) / 1000); last = now;
      const moving = stepRig(dt);
      if (!moving && rig.rate !== 9) rig.rate = 9;
      if (moving || dirty) {
        dirty = false;
        render();
        for (const fn of hooks) fn();
      }
    }

    // ---- pointer input: orbit / pan / zoom. A press that does not move is reported as a click. ----
    const ptrs = new Map(); let gesture = null;
    const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (S.introPlaying) { S.skipIntro(); }
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, local(e));
      const p = local(e);
      if (ptrs.size === 1) gesture = { kind: e.button === 2 || e.button === 1 || e.shiftKey ? 'pan' : (S.mode === 'edit' ? 'none' : 'orbit'), sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: 0, t: performance.now(), btn: e.button };
      else if (ptrs.size === 2) { const a = [...ptrs.values()]; gesture = { kind: 'pinch', d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2, moved: 99 }; }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId) || !gesture) return;
      const p = local(e); ptrs.set(e.pointerId, p);
      const g = rig.goal;
      if (gesture.kind === 'pinch' && ptrs.size >= 2) {
        const a = [...ptrs.values()], d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), cx = (a[0].x + a[1].x) / 2, cy = (a[0].y + a[1].y) / 2;
        g.radius *= gesture.d / Math.max(1, d);
        const u = unitsPerPx(); g.tx -= (cx - gesture.cx) * u; g.ty += (cy - gesture.cy) * u;
        gesture.d = d; gesture.cx = cx; gesture.cy = cy;
      } else {
        const dx = p.x - gesture.lx, dy = p.y - gesture.ly;
        gesture.lx = p.x; gesture.ly = p.y; gesture.moved = Math.max(gesture.moved, Math.hypot(p.x - gesture.sx, p.y - gesture.sy));
        if (gesture.moved < 5) return;
        if (gesture.kind === 'orbit') { g.theta -= dx * 0.0052; g.phi += dy * 0.004; }
        else if (gesture.kind === 'pan') { const u = unitsPerPx(); g.tx -= dx * u * Math.cos(g.theta); g.ty += dy * u; }
        else return;
      }
      rig.auto = null; constrain(); invalidate();
    });
    const end = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const p = local(e); ptrs.delete(e.pointerId);
      if (gesture && gesture.kind !== 'pinch' && gesture.moved < 5 && e.type === 'pointerup' && gesture.btn === 0) AW.bus.emit('stage-click', { x: p.x, y: p.y, pick: S.pick(p.x, p.y), detail: e.detail });
      if (!ptrs.size) gesture = null;
    };
    canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('dblclick', (e) => { const p = local(e); AW.bus.emit('stage-dblclick', { pick: S.pick(p.x, p.y) }); });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (S.introPlaying) S.skipIntro();
      rig.goal.radius *= Math.exp(clamp(e.deltaY, -120, 120) * 0.0016); rig.auto = null; constrain(); invalidate();
    }, { passive: false });
    const unitsPerPx = () => (2 * rig.cur.radius * Math.tan((FOV * Math.PI) / 360)) / height;

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); running = false;
      AW.log('error', 'stage', 'WebGL context lost; switching to the 2D fallback');
      AW.bus.emit('stage-lost', null);
    });

    const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
    return {
      kind: '3d', canvas,
      invalidate,
      settled: () => rig.settled,
      setInsets(i) { Object.assign(S.insets, i); if (rig.auto) frame(rig.auto); invalidate(); },
      setMode(mode) { S.mode = mode; if (mode === 'edit') frame('front'); else frame('three'); constrain(); },
      frontView() { frame('front'); }, fitAll() { frame('fit'); constrain(); }, threeQuarter() { frame('three'); },
      focusTile(key) {
        const [r, k] = key.split(',').map(Number), g = rig.goal;
        rig.auto = null;
        g.tx = -wallSize().w / 2 + k * PX + PX / 2; g.ty = CLEAR + wallSize().h - (r * PY + PY / 2);
        g.radius = Math.max(limits().rmin, fitRadius(0.9) * Math.max(0.28, 1.5 / Math.max(S.cols, S.rows))) * (S.mode === 'edit' ? 1 : 1.15);
        if (S.mode !== 'edit') { g.theta = clamp(g.theta, -0.3, 0.3); g.phi = clamp(g.phi, 0, 0.2); }
        constrain(); invalidate();
      },
      nudge(dTheta, dPhi, dPanX, dPanY, zoom) {
        const g = rig.goal, u = unitsPerPx() * 40;
        g.theta += dTheta; g.phi += dPhi; g.tx += dPanX * u; g.ty += dPanY * u; if (zoom) g.radius *= zoom;
        rig.auto = null; constrain(); invalidate();
      },
      // Adds/removes monitor objects so the scene matches the logical grid. Existing monitors keep their identity.
      syncGrid(cols, rows, animate) {
        const first = !S.cols;
        S.cols = cols; S.rows = rows;
        if (C.configure(cols, rows) || !texture) rebuildTexture();
        const want = new Set();
        let i = 0;
        for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
          const key = r + ',' + k; want.add(key);
          let m = monitors.get(key);
          if (!m) { m = makeMonitor(key); if (animate) arrive(m, Math.min(i++ * 45, 400)); else { m.z = 0; m.scale = 1; m.power = 1; } }
          else if (m.leaving) arrive(m, 0);
          setUV(m.screen.geometry, r, k); place(m);
        }
        for (const m of monitors.values()) if (!want.has(m.key) && !m.leaving) { if (animate) leave(m); else { m.leaving = true; wallGroup.remove(m.group); monitors.delete(m.key); } }
        const ws = wallSize();
        rig.goal.gx = -ws.w / 2; rig.goal.gy = CLEAR + ws.h;
        if (first) { rig.cur.gx = rig.goal.gx; rig.cur.gy = rig.goal.gy; }
        rebuildStand();
        if (S.mode === 'edit') frame('front'); else if (first) frame('three'); else { frame(rig.auto || 'fit'); }
        constrain(); invalidate();
      },
      redraw(opts) { C.draw(Object.assign({ comp: W.comp(), edit: S.mode === 'edit', idAlpha: S.idAlpha }, opts || {})); if (texture) texture.needsUpdate = true; invalidate(); },
      projectLocal(lx, ly) {
        v3.set(rig.cur.gx + lx, rig.cur.gy - ly, 0.002).project(camera);
        return { x: (v3.x + 1) / 2 * width, y: (1 - v3.y) / 2 * height, visible: v3.z > -1 && v3.z < 1 };
      },
      pick(px, py) {
        v3.set((px / width) * 2 - 1, 1 - (py / height) * 2, 0.5).unproject(camera);
        v3b.copy(v3).sub(camera.position);
        if (Math.abs(v3b.z) < 1e-6) return null;
        const tt = -camera.position.z / v3b.z; if (tt <= 0) return null;
        const lx = camera.position.x + v3b.x * tt - rig.cur.gx, ly = rig.cur.gy - (camera.position.y + v3b.y * tt);
        const inside = lx >= 0 && ly >= 0 && lx < S.cols * PX && ly < S.rows * PY;
        return { x: toLogicalX(lx), y: toLogicalY(ly), inside, tile: inside ? Math.floor(ly / PY) + ',' + Math.floor(lx / PX) : null };
      },
      // Stage pixels per logical pixel. Exact in the front-aligned editing view.
      scale() { return (SW / MW) / unitsPerPx(); },
      aligned() { return Math.abs(rig.cur.theta) < 0.002 && Math.abs(rig.cur.phi) < 0.002; },
      playIntro(done) {
        if (AW.motion.reduced()) { done && done(); return; }
        S.introPlaying = true; S.idAlpha = 0;
        const fit = fitRadius(0.86);
        Object.assign(rig.cur, { theta: -0.95, phi: 0.5, radius: fit * 2.3 });
        rig.rate = 3.4;
        let i = 0;
        for (const m of monitors.values()) { m.z = -2.6 - (i % 3) * 0.5; m.scale = 0.8; m.power = 0; place(m); arrive(m, 120 + i * 48); i++; }
        const total = 120 + i * 48 + 520;
        AW.motion.to('intro:ids', { from: 0, to: 1, dur: 320, delay: total, spatial: false, update: (v) => { S.idAlpha = v; S.redraw(); }, done: () => { S.introPlaying = false; done && done(); } });
        S.redraw();
        S._introDone = done;
      },
      skipIntro() {
        if (!S.introPlaying) return;
        AW.motion.finishPrefix('mon:'); AW.motion.cancel('intro:ids');
        S.introPlaying = false; S.idAlpha = 1; rig.rate = 9;
        Object.assign(rig.cur, rig.goal);
        S.redraw();
        const d = S._introDone; S._introDone = null; if (d) d();
      },
      applyQuality() {
        const soft = AW.prefs.shadows === 'soft';
        renderer.shadowMap.enabled = soft; key.castShadow = soft;
        for (const mat of [bodyMat, floorMat, standMat]) mat.needsUpdate = true;
        for (const m of monitors.values()) m.body.material.needsUpdate = true;
        floorMat.opacity = AW.prefs.reflections ? 0.84 : 1; floorMat.transparent = AW.prefs.reflections;
        if (S.cols && C.configure(S.cols, S.rows)) rebuildTexture();
        resize(); if (S.cols) S.redraw();
      },
      applyTheme() {
        const cs = getComputedStyle(document.documentElement);
        const bg = cs.getPropertyValue('--stage-bg').trim() || '#0c0f13', fl = cs.getPropertyValue('--stage-floor').trim() || '#14181e';
        scene.background = new THREE.Color(bg); floorMat.color.set(fl); invalidate();
      },
      pause(p) { running = !p; if (!p) { last = performance.now(); resize(); invalidate(); } },
      start() { resize(); if (!raf) raf = requestAnimationFrame(loop); },
      dispose() { cancelAnimationFrame(raf); raf = 0; running = false; ro.disconnect(); AW.motion.cancelPrefix('mon:'); try { renderer.dispose(); } catch (_) { /* already lost */ } canvas.remove(); },
    };
  }

  // =====================================================================================
  // 2D fallback: same contract, front view only, basic editing.
  // =====================================================================================
  function create2D(container) {
    const canvas = document.createElement('canvas');
    canvas.className = 'stage-canvas flat';
    container.insertBefore(canvas, container.firstChild);
    const g = canvas.getContext('2d');
    let width = 1, height = 1, sc = 1, ox = 0, oy = 0, dirty = true, raf = 0, running = true, zoom = 1, panX = 0, panY = 0;
    const invalidate = () => { dirty = true; };
    function layout() {
      const fw = Math.max(120, width - S.insets.left - S.insets.right), fh = Math.max(100, height - S.insets.top - S.insets.bottom);
      const ww = S.cols * PX, wh = S.rows * PY;
      sc = Math.min((fw * 0.9) / ww, (fh * 0.86) / wh) * zoom;
      ox = S.insets.left + (fw - ww * sc) / 2 + panX; oy = S.insets.top + (fh - wh * sc) / 2 + panY;
    }
    function resize() {
      const w = container.clientWidth, h = container.clientHeight; if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = w; height = h; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0); invalidate();
    }
    const ro = new ResizeObserver(resize); ro.observe(container);
    function render() {
      layout();
      const cs = getComputedStyle(document.documentElement);
      g.fillStyle = cs.getPropertyValue('--stage-bg').trim() || '#0c0f13'; g.fillRect(0, 0, width, height);
      for (let r = 0; r < S.rows; r++) for (let k = 0; k < S.cols; k++) {
        const x = ox + (k * PX + GAP / 2) * sc, y = oy + (r * PY + GAP / 2) * sc;
        g.fillStyle = '#232a33'; g.fillRect(x, y, (SW + 2 * BEZEL) * sc, (SH + 2 * BEZEL) * sc);
        g.drawImage(C.canvas, k * C.tw, r * C.th, C.tw, C.th, x + BEZEL * sc, y + BEZEL * sc, SW * sc, SH * sc);
      }
    }
    function loop() { raf = requestAnimationFrame(loop); if (!running || !dirty) return; dirty = false; render(); for (const fn of hooks) fn(); }
    const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = Object.assign(local(e), { moved: 0, pan: e.button !== 0 || e.shiftKey }); canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (!down) return; const p = local(e); if (down.pan) { panX += p.x - (down.lx || down.x); panY += p.y - (down.ly || down.y); invalidate(); } down.lx = p.x; down.ly = p.y; down.moved = Math.max(down.moved, Math.hypot(p.x - down.x, p.y - down.y)); });
    canvas.addEventListener('pointerup', (e) => { const p = local(e); if (down && down.moved < 5 && e.button === 0) AW.bus.emit('stage-click', { x: p.x, y: p.y, pick: S.pick(p.x, p.y), detail: e.detail }); down = null; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = clamp(zoom * Math.exp(-clamp(e.deltaY, -120, 120) * 0.0016), 0.4, 4); invalidate(); }, { passive: false });
    return {
      kind: '2d', canvas, invalidate,
      settled: () => true, aligned: () => true,
      setInsets(i) { Object.assign(S.insets, i); invalidate(); },
      setMode(mode) { S.mode = mode; invalidate(); },
      frontView() { zoom = 1; panX = panY = 0; invalidate(); }, fitAll() { zoom = 1; panX = panY = 0; invalidate(); }, threeQuarter() { invalidate(); },
      focusTile() { invalidate(); },
      nudge(a, b, px, py, z) { panX -= px * 40; panY += py * 40; if (z) zoom = clamp(zoom / z, 0.4, 4); invalidate(); },
      syncGrid(cols, rows) { S.cols = cols; S.rows = rows; C.configure(cols, rows); invalidate(); },
      redraw(opts) { C.draw(Object.assign({ comp: W.comp(), edit: S.mode === 'edit', idAlpha: 1 }, opts || {})); invalidate(); },
      projectLocal(lx, ly) { layout(); return { x: ox + lx * sc, y: oy + ly * sc, visible: true }; },
      pick(px, py) {
        layout();
        const lx = (px - ox) / sc, ly = (py - oy) / sc, inside = lx >= 0 && ly >= 0 && lx < S.cols * PX && ly < S.rows * PY;
        return { x: toLogicalX(lx), y: toLogicalY(ly), inside, tile: inside ? Math.floor(ly / PY) + ',' + Math.floor(lx / PX) : null };
      },
      scale() { layout(); return (SW / MW) * sc; },
      playIntro(done) { done && done(); }, skipIntro() {},
      applyQuality() { if (S.cols) { C.configure(S.cols, S.rows); S.redraw(); } },
      applyTheme() { invalidate(); },
      pause(p) { running = !p; if (!p) { resize(); invalidate(); } },
      start() { resize(); if (!raf) raf = requestAnimationFrame(loop); },
      dispose() { cancelAnimationFrame(raf); raf = 0; ro.disconnect(); canvas.remove(); },
    };
  }
})();
