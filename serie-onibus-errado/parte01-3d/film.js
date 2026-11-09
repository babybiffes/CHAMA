// Ônibus Errado – Parte 01 "Plataforma 6" (3-D). Pure function of time: window.seek(t) paints frame t.
// 60 bpm grid, so u == t (seconds). Everything is Caio's POV through a fisheye lens.
import * as M from './lib/motion.js';
import * as GL from './lib/gl.js';
import { THREE } from './lib/gl.js';
import { stationSet, busInsideSet, dormSet, povRig, lens } from './sets/sets.js';

const { W, H, E, prog, lerp, springU, SPRING, font, text, fill, rrect, noise1, bump, kf } = M;
const UI = 'UI', DISPLAY = 'Display', HANGUL = 'Hangul';
const COL = { caio: '#FFFFFF', bento: '#7CFC9A', geraldim: '#FFD54A', rai: '#FF9A3C', kr: '#E6E6EE', red: '#E0262E', blue: '#2F6F8F', ink: '#121016' };

// ------------------------------------------------------------------ subtitles  [t0, t1, who, text]
const SUBS = [
  [1.3, 4.6, 'caio', '…Mano. Isso não é Portugal.'],
  [7.6, 10.6, 'caio', 'Ôrra, meu… o Bruno de novo? Mano, faz seis anos.'],
  [10.7, 14.0, 'rai', 'Oxe, bloqueia esse homem, véi. Ele ficou em Registro, deixa ele lá.'],
  [14.1, 17.4, 'geraldim', 'Uai, mas ês num deixou ele, ês esqueceu. É diferente.'],
  [17.5, 21.6, 'bento', 'Bah, foco, tchê! Plataforma nove. EUROPA. Seis anos juntando pila!'],
  [26.0, 28.8, 'caio', 'Plataforma… seis. Firmeza. É ali, mano.'],
  [30.0, 31.6, 'caio', 'MANO. TOMADA!'],
  [33.4, 36.0, 'geraldim', 'Uai… Europa vai de ônibus, é?'],
  [36.1, 39.8, 'caio', 'Até o aeroporto, meu! O link falou! Foi alguém do grupo que mandou.'],
  [39.9, 41.4, 'rai', 'Quem do grupo?'],
  [41.5, 43.8, 'caio', '…Sei lá, mano. Número desconhecido.'],
  [45.2, 48.2, 'rai', 'Ó paí ó… ninguém aqui pisca, véi.'],
  [48.3, 51.4, 'bento', 'É gringo, guri. Gringo é assim, quietinho.'],
  [55.6, 59.6, 'rai', 'Fiz três pedidos no Bonfim antes de vir. Não conto senão não vale.'],
  [61.2, 64.8, 'geraldim', 'Nó… que cheirim bão de… algodão-doce…'],
  [65.2, 68.8, 'caio', 'Vou só… carregar… o celul…'],
  [74.5, 77.2, 'kr', '일어나세요!'],
  [82.6, 85.8, 'caio', '…Mano. Isso não é Portugal.'],
];
const subAt = (t) => SUBS.find((s) => t >= s[0] && t < s[1]);
const talking = (who, t) => {
  const s = subAt(t);
  if (!s || s[2] !== who) return 0;
  const k = Math.min(prog(t, s[0], s[0] + 0.12), 1 - prog(t, s[1] - 0.15, s[1]));
  return k * (0.3 + 0.7 * Math.abs(Math.sin(t * 13.5 + noise1(t * 3, 7) * 2)));
};
const blinkAt = (t, o) => bump((t + o) % 3.9, 0.12, 0.1);

