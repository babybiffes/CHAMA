// dock.js: night, the back of a warehouse beside the rodoviária — loading door "DOCA 2" under a warm lamp,
// a green container trailer, cracked ground with debris; to the left an open lot and a street of low buildings
// under smoke, a fire glowing in the distance; behind the door a dark storeroom with boxes and a cabinet.
import * as THREE from 'three';
import { toon, basic, paintTex, extra } from './rig.js';

const hash = (i, s = 5) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const box = (w, h, d, mat, x, y, z, parent) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); parent.add(m); return m; };
const cyl = (a, b, h, mat, x, y, z, parent, s = 16) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, s), mat); m.position.set(x, y, z); parent.add(m); return m; };
function label(text, w, h, { bg = '#1E4FA0', fg = '#fff', font = '900 120px Display', pad = 0.72 } = {}) {
  return paintTex(w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    const L = text.split('\n'); L.forEach((ln, i) => c.fillText(ln, w / 2, h * (0.5 + (i - (L.length - 1) / 2) * pad / L.length))); });
}
const plane = (w, h, tex, x, y, z, ry, parent, lit = false, o = {}) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit ? toon(0xffffff, tex) : basic(0xffffff, tex, o)); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; };

export function dockSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121A30);
  scene.fog = new THREE.Fog(0x1A2238, 30, 90);
  // night: dim blue sky light, one warm lamp over the door, orange street lamps far away
  scene.add(new THREE.HemisphereLight(0x8090C8, 0x2A2430, 0.75));
  scene.add(new THREE.AmbientLight(0xB0B8E0, 0.22));
  const moon = new THREE.DirectionalLight(0xA8B8FF, 0.55); moon.position.set(-8, 14, 10); moon.target.position.set(0, 0, 0); scene.add(moon, moon.target);
  moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.02;
  Object.assign(moon.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 }); moon.shadow.camera.updateProjectionMatrix();
  const lamp = new THREE.SpotLight(0xFFD9A0, 60, 14, 1.0, 0.7, 1.4); lamp.position.set(3.2, 3.15, -1.55); lamp.target.position.set(3.2, 0, 1.2); scene.add(lamp, lamp.target);
  lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -0.0008;
  const wash = new THREE.PointLight(0xFFCF90, 8, 9, 1.6); wash.position.set(3.2, 2.9, -1.2); scene.add(wash);
  const W = new THREE.Group(); scene.add(W);

  // ------------------------------------------------ ground: worn asphalt/concrete with drawn cracks and stains
  const groundTex = paintTex(1024, 1024, (c, w, h) => {
    c.fillStyle = '#6E6474'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${40 + hash(i) * 40},${30 + hash(i, 2) * 30},${50 + hash(i, 3) * 30},${0.06 + hash(i, 4) * 0.08})`; c.beginPath(); c.ellipse(hash(i, 5) * w, hash(i, 6) * h, 20 + hash(i, 7) * 90, 10 + hash(i, 8) * 40, hash(i, 9) * 3, 0, 7); c.fill(); }
    c.strokeStyle = '#1A1418'; c.lineCap = 'round';
    for (let i = 0; i < 26; i++) { // ink cracks: zig-zag strokes like the references
      let x = hash(i, 11) * w, y = hash(i, 12) * h; c.lineWidth = 3 + hash(i, 13) * 3; c.beginPath(); c.moveTo(x, y);
      const n = 3 + Math.floor(hash(i, 14) * 4); for (let k = 0; k < n; k++) { x += (hash(i * 7 + k, 15) - 0.5) * 120; y += (hash(i * 7 + k, 16) - 0.5) * 120; c.lineTo(x, y); }
      if (hash(i, 17) > 0.6) c.closePath(); c.stroke(); }
  }, [6, 6]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), toon(0xffffff, groundTex)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; W.add(ground);
  const street = paintTex(512, 512, (c, w, h) => { c.fillStyle = '#3A3644'; c.fillRect(0, 0, w, h); c.fillStyle = '#C8B86A'; for (let y = 0; y < h; y += 128) c.fillRect(w / 2 - 6, y, 12, 70); });
  street.wrapS = street.wrapT = THREE.RepeatWrapping; street.repeat.set(1, 8);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 80), toon(0xffffff, street)); road.rotation.x = -Math.PI / 2; road.position.set(-15, 0.01, 0); W.add(road);
  box(0.4, 0.18, 80, toon(0x8A8290), -10.3, 0.09, 0, W); box(0.4, 0.18, 80, toon(0x8A8290), -19.7, 0.09, 0, W);

  // ------------------------------------------------ the warehouse wall with the DOCA 2 door (a real opening)
  const wallTex = paintTex(512, 512, (c, w, h) => { c.fillStyle = '#E2D3B8'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(120,100,80,${0.04 + hash(i, 21) * 0.06})`; c.beginPath(); c.ellipse(hash(i, 22) * w, hash(i, 23) * h, 30 + hash(i, 24) * 60, 20 + hash(i, 25) * 50, 0, 0, 7); c.fill(); } });
  const wallM = toon(0xffffff, wallTex), green = toon(0x2E7D4F), dz = -2, T = 0.3, H = 7;
  const dx0 = 2.3, dx1 = 4.1, dh = 2.5;   // door opening x 2.3..4.1, height 2.5
  for (const [x0, x1, y0, y1] of [[-14, dx0, 0, H], [dx1, 12, 0, H], [dx0, dx1, dh, H]]) {
    const m = box(x1 - x0, y1 - y0, T, wallM, (x0 + x1) / 2, (y0 + y1) / 2, dz, W); m.castShadow = true; m.receiveShadow = true;
    if (y0 === 0) { const g = box(x1 - x0, 1.0, T + 0.04, green, (x0 + x1) / 2, 0.5, dz, W); g.receiveShadow = true; }
  }
  box(26, 0.3, 0.5, toon(0xC9B99E), -1, H + 0.15, dz + 0.1, W);
  // big painted letters on the wall, cut by the camera's edge like the reference ("...CARGA")
  plane(7.5, 1.6, label('DESCARGA', 1200, 256, { bg: 'rgba(0,0,0,0)', fg: '#3A5A8A', font: '900 230px Display' }), -7.5, 4.6, dz + 0.16, 0, W, false, { transparent: true });
  // door: frame, two wooden leaves swung inward, DOCA 2 sign, lamp
  box(0.12, dh, 0.38, toon(0x3A3A40), dx0 - 0.06, dh / 2, dz, W); box(0.12, dh, 0.38, toon(0x3A3A40), dx1 + 0.06, dh / 2, dz, W); box(dx1 - dx0 + 0.24, 0.12, 0.38, toon(0x3A3A40), (dx0 + dx1) / 2, dh + 0.06, dz, W);
  const wood = paintTex(256, 512, (c, w, h) => { c.fillStyle = '#9A5A2A'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5A3010'; c.lineWidth = 6; for (let y = 40; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.strokeRect(6, 6, w - 12, h - 12); });
  for (const [hx, sgn] of [[dx0, 1], [dx1, -1]]) { const piv = new THREE.Group(); piv.position.set(hx, 0, dz - T / 2); W.add(piv); piv.rotation.y = sgn * 1.25; const leaf = box(0.9, dh - 0.05, 0.06, toon(0xffffff, wood), sgn * 0.45, (dh - 0.05) / 2, -0.03, piv); leaf.castShadow = true; }
  plane(1.0, 0.36, label('DOCA 2', 320, 116, { bg: '#F2C230', fg: '#111', font: '900 84px Display' }), (dx0 + dx1) / 2, dh + 0.42, dz + 0.17, 0, W);
  box(0.6, 0.12, 0.3, toon(0x333338), (dx0 + dx1) / 2, 3.2, dz + 0.3, W); box(0.5, 0.04, 0.24, basic(0xFFF0C0), (dx0 + dx1) / 2, 3.13, dz + 0.3, W);
  // pipes, electric box, a hose reel, graffiti tags on the wall
  box(0.12, H, 0.12, toon(0x77707A), -3.5, H / 2, dz + 0.22, W); box(0.12, H, 0.12, toon(0x77707A), 9.5, H / 2, dz + 0.22, W);
  box(0.6, 0.8, 0.25, toon(0x8A8F96), 5.2, 1.9, dz + 0.27, W); plane(0.3, 0.18, label('!', 64, 40, { bg: '#F2C230', fg: '#111', font: '900 30px UI' }), 5.2, 2.0, dz + 0.41, 0, W);
  for (let i = 0; i < 4; i++) plane(1.2 + hash(i, 31), 0.5, label(['ZK', 'R.O.', 'VILA', '021'][i], 256, 100, { bg: 'rgba(0,0,0,0)', fg: ['#B23A2A', '#1A1A1A', '#2E86C1', '#6C3483'][i], font: 'italic 900 70px Display' }), -1.5 + i * 2.2 - (i > 1 ? 4 : 0), 1.5 + hash(i, 32) * 0.6, dz + 0.16, 0, W, false, { transparent: true });

  // ------------------------------------------------ green container trailer by the wall
  const trailer = new THREE.Group(); trailer.position.set(6.6, 0, 1.4); W.add(trailer);
  const tb = box(2.5, 2.7, 7.5, toon(0x2E8B57), 0, 2.15, 0, trailer); tb.castShadow = true;
  for (let i = 0; i < 12; i++) box(0.04, 2.6, 0.06, toon(0x226B42), -1.27, 2.15, -3.5 + i * 0.63, trailer);
  box(2.4, 0.2, 7.4, toon(0x222222), 0, 0.7, 0, trailer);
  for (const z of [-2.6, -1.6, 2.6]) for (const sx of [-1, 1]) { const w = cyl(0.48, 0.48, 0.32, toon(0x151515), sx * 1.0, 0.48, z, trailer, 18); w.rotation.z = Math.PI / 2; cyl(0.24, 0.24, 0.34, toon(0x888888), sx * 1.0, 0.48, z, trailer, 12).rotation.z = Math.PI / 2; }
  box(2.45, 0.4, 0.1, toon(0xC0392B), 0, 0.9, 3.78, trailer);

  // ------------------------------------------------ corrugated gate panel at the left edge (close to camera)
  const corr = paintTex(256, 256, (c, w, h) => { c.fillStyle = '#5A4A40'; c.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { c.fillStyle = x % 32 ? '#4A3C34' : '#6A5A50'; c.fillRect(x, 0, 8, h); } }, [3, 1]);
  const gate = box(0.12, 3.6, 2.6, toon(0xffffff, corr), -2.3, 1.8, 8.6, W); gate.castShadow = true;
  box(0.18, 3.8, 0.18, toon(0x3A3030), -2.3, 1.9, 7.25, W);

  // ------------------------------------------------ debris on the ground (things that make sense here)
  const deb = [0xF5E6C8, 0xFFFFFF, 0xC0392B, 0x2E86C1, 0x7A5A3A];
  for (let i = 0; i < 40; i++) {
    const x = -6 + hash(i, 41) * 14, z = -1.4 + hash(i, 42) * 9; const k = hash(i, 43);
    if (Math.abs(x - 1.5) < 1.2 && z > 0 && z < 6.5) continue;   // keep the walking line clean
    let m;
    if (k < 0.5) { m = new THREE.Mesh(new THREE.PlaneGeometry(0.12 + hash(i, 44) * 0.15, 0.1 + hash(i, 45) * 0.12), basic(deb[i % 5], null, { side: THREE.DoubleSide })); m.rotation.set(-Math.PI / 2, 0, hash(i, 46) * 6); m.position.set(x, 0.006, z); m.material.polygonOffset = true; m.material.polygonOffsetFactor = -1; }
    else if (k < 0.75) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.12, 10), toon(deb[(i + 2) % 5])); m.rotation.set(0, hash(i, 47) * 6, Math.PI / 2); m.position.set(x, 0.033, z); }
    else if (k < 0.9) { m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.26, 10), basic(0x2E8B57, null, { transparent: true, opacity: 0.75 })); m.rotation.set(0, hash(i, 48) * 6, Math.PI / 2); m.position.set(x, 0.04, z); }
    else { m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.3), toon(0xC8A16E)); m.rotation.set(0.3, hash(i, 49) * 6, 0.2); m.position.set(x, 0.12, z); }
    m.castShadow = true; W.add(m);
  }
  // pallets + crates against the wall, a dumpster
  for (let i = 0; i < 3; i++) { const p = box(1.2, 0.14, 1.0, toon(0xB08050), -1.2 + i * 0.05, 0.07 + i * 0.15, -1.3, W); p.rotation.y = i * 0.05; }
  box(1.8, 1.2, 1.0, toon(0x2E5E3E), 0.2, 0.6, -1.25, W).castShadow = true; box(1.9, 0.08, 1.1, toon(0x234A30), 0.2, 1.24, -1.25, W).rotation.x = -0.2;

  // ------------------------------------------------ the street on the left: low buildings, shops, cars, lamps, smoke, a fire
  const bTex = (seed, col) => paintTex(256, 512, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); for (let y = 30; y < h - 120; y += 80) for (let x = 20; x < w; x += 76) { const lit = hash(seed * 31 + x + y, 51) > 0.85; c.fillStyle = lit ? '#E8C890' : '#22263A'; c.fillRect(x, y, 46, 50); c.strokeStyle = '#1A1418'; c.lineWidth = 4; c.strokeRect(x, y, 46, 50); } });
  const shops = ['LAN HOUSE', 'BAR DO ZÉ', 'FARMÁCIA', 'SALÃO', 'MERCADINHO', 'BORRACHARIA', 'PADARIA', 'AÇAÍ'];
  const shopCols = ['#2E5FA8', '#C0392B', '#16A085', '#8E44AD', '#E67E22', '#555555', '#B8860B', '#6C3483'];
  const fires = [];
  for (let i = 0; i < 10; i++) {
    const z = -26 + i * 6.2, h = 7 + hash(i, 52) * 6, cols = ['#D8D4DC', '#CFC6BC', '#C4CAD8', '#D6CFC4', '#C8CCC8'];
    const b = new THREE.Mesh(new THREE.BoxGeometry(5, h, 6), toon(0xffffff, bTex(i, cols[i % 5]))); b.position.set(-23, h / 2, z); W.add(b);
    const sh = shops[i % shops.length];
    plane(5.0, 0.8, label(sh, 640, 100, { bg: shopCols[i % 8], font: '900 64px Display' }), -20.47, 3.2, z, Math.PI / 2, W);
    box(0.1, 2.6, 5.2, toon(0x6A6A70), -20.45, 1.3, z, W);   // shutter
    for (let k = 0; k < 3; k++) { const ac = box(0.5, 0.35, 0.5, toon(0xDDDDDD), -20.3, 4.5 + k * 1.8, z - 1.5 + hash(i * 3 + k, 53) * 3, W); }
    if (i === 6 || i === 2) { const f = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.0), basic(0xFF8A30, null, { fog: false })); f.position.set(-20.4, 5.2, z); f.rotation.y = Math.PI / 2; W.add(f); const pl = new THREE.PointLight(0xFF7A20, 18, 14, 1.6); pl.position.set(-19, 5, z); scene.add(pl); fires.push({ f, pl, ph: i }); }
  }
  for (let i = 0; i < 6; i++) { const z = -20 + i * 8; const p = cyl(0.07, 0.09, 6, toon(0x444444), -10.0, 3, z, W, 8); box(1.0, 0.1, 0.1, toon(0x444444), -10.5, 6, z, W); box(0.4, 0.12, 0.25, basic(0xFFC870), -10.9, 5.92, z, W); const sl = new THREE.PointLight(0xFFB050, 14, 12, 1.6); sl.position.set(-10.9, 5.6, z); scene.add(sl); }
  const carCols = [0xC0392B, 0xEEEEEE, 0x2E86C1, 0x222222, 0xF1C40F];
  for (let i = 0; i < 5; i++) { const g = new THREE.Group(); g.position.set(-12.0, 0, -18 + i * 9 + hash(i, 54) * 2); W.add(g); box(1.8, 0.7, 4.2, toon(carCols[i]), 0, 0.6, 0, g); box(1.6, 0.6, 2.2, toon(carCols[i]), 0, 1.2, -0.2, g); box(1.62, 0.45, 2.0, toon(0x1C3A4A), 0, 1.22, -0.2, g); for (const [sx, sz] of [[-0.9, 1.3], [0.9, 1.3], [-0.9, -1.3], [0.9, -1.3]]) { const w = cyl(0.33, 0.33, 0.22, toon(0x111111), sx, 0.33, sz, g, 14); w.rotation.z = Math.PI / 2; } }
  // smoke columns over the city (drawn dark clouds like the references) — they billow slowly
  const smoke = [];
  const smM = toon(0x1C1820);
  for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), smM); const base = new THREE.Vector3(-27 - hash(i, 61) * 8, 9 + (i % 7) * 2.6, -14 + (i % 4) * 7 + hash(i, 62) * 3); s.position.copy(base); const r = 3.2 + hash(i, 63) * 3.0; s.scale.setScalar(r); W.add(s); smoke.push({ s, base, r, ph: hash(i, 64) * 6 }); }
  // stars
  for (let i = 0; i < 60; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 3), basic(0xE8ECFF, null, { fog: false })); const a = hash(i, 71) * Math.PI - Math.PI / 2 - Math.PI / 2, e = 0.35 + hash(i, 72) * 0.8; st.position.set(Math.cos(a) * 80, 20 + Math.sin(e) * 50, Math.sin(a) * 80); W.add(st); }

  // ------------------------------------------------ a person running far down the street (does not vanish: runs the whole time)
  const runner = extra(91); runner.root.position.set(-15.5, 0, -30); W.add(runner.root);

  // ------------------------------------------------ the storeroom behind the door
  const R = new THREE.Group(); W.add(R);
  const darkM = toon(0x3A4258), floorM = toon(0x4A4A52);
  box(9, 0.05, 9, floorM, 3.5, 0.0, -6.6, R).receiveShadow = true;
  box(9, 0.2, 9, toon(0x2A3040), 3.5, 3.6, -6.6, R);
  box(0.3, 3.6, 9, darkM, -1.0, 1.8, -6.6, R); box(0.3, 3.6, 9, darkM, 8.0, 1.8, -6.6, R); box(9, 3.6, 0.3, darkM, 3.5, 1.8, -11.1, R);
  const inLamp = new THREE.PointLight(0xC8D8FF, 5, 8, 1.6); inLamp.position.set(3.5, 3.2, -6.5); scene.add(inLamp);
  box(1.2, 0.06, 0.3, basic(0xDDE8FF), 3.5, 3.48, -6.5, R);
  // stacked boxes, a wooden chest of drawers, shelving, a back door with a small window
  for (let i = 0; i < 14; i++) { const x = -0.2 + hash(i, 81) * 2.2, z = -4.5 - hash(i, 82) * 5.5, s = 0.45 + hash(i, 83) * 0.35, lv = Math.floor(hash(i, 84) * 3); const b = box(s, s * 0.8, s, toon(0xC8A16E), x, s * 0.4 + lv * s * 0.8, z, R); b.rotation.y = hash(i, 85); b.castShadow = true; }
  const ch = new THREE.Group(); ch.position.set(5.6, 0, -4.2); ch.rotation.y = -0.4; R.add(ch); box(1.0, 1.7, 0.6, toon(0xB07040), 0, 0.85, 0, ch);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) { box(0.42, 0.34, 0.03, toon(0xC88A50), -0.23 + c * 0.46, 0.3 + r * 0.4, 0.31, ch); box(0.08, 0.03, 0.03, toon(0x333333), -0.23 + c * 0.46, 0.3 + r * 0.4, 0.34, ch); }
  for (let lv = 0; lv < 4; lv++) box(2.6, 0.05, 0.6, toon(0x8A939E), 6.6, 0.4 + lv * 0.7, -8.6, R);
  for (const x of [5.35, 7.85]) box(0.05, 2.8, 0.6, toon(0x6A737E), x, 1.4, -8.6, R);
  for (let i = 0; i < 18; i++) box(0.2 + hash(i, 86) * 0.2, 0.25, 0.3, toon([0xC0392B, 0x2E86C1, 0xF1C40F, 0x27AE60][i % 4]), 5.5 + (i % 6) * 0.42, 0.55 + Math.floor(i / 6) * 0.7, -8.6, R);
  box(1.0, 2.2, 0.1, toon(0x2E3E5A), 2.0, 1.1, -10.92, R); box(0.4, 0.4, 0.12, basic(0x0A0A12), 2.0, 1.6, -10.9, R);

  W.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; if (o.castShadow === false && o.geometry?.type === 'BoxGeometry') o.castShadow = true; o.receiveShadow = true; } });
  ground.castShadow = false;

  function update(t) {
    for (const F of fires) { const k = 0.75 + 0.25 * Math.sin(t * 11 + F.ph) * Math.sin(t * 7.3 + F.ph * 2); F.pl.intensity = 30 * k; F.f.material.color.setRGB(1, 0.45 + 0.15 * k, 0.15); }
    for (const S of smoke) { S.s.position.set(S.base.x + 0.4 * Math.sin(t * 0.2 + S.ph), S.base.y + t * 0.12, S.base.z + 0.3 * Math.cos(t * 0.17 + S.ph)); S.s.scale.setScalar(S.r * (1 + 0.04 * Math.sin(t * 0.5 + S.ph) + t * 0.006)); }
    lamp.intensity = 60 * (0.97 + 0.03 * Math.sin(t * 37) * Math.sin(t * 13));
    runner.root.position.set(-15.5, 0, -32 + t * 3.2); runner.root.rotation.y = 0;
    runner.pose({ t, offset: 0.3, w: { run: 1 }, speed: { run: 1 } });
  }
  return { scene, update, door: { x: (dx0 + dx1) / 2, z: dz } };
}
