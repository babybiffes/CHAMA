// Ônibus Errado – Parte 01, teste de 20 s (v3): the staging, rhythm, camera language and night mood of the
// reference "PARTE 04" (back of a warehouse, glance at the street, follow the friends through DOCA 2), with our cast.
import * as M from './lib/motion.js';
import * as GL from './lib/gl.js';
import { THREE } from './lib/gl.js';
import { loadModels, cast } from './sets/rig.js';
import { dockSet } from './sets/dock.js';
import { pipeline } from './sets/post.js';

const { W, H, E, prog, lerp, springU, SPRING, font, text, rrect, noise1, kf } = M;
const UI = 'UI', DISPLAY = 'Display';
const COL = { caio: '#FFFFFF', bento: '#7CFC9A', geraldim: '#FFD54A', rai: '#FF9A3C', red: '#C8262E', ink: '#121016' };
const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const env = (t, a, b, e = 0.35) => smooth(a, a + e, t) * (1 - smooth(b - e, b, t));

const SUBS = [
  [0.4, 3.9, 'bento', 'Bah, a entrada da rodoviária é pelos fundos, tchê. Eu sei o caminho.'],
  [5.7, 8.9, 'geraldim', 'Uai, sô… cês viram aquela fumaça? Esse trem tá esquisito demais.'],
  [9.1, 11.9, 'rai', 'Oxe, relaxe, véi! O ônibus sai dez e quarenta. Bora!'],
  [15.0, 17.3, 'caio', 'Mano… isso aqui não tem cara de rodoviária.'],
  [18.4, 20.0, 'bento', 'Vem, guris! É logo ali.'],
];
const subAt = (t) => SUBS.find((s) => t >= s[0] && t < s[1]);
const talkOf = (who, t) => { const s = subAt(t); if (!s || s[2] !== who) return 0; const k = Math.min(prog(t, s[0], s[0] + 0.12), 1 - prog(t, s[1] - 0.15, s[1])); return k * (0.25 + 0.75 * Math.abs(Math.sin(t * 12.5 + noise1(t * 3, 7) * 2))); };
const freeOf = (who, t) => { let g = 1; for (const [a, b, w] of SUBS) if (w === who) g = Math.min(g, 1 - smooth(a - 0.6, a - 0.05, t) * (1 - smooth(b + 0.1, b + 0.6, t))); return g; };
const talkW = (who, t) => 1 - freeOf(who, t);

