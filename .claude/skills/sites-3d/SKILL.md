---
name: sites-3d
description: "Sites 3D — build or refine a browser app or website into an immersive, working real-time 3D experience (Three.js / WebGL) with functional motion graphics, where every visible control is implemented and demo behaviour is labelled honestly. Use this whenever the user asks for a 3D site, 3D interface, 3D product or object showcase, 3D control panel or videowall, spatial or immersive UI, interactive motion graphics, a page with WebGL, orbit/zoom camera, a 3D carousel, or to 'turn this site/app into 3D', 'deixar o site em 3D', 'interface 3D imersiva', 'site 3D', 'motion graphics interativo' — also when they hand over a long master prompt or spec for such an interface, or ask to refine an existing 3D page, even if they never say 'Three.js'."
---

# Sites 3D

Método para transformar uma interface web em uma aplicação 3D imersiva **que funciona de verdade**:
a cena 3D é o palco, as animações servem à operação, cada botão visível faz o que diz, e tudo que é
simulado aparece rotulado. Foi extraído da construção do AegisWall (controle de videowall em 3D), mas vale
para qualquer site ou app centrado num objeto: vitrine de produto, painel de controle, configurador,
mapa de sala, maquete interativa.

Responda ao usuário no idioma dele. A interface pode estar em outro idioma se o pedido disser.

## 1. Antes de escrever código

1. **Procure o que já existe.** Repositório, arquivos enviados, artifacts publicados (`Artifact` com
   `action: "list"`), e sessões anteriores (`list_sessions` + `list_events` do Claude Code Remote) quando o
   usuário diz "o modelo que fizemos em outra conversa". Se o código só existe no histórico de outra sessão,
   reconstrua-o reaplicando, em ordem, os `Write`/`Edit` e os scripts de patch daquela sessão
   (veja `references/recover-previous-work.md`). Faça commit dessa base antes de mudar qualquer coisa:
   assim o usuário vê exatamente o que foi refinado.
2. **Preserve o que funciona.** Liste os fluxos que a versão anterior já tinha e mantenha-os. Refinar não é
   reescrever do zero com outra cara.
3. **Referência visual = conceito, não cópia.** Se o pedido cita um site/artifact de referência, traduza a
   *ideia de interação* (objeto no centro, seleção, detalhes progressivos, manipulação direta) para o
   domínio do usuário. Não copie marca, imagens, textos ou cores; não afirme paridade visual com algo que
   você não abriu.
4. **Leia o pedido inteiro e transforme-o em checklist.** Pedidos desse tipo costumam ter 15–20 critérios de
   aceite. Eles viram o roteiro de testes do passo 7.

## 2. Arquitetura

Escolha a pilha pelo contexto, e diga ao usuário por quê:

- **Projeto existente em JS puro, ou o usuário quer abrir com dois cliques em outra máquina** → JavaScript
  sem build + Three.js UMD **vendorizado** (`npm pack three@0.160.0`, r160 é o último com `build/three.min.js`)
  + um motor de animação pequeno próprio. Gera um único `.html` offline.
- **Projeto novo com build aceito** → React + TypeScript + React Three Fiber/Drei + GSAP é aceitável; as
  mesmas fronteiras de módulo valem.

Separe, em arquivos/módulos distintos (detalhes e código em `references/architecture.md`):

| Módulo | Responsabilidade |
| --- | --- |
| `core` | `t()` para tradução, armazenamento com fallback, barramento de eventos, diálogos/popover acessíveis, **motor de animação com um dono por propriedade**, logs + auditoria separados, `requireRole` |
| `services-*` | **adaptadores**: a única fronteira com o mundo real. Demo = stateful, determinístico, rotulado. Verificação de papel/licença acontece aqui |
| `model` | estado lógico autoritativo, independente da câmera: geometria, histórico (undo/redo por snapshot), rascunho × confirmado, itens salvos |
| `compositor` | desenha o conteúdo num canvas que vira textura (uma textura, UVs por face/tela) |
| `stage` | cena 3D **e** palco 2D de reserva com a mesma interface (`quad()`, `pick()`, `setInsets()`, `syncGrid()`…) |
| `ui-*` | camada SVG de motion graphics, overlay de edição em pixels de tela, painéis, inspetor |
| `app` | entrada/login, cabeçalho, navegação entre áreas, atalhos |

Regras que evitam a maior parte dos bugs:
- **Estado lógico manda; animação só apresenta.** Nada de ler posição da malha para decidir lógica.
- **Câmera com um único dono** (um *rig* com `goal` e `cur` amortecidos). Entrada do usuário e transições
  programadas só mudam `goal`. Interrupção = retarget, nunca fila.
- **Painéis sobre o palco** → informe os recortes ao rig e use `camera.setViewOffset` para manter o objeto
  centrado na área livre, em vez de redimensionar o canvas.
- **Renderize sob demanda** (flag `dirty` + câmera em movimento). Sem laço ocioso.
- **Isole o WebGL**: `try` na criação do renderer, fallback 2D com edição básica, e `webglcontextlost`
  trocando para o 2D sem perder estado. Login, configurações etc. nunca dependem do 3D.

## 3. Direção de arte

- O objeto é o palco; todo o resto é contexto. Cabeçalho compacto, um painel de biblioteca à esquerda,
  **um único** inspetor contextual à direita, um dock pequeno embaixo. Nada de janelas flutuantes empilhadas
  nem gráficos permanentes em volta do objeto.
