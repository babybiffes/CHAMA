// Ônibus Errado – Parte 01, teste de 20 s. Pure function of time: window.seek(t) paints frame t.
// POV of Caio walking into a busy rodoviária at night; mocap-driven cast and extras; ink-line fisheye look.
import * as M from './lib/motion.js';
import * as GL from './lib/gl.js';
import { THREE } from './lib/gl.js';
import { loadModels, toon, paintTex } from './sets/rig.js';
import { stationSet } from './sets/station.js';
import { pipeline } from './sets/post.js';

const { W, H, E, prog, lerp, springU, SPRING, font, text, rrect, noise1, kf } = M;
const UI = 'UI', DISPLAY = 'Display';
const COL = { caio: '#FFFFFF', bento: '#7CFC9A', geraldim: '#FFD54A', rai: '#FF9A3C', red: '#E0262E', ink: '#121016' };

const SUBS = [
  [1.8, 5.0, 'caio', 'Ôrra, meu… o Bruno de novo? Mano, faz seis anos.'],
  [5.1, 8.4, 'rai', 'Oxe, bloqueia esse homem, véi. Ele ficou em Registro, deixa ele lá.'],
  [8.5, 11.8, 'geraldim', 'Uai, mas ês num deixou ele, ês esqueceu. É diferente.'],
  [11.9, 15.8, 'bento', 'Bah, foco, tchê! Plataforma nove. EUROPA. Seis anos juntando pila!'],
  [18.7, 20.0, 'caio', 'Plataforma… seis.'],
];
const subAt = (t) => SUBS.find((s) => t >= s[0] && t < s[1]);
const talkOf = (who, t) => {
  const s = subAt(t); if (!s || s[2] !== who) return 0;
  const k = Math.min(prog(t, s[0], s[0] + 0.12), 1 - prog(t, s[1] - 0.15, s[1]));
  return k * (0.25 + 0.75 * Math.abs(Math.sin(t * 12.5 + noise1(t * 3, 7) * 2)));
};

// camera walk: 0..7.2 s from z=11 to z=2.1, already walking at frame 0, easing to a stop
const WALK_END = 7.2;
function camPose(t) {
  // distance walked -> step phase (0.72 m per step); bob fades as he stops
  const p = Math.min(1, t / WALK_END);
  const zz = 11 - 8.9 * (p * (2 - p) * 0.5 + p * 0.5);       // moving, then decelerating to rest
  const dist = 11 - zz, steps = dist / 0.72, moving = 1 - E.inCubic(prog(t, WALK_END - 1.2, WALK_END));
  const bobY = 0.028 * Math.cos(steps * Math.PI * 2) * moving, bobX = 0.018 * Math.sin(steps * Math.PI) * moving;
  // where he looks: pigeons (down-left), friends, each speaker, then up at the sign
  const yaw = kf(t, [[0, 0.04], [2.2, 0.04], [2.8, 0.22], [3.8, 0.12], [5.0, 0.0], [5.4, 0.16], [8.3, 0.16], [8.8, -0.02], [11.7, -0.02], [12.2, -0.2], [15.6, -0.18], [16.3, -0.02], [20, -0.02]], E.inOutSine);
  const pitch = kf(t, [[0, -0.06], [2.2, -0.08], [2.8, -0.3], [3.8, -0.12], [5, -0.1], [15.6, -0.1], [16.6, 0.5], [20, 0.52]], E.inOutSine);
  const hand = 0.004 * noise1(t * 1.7, 3), handY = 0.004 * noise1(t * 1.3, 8);
  return { pos: [0.3 + bobX, 1.63 + bobY, zz], yaw: yaw + hand + bobX * 0.6, pitch: pitch + handY, roll: 0.012 * Math.sin(steps * Math.PI) * moving + 0.004 * noise1(t, 5), steps, moving };
}

