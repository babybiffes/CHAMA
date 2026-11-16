# Testes de aceitação

Roteiros Playwright que percorrem os 20 passos de validação do pedido contra a aplicação rodando.

```
python server.py                      # em outro terminal, na pasta aegiswall/
node tests/acceptance-1-wall.js       # passos 1–8 e 12: abertura, câmera, grade, edição, layouts, Apply
node tests/acceptance-2-ops.js        # passos 9–10 e 13–15: licenças, sistema, manutenção, áudio
node tests/acceptance-3-settings.js   # passos 16–20: configurações, rede, banco, logs, console, perfis,
                                      # falha de WebGL, movimento reduzido, teclado e tela de celular
```

Cada linha sai como `PASS` ou `FAIL`. Capturas de tela vão para `tests/out/` (ignorada pelo git).
Precisa de Node com o pacote `playwright` e um Chromium. `AEGISWALL_URL` aponta para outro endereço, por
exemplo o arquivo único: `AEGISWALL_URL=file:///caminho/dist/AegisWall.html`.

Os testes usam renderização por software quando não há GPU; servem para verificar comportamento, não fluidez.
