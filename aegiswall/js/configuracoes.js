/* Área de Configurações — baixada só quando o operador a abre pela primeira vez. */
(function () {
  'use strict';
  const VW = window.VW, I = VW.integracao, A = VW.app, E = A.E;
  let secao = 'integracao';

  const SECOES = [['integracao', 'Integração'], ['videowall', 'Videowall'], ['acesso', 'Acesso'], ['desempenho', 'Desempenho'], ['proposta', 'Sobre a proposta']];

  function interruptor(rot, chave, nota) {
    return '<label class="opcao"><span>' + rot + '</span><input class="interruptor" type="checkbox" data-pref="' + chave + '"' +
      (E.prefs[chave] ? ' checked' : '') + '><small>' + nota + '</small></label>';
  }

  const conteudo = {
    integracao() {
      return '<h1>Integração</h1>' +
        '<p>O painel conversa com os serviços locais por um único adaptador. Hoje está carregado o <b>' + I.rotulo + '</b>: nada sai do navegador e nenhuma tela física é alterada.</p>' +
        '<div class="cartao"><table class="tabela"><thead><tr><th>Comando</th><th>Estado</th><th>Como funciona agora</th></tr></thead><tbody>' +
        I.comandos.map((c) => '<tr><td>' + A.escapar(c.nome) + '</td><td><span class="selo ' + (c.estado === 'integrado' ? 'selo-ok' : 'selo-demo') + '">' +
          (c.estado === 'integrado' ? 'Integrado' : 'Simulado') + '</span></td><td>' + A.escapar(c.nota) + '</td></tr>').join('') +
        '</tbody></table></div>' +
        '<h2>Serviços locais</h2>' +
        '<div class="cartao">' +
        '<label class="campo-linha"><span>AllService</span><input type="text" disabled placeholder="A definir conforme a documentação"></label>' +
        '<label class="campo-linha"><span>Plot Control</span><input type="text" disabled placeholder="A definir conforme a documentação"></label>' +
        '<p class="nota">As funções e os endereços desses componentes não foram presumidos. Para integrar, substitua <code>js/integracao-demo.js</code> por um adaptador que siga a documentação e exponha os mesmos comandos da tabela acima.</p>' +
        '</div>' +
        '<h2>Teste do fluxo de aplicação</h2>' +
        '<div class="cartao">' + interruptor('Simular falha ao aplicar', 'falhaSimulada', 'Faz o adaptador de demonstração recusar a próxima aplicação, para conferir que o painel não mostra sucesso sem confirmação.') + '</div>';
    },

    videowall() {
      const t = A.contarTelas(E.rascunho), L = I.limites;
      return '<h1>Videowall</h1>' +
        '<p>Dados da instalação. A grade do dia a dia é ajustada na própria tela de operação, pelos campos Colunas e Linhas.</p>' +
        '<div class="cartao"><dl class="dados" style="max-width:420px">' +
        '<dt>Grade em edição</dt><dd>' + E.rascunho.cols + ' × ' + E.rascunho.linhas + ' = ' + t.total + '</dd>' +
        '<dt>Grade no ar</dt><dd>' + E.aplicado.cols + ' × ' + E.aplicado.linhas + ' = ' + E.aplicado.cols * E.aplicado.linhas + '</dd>' +
        '<dt>Resolução de cada monitor</dt><dd>' + A.MON_W + ' × ' + A.MON_H + ' px</dd>' +
        '<dt>Saídas disponíveis no sistema</dt><dd>' + E.saidas.size + '</dd>' +
        '<dt>Telas planejadas sem saída</dt><dd>' + t.planejadas + '</dd>' +
        '<dt>Limite de colunas</dt><dd>' + L.maxColunas + '</dd>' +
        '<dt>Limite de linhas</dt><dd>' + L.maxLinhas + '</dd></dl>' +
        '<p class="nota">Resolução, saídas e limites vêm do adaptador. Em demonstração são valores fixos: 12 saídas em 4 colunas por 3 linhas.</p></div>' +
        '<h2>Identificação das telas</h2>' +
        '<p>Cada tela é nomeada pela linha (letra) e pela coluna (número): A1 fica no canto superior esquerdo. Ao mudar a grade, as telas que continuam existindo mantêm o mesmo nome.</p>';
    },

    acesso() {
      return '<h1>Acesso</h1>' +
        '<p>A autenticação é uma responsabilidade do adaptador, não da interface. Em demonstração, o usuário e a senha de referência são conferidos no próprio navegador.</p>' +
        '<div class="cartao"><dl class="dados" style="max-width:420px">' +
        '<dt>Sessão atual</dt><dd>' + A.escapar(E.sessao.usuario) + ' · ' + A.escapar(E.sessao.perfil) + '</dd>' +
        '<dt>Modo</dt><dd>Demonstração</dd></dl>' +
        '<label class="campo-linha"><span>Provedor de autenticação</span><select disabled><option>A definir na instalação</option></select></label>' +
        '<p class="nota">O acesso <code>admin</code> / <code>admin</code> existe apenas para demonstrar o fluxo e não deve ser mantido em produção.</p></div>';
    },

    desempenho() {
      return '<h1>Desempenho</h1>' +
        '<p>Ajustes que reduzem o trabalho do navegador. Úteis quando o mesmo computador executa outros serviços.</p>' +
        '<div class="cartao">' +
        interruptor('Animações da interface', 'animacoes', 'Transições curtas em botões e o destaque ao mudar a grade. Desligar não altera nenhuma função.') +
        interruptor('Encaixe magnético', 'encaixe', 'Alinha conteúdos às bordas de monitores e de outros conteúdos durante o arraste.') +
        '<label class="campo-linha"><span>Qualidade da prévia</span><select data-pref-sel="qualidade">' +
        [['baixa', 'Baixa · 2 quadros/s'], ['media', 'Média · 5 quadros/s'], ['alta', 'Alta · 10 quadros/s']]
          .map(([v, r]) => '<option value="' + v + '"' + (E.prefs.qualidade === v ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></label>' +
        '<label class="campo-linha"><span>Tema</span><select data-pref-sel="tema">' +
        [['escuro', 'Escuro'], ['claro', 'Claro']].map(([v, r]) => '<option value="' + v + '"' + (E.prefs.tema === v ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></label>' +
        '</div>' +
        '<h2>Medição neste computador</h2>' +
        '<div class="cartao"><p class="nota">Medida feita agora, neste navegador. Serve de referência, não de garantia: as metas devem ser fixadas depois de medir no equipamento-alvo.</p>' +
        '<dl class="dados" id="medicao" style="max-width:420px"><dt>Ainda não medido</dt><dd>—</dd></dl>' +
        '<div><button class="btn" type="button" data-medir>Medir agora</button></div></div>' +
        '<h2>O que verificar no equipamento-alvo</h2>' +
        '<div class="cartao"><table class="tabela"><thead><tr><th>Medida</th><th>Como medir</th><th>Meta</th></tr></thead><tbody>' +
        [['Carregamento inicial', 'Do endereço digitado até a grade visível'], ['Resposta ao arrastar', 'Quadros por segundo movendo um conteúdo sobre a grade cheia'],
          ['CPU em repouso', 'Painel aberto e parado por 5 minutos'], ['CPU durante a edição', 'Arraste contínuo por 30 segundos'],
          ['Memória', 'Após 1 hora de uso, com o catálogo completo carregado']]
          .map(([m, c]) => '<tr><td>' + m + '</td><td>' + c + '</td><td>A definir após o teste</td></tr>').join('') +
        '</tbody></table></div>';
    },

    proposta() {
      return '<h1>Sobre a proposta</h1>' +
        '<p>Um painel 2D de operação em que a grade de monitores ocupa quase toda a tela e cada função aparece apenas quando é necessária. A composição em edição nunca se confunde com o que está no ar.</p>' +
        '<h2>Distribuição dos elementos</h2>' +
        '<div class="esquema" aria-hidden="true"><div class="e-topo">Barra superior · conexão · desfazer · pendências · Aplicar</div><div>Fontes</div><div class="e-palco">Grade 2D do videowall</div><div>Propriedades</div><div class="e-rodape">Superfície lógica · escala · saídas</div></div>' +
        '<ul><li><b>Barra superior (48 px).</b> Identificação, estado da conexão, desfazer e refazer, alterações pendentes, Descartar, Aplicar e Layouts.</li>' +
        '<li><b>Lateral de fontes, recolhível.</b> Busca, seis categorias e lista virtualizada. Arraste para um monitor ou use o botão +.</li>' +
        '<li><b>Área de edição.</b> Grade frontal com telas nomeadas (A1, B2…), campos de colunas e linhas e a troca entre <i>Em edição</i> e <i>No ar</i>.</li>' +
        '<li><b>Painel contextual.</b> Sem seleção, resume o videowall e lista os conteúdos. Com seleção, mostra posição, tamanho, ajustes e prévia do item.</li>' +
        '<li><b>Configurações.</b> Instalação, integração, acesso e desempenho ficam nesta área separada, fora do caminho da operação.</li></ul>' +
        '<h2>Exemplo de operação completo</h2>' +
        '<ol><li>Entre com usuário e senha. A grade 4 × 3 abre com o que está no ar.</li>' +
        '<li>Digite <i>trânsito</i> na busca e arraste <i>Mapa de trânsito</i> até a tela C3. O conteúdo ocupa o monitor inteiro e já fica selecionado.</li>' +
        '<li>Puxe a alça direita até a borda de C4: a guia azul confirma o encaixe e o conteúdo passa a atravessar duas telas.</li>' +
        '<li>Se precisar de precisão, ajuste X, Y, L e A no painel, em pixels da superfície lógica.</li>' +
        '<li>A barra mostra <i>1 alteração pendente</i>. Confira em <i>No ar</i> que as telas físicas ainda não mudaram.</li>' +
        '<li>Clique em <b>Aplicar</b>. O aviso de sucesso só aparece depois da confirmação do adaptador.</li>' +
        '<li>Em <b>Layouts</b>, salve a composição com um nome para recuperá-la depois.</li></ol>' +
        '<h2>Como reduz a poluição visual</h2>' +
        '<ul><li>Uma única cor de destaque marca seleção e ação principal. Âmbar fica reservado para pendências e avisos.</li>' +
        '<li>Propriedades só existem para o item selecionado; não há barras de ferramentas permanentes.</li>' +
        '<li>Fontes são nomes e ícones. Não há dezenas de miniaturas disputando atenção.</li>' +
        '<li>Monitores físicos têm moldura neutra e nome fixo; mosaicos internos usam linhas finas na cor de destaque, para não serem confundidos com telas.</li>' +
        '<li>Avisos aparecem só quando há algo a decidir: conteúdo fora da área, tela planejada sem saída, falha ao aplicar.</li></ul>' +
        '<h2>Como reduz o consumo de recursos</h2>' +
        '<ul><li>Sem framework, sem fontes externas e sem imagens: quatro arquivos pequenos, e esta área só é baixada quando aberta.</li>' +
        '<li>Parado, o painel não executa nada: não há laço de animação nem consulta periódica.</li>' +
        '<li>No arraste, só o item movido é reposicionado, uma vez por quadro. O estado muda uma única vez, ao soltar, e só vai à integração no Aplicar.</li>' +
        '<li>Cada conteúdo é repintado apenas quando sua posição ou seu estado muda.</li>' +
        '<li>A lista de fontes mantém no DOM somente as linhas visíveis, mesmo com centenas de itens.</li>' +
        '<li>Miniatura e prévia em movimento são pedidas pelo operador, valem só para o item selecionado e são liberadas ao trocar de seleção, mudar de área ou ocultar a aba.</li></ul>' +
        '<h2>Limites deste protótipo</h2>' +
        '<p>Tudo o que envolve os serviços locais é simulado e está identificado como tal. As metas de desempenho ainda precisam ser medidas e fixadas no equipamento-alvo.</p>';
    },
  };

  function medir() {
    const nav = performance.getEntriesByType('navigation')[0];
    const rec = performance.getEntriesByType('resource');
    const bytes = rec.reduce((s, r) => s + (r.encodedBodySize || 0), nav ? nav.encodedBodySize || 0 : 0);
    const mem = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(1).replace('.', ',') + ' MB' : 'indisponível neste navegador';
    const linhas = [
      ['Página pronta para uso', nav ? Math.round(nav.domContentLoadedEventEnd) + ' ms' : 'indisponível'],
      ['Arquivos carregados', (rec.length + 1) + ' · ' + (bytes / 1024).toFixed(0) + ' KB'],
      ['Elementos na página', String(document.getElementsByTagName('*').length)],
      ['Memória do JavaScript', mem],
      ['Conteúdos no rascunho', String(E.rascunho.itens.length)],
      ['Fontes no catálogo', String(E.fontes.length)],
    ];
    document.getElementById('medicao').innerHTML = linhas.map(([a, b]) => '<dt>' + a + '</dt><dd>' + b + '</dd>').join('');
  }

  VW.renderConfig = function (raiz) {
    raiz.innerHTML = '<nav class="config-nav" aria-label="Seções de configuração">' +
      SECOES.map(([k, r]) => '<button type="button" data-secao="' + k + '"' + (k === secao ? ' class="ativa"' : '') + '>' + r + '</button>').join('') +
      '</nav><div class="config-corpo"><section class="config-secao">' + conteudo[secao]() + '</section></div>';
    raiz.onclick = (e) => {
      const b = e.target.closest('[data-secao]');
      if (b) { secao = b.dataset.secao; VW.renderConfig(raiz); return; }
      if (e.target.closest('[data-medir]')) medir();
    };
    raiz.onchange = (e) => {
      const t = e.target;
      if (t.dataset.pref) E.prefs[t.dataset.pref] = t.checked;
      else if (t.dataset.prefSel) E.prefs[t.dataset.prefSel] = t.value;
      else return;
      A.salvarPrefs();
    };
  };
})();