let S = null;
function povRig(cam) {
  const rig = new THREE.Group(); cam.add(rig);
  const stripes = paintTex(64, 64, (c, w, h) => { c.fillStyle = '#F2F2F2'; c.fillRect(0, 0, w, h); c.fillStyle = '#151515'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 8, h); }, [3, 1]);
  const skin = toon(0xE8B48A);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 6, 14), toon(0xffffff, stripes)); arm.rotation.x = Math.PI / 2.3; arm.position.set(0.05, -0.07, 0.17); rig.add(arm);
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.14, 6, 14), skin); fore.rotation.x = Math.PI / 2.6; fore.position.set(0.03, -0.035, 0.07); rig.add(fore);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.052, 16, 12), skin); palm.scale.set(1.05, 0.8, 1.2); rig.add(palm);
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.01), toon(0x1B1B22)); phone.position.set(-0.015, 0.06, 0.02); phone.rotation.x = -0.3; rig.add(phone);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 512; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.145), new THREE.MeshBasicMaterial({ map: tex, fog: false })); screen.position.z = 0.0055; phone.add(screen);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.04, 4, 8), skin); f.position.set(-0.055, 0.02 + i * 0.03, 0.02); f.rotation.z = Math.PI / 2; rig.add(f); }
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.015, 0.045, 4, 8), skin); thumb.position.set(0.035, 0.05, 0.035); thumb.rotation.z = 0.6; rig.add(thumb);
  rig.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  return {
    update(t, cp) {
      const down = E.inOutCubic(prog(t, 15.4, 16.2));
      rig.position.set(0.16 + 0.008 * Math.sin(cp.steps * Math.PI), -0.2 - 0.012 * Math.abs(Math.cos(cp.steps * Math.PI)) * cp.moving - down * 0.3, -0.36);
      rig.rotation.set(0.28 + 0.03 * Math.sin(cp.steps * Math.PI * 2) * cp.moving, -0.22, 0.06);
      const c = cv.getContext('2d'); c.fillStyle = '#0D1F1A'; c.fillRect(0, 0, 256, 512);
      c.fillStyle = '#fff'; c.font = '800 34px UI'; c.textAlign = 'center'; c.fillText('Bruno', 128, 120);
      c.fillStyle = COL.red; c.font = '900 150px Display'; c.fillText('17', 128, 290);
      c.fillStyle = '#ccc'; c.font = '800 30px UI'; c.fillText('perdidas', 128, 340);
      c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(176, 18, 56, 26); c.fillStyle = COL.red; c.fillRect(180, 22, 7, 18);
      c.font = '800 24px UI'; c.textAlign = 'right'; c.fillText('3%', 166, 40);
      tex.needsUpdate = true;
    },
  };
}

async function init() {
  await GL.initGL({ exposure: 1.0 });
  await loadModels();
  const st = stationSet();
  const cam = GL.camera(100, 0.05, 120); st.scene.add(cam);
  S = { st, cam, pov: povRig(cam), P: pipeline(GL.R, W, H) };
}

// friends: body turns toward the camera, head toward whoever is talking (procedural look on top of mocap)
function friends(t, cp) {
  const { rai, ger, ben } = S.st;
  const spk = subAt(t)?.[2];
  const target = (who) => spk && spk !== who ? ({ rai: rai.root.position, geraldim: ger.root.position, bento: ben.root.position, caio: null })[spk] : null;
  const look = (ch, who) => {
    const p = ch.root.position, faceCam = Math.atan2(cp.pos[0] - p.x, cp.pos[2] - p.z);
    ch.root.rotation.y = faceCam * 0.85;
    const tg = target(who); let yaw = faceCam * 0.15, pitch = 0;
    if (tg) yaw = Math.atan2(tg.x - p.x, tg.z - p.z) - ch.root.rotation.y;
    if (t > 16.2 && who !== 'rai') { pitch = -0.45; yaw = 0; }        // they look up at the sign too
    return { yaw: Math.max(-1, Math.min(1, yaw)), pitch };
  };
  const blink = (o) => ((t + o) % 3.6 < 0.11 ? 1 : 0);
  { const l = look(rai, 'rai'); const tk = talkOf('rai', t);
    rai.pose({ t, offset: 2.0, w: { samba: 1 }, speed: { samba: 0.85 }, headYaw: l.yaw, headPitch: l.pitch, face: { talk: tk, blink: blink(0.4), smile: 1 } }); }
  { const l = look(ger, 'geraldim'); const tk = talkOf('geraldim', t);
    ger.pose({ t, offset: 0.9, w: tk ? { idle: 0.45, agree: 0.55 } : { idle: 1 }, headYaw: l.yaw, headPitch: l.pitch, face: { talk: tk, blink: blink(1.7), lookX: l.yaw, scared: t > 18.4 } }); }
  { const l = look(ben, 'bento'); const tk = talkOf('bento', t);
    ben.pose({ t, offset: 0.2, w: tk ? { idle: 0.4, agree: 0.6 } : { idle: 1 }, headYaw: l.yaw, headPitch: l.pitch, face: { talk: tk, blink: blink(2.6), angry: tk > 0, lookX: l.yaw, scared: t > 18.4 } }); }
}

