// sets.js: the three places of Parte 01, the POV rig (Caio's hands + phone) and the fisheye lens.
import * as THREE from 'three';
import { toon, flat, mk, G, paintTex, character, passenger, guard, TEX, JUMP, numberTex } from './kit.js';

const gradientBg = (top, bot) => paintTex(16, 512, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, w, h); });
const hash = (i, s = 7) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

function lights(scene, { hemiTop, hemiBot, hemi = 1.1, key = 1.6, keyColor = 0xffffff, keyPos = [-3, 6, 4] }) {
  scene.add(new THREE.HemisphereLight(hemiTop, hemiBot, hemi));
  const k = new THREE.DirectionalLight(keyColor, key); k.position.set(...keyPos); scene.add(k);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
}

// ---------------------------------------------------------------- POV rig
export function povRig(cam) {
  const rig = new THREE.Group(); cam.add(rig);
  const sleeveStripes = toon(0xffffff, { map: TEX.stripes }), sleeveJump = toon(JUMP);
  const skin = toon(0xE8B48A);
  // right forearm + hand + phone
  const right = new THREE.Group(); rig.add(right);
  const rArm = mk(G.capsule(0.06, 0.34), sleeveStripes, 0.006); rArm.rotation.x = Math.PI / 2.3; rArm.position.set(0.05, -0.08, 0.18); right.add(rArm);
  const rHand = mk(G.sphere(0.07), skin, 0.006); rHand.scale.set(1, 0.8, 1.1); right.add(rHand);
  const phone = mk(G.box(0.085, 0.17, 0.012, 0.012), toon(0x1B1B22), 0.004); phone.position.set(-0.02, 0.06, 0.03); phone.rotation.x = -0.25; right.add(phone);
  const screenTex = (() => { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.ctx = cv.getContext('2d'); return t; })();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.155), flat(0xffffff, { map: screenTex, fog: false }));
  screen.position.z = 0.0065; phone.add(screen);
  const thumb = mk(G.capsule(0.022, 0.05), skin, 0.004); thumb.position.set(0.045, 0.03, 0.03); thumb.rotation.z = 0.5; right.add(thumb);
  // left hand, open palm (used when Caio looks at his own sleeve)
  const left = new THREE.Group(); rig.add(left);
  const lArm = mk(G.capsule(0.065, 0.36), sleeveJump, 0.006); lArm.position.set(0, -0.26, 0); left.add(lArm);
  const lPatch = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.0625), flat(0xffffff, { map: numberTex('011') })); lPatch.position.set(0, -0.2, 0.068); left.add(lPatch);
  const lHand = mk(G.sphere(0.075), skin, 0.006); lHand.scale.set(1, 1, 0.55); left.add(lHand);
  for (let i = 0; i < 4; i++) { const f = mk(G.capsule(0.017, 0.07), skin, 0.004); f.position.set(-0.045 + i * 0.03, 0.09 + (i === 1 || i === 2 ? 0.012 : 0), 0); left.add(f); }
  const lth = mk(G.capsule(0.019, 0.05), skin, 0.004); lth.position.set(0.075, 0.02, 0); lth.rotation.z = -0.9; left.add(lth);
  rig.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });

  // o: { phone, jump, screen(ctx,w,h), rdx, rdy, left, ldy, bob }
  function update(t, o) {
    const bob = Math.sin(t * 2.1) * 0.006 + Math.sin(t * 0.7) * 0.004;
    right.visible = !!o.phone; left.visible = !!o.left;
    rArm.material = o.jump ? sleeveJump : sleeveStripes;
    right.position.set(0.17 + (o.rdx || 0), -0.2 + (o.rdy || 0) + bob, -0.4);
    right.rotation.set(0.25, -0.25, 0.08);
    left.position.set(-0.05, -0.12 + (o.ldy || 0) + bob, -0.38);
    left.rotation.set(0.15, 0.2, 0.25);
    if (o.phone && o.screen) {
      const c = screenTex.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 256, 512);
      o.screen(c, 256, 512); screenTex.needsUpdate = true;
    }
  }
  return { rig, update };
}