// ------------------------------------------------------------------ paths (walked with speed easing; walk clip weighted by speed)
function path(pts) { const seg = []; let L = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; } return { pts, seg, L }; }
function at(P, s) { s = Math.max(0, Math.min(P.L, s)); for (let i = 0; i < P.seg.length; i++) { if (s <= P.seg[i] || i === P.seg.length - 1) { const k = P.seg[i] ? s / P.seg[i] : 0, a = P.pts[i], b = P.pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; } s -= P.seg[i]; } return P.pts[P.pts.length - 1]; }
function walker(P, t0, v, t) {   // distance with 0.5 s acceleration and braking into the end point
  const T = P.L / v + 0.5; const tt = Math.max(0, Math.min(T, t - t0));
  let s; if (tt < 0.5) s = v * tt * tt; else if (tt > T - 0.5) { const r = T - tt; s = P.L - v * r * r; } else s = v * (tt - 0.25);
  s = Math.max(0, Math.min(P.L, s));
  const [x, z] = at(P, s), [x1, z1] = at(P, s + 0.4), [x0, z0] = at(P, s - 0.4);
  const speed = (tt <= 0 || tt >= T) ? 0 : tt < 0.5 ? 2 * v * tt : tt > T - 0.5 ? 2 * v * (T - tt) : v;
  return { x, z, yaw: Math.atan2(x1 - x0, z1 - z0), speed, done: tt >= T, moving: tt > 0 && tt < T };
}
const ROUTE = {
  bento: { P: path([[0.8, 3.5], [2.9, 0.7], [3.15, -1.4], [3.15, -3.2], [3.8, -5.6]]), t0: 12.2, v: 1.2 },
  rai: { P: path([[-0.6, 3.55], [1.9, 1.3], [3.35, -0.5], [3.35, -2.9], [2.4, -5.4]]), t0: 12.75, v: 1.25 },
  geraldim: { P: path([[0.0, 3.3], [2.45, 1.0], [3.0, -1.2], [3.05, -3.1], [4.6, -4.8]]), t0: 13.35, v: 1.15 },
};
const CAMP = path([[0.05, 5.15], [0.4, 4.7], [2.55, 1.7], [3.2, -0.6], [3.2, -2.6]]);
function camPose(t) {
  const w = walker(CAMP, 13.6, 1.15, t);
  const dist = 13.6 < t ? Math.min(CAMP.L, Math.max(0, (t - 13.6) * 1.15)) : 0;
  const steps = dist / 0.7, moving = w.speed / 1.15;
  const bobY = 0.024 * Math.cos(steps * Math.PI * 2) * moving, bobX = 0.014 * Math.sin(steps * Math.PI) * moving;
  // looks: speaker drift; the glance left at the street (2.6–5.5); then the friends walking to the door; then the path ahead
  const walkYaw = w.yaw + Math.PI;            // camera looks along -z when yaw = 0 ; path tangent points where we go
  const pre = kf(t, [[0, -0.03], [2.5, -0.05], [3.25, 1.12], [4.8, 1.18], [5.5, 0.02], [8.9, 0.02], [9.4, 0.22], [11.9, 0.2], [12.4, -0.15], [13.1, -0.32]], E.inOutSine);
  const k = smooth(13.3, 14.4, t);
  const yaw = lerp(pre, Math.atan2(-Math.sin(walkYaw), -Math.cos(walkYaw)) * 0 + (-w.yaw + Math.PI) * 0 + Math.atan2(-(at(CAMP, dist + 1.5)[0] - w.x), -(at(CAMP, dist + 1.5)[1] - w.z)), k);
  const pitch = kf(t, [[0, -0.06], [2.6, -0.06], [3.3, 0.02], [5.4, -0.06], [13, -0.08], [17.6, -0.08], [18.4, -0.02], [20, -0.04]], E.inOutSine);
  return { pos: [w.x + bobX, 1.5 + bobY + 0.006 * Math.sin(t * 1.3), w.z], yaw: yaw + 0.006 * noise1(t * 0.9, 3), pitch: pitch + 0.005 * noise1(t * 1.2, 7), roll: 0.01 * Math.sin(steps * Math.PI) * moving + 0.004 * noise1(t * 0.7, 5), steps, moving };
}

// ------------------------------------------------------------------ cast behaviour
let S = null;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z), UP = V3(0, 1, 0);
const fwdOf = (ry) => V3(Math.sin(ry), 0, Math.cos(ry)), rightOf = (ry) => V3(-Math.cos(ry), 0, Math.sin(ry));
const L = (o, R, U, F, r, u, f) => o.clone().add(R.clone().multiplyScalar(r)).add(U.clone().multiplyScalar(u)).add(F.clone().multiplyScalar(f));
const MATE = { P: 4.6, t0: 0.2 }, PAO = { P: 3.4, t0: 0.5 };
const mateArm = (t) => { const k = ((t - MATE.t0) % MATE.P + MATE.P) % MATE.P; return smooth(0, 0.7, k) * (1 - smooth(2.1, 2.8, k)); };
const paoPhase = (t) => ((t - PAO.t0) % PAO.P + PAO.P) % PAO.P;