// ------------------------------------------------------------------ 2-D overlays
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
  const f = font(56, 800, UI), lines = wrap(ctx, str, f, 880), lh = 68, base = 1380 - (lines.length - 1) * lh;
  ctx.save(); ctx.globalAlpha = a; ctx.font = f; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  lines.forEach((ln, i) => { const y = base + i * lh; ctx.lineWidth = 12; ctx.strokeStyle = '#000'; ctx.strokeText(ln, W / 2, y); ctx.fillStyle = COL[who]; ctx.fillText(ln, W / 2, y); });
  ctx.restore();
}
function msgCard(ctx, t) {
  const k = springU(t, 1.0, SPRING.gentle) * (1 - E.inBack(prog(t, 5.6, 6.0))); if (k <= 0.001) return;
  const y = lerp(-200, 380, k);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; rr(ctx, 70, y, W - 140, 150, 26, '#FFFFFF', 0); ctx.restore();
  rr(ctx, 70, y, W - 140, 150, 26, null, 5);
  ctx.beginPath(); ctx.arc(128, y + 75, 34, 0, Math.PI * 2); ctx.fillStyle = '#25D366'; ctx.fill();
  text(ctx, 'Bruno', 186, y + 62, font(40, 800, UI), '#0B6B3A'); text(ctx, '17 chamadas perdidas', 186, y + 112, font(40, 800, UI), COL.ink);
}
function vignette(ctx, a) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(10,5,15,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

// sound: every footstep, pigeons, bus, can, plate (no music)
const HITS = [[1.0, 'notificação', 'blip', { pitch: 'E6' }], [1.12, 'notificação 2', 'blip', { pitch: 'A6' }]];
{ let s = 0; for (let i = 0; i < 40; i++) { // footsteps on the real step times of the walk
  let lo = 0, hi = WALK_END; const target = (i + 0.5) * 0.72; for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2; const p = Math.min(1, m / WALK_END); const d = 8.9 * (p * (2 - p) * 0.5 + p * 0.5); if (d < target) lo = m; else hi = m; }
  if (lo < WALK_END - 0.3) HITS.push([lo, 'passo', 'tok', { pitch: i % 2 ? 'A2' : 'G2', gain: 0.22 }]); } }
for (let i = 0; i < 7; i++) HITS.push([2.6 + i * 0.1, 'pombo', 'whoosh', { len: 0.25, from: 900, to: 2600, gain: 0.12, pan: (i % 2 ? 0.4 : -0.4) }]);
HITS.push([4.0, 'ônibus chegando', 'whoosh', { len: 4.6, from: 120, to: 300, gain: 0.25 }], [8.55, 'freio a ar', 'whoosh', { len: 0.9, from: 3000, to: 5000, gain: 0.22 }], [8.6, 'ônibus para', 'sub', { len: 0.8 }]);
HITS.push([8.6, 'chute lata', 'tok', { pitch: 'E5' }]); for (let i = 0; i < 10; i++) HITS.push([8.75 + i * 0.13, 'lata rolando', 'tick', { gain: 0.12 }]);
HITS.push([16.4, 'rangido', 'boing', { pitch: 'D3', to: 'A2' }], [17.4, 'rangido 2', 'boing', { pitch: 'C3', to: 'G2', gain: 0.2 }], [18.2, 'placa gira', 'whoosh', { len: 0.4, from: 500, to: 2600 }], [18.6, 'placa vira 6', 'thud'], [18.65, 'peso', 'sub', { len: 1.0 }]);

M.film({
  fonts: [font(100, 900, DISPLAY), font(40, 800, UI)],
  hits: HITS,
  samples: 1,
  init,
  draw(ctx, u, t) {
    const cp = camPose(t), cam = S.cam;
    cam.position.set(...cp.pos); cam.rotation.order = 'YXZ'; cam.rotation.set(cp.pitch, cp.yaw, cp.roll);
    S.st.update(t);
    friends(t, cp);
    S.pov.update(t, cp);
    S.P.render(S.st.scene, cam, t, { k: 0.95 });
    ctx.drawImage(GL.R.domElement, 0, 0);
    vignette(ctx, 0.45);
    msgCard(ctx, t);
    badge(ctx, t);
    subtitles(ctx, t);
  },
});
