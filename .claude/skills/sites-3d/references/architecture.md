# Arquitetura e padrões de código

Trechos testados no AegisWall (JavaScript puro + Three.js r160). Adapte os nomes; mantenha as ideias.

## Sumário
1. Motor de animação com um dono por chave
2. Rig de câmera (goal/cur amortecidos, limites, view offset)
3. Mapeamento lógico ⇄ 3D ⇄ pixels de tela (projeção e pick)
4. Uma textura de canvas para várias telas (UV por face)
5. Montagem/saída de objetos com stagger
6. Camada SVG de motion graphics
7. Overlay de edição em pixels (alças, encaixe)
8. Salvar arquivo em navegador e em Artifact
9. Adaptador de serviço demo honesto
10. Configuração versionada por seção (edições concorrentes)

---

## 1. Motor de animação com um dono por chave

Uma nova chamada com a mesma chave substitui a anterior partindo do valor atual que o chamador passa
em `from`: entradas rápidas nunca enfileiram e nunca saltam. `spatial: false` mantém a animação com
movimento reduzido (fades, contadores); animações espaciais viram imediatas.

```js
  // ---------- motion: one small tween engine, one owner per key ----------
  const tweens = new Map();
  let rafId = 0;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const EASE = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    in: (t) => t * t * t,
    linear: (t) => t,
  };
  function tick(now) {
    rafId = 0;
    for (const [key, tw] of tweens) {
      if (now < tw.start) continue;
      const p = tw.dur <= 0 ? 1 : Math.min(1, (now - tw.start) / tw.dur);
      const v = tw.from + (tw.to - tw.from) * tw.ease(p);
      tw.value = v;
      try { tw.update(v, p); } catch (e) { console.error(e); }
      if (p >= 1) { tweens.delete(key); if (tw.done) tw.done(); }
    }
    if (tweens.size) rafId = requestAnimationFrame(tick);
  }
  AW.motion = {
    // 'full' | 'reduced' | 'off'. The OS preference wins when the setting is "system".
    level() { const m = AW.prefs ? AW.prefs.motion : 'system'; return m === 'system' ? (mq.matches ? 'reduced' : 'full') : m; },
    reduced() { return this.level() !== 'full'; },
    // Starts (or retargets) the tween that owns `key`. A new call replaces the running one from the
    // value the caller passes as `from` — callers pass their current value, so there is never a jump or a queue.
    to(key, o) {
      const lvl = this.level();
      let dur = o.dur == null ? 300 : o.dur, delay = o.delay || 0;
      if (lvl === 'off' || (lvl === 'reduced' && o.spatial !== false)) { dur = 0; delay = 0; }
      tweens.set(key, { from: o.from, to: o.to, dur, start: performance.now() + delay, ease: EASE[o.ease || 'out'], update: o.update, done: o.done, value: o.from });
      if (!rafId) rafId = requestAnimationFrame(tick);
    },
    cancel(key) { tweens.delete(key); },
    cancelPrefix(prefix) { for (const k of tweens.keys()) if (k.startsWith(prefix)) tweens.delete(k); },
    // Completes matching tweens immediately (used by "Skip").
    finishPrefix(prefix) {
      for (const [k, tw] of [...tweens]) if (k.startsWith(prefix)) { tweens.delete(k); try { tw.update(tw.to, 1); } catch (_) { /* ignore */ } if (tw.done) tw.done(); }
    },
    active(prefix) { for (const k of tweens.keys()) if (!prefix || k.startsWith(prefix)) return true; return false; },
    ease: EASE,
  };
```

Uso: `AW.motion.to('mon:' + key + ':z', { from: m.z, to: 0, dur: 520, delay, ease: 'out', update: (v) => { m.z = v; place(m); } })`.
"Pular" = `AW.motion.finishPrefix('mon:')`.

## 2. Rig de câmera

