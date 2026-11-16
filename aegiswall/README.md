# AegisWall — controle de videowall em 3D (protótipo)

Aplicação de navegador para operar um videowall: a parede aparece em 3D no centro da tela, as fontes são
arrastadas para os monitores, o layout é editado em uma vista frontal alinhada e só chega às telas quando o
operador usa **Apply**. A interface está em inglês (com as strings prontas para tradução); esta documentação
está em português.

> **Modo demonstração.** Nada sai do navegador. Hardware, telemetria, áudio, rede, banco de dados, console e
> licenças são simulados por adaptadores e aparecem rotulados como **Demo** na interface.

## Como rodar

| Forma | Passos |
| --- | --- |
| **Arquivo único** (mais simples) | Copie `dist/AegisWall.html` para qualquer máquina e abra com dois cliques. Não precisa de servidor, Python nem internet (sem internet, as fontes tipográficas caem para as do sistema). |
| **Servidor local** | Windows: dois cliques em `start.bat`. Linux/macOS: `./start.sh`. Depois abra `http://localhost:8765`. Outra porta: `python server.py 9000`. |
| **Regenerar o arquivo único** | `python build.py` (gera `dist/AegisWall.html` e `dist/aegiswall-embed.html`). |

Perfis de referência da demonstração (botões na tela de entrada):

| Usuário / senha | Perfil | Pode |
| --- | --- | --- |
| `operator` / `operator` | Operator | Editar e aplicar layouts, layouts salvos, áudio |
| `tech` / `tech` | Technician | + diagnóstico, relatório, mapeamento de hardware, recarga, backup, reinícios, console |
| `admin` / `admin` | Administrator | + rede/HTTPS, banco de dados, restauração, licenças, importação de configuração |

Requisitos: Chrome, Edge ou Firefox atuais. Com WebGL indisponível o AegisWall abre sozinho em um palco 2D
com edição básica; login, Audio, System & Maintenance e Settings continuam funcionando.

## O que mudou em relação à versão 1

A versão 1 (editor 2D em português, recuperada no primeiro commit desta pasta) foi a base. Foram mantidos:
grade editável com identificação A1, B2…, superfície lógica contínua, encaixe com guias, conteúdo fora da
área preservado ao reduzir a grade, rascunho × composição confirmada, desfazer/refazer, layouts salvos,
divisão de monitores em quadrantes, mosaico interno, campo **Link** com prévia sob demanda e falha simulada
de aplicação. O refinamento acrescentou:

- **Palco 3D real** (Three.js): monitores com moldura, espessura e traseira, iluminação de estúdio, sombra de
  contato e reflexo discreto; órbita, pan e zoom limitados para nunca perder a parede; `Front View` e `Fit All`.
- **Camada de motion graphics** ligada à operação: abertura pulável, contorno e legenda ancorada no monitor
  selecionado, fantasma e linha de conexão ao arrastar uma fonte, guias e contagem ao mudar a grade, transição
  entre a vista em perspectiva e a de edição, retângulos viajando ao carregar um layout, varredura de
  confirmação só depois do aceite do controlador, diálogo de licença animado.
- **Quatro áreas de trabalho**: Wall, Audio, System & Maintenance e Settings. Diagnósticos, mixer, logs,
  console, banco e rede ficam fora da vista do Wall.
- **Licenciamento de demonstração completo**: gerar, copiar, baixar, importar, validar, ativar, revogar, com
  os estados inválida, expirada, revogada, já ativada, limite atingido e serviço indisponível.
- **Três perfis de permissão** verificados na camada de serviço, não só na interface.

## Roteiro de validação (os 20 passos)

1. Entre com **Administrator**; a abertura 3D toca e pode ser pulada (`Skip intro`, qualquer tecla ou clique).
2. Em **Explore 3D**: arraste para orbitar, botão direito (ou Shift) para pan, roda para zoom; clique num
   monitor para ver o contorno, a legenda ancorada e o inspetor. Duplo clique aproxima.