// ------------------------------------------------------------------ sound accents (same as the score plan)
const HITS = [
  [0.15, 'olho abre', 'sub', { len: 1.2 }],
  [5.0, 'rebobina', 'whoosh', { len: 1.3, from: 3200, to: 250 }],
  [6.5, 'estação', 'impact'],
  [7.0, 'notificação', 'blip', { pitch: 'E6' }],
  [7.12, 'notificação 2', 'blip', { pitch: 'A6' }],
  [22.6, 'rangido', 'boing', { pitch: 'D3', to: 'A2' }],
  [24.4, 'placa gira', 'whoosh', { len: 0.5, from: 500, to: 2600 }],
  [25.1, 'placa vira 6', 'thud'],
  [25.15, 'peso', 'sub', { len: 1.2 }],
  [29.0, 'ônibus', 'whoosh', { len: 0.5, from: 2600, to: 500 }],
  [30.0, 'TOMADA', 'pop', { pitch: 'C6', to: 'G6' }],
  [31.6, 'corre', 'whoosh', { len: 0.6, from: 400, to: 3000 }],
  [32.4, 'chega', 'thud'],
  [36.3, 'link', 'blip', { pitch: 'D6' }],
  [44.0, 'porta fecha', 'thud', { pitch: 'C2' }],
  [44.05, 'peso porta', 'sub', { len: 0.8 }],
  [51.55, 'SLURP', 'boing', { pitch: 'G3', to: 'D5' }],
  [52.2, 'janela', 'whoosh', { len: 0.5, from: 900, to: 2200 }],
  [55.2, 'volta', 'whoosh', { len: 0.5, from: 2200, to: 900 }],
  [57.2, 'beijo fitinha', 'tok', { pitch: 'A5' }],
  [60.6, 'gás', 'riser', { len: 2.4 }],
  [71.8, 'apaga', 'sub', { len: 1.5 }],
  [73.5, 'apito', 'bell', { pitch: 'E7' }],
  [73.62, 'apito 2', 'bell', { pitch: 'E7' }],
  [73.75, 'luz', 'impact'],
  [78.0, 'olha manga', 'tick'],
  [80.0, 'olha amigos', 'whoosh', { len: 0.5, from: 600, to: 2000 }],
  [86.0, 'enquete', 'impact'],
  [86.55, 'botão 1', 'pop', { pitch: 'A5' }],
  [86.85, 'botão 2', 'pop', { pitch: 'D6' }],
  [87.4, 'comenta', 'tick'],
];

// ------------------------------------------------------------------ 3-D state
let S = null;
function aim(cam, [x, y, z], yaw, pitch, roll = 0) {
  cam.position.set(x, y, z); cam.rotation.order = 'YXZ'; cam.rotation.set(pitch, yaw, roll);
}
const face = (obj, cx, cz) => { obj.rotation.y = Math.atan2(cx - obj.position.x, cz - obj.position.z); };
const yawTo = (cx, cz, x, z) => Math.atan2(-(x - cx), -(z - cz));

async function init() {
  await GL.initGL({ exposure: 1.05 });
  const mkCam = () => { const c = GL.camera(88, 0.05, 200); return c; };
  S = { lens: lens(GL.R, W, H) };
  S.st = stationSet(); S.st.cam = mkCam(); S.st.scene.add(S.st.cam); S.st.pov = povRig(S.st.cam);
  S.bi = busInsideSet(); S.bi.cam = mkCam(); S.bi.scene.add(S.bi.cam); S.bi.pov = povRig(S.bi.cam);
  S.dm = dormSet(); S.dm.cam = mkCam(); S.dm.scene.add(S.dm.cam); S.dm.pov = povRig(S.dm.cam);
}
function draw3D(ctx, set, k = 0.55) {
  S.lens.render(set.scene, set.cam, k);
  ctx.drawImage(GL.R.domElement, 0, 0);
}

// ------------------------------------------------------------------ phone screens
function scrMissed(c, w, h) {
  c.fillStyle = '#0D1F1A'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#fff'; c.font = '800 34px UI'; c.textAlign = 'center'; c.fillText('Bruno', w / 2, 120);
  c.fillStyle = COL.red; c.font = '900 150px Display'; c.fillText('17', w / 2, 290);
  c.fillStyle = '#ccc'; c.font = '800 30px UI'; c.fillText('perdidas', w / 2, 340);
  bat(c, w, false);
}
function scrLink(c, w, h) {
  c.fillStyle = '#0B1E16'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#9fe6c0'; c.font = '800 26px UI'; c.textAlign = 'center'; c.fillText('Desconhecido', w / 2, 110);
  c.fillStyle = '#1F3A30'; c.fillRect(16, 140, w - 32, 230);
  c.fillStyle = '#fff'; c.font = '900 50px Display'; c.fillText('EUROPA', w / 2, 220);
  c.fillStyle = '#FFD23F'; c.font = '900 46px Display'; c.fillText('R$ 499', w / 2, 290);
  c.fillStyle = '#ccc'; c.font = '800 32px UI'; c.fillText('em 12x', w / 2, 340);
  bat(c, w, false);
}
function scrCharging(c, w, h) {
  c.fillStyle = '#0D1F1A'; c.fillRect(0, 0, w, h);
  c.fillStyle = '#3DDC84'; c.beginPath(); const x = w / 2;
  [[x + 12, 170], [x - 50, 290], [x, 290], [x - 24, 390], [x + 56, 250], [x + 6, 250]].forEach(([a, b], i) => (i ? c.lineTo(a, b) : c.moveTo(a, b))); c.fill();
  c.fillStyle = '#9fe6c0'; c.font = '800 28px UI'; c.textAlign = 'center'; c.fillText('carregando', w / 2, 450);
  bat(c, w, true);
}
function bat(c, w, full) {
  c.strokeStyle = '#fff'; c.lineWidth = 4; c.strokeRect(w - 80, 18, 56, 26);
  c.fillStyle = full ? '#3DDC84' : COL.red; c.fillRect(w - 76, 22, full ? 48 : 7, 18);
  c.font = '800 24px UI'; c.textAlign = 'right'; c.fillText(full ? '100%' : '3%', w - 90, 40);
}

