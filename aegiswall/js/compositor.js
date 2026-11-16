/* AegisWall — compositor. Paints the logical wall (monitors + content) into one canvas.
 * The 3D stage maps that canvas onto the monitor screens; the 2D fallback blits it directly.
 * All pictures drawn here are DEMO previews: browser rendering cannot capture native applications. */
(function () {
  'use strict';
  const AW = window.AW, t = AW.t;
  const W = AW.wall, MW = W.MW, MH = W.MH;
  const FONT = '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';
  const MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';

  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  const C = (AW.compositor = {
    canvas, cols: 0, rows: 0, tw: 480, th: 270, version: 0,
    reloading: new Set(),     // sourceIds currently reloading (content reload service)
    // Sizes the canvas for a grid. Returns true when the backing store changed (textures must be rebuilt).
    configure(cols, rows) {
      let tw = AW.prefs.previewRes;
      const maxSide = 4096;                                   // stay inside conservative GPU texture limits
      tw = Math.min(tw, Math.floor(maxSide / cols), Math.floor((maxSide / rows) * (16 / 9)));
      tw = Math.max(96, tw - (tw % 16)); const th = Math.round((tw * 9) / 16);
      if (cols === C.cols && rows === C.rows && tw === C.tw && canvas.width === cols * tw) return false;
      C.cols = cols; C.rows = rows; C.tw = tw; C.th = th;
      canvas.width = cols * tw; canvas.height = rows * th;
      return true;
    },
    // Display list for an animated change between two compositions (layout recall, discard).
    blend(from, to, p) {
      const out = [], used = new Set();
      const lerp = (a, b) => a + (b - a) * p;
      for (const b of to.items) {
        let a = from.items.find((x) => x.id === b.id && !used.has(x.id)) || from.items.find((x) => x.sourceId === b.sourceId && !used.has(x.id));
        if (a) { used.add(a.id); out.push(Object.assign({}, b, { x: lerp(a.x, b.x), y: lerp(a.y, b.y), w: lerp(a.w, b.w), h: lerp(a.h, b.h), alpha: 1 })); }
        else out.push(Object.assign({}, b, { alpha: p }));
      }
      for (const a of from.items) if (!used.has(a.id) && p < 1) out.unshift(Object.assign({}, a, { alpha: 1 - p }));
      return out;
    },
    draw(o) {
      const comp = o.comp, s = C.tw / MW, now = o.time || Date.now();
      const items = o.items || comp.items;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      // monitors: powered-on, empty state
      for (let r = 0; r < comp.rows; r++) for (let k = 0; k < comp.cols; k++) {
        const x = k * C.tw, y = r * C.th;
        const grd = g.createLinearGradient(x, y, x, y + C.th);
        grd.addColorStop(0, '#161b23'); grd.addColorStop(1, '#0d1116');
        g.fillStyle = grd; g.fillRect(x, y, C.tw, C.th);
      }
      // content, in layer order, clipped to the wall
      let liveLeft = AW.prefs.previewMode === 'live' ? AW.prefs.liveLimit : 0;
      for (const it of items) {
        const src = AW.svc.sources.get(it.sourceId);
        const live = liveLeft > 0 && src && src.preview === 'live' && src.available; if (live) liveLeft--;
        g.save();
        g.globalAlpha = it.alpha == null ? 1 : it.alpha;
        g.beginPath(); g.rect(it.x * s, it.y * s, it.w * s, it.h * s); g.clip();
        drawItem(it, src, it.x * s, it.y * s, it.w * s, it.h * s, live ? now : o.frozenTime || now, live);
        g.restore();
      }
      g.globalAlpha = 1;
      // per-monitor overlays: split guides, hardware state, identifiers
      const idAlpha = o.idAlpha == null ? 1 : o.idAlpha;
      const showIds = AW.prefs.monitorIds === 'always' || (AW.prefs.monitorIds === 'edit' && o.edit);
      for (let r = 0; r < comp.rows; r++) for (let k = 0; k < comp.cols; k++) {
        const x = k * C.tw, y = r * C.th, key = r + ',' + k;
        const [dc, dr] = W.divOf(comp, r, k);
        if (dc * dr > 1) {
          g.save(); g.strokeStyle = 'rgba(166,175,188,.55)'; g.lineWidth = Math.max(1, C.tw / 320); g.setLineDash([C.tw / 40, C.tw / 60]);
          g.beginPath();
          for (let i = 1; i < dc; i++) { g.moveTo(x + (C.tw * i) / dc, y); g.lineTo(x + (C.tw * i) / dc, y + C.th); }
          for (let i = 1; i < dr; i++) { g.moveTo(x, y + (C.th * i) / dr); g.lineTo(x + C.tw, y + (C.th * i) / dr); }
          g.stroke(); g.restore();
        }
        const st = AW.svc.outputs.tileState(key).state;
        if (st === 'planned' || st === 'missing') {
          g.save(); g.beginPath(); g.rect(x, y, C.tw, C.th); g.clip();
          g.fillStyle = 'rgba(10,12,15,.55)'; g.fillRect(x, y, C.tw, C.th);
          g.strokeStyle = st === 'missing' ? 'rgba(240,113,107,.5)' : 'rgba(229,168,59,.42)'; g.lineWidth = Math.max(1, C.tw / 240);
          g.beginPath(); const step = C.tw / 10;
          for (let d = -C.th; d < C.tw; d += step) { g.moveTo(x + d, y + C.th); g.lineTo(x + d + C.th, y); }
          g.stroke();
          tag(st === 'missing' ? t('Output not detected') : t('Planned · no physical output'), x + C.tw / 2, y + C.th / 2, st === 'missing' ? '#f0716b' : '#e5a83b', true);
          g.restore();
        }
        if (showIds && idAlpha > 0.01) {
          g.save(); g.globalAlpha = idAlpha;
          const fs = Math.max(9, Math.round(C.tw / 22)), pad = fs * 0.45, label = W.tileName(r, k);
          g.font = '500 ' + fs + 'px ' + MONO;
          const wdt = g.measureText(label).width + pad * 2;
          const bx = x + C.tw - wdt - fs * 0.4, by = y + C.th - fs * 1.9;      // bottom-right: clear of content captions
          g.fillStyle = 'rgba(15,18,22,.78)'; rr(bx, by, wdt, fs * 1.5, fs * 0.25); g.fill();
          g.fillStyle = '#e6e9ee'; g.textBaseline = 'middle'; g.textAlign = 'left';
          g.fillText(label, bx + pad, by + fs * 0.78);
          g.restore();
        }
      }
      C.version++;
    },
  });

  // ---------- helpers ----------
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function tag(text, cx, cy, color, center) {
    const fs = Math.max(8, Math.round(C.tw / 30));
    g.font = '500 ' + fs + 'px ' + FONT; g.textBaseline = 'middle'; g.textAlign = center ? 'center' : 'left';
    const w = g.measureText(text).width + fs;
    g.fillStyle = 'rgba(15,18,22,.85)'; rr(center ? cx - w / 2 : cx, cy - fs * 0.85, w, fs * 1.7, fs * 0.3); g.fill();
    g.fillStyle = color; g.fillText(text, center ? cx : cx + fs / 2, cy);
  }
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  function caption(it, x, y, w, h, sub) {
    const fs = AW.clamp(Math.min(w / 14, h / 6), 6, C.tw / 20);
    if (w < fs * 5 || h < fs * 2.2) return;
    g.font = '600 ' + fs + 'px ' + FONT; g.textBaseline = 'top'; g.textAlign = 'left';
    let name = it.name; const max = w - fs * 1.6;
    if (g.measureText(name).width > max) { while (name.length > 3 && g.measureText(name + '…').width > max) name = name.slice(0, -1); name += '…'; }
    const tw = g.measureText(name).width;
    g.fillStyle = 'rgba(10,12,15,.72)'; rr(x + fs * 0.4, y + fs * 0.4, tw + fs * 0.8, fs * 1.55, fs * 0.25); g.fill();
    g.fillStyle = '#e6e9ee'; g.fillText(name, x + fs * 0.8, y + fs * 0.68);
    if (sub && h > fs * 5) { g.font = '400 ' + fs * 0.72 + 'px ' + MONO; g.fillStyle = 'rgba(230,233,238,.75)'; g.textBaseline = 'bottom'; g.fillText(sub, x + fs * 0.7, y + h - fs * 0.5); }
  }
  function scene(seed, x, y, w, h, time, live) {
    const hue = seed % 360;
    const sky = g.createLinearGradient(x, y, x, y + h);
    sky.addColorStop(0, 'hsl(' + hue + ',22%,26%)'); sky.addColorStop(0.62, 'hsl(' + ((hue + 20) % 360) + ',18%,36%)'); sky.addColorStop(0.63, 'hsl(' + hue + ',10%,17%)'); sky.addColorStop(1, 'hsl(' + hue + ',10%,10%)');
    g.fillStyle = sky; g.fillRect(x, y, w, h);
    g.fillStyle = 'hsla(' + hue + ',14%,12%,.9)';
    for (let i = 0; i < 4; i++) { const bw = w * (0.1 + ((seed >> (i * 3)) % 7) / 60), bh = h * (0.16 + ((seed >> (i * 2)) % 9) / 40); g.fillRect(x + w * (0.08 + i * 0.23), y + h * 0.63 - bh, bw, bh); }
    // one moving element so "live" previews visibly differ from static thumbnails
    const ph = live ? ((time / 4000 + (seed % 97) / 97) % 1) : (seed % 97) / 97;
    g.fillStyle = 'rgba(230,233,238,.55)'; g.fillRect(x + w * ph, y + h * 0.78, Math.max(2, w * 0.045), Math.max(1, h * 0.03));
  }
  function drawItem(it, src, x, y, w, h, time, live) {
    const seed = hash(it.sourceId);
    if (!src || !src.available) {
      g.fillStyle = '#15191f'; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(240,113,107,.55)'; g.lineWidth = Math.max(1, C.tw / 300); g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      caption(it, x, y, w, h);
      if (w > C.tw / 4) tag(t('Source unavailable'), x + w / 2, y + h / 2, '#f0716b', true);
      return;
    }
    const type = it.type;
    if (type === 'camera') {
      scene(seed, x, y, w, h, time, live);
      caption(it, x, y, w, h, new Date(time).toLocaleTimeString('en-GB') + (live ? '  ● LIVE' : '  STILL'));
    } else if (type === 'mosaic') {
      const n = it.mosaic || 2, cw = w / n, ch = h / n;
      for (let i = 0; i < n * n; i++) scene(seed + i * 7919, x + (i % n) * cw, y + Math.floor(i / n) * ch, cw, ch, time, live);
      g.strokeStyle = 'rgba(10,12,15,.9)'; g.lineWidth = Math.max(1, C.tw / 260); g.beginPath();
      for (let i = 1; i < n; i++) { g.moveTo(x + i * cw, y); g.lineTo(x + i * cw, y + h); g.moveTo(x, y + i * ch); g.lineTo(x + w, y + i * ch); }
      g.stroke();
      caption(it, x, y, w, h, n + ' × ' + n + ' ' + t('camera mosaic'));
    } else if (type === 'youtube') {
      const bg = g.createLinearGradient(x, y, x + w, y + h); bg.addColorStop(0, '#1b1014'); bg.addColorStop(1, '#0c0d10');
      g.fillStyle = bg; g.fillRect(x, y, w, h);
      const r = Math.min(w, h) * 0.13;
      g.fillStyle = '#c4302b'; rr(x + w / 2 - r * 1.5, y + h / 2 - r, r * 3, r * 2, r * 0.45); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x + w / 2 - r * 0.4, y + h / 2 - r * 0.5); g.lineTo(x + w / 2 + r * 0.6, y + h / 2); g.lineTo(x + w / 2 - r * 0.4, y + h / 2 + r * 0.5); g.fill();
      const p = live ? (time / 60000) % 1 : 0.35;
      g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(x + w * 0.04, y + h * 0.93, w * 0.92, Math.max(1, h * 0.012));
      g.fillStyle = '#c4302b'; g.fillRect(x + w * 0.04, y + h * 0.93, w * 0.92 * p, Math.max(1, h * 0.012));
      caption(it, x, y, w, h);
    } else if (type === 'web') {
      g.fillStyle = '#eef0f4'; g.fillRect(x, y, w, h);
      g.fillStyle = '#3d4654'; g.fillRect(x, y, w, h * 0.09);
      g.fillStyle = '#cfd5de';
      for (let i = 0; i < 3; i++) g.fillRect(x + w * (0.05 + i * 0.31), y + h * 0.16, w * 0.27, h * 0.2);
      g.fillStyle = '#8aa6ff';
      for (let i = 0; i < 9; i++) { const bh = h * (0.08 + ((seed >> i) % 9) / 30); g.fillRect(x + w * (0.06 + i * 0.1), y + h * 0.9 - bh, w * 0.06, bh); }
      caption(it, x, y, w, h, 'https://…');
    } else {
      drawApp(it, x, y, w, h, seed);
    }
    if (C.reloading.has(it.sourceId)) { g.fillStyle = 'rgba(10,12,15,.6)'; g.fillRect(x, y, w, h); tag(t('Reloading…'), x + w / 2, y + h / 2, '#e6e9ee', true); }
  }
  const APP_COLORS = { Excel: '#1d6f42', Word: '#2b579a', PowerPoint: '#c43e1c', PowerShell: '#012456', Chrome: '#dfe3ea' };
  function drawApp(it, x, y, w, h, seed) {
    const app = it.app || 'Chrome', col = APP_COLORS[app] || '#3d4654';
    const bar = it.contentOnly ? 0 : Math.max(2, Math.min(h * 0.07, C.th * 0.06));
    const bx = x, by = y + bar, bh = h - bar;
    if (bar) { g.fillStyle = app === 'Chrome' ? '#c9ced8' : col; g.fillRect(x, y, w, bar); g.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < 3; i++) g.fillRect(x + w - bar * (1.1 + i * 1.3), y + bar * 0.35, bar * 0.6, bar * 0.3); }
    if (app === 'PowerShell') {
      g.fillStyle = '#012456'; g.fillRect(bx, by, w, bh);
      g.fillStyle = 'rgba(230,233,238,.8)'; const lh = Math.max(2, bh / 16);
      for (let i = 0; i < 12; i++) g.fillRect(bx + w * 0.03, by + lh * (1 + i * 1.2), w * (0.2 + ((seed >> i) % 11) / 18), Math.max(1, lh * 0.35));
    } else if (app === 'Excel') {
      g.fillStyle = '#fff'; g.fillRect(bx, by, w, bh); g.fillStyle = '#e7f1ea'; g.fillRect(bx, by, w, bh * 0.08);
      g.strokeStyle = '#d0d6dd'; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < 8; i++) { g.moveTo(bx + (w * i) / 8, by); g.lineTo(bx + (w * i) / 8, by + bh); }
      for (let i = 1; i < 12; i++) { g.moveTo(bx, by + (bh * i) / 12); g.lineTo(bx + w, by + (bh * i) / 12); }
      g.stroke();
      g.fillStyle = 'rgba(29,111,66,.45)'; for (let i = 0; i < 6; i++) g.fillRect(bx + (w * (1 + (i % 3) * 2)) / 8 + 2, by + (bh * (2 + i)) / 12 + 2, w / 8 - 4, bh / 12 - 4);
    } else if (app === 'Word') {
      g.fillStyle = '#e9ecf1'; g.fillRect(bx, by, w, bh); g.fillStyle = '#fff'; g.fillRect(bx + w * 0.2, by + bh * 0.06, w * 0.6, bh * 0.94);
      g.fillStyle = '#9aa3b0'; for (let i = 0; i < 12; i++) g.fillRect(bx + w * 0.26, by + bh * (0.14 + i * 0.065), w * (0.3 + ((seed >> i) % 7) / 40), Math.max(1, bh * 0.012));
    } else if (app === 'PowerPoint') {
      g.fillStyle = '#2a2f38'; g.fillRect(bx, by, w, bh); g.fillStyle = '#fff'; g.fillRect(bx + w * 0.16, by + bh * 0.1, w * 0.8, bh * 0.8);
      g.fillStyle = '#c43e1c'; g.fillRect(bx + w * 0.22, by + bh * 0.22, w * 0.4, bh * 0.07); g.fillStyle = '#c9ced8'; for (let i = 0; i < 4; i++) g.fillRect(bx + w * 0.22, by + bh * (0.38 + i * 0.1), w * (0.5 - i * 0.05), bh * 0.035);
      g.fillStyle = '#3d4654'; for (let i = 0; i < 4; i++) g.fillRect(bx + w * 0.02, by + bh * (0.1 + i * 0.2), w * 0.11, bh * 0.15);
    } else {
      g.fillStyle = '#f6f7f9'; g.fillRect(bx, by, w, bh); g.fillStyle = '#e1e5eb'; g.fillRect(bx, by, w, bh * 0.07);
      g.fillStyle = '#fff'; rr(bx + w * 0.12, by + bh * 0.015, w * 0.6, bh * 0.04, bh * 0.02); g.fill();
      g.fillStyle = '#c9d2e4'; for (let i = 0; i < 6; i++) g.fillRect(bx + w * (0.04 + (i % 3) * 0.32), by + bh * (0.14 + Math.floor(i / 3) * 0.42), w * 0.28, bh * 0.36);
    }
    caption(it, x, y + bar, w, h - bar);
  }
})();