// ---------------------------------------------------------------- RODOVIÁRIA (+ placa + ônibus verde)
export function stationSet() {
  const scene = new THREE.Scene();
  scene.background = gradientBg('#140C2A', '#3A2148');
  scene.fog = new THREE.Fog(0x2A1A3C, 14, 46);
  lights(scene, { hemiTop: 0x9C8CFF, hemiBot: 0x3A2A30, hemi: 1.0, key: 1.5, keyColor: 0xFFD9A0, keyPos: [-2, 6, 3] });
  const amber = new THREE.PointLight(0xFFB65C, 18, 12, 1.6); amber.position.set(0, 4, -2); scene.add(amber);
  const amber2 = new THREE.PointLight(0xFFB65C, 14, 12, 1.6); amber2.position.set(5, 4, -2); scene.add(amber2);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), toon(0x5B4B5E)); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const curb = mk(G.box(60, 0.18, 0.5, 0.03), toon(0xF2C230), 0.02); curb.position.set(0, 0.09, -3.8); scene.add(curb);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 30), toon(0x2E2733)); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.005, -19); scene.add(road);
  // roof + columns + lamps
  const roof = mk(G.box(40, 0.4, 9, 0.1), toon(0x3C3550), 0.03); roof.position.set(0, 4.8, -1.5); scene.add(roof);
  for (let i = -4; i <= 4; i++) {
    const col = mk(G.box(0.4, 4.6, 0.4, 0.06), toon(0x6C6280), 0.02); col.position.set(i * 4.2, 2.3, -4.6); scene.add(col);
    const lamp = new THREE.Mesh(G.box(1.4, 0.12, 0.4, 0.04), flat(0xFFE8A3)); lamp.position.set(i * 4.2 + 2.1, 4.55, -1.2); scene.add(lamp);
  }
  // city behind
  const winTex = paintTex(256, 512, (c, w, h) => { c.fillStyle = '#2A1D40'; c.fillRect(0, 0, w, h); for (let y = 20; y < h; y += 52) for (let x = 18; x < w; x += 58) { c.fillStyle = hash(x * 3 + y) > 0.45 ? '#FFC86B' : '#1A1230'; c.fillRect(x, y, 34, 30); } });
  for (let i = 0; i < 14; i++) {
    const h = 8 + hash(i) * 14, w = 5 + hash(i + 3) * 4;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 4), flat(0xffffff, { map: winTex, fog: false }));
    b.position.set(-34 + i * 5.4, h / 2, -38 - hash(i + 9) * 6); scene.add(b);
  }
  // distant buses
  for (const [x, col] of [[-9, 0xC93A3A], [-14, 0x2D5DA8]]) {
    const b = mk(G.box(8, 2.8, 2.4, 0.3), toon(col), 0.03); b.position.set(x, 1.6, -8.5); scene.add(b);
    const w2 = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 0.9), toon(0x9FD3E6)); w2.position.set(x, 2.2, -7.29); scene.add(w2);
  }
  // crowd silhouettes
  for (let i = 0; i < 9; i++) { const p = passenger(0x1A1422); p.position.set(-10 + i * 1.6 + hash(i) * 0.6, 0, -6 - hash(i + 4) * 2); p.rotation.y = hash(i + 11) * 6; p.scale.setScalar(1.1); if (Math.abs(p.position.x) > 2.5) scene.add(p); }

  // the platform sign (blue board) + the loose number plate that flips 9 -> 6
  const signTex = paintTex(1024, 256, (c, w, h) => { c.fillStyle = '#1E4FA0'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 150px Display'; c.textAlign = 'center'; c.fillText('PLATAFORMA', w / 2, 185); });
  const board = mk(G.box(3.4, 0.85, 0.12, 0.05), toon(0x1E4FA0), 0.02); board.position.set(0, 3.95, -3.2); scene.add(board);
  const bf = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 0.82), flat(0xffffff, { map: signTex })); bf.position.z = 0.065; board.add(bf);
  for (const sx of [-1.4, 1.4]) { const ch = mk(G.cyl(0.015, 0.015, 0.6, 8), toon(0x888888), 0.006); ch.position.set(sx, 4.5, -3.2); scene.add(ch); }
  const plateTex = paintTex(512, 512, (c, w, h) => { c.fillStyle = '#FFD23F'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.font = '900 420px Display'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('9', w / 2, h / 2 + 20); });
  const platePivot = new THREE.Group(); platePivot.position.set(0, 2.92, -3.18); scene.add(platePivot);
  const plate = mk(G.box(0.9, 0.9, 0.08, 0.08), toon(0xFFD23F), 0.02); platePivot.add(plate);
  const hook = mk(G.cyl(0.012, 0.012, 0.5, 8), toon(0x888888), 0.005); hook.position.set(0, 3.55, -3.2); scene.add(hook);
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.86), flat(0xffffff, { map: plateTex })); pf.position.z = 0.045; plate.add(pf);
  const screw = mk(G.sphere(0.04), toon(0x999999), 0.006); screw.position.set(0, 0.4, 0.05); plate.add(screw);

  // the wrong bus: green, Korean header, door, wheels. Long axis along z, side facing -x.
  const bus = new THREE.Group(); bus.position.set(6.2, 0, -3.5); scene.add(bus);
  const hull = mk(G.box(2.6, 3.0, 11, 0.35), toon(0x2F8F5B), 0.03); hull.position.y = 1.85; bus.add(hull);
  const stripe = mk(G.box(2.64, 0.5, 11.02, 0.1), toon(0x1F6A42), 0); stripe.position.y = 3.05; bus.add(stripe);
  const hdrTex = paintTex(1024, 160, (c, w, h) => { c.fillStyle = '#1F6A42'; c.fillRect(0, 0, w, h); c.fillStyle = '#F6FFB8'; c.font = '900 110px Hangul'; c.textAlign = 'center'; c.fillText('특별 운행 버스', w / 2, 120); });
  const hdr = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.8), flat(0xffffff, { map: hdrTex })); hdr.position.set(-1.31, 3.05, 1.0); hdr.rotation.y = -Math.PI / 2; bus.add(hdr);
  for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), toon(0x7FB8C9)); w.position.set(-1.31, 2.15, -4.2 + i * 1.75); w.rotation.y = -Math.PI / 2; bus.add(w); }
  const doorM = mk(G.box(0.08, 2.3, 1.1, 0.03), toon(0x123E2A), 0.015); doorM.position.set(-1.33, 1.45, 4.3); bus.add(doorM);
  for (const z of [-3.6, 3.4]) { const wh = mk(G.cyl(0.55, 0.55, 0.4), toon(0x1A1A1A), 0.02); wh.rotation.z = Math.PI / 2; wh.position.set(-1.25, 0.55, z); bus.add(wh); const hub = mk(G.cyl(0.25, 0.25, 0.42), toon(0x888888), 0.01); hub.rotation.z = Math.PI / 2; hub.position.set(-1.25, 0.55, z); bus.add(hub); }
  // the man in the suit with the Wi-Fi/USB sign
  const suit = character({ who: 'suit' }); suit.root.position.set(4.6, 0, 1.4); suit.root.rotation.y = -Math.PI / 2 + 0.35; scene.add(suit.root);
  const cardTex = paintTex(512, 384, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.lineWidth = 14; c.strokeRect(7, 7, w - 14, h - 14); c.fillStyle = '#111'; c.font = '900 130px Display'; c.textAlign = 'center'; c.fillText('Wi-Fi', w / 2, 160); c.fillStyle = '#1F6A42'; c.fillText('USB', w / 2, 320); });
  const card = mk(G.box(0.6, 0.45, 0.02, 0.01), toon(0xffffff), 0.008); const cf = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.43), flat(0xffffff, { map: cardTex })); cf.position.z = 0.012; card.add(cf);
  suit.arms[1].hand.add(card); card.position.set(0, 0.25, 0.08);

  // the three friends (casual)
  const rai = character({ who: 'rai' }), ger = character({ who: 'geraldim' }), ben = character({ who: 'bento' });
  for (const c of [rai, ger, ben]) scene.add(c.root);

  return { scene, rai, ger, ben, suit, platePivot, bus };
}

