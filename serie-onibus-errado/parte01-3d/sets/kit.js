// kit.js: toon materials, ink outlines and the cast, built from primitives.
// Every animated property is set in pose() from plain numbers, so frames stay pure functions of t.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------------------------------------------------------- toon look
const ramp = (() => {
  const d = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const matCache = new Map();
export function toon(color, opts = {}) {
  const key = typeof color === 'number' && !opts.map && !opts.emissive && !opts.opacity ? color : null;
  if (key !== null && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color, gradientMap: ramp, map: opts.map || null,
    emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei ?? 1,
    transparent: opts.opacity !== undefined, opacity: opts.opacity ?? 1 });
  if (key !== null) matCache.set(key, m);
  return m;
}
export const flat = (color, opts = {}) => new THREE.MeshBasicMaterial({ color, map: opts.map || null, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide, fog: opts.fog ?? true });

const outlineMats = new Map();
function outlineMat(thick) {
  if (outlineMats.has(thick)) return outlineMats.get(thick);
  const m = new THREE.ShaderMaterial({
    uniforms: { thick: { value: thick } },
    vertexShader: 'uniform float thick; void main(){ vec3 p = position + normal * thick; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
    fragmentShader: 'void main(){ gl_FragColor = vec4(0.05, 0.04, 0.06, 1.0); }',
    side: THREE.BackSide,
  });
  outlineMats.set(thick, m); return m;
}
// a mesh with an ink outline (inverted hull)
export function mk(geo, mat, thick = 0.012) {
  const m = new THREE.Mesh(geo, mat);
  if (thick > 0) { const o = new THREE.Mesh(geo, outlineMat(thick)); m.add(o); m.userData.outline = o; }
  return m;
}
export const G = {
  sphere: (r, ws = 28, hs = 20) => new THREE.SphereGeometry(r, ws, hs),
  capsule: (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20),
  box: (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)),
  cyl: (rt, rb, h, s = 28) => new THREE.CylinderGeometry(rt, rb, h, s),
  torus: (r, t) => new THREE.TorusGeometry(r, t, 12, 40),
};

// a canvas texture painted once
export function paintTex(w, h, fn, repeat) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
export const TEX = {};
function texInit() {
  if (TEX.stripes) return;
  TEX.stripes = paintTex(256, 256, (c, w, h) => { c.fillStyle = '#F4F4F4'; c.fillRect(0, 0, w, h); c.fillStyle = '#151515'; for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 30, h); }, [3, 1]);
  TEX.plaid = paintTex(256, 256, (c, w, h) => {
    c.fillStyle = '#B23A2A'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(70,30,15,.75)';
    for (let x = 0; x < w; x += 64) c.fillRect(x, 0, 18, h); for (let y = 0; y < h; y += 64) c.fillRect(0, y, w, 18);
    c.fillStyle = 'rgba(255,220,180,.25)'; for (let x = 32; x < w; x += 64) c.fillRect(x, 0, 4, h);
  }, [3, 2]);
  TEX.tropical = paintTex(256, 256, (c, w, h) => {
    c.fillStyle = '#1FB5A5'; c.fillRect(0, 0, w, h);
    const cols = ['#FFB23C', '#FF5E7A', '#FFE14C', '#2E7D32'];
    for (let i = 0; i < 18; i++) { c.save(); c.translate((i * 97) % w, (i * 53) % h); c.rotate(i); c.fillStyle = cols[i % 4]; c.beginPath(); c.ellipse(0, 0, 26, 11, 0, 0, Math.PI * 2); c.fill(); c.restore(); }
  }, [2, 2]);
}
export function numberTex(num) {
  return paintTex(256, 160, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10); c.fillStyle = '#111'; c.font = '900 110px UI'; c.textAlign = 'center'; c.fillText(num, w / 2, 118); });
}

