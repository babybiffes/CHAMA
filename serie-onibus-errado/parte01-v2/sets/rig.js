// rig.js: mocap-driven cartoon people. A Mixamo skeleton (three.js example models) drives the motion;
// clothes, hands, shoes and a cartoon head are rigid pieces parented to the bones, so every step,
// breath and nod comes from real motion capture. Everything is evaluated from t: mixer.setTime(t).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

// ---------------------------------------------------------------- materials
const ramp = (() => {
  const d = new Uint8Array([120, 120, 120, 255, 200, 200, 200, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const cache = new Map();
export function toon(color, map = null, extra = {}) {
  const key = map ? null : `${color}|${extra.emissive || 0}`;
  if (key && cache.has(key)) return cache.get(key);
  const m = new THREE.MeshToonMaterial({ color, map, gradientMap: ramp, emissive: extra.emissive || 0, emissiveIntensity: extra.ei ?? 1 });
  if (key) cache.set(key, m);
  return m;
}
export const basic = (color, map = null, o = {}) => new THREE.MeshBasicMaterial({ color, map, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, fog: o.fog ?? true });
export function paintTex(w, h, fn, repeat) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const BLOB = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c = cv.getContext('2d'); const g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); })();
const geo = {
  cap: (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14),
  sph: (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (a, b, h, s = 20) => new THREE.CylinderGeometry(a, b, h, s),
};
const hash = (i, s = 3) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

const TEX = {};
function texInit() {
  if (TEX.plaid) return;
  TEX.plaid = paintTex(128, 128, (c, w, h) => { c.fillStyle = '#B23A2A'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(60,25,12,.7)'; for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 10, h); for (let y = 0; y < h; y += 32) c.fillRect(0, y, w, 10); }, [3, 3]);
  TEX.tropical = paintTex(128, 128, (c, w, h) => { c.fillStyle = '#1FA898'; c.fillRect(0, 0, w, h); const cl = ['#FFB23C', '#FF5E7A', '#FFE14C', '#2E7D32']; for (let i = 0; i < 12; i++) { c.save(); c.translate((i * 47) % w, (i * 29) % h); c.rotate(i); c.fillStyle = cl[i % 4]; c.beginPath(); c.ellipse(0, 0, 14, 6, 0, 0, 7); c.fill(); c.restore(); } }, [2, 2]);
  TEX.stripes = paintTex(64, 64, (c, w, h) => { c.fillStyle = '#F2F2F2'; c.fillRect(0, 0, w, h); c.fillStyle = '#151515'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 8, h); }, [4, 1]);
}

// ---------------------------------------------------------------- models
export const MODELS = {};
export async function loadModels() {
  const L = new GLTFLoader();
  for (const f of ['Xbot', 'Michelle']) MODELS[f] = await L.loadAsync(`assets/models/${f}.glb`);
  // additive versions of the gesture clips (nod, head shake), as in three.js' additive blending example
  const xb = MODELS.Xbot;
  xb.clips = {};
  for (const a of xb.animations) xb.clips[a.name] = a;
  // gestures blend normally with idle (nod/shake also done procedurally on the head bones)
  // walk/idle without root translation (we move the root ourselves so feet stay planted)
  MODELS.Michelle.clips = { samba: MODELS.Michelle.animations.find((a) => a.name === 'SambaDance') };
}

// ---------------------------------------------------------------- two-bone IK (any rig orientation)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _qw = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _qd = new THREE.Quaternion();
function rotateToward(bone, from, to) {
  if (from.lengthSq() < 1e-9 || to.lengthSq() < 1e-9) return;
  _qd.setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
  bone.getWorldQuaternion(_qw); _qw.premultiply(_qd);
  bone.parent.getWorldQuaternion(_pq); bone.quaternion.copy(_pq.invert().multiply(_qw));
  bone.updateMatrixWorld(true);
}
export function twoBoneIK(upper, lower, end, target, pole, w = 1) {
  const q1 = upper.quaternion.clone(), q2 = lower.quaternion.clone();
  upper.getWorldPosition(_a); lower.getWorldPosition(_b); end.getWorldPosition(_c);
  const l1 = _a.distanceTo(_b), l2 = _b.distanceTo(_c);
  const d = target.clone().sub(_a); const dist = Math.min(l1 + l2 - 1e-3, Math.max(Math.abs(l1 - l2) + 1e-3, d.length()));
  const dn = d.normalize();
  const cosA = Math.min(1, Math.max(-1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))), A = Math.acos(cosA);
  const bend = pole.clone().sub(dn.clone().multiplyScalar(pole.dot(dn))).normalize();
  const elbow = _a.clone().add(dn.clone().multiplyScalar(Math.cos(A) * l1)).add(bend.multiplyScalar(Math.sin(A) * l1));
  rotateToward(upper, _b.clone().sub(_a), elbow.clone().sub(_a));
  lower.getWorldPosition(_b); end.getWorldPosition(_c);
  const goal = _a.clone().add(dn.clone().multiplyScalar(dist));
  rotateToward(lower, _c.clone().sub(_b), goal.sub(_b));
  if (w < 1) { upper.quaternion.slerpQuaternions(q1, upper.quaternion.clone(), w); lower.quaternion.slerpQuaternions(q2, lower.quaternion.clone(), w); upper.updateMatrixWorld(true); }
}

const B = (root, n) => root.getObjectByName('mixamorig' + n) || root.getObjectByName('mixamorig:' + n);

// a rigid limb piece from bone a toward child bone b, sized in metres
function limb(root, a, b, r, mat, { lenScale = 1, startPad = 0 } = {}) {
  const ba = B(root, a), bb = B(root, b);
  const v = bb.position.clone();                               // child offset in a's local (cm) space
  const wsA = ba.getWorldScale(new THREE.Vector3()).x;          // 0.01
  const lenM = v.length() * wsA * lenScale;
  const m = new THREE.Mesh(geo.cap(r, Math.max(0.001, lenM - r * 0.6)), mat);
  m.scale.setScalar(1 / wsA);
  m.position.copy(v.clone().multiplyScalar(0.5 * lenScale + startPad));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize());
  ba.add(m); return m;
}
function onBone(root, n, obj, pos = [0, 0, 0]) {
  const b = B(root, n); const ws = b.getWorldScale(new THREE.Vector3()).x;
  obj.scale.multiplyScalar(1 / ws); obj.position.set(pos[0] / ws, pos[1] / ws, pos[2] / ws); b.add(obj); return obj;
}

// ---------------------------------------------------------------- cartoon head
// size ~ real-ish proportions (a touch big), simple readable face like the references
function makeHead(o) {
  const g = new THREE.Group(), skin = toon(o.skin);
  const R = 0.118;
  const head = new THREE.Mesh(geo.sph(R, 28, 20), skin); head.scale.set(1, 1.1, 1.02); g.add(head);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(geo.sph(0.03, 14, 10), skin); e.position.set(sx * R * 0.97, -0.005, -0.005); e.scale.set(0.45, 1, 0.75); g.add(e);
    const inner = new THREE.Mesh(new THREE.TorusGeometry(0.015, 0.004, 6, 12, Math.PI * 1.3), toon(0xC08060)); inner.position.set(sx * (R * 0.97 + 0.012), -0.005, -0.004); inner.rotation.set(0, sx * Math.PI / 2, 0.6); g.add(inner); }
  const nose = new THREE.Mesh(geo.sph(0.021, 14, 12), skin); nose.position.set(0, -0.016, R * 0.97); nose.scale.set(0.95, 1.05, 1.15); g.add(nose);
  const bridge = new THREE.Mesh(geo.cap(0.011, 0.03), skin); bridge.position.set(0, 0.008, R * 0.95); bridge.rotation.x = -0.35; g.add(bridge);
  const chin = new THREE.Mesh(geo.sph(0.04, 14, 10), skin); chin.position.set(0, -0.085, R * 0.62); chin.scale.set(1.3, 0.8, 1); g.add(chin);
  const eyes = [], pupils = [], brows = [];
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(geo.sph(0.028, 18, 14), toon(0xffffff)); eye.position.set(sx * 0.043, 0.022, R * 0.86); eye.scale.set(1, 1.1, 0.55); g.add(eye);
    // upper eyelid: a skin shell that rotates down over the eye to blink
    const lidP = new THREE.Group(); lidP.position.copy(eye.position); g.add(lidP);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0305, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.scale.set(1, 1.1, 0.62); lidP.add(lid); eyes.push(lidP);
    const pup = new THREE.Mesh(geo.sph(0.0145, 12, 10), basic(0x111111)); pup.position.set(sx * 0.043, 0.022, R * 0.86 + 0.016); g.add(pup); pupils.push(pup);
    const brow = new THREE.Mesh(geo.box(0.046, 0.011, 0.012), toon(o.brow ?? 0x2A1A10)); brow.position.set(sx * 0.043, 0.07, R * 0.9); g.add(brow); brows.push(brow);
  }
  const mouth = new THREE.Mesh(geo.sph(0.026, 16, 10), basic(0x4A1212)); mouth.position.set(0, -0.058, R * 0.9); mouth.scale.set(1, 0.22, 0.4); g.add(mouth);
  const lip = new THREE.Mesh(geo.cap(0.006, 0.04), toon(0xB0605A)); lip.rotation.z = Math.PI / 2; lip.position.set(0, -0.049, R * 0.93); g.add(lip);
  const hairM = toon(o.hair ?? 0x2B1B12);
  if (o.hairStyle === 'afro') {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const s = new THREE.Mesh(geo.sph(0.05, 10, 8), hairM); s.position.set(Math.cos(a) * 0.09, 0.075 + Math.sin(i * 1.7) * 0.012, Math.sin(a) * 0.09 - 0.015); g.add(s); }
    const top = new THREE.Mesh(geo.sph(0.105, 16, 10), hairM); top.position.set(0, 0.1, -0.012); top.scale.set(1, 0.62, 1); g.add(top);
  } else if (o.hairStyle === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.04, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.1), hairM); cap.position.y = 0.012; g.add(cap);
    const back = new THREE.Mesh(geo.cap(0.085, 0.14), hairM); back.position.set(0, -0.06, -0.06); g.add(back);
  } else if (o.hairStyle !== 'bald') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2.3), hairM); cap.position.y = 0.016; g.add(cap);
  }
  if (o.mustache) { const m = new THREE.Mesh(geo.cap(0.016, 0.07), toon(0x3A2416)); m.rotation.z = Math.PI / 2; m.position.set(0, -0.036, R * 0.97); g.add(m); }
  if (o.hat === 'beret') { const h = new THREE.Mesh(geo.sph(0.12, 20, 10), toon(0x151515)); h.scale.set(1.12, 0.32, 1.12); h.position.set(0.012, 0.115, -0.005); h.rotation.z = -0.18; g.add(h); }
  if (o.hat === 'straw') {
    const brim = new THREE.Mesh(geo.cyl(0.22, 0.22, 0.012, 32), toon(0xE2C46B)); brim.position.y = 0.1; g.add(brim);
    const crown = new THREE.Mesh(geo.cyl(0.1, 0.12, 0.09, 24), toon(0xE2C46B)); crown.position.y = 0.148; g.add(crown);
    const band = new THREE.Mesh(geo.cyl(0.121, 0.121, 0.025, 24), toon(0x8A3A1A)); band.position.y = 0.118; g.add(band);
  }
  if (o.hat === 'cap') {
    const c = new THREE.Mesh(new THREE.SphereGeometry(R * 1.06, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), toon(o.capColor ?? 0x151515)); c.position.y = 0.03; g.add(c);
    const brim = new THREE.Mesh(geo.box(0.17, 0.01, 0.11), toon(o.capColor ?? 0x151515)); brim.position.set(0, 0.05, 0.14); g.add(brim);
  }
  if (o.sunglasses) for (const sx of [-1, 1]) { const s = new THREE.Mesh(geo.box(0.055, 0.03, 0.015), toon(0x111111)); s.position.set(sx * 0.042, 0.115, 0.07); s.rotation.x = -0.6; g.add(s); }
  if (o.glasses) for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.004, 6, 18), toon(0x222222)); s.position.set(sx * 0.043, 0.022, R * 0.9 + 0.02); g.add(s); }
  for (const sx of [-1, 1]) if (o.cheeks) { const c = new THREE.Mesh(geo.sph(0.018, 10, 8), basic(0xE07B6A, null, { transparent: true, opacity: 0.6 })); c.position.set(sx * 0.072, -0.02, R * 0.84); c.scale.set(1, 0.6, 0.3); g.add(c); }

  function face(p) {
    const blink = Math.max(p.blink || 0, p.sleepy ? 0.5 : 0);
    // lid closed = rotated down to cover the eye; half-open when sleepy
    eyes.forEach((lp) => { const open = p.scared ? -1.25 : p.angry ? -0.55 : -0.85; lp.rotation.x = open + (1.5 - open) * blink; });
    pupils.forEach((pp, i) => { pp.visible = blink < 0.6; pp.position.x = (i ? 0.043 : -0.043) + (p.lookX || 0) * 0.008; pp.position.y = 0.022 + (p.lookY || 0) * 0.007; pp.scale.setScalar(p.scared ? 0.7 : 1); });
    brows.forEach((b, i) => { const sx = i ? 1 : -1; b.position.y = 0.07 + (p.scared ? 0.012 : 0) + (p.browUp || 0) * 0.01; b.rotation.z = p.angry ? sx * 0.35 : p.scared ? -sx * 0.3 : 0; });
    const talk = p.talk || 0, chew = (p.chew || 0) * (1 - Math.min(1, talk * 3));
    mouth.scale.set(1 + (p.smile || 0) * 0.4 - chew * 0.25, 0.22 + 0.8 * talk + (p.scared ? 0.3 : 0) + chew * 0.35, 0.4 + chew * 0.15);
    mouth.position.y = -0.058 - chew * 0.006;
  }
  return { g, face };
}

