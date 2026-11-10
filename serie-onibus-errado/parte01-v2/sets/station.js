// station.js: the rodoviária at night, dense with props, extras and physics.
// Build once; update(t) sets every moving thing from t (simulations are precomputed at build time).
import * as THREE from 'three';
import { toon, basic, paintTex, extra, cast } from './rig.js';
import { staticObstacles, makeGrid, planRoute, schedule } from './plan.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const hash = (i, s = 5) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const box = (w, h, d, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
const cyl = (a, b, h, mat, x, y, z, parent, s = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, s), mat); m.position.set(x, y, z); parent.add(m); return m; };
function label(text, w, h, { bg = '#1E4FA0', fg = '#fff', font = '900 120px Display', pad = 0.72, border = null, align = 'center' } = {}) {
  return paintTex(w, h, (c) => {
    c.fillStyle = bg; c.fillRect(0, 0, w, h);
    if (border) { c.strokeStyle = border; c.lineWidth = Math.max(6, h * 0.05); c.strokeRect(0, 0, w, h); }
    c.fillStyle = fg; c.font = font; c.textAlign = align; c.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((ln, i) => c.fillText(ln, align === 'center' ? w / 2 : w * 0.05, h * (0.5 + (i - (lines.length - 1) / 2) * pad / lines.length)));
  });
}
const plane = (w, h, tex, x, y, z, ry, parent, emissive = false) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), emissive ? basic(0xffffff, tex) : toon(0xffffff, tex)); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m;
};

