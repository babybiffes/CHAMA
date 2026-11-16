# Guia de integração

O AegisWall fala com o mundo real por **um único objeto**, `AW.svc`, definido hoje em
`js/services-demo.js` e `js/services-ops.js`. Para integrar com o AllService, o Plot Control ou qualquer
controlador, escreva outro(s) arquivo(s) que exponham o mesmo contrato e troque as duas tags `<script>` em
`index.html`. A interface não precisa mudar.

> Nenhuma API do AllService ou do Plot Control foi presumida. Tudo abaixo descreve o que a **interface**
> espera; o mapeamento para chamadas reais deve ser escrito a partir da documentação desses produtos.

## Regras do contrato

1. **Toda chamada que muda algo devolve uma `Promise`** que só resolve quando o serviço confirma. Falha =
   `reject` com `AW.AppError(code, message)`. A interface nunca mostra sucesso antes da resolução.
2. **Autorização e licença são verificadas no serviço.** No adaptador de demonstração isso é
   `AW.requireRole(...)` e `svc.license.require(...)`; num backend real, cada endpoint valida o token do
   usuário e as permissões. Botão desabilitado é só conveniência.
3. **Indisponível é indisponível.** Em modo real, uma integração ausente deve rejeitar com uma mensagem
   clara (ou marcar o recurso como não configurado). Nunca devolver sucesso simulado.
4. **Valores desconhecidos são `null`.** A interface mostra “Unavailable”. Não invente números.
5. **Eventos** chegam por `AW.bus.emit(nome, dados)`: `conn`, `health`, `mapping`, `config`, `audio`,
   `audio-test`, `reload`, `license`, `maint`, `backups`.

Códigos de erro usados pela interface: `offline`, `forbidden`, `license`, `busy`, `invalid`, `conflict`,
`apply_failed`, `unavailable`, `expired`, `revoked`, `limit`, `no_ack`, `no_return`, `rolled_back`,
`untested`, `timeout`, `cancelled`.

## Contrato por serviço

### `svc` (raiz)
| Membro | Significado |
| --- | --- |
| `mode`, `label` | `'demo'` ou `'live'`; rótulo mostrado ao operador |
| `limits` | `{maxCols, maxRows, monitor:{w,h,hz}}` — vêm do controlador |
| `host` | `{name, role, address}` do host controlador monitorado |
| `conn` | `{state: 'online'|'offline'|'reconnecting'|'restarting', detail, set(), require()}` |

### `svc.auth`
`login(user, pass) → {user, role, name}` · `logout()`. Papéis: `operator`, `technician`, `administrator`.

### `svc.sources`
`list() → [{id, type, name, detail, available, audio, preview, mosaic?, app?}]` · `get(id)`.
Tipos: `camera`, `mosaic`, `web`, `youtube`, `app`.

### `svc.outputs` — planejado × detectado × confirmado
| Método | Papel | Efeito |
| --- | --- | --- |
| `list()` / `detect()` | — / técnico | Saídas físicas `{id, adapter, connected, width, height, hz}` |
| `mapping()` | — | `{ "linha,coluna": {output, confirmed} }` |
| `tileState(key)` | — | `planned` (sem saída), `detected`, `confirmed` ou `missing` |
| `saveMapping(mapping, wallName)` | técnico | Grava; atribuição alterada volta a não confirmada |
| `confirmMapping()` | técnico | O hardware confirma (padrão de identificação) |

### `svc.wall`
`getConfirmed() → {composition, confirmedAt}` · `apply(composition) → {confirmedAt, ack, warnings[]}`.

Composição (pixels na superfície lógica contínua, origem no canto superior esquerdo):

```json
{ "cols": 4, "rows": 3,
  "div": { "1,2": [2, 2] },
  "items": [ { "id": "it-…", "sourceId": "cam-001", "x": 1920, "y": 0, "w": 1920, "h": 1080,
               "aspect": true, "locked": false, "contentOnly": false, "mosaic": 1, "link": "" } ] }
```

A ordem de `items` é a ordem das camadas (último = frente). `apply` deve rejeitar pedidos concorrentes
(`busy`) e nunca alterar o rascunho do operador.

### `svc.license`
`generate(opts)`, `validate(text)`, `activate(text)`, `status()`, `has(feature)`, `require(feature)`,
`revoke(id)`, `list()`, `deactivate()`. Recursos licenciados: `audio.presets`, `maint.console`,
`config.transfer`.

**Produção (obrigatório):**
- gerar e **assinar digitalmente** o conteúdo da licença em um backend autorizado; a chave de assinatura
  nunca vai para o navegador nem para o cliente distribuído;
- verificar assinatura, direitos, validade e política de ativação no servidor;
- tratar **unicidade** (ID gerado com fonte criptográfica + checagem de duplicidade) e **autenticidade**
  (assinatura) como requisitos separados;
