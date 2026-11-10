// station.js: the rodoviária at night, dense with props, extras and physics.
// Build once; update(t) sets every moving thing from t (simulations are precomputed at build time).
import * as THREE from 'three';
import { toon, basic, paintTex, extra, cast } from './rig.js';

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

export function stationSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1C1630);
  scene.fog = new THREE.Fog(0x2A2238, 26, 70);
  scene.add(new THREE.HemisphereLight(0xFFE9D0, 0x3A2E3A, 1.45));
  const key = new THREE.DirectionalLight(0xFFF2E0, 1.1); key.position.set(-3, 8, 6); scene.add(key);
  const warm = new THREE.PointLight(0xFFC27A, 22, 16, 1.4); warm.position.set(-5, 4, 4); scene.add(warm);
  const warm2 = new THREE.PointLight(0xFFC27A, 18, 16, 1.4); warm2.position.set(5, 4, 7); scene.add(warm2);
  const W = new THREE.Group(); scene.add(W);

  // ------------------------------------------------ floor, platform edge, bays
  const tiles = paintTex(512, 512, (c, w, h) => {
    c.fillStyle = '#B9AE9E'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { c.fillStyle = (x + y) % 2 ? '#B3A797' : '#C1B6A6'; c.fillRect(x * 128 + 2, y * 128 + 2, 124, 124); }
    c.strokeStyle = '#8E8475'; c.lineWidth = 3; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * 128, 0); c.lineTo(i * 128, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 128); c.lineTo(w, i * 128); c.stroke(); }
    for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(80,60,50,${0.05 + hash(i) * 0.08})`; c.beginPath(); c.ellipse(hash(i, 2) * w, hash(i, 3) * h, 8 + hash(i, 4) * 30, 5 + hash(i, 6) * 14, hash(i, 7) * 3, 0, 7); c.fill(); }
  }, [18, 14]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(36, 28), toon(0xffffff, tiles)); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 6); W.add(floor);
  box(36, 0.02, 0.18, toon(0xF2C230), 0, 0.01, -1.55, W);
  const tactile = paintTex(256, 64, (c, w, h) => { c.fillStyle = '#E8B820'; c.fillRect(0, 0, w, h); c.fillStyle = '#B68D10'; for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); } }, [40, 1]);
  box(36, 0.02, 0.4, toon(0xffffff, tactile), 0, 0.012, -1.85, W);
  box(36, 0.3, 0.12, toon(0x8A8378), 0, -0.14, -2.05, W);                    // curb face
  const asphalt = paintTex(256, 256, (c, w, h) => { c.fillStyle = '#3A3640'; c.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(255,255,255,${hash(i) * 0.05})`; c.fillRect(hash(i, 2) * w, hash(i, 3) * h, 2, 2); } }, [10, 6]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 26), toon(0xffffff, asphalt)); road.rotation.x = -Math.PI / 2; road.position.set(0, -0.28, -15); W.add(road);
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
  function makeBus(color, dest, destColor = '#FFB000') {
    const g = new THREE.Group();
    box(2.55, 3.1, 11, toon(color), 0, 1.85, -5.5, g);
    box(2.45, 1.2, 0.08, basic(0x0C1A22), 0, 2.4, 0.03, g);
    plane(2.0, 0.32, label(dest, 640, 100, { bg: '#111', fg: destColor, font: '900 70px UI' }), 0, 3.15, 0.06, 0, g, true);
    for (const sx of [-0.9, 0.9]) { const hl = box(0.38, 0.18, 0.05, basic(0xFFF6CC), sx, 0.95, 0.04, g); hl.userData.light = true; }
    box(2.6, 0.3, 0.2, toon(0x333333), 0, 0.45, 0.02, g);
    for (const z of [-1.5, -8.5]) for (const sx of [-1.25, 1.25]) { const wh = cyl(0.52, 0.52, 0.35, toon(0x1A1A1A), sx, 0.52, z, g, 18); wh.rotation.z = Math.PI / 2; }
    for (let i = 0; i < 6; i++) for (const sx of [-1.29, 1.29]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), toon(0x7FB8C9)); w.position.set(sx, 2.3, -1.8 - i * 1.6); w.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(w); }
    W.add(g); return g;
  }
  const bus8 = makeBus(0x2D5DA8, 'SÃO PAULO'); bus8.position.set(-6.15, -0.28, -3.0);
  const bus10 = makeBus(0xC93A3A, 'CURITIBA'); // arriving into bay 10, rolling in from behind (along +z)
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
    m.position.set(x, 0.006, z); m.rotation.set(kind < 0.6 ? -Math.PI / 2 : Math.PI / 2, 0, hash(i, 56) * 6); W.add(m);
  }
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), basic(0x7A8FA0, null, { transparent: true, opacity: 0.35 })); puddle.rotation.x = -Math.PI / 2; puddle.scale.set(1.4, 0.8, 1); puddle.position.set(-2.4, 0.007, 5.6); W.add(puddle);
  { const g = new THREE.Group(); g.position.set(-2.0, 0, 6.3); g.rotation.y = 0.5; W.add(g);
    const signT = label('CUIDADO\nPISO\nMOLHADO', 128, 200, { bg: '#F2C230', fg: '#111', font: '900 30px Display' });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), toon(0xffffff, signT)); p.position.set(0, 0.3, sx * 0.08); p.rotation.set(sx * 0.25, sx > 0 ? 0 : Math.PI, 0); g.add(p); } }
  { const g = new THREE.Group(); g.position.set(4.2, 0, 4.4); g.rotation.y = -0.7; W.add(g);
    box(0.9, 1.3, 0.5, toon(0x2E86C1), 0, 0.65, 0, g); plane(0.8, 0.25, label('JORNAIS', 256, 80, { bg: '#1B4F72', font: '900 50px Display' }), 0, 1.15, 0.26, 0, g, true);
    for (let i = 0; i < 4; i++) plane(0.18, 0.25, label('NEWS', 64, 90, { bg: '#F5F5F5', fg: '#222', font: '900 18px UI' }), -0.3 + i * 0.2, 0.75, 0.26, 0, g); }
  for (const [x, z] of [[-3.3, 1.2], [3.9, 6.9]]) { const c = cyl(0.03, 0.18, 0.55, toon(0xE67E22), x, 0.28, z, W, 12); cyl(0.2, 0.2, 0.04, toon(0xE67E22), x, 0.02, z, W, 12); cyl(0.11, 0.13, 0.08, toon(0xffffff), x, 0.28, z, W, 12); }

  // ------------------------------------------------ pigeons (peck, then flee)
  const pigeons = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), toon(0x8A8F9C)); body.scale.set(0.8, 0.75, 1.3); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), toon(0x6E7380)); head.position.set(0, 0.07, 0.11); g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 6), toon(0xE0B060)); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.06, 0.16); g.add(beak);
    const wings = [-1, 1].map((sx) => { const piv = new THREE.Group(); piv.position.set(sx * 0.06, 0.03, 0); const w = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.14), toon(0x9AA0AD)); w.position.x = sx * 0.08; piv.add(w); g.add(piv); return piv; });
    const p0 = new THREE.Vector3(-0.4 + hash(i, 21) * 1.6, 0.07, 6.6 + hash(i, 22) * 1.4);
    g.position.copy(p0); g.rotation.y = hash(i, 23) * 6; W.add(g);
    const dir = new THREE.Vector3(hash(i, 24) - 0.3, 0, -(0.6 + hash(i, 25))).normalize();
    pigeons.push({ g, head, wings, p0, dir, t0: 2.55 + i * 0.09 + hash(i, 26) * 0.2, ry: hash(i, 23) * 6, ph: hash(i, 27) * 6 });
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
  // walkers: always moving along a straight line at their own speed (walk clip speed-matched)
  const walkers = [];
  const W_SPECS = [
    // [x0, z0, dirx, dirz, speed, suitcase]
    [-7.5, 8.2, 1, 0, 1.15, true], [7.5, 5.2, -1, 0, 1.25, false], [-6.5, 2.0, 1, 0.05, 1.1, false], [6.8, 10.8, -1, 0, 1.0, true],
    [-2.6, -0.8, 0.15, 1, 1.05, false], [2.9, 14.0, -0.1, -1, 1.2, false], [-5.0, 13.5, 0.4, -1, 1.1, true], [4.5, -1.0, -0.2, 1, 0.95, false],
    [-8.0, 11.2, 1, 0, 1.3, false], [8.0, 3.6, -1, -0.05, 1.05, true], [-1.8, 16.0, 0, -1, 1.15, false], [3.6, 1.0, 0.1, 1, 1.0, false],
    [-6.0, 6.0, 1, 0.1, 0.9, false], [6.0, 12.6, -1, 0, 1.1, false],
  ];
  W_SPECS.forEach((s, i) => {
    const p = extra(i + 1); W.add(p.root);
    const d = new THREE.Vector3(s[2], 0, s[3]).normalize();
    let suit = null;
    if (s[5]) { suit = new THREE.Group(); const c = box(0.4, 0.6, 0.22, toon(bagCols[i % 5]), 0, 0.3, 0, suit); for (const sx of [-0.15, 0.15]) cyl(0.04, 0.04, 0.03, toon(0x111111), sx, 0.02, 0.06, suit, 10).rotation.z = Math.PI / 2; box(0.02, 0.5, 0.02, toon(0x333333), 0, 0.85, 0.1, suit); W.add(suit); }
    walkers.push({ p, x0: s[0], z0: s[1], d, v: s[4], suit, off: hash(i, 31) * 3 });
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
  const rai = cast('rai'), ger = cast('geraldim'), ben = cast('bento');
  rai.root.position.set(-0.55, 0, -0.75); ger.root.position.set(0.35, 0, -1.0); ben.root.position.set(1.25, 0, -0.7);
  for (const c of [rai, ger, ben]) W.add(c.root);
  W.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });

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
    // bus 10 rolls in from behind the platform (constant deceleration), then the suspension settles
    { const ts = 4.0, te = 8.6, D = 14; const tau = Math.min(1, Math.max(0, (t - ts) / (te - ts)));
      const s = D * (1 - (1 - tau) ** 2); bus10.position.set(6.75, -0.28, -16 + s - 1);
      const after = Math.max(0, t - te); bus10.rotation.x = t > te ? -0.025 * Math.exp(-after * 2.6) * Math.cos(after * 7.5) : 0.008 * tau; }
    // pigeons
    for (const P of pigeons) {
      const dt = t - P.t0;
      if (dt < 0) {
        const peck = Math.max(0, Math.sin(t * 5 + P.ph)) ** 6;
        P.g.position.copy(P.p0); P.g.position.x += 0.06 * Math.sin(t * 0.7 + P.ph); P.g.rotation.set(peck * 0.5, P.ry + 0.3 * Math.sin(t * 0.4 + P.ph), 0);
        P.head.position.set(0, 0.07 - peck * 0.08, 0.11 + peck * 0.04); P.wings.forEach((w, i) => { w.rotation.z = 0; });
      } else {
        // take-off: hop, then climbing flight with drag (closed form)
        const lift = 2.6 * dt + 0.9 * dt * dt, fwd = 3.2 * (1 - Math.exp(-dt * 1.6)) / 1.6 * 1.6;
        v.copy(P.dir).multiplyScalar(fwd); P.g.position.set(P.p0.x + v.x, P.p0.y + Math.min(lift, 7), P.p0.z + v.z);
        P.g.rotation.set(-0.5, Math.atan2(P.dir.x, P.dir.z), 0);
        const flap = Math.sin(dt * 2 * Math.PI * 9 + P.ph) * 0.9; P.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * flap; });
      }
      P.g.visible = P.g.position.y < 5.6;
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
    // walkers (and their suitcases, wheels turning)
    for (const w of walkers) {
      const s = w.v * (t + 20);                                 // already mid-walk at t=0
      const span = 18, d = ((s + w.off * 4) % span);
      const x = w.x0 + w.d.x * d, z = w.z0 + w.d.z * d;
      w.p.root.position.set(x, 0, z); w.p.root.rotation.y = Math.atan2(w.d.x, w.d.z);
      w.p.pose({ t, offset: w.off, w: { walk: 1 }, speed: { walk: w.v / 1.2 }, face: { blink: (t + w.off) % 4 < 0.12 ? 1 : 0 } });
      if (w.suit) { w.suit.position.set(x - w.d.x * 0.55 + w.d.z * 0.28, 0, z - w.d.z * 0.55 - w.d.x * 0.28); w.suit.rotation.set(0, Math.atan2(w.d.x, w.d.z), 0); w.suit.rotateX(-0.55); w.suit.rotateZ(0.04 * Math.sin(t * 7 + w.off)); }
    }
    for (const I of idlers) {
      const wt = I.clip === 'idle' ? { idle: 1 } : { idle: 0.45, [I.clip]: 0.55 };
      I.p.pose({ t, offset: I.off, w: wt, face: { blink: (t + I.off) % 3.7 < 0.12 ? 1 : 0, talk: I.clip === 'agree' ? 0.4 * Math.abs(Math.sin(t * 9 + I.off)) : 0 } });
    }
    { const x = -2.2 - 0.3 + 1.15 * (t - 8.6), z = 0.42; kicker.root.position.set(x, 0, z); kicker.root.visible = x > -8.6; kicker.root.rotation.y = Math.PI / 2;
      kicker.pose({ t, offset: 0.2, w: { walk: 1 }, speed: { walk: 1.15 / 1.2 } }); }
    clerks.forEach((c, i) => c.pose({ t, offset: i * 1.3, w: { idle: 1 } }));
    // loose plate on 9 (creak swing from 16.4 s, flips 9 -> 6 at 18.2 s), others hang still
    const pl = plates['9'];
    const swing = t > 16.4 && t < 18.2 ? 0.22 * Math.exp(-(t - 16.4) * 0.7) * Math.sin((t - 16.4) * 4.2) : 0;
    const flip = t < 18.2 ? 0 : Math.PI * (1 + Math.exp(-(t - 18.2) * 5.5) * Math.cos((t - 18.2) * 14) * -1) ;
    pl.rotation.z = swing + flip;
    plates['8'].rotation.z = 0.01 * Math.sin(t * 1.1); plates['10'].rotation.z = 0.01 * Math.sin(t * 1.3 + 1) + 0.05 * gust * Math.sin((t - 8.6) * 3);
  }
  return { scene, update, rai, ger, ben };
}
