/* Adaptador de DEMONSTRAÇÃO.
 *
 * Este arquivo é a única fronteira entre a interface e os serviços locais.
 * Aqui tudo é simulado: nenhum comando sai do navegador. Para integrar com o
 * ambiente real (AllService, Plot Control), escreva outro arquivo que exponha
 * o mesmo objeto `VW.integracao`, seguindo a documentação desses serviços.
 * Nenhuma API deles foi presumida aqui.
 */
(function () {
  'use strict';
  const VW = (window.VW = window.VW || {});

  // Credenciais de referência, válidas apenas neste adaptador de demonstração.
  const DEMO_USUARIO = 'admin';
  const DEMO_SENHA = 'admin';

  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const MON = { largura: 1920, altura: 1080 };

  function gerarFontes() {
    const fontes = [];
    const areas = ['Portaria Norte', 'Portaria Sul', 'Estacionamento', 'Doca', 'Recepção', 'Corredor A',
      'Corredor B', 'Sala de Servidores', 'Perímetro Leste', 'Perímetro Oeste', 'Almoxarifado', 'Refeitório'];
    for (let i = 1; i <= 168; i++) {
      const n = String(i).padStart(3, '0');
      fontes.push({ id: 'cam-' + n, tipo: 'camera', nome: 'Câmera ' + n, detalhe: areas[(i - 1) % areas.length] });
    }
    [['Portaria', 4], ['Estacionamento', 3], ['Perímetro', 4], ['Doca', 2], ['Corredores', 3], ['Servidores', 2]]
      .forEach(([nome, n], i) => fontes.push({
        id: 'mos-' + (i + 1), tipo: 'mosaico', nome: 'Mosaico ' + nome, detalhe: n * n + ' câmeras', mosaico: n,
      }));
    ['Painel de indicadores', 'Mapa de trânsito', 'Previsão do tempo', 'Intranet', 'Fila de chamados',
      'Escala de equipes', 'Painel de energia', 'Agenda de salas']
      .forEach((nome, i) => fontes.push({ id: 'web-' + (i + 1), tipo: 'web', nome, detalhe: 'Página web' }));
    ['Transmissão ao vivo 1', 'Transmissão ao vivo 2', 'Canal institucional', 'Vídeo de treinamento', 'Noticiário']
      .forEach((nome, i) => fontes.push({ id: 'yt-' + (i + 1), tipo: 'youtube', nome, detalhe: 'YouTube' }));
    [['Chrome', 'Painel de chamados'], ['Chrome', 'Relatórios'], ['Word', 'Procedimento operacional.docx'],
      ['Excel', 'Escala de plantão.xlsx'], ['Excel', 'Indicadores do mês.xlsx'], ['PowerPoint', 'Briefing diário.pptx'],
      ['PowerShell', 'Monitor de serviços'], ['PowerShell', 'Sessão administrativa']]
      .forEach(([app, titulo], i) => fontes.push({
        id: 'app-' + (i + 1), tipo: 'app', nome: app + ' — ' + titulo, detalhe: 'Janela de aplicativo',
      }));
    return fontes;
  }

  function item(id, fonte, x, y, w, h, extra) {
    return Object.assign({
      id, fonteId: fonte.id, nome: fonte.nome, tipo: fonte.tipo,
      x, y, w, h, proporcao: false, fixado: false, soConteudo: false, mosaico: fonte.mosaico || 1,
    }, extra || {});
  }

  const FONTES = gerarFontes();
  const porId = (id) => FONTES.find((f) => f.id === id);

  // Composição que o adaptador de demonstração considera "no ar".
  let confirmada = {
    cols: 4, linhas: 3,
    itens: [
      item('c1', porId('mos-1'), 0, 0, 1920, 1080, { fixado: true }),
      item('c2', porId('cam-001'), 1920, 0, 1920, 1080, { proporcao: true }),
      item('c3', porId('app-1'), 3840, 0, 3840, 2160),
      item('c4', porId('app-4'), 0, 1080, 3840, 1080),
      item('c5', porId('yt-1'), 0, 2160, 1920, 1080, { proporcao: true }),
      item('c6', porId('web-3'), 1920, 2160, 960, 1080),
    ],
  };

  VW.integracao = {
    modo: 'demonstracao',
    rotulo: 'adaptador de demonstração',

    // Limites que, no ambiente real, devem vir da integração.
    limites: { maxColunas: 8, maxLinhas: 6, monitor: MON },

    // Usado na tela de Configurações para separar o que é simulado do que é real.
    comandos: [
      { nome: 'Autenticação', estado: 'simulado', nota: 'Validada localmente no navegador com as credenciais de referência.' },
      { nome: 'Listar fontes', estado: 'simulado', nota: FONTES.length + ' fontes geradas no navegador.' },
      { nome: 'Listar saídas disponíveis', estado: 'simulado', nota: '12 saídas fixas, em 4 colunas por 3 linhas.' },
      { nome: 'Ler composição no ar', estado: 'simulado', nota: 'Composição de exemplo mantida em memória.' },
      { nome: 'Aplicar composição', estado: 'simulado', nota: 'Confirmação devolvida após um atraso artificial.' },
      { nome: 'Miniatura e prévia em movimento', estado: 'simulado', nota: 'Imagem desenhada localmente, sem vídeo real.' },
      { nome: 'Somente área de conteúdo da janela', estado: 'simulado', nota: 'Só a opção é guardada; depende do que a integração permitir.' },
    ],

    async autenticar(usuario, senha) {
      await esperar(250);
      if (usuario === DEMO_USUARIO && senha === DEMO_SENHA) return { usuario, perfil: 'Administrador' };
      throw new Error('Usuário ou senha inválidos.');
    },

    async listarFontes() {
      await esperar(120);
      return FONTES;
    },

    // Saídas que o sistema conectado realmente oferece (posição na grade).
    async listarSaidas() {
      await esperar(80);
      const saidas = [];
      for (let l = 0; l < 3; l++) for (let c = 0; c < 4; c++) saidas.push({ linha: l, coluna: c });
      return saidas;
    },

    async obterComposicaoConfirmada() {
      await esperar(80);
      return JSON.parse(JSON.stringify(confirmada));
    },

    // Só resolve quando a "integração" confirma. Rejeita se a falha simulada estiver ligada.
    async aplicarComposicao(composicao, opcoes) {
      await esperar(700);
      if (opcoes && opcoes.falhar) throw new Error('o adaptador de demonstração devolveu uma falha simulada');
      confirmada = JSON.parse(JSON.stringify(composicao));
      return { confirmadoEm: new Date(), origem: 'adaptador de demonstração (simulado)' };
    },
  };
})();