3. No inspetor **Wall**, aumente *Columns* de 4 para 5: o total mostra 15 na hora; os novos monitores chegam
   e aparecem como **Planned** (sem saída física).
4. **Edit Layout** → `Add` em uma fonte → arraste as alças para ocupar vários monitores.
5. Volte a **Explore 3D**: o conteúdo continua contínuo atravessando as molduras.
6. Reduza a grade: a faixa oferece `Reposition`, `Fit Proportionally`, `Undo` e `Cancel`; nada é removido.
   Teste `Undo`/`Redo` (Ctrl+Z / Ctrl+Y).
7. **Saved Layouts** → `Save current draft…`, `Rename`, `Load`, `Update`, `Delete` (cartões ou lista).
8. **Apply** envia e aguarda o aceite. Para a falha: Settings → Demo tools → *Fail the next Apply*; o rascunho
   fica intacto e `Retry Apply` funciona.
9. Settings → Licensing → `Generate License…` → `Copy`, `Download License File`, `Import license file…`,
   `Activate`.
10. Cole uma licença alterada (inválida) e gere uma com *Already expired (for testing)*; `Revoke` trava os
    recursos de novo.
11. Inventário de controles: `docs/CONTROL-INVENTORY.md`.
12. Clique várias vezes seguidas em +/−, troque de modo no meio de uma transição, use Tab/setas, e ative
    *Motion: Reduced* em Settings → Appearance (ou o ajuste do sistema).
13. Indicador de saúde no cabeçalho → **System Information**: `Refresh`, `Pause Live Updates`, intervalo,
    filtro, `Details`, `Run Diagnostics`, `Export Diagnostic Report`.
14. `Restart Application Service…` e `Reboot Controller Host…` (este pede o nome do host). Falhas: Demo tools
    → *Maintenance: no acknowledgement* / *host does not come back*.
15. **Audio**: volume, rota, `Apply audio changes`, `Test Output` / `Stop`, preset; Demo tools → *Unplug the
    USB audio device*.
16. Settings → Preview & rendering (preset *Low*) e Content reload (intervalo, `Reload Now`); recarregue a
    página e confira que persistiu.
17. Settings → Network access: HTTPS sem certificado, certificado expirado, host errado, porta em uso;
    Demo tools → *New network endpoint unreachable* mostra o rollback.
18. Settings → Database (`Test Connection`, `Backup Now`, `Restore…`), Logs (filtros, `Export`) e Technician
    console (`service status`, comando inválido, `ping gateway` + `Cancel`).
19. A vista Wall não tem gráficos, campos de banco, mixer nem console.
20. Entre como **Operator** e **Technician** para ver os limites; Demo tools → *Force the 2D fallback* testa
    a falha de WebGL.

Os mesmos passos estão automatizados em `tests/` (Playwright): 28 + 44 + 61 verificações na última execução,
todas aprovadas. Veja `tests/README.md`.

## Estrutura

```
index.html            casca da página, ícones e ordem dos scripts
css/style.css         tokens de cor (escuro/claro), componentes, layout das áreas
js/core.js            utilitários, t() para tradução, armazenamento, diálogos, animação, logs/auditoria
js/services-demo.js   adaptador demo: login, fontes, saídas físicas, aplicar composição, licenças
js/services-ops.js    adaptador demo: telemetria, manutenção, áudio, configuração, rede, banco, recarga, console
js/wall-model.js      modelo lógico: geometria, histórico, pendências, layouts (independente da câmera)
js/compositor.js      desenha a superfície lógica em um canvas (texturas das telas)
js/stage.js           palco 3D (Three.js) e palco 2D de reserva, mesma interface
js/wall-ui.js         área Wall: palco, camada SVG de animações, edição, biblioteca de fontes, dock, Apply
js/wall-inspector.js  inspetor único (Wall / Monitor / Content), divisão, prévia de link, layouts salvos
js/audio-ui.js        área Audio
js/system-ui.js       área System & Maintenance
js/licensing-ui.js    fluxos de licença
js/settings-ui.js     Settings: motor de formulários e categorias de preferências, hardware, recarga, demo
js/settings-admin.js  Settings: rede/HTTPS, banco e backups, logs, console
js/app.js             entrada, cabeçalho, navegação, atalhos
vendor/three.min.js   Three.js r160 (MIT), embutido para funcionar offline
build.py · server.py · start.bat · start.sh
docs/INTEGRATION.md · docs/CONTROL-INVENTORY.md · tests/
```