// ---------------------------------------------------------------- the cast
const SKIN = { caio: 0xE8B48A, bento: 0xEDBB91, geraldim: 0xD69A62, rai: 0x6B3E26, suit: 0xF0D2B6 };
export const JUMP = 0x2E8B6A;

// Build a character. o: { who, jump, num }. Returns { root, pose(p) }.
// Units are metres; the figure stands on y=0 facing +z, about 1.7 m tall with a big cartoon head.
export function character(o) {
  texInit();
  const who = o.who, jump = !!o.jump;
  const skin = toon(SKIN[who] ?? 0xE8B48A);
  const root = new THREE.Group(), body = new THREE.Group(), headG = new THREE.Group();
  root.add(body);
  const build = { bento: { w: 0.27, pants: 0x6E6A66 }, geraldim: { w: 0.28, pants: 0x2E4A7A }, rai: { w: 0.19, pants: 0x2A2A2E }, caio: { w: 0.2, pants: 0x1E1E24 }, suit: { w: 0.22, pants: 0x15151A } }[who];
  const shirtMat = jump ? toon(JUMP) : {
    bento: toon(0xF2EEE6), geraldim: toon(0xffffff, { map: TEX.plaid }), rai: toon(0xffffff, { map: TEX.tropical }),
    caio: toon(0xffffff, { map: TEX.stripes }), suit: toon(0x15151A),
  }[who];
  const pantsMat = jump ? toon(JUMP) : toon(build.pants);

  // legs + shoes
  for (const sx of [-1, 1]) {
    const leg = mk(G.capsule(0.085, 0.5), pantsMat); leg.position.set(sx * 0.11, 0.36, 0); body.add(leg);
    const shoe = mk(G.box(0.15, 0.09, 0.26, 0.04), toon(jump ? 0xEDEDED : who === 'bento' ? 0x4A2C18 : who === 'rai' ? 0xFFE14C : 0x222222)); shoe.position.set(sx * 0.11, 0.05, 0.05); body.add(shoe);
  }
  if (who === 'bento' && !jump) { // bombacha: baggy
    for (const sx of [-1, 1]) { const b = mk(G.sphere(0.15), toon(0x8C8A86)); b.scale.set(1, 1.6, 1); b.position.set(sx * 0.12, 0.48, 0); body.add(b); }
  }
  // torso
  const torso = mk(G.capsule(build.w, 0.32), shirtMat);
  torso.position.y = 0.98; if (who === 'geraldim') torso.scale.set(1.05, 0.95, 1.0);
  body.add(torso);
  if (who === 'bento' && !jump) { // vest panels + red neckerchief
    for (const sx of [-1, 1]) { const v = mk(G.box(0.17, 0.5, 0.06, 0.03), toon(0x7A4A2A), 0.008); v.position.set(sx * 0.15, 0.98, 0.22); v.rotation.y = sx * -0.25; body.add(v); }
    const lenco = mk(new THREE.ConeGeometry(0.13, 0.2, 3), toon(0xD4262E), 0.008); lenco.rotation.set(Math.PI, 0, 0); lenco.position.set(0, 1.22, 0.2); body.add(lenco);
  }
  if (who === 'suit') { const sh = mk(G.box(0.12, 0.3, 0.04), toon(0xffffff), 0.006); sh.position.set(0, 1.08, 0.2); body.add(sh); const tie = mk(G.box(0.05, 0.26, 0.03), toon(0xD4262E), 0.005); tie.position.set(0, 1.06, 0.225); body.add(tie); }
  if (jump && o.num) { // number patch
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.125), flat(0xffffff, { map: numberTex(o.num) }));
    patch.position.set(0.09, 1.1, build.w + 0.005); patch.rotation.y = 0.2; body.add(patch);
  }
  if (who === 'rai' && !jump) { const ch = mk(G.torus(0.12, 0.008), toon(0xE8C04A), 0); ch.rotation.x = Math.PI / 2.4; ch.position.set(0, 1.22, 0.05); body.add(ch); }

  // arms (pivot at the shoulder)
  const arms = [];
  const sleeveMat = jump ? toon(JUMP) : who === 'rai' ? skin : shirtMat;
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * (build.w + 0.07), 1.22, 0);
    const arm = mk(G.capsule(0.065, 0.42), sleeveMat); arm.position.y = -0.26; piv.add(arm);
    const hand = mk(G.sphere(0.075), skin); hand.position.y = -0.55; piv.add(hand);
    if (who === 'rai' && sx === 1 && !jump) { const f = mk(G.torus(0.07, 0.016), toon(0xFFE14C), 0.005); f.rotation.x = Math.PI / 2; f.position.y = -0.46; piv.add(f); }
    body.add(piv); arms.push({ piv, hand });
  }
  // props
  let prop = null;
  if (who === 'bento' && !jump) {
    prop = new THREE.Group();
    const cuia = mk(G.sphere(0.09), toon(0x8A5A2B)); cuia.scale.set(1, 1.15, 1); prop.add(cuia);
    const erva = mk(G.cyl(0.07, 0.07, 0.02), toon(0x3E7A2A), 0.005); erva.position.y = 0.09; prop.add(erva);
    const bomba = mk(G.cyl(0.008, 0.008, 0.26, 10), toon(0xC9CED6), 0.004); bomba.position.set(0.03, 0.17, 0); bomba.rotation.z = -0.25; prop.add(bomba);
    arms[1].hand.add(prop); prop.position.set(0, 0.04, 0.08);
    const term = mk(G.cyl(0.07, 0.07, 0.36), toon(0xB8BEC6), 0.01); term.position.set(-(build.w + 0.13), 0.95, 0.02); term.rotation.z = 0.15; body.add(term);
  }
  if (who === 'geraldim' && !jump) {
    prop = new THREE.Group();
    const bag = mk(G.box(0.22, 0.26, 0.14, 0.02), toon(0xD9B98A), 0.008); prop.add(bag);
    for (const [x, z] of [[-0.06, 0], [0.04, 0.03], [0.02, -0.03], [0.07, 0]]) { const p = mk(G.sphere(0.045, 14, 10), toon(0xF2C14E), 0.005); p.position.set(x, 0.15, z); prop.add(p); }
    arms[0].hand.add(prop); prop.position.set(0, -0.12, 0.05);
  }

  // head
  headG.position.y = 1.5; body.add(headG);
  const head = mk(G.sphere(0.21), skin, 0.01); head.scale.set(1, 1.07, 1); headG.add(head);
  for (const sx of [-1, 1]) { const e = mk(G.sphere(0.05), skin, 0.006); e.position.set(sx * 0.205, 0, 0); e.scale.set(0.6, 1, 1); headG.add(e); }
  const nose = mk(G.sphere(0.035), skin, 0.006); nose.position.set(0, -0.02, 0.21); headG.add(nose);
  const eyes = [], pupils = [], brows = [];
  for (const sx of [-1, 1]) {
    const eye = mk(G.sphere(0.058), toon(0xffffff), 0.007); eye.position.set(sx * 0.08, 0.05, 0.17); eye.scale.set(1, 1.15, 0.6); headG.add(eye); eyes.push(eye);
    const pup = new THREE.Mesh(G.sphere(0.027, 16, 12), flat(0x111111)); pup.position.set(sx * 0.08, 0.05, 0.206); headG.add(pup); pupils.push(pup);
    const hl = new THREE.Mesh(G.sphere(0.009, 8, 6), flat(0xffffff)); pup.add(hl); hl.position.set(0.01, 0.012, 0.022);
    const brow = mk(G.box(0.085, 0.02, 0.02, 0.009), toon(who === 'rai' ? 0x140c08 : 0x2A1A10), 0); brow.position.set(sx * 0.08, 0.135, 0.19); headG.add(brow); brows.push(brow);
  }
  const mouth = new THREE.Mesh(G.sphere(0.05, 20, 14), flat(0x4A1212)); mouth.position.set(0, -0.1, 0.19); mouth.scale.set(1, 0.25, 0.4); headG.add(mouth);
  const tongue = new THREE.Mesh(G.sphere(0.03, 12, 8), flat(0xE46A6A)); tongue.position.set(0, -0.35, 0.2); mouth.add(tongue);

  // hair / hats
  const hairMat = toon(who === 'rai' ? 0x1C120C : who === 'geraldim' ? 0x2A1A10 : who === 'suit' ? 0x0B0B0B : 0x2B1B12);
  if (who === 'rai') {
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const s = mk(G.sphere(0.085, 14, 10), hairMat, 0.006); s.position.set(Math.cos(a) * 0.15, 0.17 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * 0.15 - 0.02); headG.add(s); }
    const top = mk(G.sphere(0.16, 18, 12), hairMat, 0.006); top.position.set(0, 0.2, -0.02); top.scale.set(1, 0.6, 1); headG.add(top);
    if (!jump) for (const sx of [-1, 1]) { const g = mk(G.box(0.1, 0.05, 0.03, 0.015), toon(0x111111), 0.004); g.position.set(sx * 0.075, 0.24, 0.13); g.rotation.x = -0.5; headG.add(g); }
  } else if (who === 'bento') {
    const hair = mk(new THREE.SphereGeometry(0.215, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.2), hairMat, 0.006); hair.position.y = 0.03; headG.add(hair);
    const must = mk(G.capsule(0.03, 0.15), toon(0x3A2416), 0.006); must.rotation.z = Math.PI / 2; must.position.set(0, -0.06, 0.205); headG.add(must);
    if (!jump) { const beret = mk(G.sphere(0.2, 24, 12), toon(0x151515), 0.008); beret.scale.set(1.1, 0.35, 1.1); beret.position.set(0.03, 0.2, 0); beret.rotation.z = -0.15; headG.add(beret); }
  } else if (who === 'geraldim') {
    const hair = mk(new THREE.SphereGeometry(0.215, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.4), hairMat, 0.006); hair.position.y = 0.02; headG.add(hair);
    for (const sx of [-1, 1]) { const ch = new THREE.Mesh(G.sphere(0.035, 12, 8), flat(0xE07B6A, { transparent: true, opacity: 0.7 })); ch.position.set(sx * 0.13, -0.04, 0.165); ch.scale.set(1, 0.6, 0.4); headG.add(ch); }
    if (!jump) {
      const brim = mk(G.cyl(0.36, 0.36, 0.02, 40), toon(0xE2C46B), 0.008); brim.position.y = 0.17; headG.add(brim);
      const crown = mk(G.cyl(0.17, 0.2, 0.15), toon(0xE2C46B), 0.008); crown.position.y = 0.25; headG.add(crown);
      const band = mk(G.cyl(0.201, 0.201, 0.04), toon(0x8A3A1A), 0.004); band.position.y = 0.2; headG.add(band);
    }
  } else if (who === 'caio') {
    const hair = mk(new THREE.SphereGeometry(0.215, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.3), hairMat, 0.006); hair.position.y = 0.03; headG.add(hair);
    const cap = mk(new THREE.SphereGeometry(0.22, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.1), toon(0x151515), 0.008); cap.position.y = 0.06; headG.add(cap);
    const brim = mk(G.box(0.3, 0.018, 0.2, 0.008), toon(0x151515), 0.006); brim.position.set(0, 0.1, 0.24); headG.add(brim);
  } else if (who === 'suit') {
    const hair = mk(new THREE.SphereGeometry(0.218, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.1), hairMat, 0.006); hair.position.y = 0.03; headG.add(hair);
  }
  if (jump && who !== 'rai') { /* jumpsuit: hats come off */ }

  root.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });

  // pose: { talk 0..1, blink 0..1, look [-1..1], lookY, mood, armL, armR, sway, sit, propUp }
  function pose(p = {}) {
    const talk = p.talk || 0, blink = Math.max(p.blink || 0, p.mood === 'sleepy' ? 0.55 : 0);
    eyes.forEach((e) => { e.scale.y = 1.15 * (1 - 0.92 * blink); });
    pupils.forEach((pp, i) => { pp.visible = blink < 0.6; pp.position.x = (i ? 0.08 : -0.08) + (p.look || 0) * 0.018; pp.position.y = 0.05 + (p.lookY || 0) * 0.015; const s = p.mood === 'scared' ? 0.7 : 1; pp.scale.setScalar(s); });
    const raise = p.mood === 'scared' ? 0.025 : p.mood === 'angry' ? -0.01 : 0;
    brows.forEach((b, i) => { const sx = i ? 1 : -1; b.position.y = 0.135 + raise; b.rotation.z = p.mood === 'angry' ? sx * 0.35 : p.mood === 'scared' ? sx * -0.3 : 0; });
    mouth.scale.set(p.mood === 'scared' && talk < 0.05 ? 0.6 : 1, 0.25 + 0.75 * talk + (p.mood === 'scared' && talk < 0.05 ? 0.35 : 0), 0.4);
    headG.rotation.set((p.lookY || 0) * -0.15 + (p.nod || 0), (p.look || 0) * 0.35, (p.tilt || 0));
    arms[0].piv.rotation.set(-(p.armL || 0), 0, -0.12 - (p.armLout || 0));
    arms[1].piv.rotation.set(-(p.armR || 0), 0, 0.12 + (p.armRout || 0));
    body.rotation.z = (p.sway || 0) * 0.05;
    body.position.y = p.sit ? -0.45 : 0;
    if (prop && p.propUp !== undefined) prop.position.y = 0.04 + p.propUp;
  }
  pose({});
  return { root, pose, headG, arms, body };
}