// ---------------------------------------------------------------- DENTRO DO ÔNIBUS
export function busInsideSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0B1A1E);
  scene.fog = new THREE.Fog(0x0E2226, 5, 16);
  lights(scene, { hemiTop: 0xBFFFF0, hemiBot: 0x12262A, hemi: 1.1, key: 1.1, keyColor: 0xDFFFF6, keyPos: [1, 5, 2] });
  const floor = mk(G.box(3.0, 0.1, 18, 0.02), toon(0x1D2E30), 0); floor.position.set(0, -0.05, -6); scene.add(floor);
  const ceil = mk(G.box(3.0, 0.1, 18, 0.02), toon(0x2A4A4E), 0); ceil.position.set(0, 2.45, -6); scene.add(ceil);
  for (let i = 0; i < 8; i++) { const l = new THREE.Mesh(G.box(0.5, 0.05, 1.2, 0.02), flat(0xCFF6E8)); l.position.set(0, 2.38, 1 - i * 2.2); scene.add(l); }
  // vents (gas comes from here)
  for (let i = 0; i < 4; i++) { const v = mk(G.box(0.5, 0.06, 0.3, 0.02), toon(0x8FA3A6), 0.006); v.position.set(i % 2 ? 0.8 : -0.8, 2.36, 0.4 - i * 1.6); scene.add(v); }
  for (const sx of [-1, 1]) {
    if (sx < 0) { const wall = mk(G.box(0.1, 2.5, 18, 0.02), toon(0x2A4A4E), 0); wall.position.set(sx * 1.5, 1.2, -6); scene.add(wall); }
    else { // right wall with a real window hole next to Caio (z 0.2..1.7, y 1.1..2.0)
      const wm = toon(0x2A4A4E);
      const pieces = [[-14.5, 0.2, 0, 2.5], [1.7, 3.0, 0, 2.5], [0.2, 1.7, 0, 1.1], [0.2, 1.7, 2.0, 2.5]];
      for (const [z0, z1, y0, y1] of pieces) { const w = mk(G.box(0.1, y1 - y0, z1 - z0, 0.02), wm, 0); w.position.set(1.5, (y0 + y1) / 2, (z0 + z1) / 2); scene.add(w); }
    }
    for (let i = (sx > 0 ? 1 : 0); i < 7; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), toon(0x081014)); w.position.set(sx * 1.44, 1.55, 0.8 - i * 1.9); w.rotation.y = -sx * Math.PI / 2; scene.add(w); }
  }
  // seats + motionless passengers (backs of heads)
  const seatMat = toon(0x2F6B70);
  for (let r = 0; r < 8; r++) for (const sx of [-1, 1]) {
    const z = 0.9 - r * 1.05;
    const back = mk(G.box(1.0, 0.95, 0.16, 0.06), seatMat, 0.012); back.position.set(sx * 0.82, 0.95, z + 0.35); scene.add(back);
    const cush = mk(G.box(1.0, 0.16, 0.5, 0.05), seatMat, 0.012); cush.position.set(sx * 0.82, 0.5, z + 0.05); scene.add(cush);
    if (r >= 2) for (const dx of [-0.24, 0.24]) { const p = passenger(); p.position.set(sx * 0.82 + dx, -0.25, z + 0.1); p.rotation.y = Math.PI; scene.add(p); }
  }
  // window by Caio (right) + his reflection + city lights outside
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshBasicMaterial({ color: 0x0A1A24, transparent: true, opacity: 0.25, depthWrite: false }));
  glass.position.set(1.45, 1.55, 0.95); glass.rotation.y = -Math.PI / 2; scene.add(glass);
  const refl = character({ who: 'caio' });
  refl.root.traverse((m) => { if (m.isMesh && m.material && m.material.isMeshToonMaterial) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.75; } if (m.isMesh && m.material && m.material.isShaderMaterial) m.visible = false; });
  refl.root.position.set(2.2, -0.25, 0.95); const rl = new THREE.PointLight(0xBFE8FF, 6, 4, 1.5); rl.position.set(1.7, 1.6, 0.95); scene.add(rl); refl.root.rotation.y = -Math.PI / 2; scene.add(refl.root);
  const outside = [];
  for (let i = 0; i < 12; i++) { const l = new THREE.Mesh(G.box(0.05, 0.08, 0.9, 0.02), flat(i % 3 ? 0xFFC86B : 0xFF5E7A, { fog: false })); l.position.set(3 + hash(i) * 4, 0.9 + hash(i + 5) * 1.6, 0); scene.add(l); outside.push(l); }

  const rai = character({ who: 'rai' }), ger = character({ who: 'geraldim' }), ben = character({ who: 'bento' });
  // Rai across the aisle (front-left seat) turned toward Caio; Bento and Geraldim in the row ahead, turned back
  rai.root.position.set(-0.8, 0.05, 0.95);
  ben.root.position.set(0.42, 0.28, -0.45);
  ger.root.position.set(-0.7, 0.18, -0.25);
  for (const c of [rai, ger, ben]) scene.add(c.root);
  // the friends' own seats (so they read as sitting)
  return { scene, rai, ger, ben, refl, outside };
}