- Ferramentas técnicas (diagnóstico, logs, console, banco, rede, mixer) ficam em **áreas separadas**.
- Tokens de cor no `:root` com tema escuro e claro; cores semânticas (ok/aviso/erro) separadas do acento.
  Status nunca só por cor ou movimento: sempre com texto.
- Materiais contidos: moldura fina com espessura e traseira, luz de estúdio (hemisférica + key + rim fraco),
  sombra de contato barata (textura radial), reflexo opcional por passe espelhado. O conteúdo da tela é
  `MeshBasicMaterial` para ficar legível.

## 4. Motion graphics funcionais

Cada interação importante tem gatilho, transição, estado final e comportamento de interrupção.
Implementações de referência em `references/architecture.md`:

- **Entrada**: montagem breve (< 2 s), título revelado, controles aparecem depois; pulável por botão, tecla
  ou clique; não repete na navegação.
- **Seleção**: contorno desenhado (`stroke-dasharray` com `pathLength=1`), identificador e legenda presa ao
  objeto via projeção, linha-guia até o inspetor, escondida quando sai da área visível.
- **Arrastar para posicionar**: fantasma no destino + linha de conexão animada; ao soltar, traçar o contorno
  da região real.
- **Mudança de quantidade/grade**: o número final aparece imediatamente (nunca contagem fracionária);
  objetos chegam/saem com stagger; câmera reenquadra.
- **Troca de vista**: uma única transição de câmera entre perspectiva e vista alinhada de edição; o overlay
  de edição só aparece quando a câmera está alinhada.
- **Recuperar um layout**: retângulos interpolados do estado atual ao novo; deixar claro que é prévia.
- **Aplicar**: estado indeterminado enquanto espera; varredura de confirmação **só depois** do aceite.
- Tempos: 120–220 ms feedback, 200–350 ms painéis, 400–800 ms câmera. Movimento reduzido (preferência do
  sistema ou configuração) troca deslocamento por atualização imediata ou fade curto.

## 5. "Todos os controles funcionam"

- Não entregue botão decorativo, handler vazio, alerta de placeholder nem sucesso falso.
- Controle indisponível: desabilitado **com motivo** no `title`, e o serviço recusa mesmo assim.
- Ações que dependem de hardware/serviço externo: no demo, simulação completa e rotulada; resultado só
  depois de `Promise` resolvida; falha preserva o rascunho e oferece Retry.
- Cada valor desconhecido aparece como "Unavailable"; simulado, como "Demo". Nunca invente leituras.
- Ações disruptivas pedem confirmação explícita (frase digitada para as piores) e acompanham reconexão por
  sonda, não por timer.
- Salvar arquivo: `<a download>` no navegador; em artifact, capability `downloads` com fallback mostrando o
  texto para copiar (ver `references/architecture.md`, `saveFile`).
- Mantenha um **inventário de controles** (`docs/CONTROL-INVENTORY.md`): controle → handler → efeito →
  falha/desabilitado → teste.

## 6. Entregáveis

- Código-fonte organizado + `index.html` com marcadores `<!--BUILD:HEAD-->`, `<!--BUILD:BODY-->`,
  `<!--BUILD:SCRIPTS-->`.
- `scripts/build_single_file.py` (desta skill) gera `dist/<Nome>.html` (abre com dois cliques, offline) e
  uma variante só-corpo para publicar como Artifact.
- `server.py` local com `Cache-Control: no-cache` + `start.bat`/`start.sh`.
- `README.md` (no idioma do usuário): como rodar, perfis de demo, roteiro de validação passo a passo, o que
  é só demonstração × o que depende de backend, decisão de pilha, limites de desempenho.
- `docs/INTEGRATION.md`: o contrato do adaptador, códigos de erro, requisitos de produção (licença assinada
  no servidor, segredos fora do cliente, autorização no backend).

## 7. Verificação

Use Playwright com o Chromium pré-instalado e WebGL por software. Helpers prontos em
`scripts/pw_lib.js`; armadilhas conhecidas em `references/testing.md`. Em resumo:

1. `node --check` em todos os `.js` depois de cada lote de mudanças.
2. Um roteiro por grupo de critérios de aceite, imprimindo `PASS`/`FAIL` por verificação e capturando
   telas. Olhe as capturas de verdade (layout, sobreposição, legibilidade) e corrija.
3. Teste também: 2D forçado, movimento reduzido, teclado, tela de 400 px sem rolagem horizontal, tema claro,
   e o arquivo único aberto por `file://`.
4. Suites longas: rode em segundo plano e acompanhe; não use `sleep` encadeado.
5. Relate números reais ("132 verificações, 0 falhas") e o que **não** foi medido (fluidez em GPU real).

## 8. Publicar e entregar

1. Commit por etapa no branch de trabalho; push.
2. `python3 <skill>/scripts/build_single_file.py <projeto>` (ou uma cópia `build.py` no projeto) → envie
   `dist/<Nome>.html` ao usuário (`SendUserFile`, `display: attach`).
3. Publique a variante só-corpo como Artifact (carregue `artifact-design`; declare `downloads` se houver
   botões de download), com `icon` genérico e descrição de uma frase.
4. Resposta final curta: o que foi feito, como abrir, perfis de acesso, resultados de teste, decisões e
   limites honestos (demo, pilha, desempenho não medido, referência não copiada).