### Por que não React + TypeScript + R3F + GSAP

O pedido sugere essa pilha **para um projeto novo**. Este não é um projeto novo: a versão 1 já era JavaScript
puro, sem etapa de build, e você pediu que ela rodasse em outra máquina com dois cliques. Mantive isso:

- **Three.js direto** entrega a mesma cena que o React Three Fiber entregaria, sem empacotador.
- **Um pequeno motor de animação próprio** (`AW.motion` em `core.js`, ~40 linhas) faz o papel do GSAP com a
  regra que importa aqui: cada propriedade tem um único dono e uma nova animação parte do valor atual, então
  entradas rápidas nunca enfileiram. A câmera tem um dono só (o *rig* em `stage.js`): entrada do usuário e
  transições programadas apenas mudam o alvo.
- O estado lógico é a autoridade (`wall-model.js`); a cena e os SVG apenas o apresentam.

Migrar para React/TypeScript continua possível: os módulos já estão separados nas fronteiras pedidas
(modelo e histórico, adaptadores, renderização 3D, orquestração de movimento, UI e preferências, rascunho ×
confirmado, licenciamento).

## O que é só demonstração

| Área | No protótipo | Em produção depende de |
| --- | --- | --- |
| Saídas físicas, Apply | Aceite simulado após ~0,9 s | Serviço do controlador (AllService / Plot Control) documentado |
| Imagens das fontes | Desenhos no canvas | Captura/streaming no backend; o navegador não captura aplicativos nativos |
| Telemetria | Valores determinísticos rotulados Demo | Agente autenticado no host |
| Reinício/reboot | Máquina de estados simulada | API de manutenção com autorização e auditoria |
| Áudio | Rotas e medidores simulados; tom local opcional | Motor de áudio do controlador |
| HTTPS, banco, backup | Validação e armazenamento simulados no navegador | Backend que configura o listener, guarda segredos e executa backup |
| Console | Lista fixa de comandos com saída simulada | Backend autenticado com papéis, limites e auditoria |
| Licenças | Registro local com verificação de integridade | Assinatura digital no backend, chaves fora do cliente |
| Perfis | Contas de referência no adaptador | Autenticação e autorização no backend |

**Ativação no navegador não protege software de produção.** O arquivo `docs/INTEGRATION.md` descreve o
contrato dos adaptadores e os requisitos de licenciamento, HTTPS, banco e console para o ambiente real.

## Desempenho

Não há medição em hardware-alvo neste repositório: os testes automatizados rodaram com renderização por
software (SwiftShader), que serve para verificar comportamento, não fluidez. O palco só redesenha quando algo
muda (câmera, animação ou conteúdo) e as prévias “ao vivo” ficam desligadas por padrão. Antes de implantar,
meça na máquina de operação com Settings → Preview & rendering nos presets *Low*, *Balanced* e *High*.

## Referência visual

O artifact “Combo Sabor Energético” foi usado apenas pelo conceito de interação descrito no pedido (objeto no
centro do palco, seleção em carrossel, detalhes progressivos, manipulação direta). Ele **não** foi aberto nem
reproduzido aqui; nenhuma imagem, texto, cor ou efeito dele foi copiado. O carrossel virou a prateleira de
*Saved Layouts* (com alternativa em lista), o foco no produto virou a seleção de monitor/conteúdo e a
manipulação virou órbita em *Explore 3D* e posicionamento preciso em *Edit Layout*.