// ---------------------------------------------------------------- a dressed person on a mocap skeleton
// spec: { model:'Xbot'|'Michelle', skin, shirt, shirtMap, pants, shoes, sleeve:'long'|'short'|'none', torsoR, belly,
//         head:{...}, props:{cuia, thermos, bag, fitinha, backpack, suitcase}, scale }
export function person(spec) {
  texInit();
  const src = MODELS[spec.model || 'Xbot'];
  const root = SkeletonUtils.clone(src.scene);
  root.traverse((o) => { if (o.isSkinnedMesh) o.visible = false; if (o.isMesh) o.frustumCulled = false; });
  const wrap = new THREE.Group(); wrap.add(root); wrap.scale.setScalar(spec.scale ?? 1);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), BLOB); blob.rotation.x = -Math.PI / 2; blob.position.y = 0.011; blob.renderOrder = 1; wrap.add(blob);
  root.updateMatrixWorld(true);
  const skin = toon(spec.skin);
  const shirt = spec.shirtMap ? toon(0xffffff, spec.shirtMap) : toon(spec.shirt ?? 0x777777);
  const pants = toon(spec.pants ?? 0x2A2E3A), shoes = toon(spec.shoes ?? 0x1A1A1A);
  const tr = spec.torsoR ?? 0.15;
  // torso
  limb(root, 'Hips', 'Spine', tr * 0.95, pants);
  limb(root, 'Spine', 'Spine1', tr, shirt);
  limb(root, 'Spine1', 'Spine2', tr * 1.02, shirt);
  limb(root, 'Spine2', 'Neck', tr * 0.95, shirt, { lenScale: 0.8 });
  if (spec.belly) { const b = new THREE.Mesh(geo.sph(tr * 1.12, 18, 14), shirt); onBone(root, 'Spine1', b, [0, 0.0, 0.045]); }
  limb(root, 'Neck', 'Head', 0.045, skin);
  { const c = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20), shirt); c.rotation.x = Math.PI / 2; onBone(root, 'Neck', c, [0, 0.0, 0.005]); }
  { const b = new THREE.Mesh(new THREE.TorusGeometry(tr * 0.97, 0.018, 8, 26), toon(spec.belt ?? 0x2A1A10)); b.rotation.x = Math.PI / 2; onBone(root, 'Spine', b, [0, -0.02, 0]); }
  for (const s of ['Left', 'Right']) {
    limb(root, s + 'Shoulder', s + 'Arm', 0.06, shirt);
    limb(root, s + 'Arm', s + 'ForeArm', 0.052, spec.sleeve === 'none' ? skin : shirt);
    limb(root, s + 'ForeArm', s + 'Hand', 0.044, spec.sleeve === 'long' ? shirt : skin);
    if (spec.fingers) {
      limb(root, s + 'Hand', s + 'HandMiddle1', 0.034, skin, { lenScale: 1.05 });
      limb(root, s + 'Hand', s + 'HandIndex1', 0.03, skin, { lenScale: 1.0 }); limb(root, s + 'Hand', s + 'HandPinky1', 0.028, skin, { lenScale: 1.0 });
      for (const fn of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) for (let k = 1; k <= 3; k++) {
        const r0 = fn === 'Thumb' ? 0.0125 : fn === 'Pinky' ? 0.0095 : 0.0108;
        if (B(root, s + 'Hand' + fn + (k + 1))) limb(root, s + 'Hand' + fn + k, s + 'Hand' + fn + (k + 1), r0 * (1 - k * 0.08), skin, { lenScale: k === 3 ? 1.25 : 1.05 });
      }
    } else {
      limb(root, s + 'Hand', s + 'HandMiddle1', 0.042, skin, { lenScale: 1.6 });
      limb(root, s + 'HandThumb1', s + 'HandThumb2', 0.018, skin, { lenScale: 2.0 });
    }
    limb(root, s + 'UpLeg', s + 'Leg', spec.thighR ?? 0.075, pants);
    limb(root, s + 'Leg', s + 'Foot', spec.shinR ?? 0.06, spec.boots ? shoes : pants);
    { const fb = B(root, s + 'Foot'), tb = B(root, s + 'ToeBase'), v = tb.position.clone(), ws = fb.getWorldScale(new THREE.Vector3()).x, L = v.length() * ws;
      const shoe = new THREE.Group(); fb.add(shoe); shoe.scale.setScalar(1 / ws); shoe.position.copy(v.clone().multiplyScalar(0.55));
      shoe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v.clone().normalize());
      const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, L * 1.05, 6, 14), shoes); up.rotation.x = Math.PI / 2; up.scale.set(1.05, 1, 0.8); shoe.add(up);
      const sole = new THREE.Mesh(geo.box(0.1, 0.022, L * 1.25 + 0.1), toon(spec.sole ?? 0xEDEDED)); sole.position.set(0, -0.04, 0.0); shoe.add(sole); }
  }
  // head
  const H = makeHead({ skin: spec.skin, ...(spec.head || {}) });
  { const hb = B(root, 'Head'), top = B(root, 'HeadTop_End').position.clone().multiplyScalar(0.5); hb.add(H.g); H.g.scale.setScalar(100); H.g.position.copy(top);
    H.g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().normalize()); }
  // props
  const P = spec.props || {};
  if (P.cuia) {
    const g = new THREE.Group();
    const c = new THREE.Mesh(geo.sph(0.06, 16, 12), toon(0x8A5A2B)); c.scale.set(1, 1.15, 1); g.add(c);
    const e = new THREE.Mesh(geo.cyl(0.045, 0.045, 0.012), toon(0x3E7A2A)); e.position.y = 0.065; g.add(e);
    const s = new THREE.Mesh(geo.cyl(0.005, 0.005, 0.18, 8), toon(0xC9CED6)); s.position.set(0.02, 0.12, 0); s.rotation.z = -0.25; g.add(s);
    { const hb = B(root, 'RightHand'), mid = B(root, 'RightHandMiddle1').position.clone(); hb.add(g); g.scale.setScalar(100); g.position.copy(mid.multiplyScalar(1.2)); }
  }
  let held = null;
  if (P.heldBall) { held = new THREE.Mesh(geo.sph(0.03, 12, 10), toon(0xF2C14E)); const hb = B(root, 'RightHand'), mid = B(root, 'RightHandMiddle1').position.clone(); hb.add(held); held.scale.setScalar(100); held.position.copy(mid.multiplyScalar(1.3)); held.visible = false; }
  if (P.thermos) { const t = new THREE.Mesh(geo.cyl(0.045, 0.045, 0.26), toon(0xB8BEC6)); onBone(root, 'Spine1', t, [0.2, 0.0, 0.02]).rotation.z = 0.2; }
  if (P.bag) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(geo.box(0.15, 0.18, 0.09), toon(0xD9B98A)));
    for (const [x, z] of [[-0.04, 0], [0.03, 0.02], [0.02, -0.02]]) { const p = new THREE.Mesh(geo.sph(0.03, 10, 8), toon(0xF2C14E)); p.position.set(x, 0.1, z); g.add(p); }
    { const hb = B(root, 'LeftHand'), mid = B(root, 'LeftHandMiddle1').position.clone(); hb.add(g); g.scale.setScalar(100); g.position.copy(mid.multiplyScalar(1.6)); }
  }
  if (P.fitinha) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 8, 20), toon(0xFFE14C)); f.rotation.x = Math.PI / 2; { const hb = B(root, 'RightForeArm'), v = B(root, 'RightHand').position.clone(); hb.add(f); f.scale.setScalar(100); f.position.copy(v.clone().multiplyScalar(0.85)); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v.normalize()); } }
  if (P.chain) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.006, 6, 24), toon(0xE8C04A)); f.rotation.x = Math.PI / 2.3; onBone(root, 'Spine2', f, [0, 0.12, 0.05]); }
  if (P.neckerchief) { const k = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.13, 3), toon(0xD4262E)); k.rotation.x = Math.PI; onBone(root, 'Spine2', k, [0, 0.12, 0.13]); }
  if (P.vest) for (const sx of [-1, 1]) { const v = new THREE.Mesh(geo.box(0.11, 0.34, 0.04), toon(0x7A4A2A)); onBone(root, 'Spine1', v, [sx * 0.095, 0.05, tr + 0.005]).rotation.y = sx * -0.3; }
  if (P.backpack) { const b = new THREE.Mesh(geo.box(0.28, 0.36, 0.14), toon(P.backpack)); onBone(root, 'Spine1', b, [0, 0.05, -tr - 0.06]); }
  if (P.patch) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.07), basic(0xffffff, P.patch)); onBone(root, 'Spine2', p, [0.06, 0.02, tr + 0.01]); }

  root.traverse((o) => { if (o.isMesh && o.material !== BLOB) { o.castShadow = true; } });
  // animation: one mixer, clips by name; weights set each frame (pure: setTime from absolute t)
  const mixer = new THREE.AnimationMixer(root);
  const actions = {};
  const clips = src.clips || {};
  for (const [n, c] of Object.entries(clips)) {
    const a = mixer.clipAction(c);
    if (n.endsWith('_add')) a.blendMode = THREE.AdditiveAnimationBlending;
    a.play(); a.setEffectiveWeight(0); actions[n] = a;
  }
  const bones = { rHand: B(root, 'RightHand'), lHand: B(root, 'LeftHand'), lFore: B(root, 'LeftForeArm'), head: B(root, 'Head'), neck: B(root, 'Neck'), spine2: B(root, 'Spine2'), hips: B(root, 'Hips'),
    rArm: B(root, 'RightArm'), rFore: B(root, 'RightForeArm'), lArm: B(root, 'LeftArm') };
  const q = new THREE.Quaternion(), e = new THREE.Euler();

  // p: { t, w:{walk, idle, run, samba, agree_add, headShake_add, ...}, speed:{walk}, headYaw, headPitch, face:{...} }
  function pose(p) {
    for (const [n, a] of Object.entries(actions)) {
      a.setEffectiveWeight(p.w?.[n] ?? 0);
      a.setEffectiveTimeScale((p.speed && p.speed[n]) ?? 1);
    }
    mixer.setTime(p.t + (p.offset || 0));
    // procedural look-at on top of the mocap (head + neck share the turn)
    if (p.headYaw || p.headPitch) {
      e.set((p.headPitch || 0) * 0.5, (p.headYaw || 0) * 0.5, 0); q.setFromEuler(e);
      bones.neck.quaternion.multiply(q); bones.head.quaternion.multiply(q);
    }
    H.face(p.face || {});
    // arm IK on top (drink, eat, reach): targets in world space
    if (p.ik) {
      wrap.updateMatrixWorld(true);
      for (const k of p.ik) if (k.w > 0.001) {
        const side = k.side === 'Left' ? 'l' : 'r';
        twoBoneIK(side === 'l' ? bones.lArm : bones.rArm, side === 'l' ? bones.lFore : bones.rFore, side === 'l' ? bones.lHand : bones.rHand, k.target, k.pole, k.w);
      }
    }
    if (held) { held.visible = !!p.held; held.scale.setScalar(100 * (p.heldScale ?? 1)); }
  }
  // world-space anchors for the IK targets
  const _v = new THREE.Vector3();
  function anchor(name) { wrap.updateMatrixWorld(true); return B(root, name).getWorldPosition(new THREE.Vector3()); }
  return { root: wrap, skel: root, pose, bones, actions, anchor };
}

