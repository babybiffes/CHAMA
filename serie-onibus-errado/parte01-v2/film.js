// Ônibus Errado – Parte 01, teste de 20 s (v3). Pure function of time: window.seek(t) paints frame t.
// Caio's POV walking into the rodoviária. Everything on the phone happens ON the phone (no overlays).
// Bento drinks chimarrão and Geraldim eats pão de queijo (arm IK on top of mocap), stopping only to talk.
import * as M from './lib/motion.js';
import * as GL from './lib/gl.js';
import { THREE } from './lib/gl.js';
import { loadModels, toon, paintTex } from './sets/rig.js';
import { stationSet } from './sets/station.js';
import { pipeline } from './sets/post.js';
import { checkCollisions } from './sets/check.js';

const { W, H, E, prog, lerp, springU, SPRING, font, text, rrect, noise1, kf } = M;
const UI = 'UI', DISPLAY = 'Display';
const COL = { caio: '#FFFFFF', bento: '#7CFC9A', geraldim: '#FFD54A', rai: '#FF9A3C', red: '#E0262E', ink: '#121016' };
const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

const SUBS = [
  [1.8, 5.0, 'caio', 'Ôrra, meu… o Luis de novo? Mano, faz seis anos.'],
  [5.6, 8.9, 'rai', 'Oxe, bloqueia esse homem, véi. Ele ficou em Registro, deixa ele lá.'],
  [9.1, 12.3, 'geraldim', 'Uai, mas ês num deixou ele, ês esqueceu. É diferente.'],
  [12.5, 16.0, 'bento', 'Bah, foco, tchê! Plataforma nove. EUROPA. Seis anos juntando pila!'],
  [18.5, 20.0, 'caio', 'Firmeza, mano. Bora!'],
];
const subAt = (t) => SUBS.find((s) => t >= s[0] && t < s[1]);
const talkOf = (who, t) => {
  const s = subAt(t); if (!s || s[2] !== who) return 0;
  const k = Math.min(prog(t, s[0], s[0] + 0.12), 1 - prog(t, s[1] - 0.15, s[1]));
  return k * (0.25 + 0.75 * Math.abs(Math.sin(t * 12.5 + noise1(t * 3, 7) * 2)));
};
// 1 while a character is free; eases to 0 half a second before their line and back after it
const freeOf = (who, t) => { let g = 1; for (const [a, b, w] of SUBS) if (w === who) g = Math.min(g, 1 - smooth(a - 0.6, a - 0.05, t) * (1 - smooth(b + 0.1, b + 0.6, t))); return g; };
// smooth weight of "is talking" (for clip blending)
const talkW = (who, t) => 1 - freeOf(who, t);

// ------------------------------------------------------------------ camera walk
const WALK_END = 7.2;
const walked = (t) => { const p = Math.min(1, t / WALK_END); return 8.9 * (p * (2 - p) * 0.5 + p * 0.5); };
function camPose(t) {
  const zz = 11 - walked(t), steps = walked(t) / 0.72, moving = 1 - E.inCubic(prog(t, WALK_END - 1.2, WALK_END));
  const bobY = 0.026 * Math.cos(steps * Math.PI * 2) * moving, bobX = 0.016 * Math.sin(steps * Math.PI) * moving;
  // reading the phone (0.8–5.4) pulls the gaze down; then the friends, each speaker, the sign
  const yaw = kf(t, [[0, 0.04], [5.4, 0.04], [6.0, 0.14], [9.0, 0.14], [9.5, -0.02], [12.2, -0.02], [12.7, -0.16], [15.9, -0.14], [16.6, 0.0], [18.2, 0.05], [20, 0.02]], E.inOutSine);
  const pitch = kf(t, [[0, -0.1], [0.8, -0.1], [1.3, -0.32], [5.2, -0.3], [5.9, -0.08], [13.6, -0.06], [14.2, -0.02], [15.0, -0.07], [20, -0.07]], E.inOutSine);
  const hy = 0.004 * noise1(t * 1.7, 3), hp = 0.004 * noise1(t * 1.3, 8);
  return { pos: [0.3 + bobX, 1.63 + bobY, zz], yaw: yaw + hy + bobX * 0.5, pitch: pitch + hp, roll: 0.011 * Math.sin(steps * Math.PI) * moving + 0.004 * noise1(t, 5), steps, moving };
}