// ------------------------------------------------------------------ scenes
function sceneStation(ctx, t) {
  const st = S.st, cam = st.cam;
  // friends' marks: on the platform, then next to the green bus after the run
  const atBus = t > 32.4;
  const P0 = { rai: [-0.95, -1.0], ger: [0.0, -1.15], ben: [1.0, -0.95] };
  const P1 = { rai: [3.75, 2.55], ger: [4.0, 0.35], ben: [4.15, -0.95] };
  let pos = [0, 1.6, 1.2], yaw = 0, pitch = -0.05, roll = 0.01 * noise1(t * 0.5, 4);
  // who's talking -> camera drifts to them
  const fx = kf(t, [[6.5, 0], [10.7, 0], [11.2, -0.95], [14.0, -0.95], [14.5, 0], [17.4, 0], [18.0, 1.0], [21.4, 1.0], [22.0, 0.1]], E.inOutCubic);
  if (t < 22) { yaw = Math.atan2(-fx, 2.2); }
  else if (t < 28.9) { // tilt up to the sign, then back down
    const up = E.inOutCubic(prog(t, 22.0, 22.9)) * (1 - E.inOutCubic(prog(t, 27.6, 28.6)));
    pitch = lerp(-0.05, 0.4, up); yaw = 0.02 * Math.sin(t * 0.8); pos = [0, 1.6, lerp(1.2, 0.35, up)];
  } else { // whip right to the bus, run at 31.6
    const whip = E.inOutCubic(prog(t, 28.9, 29.4));
    const run = E.inOutCubic(prog(t, 31.6, 32.4));
    pos = [lerp(0, 2.9, run), 1.6 + 0.05 * Math.sin(t * 18) * bump(t, 32, 0.4), lerp(1.2, 1.0, run)];
    const fz = kf(t, [[32.4, 1.0], [33.4, 1.0], [33.9, 0.35], [36.0, 0.35], [36.5, 1.0], [39.8, 1.0], [40.2, 2.55], [41.4, 2.55], [41.9, 1.2]], E.inOutCubic);
    const target = t < 32.4 ? -1.25 : yawTo(pos[0], pos[2], 4.2, fz);
    yaw = lerp(0, target, whip);
    roll = 0.04 * Math.sin(t * 20) * bump(t, 32, 0.4);
  }
  pos[1] += 0.012 * Math.sin(t * 1.3);
  aim(cam, pos, yaw, pitch, roll);
  // friends
  for (const [key, ch, who] of [['rai', st.rai, 'rai'], ['ger', st.ger, 'geraldim'], ['ben', st.ben, 'bento']]) {
    const p = atBus ? P1[key] : P0[key];
    const pop = atBus ? springU(t, 32.5, SPRING.bouncy) : 1;
    ch.root.position.set(p[0], 0, p[1]); ch.root.scale.setScalar(Math.max(0.001, pop));
    face(ch.root, pos[0], pos[2]);
    const mood = who === 'rai' && t > 39.9 && t < 44 ? 'scared' : who === 'bento' && t > 17.5 && t < 21.6 ? 'angry' : 'ok';
    ch.pose({ talk: talking(who, t), blink: blinkAt(t, key.length * 0.9), look: 0.15 * Math.sin(t * 0.6 + key.length), mood,
      sway: Math.sin(t * 1.4 + key.length), armR: who === 'bento' ? 0.9 : 0.1, armL: who === 'geraldim' ? 0.7 : 0.05,
      nod: talking(who, t) * 0.05 * Math.sin(t * 7) });
  }
  st.suit.pose({ blink: blinkAt(t, 2.2), look: -0.3, armR: 1.3, armRout: 0.2 });
  // the plate: swings, then flips 180 degrees (9 -> 6)
  const swing = (t < 24.4 ? 0.08 * Math.sin(t * 3.1) + 0.3 * M.wobble(t - 22.6, 1.4, 1.2) : 0);
  st.platePivot.rotation.z = swing + E.outBack(prog(t, 24.4, 25.1), 1.6) * Math.PI;
  st.pov.update(t, { phone: t < 22 || t > 32.4, screen: t > 36.2 ? scrLink : scrMissed, rdy: t > 22 && t < 28.9 ? -0.1 : 0 });
  draw3D(ctx, st);
  vignette(ctx, 0.45);
  msgCard(ctx, t, 7.0, 13.0, 'Bruno', '17 chamadas perdidas');
  const whipStreak = bump(t, 29.15, 0.3) + bump(t, 32.0, 0.4);
  if (whipStreak > 0) { ctx.fillStyle = `rgba(255,255,255,${0.1 * whipStreak})`; for (let i = 0; i < 16; i++) ctx.fillRect(0, M.hash01(i, 300) * H, W, 4 + M.hash01(i, 2) * 10); }
}