// the cast in costume
export function cast(who, opts = {}) {
  texInit();
  if (who === 'bento') return person({ fingers: true, sole: 0x3A2414, skin: 0xEDBB91, shirt: 0xF2EEE6, pants: 0x8C8A86, shoes: 0x4A2C18, boots: true, sleeve: 'long', torsoR: 0.17, belly: true, thighR: 0.1, shinR: 0.08,
    head: { hair: 0x2B1B12, mustache: true, hat: 'beret' }, props: { cuia: true, thermos: true, neckerchief: true }, scale: 1.0 });
  if (who === 'geraldim') return person({ fingers: true, sole: 0x2A1A10, skin: 0xD69A62, shirtMap: TEX.plaid, pants: 0x2E4A7A, shoes: 0x3A2A1A, sleeve: 'long', torsoR: 0.17, belly: true,
    head: { hair: 0x2A1A10, hat: 'straw', cheeks: true }, props: { bag: true, heldBall: true }, scale: 0.93 });
  if (who === 'rai') return person({ fingers: true, sole: 0xFFFFFF, model: 'Michelle', skin: 0x6B3E26, shirtMap: TEX.tropical, pants: 0x2A2A2E, shoes: 0xFFE14C, sleeve: 'none', torsoR: 0.13,
    head: { hair: 0x1C120C, hairStyle: 'afro', sunglasses: true, brow: 0x140c08 }, props: { fitinha: true, chain: true }, scale: 1.1 });
  if (who === 'caio') return person({ skin: 0xE8B48A, shirtMap: TEX.stripes, pants: 0x1E1E24, sleeve: 'short', head: { hat: 'cap' } });
  return null;
}

