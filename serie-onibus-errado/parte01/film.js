// Ônibus Errado – Parte 01 "Plataforma 6". Pure function of time: window.seek(t) paints frame t.
// Grid is 60 bpm, so u (beats) == t (seconds). POV: everything is seen through Caio's eyes.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, springU, SPRING, wobble, font, text, fill, rrect, noise1, bump, kf } = M;

const UI = 'UI', DISPLAY = 'Display', HANGUL = 'Hangul';
const C = {
  ink: '#121016', white: '#FFFFFF',
  caio: '#FFFFFF', bento: '#7CFC9A', geraldim: '#FFD54A', rai: '#FF9A3C', kr: '#E6E6EE',
  red: '#E0262E', blue: '#2F6F8F',
  skinCaio: '#E8B48A', skinBento: '#EDBB91', skinGer: '#D69A62', skinRai: '#6B3E26',
  jump: '#2E8B6A', jumpDark: '#1F6A50',
};

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
  return k * (0.35 + 0.65 * Math.abs(Math.sin(t * 13.5 + noise1(t * 3, 7) * 2)));
};

// ------------------------------------------------------------------ sound accents
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

// ------------------------------------------------------------------ camera + fisheye
// World coords are screen coords before the lens. cam = {x, y, z} pans/zooms the world;
// V() maps a world point through the camera and a barrel lens, like the reference's fisheye.
let CAM = { x: 0, y: 0, z: 1, roll: 0 };
const K = 0.20, R0 = Math.hypot(W / 2, H / 2);
function V(x, y) {
  let dx = (x - W / 2 - CAM.x) * CAM.z, dy = (y - H / 2 - CAM.y) * CAM.z;
  const c = Math.cos(CAM.roll), s = Math.sin(CAM.roll);
  [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
  const r = Math.hypot(dx, dy) / R0, f = 1 / (1 + K * r * r);
  return [W / 2 + dx * f, H / 2 + dy * f];
}
const lensScale = (x, y) => { const a = V(x, y), b = V(x + 1, y); return Math.hypot(b[0] - a[0], b[1] - a[1]); };
function poly(ctx, pts, close = true, seg = 14) {
  ctx.beginPath();
  const n = pts.length, m = close ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    for (let k = 0; k < seg; k++) {
      const p = V(lerp(x0, x1, k / seg), lerp(y0, y1, k / seg));
      if (i === 0 && k === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
  }
  if (!close) { const p = V(...pts[n - 1]); ctx.lineTo(p[0], p[1]); } else ctx.closePath();
}
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
function shape(ctx, pts, fillC, line = 6, stroke = C.ink) {
  poly(ctx, pts);
  if (fillC) { ctx.fillStyle = fillC; ctx.fill(); }
  if (line) { ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function lineW(ctx, pts, w, color) { poly(ctx, pts, false); ctx.lineWidth = w; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke(); }
// draw something in local units at world point (x, y) with lens-aware scale
function at(ctx, x, y, s, fn) {
  const [px, py] = V(x, y), k = lensScale(x, y);
  ctx.save(); ctx.translate(px, py); ctx.rotate(CAM.roll); ctx.scale(s * k, s * k); fn(ctx); ctx.restore();
}

// ------------------------------------------------------------------ drawing kit (local units)
const OL = 7;
function ell(ctx, x, y, rx, ry, fillC, line = OL, rot = 0) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fillC) { ctx.fillStyle = fillC; ctx.fill(); }
  if (line) { ctx.lineWidth = line; ctx.strokeStyle = C.ink; ctx.stroke(); }
}
function rr(ctx, x, y, w, h, r, fillC, line = OL) {
  rrect(ctx, x, y, w, h, r);
  if (fillC) { ctx.fillStyle = fillC; ctx.fill(); }
  if (line) { ctx.lineWidth = line; ctx.strokeStyle = C.ink; ctx.stroke(); }
}
function pth(ctx, pts, fillC, line = OL, close = true) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  if (close) ctx.closePath();
  if (fillC) { ctx.fillStyle = fillC; ctx.fill(); }
  if (line) { ctx.lineWidth = line; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke(); }
}
function star(ctx, x, y, r, fillC) {
  const pts = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; pts.push([x + Math.cos(a) * rr2, y + Math.sin(a) * rr2]); }
  pth(ctx, pts, fillC, 0);
}