// ------------------------------------------------------------------ phone (everything happens on its screen)
const PHONE = { up0: 0.8, up1: 5.4, notif: 1.0, tap: 2.45, open: 2.55, typing: 3.4, msg: 4.1, lock: 5.55 };
function drawPhone(c, w, h, t) {
  const r = (x, y, ww, hh, rad, f) => { c.beginPath(); c.roundRect(x, y, ww, hh, rad); c.fillStyle = f; c.fill(); };
  if (t > PHONE.lock) { c.fillStyle = '#050507'; c.fillRect(0, 0, w, h); return; }
  const status = (dark) => { c.fillStyle = dark ? '#fff' : '#fff'; c.font = '700 22px UI'; c.textAlign = 'left'; c.fillText('22:31', 22, 34);
    c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(w - 70, 16, 46, 22); c.fillStyle = Math.floor(t * 2) % 2 ? COL.red : '#ff7070'; c.fillRect(w - 67, 19, 6, 16);
    c.fillStyle = COL.red; c.textAlign = 'right'; c.font = '800 20px UI'; c.fillText('3%', w - 78, 34); };
  if (t < PHONE.open) {
    // lock screen
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3A2A6A'); g.addColorStop(1, '#C0507A'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(60 + i * 55, 600 + 30 * Math.sin(i), 40 + i * 6, 0, 7); c.fill(); }
    status(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = '300 120px UI'; c.font = '800 118px Display'; c.fillText('22:31', w / 2, 210);
    c.font = '700 26px UI'; c.fillText('sexta-feira, 13 de novembro', w / 2, 252);
    // WhatsApp banner slides down
    const k = springU(t, PHONE.notif, SPRING.gentle);
    if (k > 0.001) {
      const y = lerp(-170, 300, k), press = M.bump(t, PHONE.tap, 0.08);
      c.save(); c.translate(w / 2, y + 70); c.scale(1 - press * 0.04, 1 - press * 0.04); c.translate(-w / 2, -(y + 70));
      r(16, y, w - 32, 140, 22, 'rgba(250,250,250,.96)');
      c.beginPath(); c.arc(56, y + 46, 22, 0, 7); c.fillStyle = '#25D366'; c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(56, y + 46, 10, 0, 7); c.fill(); c.fillStyle = '#25D366'; c.beginPath(); c.arc(56, y + 46, 6, 0, 7); c.fill();
      c.fillStyle = '#666'; c.font = '700 20px UI'; c.textAlign = 'left'; c.fillText('WhatsApp  •  agora', 90, y + 40);
      c.fillStyle = '#111'; c.font = '800 28px UI'; c.fillText('Luis', 30, y + 88);
      c.fillStyle = '#333'; c.font = '700 22px UI'; c.fillText('17 chamadas de voz perdidas', 30, y + 120);
      c.restore();
    }
    return;
  }
  // chat with Bruno
  c.fillStyle = '#ECE5DD'; c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(0,0,0,.035)'; for (let y = 120; y < h; y += 40) for (let x = (y / 40) % 2 * 20; x < w; x += 40) { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); }
  c.fillStyle = '#075E54'; c.fillRect(0, 0, w, 120); status(true);
  c.beginPath(); c.arc(62, 82, 24, 0, 7); c.fillStyle = '#8FB8D8'; c.fill(); c.fillStyle = '#fff'; c.font = '800 26px UI'; c.textAlign = 'center'; c.fillText('L', 62, 92);
  c.textAlign = 'left'; c.fillStyle = '#fff'; c.font = '800 28px UI'; c.fillText('Luis', 100, 80);
  c.font = '600 20px UI'; c.fillStyle = '#CDEBE4'; c.fillText(t > PHONE.typing && t < PHONE.msg ? 'digitando…' : 'online', 100, 106);
  const scroll = (t > PHONE.msg ? smooth(PHONE.msg, PHONE.msg + 0.3, t) : 0) * 70;
  const calls = ['21:58', '22:03', '22:07', '22:12', '22:20', '22:29'];
  calls.forEach((hh, i) => {
    const y = 150 + i * 78 - scroll;
    r(18, y, 250, 62, 14, '#FFFFFF');
    c.strokeStyle = COL.red; c.lineWidth = 4; c.beginPath(); c.arc(44, y + 31, 11, 0.6, 2.6); c.stroke();
    c.fillStyle = '#222'; c.font = '700 20px UI'; c.fillText('Chamada de voz perdida', 66, y + 28);
    c.fillStyle = '#888'; c.font = '600 16px UI'; c.fillText(hh, 66, y + 50);
  });
  if (t > PHONE.msg) {
    const k = springU(t, PHONE.msg, SPRING.bouncy), y = 150 + 6 * 78 - scroll + 10;
    c.save(); c.translate(18, y + 50); c.scale(k, k); c.translate(-18, -(y + 50));
    r(18, y, 300, 104, 16, '#FFFFFF');
    c.fillStyle = '#111'; c.font = '700 22px UI'; c.fillText('Vocês vão me deixar', 34, y + 36); c.fillText('pra trás de novo?', 34, y + 66);
    c.fillStyle = '#888'; c.font = '600 16px UI'; c.fillText('22:31', 250, y + 92);
    c.restore();
  }
  r(14, h - 74, w - 92, 56, 28, '#fff'); c.fillStyle = '#999'; c.font = '600 20px UI'; c.fillText('Mensagem', 40, h - 38);
  c.beginPath(); c.arc(w - 44, h - 46, 28, 0, 7); c.fillStyle = '#128C7E'; c.fill();
  if (t > PHONE.tap && t < PHONE.tap + 0.5) { const k = prog(t, PHONE.tap, PHONE.tap + 0.5); c.beginPath(); c.arc(w / 2, 300, 40 + 200 * k, 0, 7); c.fillStyle = `rgba(0,0,0,${0.12 * (1 - k)})`; c.fill(); }
}

function povRig(cam) {
  const rig = new THREE.Group(); cam.add(rig);
  const stripes = paintTex(64, 64, (c, w, h) => { c.fillStyle = '#F2F2F2'; c.fillRect(0, 0, w, h); c.fillStyle = '#151515'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 8, h); }, [3, 1]);
  const skin = toon(0xE8B48A);
  const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.3, 6, 14), toon(0xffffff, stripes)); sleeve.rotation.x = Math.PI / 2.4; sleeve.position.set(0.06, -0.09, 0.2); rig.add(sleeve);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.13, 6, 14), skin); fore.rotation.x = Math.PI / 2.5; fore.position.set(0.035, -0.05, 0.085); rig.add(fore);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 14), skin); palm.scale.set(1.0, 1.1, 0.6); palm.position.set(0.01, 0.0, -0.03); rig.add(palm);
  const phone = new THREE.Group(); phone.position.set(-0.005, 0.03, 0.0); rig.add(phone);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.156, 0.009), toon(0x1B1B22)); phone.add(body);
  const cv = document.createElement('canvas'); cv.width = 360; cv.height = 760; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.148), new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false })); screen.position.z = 0.0048; phone.add(screen);
  const fingers = []; for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0085, 0.022, 4, 8), skin); f.position.set(-0.041, -0.035 + i * 0.024, -0.005); f.rotation.z = Math.PI / 2; rig.add(f); fingers.push(f); }
  const thumb = new THREE.Group(); thumb.position.set(0.042, -0.03, 0.008); rig.add(thumb);
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.034, 4, 8), skin); th.position.set(-0.008, 0.022, 0); th.rotation.z = 0.5; thumb.add(th);
  rig.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return {
    update(t, cp) {
      const up = smooth(PHONE.up0, PHONE.up0 + 0.55, t) * (1 - smooth(PHONE.up1, PHONE.up1 + 0.6, t));
      const away = 0;
      const buzz = (M.bump(t, PHONE.notif + 0.12, 0.14) + M.bump(t, PHONE.notif + 0.5, 0.14)) * Math.sin(t * 260) * 0.0035;
      const walkBob = 0.01 * Math.sin(cp.steps * Math.PI) * cp.moving, walkY = 0.012 * Math.abs(Math.cos(cp.steps * Math.PI)) * cp.moving;
      rig.position.set(lerp(0.17, 0.035, up) + walkBob * (1 - up * 0.6) + buzz, lerp(-0.24, -0.12, up) - walkY * (1 - up * 0.7) - away * 0.3, lerp(-0.36, -0.25, up));
      rig.rotation.set(lerp(0.32, 0.12, up) + 0.02 * Math.sin(cp.steps * Math.PI * 2) * cp.moving, lerp(-0.25, -0.06, up), lerp(0.08, 0.02, up) + buzz * 4);
      // thumb reaches for the banner and taps
      const reach = smooth(PHONE.tap - 0.35, PHONE.tap - 0.05, t) * (1 - smooth(PHONE.tap + 0.1, PHONE.tap + 0.45, t));
      thumb.position.set(0.042 - reach * 0.03, -0.03 + reach * 0.045, 0.008 + reach * 0.012 - M.bump(t, PHONE.tap, 0.06) * 0.006);
      thumb.rotation.z = reach * 0.6;
      const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); drawPhone(c, 360, 760, t); tex.needsUpdate = true;
    },
  };
}

