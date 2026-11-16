/* AegisWall — editor 2D.
 *
 * Princípios de leveza aplicados neste arquivo:
 *  - nenhum laço contínuo: só há trabalho quando o operador age;
 *  - durante o arraste, apenas o elemento arrastado é reposicionado (1 vez por quadro);
 *    o estado e o restante da tela só mudam ao soltar;
 *  - cada conteúdo guarda uma "assinatura" e só é repintado quando ela muda;
 *  - o catálogo de fontes é virtualizado (só as linhas visíveis existem no DOM);
 *  - a área de Configurações é baixada na primeira vez que é aberta;
 *  - a prévia em movimento existe só para o item selecionado e é desligada ao perder a seleção.
 */
(function () {
  'use strict';

  const VW = window.VW;
  const I = VW.integracao;
  const $ = (s, r) => (r || document).querySelector(s);

  const MON_W = I.limites.monitor.largura;
  const MON_H = I.limites.monitor.altura;
  const MIN_W = 160, MIN_H = 90;
  const ALT_LINHA = 44;
  const TIPOS = {
    camera: { rot: 'Câmera', ic: 'i-camera' },
    mosaico: { rot: 'Mosaico', ic: 'i-mosaico' },
    web: { rot: 'Página web', ic: 'i-web' },
    youtube: { rot: 'YouTube', ic: 'i-youtube' },
    app: { rot: 'Aplicativo', ic: 'i-app' },
  };
  const CATEGORIAS = [['todas', 'Todas'], ['camera', 'Câmeras'], ['mosaico', 'Mosaicos'], ['web', 'Web'], ['youtube', 'YouTube'], ['app', 'Aplicativos']];
  const QUALIDADES = { baixa: { l: 256, a: 144, qps: 2 }, media: { l: 384, a: 216, qps: 5 }, alta: { l: 512, a: 288, qps: 10 } };

  const E = {
    sessao: null,
    rascunho: null,        // composição em edição
    aplicado: null,        // composição confirmada pela integração
    confirmadoEm: null,
    sel: null,
    hist: [], fut: [],
    visao: 'edicao',       // 'edicao' | 'confirmado'
    area: 'operacao',
    fontes: [], fontesPorId: new Map(), filtradas: [],
    categoria: 'todas', busca: '',
    saidas: new Set(),
    aplicando: false,
    pend: { n: 0, ids: new Set() },
    v: { esc: 0.1, ox: 0, oy: 0 },
    els: new Map(),
    arr: null,
    seq: 1,
    versaoLista: 0, janela: null, emUso: '',
    prefs: { animacoes: true, encaixe: true, qualidade: 'baixa', tema: 'escuro', falhaSimulada: false },
  };

  // ---------- utilidades ----------
  const clonar = (o) => JSON.parse(JSON.stringify(o));
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (id, cls) => '<svg class="ic ' + (cls || '') + '"><use href="#' + id + '"/></svg>';
  const hora = (d) => (d || new Date()).toLocaleTimeString('pt-BR');
  const nomeTela = (l, c) => String.fromCharCode(65 + l) + (c + 1);
  const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
  const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* armazenamento indisponível */ } };
  const ler = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (_) { return null; } };
  const comp = () => (E.visao === 'edicao' ? E.rascunho : E.aplicado);
  const achar = (c, id) => c.itens.find((i) => i.id === id);
  const px = (v) => Math.round(v * E.v.esc);

  // ---------- elementos ----------
  const el = {};
  ['tela-login', 'form-login', 'login-usuario', 'login-senha', 'login-erro', 'login-entrar', 'app', 'acoes-edicao',
    'btn-desfazer', 'btn-refazer', 'pendencias', 'btn-descartar', 'btn-aplicar', 'btn-layouts', 'btn-usuario', 'nome-usuario',
    'visao-operacao', 'visao-config', 'lateral', 'fontes-contagem', 'busca-fontes', 'categorias', 'lista-fontes', 'lista-espaco',
    'lista-janela', 'btn-lateral', 'btn-dividir', 'in-cols', 'in-linhas', 'grade-total', 'ver-edicao', 'ver-confirmado', 'btn-encaixe', 'btn-painel',
    'aviso-fora', 'palco', 'mundo', 'grade-fundo', 'itens', 'grade-linhas', 'alvo-solte', 'guia-v', 'guia-h', 'selecao', 'medida',
    'selo-visao', 'palco-vazio', 'rodape', 'painel', 'props', 'props-fim', 'bloco-previa', 'previa-canvas', 'previa-vazia',
    'previa-estado', 'previa-miniatura', 'previa-movimento', 'previa-qualidade', 'pop', 'avisos',
  ].forEach((id) => { el[id] = document.getElementById(id); });

  // ---------- avisos ----------
  function aviso(tipo, texto, ms) {
    const d = document.createElement('div');
    d.className = 'aviso ' + tipo;
    d.innerHTML = ic(tipo === 'ok' ? 'i-ok' : tipo === 'erro' ? 'i-alerta' : 'i-layouts') + '<p>' + escapar(texto) + '</p>' +
      '<button class="btn-icone" type="button" aria-label="Fechar aviso">' + ic('i-x') + '</button>';
    const fechar = () => { clearTimeout(t); d.remove(); };
    const t = setTimeout(fechar, ms || (tipo === 'erro' ? 9000 : 5000));
    d.querySelector('button').addEventListener('click', fechar);
    el.avisos.appendChild(d);
    while (el.avisos.children.length > 3) el.avisos.firstChild.remove();
  }

  // ---------- geometria na superfície lógica ----------
  function situacao(it, c) {
    const W = c.cols * MON_W, H = c.linhas * MON_H;
    if (it.x >= W || it.y >= H || it.x + it.w <= 0 || it.y + it.h <= 0) return 'fora';
    if (it.x < 0 || it.y < 0 || it.x + it.w > W || it.y + it.h > H) return 'parcial';
    return 'dentro';
  }
  function faixaTelas(it, c) {
    return {
      c0: limitar(Math.floor(it.x / MON_W), 0, c.cols - 1),
      c1: limitar(Math.ceil((it.x + it.w) / MON_W) - 1, 0, c.cols - 1),
      l0: limitar(Math.floor(it.y / MON_H), 0, c.linhas - 1),
      l1: limitar(Math.ceil((it.y + it.h) / MON_H) - 1, 0, c.linhas - 1),
    };
  }
  function onde(it, c) {
    if (situacao(it, c) === 'fora') return 'fora';
    const f = faixaTelas(it, c);
    const a = nomeTela(f.l0, f.c0), b = nomeTela(f.l1, f.c1);
    return a === b ? a : a + '–' + b;
  }
  function caber(it, alvo) {
    if (!it.proporcao) return alvo;
    const q = it.w / it.h;
    let w = alvo.w, h = w / q;
    if (h > alvo.h) { h = alvo.h; w = h * q; }
    return { x: alvo.x + (alvo.w - w) / 2, y: alvo.y + (alvo.h - h) / 2, w, h };
  }
  const arred = (r) => ({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) });
  function contarTelas(c) {
    let comSaida = 0;
    for (let l = 0; l < c.linhas; l++) for (let k = 0; k < c.cols; k++) if (E.saidas.has(l + ',' + k)) comSaida++;
    const total = c.cols * c.linhas;
    return { total, comSaida, planejadas: total - comSaida };
  }

  // Divisão interna de um monitor em quadrantes: [colunas, linhas]. Sem registro = monitor inteiro.
  const divDe = (c, l, k) => (c.div && c.div[l + ',' + k]) || [1, 1];
  function quadrante(c, l, k, i) {   // retângulo lógico do quadrante i (ordem de leitura) do monitor (l, k)
    const [dc, dl] = divDe(c, l, k), w = MON_W / dc, h = MON_H / dl;
    return { x: k * MON_W + (i % dc) * w, y: l * MON_H + Math.floor(i / dc) * h, w, h };
  }
  function quadranteEm(c, x, y) {    // quadrante que contém o ponto lógico (x, y)
    const k = limitar(Math.floor(x / MON_W), 0, c.cols - 1), l = limitar(Math.floor(y / MON_H), 0, c.linhas - 1);
    const [dc, dl] = divDe(c, l, k);
    const qc = limitar(Math.floor((x - k * MON_W) / (MON_W / dc)), 0, dc - 1), ql = limitar(Math.floor((y - l * MON_H) / (MON_H / dl)), 0, dl - 1);
    return quadrante(c, l, k, ql * dc + qc);
  }

  // ---------- histórico ----------
  let ultimoRotulo = '', ultimoTempo = 0;
  function mutar(rotulo, fn, agrupar) {
    if (E.aplicando) return;
    if (E.visao !== 'edicao') mudarVisao('edicao');
    const agora = Date.now();
    if (!(agrupar && rotulo === ultimoRotulo && agora - ultimoTempo < 900)) {
      E.hist.push(clonar(E.rascunho));
      if (E.hist.length > 60) E.hist.shift();
    }
    ultimoRotulo = rotulo; ultimoTempo = agora;
    E.fut.length = 0;
    fn(E.rascunho);
    // `base` guarda a grade anterior a uma sequência de mudanças de grade (para o ajuste proporcional).
    if (rotulo !== 'grade') delete E.rascunho.base;
    renderTudo();
  }
  function desfazer() {
    if (!E.hist.length || E.aplicando) return;
    if (E.visao !== 'edicao') mudarVisao('edicao');
    E.fut.push(clonar(E.rascunho));
    E.rascunho = E.hist.pop();
    aposHistorico();
  }
  function refazer() {
    if (!E.fut.length || E.aplicando) return;
    if (E.visao !== 'edicao') mudarVisao('edicao');
    E.hist.push(clonar(E.rascunho));
    E.rascunho = E.fut.pop();
    aposHistorico();
  }
  function aposHistorico() {
    ultimoRotulo = '';
    if (E.sel && !achar(E.rascunho, E.sel)) E.sel = null;
    renderTudo();
  }

  // ---------- pendências (rascunho × confirmado) ----------
  const assinar = (i) => [i.fonteId, i.x, i.y, i.w, i.h, i.fixado, i.proporcao, i.soConteudo, i.mosaico, i.link || ''].join(',');
  const assinarDiv = (c) => Object.keys(c.div || {}).sort().map((k) => k + ':' + c.div[k].join('x')).join('|');
  function calcularPendencias() {
    const a = E.aplicado, r = E.rascunho;
    let n = 0; const ids = new Set();
    if (a.cols !== r.cols || a.linhas !== r.linhas) n++;
    if (assinarDiv(a) !== assinarDiv(r)) n++;
    const antigos = new Map(a.itens.map((i) => [i.id, i]));
    for (const it of r.itens) {
      const o = antigos.get(it.id);
      if (!o) { n++; ids.add(it.id); } else { if (assinar(o) !== assinar(it)) { n++; ids.add(it.id); } antigos.delete(it.id); }
    }
    n += antigos.size;
    const emR = new Set(r.itens.map((i) => i.id)), emA = new Set(a.itens.map((i) => i.id));
    const ordemR = r.itens.filter((i) => emA.has(i.id)).map((i) => i.id).join();
    const ordemA = a.itens.filter((i) => emR.has(i.id)).map((i) => i.id).join();
    if (ordemR !== ordemA) n++;
    E.pend = { n, ids };
  }

  // ---------- visão (escala da prévia) ----------
  function calcularVisao() {
    const c = comp();
    const cw = el.palco.clientWidth, ch = el.palco.clientHeight;
    let x0 = 0, y0 = 0, x1 = c.cols * MON_W, y1 = c.linhas * MON_H;
    for (const it of c.itens) {
      if (it.x < x0) x0 = it.x; if (it.y < y0) y0 = it.y;
      if (it.x + it.w > x1) x1 = it.x + it.w; if (it.y + it.h > y1) y1 = it.y + it.h;
    }
    const margem = 30;
    const esc = Math.max(0.005, Math.min((cw - margem * 2) / (x1 - x0), (ch - margem * 2) / (y1 - y0)));
    E.v = { esc, ox: Math.round((cw - (x1 - x0) * esc) / 2 - x0 * esc), oy: Math.round((ch - (y1 - y0) * esc) / 2 - y0 * esc) };
    el.mundo.style.left = E.v.ox + 'px';
    el.mundo.style.top = E.v.oy + 'px';
  }

  // ---------- grade de monitores ----------
  let assGrade = '';
  function renderGrade() {
    const c = comp();
    const ass = c.cols + 'x' + c.linhas + '@' + E.v.esc + '#' + assinarDiv(c);
    if (ass === assGrade) return;
    assGrade = ass;
    const W = px(c.cols * MON_W), H = px(c.linhas * MON_H);
    el['grade-fundo'].style.width = W + 'px';
    el['grade-fundo'].style.height = H + 'px';
    let h = '';
    for (let l = 0; l < c.linhas; l++) {
      for (let k = 0; k < c.cols; k++) {
        const x = px(k * MON_W), y = px(l * MON_H);
        const planejada = !E.saidas.has(l + ',' + k);
        const [dc, dl] = divDe(c, l, k);
        let sub = '';
        for (let i = 1; i < dc; i++) sub += '<i class="sub sub-v" style="left:' + (100 * i) / dc + '%"></i>';
        for (let i = 1; i < dl; i++) sub += '<i class="sub sub-h" style="top:' + (100 * i) / dl + '%"></i>';
        h += '<div class="tela' + (planejada ? ' planejada' : '') + '" style="left:' + x + 'px;top:' + y + 'px;width:' +
          (px((k + 1) * MON_W) - x) + 'px;height:' + (px((l + 1) * MON_H) - y) + 'px">' + sub + '<span class="rot">' + nomeTela(l, k) + '</span></div>';
      }
    }
    el['grade-linhas'].innerHTML = h;
  }

  // ---------- conteúdos ----------
  function criarItem(it) {
    const d = document.createElement('div');
    d.className = 'item';
    d.dataset.id = it.id;
    d.innerHTML = '<span class="pend"></span><div class="item-titulo"><svg class="ic"><use/></svg><span class="nome"></span>' + ic('i-fixar', 'pino') +
      '</div><div class="item-sub"></div><span class="selo-fora"></span>';
    return d;
  }
  function pintarRet(d, r) {
    const l = px(r.x), t = px(r.y);
    d.style.left = l + 'px'; d.style.top = t + 'px';
    d.style.width = Math.max(4, px(r.x + r.w) - l) + 'px';
    d.style.height = Math.max(4, px(r.y + r.h) - t) + 'px';
  }
  function renderItens() {
    const c = comp();
    const emEdicao = E.visao === 'edicao';
    const vistos = new Set();
    c.itens.forEach((it, idx) => {
      vistos.add(it.id);
      let d = E.els.get(it.id);
      if (!d) { d = criarItem(it); E.els.set(it.id, d); el.itens.appendChild(d); }
      const sit = situacao(it, c);
      const pendente = emEdicao && E.pend.ids.has(it.id);
      const ass = [E.v.esc, it.x, it.y, it.w, it.h, idx, it.nome, it.tipo, it.mosaico, it.fixado, sit, pendente, it.id === E.sel].join('|');
      if (d._ass === ass) return;
      d._ass = ass;
      pintarRet(d, it);
      d.style.zIndex = idx + 1;
      const larg = it.w * E.v.esc, alt = it.h * E.v.esc;
      d.className = 'item' + (it.tipo === 'mosaico' ? ' mosaico' : '') + (it.fixado ? ' fixado' : '') + (sit !== 'dentro' ? ' fora' : '') +
        (pendente ? ' pendente' : '') + (it.id === E.sel ? ' selecionado' : '') + (larg < 110 || alt < 44 ? ' pequeno' : '');
      if (it.tipo === 'mosaico') d.style.setProperty('--n', it.mosaico);
      d.querySelector('use').setAttribute('href', '#' + TIPOS[it.tipo].ic);
      d.querySelector('.nome').textContent = it.nome;
      d.querySelector('.item-sub').textContent = it.tipo === 'mosaico'
        ? 'Mosaico interno ' + it.mosaico + '×' + it.mosaico + ' · ' + it.mosaico * it.mosaico + ' câmeras'
        : TIPOS[it.tipo].rot + ' · ' + it.w + ' × ' + it.h;
      d.querySelector('.selo-fora').textContent = sit === 'fora' ? 'Fora da área' : sit === 'parcial' ? 'Parcialmente fora' : '';
      d.title = it.nome;
    });
    for (const [id, d] of E.els) if (!vistos.has(id)) { d.remove(); E.els.delete(id); }
    el['palco-vazio'].hidden = c.itens.length > 0;
  }
  function renderSelecao() {
    const it = E.sel && E.visao === 'edicao' ? achar(E.rascunho, E.sel) : null;
    el.selecao.hidden = !it;
    if (!it) return;
    pintarRet(el.selecao, it);
    el.selecao.style.zIndex = 1000;
    el.selecao.classList.toggle('travada', !!it.fixado);
  }
  function renderCena() {
    calcularVisao();
    renderGrade();
    renderItens();
    renderSelecao();
    renderRodape();
  }

  // ---------- barra superior, campos e rodapé ----------
  function renderTopo() {
    const n = E.pend.n;
    el.pendencias.textContent = n ? plural(n, 'alteração pendente', 'alterações pendentes') : 'Sem alterações pendentes';
    el.pendencias.classList.toggle('tem', n > 0);
    el['btn-aplicar'].disabled = !n || E.aplicando;
    el['btn-aplicar'].textContent = E.aplicando ? 'Aplicando…' : 'Aplicar';
    el['btn-descartar'].disabled = !n || E.aplicando;
    el['btn-desfazer'].disabled = !E.hist.length || E.aplicando;
    el['btn-refazer'].disabled = !E.fut.length || E.aplicando;
    el.palco.classList.toggle('ocupado', E.aplicando);
  }
  function renderCampos() {
    const c = comp(), L = I.limites, ro = E.visao !== 'edicao';
    el['in-cols'].value = c.cols; el['in-linhas'].value = c.linhas;
    el['in-cols'].max = L.maxColunas; el['in-linhas'].max = L.maxLinhas;
    el['in-cols'].disabled = el['in-linhas'].disabled = el['btn-dividir'].disabled = ro;
    document.querySelectorAll('[data-passo]').forEach((b) => {
      const v = b.dataset.passo === 'cols' ? c.cols : c.linhas;
      const max = b.dataset.passo === 'cols' ? L.maxColunas : L.maxLinhas;
      b.disabled = ro || (b.dataset.d === '-1' ? v <= 1 : v >= max);
    });
    const t = contarTelas(c);
    el['grade-total'].innerHTML = '= <b>' + plural(t.total, 'monitor', 'monitores') + '</b>' +
      (t.planejadas ? ' · ' + plural(t.planejadas, 'planejado', 'planejados') : '');
    el['ver-edicao'].classList.toggle('ativa', !ro);
    el['ver-confirmado'].classList.toggle('ativa', ro);
    el.palco.classList.toggle('somente-leitura', ro);
    el['selo-visao'].textContent = ro ? 'No ar · confirmado às ' + hora(E.confirmadoEm) : 'Em edição · rascunho';
  }
  function renderRodape() {
    const c = comp(), t = contarTelas(c);
    el.rodape.innerHTML =
      '<span>Superfície lógica <b>' + c.cols * MON_W + ' × ' + c.linhas * MON_H + ' px</b></span>' +
      '<span>Escala da prévia <b>' + (E.v.esc * 100).toFixed(1).replace('.', ',') + '%</b></span>' +
      '<span>Telas <b>' + t.total + '</b> · com saída <b>' + t.comSaida + '</b> · planejadas <b>' + t.planejadas + '</b></span>' +
      '<span>Conteúdos <b>' + c.itens.length + '</b></span>' +
      '<span>Última confirmação <b>' + hora(E.confirmadoEm) + '</b></span>';
  }
  let assAvisoFora = '';
  function renderAvisoFora() {
    const r = E.rascunho;
    const fora = E.visao === 'edicao' ? r.itens.filter((i) => situacao(i, r) !== 'dentro').length : 0;
    const g = r.base;
    const ass = fora + '|' + (g ? g.cols + 'x' + g.linhas : '');
    if (ass === assAvisoFora) return;
    const alturaAntes = el['aviso-fora'].hidden;
    assAvisoFora = ass;
    el['aviso-fora'].hidden = !fora;
    if (fora) {
      el['aviso-fora'].innerHTML = ic('i-alerta') + '<span>' + plural(fora, 'conteúdo está', 'conteúdos estão') +
        ' fora da área do videowall. Nada foi removido nem encerrado.</span>' +
        '<button class="btn" type="button" data-fora="dentro">Trazer para dentro</button>' +
        (g ? '<button class="btn" type="button" data-fora="proporcional" title="Reescala todos os conteúdos de ' + g.cols + '×' + g.linhas +
          ' para ' + r.cols + '×' + r.linhas + '">Ajustar proporcionalmente</button>' : '') +
        '<button class="btn" type="button" data-fora="desfazer">Desfazer</button>';
    }
    return alturaAntes !== el['aviso-fora'].hidden;
  }

  // ---------- painel contextual ----------
  function campoNum(rot, prop, v, desab) {
    return '<label class="campo-num"><span>' + rot + '</span><input type="number" step="1" data-prop="' + prop + '" value="' + v + '"' + (desab ? ' disabled' : '') + '></label>';
  }
  function opcao(rot, chave, ligado, nota, desab) {
    return '<label class="opcao"><span>' + rot + '</span><input class="interruptor" type="checkbox" data-alt="' + chave + '"' +
      (ligado ? ' checked' : '') + (desab ? ' disabled' : '') + '><small>' + nota + '</small></label>';
  }
  function renderPainel() {
    const foco = document.activeElement && el.painel.contains(document.activeElement) ? document.activeElement.dataset.prop : null;
    const c = comp();
    const it = E.sel && E.visao === 'edicao' ? achar(c, E.sel) : null;
    let h = '', fim = '';
    if (it) {
      const sit = situacao(it, c), fx = it.fixado;
      h += '<div class="bloco"><div class="bloco-titulo">' + ic(TIPOS[it.tipo].ic) + '<div><strong>' + escapar(it.nome) + '</strong>' +
        '<span class="discreto">' + TIPOS[it.tipo].rot + ' · ' + (sit === 'fora' ? 'fora do videowall' : 'telas ' + onde(it, c)) + '</span></div></div>' +
        (sit !== 'dentro' ? '<span class="selo selo-demo" style="justify-self:start">' + (sit === 'fora' ? 'Fora da área' : 'Parcialmente fora da área') + '</span>' : '') +
        '</div>';
      h += '<div class="bloco"><h3>Posição e tamanho</h3>' +
        '<div class="grade-2">' + campoNum('X', 'x', it.x, fx) + campoNum('Y', 'y', it.y, fx) + campoNum('L', 'w', it.w, fx) + campoNum('A', 'h', it.h, fx) + '</div>' +
        '<p class="nota">Pixels na superfície lógica, independentes da escala da prévia.</p>' +
        '<div class="linha-botoes">' +
        '<button class="btn" type="button" data-acao="monitor"' + (fx ? ' disabled' : '') + '>Ajustar ao monitor</button>' +
        '<button class="btn" type="button" data-acao="telas"' + (fx ? ' disabled' : '') + '>Preencher telas</button>' +
        '<button class="btn" type="button" data-acao="tudo"' + (fx ? ' disabled' : '') + '>Videowall inteiro</button></div>' +
        opcao('Manter proporção', 'proporcao', it.proporcao, 'Redimensiona e ajusta sem deformar a imagem.') +
        opcao('Fixar', 'fixado', it.fixado, 'Impede mover ou redimensionar por engano.') +
        '</div>';
      if (it.tipo === 'mosaico') {
        h += '<div class="bloco"><h3>Mosaico interno</h3><label class="campo-linha"><span>Divisão</span><select data-mosaico>' +
          [2, 3, 4].map((n) => '<option value="' + n + '"' + (n === it.mosaico ? ' selected' : '') + '>' + n + ' × ' + n + ' · ' + n * n + ' câmeras</option>').join('') +
          '</select></label><p class="nota">Divide este conteúdo por dentro. Não altera a grade de monitores físicos.</p></div>';
      }
      if (it.tipo === 'app' || it.tipo === 'web') {
        h += '<div class="bloco"><h3>Janela de origem <span class="selo selo-demo">simulado</span></h3>' +
          opcao('Somente área de conteúdo', 'soConteudo', it.soConteudo, 'Oculta título e bordas da janela. Depende do que a integração permitir.') + '</div>';
      }
      const lk = analisarLink(it.link);
      h += '<div class="bloco"><h3>Link</h3><input type="url" data-link value="' + escapar(it.link || '') +
        '" placeholder="https://…" spellcheck="false" aria-label="Link do conteúdo"><p class="nota">' +
        (lk ? lk.nota : 'Cole o endereço do YouTube, da página ou da câmera para rodá-lo na prévia abaixo.') + '</p></div>';
      fim = '<div class="bloco"><h3>Ordem e remoção</h3><div class="linha-botoes">' +
        '<button class="btn" type="button" data-acao="frente">Trazer para frente</button>' +
        '<button class="btn" type="button" data-acao="tras">Enviar para trás</button></div>' +
        '<button class="btn btn-perigo" type="button" data-acao="remover">' + ic('i-lixeira') + 'Remover do videowall</button>' +
        '<p class="nota">A fonte continua no catálogo e o aplicativo de origem não é encerrado.</p></div>';
    } else {
      const t = contarTelas(c), ro = E.visao !== 'edicao';
      h += '<div class="bloco"><div class="bloco-titulo">' + ic('i-layouts') + '<div><strong>Videowall</strong><span class="discreto">' +
        (ro ? 'Composição confirmada nas telas' : 'Composição em edição') + '</span></div></div>' +
        '<dl class="dados"><dt>Grade</dt><dd>' + c.cols + ' × ' + c.linhas + '</dd><dt>Monitores</dt><dd>' + t.total + '</dd>' +
        '<dt>Superfície lógica</dt><dd>' + c.cols * MON_W + ' × ' + c.linhas * MON_H + '</dd>' +
        '<dt>Cada monitor</dt><dd>' + MON_W + ' × ' + MON_H + '</dd>' +
        '<dt>Saídas disponíveis</dt><dd>' + E.saidas.size + '</dd><dt>Telas planejadas</dt><dd>' + t.planejadas + '</dd></dl>' +
        (t.planejadas ? '<p class="nota">Telas planejadas (tracejadas) ainda não têm saída no sistema conectado: o conteúdo nelas não será exibido.</p>' : '') +
        (ro ? '<p class="nota">Somente leitura. Para alterar, volte para <b>Em edição</b>.</p>' : '') + '</div>';
      h += '<div class="bloco"><h3>Conteúdos · ' + c.itens.length + '</h3>';
      if (c.itens.length) {
        h += '<ul class="lista-conteudos">' + c.itens.slice().reverse().map((i) => {
          const o = onde(i, c), parc = situacao(i, c) === 'parcial';
          return '<li><button type="button" data-sel="' + i.id + '"' + (ro ? ' disabled' : '') + '>' + ic(TIPOS[i.tipo].ic) + '<span class="nome">' + escapar(i.nome) +
            '</span><span class="onde' + (o === 'fora' || parc ? ' fora' : '') + '">' + o + (parc ? ' ⚠' : '') + '</span></button></li>';
        }).join('') + '</ul>';
      } else {
        h += '<p class="nota">Nenhum conteúdo. Arraste uma fonte da lista para um monitor.</p>';
      }
      h += '</div>';
    }
    el.props.innerHTML = h;
    el['props-fim'].innerHTML = fim;
    if (foco) { const alvo = el.props.querySelector('[data-prop="' + foco + '"]'); if (alvo) alvo.focus(); }
    sincronizarPrevia(it);
  }

  // ---------- render geral ----------
  function renderTudo() {
    calcularPendencias();
    renderTopo();
    renderCampos();
    renderAvisoFora();   // pode mudar a altura do palco; por isso vem antes da cena
    renderCena();
    renderPainel();
    const emUso = E.rascunho.itens.map((i) => i.fonteId).sort().join();
    if (emUso !== E.emUso) { E.emUso = emUso; E.versaoLista++; renderLista(); }
  }

  function selecionar(id) {
    if (E.sel === id) return;
    E.sel = id;
    renderItens(); renderSelecao(); renderPainel();
  }

  function mudarVisao(v) {
    if (E.visao === v) return;
    E.visao = v;
    E.sel = null;
    renderTudo();
  }

  // ---------- encaixe e arraste ----------
  function linhasEncaixe(ignorar) {
    const r = E.rascunho, xs = [], ys = [];
    for (let c = 0; c <= r.cols; c++) xs.push(c * MON_W);
    for (let l = 0; l <= r.linhas; l++) ys.push(l * MON_H);
    for (const it of r.itens) if (it.id !== ignorar) { xs.push(it.x, it.x + it.w); ys.push(it.y, it.y + it.h); }
    for (const ch in r.div || {}) {
      const [l, k] = ch.split(',').map(Number), [dc, dl] = r.div[ch];
      if (l >= r.linhas || k >= r.cols) continue;
      for (let i = 1; i < dc; i++) xs.push(k * MON_W + (i * MON_W) / dc);
      for (let i = 1; i < dl; i++) ys.push(l * MON_H + (i * MON_H) / dl);
    }
    return { xs, ys };
  }
  function encaixar(v, linhas, tol) {
    let melhor = null, d = tol;
    for (const l of linhas) { const dd = Math.abs(l - v); if (dd <= d) { d = dd; melhor = l; } }
    return melhor;
  }
  function calcMover(a, dx, dy, enc) {
    const w = a.r0.w, h = a.r0.h, g = { x: null, y: null };
    let x = a.r0.x + dx, y = a.r0.y + dy;
    if (enc) {
      const tol = 8 / E.v.esc;
      const e1 = encaixar(x, a.linhas.xs, tol), e2 = encaixar(x + w, a.linhas.xs, tol);
      if (e1 != null && (e2 == null || Math.abs(e1 - x) <= Math.abs(e2 - x - w))) { x = e1; g.x = e1; } else if (e2 != null) { x = e2 - w; g.x = e2; }
      const f1 = encaixar(y, a.linhas.ys, tol), f2 = encaixar(y + h, a.linhas.ys, tol);
      if (f1 != null && (f2 == null || Math.abs(f1 - y) <= Math.abs(f2 - y - h))) { y = f1; g.y = f1; } else if (f2 != null) { y = f2 - h; g.y = f2; }
    }
    const W = E.rascunho.cols * MON_W, H = E.rascunho.linhas * MON_H;
    x = limitar(x, -w - MON_W, W + MON_W); y = limitar(y, -h - MON_H, H + MON_H);
    return { r: { x, y, w, h }, g };
  }
  function calcRedim(a, dx, dy, enc) {
    const r0 = a.r0, d = a.modo, g = { x: null, y: null };
    let L = r0.x, T = r0.y, R = r0.x + r0.w, B = r0.y + r0.h;
    const oeste = d.includes('w'), leste = d.includes('e'), norte = d.includes('n'), sul = d.includes('s');
    if (oeste) L += dx; if (leste) R += dx; if (norte) T += dy; if (sul) B += dy;
    if (enc) {
      const tol = 8 / E.v.esc; let s;
      if (oeste && (s = encaixar(L, a.linhas.xs, tol)) != null) { L = s; g.x = s; }
      if (leste && (s = encaixar(R, a.linhas.xs, tol)) != null) { R = s; g.x = s; }
      if (norte && (s = encaixar(T, a.linhas.ys, tol)) != null) { T = s; g.y = s; }
      if (sul && (s = encaixar(B, a.linhas.ys, tol)) != null) { B = s; g.y = s; }
    }
    if (oeste) L = Math.min(L, R - MIN_W); else if (leste) R = Math.max(R, L + MIN_W);
    if (norte) T = Math.min(T, B - MIN_H); else if (sul) B = Math.max(B, T + MIN_H);
    if (a.prop) {
      const q = r0.w / r0.h;
      let w = R - L, h = B - T;
      if (d === 'e' || d === 'w') { h = w / q; T = r0.y + r0.h / 2 - h / 2; B = T + h; g.y = null; }
      else if (d === 'n' || d === 's') { w = h * q; L = r0.x + r0.w / 2 - w / 2; R = L + w; g.x = null; }
      else {
        if (Math.abs(w - r0.w) / r0.w >= Math.abs(h - r0.h) / r0.h) { h = w / q; g.y = null; } else { w = h * q; g.x = null; }
        if (oeste) L = R - w; else R = L + w;
        if (norte) T = B - h; else B = T + h;
      }
    }
    return { r: { x: L, y: T, w: R - L, h: B - T }, g };
  }
  function iniciarArraste(e, it, modo) {
    E.arr = {
      id: it.id, modo, pid: e.pointerId, px: e.clientX, py: e.clientY, cx: e.clientX, cy: e.clientY, alt: e.altKey,
      r0: { x: it.x, y: it.y, w: it.w, h: it.h }, r: null, moveu: false, quadro: 0, linhas: linhasEncaixe(it.id), prop: it.proporcao,
    };
    try { el.palco.setPointerCapture(e.pointerId); } catch (_) { /* ponteiro já liberado */ }
  }
  function quadroArraste() {
    const a = E.arr;
    if (!a) return;
    a.quadro = 0;
    const dxs = a.cx - a.px, dys = a.cy - a.py;
    const d = E.els.get(a.id);
    if (!a.moveu) {
      if (Math.abs(dxs) < 3 && Math.abs(dys) < 3) return;
      a.moveu = true;
      if (d) d.classList.add('arrastando');
    }
    const enc = E.prefs.encaixe && !a.alt;
    const res = a.modo === 'mover' ? calcMover(a, dxs / E.v.esc, dys / E.v.esc, enc) : calcRedim(a, dxs / E.v.esc, dys / E.v.esc, enc);
    a.r = res.r;
    if (d) pintarRet(d, res.r);
    pintarRet(el.selecao, res.r);
    el['guia-v'].hidden = res.g.x == null;
    if (res.g.x != null) { el['guia-v'].style.left = px(res.g.x) + 'px'; el['guia-v'].style.top = '-4000px'; el['guia-v'].style.height = '12000px'; }
    el['guia-h'].hidden = res.g.y == null;
    if (res.g.y != null) { el['guia-h'].style.top = px(res.g.y) + 'px'; el['guia-h'].style.left = '-4000px'; el['guia-h'].style.width = '12000px'; }
    const q = arred(res.r);
    el.medida.hidden = false;
    el.medida.textContent = 'X ' + q.x + ' · Y ' + q.y + ' · ' + q.w + ' × ' + q.h;
  }
  function fimArraste(cancelar) {
    const a = E.arr;
    if (!a) return;
    E.arr = null;
    if (a.quadro) cancelAnimationFrame(a.quadro);
    try { el.palco.releasePointerCapture(a.pid); } catch (_) { /* já liberado */ }
    el['guia-v'].hidden = el['guia-h'].hidden = el.medida.hidden = true;
    const d = E.els.get(a.id);
    if (d) { d.classList.remove('arrastando'); d._ass = null; }
    if (!cancelar && a.moveu && a.r) {
      const q = arred(a.r), r0 = a.r0;
      if (q.x !== r0.x || q.y !== r0.y || q.w !== r0.w || q.h !== r0.h) {
        // Único ponto em que o arraste altera o estado: uma mudança por gesto.
        mutar(a.modo === 'mover' ? 'mover' : 'redimensionar', (r) => Object.assign(achar(r, a.id), q));
        return;
      }
    }
    renderCena();
  }

  el.itens.addEventListener('pointerdown', (e) => {
    const d = e.target.closest('.item');
    if (!d || E.visao !== 'edicao' || E.aplicando) return;
    selecionar(d.dataset.id);
    const it = achar(E.rascunho, d.dataset.id);
    if (it && !it.fixado && e.button === 0) iniciarArraste(e, it, 'mover');
  });
  el.selecao.addEventListener('pointerdown', (e) => {
    const alca = e.target.closest('.alca');
    const it = E.sel && achar(E.rascunho, E.sel);
    if (!alca || !it || it.fixado || e.button !== 0) return;
    e.stopPropagation();
    iniciarArraste(e, it, alca.dataset.d);
  });
  el.palco.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('.item') && !e.target.closest('.alca')) selecionar(null);
  });
  el.palco.addEventListener('pointermove', (e) => {
    const a = E.arr;
    if (!a || e.pointerId !== a.pid) return;
    a.cx = e.clientX; a.cy = e.clientY; a.alt = e.altKey;
    if (!a.quadro) a.quadro = requestAnimationFrame(quadroArraste);
  });
  el.palco.addEventListener('pointerup', () => { if (E.arr) { if (E.arr.quadro) { cancelAnimationFrame(E.arr.quadro); quadroArraste(); } fimArraste(false); } });
  el.palco.addEventListener('pointercancel', () => fimArraste(true));

  // ---------- ações sobre conteúdos ----------
  function primeiroEspacoLivre() {
    const r = E.rascunho;
    // 1ª passada: quadrante (ou monitor inteiro) sem nenhum conteúdo. 2ª: com o centro livre.
    for (const passada of [0, 1]) {
      for (let l = 0; l < r.linhas; l++) {
        for (let k = 0; k < r.cols; k++) {
          const [dc, dl] = divDe(r, l, k);
          for (let i = 0; i < dc * dl; i++) {
            const q = quadrante(r, l, k, i);
            const m = passada ? { x: q.x + q.w / 2 - 1, y: q.y + q.h / 2 - 1, w: 2, h: 2 } : q;
            if (!r.itens.some((it) => it.x < m.x + m.w && it.x + it.w > m.x && it.y < m.y + m.h && it.y + it.h > m.y)) return q;
          }
        }
      }
    }
    return quadrante(r, 0, 0, 0);
  }
  function adicionarFonte(fonteId, alvo) {
    const f = E.fontesPorId.get(fonteId);
    if (!f || E.aplicando) return;
    if (E.visao !== 'edicao') { mudarVisao('edicao'); aviso('info', 'Voltamos para a composição em edição para adicionar a fonte.'); }
    const q = alvo || primeiroEspacoLivre();
    const id = 'i' + Date.now().toString(36) + E.seq++;
    mutar('adicionar', (r) => {
      r.itens.push({
        id, fonteId: f.id, nome: f.nome, tipo: f.tipo, x: q.x, y: q.y, w: q.w, h: q.h,
        proporcao: f.tipo === 'camera' || f.tipo === 'youtube', fixado: false, soConteudo: false, mosaico: f.mosaico || 1,
      });
      E.sel = id;
    });
  }
  function removerSelecionado() {
    if (!E.sel || !achar(E.rascunho, E.sel)) return;
    const id = E.sel;
    mutar('remover', (r) => { r.itens = r.itens.filter((i) => i.id !== id); E.sel = null; });
  }
  function acaoItem(acao) {
    const it = E.sel && achar(E.rascunho, E.sel);
    if (!it) return;
    const r = E.rascunho, id = it.id;
    if (acao === 'remover') return removerSelecionado();
    if (acao === 'frente' || acao === 'tras') {
      return mutar('ordem', (d) => {
        const i = d.itens.findIndex((x) => x.id === id), [x] = d.itens.splice(i, 1);
        if (acao === 'frente') d.itens.push(x); else d.itens.unshift(x);
      });
    }
    let alvo;
    if (acao === 'tudo') alvo = { x: 0, y: 0, w: r.cols * MON_W, h: r.linhas * MON_H };
    else if (acao === 'telas') {
      const f = faixaTelas(it, r);
      alvo = { x: f.c0 * MON_W, y: f.l0 * MON_H, w: (f.c1 - f.c0 + 1) * MON_W, h: (f.l1 - f.l0 + 1) * MON_H };
    } else {
      alvo = quadranteEm(r, it.x + it.w / 2, it.y + it.h / 2);   // o monitor, ou o quadrante se ele estiver dividido
    }
    const q = arred(caber(it, alvo));
    mutar('ajustar', (d) => Object.assign(achar(d, id), q));
  }
  function trazerParaDentro() {
    mutar('dentro', (r) => {
      const W = r.cols * MON_W, H = r.linhas * MON_H;
      for (const it of r.itens) {
        if (situacao(it, r) === 'dentro') continue;
        if (it.proporcao) { const f = Math.min(1, W / it.w, H / it.h); it.w = Math.round(it.w * f); it.h = Math.round(it.h * f); }
        else { it.w = Math.min(it.w, W); it.h = Math.min(it.h, H); }
        it.x = limitar(it.x, 0, W - it.w); it.y = limitar(it.y, 0, H - it.h);
      }
    });
  }
  function ajusteProporcional() {
    const g = E.rascunho.base;
    if (!g) return;
    mutar('proporcional', (r) => {
      const fx = r.cols / g.cols, fy = r.linhas / g.linhas;
      for (const it of r.itens) Object.assign(it, arred({ x: it.x * fx, y: it.y * fy, w: it.w * fx, h: it.h * fy }));
    });
  }

  el.painel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.acao) acaoItem(b.dataset.acao);
    else if (b.dataset.sel) selecionar(b.dataset.sel);
  });
  el.painel.addEventListener('change', (e) => {
    const t = e.target, it = E.sel && achar(E.rascunho, E.sel);
    if (!it) return;
    const id = it.id;
    if (t.hasAttribute('data-link')) {
      let v = t.value.trim();
      if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
      if ((it.link || '') === v) return renderPainel();
      return mutar('link', (r) => { const x = achar(r, id); if (v) x.link = v; else delete x.link; });
    }
    if (t.dataset.prop) {
      const p = t.dataset.prop;
      let v = Math.round(Number(t.value));
      if (!Number.isFinite(v)) return renderPainel();
      if (p === 'w') v = Math.max(MIN_W, v);
      if (p === 'h') v = Math.max(MIN_H, v);
      const q = it.w / it.h;
      mutar('numerico', (r) => {
        const x = achar(r, id);
        x[p] = v;
        if (x.proporcao && p === 'w') x.h = Math.round(v / q);
        if (x.proporcao && p === 'h') x.w = Math.round(v * q);
      });
    } else if (t.dataset.alt) {
      const k = t.dataset.alt;
      mutar('opcao', (r) => { achar(r, id)[k] = t.checked; });
    } else if (t.hasAttribute('data-mosaico')) {
      mutar('mosaico', (r) => { achar(r, id).mosaico = Number(t.value); });
    }
  });
  el['aviso-fora'].addEventListener('click', (e) => {
    const b = e.target.closest('[data-fora]');
    if (!b) return;
    if (b.dataset.fora === 'dentro') trazerParaDentro();
    else if (b.dataset.fora === 'proporcional') ajusteProporcional();
    else desfazer();
  });

  // ---------- grade interativa ----------
  function alterarGrade(cols, linhas) {
    const L = I.limites, r = E.rascunho;
    cols = Math.round(Number(cols)); linhas = Math.round(Number(linhas));
    if (!Number.isFinite(cols) || cols < 1) cols = 1;
    if (!Number.isFinite(linhas) || linhas < 1) linhas = 1;
    if (cols > L.maxColunas || linhas > L.maxLinhas) {
      cols = Math.min(cols, L.maxColunas); linhas = Math.min(linhas, L.maxLinhas);
      aviso('info', 'Limite informado pela integração (simulado): ' + L.maxColunas + ' colunas por ' + L.maxLinhas + ' linhas.');
    }
    if (cols === r.cols && linhas === r.linhas) return renderCampos();
    mutar('grade', (d) => {
      const base = d.base || { cols: d.cols, linhas: d.linhas };
      d.cols = cols; d.linhas = linhas;
      if (base.cols === cols && base.linhas === linhas) delete d.base; else d.base = base;
    });
    const f = el['grade-fundo'];
    f.classList.remove('mudou'); void f.offsetWidth; f.classList.add('mudou');
  }
  el['grade-fundo'].addEventListener('animationend', () => el['grade-fundo'].classList.remove('mudou'));
  document.querySelectorAll('[data-passo]').forEach((b) => b.addEventListener('click', () => {
    const r = E.rascunho, d = Number(b.dataset.d);
    if (b.dataset.passo === 'cols') alterarGrade(r.cols + d, r.linhas); else alterarGrade(r.cols, r.linhas + d);
  }));
  el['in-cols'].addEventListener('change', () => alterarGrade(el['in-cols'].value, E.rascunho.linhas));
  el['in-linhas'].addEventListener('change', () => alterarGrade(E.rascunho.cols, el['in-linhas'].value));

  // ---------- catálogo de fontes (virtualizado) ----------
  function filtrarFontes() {
    const q = normalizar(E.busca.trim());
    E.filtradas = E.fontes.filter((f) => (E.categoria === 'todas' || f.tipo === E.categoria) && (!q || f._busca.includes(q)));
    el['lista-espaco'].style.height = E.filtradas.length * ALT_LINHA + 'px';
    el['lista-fontes'].scrollTop = 0;
    el['fontes-contagem'].textContent = q || E.categoria !== 'todas'
      ? plural(E.filtradas.length, 'resultado', 'resultados') : plural(E.fontes.length, 'fonte', 'fontes');
    E.versaoLista++;
    renderLista();
  }
  function renderLista() {
    const lista = el['lista-fontes'];
    const topo = lista.scrollTop, alt = lista.clientHeight || 480, n = E.filtradas.length;
    const ini = Math.max(0, Math.floor(topo / ALT_LINHA) - 4), fim = Math.min(n, Math.ceil((topo + alt) / ALT_LINHA) + 4);
    const chave = ini + ':' + fim + ':' + E.versaoLista;
    if (chave === E.janela) return;
    E.janela = chave;
    if (!n) { el['lista-janela'].style.transform = ''; el['lista-janela'].innerHTML = '<p class="lista-vazia">Nenhuma fonte encontrada.</p>'; return; }
    const usadas = new Set(E.rascunho ? E.rascunho.itens.map((i) => i.fonteId) : []);
    let h = '';
    for (let i = ini; i < fim; i++) {
      const f = E.filtradas[i];
      h += '<div class="fonte' + (usadas.has(f.id) ? ' em-uso' : '') + '" draggable="true" data-id="' + f.id + '">' + ic(TIPOS[f.tipo].ic) +
        '<div class="fonte-texto"><b>' + escapar(f.nome) + '</b><span>' + escapar(f.detalhe) + '</span></div>' +
        '<button class="btn-icone" type="button" data-add="' + f.id + '" title="Adicionar ao videowall" aria-label="Adicionar ' + escapar(f.nome) + ' ao videowall">' + ic('i-mais') + '</button></div>';
    }
    el['lista-janela'].style.transform = 'translateY(' + ini * ALT_LINHA + 'px)';
    el['lista-janela'].innerHTML = h;
  }
  let rolagemAgendada = 0;
  el['lista-fontes'].addEventListener('scroll', () => {
    if (!rolagemAgendada) rolagemAgendada = requestAnimationFrame(() => { rolagemAgendada = 0; renderLista(); });
  }, { passive: true });
  el['lista-fontes'].addEventListener('click', (e) => {
    const b = e.target.closest('[data-add]');
    if (b) adicionarFonte(b.dataset.add);
  });
  el['lista-fontes'].addEventListener('dblclick', (e) => {
    const f = e.target.closest('.fonte');
    if (f && !e.target.closest('[data-add]')) adicionarFonte(f.dataset.id);
  });
  let esperaBusca = 0;
  el['busca-fontes'].addEventListener('input', () => {
    clearTimeout(esperaBusca);
    esperaBusca = setTimeout(() => { E.busca = el['busca-fontes'].value; filtrarFontes(); }, 120);
  });
  el.categorias.innerHTML = CATEGORIAS.map(([k, r]) => '<button type="button" role="tab" data-cat="' + k + '" aria-selected="' + (k === 'todas') + '">' + r + '</button>').join('');
  el.categorias.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    E.categoria = b.dataset.cat;
    el.categorias.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b));
    filtrarFontes();
  });

  // Arrastar da lista e soltar sobre um monitor.
  let arrastandoFonte = null, telaAlvo = '';
  function quadranteSob(e) {
    const r = el.mundo.getBoundingClientRect();
    return quadranteEm(E.rascunho, (e.clientX - r.left) / E.v.esc, (e.clientY - r.top) / E.v.esc);
  }
  el['lista-fontes'].addEventListener('dragstart', (e) => {
    const f = e.target.closest('.fonte');
    if (!f) return;
    arrastandoFonte = f.dataset.id;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', f.dataset.id);
  });
  el['lista-fontes'].addEventListener('dragend', () => { arrastandoFonte = null; telaAlvo = ''; el['alvo-solte'].hidden = true; });
  el.palco.addEventListener('dragover', (e) => {
    if (!arrastandoFonte || E.visao !== 'edicao' || E.aplicando) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const q = quadranteSob(e), chave = q.x + ',' + q.y;
    if (chave === telaAlvo) return;
    telaAlvo = chave;
    el['alvo-solte'].hidden = false;
    el['alvo-solte'].style.zIndex = 999;
    pintarRet(el['alvo-solte'], q);
  });
  el.palco.addEventListener('dragleave', (e) => {
    if (e.relatedTarget && el.palco.contains(e.relatedTarget)) return;
    telaAlvo = ''; el['alvo-solte'].hidden = true;
  });
  el.palco.addEventListener('drop', (e) => {
    if (!arrastandoFonte) return;
    e.preventDefault();
    const q = quadranteSob(e), id = arrastandoFonte;
    arrastandoFonte = null; telaAlvo = ''; el['alvo-solte'].hidden = true;
    adicionarFonte(id, q);
  });

  // ---------- popover ----------
  let popAncora = null;
  function fecharPop() { el.pop.hidden = true; el.pop.innerHTML = ''; el.pop.onclick = el.pop.onsubmit = null; popAncora = null; }
  function abrirPop(ancora, html, aoMontar) {
    if (popAncora === ancora) return fecharPop();
    el.pop.innerHTML = html;
    el.pop.hidden = false;
    popAncora = ancora;
    const r = ancora.getBoundingClientRect(), w = el.pop.offsetWidth;
    el.pop.style.top = r.bottom + 6 + 'px';
    el.pop.style.left = limitar(r.right - w, 8, Math.max(8, innerWidth - w - 8)) + 'px';
    if (aoMontar) aoMontar(el.pop);
  }
  document.addEventListener('pointerdown', (e) => {
    if (popAncora && !el.pop.contains(e.target) && !popAncora.contains(e.target)) fecharPop();
  });

  // ---------- aplicar e descartar ----------
  function avisosAplicacao() {
    const r = E.rascunho, a = [];
    const fora = r.itens.filter((i) => situacao(i, r) !== 'dentro').length;
    if (fora) a.push(plural(fora, 'conteúdo fora da área não aparecerá', 'conteúdos fora da área não aparecerão') + ' por completo.');
    let semSaida = 0;
    for (let l = 0; l < r.linhas; l++) {
      for (let c = 0; c < r.cols; c++) {
        if (E.saidas.has(l + ',' + c)) continue;
        const x = c * MON_W, y = l * MON_H;
        if (r.itens.some((i) => i.x < x + MON_W && i.x + i.w > x && i.y < y + MON_H && i.y + i.h > y)) semSaida++;
      }
    }
    if (semSaida) a.push(plural(semSaida, 'tela planejada com conteúdo não tem', 'telas planejadas com conteúdo não têm') + ' saída disponível.');
    return a;
  }
  async function aplicar(confirmado) {
    if (!E.pend.n || E.aplicando) return;
    const avisos = avisosAplicacao();
    if (avisos.length && !confirmado) {
      return abrirPop(el['btn-aplicar'], '<h3>Aplicar com ressalvas</h3><ul class="pop-avisos">' + avisos.map((t) => '<li>' + escapar(t) + '</li>').join('') +
        '</ul><div class="pop-linha" style="justify-content:flex-end"><button class="btn" type="button" data-pop="cancelar">Cancelar</button>' +
        '<button class="btn btn-primario" type="button" data-pop="aplicar">Aplicar mesmo assim</button></div>', (p) => {
        p.querySelector('[data-pop="cancelar"]').addEventListener('click', fecharPop);
        p.querySelector('[data-pop="aplicar"]').addEventListener('click', () => { fecharPop(); aplicar(true); });
      });
    }
    fecharPop();
    E.aplicando = true;
    const envio = clonar(E.rascunho);
    delete envio.base;
    renderTopo();
    try {
      // O sucesso só é mostrado depois que a integração devolve a confirmação.
      const resp = await I.aplicarComposicao(envio, { falhar: E.prefs.falhaSimulada });
      E.aplicado = envio;
      delete E.rascunho.base;
      E.confirmadoEm = resp.confirmadoEm || new Date();
      aviso('ok', 'Composição confirmada às ' + hora(E.confirmadoEm) + ' pelo ' + resp.origem + '.');
    } catch (erro) {
      aviso('erro', 'A aplicação não foi confirmada: ' + erro.message + '. O videowall continua como estava e o rascunho foi mantido.');
    } finally {
      E.aplicando = false;
      renderTudo();
    }
  }
  function descartar() {
    if (!E.pend.n || E.aplicando) return;
    mutar('descartar', () => { E.rascunho = clonar(E.aplicado); E.sel = null; });
    aviso('info', 'Rascunho descartado. Use Desfazer (Ctrl+Z) para recuperá-lo.');
  }
  el['btn-aplicar'].addEventListener('click', () => aplicar(false));
  el['btn-descartar'].addEventListener('click', descartar);
  el['btn-desfazer'].addEventListener('click', desfazer);
  el['btn-refazer'].addEventListener('click', refazer);

  // ---------- layouts salvos ----------
  function layoutsSalvos() {
    let l = ler('vw.layouts');
    if (!Array.isArray(l)) {
      const f = (id) => E.fontesPorId.get(id);
      const it = (id, fid, x, y, w, h, n) => ({ id, fonteId: fid, nome: f(fid).nome, tipo: f(fid).tipo, x, y, w, h, proporcao: false, fixado: false, soConteudo: false, mosaico: n || 1 });
      l = [
        { id: 'l1', nome: 'Operação padrão', cols: E.aplicado.cols, linhas: E.aplicado.linhas, itens: clonar(E.aplicado.itens) },
        { id: 'l2', nome: 'Monitoramento amplo', cols: 4, linhas: 3, itens: [
          it('m1', 'mos-1', 0, 0, 1920, 1080, 4), it('m2', 'mos-2', 1920, 0, 1920, 1080, 3), it('m3', 'mos-3', 3840, 0, 1920, 1080, 4), it('m4', 'mos-4', 5760, 0, 1920, 1080, 2),
          it('m5', 'cam-001', 0, 1080, 1920, 1080), it('m6', 'cam-002', 1920, 1080, 1920, 1080), it('m7', 'cam-003', 3840, 1080, 1920, 1080), it('m8', 'cam-004', 5760, 1080, 1920, 1080),
          it('m9', 'app-1', 0, 2160, 3840, 1080), it('m10', 'web-2', 3840, 2160, 3840, 1080)] },
      ];
      guardar('vw.layouts', l);
    }
    return l;
  }
  function abrirLayouts() {
    const montar = () => {
      const l = layoutsSalvos();
      return '<h3>Layouts salvos</h3>' + (l.length ? '<ul class="pop-lista">' + l.map((x) =>
        '<li><button class="carregar" type="button" data-carregar="' + x.id + '"><b>' + escapar(x.nome) + '</b><span>' + x.cols + ' × ' + x.linhas + ' · ' +
        plural(x.itens.length, 'conteúdo', 'conteúdos') + '</span></button><button class="btn-icone" type="button" data-apagar="' + x.id +
        '" title="Excluir layout" aria-label="Excluir layout ' + escapar(x.nome) + '">' + ic('i-lixeira') + '</button></li>').join('') + '</ul>'
        : '<p class="nota">Nenhum layout salvo ainda.</p>') +
        '<form class="pop-linha" data-salvar><input type="text" maxlength="40" placeholder="Nome do layout" aria-label="Nome do layout">' +
        '<button class="btn" type="submit">Salvar atual</button></form>' +
        '<p class="nota">Carregar um layout altera só o rascunho. Use <b>Aplicar</b> para enviá-lo às telas.</p>';
    };
    abrirPop(el['btn-layouts'], montar(), (p) => {
      p.onclick = (e) => {
        const c = e.target.closest('[data-carregar]'), a = e.target.closest('[data-apagar]');
        if (c) {
          const x = layoutsSalvos().find((y) => y.id === c.dataset.carregar);
          if (!x) return;
          fecharPop();
          mutar('layout', () => {
            E.rascunho = { cols: x.cols, linhas: x.linhas, itens: clonar(x.itens) };
            if (x.div && Object.keys(x.div).length) E.rascunho.div = clonar(x.div);
            E.sel = null;
          });
          aviso('info', 'Layout "' + x.nome + '" carregado no rascunho. Aplique para enviá-lo às telas.');
        } else if (a) {
          guardar('vw.layouts', layoutsSalvos().filter((y) => y.id !== a.dataset.apagar));
          p.innerHTML = montar();
        }
      };
      p.onsubmit = (e) => {
        e.preventDefault();
        const campo = p.querySelector('input'), nome = campo.value.trim();
        if (!nome) return campo.focus();
        const l = layoutsSalvos().filter((y) => y.nome !== nome);
        l.push({ id: 'l' + Date.now().toString(36), nome, cols: E.rascunho.cols, linhas: E.rascunho.linhas, itens: clonar(E.rascunho.itens), div: clonar(E.rascunho.div || {}) });
        guardar('vw.layouts', l);
        p.innerHTML = montar();
        aviso('ok', 'Layout "' + nome + '" salvo neste navegador.');
      };
    });
  }
  el['btn-layouts'].addEventListener('click', abrirLayouts);

  // ---------- dividir monitores em quadrantes ----------
  const DIVISOES = [[1, 1], [2, 1], [1, 2], [2, 2], [3, 3], [4, 4]];
  let divSel = new Set();
  function glifo(dc, dl) {
    let d = '';
    for (let i = 1; i < dc; i++) d += 'M' + (1 + (22 * i) / dc) + ' 1v13';
    for (let i = 1; i < dl; i++) d += 'M1 ' + (1 + (13 * i) / dl) + 'h22';
    return '<svg viewBox="0 0 24 15"><rect x="1" y="1" width="22" height="13" rx="1.500"/>' + (d ? '<path d="' + d + '"/>' : '') + '</svg>';
  }
  function dividir(chaves, dc, dl) {
    mutar('dividir', (r) => {
      r.div = r.div || {};
      for (const ch of chaves) {
        if (dc * dl === 1) { delete r.div[ch]; continue; }
        r.div[ch] = [dc, dl];
        // Os conteúdos que já estavam inteiros dentro do monitor ocupam os quadrantes, em ordem de leitura.
        const [l, k] = ch.split(',').map(Number), x0 = k * MON_W, y0 = l * MON_H;
        r.itens.filter((it) => !it.fixado && it.x >= x0 && it.y >= y0 && it.x + it.w <= x0 + MON_W && it.y + it.h <= y0 + MON_H)
          .sort((a, b) => a.y - b.y || a.x - b.x).slice(0, dc * dl)
          .forEach((it, i) => Object.assign(it, arred(caber(it, quadrante(r, l, k, i)))));
      }
      if (!Object.keys(r.div).length) delete r.div;
    });
  }
  function abrirDividir() {
    const todas = () => { const s = new Set(), r = E.rascunho; for (let l = 0; l < r.linhas; l++) for (let k = 0; k < r.cols; k++) s.add(l + ',' + k); return s; };
    // Começa pelos monitores do conteúdo selecionado; sem seleção, por todos.
    const it = E.sel && achar(E.rascunho, E.sel);
    if (it && situacao(it, E.rascunho) !== 'fora') {
      const f = faixaTelas(it, E.rascunho);
      divSel = new Set();
      for (let l = f.l0; l <= f.l1; l++) for (let k = f.c0; k <= f.c1; k++) divSel.add(l + ',' + k);
    } else divSel = todas();
    const montar = () => {
      const r = E.rascunho;
      let mapa = '';
      for (let l = 0; l < r.linhas; l++) {
        for (let k = 0; k < r.cols; k++) {
          const ch = l + ',' + k, d = r.div && r.div[ch];
          mapa += '<button type="button" data-mon="' + ch + '" aria-pressed="' + divSel.has(ch) + '" aria-label="Monitor ' + nomeTela(l, k) + '"><b>' +
            nomeTela(l, k) + '</b><span>' + (d ? d[0] + '×' + d[1] : '') + '</span></button>';
        }
      }
      return '<h3>Dividir monitores</h3><div class="div-mapa" style="grid-template-columns:repeat(' + r.cols + ',1fr)">' + mapa + '</div>' +
        '<div class="pop-linha div-linha"><span class="discreto">' + plural(divSel.size, 'monitor escolhido', 'monitores escolhidos') + '</span>' +
        '<button class="btn" type="button" data-todos>' + (divSel.size === r.cols * r.linhas ? 'Nenhum' : 'Todos') + '</button></div>' +
        '<div class="div-opcoes">' + DIVISOES.map(([a, b]) => '<button type="button" data-div="' + a + ',' + b + '"' + (divSel.size ? '' : ' disabled') +
          ' title="' + (a * b === 1 ? 'Monitor inteiro, sem divisão' : a + ' colunas por ' + b + ' linhas') + '">' + glifo(a, b) +
          '<span>' + (a * b === 1 ? '1' : a + '×' + b) + '</span></button>').join('') + '</div>' +
        '<p class="nota">Os conteúdos de cada monitor são distribuídos nos quadrantes, e as próximas fontes entram no primeiro quadrante livre.</p>';
    };
    abrirPop(el['btn-dividir'], montar(), (p) => {
      p.onclick = (e) => {
        const m = e.target.closest('[data-mon]'), t = e.target.closest('[data-todos]'), d = e.target.closest('[data-div]');
        if (m) { if (!divSel.delete(m.dataset.mon)) divSel.add(m.dataset.mon); }
        else if (t) divSel = divSel.size === E.rascunho.cols * E.rascunho.linhas ? new Set() : todas();
        else if (d && divSel.size) { const [a, b] = d.dataset.div.split(',').map(Number); dividir([...divSel], a, b); }
        else return;
        p.innerHTML = montar();
      };
    });
  }
  el['btn-dividir'].addEventListener('click', abrirDividir);

  // ---------- link do conteúdo ----------
  // Devolve como o endereço pode rodar dentro do painel, ou por que não pode.
  function analisarLink(link) {
    if (!link) return null;
    let u;
    try { u = new URL(link); } catch (_) { return { tipo: 'invalido', nota: 'Endereço inválido. Use o formato https://…' }; }
    if (u.protocol === 'rtsp:' || u.protocol === 'rtmp:') {
      return { tipo: 'invalido', nota: 'Navegadores não reproduzem ' + u.protocol.slice(0, -1).toUpperCase() + '. Use o endereço HTTP da câmera (MJPEG, HLS ou a página dela).' };
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { tipo: 'invalido', nota: 'Só são aceitos endereços http:// ou https://.' };
    const host = u.hostname.replace(/^www\./, ''), caminho = u.pathname.toLowerCase();
    let yt = null;
    if (host === 'youtu.be') yt = u.pathname.slice(1).split('/')[0];
    else if (/(^|\.)youtube(-nocookie)?\.com$/.test(host)) {
      const m = u.pathname.match(/^\/(embed|live|shorts)\/([\w-]+)/);
      yt = m ? m[2] : u.searchParams.get('v');
    }
    if (yt && /^[\w-]{6,20}$/.test(yt)) {
      return { tipo: 'youtube', src: 'https://www.youtube.com/embed/' + yt + '?autoplay=1&mute=1&playsinline=1', nota: 'Vídeo do YouTube. Roda na prévia abaixo, sem som.' };
    }
    if (/\.(jpe?g|png|gif|webp|mjpe?g)$/.test(caminho) || /mjpe?g/.test(caminho + u.search.toLowerCase())) {
      return { tipo: 'imagem', src: u.href, nota: 'Imagem ou fluxo MJPEG de câmera. Roda na prévia abaixo.' };
    }
    if (/\.(mp4|webm|ogv|m3u8)$/.test(caminho)) {
      return { tipo: 'video', src: u.href, nota: 'Vídeo. Roda na prévia abaixo, sem som.' + (caminho.endsWith('.m3u8') ? ' HLS depende do navegador.' : '') };
    }
    // A página inicial e a busca do Google só aceitam ser embutidas com o parâmetro igu=1.
    if (/^google\.[a-z.]+$/.test(host) && /^\/(search|webhp)?$/.test(u.pathname)) u.searchParams.set('igu', '1');
    return { tipo: 'pagina', src: u.href, nota: 'Página web. Roda na prévia abaixo; sites que bloqueiam exibição embutida ficam em branco.' };
  }

  // ---------- prévia sob demanda (simulada, ou o link do conteúdo) ----------
  const P = { id: null, link: '', modo: 'nenhuma', timer: 0, quadro: 0, capturadaEm: null };
  const seloPrevia = el['bloco-previa'].querySelector('h3 .selo');
  function linkPrevia() { const it = itemPrevia(), a = it && analisarLink(it.link); return a && a.tipo !== 'invalido' ? a : null; }
  function removerMidia() {
    const m = document.getElementById('previa-midia');
    if (m) { m.removeAttribute('src'); m.remove(); }   // encerra o carregamento e libera o quadro
  }
  function montarMidia(a) {
    removerMidia();
    const quadro = el['previa-canvas'].parentNode;
    let m;
    if (a.tipo === 'imagem') { m = document.createElement('img'); m.alt = ''; }
    else if (a.tipo === 'video') { m = document.createElement('video'); m.muted = true; m.autoplay = true; m.controls = true; m.playsInline = true; }
    else {
      m = document.createElement('iframe');
      // sandbox: a página embutida roda, mas não consegue navegar o painel para outro endereço.
      m.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-presentation');
      m.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      m.referrerPolicy = 'strict-origin-when-cross-origin';
      m.title = 'Prévia do link';
      // A página é desenhada em 640, 960 ou 1280 px de largura (conforme a qualidade) e reduzida para caber.
      const larg = (QUALIDADES[E.prefs.qualidade] || QUALIDADES.baixa).l * 2.5;
      m.style.width = larg + 'px'; m.style.height = (larg * 9) / 16 + 'px';
      m.style.transform = 'scale(' + quadro.clientWidth / larg + ')';
    }
    m.id = 'previa-midia'; m.className = 'previa-midia';
    m.src = a.src;
    quadro.appendChild(m);
  }
  function pausarPrevia() {
    if (P.modo !== 'movimento') return;
    if (document.getElementById('previa-midia')) liberarPrevia();
    else { pararMovimento(); P.modo = 'estatica'; P.capturadaEm = new Date(); }
    atualizarPreviaUI();
  }
  function desenharPrevia(it) {
    const q = QUALIDADES[E.prefs.qualidade] || QUALIDADES.baixa, cv = el['previa-canvas'];
    if (cv.width !== q.l) { cv.width = q.l; cv.height = q.a; }
    const g = cv.getContext('2d'), w = cv.width, h = cv.height, u = w / 256;
    g.fillStyle = '#10151c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1c2633';
    for (let i = 0; i < 5; i++) g.fillRect(((i * w) / 4 + P.quadro * 6 * u) % (w * 1.25) - w * 0.25, h * 0.2 + i * h * 0.13, w * 0.22, h * 0.07);
    g.fillStyle = '#8aa6ff';
    g.fillRect((P.quadro * 9 * u) % w, h - 4 * u, 28 * u, 2 * u);
    if (it.tipo === 'mosaico') {
      g.strokeStyle = 'rgba(138,166,255,.45)'; g.lineWidth = 1; g.beginPath();
      for (let i = 1; i < it.mosaico; i++) { g.moveTo((w * i) / it.mosaico, 0); g.lineTo((w * i) / it.mosaico, h); g.moveTo(0, (h * i) / it.mosaico); g.lineTo(w, (h * i) / it.mosaico); }
      g.stroke();
    }
    g.fillStyle = '#e6e9ee'; g.font = '600 ' + Math.round(11 * u) + 'px Segoe UI, sans-serif'; g.textBaseline = 'top';
    g.fillText(it.nome.slice(0, 30), 8 * u, 8 * u);
    g.fillStyle = '#e5a83b'; g.font = Math.round(9 * u) + 'px Segoe UI, sans-serif';
    g.fillText('IMAGEM SIMULADA · ' + hora(), 8 * u, 24 * u);
    P.quadro++;
  }
  function pararMovimento() { if (P.timer) { clearInterval(P.timer); P.timer = 0; } }
  function liberarPrevia() {
    pararMovimento();
    removerMidia();
    P.modo = 'nenhuma'; P.quadro = 0;
    const cv = el['previa-canvas'];
    cv.width = 16; cv.height = 9;   // devolve a memória do bitmap
  }
  function atualizarPreviaUI() {
    el['previa-vazia'].hidden = P.modo !== 'nenhuma';
    el['previa-movimento'].setAttribute('aria-pressed', P.modo === 'movimento');
    const q = QUALIDADES[E.prefs.qualidade], a = linkPrevia();
    el['previa-miniatura'].disabled = !!a;   // não há como capturar miniatura de um endereço externo
    seloPrevia.hidden = !!a;
    if (a) { el['previa-estado'].textContent = P.modo === 'movimento' ? 'Link rodando. Desliga ao trocar de seleção.' : 'Use Em movimento para rodar o link.'; return; }
    el['previa-estado'].textContent = P.modo === 'movimento' ? 'Em movimento a ' + q.qps + ' quadros/s. Desliga ao trocar de seleção.'
      : P.modo === 'estatica' ? 'Miniatura estática capturada às ' + hora(P.capturadaEm) + '.' : 'Nada é carregado até você pedir.';
  }
  function sincronizarPrevia(it) {
    const id = it ? it.id : null, link = (it && it.link) || '';
    if (id !== P.id || link !== P.link) { liberarPrevia(); P.id = id; P.link = link; }
    el['bloco-previa'].hidden = !it;
    if (it) atualizarPreviaUI();
  }
  function itemPrevia() { return P.id && achar(E.rascunho, P.id); }
  el['previa-miniatura'].addEventListener('click', () => {
    const it = itemPrevia(); if (!it || linkPrevia()) return;
    pararMovimento(); P.modo = 'estatica'; P.capturadaEm = new Date();
    desenharPrevia(it); atualizarPreviaUI();
  });
  function ligarMovimento() {
    const it = itemPrevia(); if (!it) return;
    pararMovimento(); P.modo = 'movimento';
    const a = linkPrevia();
    if (a) { montarMidia(a); return atualizarPreviaUI(); }
    desenharPrevia(it);
    P.timer = setInterval(() => { const x = itemPrevia(); if (x) desenharPrevia(x); else liberarPrevia(); }, 1000 / QUALIDADES[E.prefs.qualidade].qps);
    atualizarPreviaUI();
  }
  el['previa-movimento'].addEventListener('click', () => {
    if (P.modo === 'movimento') pausarPrevia(); else ligarMovimento();
  });
  el['previa-qualidade'].addEventListener('change', () => {
    E.prefs.qualidade = el['previa-qualidade'].value; guardar('vw.prefs', E.prefs);
    if (P.modo === 'movimento') ligarMovimento(); else if (P.modo === 'estatica') { const it = itemPrevia(); if (it) desenharPrevia(it); }
    atualizarPreviaUI();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pausarPrevia();
  });

  // ---------- preferências ----------
  function aplicarPrefs() {
    const d = document.documentElement;
    d.dataset.tema = E.prefs.tema;
    d.dataset.animacoes = E.prefs.animacoes ? 'sim' : 'nao';
    el['btn-encaixe'].setAttribute('aria-pressed', E.prefs.encaixe);
    el['previa-qualidade'].value = E.prefs.qualidade;
  }
  function salvarPrefs() { guardar('vw.prefs', E.prefs); aplicarPrefs(); }
  el['btn-encaixe'].addEventListener('click', () => { E.prefs.encaixe = !E.prefs.encaixe; salvarPrefs(); });
  el['btn-lateral'].addEventListener('click', () => { el.lateral.classList.toggle('recolhida'); renderLista(); });
  el['btn-painel'].addEventListener('click', () => el.painel.classList.toggle('recolhida'));
  el['ver-edicao'].addEventListener('click', () => mudarVisao('edicao'));
  el['ver-confirmado'].addEventListener('click', () => mudarVisao('confirmado'));

  // ---------- áreas (Operação / Configurações) ----------
  let configCarregada = false;
  function abrirArea(area) {
    E.area = area;
    document.querySelectorAll('.aba').forEach((a) => a.classList.toggle('ativa', a.dataset.area === area));
    el['visao-operacao'].hidden = area !== 'operacao';
    el['visao-config'].hidden = area !== 'config';
    el['acoes-edicao'].hidden = area !== 'operacao';
    fecharPop();
    if (area === 'config') {
      pausarPrevia();
      if (configCarregada || VW.renderConfig) return VW.renderConfig(el['visao-config']);   // já embutida no arquivo único
      el['visao-config'].innerHTML = '<p class="nota" style="padding:28px 32px">Carregando configurações…</p>';
      const s = document.createElement('script');
      s.src = 'js/configuracoes.js';
      s.onload = () => { configCarregada = true; VW.renderConfig(el['visao-config']); };
      s.onerror = () => { el['visao-config'].innerHTML = '<p class="nota" style="padding:28px 32px">Não foi possível carregar as configurações.</p>'; };
      document.head.appendChild(s);
    } else {
      renderCena();
    }
  }
  document.querySelectorAll('.aba').forEach((a) => a.addEventListener('click', () => abrirArea(a.dataset.area)));
  el['btn-usuario'].addEventListener('click', () => {
    abrirPop(el['btn-usuario'], '<p class="nota">Sessão de <b>' + escapar(E.sessao.usuario) + '</b> · ' + escapar(E.sessao.perfil) + '</p>' +
      '<div class="pop-menu"><button type="button" data-m="config">Configurações</button><button type="button" data-m="sair">Sair</button></div>', (p) => {
      p.querySelector('[data-m="config"]').addEventListener('click', () => abrirArea('config'));
      p.querySelector('[data-m="sair"]').addEventListener('click', () => { try { sessionStorage.removeItem('vw.sessao'); } catch (_) { /* sem armazenamento */ } location.reload(); });
    });
  });

  // ---------- teclado ----------
  document.addEventListener('keydown', (e) => {
    if (el.app.hidden) return;
    if (e.key === 'Escape') {
      if (E.arr) return fimArraste(true);
      if (popAncora) return fecharPop();
      if (E.sel && !/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) selecionar(null);
      return;
    }
    if (E.area !== 'operacao' || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const ctrl = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (ctrl && k === 'z') { e.preventDefault(); return e.shiftKey ? refazer() : desfazer(); }
    if (ctrl && k === 'y') { e.preventDefault(); return refazer(); }
    const it = E.sel && E.visao === 'edicao' && achar(E.rascunho, E.sel);
    if (!it) return;
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); return removerSelecionado(); }
    const passo = e.shiftKey ? 120 : 10;
    const d = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }[e.key];
    if (d && !it.fixado) {
      e.preventDefault();
      const id = it.id;
      mutar('tecla:' + id, (r) => { const x = achar(r, id); x.x += d[0]; x.y += d[1]; }, true);
    }
  });

  // ---------- entrada ----------
  let cenaAgendada = 0;
  async function entrar(sessao) {
    E.sessao = sessao;
    el['nome-usuario'].textContent = sessao.usuario;
    Object.assign(E.prefs, ler('vw.prefs') || {});
    aplicarPrefs();
    const [fontes, saidas, confirmada] = await Promise.all([I.listarFontes(), I.listarSaidas(), I.obterComposicaoConfirmada()]);
    E.fontes = fontes;
    fontes.forEach((f) => { f._busca = normalizar(f.nome + ' ' + f.detalhe + ' ' + TIPOS[f.tipo].rot); E.fontesPorId.set(f.id, f); });
    E.saidas = new Set(saidas.map((s) => s.linha + ',' + s.coluna));
    E.aplicado = confirmada;
    E.rascunho = clonar(confirmada);
    E.confirmadoEm = new Date();
    el['tela-login'].hidden = true;
    el.app.hidden = false;
    filtrarFontes();
    renderTudo();
    new ResizeObserver(() => {
      if (!cenaAgendada) cenaAgendada = requestAnimationFrame(() => { cenaAgendada = 0; if (E.area === 'operacao' && !E.arr) { renderCena(); renderLista(); } });
    }).observe(el.palco);
    if (innerWidth <= 960) { el.lateral.classList.add('recolhida'); el.painel.classList.add('recolhida'); }
  }
  el['form-login'].addEventListener('submit', async (e) => {
    e.preventDefault();
    el['login-erro'].hidden = true;
    el['login-entrar'].disabled = true;
    try {
      const s = await I.autenticar(el['login-usuario'].value.trim(), el['login-senha'].value);
      try { sessionStorage.setItem('vw.sessao', JSON.stringify(s)); } catch (_) { /* sem armazenamento */ }
      el['login-senha'].value = '';
      await entrar(s);
    } catch (erro) {
      el['login-erro'].textContent = erro.message;
      el['login-erro'].hidden = false;
    } finally {
      el['login-entrar'].disabled = false;
    }
  });

  // Exposto para a área de Configurações (carregada sob demanda).
  VW.app = { E, salvarPrefs, aviso, contarTelas, escapar, ic, plural, MON_W, MON_H };

  let sessao = null;
  try { sessao = JSON.parse(sessionStorage.getItem('vw.sessao')); } catch (_) { /* sem sessão */ }
  if (sessao && sessao.usuario) entrar(sessao); else el['login-usuario'].focus();
})();