// Face: eyes, brows, mouth. o = { look, blink, talk, mood: 'ok'|'scared'|'happy'|'sleepy' }
function face(ctx, o, skin) {
  const lx = (o.look || 0) * 9, by = o.mood === 'scared' ? -14 : 0;
  const lid = o.mood === 'sleepy' ? 0.55 : 0;
  for (const sx of [-1, 1]) {
    ell(ctx, sx * 38, -12, 30, 36, '#fff', 6);
    const bl = Math.max(o.blink || 0, lid);
    ell(ctx, sx * 38 + lx, -8, o.mood === 'scared' ? 9 : 13, o.mood === 'scared' ? 9 : 14, C.ink, 0);
    ell(ctx, sx * 38 + lx + 4, -13, 4, 4, '#fff', 0);
    if (bl > 0) { // eyelid from the top
      ctx.save(); ctx.beginPath(); ctx.ellipse(sx * 38, -12, 30, 36, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = skin; ctx.fillRect(sx * 38 - 32, -50, 64, 76 * bl); ctx.restore();
      ctx.beginPath(); ctx.moveTo(sx * 38 - 30, -48 + 76 * bl); ctx.lineTo(sx * 38 + 30, -48 + 76 * bl);
      ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.stroke();
      ell(ctx, sx * 38, -12, 30, 36, null, 6);
    }
    // brow
    ctx.beginPath();
    const tilt = o.mood === 'scared' ? 10 : o.mood === 'angry' ? -10 : 0;
    ctx.moveTo(sx * 18, -62 + by + sx * 0 - tilt); ctx.lineTo(sx * 60, -66 + by + tilt);
    ctx.lineWidth = 11; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke();
  }
  // mouth
  const t = o.talk || 0;
  if (t > 0.05) {
    ell(ctx, 0, 52, 22 + 6 * t, 6 + 22 * t, '#5A1A1A', 6);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 52, 22 + 6 * t, 6 + 22 * t, 0, 0, Math.PI * 2); ctx.clip();
    ell(ctx, 0, 52 + 14 + 22 * t * 0.6, 16, 10, '#E46A6A', 0); ctx.restore();
  } else if (o.mood === 'scared') {
    ell(ctx, 0, 54, 12, 9, '#5A1A1A', 6);
  } else {
    ctx.beginPath(); ctx.arc(0, 36, 26, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.lineCap = 'round'; ctx.stroke();
  }
}

// Bust of a friend. o.outfit: 'casual' | 'jump'. Local origin = centre of the head.
function person(ctx, who, o) {
  const jump = o.outfit === 'jump';
  const num = { bento: '053', geraldim: '031', rai: '071' }[who];
  if (who === 'bento') {
    const skin = C.skinBento;
    // torso
    rr(ctx, -165, 110, 330, 420, 70, jump ? C.jump : '#F2EEE6');
    if (!jump) { pth(ctx, [[-165, 150], [-60, 130], [-40, 530], [-165, 530]], '#7A4A2A', 0); pth(ctx, [[165, 150], [60, 130], [40, 530], [165, 530]], '#7A4A2A', 0); rr(ctx, -165, 110, 330, 420, 70, null); }
    else { rr(ctx, -55, 230, 110, 70, 10, '#fff', 5); text(ctx, num, 0, 280, font(46, 800, UI), C.ink, 'center'); }
    ell(ctx, 0, 95, 46, 30, skin);                                     // neck
    if (!jump) pth(ctx, [[-70, 105], [70, 105], [0, 200]], C.red);     // lenço
    ell(ctx, 0, 0, 100, 110, skin);                                    // head
    ell(ctx, -100, 5, 16, 24, skin); ell(ctx, 100, 5, 16, 24, skin);
    face(ctx, o, skin);
    ell(ctx, 0, 18, 15, 13, '#D9946A', 5);                             // nose
    pth(ctx, [[-70, 40], [-20, 22], [0, 30], [20, 22], [70, 40], [55, 52], [0, 40], [-55, 52]], '#3A2416', 5); // bigode
    if (!jump) { ell(ctx, 10, -88, 105, 34, '#1A1A1A', 6, -0.12); ell(ctx, 30, -112, 10, 8, '#1A1A1A', 4); } // boina
    else pth(ctx, [[-95, -50], [-80, -100], [0, -118], [80, -100], [95, -50], [60, -85], [-60, -85]], '#3A2416', 6);
    // cuia + bomba in right hand
    if (!jump && o.cuia !== false) {
      const cy = o.cuiaY || 300;
      ell(ctx, 120, cy + 40, 48, 56, '#8A5A2B'); ell(ctx, 120, cy - 6, 40, 12, '#3E7A2A', 5);
      ctx.beginPath(); ctx.moveTo(126, cy - 4); ctx.lineTo(160, cy - 110); ctx.lineWidth = 9; ctx.strokeStyle = '#C9CED6'; ctx.stroke();
      ell(ctx, 160, cy + 60, 30, 26, skin);
    }
  } else if (who === 'geraldim') {
    const skin = C.skinGer;
    rr(ctx, -150, 115, 300, 400, 90, jump ? C.jump : '#B23A2A');
    if (!jump) {
      ctx.save(); rrect(ctx, -150, 115, 300, 400, 90); ctx.clip();
      ctx.strokeStyle = '#5E2A14'; ctx.lineWidth = 14;
      for (let x = -150; x < 160; x += 50) { ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, 520); ctx.stroke(); }
      for (let y = 140; y < 520; y += 50) { ctx.beginPath(); ctx.moveTo(-160, y); ctx.lineTo(160, y); ctx.stroke(); }
      ctx.restore(); rr(ctx, -150, 115, 300, 400, 90, null);
    } else { rr(ctx, -55, 230, 110, 70, 10, '#fff', 5); text(ctx, num, 0, 280, font(46, 800, UI), C.ink, 'center'); }
    ell(ctx, 0, 100, 44, 28, skin);
    ell(ctx, 0, 5, 104, 104, skin);
    ell(ctx, -104, 10, 15, 22, skin); ell(ctx, 104, 10, 15, 22, skin);
    ell(ctx, -62, 34, 20, 12, '#E07B6A', 0); ell(ctx, 62, 34, 20, 12, '#E07B6A', 0);
    face(ctx, o, skin);
    ell(ctx, 0, 20, 14, 12, '#B97A48', 5);
    if (!jump) { ell(ctx, 0, -78, 170, 34, '#E2C46B'); rr(ctx, -80, -150, 160, 80, 30, '#E2C46B'); rr(ctx, -80, -100, 160, 22, 4, '#8A3A1A', 5); }
    else pth(ctx, [[-98, -40], [-70, -95], [0, -108], [70, -95], [98, -40], [50, -78], [-50, -78]], '#2A1A10', 6);
    if (o.bag !== false && !jump) { // pão de queijo bag in left hand
      const by2 = o.bagY || 330;
      pth(ctx, [[-215, by2 - 40], [-105, by2 - 40], [-95, by2 + 110], [-225, by2 + 110]], '#D9B98A');
      for (const [x, y] of [[-190, by2 - 50], [-150, by2 - 58], [-120, by2 - 46]]) ell(ctx, x, y, 22, 18, '#F2C14E', 5);
      ell(ctx, -100, by2 + 50, 30, 26, skin);
    }
  } else if (who === 'rai') {
    const skin = C.skinRai;
    rr(ctx, -125, 115, 250, 420, 60, jump ? C.jump : '#1FB5A5');
    if (!jump) {
      ctx.save(); rrect(ctx, -125, 115, 250, 420, 60); ctx.clip();
      for (const [x, y, r, c] of [[-80, 190, 30, '#FFB23C'], [60, 240, 36, '#FF5E7A'], [-40, 330, 34, '#FFE14C'], [80, 400, 30, '#FFB23C'], [-90, 450, 28, '#FF5E7A']]) ell(ctx, x, y, r, r * 0.6, c, 0, 0.6);
      ctx.restore(); rr(ctx, -125, 115, 250, 420, 60, null);
      // bare arms
      rr(ctx, -175, 140, 60, 260, 30, skin); rr(ctx, 115, 140, 60, 260, 30, skin);
    } else { rr(ctx, -55, 230, 110, 70, 10, '#fff', 5); text(ctx, num, 0, 280, font(46, 800, UI), C.ink, 'center'); }
    ell(ctx, 0, 98, 40, 28, skin);
    if (!jump) { ctx.beginPath(); ctx.arc(0, 108, 52, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 6; ctx.strokeStyle = '#E8C04A'; ctx.stroke(); }
    // afro: bumpy cap
    for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; ell(ctx, Math.cos(a) * 92, -30 + Math.sin(a) * 92, 42, 42, '#1C120C', 6); }
    ell(ctx, 0, 0, 96, 108, skin);
    ell(ctx, -96, 8, 15, 22, skin); ell(ctx, 96, 8, 15, 22, skin);
    pth(ctx, [[-96, -36], [-80, -104], [0, -124], [80, -104], [96, -36], [50, -76], [-50, -76]], '#1C120C', 0);
    face(ctx, o, skin);
    ell(ctx, 0, 20, 15, 12, '#4A2818', 5);
    if (!jump) { rr(ctx, -82, -112, 70, 34, 14, '#111', 5); rr(ctx, 12, -112, 70, 34, 14, '#111', 5); }
    if (o.wristUp) { // kissing the fitinha: forearm raised to the mouth
      const k = o.wristUp;
      ctx.save(); ctx.translate(140, lerp(380, 70, k)); ctx.rotate(lerp(0, -1.2, k));
      rr(ctx, -30, 0, 60, 240, 30, skin); rr(ctx, -32, 22, 64, 20, 6, '#FFE14C', 5); ell(ctx, 0, -10, 34, 32, skin);
      ctx.restore();
    } else if (!jump) { rr(ctx, 113, 330, 64, 20, 6, '#FFE14C', 5); }
  }
}