function sceneInside(ctx, t, gas = 0) {
  const bi = S.bi, cam = bi.cam;
  const toWin = E.inOutCubic(prog(t, 52.0, 52.7)) * (1 - E.inOutCubic(prog(t, 55.0, 55.6)));
  const fx = kf(t, [[44, 0.5], [45.0, 1.3], [48.2, 1.3], [48.7, 0.25], [51.4, 0.25], [51.9, 0.5], [55.6, 1.3], [60, 1.3], [64, 0.7], [72, 0.8]], E.inOutCubic);
  const yaw = lerp(fx, -1.57, toWin) + (gas ? 0.12 * Math.sin((t - 60) * 0.35) : 0);
  const pos = [0.8, 1.22 - 0.12 * prog(t, 64, 71), 0.9];
  for (const c of [bi.rai, bi.ben, bi.ger]) face(c.root, pos[0], pos[2]);
  aim(cam, pos, yaw, -0.12 - 0.15 * prog(t, 66, 71) + 0.03 * Math.sin(t * 1.6), (gas ? 0.05 * Math.sin((t - 60) * 0.6) * prog(t, 63, 72) : 0.01 * Math.sin(t * 0.9)) + 0.004 * noise1(t * 4, 3));
  const sleepy = gas ? prog(t, 62, 66) : 0;
  const fit = E.inOutCubic(prog(t, 56.6, 57.2)) * (1 - E.inOutCubic(prog(t, 58.4, 59.0)));
  bi.rai.pose({ sit: true, talk: talking('rai', t), blink: Math.max(blinkAt(t, 0.4), Math.min(1, sleepy * 1.2)), look: 0.2, mood: sleepy > 0 ? 'sleepy' : t < 48.3 ? 'scared' : 'ok', armR: 0.3 + fit * 2.2, armRout: fit * -0.5, nod: sleepy * 0.25 });
  const slurp = bump(t, 51.6, 0.5);
  bi.ben.pose({ sit: false, talk: talking('bento', t), blink: Math.max(blinkAt(t, 2.2), Math.min(1, sleepy * 1.3)), look: 0.1, mood: sleepy > 0 ? 'sleepy' : 'ok', armR: 1.2 + slurp * 0.9, nod: sleepy * 0.3 });
  bi.ger.pose({ sit: false, talk: talking('geraldim', t) * (gas ? 0.6 : 1), blink: Math.max(blinkAt(t, 1.1), sleepy * 0.6), look: -0.2, mood: sleepy > 0 ? 'sleepy' : 'ok', armL: 0.6 });
  bi.refl.pose({ blink: bump(t, 54.0, 0.12), look: 0.2 });
  bi.outside.forEach((l, i) => { l.position.z = 6 - (((t * (7 + (i % 4) * 2)) + i * 1.7) % 14); });
  bi.pov.update(t, { phone: true, screen: t > 52 ? scrCharging : scrMissed, rdy: -0.04 - 0.35 * E.inCubic(prog(t, 66, 70)) });
  if (gas) { ctx.save(); ctx.filter = `blur(${lerp(0, 9, E.inCubic(prog(t, 63, 71)))}px)`; }
  draw3D(ctx, bi);
  if (gas) ctx.restore();
  if (gas) {
    const g = E.outCubic(prog(t, 60.4, 66)), tl = t - 60;
    for (let i = 0; i < 24; i++) {
      const sx = (M.hash01(i, 400) * 1.3 - 0.15) * W, sp = 0.5 + M.hash01(i, 401);
      const y = -100 + ((tl * 70 * sp + M.hash01(i, 402) * 600) % 1600), r = (160 + M.hash01(i, 403) * 240) * g;
      const gr = ctx.createRadialGradient(sx, y, 0, sx, y, Math.max(1, r));
      gr.addColorStop(0, `rgba(255,120,190,${0.3 * g})`); gr.addColorStop(1, 'rgba(255,120,190,0)');
      ctx.fillStyle = gr; ctx.fillRect(sx - r, y - r, 2 * r, 2 * r);
    }
    ctx.fillStyle = `rgba(255,140,200,${0.16 * g})`; ctx.fillRect(0, 0, W, H);
    vignette(ctx, 0.6 + 0.3 * prog(t, 64, 71));
    lids(ctx, Math.max(bump(t, 65.6, 0.45) * 0.7, bump(t, 67.6, 0.5) * 0.85, bump(t, 69.4, 0.5) * 0.92, E.inCubic(prog(t, 70.4, 71.8))));
  } else vignette(ctx, 0.5);
}