export function stationSet(opts = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1C1630);
  scene.fog = new THREE.Fog(0x2A2238, 26, 70);
  // light falls from the ceiling lamps: a soft fill, one top-down key that casts the shadows, and a pool of light under each lamp row
  scene.add(new THREE.HemisphereLight(0xFFEBD6, 0x2A2230, 0.5));
  scene.add(new THREE.AmbientLight(0xFFF0E0, 0.18));
  const key = new THREE.DirectionalLight(0xFFF3E2, 2.3); key.position.set(1.5, 14, 6); key.target.position.set(0.5, 0, 4); scene.add(key); scene.add(key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 12, bottom: -12, near: 2, far: 30 }); key.shadow.camera.updateProjectionMatrix();
  for (const [x, z] of [[-4, 2], [3.5, 2], [-4, 8], [3.5, 8], [-4, 14], [3.5, 14], [0.3, -0.6]]) {
    const sp = new THREE.SpotLight(0xFFEFD2, 20, 10, 0.95, 0.65, 1.5); sp.position.set(x, 4.6, z); sp.target.position.set(x, 0, z); scene.add(sp); scene.add(sp.target);
  }
  const busGlow = new THREE.PointLight(0xFFE9B0, 6, 7, 1.6); busGlow.position.set(6.75, 1.2, -1.5); scene.add(busGlow);
  const W = new THREE.Group(); scene.add(W);

  // ------------------------------------------------ floor, platform edge, bays
  const tiles = paintTex(512, 512, (c, w, h) => {
    c.fillStyle = '#B9AE9E'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#B3A797' : '#C1B6A6'; c.fillRect(x * 128 + 2, y * 128 + 2, 124, 124); }
    c.strokeStyle = '#8E8475'; c.lineWidth = 3; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 128); c.lineTo(w, i * 128); c.stroke(); }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(80,60,50,${0.05 + hash(i) * 0.08})`; c.beginPath(); c.ellipse(hash(i, 2) * w, hash(i, 3) * h, 8 + hash(i, 4) * 30, 5 + hash(i, 6) * 14, hash(i, 7) * 3, 0, 7); c.fill(); }
  }, [18, 14]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 28), toon(0xffffff, tiles)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 6); floor.receiveShadow = true; W.add(floor);
  box(36, 0.02, 0.18, toon(0xF2C230), 0, 0.01, -1.55, W);
  const tactile = paintTex(256, 64, (c, w, h) => { c.fillStyle = '#E8B820'; c.fillRect(0, 0, w, h); c.fillStyle = '#B68D10'; for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); } }, [40, 1]);
  box(36, 0.02, 0.4, toon(0xffffff, tactile), 0, 0.012, -1.85, W);
  box(36, 0.3, 0.12, toon(0x8A8378), 0, -0.14, -2.05, W);                    // curb face
  const asphalt = paintTex(256, 256, (c, w, h) => { c.fillStyle = '#3A3640'; c.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(255,255,255,${hash(i) * 0.05})`; c.fillRect(hash(i, 2) * w, hash(i, 3) * h, 2, 2); } }, [10, 6]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 26), toon(0xffffff, asphalt)); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.28, -15); road.receiveShadow = true; W.add(road);
  for (const x of [-9.3, -3, 3.6, 9.9]) box(0.12, 0.01, 10, basic(0xEDEDED), x, -0.27, -7.5, W);
  for (const [x, n] of [[-6.15, '8'], [0.3, '9'], [6.75, '10']]) { const t = label(n, 128, 128, { bg: '#3A3640', fg: '#EDEDED', font: '900 100px Display' }); const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), basic(0xffffff, t)); p.rotation.x = -Math.PI / 2; p.position.set(x, -0.265, -3.6); W.add(p); }

  // ------------------------------------------------ roof, beams, hanging lamps
  box(36, 0.3, 22, toon(0x3C3550), 0, 6.15, 5, W);
  for (let z = -3; z <= 15; z += 3) box(36, 0.35, 0.25, toon(0x55506A), 0, 5.85, z, W);
  for (let x = -15; x <= 15; x += 5) box(0.25, 0.35, 22, toon(0x55506A), x, 5.7, 5, W);
  const lamps = [];
  for (let z = -1; z <= 14; z += 3) for (const x of [-4, 3.5]) {
    const piv = new THREE.Group(); piv.position.set(x, 5.85, z); W.add(piv);
    const c1 = box(0.015, 1.1, 0.015, toon(0x222222), -0.5, -0.55, 0, piv); const c2 = box(0.015, 1.1, 0.015, toon(0x222222), 0.5, -0.55, 0, piv);
    const housing = box(1.3, 0.1, 0.28, toon(0xD8D8D8), 0, -1.15, 0, piv);
    const tube = box(1.2, 0.05, 0.18, basic(0xFFF6DA), 0, -1.22, 0, piv);
    lamps.push({ piv, tube, ph: hash(x * 7 + z), flick: x === -4 && z === 8 });
  }

  // ------------------------------------------------ columns with posters
  const posterTex = [
    label('PASTEL\nR$ 8', 256, 384, { bg: '#F2C230', fg: '#B23A2A', font: '900 90px Display', border: '#7A1A10' }),
    label('VIAJE\nBEM!', 256, 384, { bg: '#2D5DA8', fg: '#fff', font: '900 84px Display' }),
    label('PROMO\n12x', 256, 384, { bg: '#C0392B', fg: '#fff', font: '900 84px Display' }),
    label('ÁGUA\nR$ 4', 256, 384, { bg: '#16A085', fg: '#fff', font: '900 84px Display' }),
  ];
  let pi = 0;
  for (const z of [-0.6, 5.5, 11.5]) for (const x of [-4.6, 5.2]) {
    box(0.55, 5.8, 0.55, toon(0x7A7090), x, 2.9, z, W);
    box(0.6, 0.25, 0.6, toon(0x5E5674), x, 0.12, z, W);
    plane(0.5, 0.75, posterTex[pi++ % 4], x, 1.7, z + 0.28, 0, W);
  }

  // ------------------------------------------------ left wall: shops + ticket windows
  box(0.3, 6.2, 22, toon(0x8C7F70), -9.2, 3.0, 5, W);
  const shops = [
    { z: 12, name: 'PASTELARIA', bg: '#C0392B', counter: 0xE0C9A6 },
    { z: 7.5, name: 'BILHETERIA', bg: '#1E4FA0', counter: 0xC9CED6, guiche: true },
    { z: 2.5, name: 'LANCHONETE', bg: '#E67E22', counter: 0xE0C9A6 },
  ];
  const clerks = [];
  for (const s of shops) {
    box(0.4, 0.2, 4, toon(0x6A5E52), -8.9, 3.2, s.z, W);
    plane(3.8, 0.7, label(s.name, 1024, 192, { bg: s.bg, font: '900 130px Display' }), -8.65, 3.65, s.z, Math.PI / 2, W, true);
    const awn = paintTex(256, 64, (c, w, h) => { for (let x = 0; x < w; x += 32) { c.fillStyle = (x / 32) % 2 ? '#fff' : s.bg; c.fillRect(x, 0, 32, h); } });
    const a = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.9), toon(0xffffff, awn)); a.position.set(-8.4, 3.05, s.z); a.rotation.set(0, Math.PI / 2, 0); a.rotateX(-0.5); W.add(a);
    box(0.9, 1.05, 3.6, toon(s.counter), -8.5, 0.52, s.z, W);
    box(0.95, 0.06, 3.7, toon(0x8A6A4A), -8.5, 1.07, s.z, W);
    box(0.05, 1.6, 3.6, basic(0x9FD3E6, null, { transparent: true, opacity: 0.25 }), -8.05, 1.9, s.z, W);
    if (s.guiche) for (let i = 0; i < 3; i++) { plane(0.6, 0.25, label(`GUICHÊ ${i + 1}`, 256, 96, { bg: '#0E2A55', font: '900 52px UI' }), -8.03, 2.55, s.z - 1.2 + i * 1.2, Math.PI / 2, W, true); }
    else for (let i = 0; i < 5; i++) { const it = cyl(0.09, 0.09, 0.05, toon(0xF2C14E), -8.5, 1.13, s.z - 1.4 + i * 0.7, W); it.scale.z = 1.6; }
    plane(1.6, 0.9, label(s.guiche ? 'EUROPA EXP.\nPLAT. 9' : 'CARDÁPIO\nPASTEL  8\nCOXINHA 7\nCAFÉ    4', 512, 288, { bg: '#1A1A1A', fg: '#FFE7A0', font: '700 46px UI', pad: 0.8 }), -9.03, 2.4, s.z + 1.0, Math.PI / 2, W, true);
    const ck = extra(70 + clerks.length); ck.root.position.set(-9.0, 0, s.z + (s.guiche ? 0 : -0.6)); ck.root.rotation.y = Math.PI / 2; W.add(ck.root); clerks.push(ck);
  }
  // vending machine + bins + plants
  box(0.9, 1.9, 0.8, toon(0xC0392B), -8.5, 0.95, 9.9, W);
  plane(0.6, 1.2, paintTex(128, 256, (c, w, h) => { c.fillStyle = '#E8F4FF'; c.fillRect(0, 0, w, h); const cl = ['#C0392B', '#2E86C1', '#F1C40F', '#27AE60']; for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) { c.fillStyle = cl[(x + y) % 4]; c.fillRect(12 + x * 38, 14 + y * 46, 26, 34); } }), -8.04, 1.15, 9.9, Math.PI / 2, W, true);
  const bins = [];
  for (const [x, z] of [[-3.8, 3.2], [4.4, 8.6], [-3.8, 9.5], [2.6, 0.6]]) { const b = cyl(0.25, 0.22, 0.75, toon(0x2E7D32), x, 0.38, z, W); bins.push(b); cyl(0.27, 0.27, 0.06, toon(0x1B5E20), x, 0.77, z, W); }
  for (const [x, z] of [[-8.3, 5.1], [8.3, 5.1], [8.3, 12.6]]) { cyl(0.32, 0.25, 0.6, toon(0x8D6E63), x, 0.3, z, W); const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), toon(0x2E7D32)); leaves.position.set(x, 1.05, z); leaves.scale.y = 1.3; W.add(leaves); }

  // ------------------------------------------------ right side: benches, luggage, departures board, clock
  box(0.3, 6.2, 22, toon(0x8C7F70), 9.2, 3.0, 5, W);
  for (const z of [3.5, 6.5, 9.5, 12.5]) {
    box(3.2, 0.06, 0.5, toon(0x9AA3AD), 7.2, 0.48, z, W); box(3.2, 0.5, 0.06, toon(0x9AA3AD), 7.2, 0.75, z + 0.25, W);
    for (const dx of [-1.4, 0, 1.4]) box(0.06, 0.48, 0.45, toon(0x5E6670), 7.2 + dx, 0.24, z, W);
  }
  const bagCols = [0x2D5DA8, 0xC0392B, 0x6C3483, 0x16A085, 0xE67E22];
  for (let i = 0; i < 9; i++) { const x = 6.0 + hash(i, 9) * 2.6, z = 3.0 + hash(i, 10) * 10; const s = 0.5 + hash(i, 11) * 0.3; const b = box(s * 0.7, s, s * 0.35, toon(bagCols[i % 5]), x, s / 2, z + 0.5, W); b.rotation.y = hash(i, 12) * 1.2; }
  const boardTex = (() => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.ctx = cv.getContext('2d'); return t; })();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), basic(0xffffff, boardTex)); board.position.set(9.03, 3.6, 7.5); board.rotation.y = -Math.PI / 2; W.add(board);
  box(0.12, 2.0, 3.8, toon(0x222222), 9.1, 3.6, 7.5, W);
  const clock = new THREE.Group(); clock.position.set(0.3, 4.9, 7.5); W.add(clock);
  const cf = cyl(0.42, 0.42, 0.08, toon(0xF5F5F5), 0, 0, 0, clock, 32); cf.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), toon(0x222222)); clock.add(ring);
  const hH = box(0.03, 0.22, 0.01, toon(0x111111), 0, 0.1, 0.05, clock), hM = box(0.02, 0.33, 0.01, toon(0x111111), 0, 0.15, 0.06, clock);
  box(0.02, 0.9, 0.02, toon(0x222222), 0, 0.85, 0, clock);

  // ------------------------------------------------ platform signs (8, 9, 10); 9's plate is loose
  const plates = {};
  for (const [x, n] of [[-6.15, '8'], [0.3, '9'], [6.75, '10']]) {
    const b = box(2.6, 0.62, 0.1, toon(0x1E4FA0), x, 4.25, -1.35, W);
    plane(2.5, 0.55, label('PLATAFORMA', 1024, 220, { bg: '#1E4FA0', font: '900 150px Display' }), x, 4.25, -1.29, 0, W, true);
    for (const dx of [-1.1, 1.1]) box(0.02, 1.4, 0.02, toon(0x777777), x + dx, 5.25, -1.35, W);
    const piv = new THREE.Group(); piv.position.set(x, 3.55, -1.33); W.add(piv);
    const plate = box(0.62, 0.62, 0.06, toon(0xFFD23F), 0, 0, 0, piv);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), basic(0xffffff, label(n, 256, 256, { bg: '#FFD23F', fg: '#111', font: '900 210px Display' }))); face.position.z = 0.035; plate.add(face);
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.035; plate.add(back);
    box(0.012, 0.32, 0.012, toon(0x777777), 0, 0.46, 0, piv);
    plates[n] = piv;
  }

  // ------------------------------------------------ buses (parked + one arriving with suspension)
  // a coach: front at local z=0, body to z=-11.6, wheels in real arches, framed glass, doors, mirrors, lights, roof AC
  function makeBus(color, dest, destColor = '#FFB000', livery = '#F2C230') {
    const g = new THREE.Group(), paint = toon(color), dark = toon(0x16181C), glass = toon(0x1C3A4A), chrome = toon(0xC9CED6);
    const Wd = 2.55, half = Wd / 2, L = 11.6;
    const upper = new THREE.Mesh(new RoundedBoxGeometry(Wd, 2.35, L, 4, 0.16), paint); upper.position.set(0, 2.2, -L / 2); g.add(upper);
    // lower skirt between the wheel arches (front, middle, rear) — wheels sit in the gaps
    for (const [z0, z1] of [[-0.05, -0.85], [-2.25, -8.05], [-9.45, -11.55]]) { const sk = new THREE.Mesh(new RoundedBoxGeometry(Wd, 0.72, z0 - z1, 2, 0.06), paint); sk.position.set(0, 0.69, (z0 + z1) / 2); g.add(sk); }
    for (const zc of [-1.55, -8.75]) { const top = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, Wd - 0.02, 24, 1, false, 0, Math.PI), dark); top.rotation.set(0, 0, Math.PI / 2); top.rotateX(Math.PI / 2); top.position.set(0, 0.6, zc); top.scale.set(1, 1, 1); g.add(top); }
    // livery stripes along both sides
    const liv = paintTex(1024, 128, (c, w, h) => { c.fillStyle = livery; c.fillRect(0, 30, w, 26); c.fillStyle = '#ffffff'; c.fillRect(0, 62, w, 10); c.fillStyle = '#fff'; c.font = '900 52px Display'; c.fillText('VIAÇÃO', 40, 118); });
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.5, 1.2), new THREE.MeshToonMaterial({ map: liv, transparent: true, color: 0xffffff })); st.position.set(sx * (half + 0.004), 1.25, -L / 2); st.rotation.y = sx * Math.PI / 2; g.add(st); }
    // side window band with pillars
    const win = paintTex(1024, 128, (c, w, h) => { c.fillStyle = '#101418'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 128) { const gr = c.createLinearGradient(x, 0, x + 120, h); gr.addColorStop(0, '#2C5468'); gr.addColorStop(0.5, '#1C3A4A'); gr.addColorStop(1, '#3E7088'); c.fillStyle = gr; c.fillRect(x + 8, 10, 112, h - 20); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x + 20, 16, 14, h - 32); } });
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(L - 2.2, 1.05), toon(0xffffff, win)); w.position.set(sx * (half + 0.006), 2.45, -L / 2 - 0.7); w.rotation.y = sx * Math.PI / 2; g.add(w); }
    // passenger door (vehicle's right side = -x) with glass
    { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 2.3), toon(0xffffff, paintTex(128, 320, (c, w, h) => { c.fillStyle = '#16181C'; c.fillRect(0, 0, w, h); c.fillStyle = '#2C5468'; c.fillRect(8, 8, 52, h - 16); c.fillRect(68, 8, 52, h - 16); }))); d.position.set(-(half + 0.008), 1.6, -0.45); d.rotation.y = -Math.PI / 2; g.add(d); }
    // front: windshield (split), frame, wipers, destination sign, grille, lights, bumper, plate
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.45), toon(0xffffff, paintTex(256, 160, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3E7088'); gr.addColorStop(0.6, '#1C3A4A'); gr.addColorStop(1, '#2C5468'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(30, 0); c.lineTo(70, 0); c.lineTo(20, h); c.lineTo(-20, h); c.fill(); })));
    ws.position.set(0, 2.35, 0.012); g.add(ws);
    box(0.06, 1.45, 0.03, dark, 0, 2.35, 0.02, g); box(2.34, 0.06, 0.03, dark, 0, 3.08, 0.02, g); box(2.34, 0.06, 0.03, dark, 0, 1.62, 0.02, g);
    for (const sx of [-0.55, 0.55]) { const wp = box(0.75, 0.025, 0.025, dark, sx, 1.7, 0.04, g); wp.rotation.z = sx > 0 ? 0.35 : -0.35; }
    box(2.0, 0.34, 0.06, dark, 0, 3.28, 0.02, g);
    plane(1.9, 0.28, label(dest, 640, 96, { bg: '#0A0A0A', fg: destColor, font: '900 66px UI' }), 0, 3.28, 0.055, 0, g, true);
    box(1.3, 0.38, 0.04, dark, 0, 1.05, 0.02, g);
    for (let i = 0; i < 5; i++) box(1.2, 0.03, 0.02, toon(0x3A3D44), 0, 0.92 + i * 0.065, 0.045, g);
    for (const sx of [-1, 1]) {
      const hl = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.2, 0.06, 2, 0.04), basic(0xFFF6CC)); hl.position.set(sx * 0.95, 1.0, 0.03); g.add(hl);
      const ind = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.12, 0.05, 2, 0.03), basic(0xFFA020)); ind.position.set(sx * 1.08, 0.78, 0.03); g.add(ind);
      // mirror on an arm, ahead of the windshield
      const arm = box(0.04, 0.04, 0.5, dark, sx * (half - 0.05), 3.0, 0.25, g); arm.rotation.x = 0.3;
      const mir = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.42, 0.08, 2, 0.03), dark); mir.position.set(sx * (half - 0.05), 2.68, 0.46); g.add(mir);
    }
    const bump = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.32, 0.22, 2, 0.08), toon(0x2A2C30)); bump.position.set(0, 0.5, 0.03); g.add(bump);
    plane(0.52, 0.16, label('BRA 2E19', 256, 80, { bg: '#F5F5F5', fg: '#111', font: '900 44px UI' }), 0, 0.5, 0.15, 0, g, true);
    // roof air-conditioning unit
    const ac = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.28, 3.2, 2, 0.08), toon(0xD8DCE0)); ac.position.set(0, 3.5, -4.2); g.add(ac);
    // wheels: tyre, rim, hub nuts
    for (const zc of [-1.55, -8.75]) for (const sx of [-1, 1]) {
      const wg = new THREE.Group(); wg.position.set(sx * (half - 0.16), 0.52, zc); g.add(wg);
      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.32, 24), toon(0x141414)); tyre.rotation.z = Math.PI / 2; wg.add(tyre);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.33, 20), chrome); rim.rotation.z = Math.PI / 2; wg.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.35, 12), toon(0x888888)); hub.rotation.z = Math.PI / 2; wg.add(hub);
      g.userData.wheels = (g.userData.wheels || []).concat(wg);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    W.add(g); return g;
  }
  const bus8 = makeBus(0x2D5DA8, 'SÃO PAULO', '#FFB000', '#F2F2F2'); bus8.position.set(-6.15, -0.28, -3.0);
  const bus10 = makeBus(0xC93A3A, 'CURITIBA', '#FFB000', '#F2C230'); // arriving into bay 10, rolling in from behind (along +z)
  // far wall + skyline
  box(60, 3, 0.4, toon(0x6A5E70), 0, 1.2, -24, W);
  const winTex = paintTex(256, 512, (c, w, h) => { c.fillStyle = '#2A1D40'; c.fillRect(0, 0, w, h); for (let y = 16; y < h; y += 44) for (let x = 14; x < w; x += 50) { c.fillStyle = hash(x * 3 + y) > 0.5 ? '#FFC86B' : '#1A1230'; c.fillRect(x, y, 30, 26); } });
  for (let i = 0; i < 16; i++) { const h = 10 + hash(i) * 18, w = 5 + hash(i, 3) * 5; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 5), basic(0xffffff, winTex, { fog: false })); b.position.set(-38 + i * 5.2, h / 2 - 0.3, -34 - hash(i, 9) * 8); W.add(b); }

  // ------------------------------------------------ floor clutter: litter, wet-floor sign, newspaper stand, puddle
  const litterCols = [0xFFFFFF, 0xF5E6C8, 0xE74C3C, 0x3498DB, 0xF1C40F];
  for (let i = 0; i < 46; i++) {
    const x = -7 + hash(i, 51) * 14, z = -1.2 + hash(i, 52) * 14;
    if (Math.abs(x - 0.3) < 0.5 && z > 1.5) continue;
    const kind = hash(i, 53);
    const m = kind < 0.6 ? new THREE.Mesh(new THREE.PlaneGeometry(0.1 + hash(i, 54) * 0.12, 0.08 + hash(i, 55) * 0.1), basic(litterCols[i % 5], null, { side: THREE.DoubleSide }))
      : new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6), toon(0xEEE6D8));
    m.position.set(x, kind < 0.6 ? 0.004 : 0.009, z); m.rotation.set(kind < 0.6 ? -Math.PI / 2 : Math.PI / 2, 0, hash(i, 56) * 6);
    if (kind < 0.6) { m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; m.material.polygonOffsetUnits = -2; } W.add(m);
  }
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), basic(0x7A8FA0, null, { transparent: true, opacity: 0.35 })); puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.4, 0.8, 1); puddle.position.set(-2.4, 0.003, 5.6); puddle.material.polygonOffset = true; puddle.material.polygonOffsetFactor = -1; puddle.material.polygonOffsetUnits = -2; puddle.material.depthWrite = false; W.add(puddle);
  { const g = new THREE.Group(); g.position.set(-2.0, 0, 6.3); g.rotation.y = 0.5; W.add(g);
    const signT = label('CUIDADO\nPISO\nMOLHADO', 128, 200, { bg: '#F2C230', fg: '#111', font: '900 30px Display' });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), toon(0xffffff, signT)); p.position.set(0, 0.3, sx * 0.08); p.rotation.set(sx * 0.25, sx > 0 ? 0 : Math.PI, 0); g.add(p); } }
  { const g = new THREE.Group(); g.position.set(4.2, 0, 4.4); g.rotation.y = -0.7; W.add(g);
    box(0.9, 1.3, 0.5, toon(0x2E86C1), 0, 0.65, 0, g); plane(0.8, 0.25, label('JORNAIS', 256, 80, { bg: '#1B4F72', font: '900 50px Display' }), 0, 1.15, 0.26, 0, g, true);
    for (let i = 0; i < 4; i++) plane(0.18, 0.25, label('NEWS', 64, 90, { bg: '#F5F5F5', fg: '#222', font: '900 18px UI' }), -0.3 + i * 0.2, 0.75, 0.26, 0, g); }
  for (const [x, z] of [[-3.3, 1.2], [3.9, 6.9]]) { const c = cyl(0.03, 0.18, 0.55, toon(0xE67E22), x, 0.28, z, W, 12); cyl(0.2, 0.2, 0.04, toon(0xE67E22), x, 0.02, z, W, 12); cyl(0.11, 0.13, 0.08, toon(0xffffff), x, 0.28, z, W, 12); }

  // ------------------------------------------------ pigeons (peck, then flee)
  const pigeons = [];
  const pgBody = toon(0x8C93A3), pgNeck = toon(0x5E7A70), pgDark = toon(0x4A4F5A), pgLeg = toon(0xD4655A);
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(), bodyG = new THREE.Group(); g.add(bodyG);
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), pgBody); body.scale.set(0.82, 0.74, 1.35); bodyG.add(body);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), pgNeck); chest.position.set(0, 0.045, 0.075); bodyG.add(chest);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.11), pgDark); tail.position.set(0, 0.0, -0.15); tail.rotation.x = -0.25; bodyG.add(tail);
    const headG = new THREE.Group(); headG.position.set(0, 0.09, 0.1); bodyG.add(headG);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 10), toon(0x6E7584)); headG.add(head);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), basic(0xE08030)); e.position.set(sx * 0.026, 0.01, 0.015); headG.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.004, 6, 4), basic(0x111111)); p.position.set(sx * 0.031, 0.01, 0.018); headG.add(p); }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.034, 8), toon(0x3A3A3A)); beak.rotation.x = Math.PI / 2; beak.position.set(0, -0.004, 0.045); headG.add(beak);
    const cere = new THREE.Mesh(new THREE.SphereGeometry(0.007, 6, 4), toon(0xEEEEEE)); cere.position.set(0, 0.004, 0.034); headG.add(cere);
    // wings: folded along the body when walking, unfold sideways to fly
    const wings = [-1, 1].map((sx) => { const piv = new THREE.Group(); piv.position.set(sx * 0.055, 0.035, 0.03); bodyG.add(piv);
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), pgBody); w.scale.set(1.0, 0.08, 0.5); w.position.x = sx * 0.09; piv.add(w);
      for (const k of [0, 1]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.006, 0.012), pgDark); bar.position.set(sx * (0.07 + k * 0.012), 0.004, -0.02 - k * 0.025); piv.add(bar); }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 6), pgDark); tip.scale.set(1.0, 0.07, 0.45); tip.position.x = sx * 0.2; piv.add(tip); return piv; });
    const legs = [-1, 1].map((sx) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 6), pgLeg); l.position.set(sx * 0.025, -0.075, 0.01); g.add(l); return l; });
    const p0 = new THREE.Vector3(-0.4 + hash(i, 21) * 1.6, 0.105, 6.6 + hash(i, 22) * 1.4);
    g.position.copy(p0); W.add(g);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const dir = new THREE.Vector3((hash(i, 24) - 0.5) * 0.7, 0, -1).normalize();
    pigeons.push({ g, bodyG, headG, wings, legs, p0, dir, t0: 1.55 + (p0.z - 6.6) * -0.15 + 0.35 + i * 0.07, ry: hash(i, 23) * 6, ph: hash(i, 27) * 6, wander: 0.25 + hash(i, 28) * 0.25 });
  }

  // ------------------------------------------------ the can (kicked at 8.6 s, rolls, bounces off a bin)
  const can = new THREE.Group(); W.add(can);
  const canMesh = cyl(0.033, 0.033, 0.12, toon(0xC0392B), 0, 0, 0, can, 14); canMesh.rotation.z = Math.PI / 2;
  const canSim = (() => {   // 2-D rolling with friction + one bounce, 240 Hz, precomputed
    const out = []; let x = -2.2, z = 0.6, vx = 2.7, vz = 0.12, ang = 0; const dt = 1 / 240;
    for (let i = 0; i < 240 * 6; i++) {
      const v = Math.hypot(vx, vz); if (v > 0.001) { const dec = Math.min(v, 0.75 * dt); vx -= (vx / v) * dec; vz -= (vz / v) * dec; }
      x += vx * dt; z += vz * dt; ang += (Math.hypot(vx, vz) * dt) / 0.033;
      if (x > 2.35 && vx > 0 && Math.abs(z - 0.6 - 0) < 1.0 && x < 2.6) { vx = -vx * 0.45; vz += 0.3; }   // hits the bin at (2.6, 0.6)
      out.push([x, z, ang, Math.atan2(vz, vx)]);
    }
    return out;
  })();

  // ------------------------------------------------ a flyer lifted by the bus' wind
  const flyer = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.3), basic(0xffffff, label('PROMO\nEUROPA', 128, 180, { bg: '#FFF7E0', fg: '#C0392B', font: '900 34px Display' }), { side: THREE.DoubleSide })); W.add(flyer);

  // ------------------------------------------------ the crowd
  // walkers: each follows a real path (enters, turns, stops at a counter/platform or leaves behind the camera).
  // Nobody wraps or pops: before t0 they stand idle at the start, after arriving they stand idle at the end.
  const walkers = [];
  const W_SPECS = [
    // pts, speed, t0, endYaw, suitcase
    [[[-8.4, 13.8], [-3.2, 9.6], [-2.0, 2.0], [-6.15, -0.1]], 1.1, -2, Math.PI, true],
    [[[8.3, 5.6], [2.6, 4.6], [-3.8, 4.4], [-4.8, 7.6]], 1.2, -6, -Math.PI / 2, false],
    [[[-6.5, 3.0], [-1.8, 3.4], [5.1, 2.6]], 1.1, -3.7, Math.PI / 2, false],
    [[[6.8, 11.5], [3.3, 9.8], [2.9, 3.5], [6.6, -0.2]], 1.0, -1, Math.PI, true],
    [[[-3.0, -0.6], [-1.0, 4.5], [-1.4, 17.5]], 1.15, 0.5, 0, false],
    [[[2.4, 18.5], [2.1, 9.0], [1.9, 2.6], [3.95, -0.25]], 1.45, -4, Math.PI, false],
    [[[-5.0, 17.5], [-4.0, 6.0], [-7.6, 0.25]], 1.05, -6, Math.PI, true],
    [[[4.5, -1.0], [3.3, 2.6], [2.9, 9.5], [2.6, 17.5]], 1.0, 10.6, 0, false],
    [[[-8.0, 11.2], [-3.6, 11.4], [0.6, 12.8], [1.4, 18]], 1.2, -1, 0, false],
    [[[8.0, 3.6], [5.0, 1.3], [-1.5, 1.2], [-3.55, -0.2]], 1.05, -7, Math.PI, true],
    [[[-1.8, 17], [-1.2, 12.4], [-3.0, 13.6]], 1.1, -5, 0.4, false],
    [[[3.6, 0.6], [4.0, 8.0], [5.55, 8.95]], 0.95, 2, Math.PI / 2, false],
    [[[-6.2, 6.2], [-3.6, 6.6], [1.6, 7.4], [3.9, 9.2]], 1.0, -1, -Math.PI / 2, false],
    [[[5.3, 13.7], [1.0, 12.2], [-4.0, 12.6], [-6.6, 12.9]], 1.1, -2, -Math.PI / 2, false],
  ];
  function makePath(pts) { const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; } return { pts, seg, L }; }
  function pathAt(P, s) { s = Math.max(0, Math.min(P.L, s)); for (let i = 0; i < P.seg.length; i++) { if (s <= P.seg[i] || i === P.seg.length - 1) { const k = P.seg[i] ? s / P.seg[i] : 0; const a = P.pts[i], b = P.pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } s -= P.seg[i]; } return P.pts[P.pts.length - 1]; }
  const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  const angLerp = (a, b, k) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + d * k; };
  function agentState(A, t) {
    const P = A.path, ta = A.t0 + P.L / A.v;
    // ease in/out of walking so feet plant: s(t) accelerates over 0.4 s and brakes over 0.5 s
    const tt = Math.max(A.t0, Math.min(ta + 0.45, t));
    let s = (tt - A.t0) * A.v; const acc = 0.4, dec = 0.5;
    if (tt - A.t0 < acc) s = A.v * (tt - A.t0) ** 2 / (2 * acc);
    else s = A.v * (tt - A.t0 - acc / 2);
    s = Math.min(P.L, s);
    const [x, z] = pathAt(P, s);
    const [x1, z1] = pathAt(P, s + 0.35), [x0, z0] = pathAt(P, s - 0.35);
    let yaw = Math.atan2(x1 - x0, z1 - z0);
    if (t < A.t0) yaw = A.startYaw ?? yaw;
    if (t > ta) yaw = angLerp(yaw, A.endYaw, smooth(ta, ta + 0.9, t));
    const walkW = smooth(A.t0 - 0.1, A.t0 + 0.4, t) * (1 - smooth(ta - 0.3, ta + 0.35, t));
    return { x, z, yaw, walkW };
  }
  W_SPECS.forEach((s, i) => {
    const p = extra(i + 1); W.add(p.root);
    let suit = null;
    if (s[4]) { suit = new THREE.Group(); box(0.4, 0.6, 0.22, toon(bagCols[i % 5]), 0, 0.32, 0, suit); for (const sx of [-0.15, 0.15]) { const wh = cyl(0.04, 0.04, 0.03, toon(0x111111), sx, 0.04, 0.08, suit, 10); wh.rotation.z = Math.PI / 2; suit.userData.wheels = (suit.userData.wheels || []).concat(wh); } box(0.02, 0.5, 0.02, toon(0x333333), 0, 0.87, 0.1, suit); W.add(suit); }
    walkers.push({ p, way: s[0], path: makePath(s[0]), v: s[1], t0: s[2], endYaw: s[3], suit, off: hash(i, 31) * 3 });
  });
  // idle groups: chatting at the benches, queueing at the ticket windows, waiting at the edge
  const idlers = [];
  const I_SPECS = [
    [7.0, 4.1, Math.PI, 'agree'], [6.2, 4.6, -2.4, 'idle'], [7.9, 7.1, Math.PI, 'headShake'], [6.6, 10.1, 2.8, 'idle'], [7.6, 13.0, Math.PI, 'agree'],
    [-7.2, 7.5, -Math.PI / 2, 'idle'], [-6.4, 7.6, -Math.PI / 2, 'idle'], [-5.6, 7.4, -Math.PI / 2, 'headShake'], [-7.3, 12.2, -Math.PI / 2, 'agree'],
    [-5.4, -0.9, 0.3, 'idle'], [-6.9, -0.7, -0.2, 'agree'], [5.6, -0.8, 0.1, 'idle'], [7.4, -0.6, -0.5, 'headShake'], [-3.0, 5.6, 1.2, 'agree'], [-2.2, 5.9, -1.9, 'idle'],
  ];
  I_SPECS.forEach((s, i) => { const p = extra(i + 30); p.root.position.set(s[0], 0, s[1]); p.root.rotation.y = s[2]; W.add(p.root); idlers.push({ p, clip: s[3], off: hash(i, 41) * 4 }); });

  // ------------------------------------------------ the three friends at platform 9
  // the kicker: walks past the can and boots it at 8.6 s
  const kicker = extra(55); W.add(kicker.root);
  const KICK = { way: [[-7.4, 2.2], [-2.45, 0.42], [-1.95, 0.3]], v: 1.15, t0: 0, endYaw: Math.PI / 2, startYaw: -Math.PI / 2, off: 0.4, fixedTime: true };
  // ---- plan every route around obstacles, then space the extras out in time
  { const OB = staticObstacles(I_SPECS), grid = makeGrid(OB);
    for (const w of walkers) w.path = makePath(planRoute(grid, w.way));
    const kr1 = planRoute(grid, KICK.way.slice(0, 2)), kr2 = planRoute(grid, KICK.way.slice(1));
    KICK.path = makePath(kr1.concat(kr2.slice(1)));
    KICK.t0 = 8.6 - makePath(kr1).L / KICK.v - 0.2;            // reaches the can at 8.6 s
    if (opts.camAt) schedule([KICK, ...walkers], agentState, opts.camAt); }
  const rai = cast('rai'), ger = cast('geraldim'), ben = cast('bento');
  rai.root.position.set(-0.55, 0, -0.75); ger.root.position.set(0.35, 0, -1.0); ben.root.position.set(1.25, 0, -0.7);
  for (const c of [rai, ger, ben]) W.add(c.root);
  W.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.geometry && o.geometry.type !== 'PlaneGeometry' && o.geometry.type !== 'CircleGeometry') o.castShadow = true; o.receiveShadow = true; } });
  floor.castShadow = false; road.castShadow = false;

  // plate ODE (theta'' = g/l * sin(theta) - c * theta'), integrated once at build time
  const PLATE = (() => { const t1 = 16.8; let th = 0.004 * Math.sin(t1 * 1.2) + 0.006, om = 0; const sim = [];
    for (let i = 0; i < 4000; i++) { const dt = 1 / 1000; om += (65 * Math.sin(th) - 15 * om) * dt; th += om * dt; sim.push(th); } return { t1, sim }; })();
  // ------------------------------------------------ update: everything from t
  const v = new THREE.Vector3();
  function update(t, o = {}) {
    // lamps: idle sway + a gust when the bus pulls in (8.6 s); one tube flickers
    const gust = t > 8.6 ? Math.exp(-(t - 8.6) * 0.9) : 0;
    for (const L of lamps) {
      L.piv.rotation.x = 0.018 * Math.sin(t * 1.3 + L.ph * 6) + 0.07 * gust * Math.sin((t - 8.6) * 3.2 + L.ph);
      L.piv.rotation.z = 0.01 * Math.sin(t * 0.9 + L.ph * 3);
      if (L.flick) L.tube.material.color.setScalar(hash(Math.floor(t * 14)) > 0.7 ? 0.25 : 1);
    }
    // departures board (blinking EUROPA line)
    { const c = boardTex.ctx, w = 1024, h = 512; c.fillStyle = '#101010'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#FFB000'; c.font = '800 44px UI'; c.textAlign = 'left';
      c.fillText('PARTIDAS', 30, 60); c.fillText('HORA   DESTINO            PLAT', 30, 120);
      const rows = [['22:10', 'SÃO PAULO', '8'], ['22:25', 'CURITIBA', '10'], ['22:40', 'EUROPA EXPRESS', '9'], ['22:55', 'BELO HORIZONTE', '7'], ['23:10', 'SALVADOR', '11']];
      rows.forEach((r, i) => { if (i === 2 && Math.floor(t * 2) % 2) return; c.fillStyle = i === 2 ? '#FFE070' : '#FFB000'; c.fillText(`${r[0]}  ${r[1].padEnd(18, ' ')} ${r[2]}`, 30, 190 + i * 62); });
      boardTex.needsUpdate = true; }
    hM.rotation.z = -t * 0.05; hH.rotation.z = -1.2;
    // bus 10: cruises in at 5 m/s, brakes uniformly from 5.0 s to a stop at 8.6 s (nose dives), then rocks back
    { const v0 = 5, tb = 5.0, te = 8.6, zs = -3.0, a = v0 / (te - tb), Db = v0 * (te - tb) / 2;
      let z; if (t < tb) z = zs - Db - v0 * (tb - t); else if (t < te) { const k = t - tb; z = zs - Db + v0 * k - 0.5 * a * k * k; } else z = zs;
      bus10.position.set(6.75, -0.28, z); (bus10.userData.wheels || []).forEach((wg) => { wg.rotation.x = (z + 40) / 0.52; });
      const after = t - te; bus10.rotation.x = t < tb ? 0 : t < te ? 0.014 * Math.min(1, (t - tb) / 0.4) : 0.014 * Math.exp(-after * 2.4) * Math.cos(after * 6.8); }
    // pigeons: stroll in small loops with the head-thrust walk and pecks; take off when Caio comes close
    for (const P of pigeons) {
      const dt = t - P.t0;
      const wx = P.p0.x + P.wander * Math.sin(Math.min(t, P.t0) * 0.6 + P.ph), wz = P.p0.z + P.wander * Math.cos(Math.min(t, P.t0) * 0.6 + P.ph) * 0.6;
      const walkYaw = Math.atan2(Math.cos(t * 0.6 + P.ph) * 0.6, -Math.sin(t * 0.6 + P.ph) * 0.6) * 0 + Math.atan2(0.6 * Math.cos(t * 0.6 + P.ph), -0.6 * 0.6 * Math.sin(t * 0.6 + P.ph));
      if (dt < 0) {
        const step = t * 2.3 + P.ph, thrust = (step % 1) < 0.5 ? (step % 1) * 2 : 1 - ((step % 1) - 0.5) * 2;   // head forward, then body catches up
        const peck = Math.max(0, Math.sin(t * 1.1 + P.ph * 2)) ** 14;
        P.g.position.set(wx, P.p0.y + 0.006 * Math.abs(Math.sin(step * Math.PI)), wz); P.g.rotation.set(0, walkYaw, 0);
        P.bodyG.rotation.set(peck * 0.55, 0, 0.03 * Math.sin(step * Math.PI));
        P.headG.position.set(0, 0.09 - peck * 0.03, 0.1 + thrust * 0.025);
        P.wings.forEach((w, i) => { const sx = i ? 1 : -1; w.rotation.set(0, sx * -1.35, 0); });
        P.legs.forEach((l, i) => { l.rotation.x = 0.4 * Math.sin(step * Math.PI + i * Math.PI); l.scale.y = 1; });
      } else {
        // crouch (0.08 s), jump, beat hard while climbing out under the roof toward the open bays
        const launch = Math.max(0, dt - 0.08);
        const hor = 1.2 * launch + 1.3 * launch * launch;
        const x = wx + P.dir.x * hor, z = wz + P.dir.z * hor;
        const y = P.p0.y - (dt < 0.08 ? dt * 0.4 : 0) + 4.3 * (1 - Math.exp(-launch * 1.05)) + Math.max(0, -(z + 4.5)) * 0.4;
        P.g.position.set(x, y, z); P.g.rotation.set(0, angLerp(walkYaw, Math.atan2(P.dir.x, P.dir.z), Math.min(1, dt * 6)), 0);
        P.bodyG.rotation.set(-0.6 * Math.exp(-launch * 1.6) - 0.1, 0, 0.12 * Math.sin(dt * 2 + P.ph));
        P.headG.position.set(0, 0.095, 0.11);
        const open = Math.min(1, dt / 0.12), beat = launch < 1.3 ? 10 : 6.5;
        const flap = Math.sin(launch * 2 * Math.PI * beat + P.ph);
        P.wings.forEach((w, i) => { const sx = i ? 1 : -1; w.rotation.set(0, sx * -1.35 * (1 - open), sx * (0.25 + 0.95 * flap) * open); });
        P.legs.forEach((l) => { l.scale.y = Math.max(0.05, 1 - launch * 4); l.rotation.x = -1.2 * Math.min(1, launch * 3); });
      }
    }
    // can: rests until 8.6 s, then follows the precomputed roll
    { const i = Math.min(canSim.length - 1, Math.max(0, Math.floor((t - 8.6) * 240)));
      const [x, z, ang, hd] = t < 8.6 ? [-2.2, 0.6, 0, 0.3] : canSim[i];
      can.position.set(x, 0.033, z); can.rotation.set(0, -hd, 0); canMesh.rotation.set(0, 0, Math.PI / 2); canMesh.rotateY(ang); }
    // flyer: on the floor near the edge; lifted at 8.6 s, flutters back down
    { const dt = Math.max(0, t - 8.6);
      const y = 0.005 + (dt > 0 ? Math.max(0, 1.6 * dt * Math.exp(-dt * 0.9)) : 0);
      flyer.position.set(5.2 + dt * 0.7 + 0.15 * Math.sin(dt * 4), y, -1.2 + dt * 0.9);
      flyer.rotation.set(-Math.PI / 2 + (dt > 0 ? 1.2 * Math.sin(dt * 5.5) * Math.exp(-dt * 0.3) : 0), dt * 1.3, 0.6 * Math.sin(dt * 3.7)); }
    // walkers (and their rolling suitcases: towed behind, wheels turning with the distance)
    for (const w of walkers) {
      const st = agentState(w, t);
      w.p.root.position.set(st.x, 0, st.z); w.p.root.rotation.y = st.yaw;
      w.p.pose({ t, offset: w.off, w: { walk: st.walkW, idle: 1 - st.walkW }, speed: { walk: w.v / 1.2 }, face: { blink: (t + w.off) % 4 < 0.12 ? 1 : 0 } });
      if (w.suit) {
        const fx = Math.sin(st.yaw), fz = Math.cos(st.yaw);
        w.suit.position.set(st.x - fx * 0.55 + fz * 0.28, 0, st.z - fz * 0.55 - fx * 0.28);
        w.suit.rotation.set(0, st.yaw, 0); w.suit.rotateX(-0.55 * st.walkW - 0.02); w.suit.rotateZ(0.035 * Math.sin(t * 7 + w.off) * st.walkW);
        const dist = Math.max(0, Math.min(w.path.L, (t - w.t0) * w.v)); (w.suit.userData.wheels || []).forEach((wh) => { wh.rotation.x = dist / 0.04; });
      }
    }
    for (const I of idlers) {
      const wt = I.clip === 'idle' ? { idle: 1 } : { idle: 0.45, [I.clip]: 0.55 };
      I.p.pose({ t, offset: I.off, w: wt, face: { blink: (t + I.off) % 3.7 < 0.12 ? 1 : 0, talk: I.clip === 'agree' ? 0.4 * Math.abs(Math.sin(t * 9 + I.off)) : 0 } });
    }
    { const st = agentState(KICK, t); kicker.root.position.set(st.x, 0, st.z); kicker.root.rotation.y = st.yaw;
      kicker.pose({ t, offset: KICK.off, w: { walk: st.walkW, idle: 1 - st.walkW }, speed: { walk: KICK.v / 1.2 }, face: { blink: (t % 3.3) < 0.1 ? 1 : 0 } }); }
    clerks.forEach((c, i) => c.pose({ t, offset: i * 1.3, w: { idle: 1 } }));
    // loose plate on 9: creaks while the screw loosens, then (top-heavy) tips over and swings to rest upside down
    const pl = plates['9'];
    if (t < PLATE.t1) pl.rotation.z = 0.004 * Math.sin(t * 1.2);
    else pl.rotation.z = PLATE.sim[Math.min(PLATE.sim.length - 1, Math.floor((t - PLATE.t1) * 1000))];
    plates['8'].rotation.z = 0.01 * Math.sin(t * 1.1); plates['10'].rotation.z = 0.01 * Math.sin(t * 1.3 + 1) + 0.05 * gust * Math.sin((t - 8.6) * 3);
  }
  return { scene, update, rai, ger, ben, debug: { walkers, KICK, agentState, I_SPECS } };
}