// ------------------------------------------------------------------ Caio's hands (POV)
function hands(ctx, t, o) {
  const sleeve = o.jump ? C.jump : null;
  const bob = Math.sin(t * 2.2) * 6 + noise1(t * 0.7, 3) * 8;
  const y0 = H + 40 + (o.dy || 0) + bob;
  // right forearm + hand holding phone, bottom right
  if (o.phone) {
    ctx.save(); ctx.translate(W * 0.70 + (o.dx || 0), y0 - 520); ctx.rotate(-0.12);
    // sleeve
    rr(ctx, 60, 330, 190, 380, 60, sleeve || '#F4F4F4');
    if (!sleeve) { ctx.save(); rrect(ctx, 60, 330, 190, 380, 60); ctx.clip(); ctx.fillStyle = '#111'; for (let x = 70; x < 260; x += 46) ctx.fillRect(x, 320, 22, 400); ctx.restore(); rr(ctx, 60, 330, 190, 380, 60, null); }
    // phone
    rr(ctx, -40, -20, 250, 470, 34, '#1B1B22');
    rr(ctx, -24, 0, 218, 420, 22, o.screen || '#0E2A2A', 0);
    if (o.screenFn) { ctx.save(); rrect(ctx, -24, 0, 218, 420, 22); ctx.clip(); ctx.translate(-24, 0); o.screenFn(ctx, 218, 420); ctx.restore(); }
    // battery
    rr(ctx, 120, 12, 52, 24, 5, null, 3); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(120, 12, 52, 24);
    ctx.fillStyle = o.full ? '#3DDC84' : C.red; ctx.fillRect(123, 15, o.full ? 46 : 6, 18);
    text(ctx, o.full ? '100%' : '3%', 112, 33, font(22, 800, UI), o.full ? '#3DDC84' : C.red, 'right');
    // thumb + fingers
    ell(ctx, 220, 260, 46, 70, C.skinCaio); ell(ctx, -40, 230, 36, 26, C.skinCaio); ell(ctx, -44, 290, 36, 26, C.skinCaio); ell(ctx, -40, 350, 34, 24, C.skinCaio);
    rr(ctx, 120, 340, 150, 120, 50, C.skinCaio);
    ctx.restore();
  }
  if (o.left) { // left hand, open, lower left
    ctx.save(); ctx.translate(W * 0.18, y0 - 300 + (o.leftDy || 0)); ctx.rotate(0.18);
    rr(ctx, -110, 120, 200, 400, 60, sleeve || '#F4F4F4');
    if (!sleeve) { ctx.save(); rrect(ctx, -110, 120, 200, 400, 60); ctx.clip(); ctx.fillStyle = '#111'; for (let x = -100; x < 100; x += 46) ctx.fillRect(x, 110, 22, 420); ctx.restore(); rr(ctx, -110, 120, 200, 400, 60, null); }
    else { rr(ctx, -70, 170, 120, 64, 10, '#fff', 5); text(ctx, '011', -10, 218, font(46, 800, UI), C.ink, 'center'); }
    ell(ctx, -10, 80, 110, 90, C.skinCaio);
    for (let i = 0; i < 4; i++) rr(ctx, -95 + i * 48, -40 - (i === 1 || i === 2 ? 26 : 0), 40, 120, 20, C.skinCaio);
    ell(ctx, 95, 60, 34, 52, C.skinCaio, OL, -0.6);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ overlays
function badge(ctx, t, t0, t1) {
  const k = springU(t, t0, SPRING.bouncy) * (1 - E.inCubic(prog(t, t1 - 0.3, t1)));
  if (k <= 0) return;
  ctx.save(); ctx.translate(90, 270); ctx.scale(k, k);
  rr(ctx, 0, 0, 250, 74, 14, C.red, 6);
  text(ctx, 'PARTE 01', 125, 52, font(44, 900, DISPLAY), '#fff', 'center');
  ctx.restore();
}
function wrapLines(ctx, str, f, maxW) {
  ctx.font = f; const words = str.split(' '), lines = []; let cur = '';
  for (const w of words) { const tryS = cur ? cur + ' ' + w : w; if (ctx.measureText(tryS).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tryS; }
  if (cur) lines.push(cur); return lines;
}
function subtitles(ctx, t) {
  const s = subAt(t); if (!s) return;
  const [t0, t1, who, str] = s;
  const a = Math.min(E.outCubic(prog(t, t0, t0 + 0.12)), 1 - prog(t, t1 - 0.1, t1));
  const kr = who === 'kr';
  const f = font(kr ? 74 : 56, kr ? 900 : 800, kr ? HANGUL : UI);
  const lines = wrapLines(ctx, str, f, 880);
  const lh = kr ? 86 : 68, base = 1400 - (lines.length - 1) * lh;
  ctx.save(); ctx.globalAlpha = a; ctx.font = f; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  lines.forEach((ln, i) => {
    const y = base + i * lh + (1 - a) * 10;
    ctx.lineWidth = 14; ctx.strokeStyle = '#000'; ctx.strokeText(ln, W / 2, y);
    ctx.fillStyle = C[who]; ctx.fillText(ln, W / 2, y);
  });
  ctx.restore();
}
function msgCard(ctx, t, t0, t1, name, body) {
  const k = springU(t, t0, SPRING.gentle) * (1 - E.inBack(prog(t, t1 - 0.35, t1)));
  if (k <= 0.001) return;
  const y = lerp(-200, 260, k);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24;
  rr(ctx, 70, y, W - 140, 150, 26, '#FFFFFF', 0); ctx.restore();
  rr(ctx, 70, y, W - 140, 150, 26, null, 5);
  ell(ctx, 128, y + 75, 34, 34, '#25D366', 0);
  text(ctx, name, 186, y + 62, font(40, 800, UI), '#0B6B3A');
  text(ctx, body, 186, y + 112, font(40, 800, UI), C.ink);
}
function vignette(ctx, a, color = '0,0,0') {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, `rgba(${color},0)`); g.addColorStop(1, `rgba(${color},${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
// eyelids: 0 = open, 1 = closed
function lids(ctx, c) {
  if (c <= 0) return;
  const h = (H / 2 + 60) * c;
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.moveTo(-50, -50); ctx.lineTo(W + 50, -50); ctx.lineTo(W + 50, h - 120); ctx.quadraticCurveTo(W / 2, h + 120, -50, h - 120); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-50, H + 50); ctx.lineTo(W + 50, H + 50); ctx.lineTo(W + 50, H - h + 120); ctx.quadraticCurveTo(W / 2, H - h - 120, -50, H - h + 120); ctx.fill();
}

// ------------------------------------------------------------------ SETS
function sky(ctx, top, bot) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bot); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

// Rodoviária at night. Wide world (x from -900 to 2000).
function station(ctx, t) {
  sky(ctx, '#1A1033', '#3B2347');
  // far buildings
  for (let i = 0; i < 9; i++) {
    const x = -900 + i * 340, h = 500 + hash(i) * 400;
    shape(ctx, rect(x, 900 - h, 300, h), '#2A1D40', 5);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) if (hash(i * 31 + r * 7 + c) > 0.45)
      shape(ctx, rect(x + 30 + c * 90, 900 - h + 40 + r * 70, 50, 36), '#FFC86B', 0);
  }
  // platform floor
  shape(ctx, [[-1200, 900], [2300, 900], [2300, 2600], [-1200, 2600]], '#5B4B5E', 0);
  lineW(ctx, [[-1200, 1180], [2300, 1180]], 26, '#F2C230');
  for (let i = 0; i < 12; i++) lineW(ctx, [[-1100 + i * 300, 1240], [-1300 + i * 330, 2600]], 4, 'rgba(0,0,0,.25)');
  // canopy roof + columns
  shape(ctx, [[-1200, -400], [2300, -400], [2300, 200], [-1200, 200]], '#3C3550', 6);
  for (let i = 0; i < 8; i++) { const x = -900 + i * 420; shape(ctx, rect(x, 200, 54, 760), '#6C6280', 6); }
  for (let i = 0; i < 8; i++) { // sodium lamps
    const x = -700 + i * 420;
    shape(ctx, rect(x - 60, 200, 120, 30), '#FFE8A3', 5);
    const [px, py] = V(x, 260); const g = ctx.createRadialGradient(px, py, 10, px, py, 340);
    g.addColorStop(0, 'rgba(255,214,120,.35)'); g.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = g; ctx.fillRect(px - 340, py - 100, 680, 700);
  }
  // distant buses
  for (const [x, col] of [[-1100, '#C93A3A'], [1650, '#2D5DA8']]) {
    shape(ctx, rect(x, 660, 560, 300), col, 6); shape(ctx, rect(x + 30, 700, 500, 110), '#9FD3E6', 5);
  }
  // crowd silhouettes
  for (let i = 0; i < 10; i++) {
    const x = -1000 + i * 330 + hash(i + 50) * 100, y = 900 + hash(i + 80) * 40;
    if (x > 60 && x < 1050) continue;
    at(ctx, x, y, 0.55, (c) => { ell(c, 0, 0, 60, 66, '#241A30', 0); rr(c, -90, 60, 180, 300, 60, '#241A30', 0); });
  }
}
const hash = (i) => M.hash01(i, 11);

// Big platform sign + the loose number plate (spins 9 -> 6).
function platformSign(ctx, t) {
  const sx = 540, sy = -620;
  lineW(ctx, [[sx - 300, -1100], [sx - 300, sy]], 8, '#888'); lineW(ctx, [[sx + 300, -1100], [sx + 300, sy]], 8, '#888');
  shape(ctx, rect(sx - 420, sy, 840, 200), '#1E4FA0', 8);
  at(ctx, sx, sy + 140, 1, (c) => text(c, 'PLATAFORMA', 0, 0, font(110, 900, DISPLAY), '#fff', 'center'));
  // number plate hanging by one screw at its top-left corner; swings, then flips upside down
  const swing = 0.08 * Math.sin(t * 3.1) * (t < 24.4 ? 1 : 0) + 0.25 * wobble(t - 22.6, 1.4, 1.2) * (t < 24.4 ? 1 : 0);
  const flip = E.outBack(prog(t, 24.4, 25.1), 1.6) * Math.PI;
  const cx = sx, cy = sy + 360;
  at(ctx, cx, cy, 1, (c) => {
    c.rotate(swing + flip);
    rr(c, -150, -150, 300, 300, 26, '#FFD23F', 9);
    c.textBaseline = 'middle'; text(c, '9', 0, 8, font(300, 900, DISPLAY), C.ink, 'center'); c.textBaseline = 'alphabetic';
  });
  at(ctx, cx, cy - 170, 1, (c) => { ell(c, 0, 0, 16, 16, '#999', 5); });
  lineW(ctx, [[cx, sy + 200], [cx, cy - 170]], 6, '#999');
}

// The wrong bus: green, Korean header, a smiling man in a suit with a Wi-Fi/USB sign.
function bus(ctx, t, doorOpen = 1) {
  shape(ctx, rect(-200, 420, 1700, 760), '#2F8F5B', 8);
  shape(ctx, rect(-200, 420, 1700, 120), '#1F6A42', 8);
  at(ctx, 650, 505, 1, (c) => text(c, '특별 운행 버스', 0, 0, font(78, 900, HANGUL), '#F6FFB8', 'center'));
  for (let i = 0; i < 5; i++) shape(ctx, rect(-160 + i * 300, 580, 240, 220), '#7FB8C9', 6);
  // door
  shape(ctx, rect(1180, 580, 230, 600), '#123E2A', 8);
  shape(ctx, rect(1180 + 230 * (1 - doorOpen) * 0, 580, 230 * (1 - doorOpen) + 4, 600), '#7FB8C9', 6);
  shape(ctx, [[-200, 1180], [1500, 1180], [1500, 1220], [-200, 1220]], '#111', 0);
  for (const x of [100, 1050]) at(ctx, x, 1180, 1, (c) => { ell(c, 0, 0, 110, 110, '#1A1A1A', 8); ell(c, 0, 0, 50, 50, '#888', 6); });
}
function suitMan(ctx, x, y, t) {
  at(ctx, x, y, 0.9, (c) => {
    rr(c, -140, 110, 280, 420, 60, '#15151A');
    pth(c, [[-40, 110], [40, 110], [0, 260]], '#fff', 5); pth(c, [[-12, 130], [12, 130], [8, 280], [-8, 280]], C.red, 4);
    ell(c, 0, 0, 92, 104, '#F0D2B6');
    face(c, { look: 0.2 * Math.sin(t), blink: bump(t % 3.7, 0.1, 0.1), mood: 'ok' }, '#F0D2B6');
    pth(c, [[-94, -30], [-70, -100], [0, -118], [70, -100], [94, -30], [60, -70], [-60, -70]], '#0B0B0B', 6);
    // sign in his hand
    c.save(); c.translate(-230, 230); c.rotate(-0.08 + 0.04 * Math.sin(t * 2));
    rr(c, -150, -110, 300, 220, 20, '#fff', 8);
    text(c, 'Wi-Fi', 0, -20, font(64, 900, DISPLAY), C.ink, 'center');
    text(c, 'USB', 0, 70, font(64, 900, DISPLAY), '#1F6A42', 'center');
    c.restore();
  });
}

// Bus interior, looking down the aisle.
function busInside(ctx, t, look) {
  sky(ctx, '#0F2A2E', '#18363A');
  shape(ctx, [[-800, -200], [1880, -200], [1880, 300], [-800, 300]], '#2A4A4E', 6);           // ceiling
  for (let i = 0; i < 7; i++) shape(ctx, rect(-600 + i * 380, 240, 260, 34), '#CFF6E8', 4);    // lights
  shape(ctx, [[-800, 1500], [1880, 1500], [1880, 2600], [-800, 2600]], '#1D2E30', 0);           // floor
  // windows, left wall + right wall
  for (let i = 0; i < 3; i++) shape(ctx, rect(-780 + i * 230, 360, 190, 420), '#0A1418', 6);
  for (let i = 0; i < 3; i++) shape(ctx, rect(1400 + i * 230, 360, 190, 420), '#0A1418', 6);
  // rows of seats with motionless passengers (backs of heads), far to near
  for (let r = 0; r < 5; r++) {
    const s = 0.45 + r * 0.16, y = 760 + r * 120;
    for (const side of [-1, 1]) {
      const x = 540 + side * (230 + r * 110);
      at(ctx, x, y, s, (c) => {
        rr(c, -170, -40, 340, 360, 40, '#2F6B70');
        if (r < 4) { ell(c, -70, -90, 62, 70, '#0E0E10', 5); ell(c, 70, -90, 62, 70, '#0E0E10', 5); }
      });
    }
  }
}

// Dormitory: stacked bunks in a cold hall.
function dorm(ctx, t) {
  sky(ctx, '#5E6B78', '#2D333B');
  shape(ctx, [[-900, -300], [2000, -300], [2000, 240], [-900, 240]], '#4A5560', 6);
  for (let i = 0; i < 6; i++) shape(ctx, rect(-700 + i * 480, 180, 300, 30), '#E9F2FF', 4);
  // loudspeaker
  at(ctx, 1300, 330, 1, (c) => { rr(c, -70, -40, 140, 90, 14, '#2A2F36'); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-40 + k * 30, -20); c.lineTo(-40 + k * 30, 30); c.lineWidth = 6; c.strokeStyle = '#999'; c.stroke(); } });
  shape(ctx, [[-900, 1400], [2000, 1400], [2000, 2600], [-900, 2600]], '#3B434C', 0);
  // walls of bunks: 3 columns each side, 5 levels, tiny green sleepers
  for (const side of [-1, 1]) for (let col = 0; col < 3; col++) {
    const x0 = 540 + side * (320 + col * 300) - 130, w = 260;
    for (let lv = 0; lv < 6; lv++) {
      const y = 300 + lv * 190;
      shape(ctx, rect(x0, y, w, 26), '#8E99A5', 5);
      if (hash(col * 13 + lv * 5 + side * 3 + 20) > 0.35) at(ctx, x0 + 70 + hash(col + lv) * 120, y - 34, 0.32, (c) => { ell(c, 0, 0, 56, 60, '#E2B089', 5); rr(c, 50, -40, 220, 90, 40, C.jump, 5); });
    }
    lineW(ctx, [[x0, 280], [x0, 1440]], 10, '#8E99A5'); lineW(ctx, [[x0 + w, 280], [x0 + w, 1440]], 10, '#8E99A5');
  }
}
function guard(ctx, x, y, s) {
  at(ctx, x, y, s, (c) => {
    rr(c, -150, 100, 300, 440, 70, '#F07A1E');
    ell(c, 0, 0, 104, 116, '#F07A1E');
    ell(c, 0, 10, 80, 92, '#0C0C0C', 6);
    star(c, 0, 12, 46, '#FFFFFF');
  });
}

// ------------------------------------------------------------------ SCENES
function sceneDorm(ctx, t, phase) {
  // phase 'cold' (0..5) or 'wake' (74..86)
  const tl = phase === 'cold' ? t : t - 74;
  const lookDown = phase === 'wake' ? E.inOutCubic(prog(t, 77.6, 78.3)) * (1 - E.inOutCubic(prog(t, 79.8, 80.4))) : 0;
  const lookFriends = phase === 'wake' ? E.inOutCubic(prog(t, 80.0, 80.6)) : 0;
  CAM = { x: -60 + 40 * noise1(tl * 0.3, 2) + lookFriends * 260, y: -40 + lookDown * 520 + 12 * Math.sin(tl * 1.1), z: 1.05 + 0.04 * E.outCubic(prog(tl, 0, 4)), roll: 0.03 * noise1(tl * 0.4, 5) };
  dorm(ctx, t);
  guard(ctx, 230, 1000, 0.95);
  if (phase === 'wake') {
    // friends in jumpsuits, bunk-level, confused
    const pop = (d) => springU(t, 80.3 + d, SPRING.bouncy);
    const bl = (o) => bump((t + o) % 4.1, 0.15, 0.12);
    at(ctx, 1070, 1000, 0.95 * pop(0), (c) => person(c, 'rai', { outfit: 'jump', mood: 'scared', look: -0.6, blink: bl(1) }));
    at(ctx, 1500, 960, 1.0 * pop(0.12), (c) => person(c, 'bento', { outfit: 'jump', mood: 'scared', look: -1, blink: bl(2) }));
    at(ctx, 1300, 1150, 1.05 * pop(0.24), (c) => person(c, 'geraldim', { outfit: 'jump', mood: 'sleepy', look: -0.8, talk: 0 }));
    hands(ctx, t, { jump: true, left: true, dy: 260 - lookDown * 520, leftDy: 60 - lookDown * 380 });
  } else {
    hands(ctx, t, { jump: true, left: true, dy: 300, leftDy: 140 });
  }
  vignette(ctx, 0.55);
  // eyes opening
  const open = phase === 'cold' ? kf(t, [[0, 1], [0.6, 0.55], [0.9, 0.75], [1.6, 0]], E.outCubic) : kf(t, [[73.9, 1], [74.4, 0.5], [74.7, 0.65], [75.4, 0]], E.outCubic);
  lids(ctx, open);
}

function sceneStation(ctx, t) {
  const camx = kfFocus(t);
  CAM = { x: camx, y: 30 + 10 * Math.sin(t * 1.3), z: 1.0, roll: 0.015 * noise1(t * 0.5, 4) };
  station(ctx, t);
  const b = (o) => bump((t + o) % 3.9, 0.12, 0.1);
  at(ctx, 250, 1020, 1.05, (c) => person(c, 'rai', { talk: talking('rai', t), look: 0.6, blink: b(0.5), mood: t > 10.6 && t < 14 ? 'happy' : 'ok' }));
  at(ctx, 560, 1080, 1.0, (c) => person(c, 'geraldim', { talk: talking('geraldim', t), look: 0.1, blink: b(1.7) }));
  at(ctx, 880, 1010, 1.1, (c) => person(c, 'bento', { talk: talking('bento', t), look: -0.5, blink: b(2.6), mood: t > 17.5 && t < 21.6 ? 'angry' : 'ok' }));
  hands(ctx, t, { phone: true, dy: 120, screenFn: (c, w, h) => phoneMissed(c, w, h) });
  vignette(ctx, 0.5);
  msgCard(ctx, t, 7.0, 13.0, 'Bruno', '17 chamadas perdidas');
}
// camera focus per speaker, eased between keys
function kfFocus(t) {
  return kf(t, [[6.5, 0], [10.7, 0], [11.2, -230], [14.0, -230], [14.5, 20], [17.4, 20], [18.0, 280], [21.4, 280], [22.0, 80]], E.inOutCubic);
}
function phoneMissed(c, w, h) {
  c.fillStyle = '#0D1F1A'; c.fillRect(0, 0, w, h);
  text(c, 'Bruno', w / 2, 120, font(30, 800, UI), '#fff', 'center');
  text(c, '17', w / 2, 230, font(110, 900, DISPLAY), C.red, 'center');
  text(c, 'perdidas', w / 2, 280, font(26, 800, UI), '#ccc', 'center');
}
function phoneLink(c, w, h) {
  c.fillStyle = '#0B1E16'; c.fillRect(0, 0, w, h);
  text(c, 'Desconhecido', w / 2, 90, font(24, 800, UI), '#9fe6c0', 'center');
  rr(c, 14, 120, w - 28, 170, 16, '#1F3A30', 0);
  text(c, 'EUROPA', w / 2, 180, font(40, 900, DISPLAY), '#fff', 'center');
  text(c, 'R$ 499', w / 2, 230, font(36, 900, DISPLAY), '#FFD23F', 'center');
  text(c, '12x', w / 2, 272, font(26, 800, UI), '#ccc', 'center');
}

function sceneSign(ctx, t) {
  const up = E.inOutCubic(prog(t, 22.0, 22.9)), down = E.inOutCubic(prog(t, 27.6, 28.9));
  CAM = { x: 60, y: lerp(30, -880, up * (1 - down)) + 8 * Math.sin(t * 1.4), z: 1.0 + 0.12 * E.outCubic(prog(t, 23, 25)), roll: 0.01 * noise1(t, 9) };
  station(ctx, t);
  platformSign(ctx, t);
  const b = (o) => bump((t + o) % 3.9, 0.12, 0.1);
  at(ctx, 250, 1020, 1.05, (c) => person(c, 'rai', { look: 0.6, blink: b(0.5) }));
  at(ctx, 560, 1080, 1.0, (c) => person(c, 'geraldim', { look: 0.1, blink: b(1.7) }));
  at(ctx, 880, 1010, 1.1, (c) => person(c, 'bento', { look: -0.5, blink: b(2.6) }));
  hands(ctx, t, { phone: true, dy: 120 + up * (1 - down) * 500, screenFn: phoneMissed });
  vignette(ctx, 0.5 + 0.2 * up * (1 - down));
}

function sceneBus(ctx, t) {
  // 29..44: whip to the bus, run at 31.6, arrive 32.4
  const whipIn = E.inOutCubic(prog(t, 28.9, 29.4));
  const run = Math.log(1 + E.inOutCubic(prog(t, 31.6, 32.4)) * (Math.E - 1)); // log zoom feel
  const fs = kf(t, [[33.4, 0], [33.9, -280], [36.0, -280], [36.5, 80], [39.8, 80], [40.2, -400], [41.4, -400], [41.9, 80]], E.inOutCubic);
  CAM = { x: lerp(-700, 0, whipIn) + fs * run, y: 40 + 14 * Math.sin(t * (t > 31.6 && t < 32.4 ? 9 : 1.3)), z: 1.0 * (1.45 / 1.0) ** run * 0.72 + (1 - run) * 0.28, roll: (t > 31.6 && t < 32.4 ? 0.04 * Math.sin(t * 20) : 0.01 * noise1(t, 2)) };
  CAM.z = (0.85) * ((1.35 / 0.85) ** run);
  if (t < 29.4) { // the station still on screen during the whip
    ctx.save(); ctx.globalAlpha = 1; station(ctx, t); ctx.restore();
  }
  sky(ctx, '#1A1033', '#3B2347');
  // ground and station hints behind the bus
  shape(ctx, [[-1200, 1100], [2400, 1100], [2400, 2600], [-1200, 2600]], '#5B4B5E', 0);
  shape(ctx, [[-1200, -400], [2400, -400], [2400, 200], [-1200, 200]], '#3C3550', 6);
  bus(ctx, t);
  suitMan(ctx, 1560, 860, t);
  const b = (o) => bump((t + o) % 3.9, 0.12, 0.1);
  if (t > 32.4) {
    const k = springU(t, 32.5, SPRING.bouncy);
    at(ctx, 260, 1140, 1.0 * k, (c) => person(c, 'geraldim', { talk: talking('geraldim', t), look: 0.7, blink: b(1.2) }));
    at(ctx, -120, 1100, 1.0 * k, (c) => person(c, 'rai', { talk: talking('rai', t), look: 0.9, blink: b(0.3), mood: t > 39.9 ? 'scared' : 'ok' }));
    at(ctx, 820, 1100, 1.05 * k, (c) => person(c, 'bento', { look: -0.4, blink: b(2.1) }));
  }
  const showLink = t > 36.2 && t < 44;
  hands(ctx, t, { phone: t > 32.4, dy: 120, screenFn: showLink ? phoneLink : phoneMissed });
  vignette(ctx, 0.5);
  // whip blur streaks
  const whip = bump(t, 29.15, 0.3) + bump(t, 32.0, 0.4);
  if (whip > 0) { ctx.fillStyle = `rgba(255,255,255,${0.12 * whip})`; for (let i = 0; i < 14; i++) ctx.fillRect(0, hash(i + 300) * H, W, 4 + hash(i) * 10); }
}

function sceneInside(ctx, t) {
  // 44..60. 52.2-55.2 pan right to the window: Caio's reflection, phone charging.
  const toWin = E.inOutCubic(prog(t, 52.0, 52.7)) * (1 - E.inOutCubic(prog(t, 55.0, 55.6)));
  const fs = kf(t, [[44, 0], [45.0, -240], [48.2, -240], [48.7, 260], [51.4, 260], [51.9, 0], [55.6, -240], [60, -240]], E.inOutCubic);
  CAM = { x: fs + toWin * 1150, y: 10 + 8 * Math.sin(t * 1.6) + 4 * noise1(t * 4, 3), z: 1.0, roll: 0.012 * Math.sin(t * 0.9) };
  busInside(ctx, t, 0);
  const b = (o) => bump((t + o) % 3.9, 0.12, 0.1);
  // Rai sits across the aisle (left), Bento in the seat ahead turned back (right), Geraldim peeking over the seat
  at(ctx, 580, 1090, 0.75, (c) => person(c, 'geraldim', { look: 0, blink: b(1.1), bag: false }));
  at(ctx, 200, 1180, 1.05, (c) => person(c, 'rai', { talk: talking('rai', t), look: t < 48.5 ? 0.9 : 0.6, blink: b(0.4), mood: t < 48.3 ? 'scared' : 'ok', wristUp: E.inOutCubic(prog(t, 56.6, 57.2)) * (1 - E.inOutCubic(prog(t, 58.4, 59.0))) }));
  const slurp = bump(t, 51.6, 0.5);
  at(ctx, 940, 1170, 1.08, (c) => person(c, 'bento', { talk: talking('bento', t), look: -0.6, blink: b(2.2), cuiaY: 300 - slurp * 230 }));
  // window + reflection of Caio (the only time we see his face)
  const wx = 2050;
  shape(ctx, rect(wx - 330, 300, 660, 900), '#0B1820', 10);
  // city lights streaking past
  for (let i = 0; i < 10; i++) {
    const x = wx - 330 + ((hash(i + 900) * 660 + t * 900 * (0.6 + hash(i))) % 660), y = 380 + hash(i + 700) * 760;
    shape(ctx, rect(x, y, 70, 10), i % 3 ? '#FFC86B' : '#FF5E7A', 0);
  }
  at(ctx, wx, 760, 0.95, (c) => {
    c.globalAlpha = 0.5;
    rr(c, -130, 110, 260, 400, 60, '#F4F4F4');
    c.save(); rrect(c, -130, 110, 260, 400, 60); c.clip(); c.fillStyle = '#111'; for (let x = -120; x < 140; x += 46) c.fillRect(x, 100, 22, 420); c.restore();
    ell(c, 0, 0, 96, 108, C.skinCaio);
    face(c, { look: -0.3, mood: 'ok', blink: bump(t, 54.0, 0.12) }, C.skinCaio);
    ell(c, 0, 20, 14, 12, '#C98A60', 5);
    ell(c, 0, -80, 110, 36, '#111', 6); rr(c, -100, -140, 200, 70, 30, '#111'); rr(c, 60, -96, 120, 22, 10, '#111');  // boné aba reta
    c.globalAlpha = 1;
  });
  hands(ctx, t, { phone: true, dy: 160, full: t > 52, screenFn: (c, w, h) => { c.fillStyle = '#0D1F1A'; c.fillRect(0, 0, w, h); if (t > 52) pth(c, [[w/2+10, 140], [w/2-40, 240], [w/2, 240], [w/2-20, 320], [w/2+45, 205], [w/2+5, 205]], '#3DDC84', 0); text(c, 'carregando', w / 2, 300, font(26, 800, UI), '#9fe6c0', 'center'); } });
  vignette(ctx, 0.55);
}

function sceneGas(ctx, t) {
  // 60..72: pink gas from the AC; vision blurs, lids get heavy and close.
  const tl = t - 60;
  CAM = { x: -240 + 120 * Math.sin(tl * 0.35), y: 10 + 30 * prog(t, 64, 71), z: 1.0 + 0.05 * prog(t, 60, 72), roll: 0.04 * Math.sin(tl * 0.6) * prog(t, 63, 72) };
  ctx.save();
  ctx.filter = `blur(${lerp(0, 10, E.inCubic(prog(t, 63, 71)))}px)`;
  busInside(ctx, t, 0);
  const sleepy = prog(t, 62, 66);
  at(ctx, 580, 1090, 0.75, (c) => person(c, 'geraldim', { talk: talking('geraldim', t) * 0.6, mood: 'sleepy', bag: false, blink: sleepy * 0.6 }));
  at(ctx, 200, 1180, 1.05, (c) => person(c, 'rai', { mood: 'sleepy', blink: Math.min(1, sleepy * 1.2) }));
  at(ctx, 940, 1170, 1.08, (c) => person(c, 'bento', { mood: 'sleepy', blink: Math.min(1, sleepy * 1.3), cuiaY: 360 }));
  hands(ctx, t, { phone: true, dy: 160 + 380 * E.inCubic(prog(t, 66, 70)), full: true, screenFn: (c, w, h) => { c.fillStyle = '#0D1F1A'; c.fillRect(0, 0, w, h); } });
  ctx.restore();
  // pink gas puffs from the ceiling vents
  const gas = E.outCubic(prog(t, 60.4, 66));
  for (let i = 0; i < 26; i++) {
    const a = hash(i + 400), sx = (a * 1.3 - 0.15) * W, sp = 0.5 + hash(i + 401);
    const y = -100 + ((tl * 70 * sp + hash(i + 402) * 600) % 1600);
    const r = (140 + hash(i + 403) * 220) * gas;
    const g = ctx.createRadialGradient(sx, y, 0, sx, y, r);
    g.addColorStop(0, `rgba(255,120,190,${0.28 * gas})`); g.addColorStop(1, 'rgba(255,120,190,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - r, y - r, 2 * r, 2 * r);
  }
  ctx.fillStyle = `rgba(255,140,200,${0.18 * gas})`; ctx.fillRect(0, 0, W, H);
  vignette(ctx, 0.6 + 0.3 * prog(t, 64, 71));
  // heavy blinks then close
  const close = Math.max(bump(t, 65.6, 0.45) * 0.7, bump(t, 67.6, 0.5) * 0.85, bump(t, 69.4, 0.5) * 0.92, E.inCubic(prog(t, 70.4, 71.8)));
  lids(ctx, close);
}

function scenePoll(ctx, t) {
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
    rr(ctx, 110, y, W - 220, 170, 24, col, 7);
    icon(ctx, 200, y + 85);
    text(ctx, l1, 280, y + 72, font(54, 900, DISPLAY), '#fff');
    text(ctx, l2, 280, y + 134, font(54, 900, DISPLAY), '#fff');
    ctx.restore();
  };
  btn(86.55, 860, C.red, 'PERGUNTAR ONDE', 'FICA A EUROPA', (c, x, y) => { ell(c, x, y, 44, 44, '#fff', 0); text(c, '?', x, y + 26, font(74, 900, DISPLAY), C.red, 'center'); });
  btn(86.85, 1070, C.blue, 'FICAR QUIETO', 'E OBSERVAR', (c, x, y) => { ell(c, x, y, 46, 30, '#fff', 0); ell(c, x, y, 18, 18, C.ink, 0); });
  const ck = E.outCubic(prog(t, 87.4, 87.8));
  if (ck > 0) {
    ctx.save(); ctx.globalAlpha = ck;
    const yy = 1330 + 6 * Math.sin(t * 4);
    text(ctx, 'Comenta aqui', W / 2 - 30, yy, font(58, 800, UI), '#FFD23F', 'center');
    pth(ctx, [[W / 2 + 200, yy - 40], [W / 2 + 240, yy - 40], [W / 2 + 240, yy - 5], [W / 2 + 262, yy - 5], [W / 2 + 220, yy + 30], [W / 2 + 178, yy - 5], [W / 2 + 200, yy - 5]], '#FFD23F', 5);
    ctx.restore();
  }
}

function rewind(ctx, t) {
  // 5.0..6.5: the cold-open image rewinds with tape glitch; "12 HORAS ANTES"
  sceneDorm(ctx, Math.max(0.1, 5 - (t - 5) * 3), 'cold');
  const g = prog(t, 5, 6.5);
  for (let i = 0; i < 18; i++) {
    const y = (hash(i + 77) * H + t * 2400 * (i % 2 ? 1 : -1)) % H, h = 10 + hash(i + 5) * 60;
    ctx.drawImage(ctx.canvas, 0, y, W, h, (hash(i + Math.floor(t * 30)) - 0.5) * 120, y, W, h);
  }
  ctx.fillStyle = `rgba(0,0,0,${0.35 + 0.4 * g})`; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.07)'; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 2);
  const k = springU(t, 5.15, SPRING.bouncy);
  ctx.save(); ctx.translate(W / 2, 900); ctx.scale(k, k);
  text(ctx, '◀◀', 0, -140, font(90, 900, UI), '#fff', 'center');
  ctx.font = font(110, 900, DISPLAY); ctx.textAlign = 'center'; ctx.lineWidth = 14; ctx.strokeStyle = '#000';
  for (const [s, y] of [['12 HORAS', 0], ['ANTES', 115]]) { ctx.strokeText(s, 0, y); ctx.fillStyle = '#fff'; ctx.fillText(s, 0, y); }
  ctx.restore();
}

// ------------------------------------------------------------------ film
M.film({
  fonts: [font(100, 900, DISPLAY), font(40, 800, UI), font(60, 900, HANGUL)],
  hits: HITS,
  samples: (t) => ((t > 28.9 && t < 29.5) || (t > 31.5 && t < 32.6) || (t > 24.3 && t < 25.3) ? 8 : 3),
  draw(ctx, u, t) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (t < 5) sceneDorm(ctx, t, 'cold');
    else if (t < 6.5) rewind(ctx, t);
    else if (t < 22) sceneStation(ctx, t);
    else if (t < 28.9) sceneSign(ctx, t);
    else if (t < 44) sceneBus(ctx, t);
    else if (t < 60) sceneInside(ctx, t);
    else if (t < 72) sceneGas(ctx, t);
    else if (t < 74) {
      fill(ctx, '#000');
      const f = bump(t, 73.95, 0.25);           // the whistle + light: one of the two flashes
      if (f > 0) { ctx.fillStyle = `rgba(255,255,255,${f})`; ctx.fillRect(0, 0, W, H); }
    }
    else if (t < 86) sceneDorm(ctx, t, 'wake');
    else scenePoll(ctx, t);
    badgeAndSubs(ctx, t);
  },
  post(ctx, u, t) {
    // light film grain (after motion blur so it isn't averaged away)
    const seed = Math.floor(t * 60);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 260; i++) ctx.fillRect(M.hash01(i, seed) * W, M.hash01(i + 999, seed) * H, 2, 2);
  },
});
function badgeAndSubs(ctx, t) {
  badge(ctx, t, 0.25, 5.0);
  subtitles(ctx, t);
}