// ------------------------------------------------------------------ friends: behaviour
let S = null;
async function init() {
  await GL.initGL({ exposure: 1.0 });
  await loadModels();
  const st = stationSet({ camAt: (t) => camPose(t).pos });
  const cam = GL.camera(100, 0.05, 120); st.scene.add(cam);
  S = { st, cam, pov: povRig(cam), P: pipeline(GL.R, W, H) };
  if (new URLSearchParams(location.search).get('check') !== null || window.CHECK) { const r = checkCollisions(st, (t) => camPose(t).pos); console.error('COLISOES ' + r.length + '\n' + r.join('\n')); }
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const fwdOf = (ry) => V3(Math.sin(ry), 0, Math.cos(ry));
const rightOf = (ry) => V3(-Math.cos(ry), 0, Math.sin(ry));       // the character's own right
const UP = V3(0, 1, 0);

// chimarrão: sip cycle (4.6 s) — raise, sip (slurp), lower, rest
const MATE = { P: 4.6, t0: 0.2 };
function mateArm(t) { const k = ((t - MATE.t0) % MATE.P + MATE.P) % MATE.P; return smooth(0, 0.7, k) * (1 - smooth(2.1, 2.8, k)); }
// pão de queijo: eat cycle (3.4 s) — to the bag, pick, to the mouth, bite, down, chew
const PAO = { P: 3.4, t0: 0.5 };
function paoPhase(t) { return ((t - PAO.t0) % PAO.P + PAO.P) % PAO.P; }

// gesture envelope: eases in/out over 0.35 s
const env = (t, a, b, e = 0.35) => smooth(a, a + e, t) * (1 - smooth(b - e, b, t));
// local frame helper: point = chest + r*right + u*up + f*forward (character space, metres)
const L = (chest, R, U, F, r, u, f) => chest.clone().add(R.clone().multiplyScalar(r)).add(U.clone().multiplyScalar(u)).add(F.clone().multiplyScalar(f));
// step toward Caio while talking (m), with the walk clip weighted by how fast the step is
function approach(t, a, b, d) { const k = smooth(a - 0.3, a + 0.35, t) * (1 - smooth(b + 0.15, b + 0.8, t)); const v = Math.abs(smooth(a - 0.3, a + 0.35, t + 0.05) - smooth(a - 0.3, a + 0.35, t - 0.05)) + Math.abs(smooth(b + 0.15, b + 0.8, t + 0.05) - smooth(b + 0.15, b + 0.8, t - 0.05)); return { d: d * k, walk: Math.min(0.8, v * 6) }; }

function raiSpeed(t) { return 0.85 - 0.62 * Math.max(talkW('rai', t), env(t, 10.5, 11.7), env(t, 2.6, 4.5) * 0.6); }
const RAI_CLK = (() => { const a = []; let acc = 0; for (let i = 0; i <= 2100; i++) { a.push(acc); acc += raiSpeed(i / 100) / 100; } return a; })();
function raiClock(t) { const i = Math.max(0, Math.min(2099, Math.floor(t * 100))), f = t * 100 - i; return RAI_CLK[i] + (RAI_CLK[i + 1] - RAI_CLK[i]) * f; }

function friends(t, cp) {
  const { rai, ger, ben } = S.st;
  const who = { rai, geraldim: ger, bento: ben };
  const HOME = { rai: [-0.55, -0.75], geraldim: [0.35, -1.0], bento: [1.25, -0.7] };
  const STEP = { rai: approach(t, 5.6, 8.9, 0.45), geraldim: approach(t, 9.1, 12.3, 0.38), bento: approach(t, 12.5, 16.0, 0.42) };
  for (const [name, ch] of Object.entries(who)) {
    const h = HOME[name], dx = cp.pos[0] - h[0], dz = cp.pos[2] - h[1], dl = Math.hypot(dx, dz);
    ch.root.position.set(h[0] + dx / dl * STEP[name].d, 0, h[1] + dz / dl * STEP[name].d);
  }
  // body faces Caio, turned partly toward whoever talks; gaze averaged over 0.45 s so heads glide
  const faceYaw = (name, ch, tt) => { const p = ch.root.position; const spk = subAt(tt)?.[2]; const toCam = Math.atan2(cp.pos[0] - p.x, cp.pos[2] - p.z);
    if (spk && spk !== name && spk !== 'caio') { const q = who[spk].root.position; const toS = Math.atan2(q.x - p.x, q.z - p.z); return [toCam, toS]; } return [toCam, toCam]; };
  const gaze = (name, ch) => { let acc = 0, body = 0; const n = 6; for (let i = 0; i < n; i++) { const [c, g] = faceYaw(name, ch, t - (i / (n - 1)) * 0.45); body += c + Math.atan2(Math.sin(g - c), Math.cos(g - c)) * 0.35; acc += Math.atan2(Math.sin(g - c), Math.cos(g - c)); } return { body: body / n, head: acc / n }; };
  const Gz = {}; for (const [name, ch] of Object.entries(who)) { Gz[name] = gaze(name, ch); ch.root.rotation.y = Gz[name].body * 0.92; }
  const blink = (o) => ((t + o) % 3.6 < 0.11 ? 1 : 0);
  const cheer = env(t, 14.6, 15.6), hype = env(t, 16.2, 20.5, 0.6);
  const frame = (ch) => { const ry = ch.root.rotation.y; return { F: fwdOf(ry), R: rightOf(ry), U: UP }; };

  // ---------------- RAI: dances; waves at Caio; when he talks he steps in, slows the samba and talks with his hands
  { const tk = talkOf('rai', t), tw = talkW('rai', t);
    const wave = env(t, 2.6, 4.5), oooh = env(t, 10.5, 11.7), block = env(t, 5.9, 6.9), back = env(t, 7.0, 8.0), deixa = env(t, 8.0, 8.9);
    const samba = 1 - 0.7 * Math.max(tw, oooh, wave * 0.5);
    rai.pose({ t: raiClock(t), offset: 2.0, w: { samba: 1 }, speed: { samba: 1 } });
    const chest = rai.anchor('Spine2'), head = rai.anchor('Head'), { F, R, U } = frame(rai);
    const ikR = [], ikL = [];
    const poleR = U.clone().multiplyScalar(-1).add(R.clone().multiplyScalar(0.8)), poleL = U.clone().multiplyScalar(-1).add(R.clone().multiplyScalar(-0.8));
    if (wave > 0) ikR.push([L(chest, R, U, F, 0.32 + 0.09 * Math.sin(t * 17), 0.55, 0.12), wave]);
    if (block > 0) ikR.push([L(chest, R, U, F, 0.08, 0.18, 0.4 + 0.08 * Math.abs(Math.sin(t * 9))), block]);
    if (back > 0) ikR.push([L(chest, R, U, F, 0.34, 0.32, -0.08), back]);
    if (deixa > 0) { ikR.push([L(chest, R, U, F, 0.38, 0.02, 0.3), deixa]); ikL.push([L(chest, R, U, F, -0.12, -0.05, 0.36), deixa * 0.7]); }
    if (cheer > 0) { ikR.push([L(chest, R, U, F, 0.3, 0.75, 0.1), cheer]); ikL.push([L(chest, R, U, F, -0.12, 0.78, 0.16), cheer]); }
    if (oooh > 0) ikL.push([head.clone().add(F.clone().multiplyScalar(0.16)).add(U.clone().multiplyScalar(0.0)), oooh]);
    const pick = (list) => { if (!list.length) return null; let w = 0, v = new THREE.Vector3(); for (const [p, k] of list) { v.add(p.clone().multiplyScalar(k)); w += k; } return { target: v.multiplyScalar(1 / w), w: Math.min(1, w) }; };
    const pr = pick(ikR), pl = pick(ikL), ik = [];
    if (pr) ik.push({ side: 'Right', target: pr.target, pole: poleR, w: pr.w });
    if (pl) ik.push({ side: 'Left', target: pl.target, pole: poleL, w: pl.w });
    rai.pose({ t: raiClock(t), offset: 2.0, w: { samba: 1 }, speed: { samba: 1 }, headYaw: Gz.rai.head, headPitch: -0.08 * cheer,
      face: { talk: Math.max(tk, oooh * 0.9), blink: blink(0.4), smile: 1 - oooh, scared: oooh > 0.5 }, ik });
  }

  // ---------------- BENTO: chimarrão (stops only to talk); laughs at Rai; shakes his head at Geraldim; points at the sign, celebrates EUROPA
  { const tk = talkOf('bento', t), tw = talkW('bento', t), free = freeOf('bento', t) * (1 - cheer);
    const laugh = env(t, 7.3, 8.8), shake = env(t, 11.0, 12.3), salute = env(t, 3.0, 4.4);
    const point = env(t, 13.5, 14.6), pump = env(t, 14.6, 15.3), atCaio = env(t, 12.6, 13.5), pila = env(t, 15.3, 16.0);
    const arm = mateArm(t) * free * (1 - salute), { F, R, U } = frame(ben);
    const headYaw = Gz.bento.head * (1 - arm * 0.6) + shake * 0.35 * Math.sin(t * 9);
    const base = { t, offset: 0.2, w: { idle: Math.max(0, 1 - 0.45 * tw - STEP.bento.walk), agree: 0.45 * tw, walk: STEP.bento.walk } };
    ben.pose(base);
    const head = ben.anchor('Head'), chest = ben.anchor('Spine2');
    const rest = L(chest, R, U, F, 0.13, -0.2, 0.19), sip = head.clone().add(F.clone().multiplyScalar(0.2)).add(U.clone().multiplyScalar(-0.05)).add(R.clone().multiplyScalar(0.02));
    let rT = rest.clone().lerp(sip, arm);
    rT = rT.lerp(L(chest, R, U, F, 0.26, 0.42, 0.25), salute).lerp(L(chest, R, U, F, 0.3, 0.72, 0.1), Math.max(pump, cheer * 0.0));
    let lT = L(chest, R, U, F, -0.24, -0.38, 0.05), lW = 0;
    const lt = [[L(chest, R, U, F, -0.12, 0.2, 0.5), atCaio], [L(chest, R, U, F, -0.12, 0.8, 0.32), point], [L(chest, R, U, F, -0.3, 0.72, 0.1), pump], [L(chest, R, U, F, -0.14, 0.12, 0.36 + 0.03 * Math.sin(t * 14)), pila], [L(chest, R, U, F, -0.05, 0.02, 0.22), laugh * 0.6]];
    for (const [p, k] of lt) if (k > 0) { lT = lT.lerp(p, k); lW = Math.max(lW, k); }
    const poleR = U.clone().multiplyScalar(-1).add(R.clone().multiplyScalar(0.7)).add(F.clone().multiplyScalar(-0.2)), poleL = U.clone().multiplyScalar(-1).add(R.clone().multiplyScalar(-0.7)).add(F.clone().multiplyScalar(-0.2));
    ben.pose({ ...base, headYaw, headPitch: arm * 0.12 - laugh * (0.18 + 0.08 * Math.sin(t * 15)),
      face: { talk: Math.max(tk, laugh * (0.5 + 0.3 * Math.sin(t * 15))), blink: Math.max(blink(2.6), laugh * 0.75), angry: tw > 0.5 && pump < 0.5, smile: laugh + pump },
      ik: [{ side: 'Right', target: rT, pole: poleR, w: 1 }, { side: 'Left', target: lT, pole: poleL, w: lW }] });
    if (laugh > 0) ben.root.position.y = 0.012 * laugh * Math.abs(Math.sin(t * 15));
  }

  // ---------------- GERALDIM: eats (stops only to talk); finger up "uai", shrug "é diferente"; cheers at EUROPA
  { const tk = talkOf('geraldim', t), tw = talkW('geraldim', t), free = freeOf('geraldim', t) * (1 - cheer);
    const finger = env(t, 9.4, 10.7), shrug = env(t, 11.2, 12.3), nod = env(t, 3.2, 4.8);
    const k = paoPhase(t), { F, R, U } = frame(ger);
    const base = { t, offset: 0.9, w: { idle: Math.max(0, 1 - 0.45 * tw - STEP.geraldim.walk), agree: 0.45 * tw, walk: STEP.geraldim.walk } };
    ger.pose(base);
    const head = ger.anchor('Head'), belly = ger.anchor('Spine1'), chest = ger.anchor('Spine2');
    const bagPos = L(belly, R, U, F, -0.08, -0.1, 0.22), rest = L(belly, R, U, F, 0.14, -0.2, 0.18), atBag = bagPos.clone().add(U.clone().multiplyScalar(0.12)).add(R.clone().multiplyScalar(0.04));
    const mouth = head.clone().add(F.clone().multiplyScalar(0.19)).add(U.clone().multiplyScalar(0.02));
    let tgt = rest.clone();
    if (k < 0.55) tgt = rest.clone().lerp(atBag, smooth(0, 0.55, k)); else if (k < 0.8) tgt = atBag.clone();
    else if (k < 1.35) tgt = atBag.clone().lerp(mouth, smooth(0.8, 1.35, k)); else if (k < 1.75) tgt = mouth.clone();
    else if (k < 2.3) tgt = mouth.clone().lerp(rest, smooth(1.75, 2.3, k));
    tgt = rest.clone().lerp(tgt, free);
    tgt = tgt.lerp(L(chest, R, U, F, 0.16 + 0.04 * Math.sin(t * 18), 0.4, 0.3), finger).lerp(L(chest, R, U, F, 0.34, -0.02, 0.32), shrug).lerp(L(chest, R, U, F, 0.28, 0.7, 0.12), cheer);
    const held = free > 0.5 && k > 0.7 && k < 1.55;
    const chew = free * (k > 1.55 ? Math.max(0, Math.sin((k - 1.55) * 2 * Math.PI * 2.6)) * (1 - smooth(3.0, 3.4, k)) : 0);
    const poleR = U.clone().multiplyScalar(-1).add(R.clone().multiplyScalar(0.7)).add(F.clone().multiplyScalar(-0.2)), poleL = U.clone().multiplyScalar(-1).add(R.clone().multiplyScalar(-0.7)).add(F.clone().multiplyScalar(-0.2));
    ger.pose({ ...base, headYaw: Gz.geraldim.head, headPitch: (k > 1.2 && k < 1.8 ? 0.08 * free : 0) + nod * 0.12 * Math.sin(t * 8) - cheer * 0.1,
      face: { talk: tk, blink: blink(1.7), chew, smile: cheer + nod * 0.5, browUp: shrug }, held, heldScale: 1,
      ik: [{ side: 'Right', target: tgt, pole: poleR, w: 1 }, { side: 'Left', target: bagPos.clone().lerp(L(chest, R, U, F, -0.2, 0.5, 0.15), cheer * 0.6), pole: poleL, w: 0.85 }] });
    if (shrug > 0) ger.root.position.y = 0.0;
  }
}

// ------------------------------------------------------------------ 2-D overlays (badge + subtitles only)
function rr(ctx, x, y, w, h, r, f, line = 6) { rrect(ctx, x, y, w, h, r); if (f) { ctx.fillStyle = f; ctx.fill(); } if (line) { ctx.lineWidth = line; ctx.strokeStyle = COL.ink; ctx.stroke(); } }
function badge(ctx, t) {
  const k = springU(t, 0.2, SPRING.bouncy) * (1 - E.inCubic(prog(t, 3.3, 3.6))); if (k <= 0) return;
  ctx.save(); ctx.translate(90, 270); ctx.scale(k, k); rr(ctx, 0, 0, 250, 74, 14, COL.red, 6);
  text(ctx, 'PARTE 01', 125, 52, font(44, 900, DISPLAY), '#fff', 'center'); ctx.restore();
}
function wrap(ctx, str, f, maxW) { ctx.font = f; const ws = str.split(' '), out = []; let cur = ''; for (const w of ws) { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > maxW && cur) { out.push(cur); cur = w; } else cur = s; } if (cur) out.push(cur); return out; }
function subtitles(ctx, t) {
  const s = subAt(t); if (!s) return; const [t0, t1, who, str] = s;
  const a = Math.min(E.outCubic(prog(t, t0, t0 + 0.12)), 1 - prog(t, t1 - 0.1, t1));
  const phoneUp = smooth(PHONE.up0, PHONE.up0 + 0.5, t) * (1 - smooth(PHONE.up1, PHONE.up1 + 0.5, t));
  const f = font(56, 800, UI), lines = wrap(ctx, str, f, 880), lh = 68, base = lerp(1380, 900, phoneUp) - (lines.length - 1) * lh;
  ctx.save(); ctx.globalAlpha = a; ctx.font = f; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  lines.forEach((ln, i) => { const y = base + i * lh; ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.strokeText(ln, W / 2, y); ctx.fillStyle = COL[who]; ctx.fillText(ln, W / 2, y); });
  ctx.restore();
}
function vignette(ctx, a) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(10,5,15,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

// ------------------------------------------------------------------ sound (no music): every accent comes from the same schedule as the picture
const HITS = [];
for (let i = 0; i < 20; i++) { let lo = 0, hi = WALK_END; const target = (i + 0.5) * 0.72; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; if (walked(m) < target) lo = m; else hi = m; } if (lo < WALK_END - 0.35) HITS.push([lo, 'passo', 'tok', { pitch: i % 2 ? 'A2' : 'G2', gain: 0.2 }]); }
HITS.push([PHONE.notif + 0.12, 'vibra', 'sub', { len: 0.15, gain: 0.35 }], [PHONE.notif + 0.5, 'vibra 2', 'sub', { len: 0.15, gain: 0.35 }], [PHONE.notif, 'notificação', 'blip', { pitch: 'E6', gain: 0.15 }]);
HITS.push([PHONE.tap, 'toque tela', 'tick', { gain: 0.2 }], [PHONE.msg, 'mensagem', 'blip', { pitch: 'A6', gain: 0.18 }], [PHONE.lock, 'trava tela', 'click', { gain: 0.2 }]);
for (let i = 0; i < 7; i++) HITS.push([2.6 + i * 0.1, 'pombo', 'whoosh', { len: 0.25, from: 900, to: 2600, gain: 0.12, pan: (i % 2 ? 0.4 : -0.4) }]);
HITS.push([0.2, 'ônibus ao longe', 'whoosh', { len: 4.8, from: 90, to: 160, gain: 0.18 }], [5.0, 'ônibus freando', 'whoosh', { len: 3.6, from: 220, to: 120, gain: 0.25 }], [8.5, 'freio a ar', 'whoosh', { len: 0.9, from: 3000, to: 5000, gain: 0.22 }], [8.6, 'ônibus para', 'sub', { len: 0.8 }]);
HITS.push([8.6, 'chute lata', 'tok', { pitch: 'E5' }], [7.4, 'risada', 'boing', { pitch: 'C4', to: 'G4', gain: 0.06 }], [14.65, 'comemora', 'pop', { pitch: 'C5', to: 'G5', gain: 0.1 }]); for (let i = 0; i < 10; i++) HITS.push([8.75 + i * 0.13, 'lata rolando', 'tick', { gain: 0.12 }]);
for (let c = 0; c < 6; c++) { const ts = MATE.t0 + c * MATE.P + 0.8; if (ts < 20 && freeOf('bento', ts) > 0.5 && !(ts > 14.4 && ts < 15.8)) HITS.push([ts, 'chimarrão', 'boing', { pitch: 'G3', to: 'D5', gain: 0.16 }]); }
for (let c = 0; c < 7; c++) { const tb = PAO.t0 + c * PAO.P + 1.55; if (tb < 20 && freeOf('geraldim', tb) > 0.5 && !(tb > 14.4 && tb < 15.8)) { HITS.push([tb, 'mordida', 'click', { gain: 0.12 }]); for (let j = 1; j < 5; j++) HITS.push([tb + j * 0.38, 'mastiga', 'tick', { gain: 0.05 }]); } }
HITS.push([16.85, 'rangido baixinho', 'boing', { pitch: 'D3', to: 'B2', gain: 0.035 }]);

M.film({
  fonts: [font(100, 900, DISPLAY), font(40, 800, UI)],
  hits: HITS,
  samples: 2,
  init: async () => { window.CHECK = true; await init(); window.CHECK = false; },
  draw(ctx, u, t) {
    const cp = camPose(t), cam = S.cam;
    cam.position.set(...cp.pos); cam.rotation.order = 'YXZ'; cam.rotation.set(cp.pitch, cp.yaw, cp.roll);
    S.st.update(t);
    friends(t, cp);
    S.pov.update(t, cp);
    S.P.render(S.st.scene, cam, t, { k: 0.95 });
    ctx.drawImage(GL.R.domElement, 0, 0);
    vignette(ctx, 0.28);
    badge(ctx, t);
    subtitles(ctx, t);
  },
});