Um objeto `rig` com `goal` e `cur`. Entrada (arrastar/roda/pinça/teclado) e transições (`frame('front')`,
`frame('fit')`, `focusTile`) só escrevem em `goal`; `constrain()` aplica limites; o laço aproxima `cur`
de `goal` com amortecimento exponencial (`k = 1 - exp(-rate*dt)`, ou `k = 1` em movimento reduzido).
O enquadramento usa a área livre entre os painéis e `camera.setViewOffset` para deslocar o centro.

```js
    // ---- camera rig: one owner for the camera. Input and programmatic moves only change `goal`. ----
    const rig = {
      cur: { theta: -0.42, phi: 0.16, radius: 9, tx: 0, ty: 1.6, ox: 0, oy: 0, gx: 0, gy: 2 },
      goal: { theta: -0.42, phi: 0.16, radius: 9, tx: 0, ty: 1.6, ox: 0, oy: 0, gx: 0, gy: 2 },
      rate: 9, auto: 'three', settled: false,
    };
    const invalidate = () => { dirty = true; };
    const freeRect = () => ({ w: Math.max(120, width - S.insets.left - S.insets.right), h: Math.max(100, height - S.insets.top - S.insets.bottom) });
    const wallSize = () => ({ w: S.cols * PX, h: S.rows * PY });
    function fitRadius(margin) {
      const f = freeRect(), ws = wallSize(), tan = Math.tan((FOV * Math.PI) / 360);
      return Math.max((ws.w * height) / (f.w * margin), (ws.h * height) / (f.h * margin)) / (2 * tan);
    }
    function frame(kind) {
      const ws = wallSize(), g = rig.goal;
      rig.auto = kind;
      g.tx = 0; g.ty = CLEAR + ws.h / 2;
      if (kind === 'front') { g.theta = 0; g.phi = 0; g.radius = fitRadius(0.9); }
      else if (kind === 'fit') { g.radius = fitRadius(0.9) * (1 + Math.abs(g.theta) * 0.12 + Math.abs(g.phi) * 0.2); }
      else { g.theta = -0.42; g.phi = 0.15; g.radius = fitRadius(0.9) * 1.04; }
      invalidate();
    }
    function limits() { const fit = fitRadius(0.9); return { rmin: Math.max(0.9, fit * 0.22), rmax: fit * 2.4 }; }
    function constrain() {
      const g = rig.goal, L = limits(), ws = wallSize();
      if (S.mode === 'edit') { g.theta = 0; g.phi = 0; } else { g.theta = clamp(g.theta, -0.95, 0.95); g.phi = clamp(g.phi, -0.08, 0.7); }
      g.radius = clamp(g.radius, L.rmin, L.rmax);
      g.tx = clamp(g.tx, -ws.w / 2 - 0.3, ws.w / 2 + 0.3); g.ty = clamp(g.ty, CLEAR - 0.3, CLEAR + ws.h + 0.3);   // the wall can never be lost
    }
    function stepRig(dt) {
      const c = rig.cur, g = rig.goal;
      g.ox = (S.insets.left - S.insets.right) / 2; g.oy = (S.insets.top - S.insets.bottom) / 2;
      const k = AW.motion.reduced() ? 1 : 1 - Math.exp(-rig.rate * dt);
      let moving = false;
      for (const p in g) {
        const d = g[p] - c[p];
        if (Math.abs(d) > (p === 'ox' || p === 'oy' ? 0.3 : 0.0004)) { c[p] += d * k; moving = true; } else c[p] = g[p];
      }
      rig.settled = !moving;
      const cp = Math.cos(c.phi);
      camera.position.set(c.tx + c.radius * Math.sin(c.theta) * cp, c.ty + c.radius * Math.sin(c.phi), c.radius * Math.cos(c.theta) * cp);
      camera.lookAt(c.tx, c.ty, 0);
      camera.setViewOffset(width, height, -c.ox, -c.oy, width, height);   // keeps the wall centred in the area the panels leave free
      camera.updateMatrixWorld();
      wallGroup.position.set(c.gx, c.gy, 0);
      return moving;
    }

```