function friends(t, cp) {
  const { rai, ger, ben } = S;
  const who = { rai, geraldim: ger, bento: ben };
  const st = {};
  for (const [name, ch] of Object.entries(who)) {
    const R0 = ROUTE[name], w = walker(R0.P, R0.t0, R0.v, t); st[name] = w;
    ch.root.position.set(w.x, 0, w.z);
    const toCam = Math.atan2(cp.pos[0] - w.x, cp.pos[2] - w.z);
    // standing: face Caio (a bit toward whoever talks); walking: face the way; after arriving: turn back to Caio
    const spk = subAt(t)?.[2]; let face = toCam;
    if (!w.moving && !w.done && spk && spk !== name && who[spk]) { const q = who[spk].root.position; face = toCam + Math.atan2(Math.sin(Math.atan2(q.x - w.x, q.z - w.z) - toCam), Math.cos(Math.atan2(q.x - w.x, q.z - w.z) - toCam)) * 0.18; }
    const turnWalk = smooth(R0.t0 - 0.35, R0.t0 + 0.25, t), turnBack = w.done ? smooth(0, 0.9, t - (R0.t0 + R0.P.L / R0.v + 0.5)) : 0;
    const a1 = face + Math.atan2(Math.sin(w.yaw - face), Math.cos(w.yaw - face)) * turnWalk;
    ch.root.rotation.y = a1 + Math.atan2(Math.sin(toCam - a1), Math.cos(toCam - a1)) * turnBack;
    st[name].walkW = Math.min(1, w.speed / R0.v);
  }
  const gazeAt = (name, ch) => { const spk = subAt(t)?.[2], p = ch.root.position; let g = Math.atan2(cp.pos[0] - p.x, cp.pos[2] - p.z); if (spk && spk !== name && who[spk]) { const q = who[spk].root.position; g = Math.atan2(q.x - p.x, q.z - p.z); } const a = g - ch.root.rotation.y; return Math.max(-0.7, Math.min(0.7, Math.atan2(Math.sin(a), Math.cos(a)))) * (1 - st[name].walkW); };
  const blink = (o) => ((t + o) % 3.6 < 0.11 ? 1 : 0);
  const frame = (ch) => { const ry = ch.root.rotation.y; return { F: fwdOf(ry), R: rightOf(ry), U: UP }; };
  const pole = (R, F, s) => UP.clone().multiplyScalar(-1).add(R.clone().multiplyScalar(0.7 * s)).add(F.clone().multiplyScalar(-0.2));

  // BENTO: chimarrão; thumbs back toward the door ("pelos fundos"); leads the way; calls them in from inside
  { const w = st.bento, tw = talkW('bento', t), free = freeOf('bento', t) * (1 - w.walkW) * (w.done ? 0 : 1);
    const thumb = env(t, 1.6, 3.2), call = env(t, 18.5, 20.3);
    const base = { t, offset: 0.2, w: { idle: Math.max(0, 1 - 0.45 * tw - w.walkW), agree: 0.45 * tw * (1 - w.walkW), walk: w.walkW }, speed: { walk: ROUTE.bento.v / 1.2 } };
    ben.pose(base);
    const { F, R, U } = frame(ben), head = ben.anchor('Head'), chest = ben.anchor('Spine2'), arm = mateArm(t) * free;
    const rT = L(chest, R, U, F, 0.13, -0.2, 0.19).lerp(head.clone().add(F.clone().multiplyScalar(0.2)).add(U.clone().multiplyScalar(-0.05)), arm);
    let lT = L(chest, R, U, F, -0.22, -0.38, 0.05), lW = 0;
    if (thumb > 0) { lT = lT.lerp(L(chest, R, U, F, -0.42, 0.18, -0.12), thumb); lW = thumb; }
    if (call > 0) { lT = lT.lerp(L(chest, R, U, F, -0.2, 0.25 + 0.06 * Math.sin(t * 9), 0.38), call); lW = Math.max(lW, call); }
    ben.pose({ ...base, headYaw: gazeAt('bento', ben) * (1 - arm * 0.6) + thumb * 0.5, headPitch: arm * 0.12,
      face: { talk: talkOf('bento', t), blink: blink(2.6), smile: 0.4 + call * 0.4 },
      ik: [{ side: 'Right', target: rT, pole: pole(R, F, 1), w: 1 - w.walkW * 0.5 }, { side: 'Left', target: lT, pole: pole(R, F, -1), w: lW }] });
  }
  // GERALDIM: pão de queijo; stops to look and point at the smoke over the street
  { const w = st.geraldim, tw = talkW('geraldim', t), free = freeOf('geraldim', t) * (1 - w.walkW) * (w.done ? 0 : 1);
    const pointSmoke = env(t, 6.2, 7.9), k = paoPhase(t);
    const base = { t, offset: 0.9, w: { idle: Math.max(0, 1 - 0.45 * tw - w.walkW), agree: 0.45 * tw * (1 - w.walkW), walk: w.walkW }, speed: { walk: ROUTE.geraldim.v / 1.2 } };
    ger.pose(base);
    const { F, R, U } = frame(ger), head = ger.anchor('Head'), belly = ger.anchor('Spine1'), chest = ger.anchor('Spine2');
    const bagPos = L(belly, R, U, F, -0.08, -0.1, 0.22), rest = L(belly, R, U, F, 0.14, -0.2, 0.18), atBag = bagPos.clone().add(U.clone().multiplyScalar(0.12));
    const mouth = head.clone().add(F.clone().multiplyScalar(0.19)).add(U.clone().multiplyScalar(0.02));
    let tgt = rest.clone();
    if (k < 0.55) tgt = rest.clone().lerp(atBag, smooth(0, 0.55, k)); else if (k < 0.8) tgt = atBag.clone(); else if (k < 1.35) tgt = atBag.clone().lerp(mouth, smooth(0.8, 1.35, k)); else if (k < 1.75) tgt = mouth.clone(); else if (k < 2.3) tgt = mouth.clone().lerp(rest, smooth(1.75, 2.3, k));
    tgt = rest.clone().lerp(tgt, free).lerp(L(chest, R, U, F, 0.5, 0.32, 0.25), pointSmoke);
    const chew = free * (k > 1.55 ? Math.max(0, Math.sin((k - 1.55) * 2 * Math.PI * 2.6)) * (1 - smooth(3.0, 3.4, k)) : 0);
    ger.pose({ ...base, headYaw: gazeAt('geraldim', ger) * (1 - pointSmoke) - pointSmoke * 0.9, headPitch: pointSmoke * -0.12,
      face: { talk: talkOf('geraldim', t), blink: blink(1.7), chew, scared: pointSmoke > 0.5 }, held: free > 0.5 && k > 0.7 && k < 1.55,
      ik: [{ side: 'Right', target: tgt, pole: pole(R, F, 1), w: 1 - w.walkW * 0.6 }, { side: 'Left', target: bagPos, pole: pole(R, F, -1), w: 0.85 - w.walkW * 0.4 }] });
  }
  // RAI: restless (weight shifts, small dance steps), taps his wrist "dez e quarenta", waves "bora!" toward the door
  { const w = st.rai, tw = talkW('rai', t), wrist = env(t, 9.6, 10.7), bora = env(t, 10.8, 11.9), laugh = env(t, 0.6, 1.4);
    const base = { t, offset: 1.6, w: { idle: Math.max(0, 1 - 0.45 * tw - w.walkW), agree: 0.45 * tw * (1 - w.walkW), walk: w.walkW }, speed: { walk: ROUTE.rai.v / 1.2 } };
    rai.pose(base);
    const { F, R, U } = frame(rai), chest = rai.anchor('Spine2'), ik = [];
    if (wrist > 0) { ik.push({ side: 'Left', target: L(chest, R, U, F, -0.06, 0.02, 0.32), pole: pole(R, F, -1), w: wrist }); ik.push({ side: 'Right', target: L(chest, R, U, F, -0.02, 0.06, 0.34), pole: pole(R, F, 1), w: wrist }); }
    if (bora > 0) ik.push({ side: 'Right', target: L(chest, R, U, F, 0.45 - 0.25 * Math.sin(t * 8) ** 2, 0.25, 0.25), pole: pole(R, F, 1), w: bora });
    rai.pose({ ...base, headYaw: gazeAt('rai', rai) + 0.12 * Math.sin(t * 1.7) * (1 - w.walkW), headPitch: -laugh * 0.15,
      face: { talk: Math.max(talkOf('rai', t), laugh * 0.5), blink: blink(0.4), smile: 0.8 }, ik });
    if (!w.moving && !w.done) rai.root.position.x += 0.03 * Math.sin(t * 2.2);   // restless sway
  }
}