// Seen-from-behind passenger: hair + shoulders.
export function passenger(hairColor = 0x0E0E10) {
  const g = new THREE.Group();
  const sh = mk(G.capsule(0.2, 0.2), toon(0x2B2F3A), 0.01); sh.rotation.z = Math.PI / 2; sh.position.y = 1.05; g.add(sh);
  const h = mk(G.sphere(0.19), toon(hairColor), 0.01); h.position.y = 1.38; h.scale.set(1, 1.08, 1); g.add(h);
  return g;
}

// Masked guard: orange jumpsuit + hood, black mask with a white star.
export function guard() {
  const g = new THREE.Group(), o = toon(0xF07A1E);
  for (const sx of [-1, 1]) { const l = mk(G.capsule(0.09, 0.55), o); l.position.set(sx * 0.12, 0.38, 0); g.add(l); const s = mk(G.box(0.15, 0.09, 0.26), toon(0x111111)); s.position.set(sx * 0.12, 0.05, 0.05); g.add(s); }
  const t = mk(G.capsule(0.25, 0.4), o); t.position.y = 1.0; g.add(t);
  for (const sx of [-1, 1]) { const a = mk(G.capsule(0.07, 0.5), o); a.position.set(sx * 0.34, 0.95, 0.05); a.rotation.x = -0.25; g.add(a); }
  const hood = mk(G.sphere(0.23), o); hood.position.y = 1.55; hood.scale.set(1, 1.1, 1); g.add(hood);
  const mask = mk(G.sphere(0.2), toon(0x0C0C0C), 0.006); mask.position.set(0, 1.53, 0.07); mask.scale.set(0.85, 1.0, 0.8); g.add(mask);
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.035 : 0.08; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
  const star = new THREE.Mesh(new THREE.ShapeGeometry(sh), flat(0xffffff)); star.position.set(0, 1.54, 0.232); g.add(star);
  g.traverse((m) => { if (m.isMesh) m.frustumCulled = false; });
  return g;
}