Gestos: botão esquerdo = órbita (ou nada no modo edição), direito/meio/Shift = pan, roda/pinça = zoom.
Um clique é "pressionar e soltar com menos de 5 px de movimento"; só então emitir `stage-click` com `pick`.
Qualquer gesto durante a abertura chama `skipIntro()`.

## 3. Lógico ⇄ 3D ⇄ tela

O modelo usa pixels lógicos contínuos (origem no canto superior esquerdo). O palco converte para unidades
locais da parede (considerando molduras e vãos) e projeta para pixels de tela. Tudo o que é desenhado por
cima (SVG, overlay de edição, legendas) usa `stage.quad(rect)`; cliques usam `stage.pick(x, y)`.

```js
  // logical pixels <-> wall-local units (origin: top-left outer corner, x right, y down).
  // The logical surface is continuous; physically each monitor's picture area is separated by bezels.
  const toLocalX = (x, max) => { const k = max ? Math.ceil(x / MW) - 1 : Math.floor(x / MW); return k * PX + BEZEL + GAP / 2 + ((x - k * MW) / MW) * SW; };
  const toLocalY = (y, max) => { const r = max ? Math.ceil(y / MH) - 1 : Math.floor(y / MH); return r * PY + BEZEL + GAP / 2 + ((y - r * MH) / MH) * SH; };
  const toLogicalX = (lx) => { const k = Math.floor(lx / PX); return (k + clamp((lx - k * PX - BEZEL - GAP / 2) / SW, 0, 1)) * MW; };
  const toLogicalY = (ly) => { const r = Math.floor(ly / PY); return (r + clamp((ly - r * PY - BEZEL - GAP / 2) / SH, 0, 1)) * MH; };

// dentro do palco 3D:
projectLocal(lx, ly) {
  v3.set(rig.cur.gx + lx, rig.cur.gy - ly, 0.002).project(camera);
  return { x: (v3.x + 1) / 2 * width, y: (1 - v3.y) / 2 * height, visible: v3.z > -1 && v3.z < 1 };
},
pick(px, py) {   // raio contra o plano z = 0 da parede
  v3.set((px / width) * 2 - 1, 1 - (py / height) * 2, 0.5).unproject(camera);
  v3b.copy(v3).sub(camera.position);
  const t = -camera.position.z / v3b.z; if (t <= 0) return null;
  const lx = camera.position.x + v3b.x * t - rig.cur.gx, ly = rig.cur.gy - (camera.position.y + v3b.y * t);
  ...
},
scale() { return (SW / MW) / unitsPerPx(); },          // px de tela por px lógico (exato na vista frontal)
aligned() { return Math.abs(rig.cur.theta) < 0.002 && Math.abs(rig.cur.phi) < 0.002; },
```

O palco 2D de reserva implementa **as mesmas funções** com uma escala e um deslocamento simples.

## 4. Uma textura para várias telas

Desenhe toda a superfície num canvas (`cols*tw × rows*th`) e crie uma `CanvasTexture` só. Cada tela é um
`PlaneGeometry` com UVs recortando seu pedaço. Conteúdo que atravessa várias telas fica contínuo e as
molduras físicas continuam visíveis. Limite o canvas a ~4096 px por lado.

```js
function setUV(geo, r, k) {
  const uv = geo.attributes.uv, u0 = k / cols, u1 = (k + 1) / cols, v1 = 1 - r / rows, v0 = 1 - (r + 1) / rows;
  uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0); uv.needsUpdate = true;
}
texture.colorSpace = THREE.SRGBColorSpace;  // e texture.needsUpdate = true depois de cada redraw
```

Redesenhe só quando algo muda (edição, intervalo de prévia, animação de recuperação).

## 5. Chegada e saída de objetos

Ao mudar a quantidade: crie os novos com `z` recuado, escala 0.86 e "energia" 0, e anime com stagger
(`delay = i*45 ms`, máx. 400). Os que saem trocam para material desligado, ganham um realce de aviso e
encolhem; só são removidos (e seus recursos liberados) no `done`. Uma nova mudança antes do fim reaproveita
o objeto que ainda está saindo (`arrive(m, 0)`). Identidade preservada: chave `linha,coluna`.