// ------------------------------------------------------------------ overlays (badge + subtitles, sized like the reference)
function rr(ctx, x, y, w, h, r, f, line = 5) { rrect(ctx, x, y, w, h, r); if (f) { ctx.fillStyle = f; ctx.fill(); } if (line) { ctx.lineWidth = line; ctx.strokeStyle = COL.ink; ctx.stroke(); } }
function badge(ctx, t) {
  const k = Math.min(1, springU(t, 0.15, SPRING.gentle)) * (1 - E.inCubic(prog(t, 3.3, 3.7))); if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; ctx.translate(110, 96); rr(ctx, 0, 0, 230, 66, 12, COL.red, 4);
  text(ctx, 'PARTE 01', 115, 46, font(40, 900, DISPLAY), '#fff', 'center'); ctx.restore();
}
function wrapL(ctx, str, f, maxW) { ctx.font = f; const ws = str.split(' '), out = []; let cur = ''; for (const w of ws) { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > maxW && cur) { out.push(cur); cur = w; } else cur = s; } if (cur) out.push(cur); return out; }
function subtitles(ctx, t) {
  const s = subAt(t); if (!s) return; const [t0, t1, who, str] = s;
  const a = Math.min(E.outCubic(prog(t, t0, t0 + 0.12)), 1 - prog(t, t1 - 0.1, t1));
  const f = font(46, 800, UI), lines = wrapL(ctx, str, f, 760), lh = 56, base = 1150 - (lines.length - 1) * lh / 2;
  ctx.save(); ctx.globalAlpha = a; ctx.font = f; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  lines.forEach((ln, i) => { const y = base + i * lh; ctx.lineWidth = 9; ctx.strokeStyle = '#000'; ctx.strokeText(ln, W / 2, y); ctx.fillStyle = COL[who]; ctx.fillText(ln, W / 2, y); });
  ctx.restore();
}