// random extra (NPC)
const SKINS = [0xF1C9A5, 0xE0AC80, 0xC68C5E, 0x8D5A3B, 0x6B3E26, 0xF5D6BC];
const SHIRTS = [0x3C6E9E, 0xC0392B, 0x2E8B57, 0xE6B422, 0x6C3483, 0xEEEEEE, 0x222831, 0xD35400, 0x16A085, 0x8E44AD, 0x7F8C8D, 0xF39C12];
const PANTS = [0x2A2E3A, 0x34495E, 0x1C2833, 0x5D4037, 0x4A6FA5, 0x222222];
const HAIRS = [0x1A1A1A, 0x3B2416, 0x5A3A22, 0x9A7B4F, 0x777777];
export function extra(i) {
  const r = (k) => hash(i, k);
  const long = r(5) > 0.6;
  return person({
    skin: SKINS[Math.floor(r(1) * SKINS.length)], shirt: SHIRTS[Math.floor(r(2) * SHIRTS.length)], pants: PANTS[Math.floor(r(3) * PANTS.length)],
    shoes: r(4) > 0.5 ? 0x1A1A1A : 0xEEEEEE, sleeve: r(6) > 0.5 ? 'short' : 'long', torsoR: 0.13 + r(7) * 0.04, belly: r(8) > 0.75,
    head: { hair: HAIRS[Math.floor(r(9) * HAIRS.length)], hairStyle: long ? 'long' : r(10) > 0.85 ? 'bald' : 'short', hat: r(11) > 0.8 ? 'cap' : null, capColor: SHIRTS[Math.floor(r(12) * SHIRTS.length)], glasses: r(13) > 0.8 },
    props: { backpack: r(14) > 0.6 ? SHIRTS[Math.floor(r(15) * SHIRTS.length)] : null },
    scale: 0.92 + r(16) * 0.14,
  });
}