function sceneDorm(ctx, t, phase) {
  const dm = S.dm, cam = dm.cam;
  const tl = phase === 'cold' ? t : t - 74;
  const lookDown = phase === 'wake' ? E.inOutCubic(prog(t, 77.6, 78.3)) * (1 - E.inOutCubic(prog(t, 79.8, 80.4))) : 0;
  const lookFr = phase === 'wake' ? E.inOutCubic(prog(t, 80.0, 80.6)) : 0;
  const yaw = 0.18 + 0.08 * noise1(tl * 0.3, 2) - lookFr * 1.25;
  aim(cam, [0.2, 1.25 + 0.01 * Math.sin(tl * 1.1), 0.7], yaw, -0.05 - lookDown * 0.55 + 0.04 * E.outCubic(prog(tl, 0, 3)), 0.03 * noise1(tl * 0.4, 5));
  const fr = phase === 'wake';
  for (const c of [dm.rai, dm.ger, dm.ben]) c.root.visible = fr;
  if (fr) {
    const pop = (d) => Math.max(0.001, springU(t, 80.3 + d, SPRING.bouncy));
    dm.rai.root.scale.setScalar(pop(0)); dm.ben.root.scale.setScalar(pop(0.12)); dm.ger.root.scale.setScalar(pop(0.24));
    dm.rai.pose({ sit: true, mood: 'scared', look: 0.3, blink: blinkAt(t, 1) });
    dm.ben.pose({ sit: true, mood: 'scared', look: 0.5, blink: blinkAt(t, 2), armL: 0.4, armR: 0.4 });
    dm.ger.pose({ sit: true, mood: 'sleepy', look: 0.2 });
  }
  dm.pov.update(tl, { jump: true, left: true, ldy: phase === 'wake' ? lerp(-0.45, 0.02, lookDown) : -0.45, phone: false });
  draw3D(ctx, dm);
  vignette(ctx, 0.55);
  const open = phase === 'cold' ? kf(t, [[0, 1], [0.6, 0.55], [0.9, 0.75], [1.6, 0]], E.outCubic) : kf(t, [[73.9, 1], [74.4, 0.5], [74.7, 0.65], [75.4, 0]], E.outCubic);
  lids(ctx, open);
}