// ------------------------------------------------------------------ sound (no music): steps, distant sirens, fire, door
const HITS = [];
{ let last = -1; for (let t = 13.6; t < 20; t += 0.01) { const d = Math.max(0, (t - 13.6) * 1.15); const n = Math.floor(d / 0.7); if (n !== last) { last = n; HITS.push([t, 'passo', 'tok', { pitch: n % 2 ? 'A2' : 'G2', gain: 0.18 }]); } } }
for (const [name, R0] of Object.entries(ROUTE)) for (let i = 0; i < 9; i++) { const tt = R0.t0 + 0.4 + i * 0.6; if (tt < R0.t0 + R0.P.L / R0.v) HITS.push([tt, 'passo ' + name, 'tok', { pitch: 'C3', gain: 0.07, pan: 0.2 }]); }
HITS.push([2.7, 'sirene longe', 'whoosh', { len: 3.2, from: 700, to: 950, gain: 0.07, pan: -0.6 }], [3.3, 'grito longe', 'whoosh', { len: 0.6, from: 1200, to: 1600, gain: 0.05, pan: -0.7 }]);
for (let i = 0; i < 24; i++) HITS.push([0.5 + i * 0.8 + (i % 3) * 0.13, 'fogo', 'tick', { gain: 0.03, pan: -0.6 }]);
for (let c = 0; c < 4; c++) { const ts = MATE.t0 + c * MATE.P + 0.8; if (ts < 12 && freeOf('bento', ts) > 0.5) HITS.push([ts, 'chimarrão', 'boing', { pitch: 'G3', to: 'D5', gain: 0.12 }]); }
for (let c = 0; c < 4; c++) { const tb = PAO.t0 + c * PAO.P + 1.55; if (tb < 12 && freeOf('geraldim', tb) > 0.5) HITS.push([tb, 'mordida', 'click', { gain: 0.1 }]); }
HITS.push([17.7, 'porta', 'boing', { pitch: 'E2', to: 'C2', gain: 0.12 }], [18.2, 'dentro', 'sub', { len: 0.8, gain: 0.3 }]);

M.film({
  fonts: [font(100, 900, DISPLAY), font(40, 800, UI)],
  hits: HITS,
  samples: 2,
  async init() {
    await GL.initGL({ exposure: 1.0 });
    await loadModels();
    const set = dockSet();
    const cam = GL.camera(100, 0.05, 140); set.scene.add(cam);
    const rai = cast('rai', { xbot: true }), ger = cast('geraldim'), ben = cast('bento');
    for (const c of [rai, ger, ben]) set.scene.add(c.root);
    S = { set, cam, rai, ger, ben, P: pipeline(GL.R, W, H) };
  },
  draw(ctx, u, t) {
    const cp = camPose(t), cam = S.cam;
    cam.position.set(...cp.pos); cam.rotation.order = 'YXZ'; cam.rotation.set(cp.pitch, cp.yaw, cp.roll);
    S.set.update(t);
    friends(t, cp);
    S.P.render(S.set.scene, cam, t, { k: 1.0 });
    ctx.drawImage(GL.R.domElement, 0, 0);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(8,6,16,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    badge(ctx, t);
    subtitles(ctx, t);
  },
});