- aplicar os recursos licenciados na camada de serviço, não só desabilitando botões;
- definir ativação online e, se houver, verificação offline e período de tolerância;
- suportar revogação, limite de instalações e trilha de auditoria das ações administrativas;
- deixar claro que a revogação só alcança instalações offline na frequência da política de verificação.

O formato `AWDEMO1.<payload>.<checksum>` desta demonstração tem apenas verificação de integridade com uma
constante pública. **Não é uma assinatura** e pode ser forjado.

### `svc.telemetry`
`sample() → snapshot` · `last()` · `history()` · `alerts()` · `diagnostics(onStep)` · `report()` · `browser()`.
O snapshot identifica `host`, `source`, `ts` e traz `cpu`, `mem`, `storage[]`, `os`, `gpus[]`, `capture[]`,
`drivers[]`, `net[]`, `checks[]`, `app`. Exige um **agente autenticado no host** ou API documentada.
`browser()` são os dados reais da máquina do operador e nunca se misturam com os do host.

### `svc.maint`
`restart('service' | 'host', onPhase)` com as fases `requested → acknowledged → stopping → offline →
reconnecting → online` (ou `failed`). `ping()` é a sonda de saúde: a interface só declara “online” quando ela
responde. Reboot **não** é recarregar a página.

### `svc.audio`
`devices()`, `refreshDevices()`, `confirmed()`, `apply(cfg)`, `setMasterMute(bool)`, `startTest(deviceId,
level, seconds)`, `stopTest()`, `meters(cfg, sources, ts)`, `sourcesOnWall(composition)`, `presets.*`.
O áudio é chaveado por **fonte**, então a mesma fonte em vários monitores toca uma vez. Quando um dispositivo
some, o mapeamento é mantido e nada é redirecionado.

### `svc.config` — configuração do host, versionada
`get()`, `section(nome)`, `sectionVersion(nome)`, `save(seção, valores, versãoBase)`, `validate()`,
`export()`, `previewImport(texto)`, `applyImport(prévia)`, `restorePrevious()`.
Seções: `network`, `reload`, `db`, `backup`, `thresholds`. `save` rejeita com `conflict` quando a seção foi
alterada depois que o formulário foi aberto.

### `svc.net` — HTTP/HTTPS
`certs()` (somente metadados), `urls(cfg)`, `test(cfg) → {ok, checks[]}`, `apply(cfg, versãoBase, onPhase)`.
**Produção:** o backend configura o listener e carrega certificados válidos; valida faixa e disponibilidade
de porta, compatibilidade certificado/chave, cobertura do hostname, validade e privilégios; chaves privadas e
credenciais nunca vão para o navegador nem para logs; se o novo endereço não responder, o backend restaura o
anterior. Não desabilitar validação de certificado como atalho.

### `svc.db`
`status()`, `test(cfg, senha)`, `save(cfg, senha, versãoBase)`, `backups()`, `backupNow()`,
`backupText(id)`, `parseBackup(texto)`, `restore(texto, onPhase)`. Credenciais ficam no servidor e voltam
mascaradas. A conexão ativa só muda depois de um teste bem-sucedido. Trocar de motor exige migração.
`restore` sempre cria antes um backup de segurança.

### `svc.reload`
`sources()`, `effective(sourceId)`, `state(sourceId)`, `now(sourceId, causa)`. Uma recarga por fonte por vez;
pedido repetido é recusado (`busy`), nunca enfileirado.

### `svc.console`
`run(linha, {onLine(stream, texto), signal}) → {exit, ms, cancelled}`. **Produção:** backend autenticado,
checagem de papel, lista de comandos permitidos, limite de tempo e de saída, auditoria de cada comando.
Nunca expor um shell irrestrito. Operações disruptivas exigem confirmação explícita.

## Armazenamento do protótipo

Tudo fica em `localStorage` com o prefixo `aegiswall.`: preferências (`prefs`), layouts (`layouts`), rascunho
(`wall.draft`), composição confirmada (`wall.confirmed`), mapeamento (`hw.*`), configuração simulada do host
(`ctl.config`), licenças (`lic.*`), áudio (`audio.*`), logs e auditoria (`log.*`), backups (`db.backups`).
Settings → Demo tools → *Reset all demo data…* apaga tudo.

## Tradução

Todas as strings passam por `AW.t('Texto em inglês', {variáveis})`. Para traduzir:

```js
AW.i18n.add('pt-BR', { 'Apply': 'Aplicar', 'Saved Layouts': 'Layouts salvos' });
AW.i18n.lang = 'pt-BR';
```

O texto em inglês é a chave; o que não estiver no dicionário aparece em inglês.
