# Testes e armadilhas

## Ambiente
- Chromium e Playwright já vêm instalados nas sessões em nuvem: `require('playwright')` funciona de qualquer
  pasta. Não rode `playwright install`.
- WebGL sem GPU: lance com `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
  --ignore-gpu-blocklist` (já em `scripts/pw_lib.js`). Serve para comportamento, não para medir fluidez.
- Sirva o projeto com `python3 -m http.server 8765` (ou o `server.py` com `no-cache`) em segundo plano.
- CDNs costumam estar bloqueados no proxy da sessão: vendorize bibliotecas (`npm pack three@0.160.0`,
  extraia `package/build/three.min.js`). No r160 a primeira linha é um `console.warn(...)` de depreciação
  seguido de `function(t,e){...}` sem `!`: remova o warn e reponha o `!` antes de `function`, senão o arquivo
  não executa. Teste com `node -e "global.self=global; console.log(require('./vendor/three.min.js').REVISION)"`.

## Estrutura dos roteiros
- Um arquivo por grupo de critérios de aceite (ex.: fluxo principal; operações; configurações e
  robustez). Cada verificação imprime `PASS`/`FAIL` com o valor observado.
- Verifique o **estado** (`page.evaluate`) e a **interface** (texto, `isDisabled`, `isVisible`).
- Capture telas nos pontos-chave e **olhe** para elas: sobreposição de painéis, textos cortados, legenda
  cobrindo conteúdo, contraste no tema claro.
- Rode também: 3D desligado à força (fallback 2D), `reducedMotion: 'reduce'`, viewport 400×780 (sem
  rolagem horizontal: `document.documentElement.scrollWidth <= innerWidth`), tema claro, e o arquivo único
  via `file://`. Para a variante de Artifact, envolva-a no esqueleto mínimo e abra por `file://`.
- Suites longas (> 2 min): `run_in_background` e leia a saída quando terminar; não encadeie `sleep`.

## Armadilhas encontradas
| Sintoma | Causa | Solução |
| --- | --- | --- |
| `click` num radio expira: "`<input>` intercepts pointer events" | input invisível sobre o `span` estilizado | clique no `label:has(input[...])` |
| Edição falha logo após trocar para vista frontal | câmera ainda em transição; overlay oculto | `waitForFunction(() => stage.aligned() && stage.settled())` |
| Canvas cobre o SVG e o overlay | canvas adicionado depois das camadas | `container.insertBefore(canvas, container.firstChild)` |
| Animação não progride em ambiente lento | `dt` limitado demais por quadro | limite `dt` em ~0,12 s, não 0,05 |
| Salvar numa categoria de configuração invalida o rascunho de outra | versão global única | versão por seção |
| Salvar item novo não mostra ações | seleção mudou sem re-render | re-renderizar após `save` |
| Arquivo importado não reconhecido | o arquivo é JSON com o token dentro | aceitar texto puro **e** `{ token }` |
| `confirm()`/`alert()` não aparecem em Artifact | o visualizador bloqueia | diálogos próprios na página |
| Download não acontece em Artifact | `<a download>` é inerte lá | capability `downloads` + fallback de copiar |