// ---------------------------------------------------------------- DORMITÓRIO
export function dormSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x3A424C);
  scene.fog = new THREE.Fog(0x4A5560, 8, 30);
  lights(scene, { hemiTop: 0xDDE8FF, hemiBot: 0x2A2F36, hemi: 1.2, key: 1.3, keyColor: 0xEAF2FF, keyPos: [2, 8, 3] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), toon(0x3B434C)); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), toon(0x4A5560)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 9; scene.add(ceil);
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(G.box(3, 0.1, 0.4, 0.03), flat(0xE9F2FF)); l.position.set(0, 8.9, 2 - i * 5); scene.add(l); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), toon(0x56616C)); back.position.set(0, 6, -26); scene.add(back);
  // loudspeaker on the left wall
  const spk = mk(G.box(0.7, 0.45, 0.4, 0.06), toon(0x2A2F36), 0.02); spk.position.set(-6.5, 6.5, -6); spk.rotation.y = 0.6; scene.add(spk);
  // bunk towers: steel frames, mattresses, green sleepers
  const metal = toon(0x8E99A5), matt = toon(0xD6DCE2), green = toon(JUMP);
  for (const sx of [-1, 1]) for (let col = 0; col < 3; col++) for (let row = 0; row < 5; row++) {
    const x = sx * (2.4 + col * 2.2), z = -1.5 - row * 3.2;
    for (const dx of [-0.95, 0.95]) for (const dz of [-0.45, 0.45]) { const p = mk(G.box(0.08, 6.4, 0.08, 0.02), metal, 0.008); p.position.set(x + dx, 3.2, z + dz); scene.add(p); }
    for (let lv = 0; lv < 4; lv++) {
      const y = 0.55 + lv * 1.6;
      const m = mk(G.box(1.9, 0.18, 0.9, 0.06), matt, 0.012); m.position.set(x, y, z); scene.add(m);
      if (hash(sx * 31 + col * 7 + row * 3 + lv) > 0.4 && !(sx === 1 && col === 0 && row === 0 && lv === 0)) {
        const s = mk(G.capsule(0.17, 1.0), green, 0.01); s.rotation.z = Math.PI / 2; s.position.set(x + 0.1, y + 0.2, z); scene.add(s);
        const hd = mk(G.sphere(0.15), toon(0x3A2416), 0.01); hd.position.set(x - 0.75, y + 0.24, z); scene.add(hd);
      }
    }
  }
  const g = guard(); g.position.set(-1.25, 0, -2.6); g.rotation.y = 0.35; scene.add(g);
  const rai = character({ who: 'rai', jump: true, num: '071' }), ger = character({ who: 'geraldim', jump: true, num: '031' }), ben = character({ who: 'bento', jump: true, num: '053' });
  // on the lower bunk to Caio's right, facing him
  rai.root.position.set(1.55, 0.25, -1.1); rai.root.rotation.y = -1.25;
  ger.root.position.set(2.15, 0.25, -1.85); ger.root.rotation.y = -1.0;
  ben.root.position.set(2.05, 0.25, -0.35); ben.root.rotation.y = -1.6;
  for (const c of [rai, ger, ben]) scene.add(c.root);
  return { scene, rai, ger, ben, guard: g };
}

// ---------------------------------------------------------------- fisheye lens pass
export function lens(R, W, H) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rt.texture }, k: { value: 0.55 }, aspect: { value: W / H } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float k; uniform float aspect; varying vec2 vUv;
      void main(){
        vec2 d = vUv - 0.5; d.x *= aspect;
        float rc = 0.25 * aspect * aspect + 0.25;
        vec2 s = d * (1.0 + k * dot(d, d)) / (1.0 + k * rc);
        s.x /= aspect;
        gl_FragColor = texture2D(tDiffuse, s + 0.5);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  const scene = new THREE.Scene(); scene.add(quad);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  return {
    render(scene3, cam3, k = 0.55) {
      mat.uniforms.k.value = k;
      R.setRenderTarget(rt); R.setClearColor(0x000000, 1); R.clear(); R.render(scene3, cam3);
      R.setRenderTarget(null); R.render(scene, cam);
    },
  };
}