// ------------------------------------------------------------------ 2-D overlays
function vignette(ctx, a) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function lids(ctx, c) {
  if (c <= 0) return;
  const h = (H / 2 + 60) * c; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(-50, -50); ctx.lineTo(W + 50, -50); ctx.lineTo(W + 50, h - 120); ctx.quadraticCurveTo(W / 2, h + 120, -50, h - 120); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-50, H + 50); ctx.lineTo(W + 50, H + 50); ctx.lineTo(W + 50, H - h + 120); ctx.quadraticCurveTo(W / 2, H - h - 120, -50, H - h + 120); ctx.fill();
}
function rr(ctx, x, y, w, h, r, fillC, line = 6) {
  rrect(ctx, x, y, w, h, r);
  if (fillC) { ctx.fillStyle = fillC; ctx.fill(); }
  if (line) { ctx.lineWidth = line; ctx.strokeStyle = COL.ink; ctx.stroke(); }
}
function badge(ctx, t, t0, t1) {
  const k = springU(t, t0, SPRING.bouncy) * (1 - E.inCubic(prog(t, t1 - 0.3, t1)));
  if (k <= 0) return;
  ctx.save(); ctx.translate(90, 270); ctx.scale(k, k);
  rr(ctx, 0, 0, 250, 74, 14, COL.red, 6);
  text(ctx, 'PARTE 01', 125, 52, font(44, 900, DISPLAY), '#fff', 'center');
  ctx.restore();
}
function wrapLines(ctx, str, f, maxW) {
  ctx.font = f; const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) { const s = cur ? cur + ' ' + w : w; if (ctx.measureText(s).width > maxW && cur) { lines.push(cur); cur = w; } else cur = s; }
  if (cur) lines.push(cur); return lines;
}
function subtitles(ctx, t) {
  const s = subAt(t); if (!s) return;
  const [t0, t1, who, str] = s;
  const a = Math.min(E.outCubic(prog(t, t0, t0 + 0.12)), 1 - prog(t, t1 - 0.1, t1));
  const kr = who === 'kr';
  const f = font(kr ? 80 : 58, 900, kr ? HANGUL : UI);
  const lines = wrapLines(ctx, str, f, 900);
  const lh = kr ? 92 : 70, base = 1400 - (lines.length - 1) * lh;
  ctx.save(); ctx.globalAlpha = a; ctx.font = f; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  lines.forEach((ln, i) => {
    const y = base + i * lh + (1 - a) * 10;
    ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = COL[who]; ctx.fillText(ln, W / 2, y);
  });
  ctx.restore();
}
function msgCard(ctx, t, t0, t1, name, body) {
  const k = springU(t, t0, SPRING.gentle) * (1 - E.inBack(prog(t, t1 - 0.35, t1)));
  if (k <= 0.001) return;
  const y = lerp(-200, 260, k);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; rr(ctx, 70, y, W - 140, 150, 26, '#FFFFFF', 0); ctx.restore();
  rr(ctx, 70, y, W - 140, 150, 26, null, 5);
  ctx.beginPath(); ctx.arc(128, y + 75, 34, 0, Math.PI * 2); ctx.fillStyle = '#25D366'; ctx.fill();
  text(ctx, name, 186, y + 62, font(40, 800, UI), '#0B6B3A');
  text(ctx, body, 186, y + 112, font(40, 800, UI), COL.ink);
}
function rewind(ctx, t) {
  sceneDorm(ctx, Math.max(0.1, 5 - (t - 5) * 3), 'cold');
  const g = prog(t, 5, 6.5);
  for (let i = 0; i < 18; i++) {
    const y = (M.hash01(i, 77) * H + t * 2400 * (i % 2 ? 1 : -1)) % H, h = 10 + M.hash01(i, 5) * 60;
    ctx.drawImage(ctx.canvas, 0, Math.max(0, y), W, h, (M.hash01(i, Math.floor(t * 30)) - 0.5) * 120, Math.max(0, y), W, h);
  }
  ctx.fillStyle = `rgba(0,0,0,${0.35 + 0.4 * g})`; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  const k = springU(t, 5.15, SPRING.bouncy);
  ctx.save(); ctx.translate(W / 2, 900); ctx.scale(k, k);
  ctx.fillStyle = '#fff'; for (const dx of [-40, 10]) { ctx.beginPath(); ctx.moveTo(dx + 30, -200); ctx.lineTo(dx - 20, -170); ctx.lineTo(dx + 30, -140); ctx.fill(); }
  ctx.font = font(110, 900, DISPLAY); ctx.textAlign = 'center'; ctx.lineWidth = 14; ctx.strokeStyle = '#000';
  for (const [s, y] of [['12 HORAS', 0], ['ANTES', 115]]) { ctx.strokeText(s, 0, y); ctx.fillStyle = '#fff'; ctx.fillText(s, 0, y); }
  ctx.restore();
}
function poll(ctx, t) {
  sceneDorm(ctx, 85.8, 'wake');
  ctx.fillStyle = `rgba(6,8,12,${0.72 * E.outCubic(prog(t, 86, 86.5))})`; ctx.fillRect(0, 0, W, H);
  const k0 = springU(t, 86.05, SPRING.bouncy);
  ctx.save(); ctx.translate(W / 2, 640); ctx.scale(k0, k0);
  for (const [ln, dy] of [['O QUE VOCÊ', 0], ['FARIA?', 120]]) {
    ctx.font = font(118, 900, DISPLAY); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    ctx.lineWidth = 16; ctx.strokeStyle = '#000'; ctx.strokeText(ln, 0, dy); ctx.fillStyle = '#fff'; ctx.fillText(ln, 0, dy);
  }
  ctx.restore();
  const btn = (t0, y, col, l1, l2, icon) => {
    const k = springU(t, t0, SPRING.bouncy); if (k <= 0) return;
    ctx.save(); ctx.translate(W / 2, y + 85); ctx.scale(k, k); ctx.translate(-W / 2, -(y + 85));
    rr(ctx, 110, y, W - 220, 170, 24, col, 7); icon(ctx, 200, y + 85);
    text(ctx, l1, 280, y + 72, font(54, 900, DISPLAY), '#fff'); text(ctx, l2, 280, y + 134, font(54, 900, DISPLAY), '#fff');
    ctx.restore();
  };
  btn(86.55, 860, COL.red, 'PERGUNTAR ONDE', 'FICA A EUROPA', (c, x, y) => { c.beginPath(); c.arc(x, y, 44, 0, 7); c.fillStyle = '#fff'; c.fill(); text(c, '?', x, y + 26, font(74, 900, DISPLAY), COL.red, 'center'); });
  btn(86.85, 1070, COL.blue, 'FICAR QUIETO', 'E OBSERVAR', (c, x, y) => { c.beginPath(); c.ellipse(x, y, 46, 30, 0, 0, 7); c.fillStyle = '#fff'; c.fill(); c.beginPath(); c.arc(x, y, 18, 0, 7); c.fillStyle = COL.ink; c.fill(); });
  const ck = E.outCubic(prog(t, 87.4, 87.8));
  if (ck > 0) {
    ctx.save(); ctx.globalAlpha = ck; const yy = 1330 + 6 * Math.sin(t * 4);
    text(ctx, 'Comenta aqui', W / 2 - 30, yy, font(58, 800, UI), '#FFD23F', 'center');
    ctx.beginPath(); [[W / 2 + 200, yy - 40], [W / 2 + 240, yy - 40], [W / 2 + 240, yy - 5], [W / 2 + 262, yy - 5], [W / 2 + 220, yy + 30], [W / 2 + 178, yy - 5], [W / 2 + 200, yy - 5]].forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.closePath(); ctx.fillStyle = '#FFD23F'; ctx.fill(); ctx.restore();
  }
}

// ------------------------------------------------------------------ film
M.film({
  fonts: [font(100, 900, DISPLAY), font(40, 800, UI), font(60, 900, HANGUL)],
  hits: HITS,
  samples: (t) => ((t > 28.9 && t < 29.5) || (t > 31.5 && t < 32.6) || (t > 24.3 && t < 25.3) ? 3 : 1),
  init,
  draw(ctx, u, t) {
    if (t < 5) sceneDorm(ctx, t, 'cold');
    else if (t < 6.5) rewind(ctx, t);
    else if (t < 44) sceneStation(ctx, t);
    else if (t < 60) sceneInside(ctx, t, 0);
    else if (t < 72) sceneInside(ctx, t, 1);
    else if (t < 74) { fill(ctx, '#000'); const f = bump(t, 73.95, 0.25); if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); } }
    else if (t < 86) sceneDorm(ctx, t, 'wake');
    else poll(ctx, t);
    badge(ctx, t, 0.25, 5.0);
    subtitles(ctx, t);
  },
  post(ctx, u, t) {
    const seed = Math.floor(t * 60); ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 220; i++) ctx.fillRect(M.hash01(i, seed) * W, M.hash01(i + 999, seed) * H, 2, 2);
  },
});