## 6. Camada SVG de motion graphics

Um `<svg>` absoluto sobre o canvas, `pointer-events: none`, atualizado num hook chamado depois de cada
render (`stage.onFrame(fn)`). Contornos com `pathLength="1"` e
`@keyframes draw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }`. Reinicie a animação com
`classList.remove; void getBoundingClientRect(); classList.add`. Legenda HTML posicionada com `transform`,
presa a um canto projetado, limitada à área livre e escondida quando o ponto sai dela. A varredura de
confirmação é um `rect` com gradiente recortado (`clipPath`) pelo quadrilátero da parede.

## 7. Overlay de edição

Molduras `div` posicionadas pela projeção (`quad`), uma por item, na ordem das camadas, focáveis
(`tabindex=0`) com `aria-label`. Oito alças só no selecionado. Durante o arraste:
`requestAnimationFrame` → calcular retângulo com encaixe (linhas de monitores, divisões e outros itens;
tolerância em pixels de tela convertida por `stage.scale()`) → redesenhar só a prévia → guias e medida.
Grava no modelo **ao soltar**; Esc cancela; Alt ignora o encaixe. O overlay fica oculto (`opacity 0`,
sem eventos) enquanto `!stage.aligned()`. Teclado: setas movem 10 px (Shift 100, Alt 1), Ctrl+setas
redimensionam, Delete remove com Undo, Ctrl+D duplica, `[` `]` mudam a camada.

## 8. Salvar arquivo

```js
  AW.saveFile = async (filename, text) => {
    const cl = window.claude;
    if (cl && typeof cl.use === 'function') {
      let dl = null;
      try { dl = await cl.use('downloads'); } catch (_) { dl = null; }
      if (dl) {
        try { await dl.save({ filename, data: text }); return { ok: true, method: 'viewer' }; }
        catch (e) {
          if (e && e.code === 'declined') return { ok: false, method: 'declined' };
        }
      }
      await AW.showText(filename, text, AW.t('This viewer cannot save files directly. Copy the content below instead.'));
      return { ok: false, method: 'shown' };
    }
    try {
      const url = URL.createObjectURL(new Blob([text], { type: /\.json$/.test(filename) ? 'application/json' : 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return { ok: true, method: 'download' };
    } catch (_) {
      await AW.showText(filename, text, AW.t('The browser blocked the download. Copy the content below instead.'));
      return { ok: false, method: 'shown' };
    }
  };
```

Copiar: `navigator.clipboard.writeText` dentro do clique, com fallback `execCommand('copy')` e, por último,
selecionar o texto. Importar: `<input type=file>` + `FileReader`.

## 9. Adaptador demo honesto

- Mesma forma que o backend real: métodos `async`, `reject` com `AppError(code, message)`.
- Simula atraso, estados intermediários (fases via callback `onPhase`) e falhas ligáveis por chaves de
  "Demo tools" (falhar próximo envio, desconectar, desplugar dispositivo, serviço de licença fora…).
- Verifica papel e licença dentro do método (`requireRole('technician', …)`).
- Sucesso só depois do "aceite"; o modelo só promove rascunho → confirmado com a resposta.
- Valores que o "agente" não expõe são `null` → interface mostra "Unavailable".
- Licença demo: ID com `crypto.getRandomValues` + checagem de unicidade + registro persistido; formato
  `PREFIX.<base64url(payload)>.<checksum>` com checksum só de integridade. Documente que **não é
  assinatura** e que produção assina no servidor.

## 10. Configuração versionada por seção

Guarde `sv[section]` (versão por seção). O formulário guarda a versão em que abriu; o `save` recusa com
`conflict` se a seção mudou. Versão global única faz uma categoria invalidar o rascunho de outra.
Guarde a configuração anterior para "Restaurar anterior". Exportação versionada sem segredos; importação
com prévia das diferenças antes de aplicar.
