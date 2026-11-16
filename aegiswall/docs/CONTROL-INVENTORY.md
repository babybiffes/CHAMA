# Inventário de controles

Cada controle visível, o que o dispara, o que muda e onde é verificado. “Teste” aponta para a verificação
automatizada em `tests/` (`A1` = `acceptance-1-wall.js`, `A2` = `acceptance-2-ops.js`,
`A3` = `acceptance-3-settings.js`); “manual” = conferido pelo roteiro do README.

Regra aplicada a todos: um controle indisponível fica desabilitado **com o motivo no `title`** (perfil,
controlador fora do ar, nada a fazer, licença) e o serviço recusa a ação de qualquer forma.

## Tela de entrada

| Controle | Manipulador | Efeito / resultado | Falha, vazio, desabilitado | Teste |
| --- | --- | --- | --- | --- |
| User, Password, **Sign in** | `app.js` `signIn` → `svc.auth.login` | Abre a aplicação; botão mostra “Signing in…” | Campos vazios ou credencial errada: mensagem ao lado do botão, foco na senha | A3 (troca de perfil) |
| **Operator / Technician / Administrator** | `signIn` com conta de referência | Entra em Demo Mode com o perfil | — | A1, A3 |
| **Enter or import a license / View license** | `licensingUI.openActivation` | Diálogo de ativação do usuário final | — | manual |

## Cabeçalho e navegação

| Controle | Manipulador | Efeito / resultado | Falha, vazio, desabilitado | Teste |
| --- | --- | --- | --- | --- |
| Rail **Wall / Audio / System & Maintenance / Settings** | `app.go` | Troca de área preservando seleção e rascunhos | — | A2, A3 |
| Chip de conexão | `renderHeader` (evento `conn`) | Mostra Demo · Online / Offline / Reconnecting / Restarting em texto | — | A2 (14) |
| Indicador de saúde | `app.go('system','info')` | Abre o cartão System Information; mostra contagem de alertas | — | A2 (19) |
| Botão de mudo | `svc.audio.setMasterMute` | Mudo mestre imediato, confirmado pelo serviço | Erro em aviso | A2 (15) |
| Chip **pending changes / Confirmed / Apply failed** | popover em `app.js` | Lista o que está pendente ou o motivo da falha | Sem pendências: explica que o rascunho está igual ao confirmado | A1 (8) |
| **Discard** | `wallUI.discard` → `wall.discard` | Rascunho volta ao confirmado (com Undo no aviso) | Desabilitado sem pendências | manual |
| **Apply / Retry Apply** | `wallUI.apply` → `wall.apply` → `svc.wall.apply` | “Sending…” + barra indeterminada; após o aceite, varredura e “Confirmed hh:mm:ss” | Falha: rascunho intacto, motivo no chip e no aviso, Retry. Desabilitado offline, sem pendências ou durante envio | A1 (8) |
| Menu da conta: Account settings, Licensing, **Sign out** | `app.go` / `app.signOut` | Navega ou sai mantendo o trabalho em memória | — | A3 (20) |

## Wall — palco

| Controle / gesto | Manipulador | Efeito / resultado | Observações | Teste |
| --- | --- | --- | --- | --- |
| Arrastar (Explore 3D) | `stage.js` ponteiro → `rig.goal` | Órbita limitada (±54° / −5°…40°) | Interrompe a abertura | A1 (2) |
| Botão direito, Shift+arrastar, dois dedos | idem | Pan limitado à parede | — | A1 (2) |
| Roda / pinça | idem | Zoom entre os limites de enquadramento | — | A1 (2) |
| Clique num monitor | evento `stage-click` → `wall.select` | Contorno desenhado, legenda ancorada, inspetor Monitor | Clique fora: limpa a seleção | A1 (2) |
| Duplo clique | `stage.focusTile` | Aproxima a câmera do monitor | — | manual |
| Teclado no palco: setas, Shift+setas, + − , Home | `wall-ui.js` `keydown` → `stage.nudge` | Órbita, pan, zoom, enquadrar | Alternativa ao mouse | manual |
| **Skip intro** / tecla / clique | `stage.skipIntro` | Encerra a abertura e libera os controles | — | A1 (1) |
| Faixa fora da área: **Reposition, Fit Proportionally, Undo, Cancel** | `wall.bringInside`, `fitProportional`, `undo`, dispensar | Recupera conteúdo sem descartar nada | Fit só aparece após mudança de grade | A1 (6) |

## Wall — dock

| Controle | Manipulador | Efeito / resultado | Desabilitado | Teste |
| --- | --- | --- | --- | --- |
| **Explore 3D / Edit Layout** (tecla E) | `wallUI.setMode` → `stage.setMode` | Transição única da câmera; camada de edição aparece quando alinhada | — | A1 (4, 5) |
| **Front View** (tecla F) | `stage.frontView` | Vista frontal enquadrada | — | manual |
| **Fit All** | `stage.fitAll` | Enquadra a parede mantendo o ângulo | — | A1 (2) |
| **Undo / Redo** (Ctrl+Z / Ctrl+Y) | `wall.undo` / `wall.redo` | Volta/avança no histórico real do rascunho | Sem histórico ou durante envio (motivo no `title`) | A1 (6) |
| **Saved Layouts** | `wallUI.toggleShelf` | Abre a prateleira; painéis laterais cedem espaço | — | A1 (7) |

## Wall — biblioteca de fontes

| Controle | Manipulador | Efeito / resultado | Vazio / falha | Teste |
| --- | --- | --- | --- | --- |
| Busca | `renderLibrary` | Filtra por nome, local e ID | “No sources match” + Clear search | A1 (4) |
| Categorias (All, Cameras, Mosaics, Web, YouTube, Apps) | idem | Filtra por tipo | — | manual |
| **Add** / Enter na linha | `addFromLibrary` → `wall.addSource` | Coloca no primeiro quadrante livre com saída física; contorno traçado | Fonte indisponível: coloca e avisa | A1 (4) |
| Arrastar para o palco | `onSourcePointerDown` | Fantasma no destino + linha de conexão; ao soltar, o conteúdo assenta | Soltar fora cancela | manual (captura `w8b`) |
| **Show N more** | `renderLibrary` | Lista mais 60 fontes | — | manual |
| Recolher / aba **Sources** | `togglePanel('lib')` | Painel some e a câmera reenquadra | — | manual |

## Wall — edição (Edit Layout)

| Controle / gesto | Manipulador | Efeito / resultado | Observações | Teste |
| --- | --- | --- | --- | --- |
| Arrastar conteúdo | `onFramePointerDown` → `wall.calcMove` → `setRect` | Move com encaixe e guias; grava ao soltar | Alt ignora encaixe; Esc cancela; bloqueado não move | A3 (fallback) |
| 8 alças | idem → `wall.calcResize` | Redimensiona; respeita proporção travada; medida ao vivo | Mínimo 160 × 90 | A1 (4) |
| Setas / Shift / Alt (com foco no conteúdo) | `onFrameKey` | Move 10 / 100 / 1 px; Ctrl+setas redimensiona | Alternativa ao arraste | A3 (12) |
| Delete | `wallUI.removeItem` | Remove da parede com Undo no aviso; a fonte continua rodando | — | A3 (12) |
| Ctrl+D, `[` `]` | `wall.duplicate`, `wall.reorder` | Duplica; muda camada | — | manual |

## Wall — inspetor (um por vez)

| Controle | Manipulador | Efeito / resultado | Inválido / desabilitado | Teste |
| --- | --- | --- | --- | --- |
| **Columns / Rows** (− + e campo) | `wall.setGrid` | Total imediato; monitores chegam/saem; câmera reenquadra | Fora de 1…limite: valor volta e aviso. Somente leitura em On air ou durante envio | A1 (3, 12) |
| **Split monitors…** / **Split this monitor** | `openSplit` / `wall.split` | Quadrantes de 1 a 4×4; conteúdo redistribuído | — | manual |
| **Showing: Draft / On air** | `wall.setView` | Mostra o rascunho ou o confirmado (somente leitura) | — | manual |
| **Snapping** | `AW.savePrefs` | Liga/desliga encaixe | — | manual |
| Lista **Content** / **Content on this monitor** | `wall.select` | Seleciona o conteúdo (alternativa por teclado) | Vazio: orientação | manual |
| Seletor **Monitor** | `wall.select` | Escolhe qualquer monitor sem mouse | — | manual |
| **Open hardware mapping** | `app.go('settings','hardware')` | Vai ao mapeamento | — | manual |
| **Focus view on this monitor** | `stage.focusTile` | Aproxima a câmera | — | manual |
| **X / Y / W / H** | `commitNumber` → `wall.setRect` | Posição e tamanho exatos | Não numérico ou abaixo do mínimo: mensagem e valor anterior | A1 (4) |
| **Fit to monitor / Fill spanned monitors / Entire wall** | `wall.fit` | Ajusta ao quadrante, aos monitores tocados ou à parede | Bloqueado: desabilitado | manual |
| **Lock aspect ratio / Lock position** | `wall.setProp` | Trava proporção / posição | — | manual |
| **To front / Forward / Backward / To back** | `wall.reorder` | Ordem das camadas | Já no extremo: desabilitado | manual |
| **Division** (mosaico) | `wall.setProp('mosaic')` | 2×2, 3×3 ou 4×4 dentro do conteúdo | — | manual |
| **Content area only** | `wall.setProp('contentOnly')` | Oculta a barra de título na prévia (Demo) | — | manual |
| **Link**, **Play link preview / Stop**, **Open in new tab** | `parseLink`, `startPreview` | Prévia de YouTube, página, imagem ou vídeo sob demanda | Endereço inválido ou RTSP: explicação | manual |
| **Duplicate / Remove from wall** | `wall.duplicate` / `wallUI.removeItem` | Copia / remove sem encerrar a fonte | — | manual |

## Wall — layouts salvos

| Controle | Manipulador | Efeito / resultado | Falha / vazio | Teste |
| --- | --- | --- | --- | --- |
| **Cards / List** | `renderShelf` | Carrossel arrastável ou lista acessível | — | A1 (7) |
| ‹ › e setas no carrossel | `step` | Seleciona o cartão anterior/próximo | — | manual |
| **Save current draft…** | `wall.layouts.save` | Persiste no navegador | Nome vazio ou repetido: mensagem | A1 (7) |
| **Load** | `wall.layouts.load` | Retângulos viajam até o layout; só o rascunho muda | Desabilitado durante envio | A1 (7) |
| **Rename / Update / Delete** | `layouts.rename / overwrite / remove` | Renomeia, substitui pelo rascunho, apaga (com confirmação) | — | A1 (7) |

## Audio

| Controle | Manipulador | Efeito / resultado | Falha / desabilitado | Teste |
| --- | --- | --- | --- | --- |
| **Master volume**, níveis, rotas, política, mudo por fonte | `audio-ui.js` `onChange` | Alteram o rascunho de áudio; lista “Staged, not yet live” | — | A2 (15) |
| **Apply audio changes / Discard** | `svc.audio.apply` | Vira ativo só após o aceite | Falha: rascunho mantido e motivo; offline: desabilitado | A2 (15) |
| **Master mute** | `svc.audio.setMasterMute` | Imediato, confirmado | — | A2 (15) |
| **Local preview monitoring** | `onChange` (AudioContext) | Tom de teste audível neste navegador; não mexe na parede | Navegador bloqueia: mensagem | manual |
| **Refresh devices** | `svc.audio.refreshDevices` | Relê a lista | — | manual |
| **Test Output / Stop** | `svc.audio.startTest / stopTest` | Tom de 3 s a 20 %; Stop sempre disponível | Dispositivo desconectado: recusado, sem redirecionar | A2 (15) |
| Avançado: modo, troca L/R, balanço, taxa, canais, ganho, buffer, offset A/V | `onChange` + `svc.audio.validate` | Ajustes por endpoint no rascunho | Fora da faixa: mensagem e valor anterior | manual |
| Presets: **Save / Load / Rename / Delete** | `svc.audio.presets.*` | Persistem; Load apenas prepara para Apply | Sem licença: bloqueado com atalho para Licensing | A2 (15) |
| **CLIP** | `onClick` | Zera o indicador de clipping | — | manual |

## System & Maintenance

| Controle | Manipulador | Efeito / resultado | Falha / desabilitado | Teste |
| --- | --- | --- | --- | --- |
| **Refresh** | `svc.telemetry.sample` | Nova amostra com horário e origem | Offline: desabilitado, valores não são inventados | A2 (13) |
| **Pause / Resume Live Updates** | `telemetry.paused` | Congela e marca “Paused” | — | A2 (13) |
| **Sampling interval** | `AW.savePrefs` | 2, 5, 10 ou 30 s | — | A2 (13) |
| Filtro | `renderBody` | Filtra dispositivos e detalhes | “Nothing matches” | A2 (13) |
| Abas e blocos do resumo | `Y.tab` | Uma categoria por vez | — | A2 (13) |
| **Details** | `showDetail` | Todos os campos do dispositivo | — | A2 (13) |
| **Run Diagnostics** | `svc.telemetry.diagnostics` | 8 verificações com progresso e resultado | Requer Technician | A2 (13) |
| **Export Diagnostic Report** | `svc.telemetry.report` + `AW.saveFile` | JSON com telemetria, config, logs; segredos ocultos | Requer Technician | A2 (13) |
| **Historical charts** | `renderHistory` | Recolhido por padrão | Poucas amostras: aviso | A2 (13) |
| Limiares: campos, **Save thresholds, Cancel, Restore Defaults** | `svc.config.save('thresholds')` | Mudam os alertas do cabeçalho | Fora da faixa: mensagem; Operator: somente leitura | manual |
| **Restart Application Service… / Reboot Controller Host…** | `maintenance` → `svc.maint.restart` | Confirmação (reboot exige digitar o host), aceite, queda, reconexão por sonda | Sem aceite: nada executado. Sem retorno: falha, nunca sucesso | A2 (14) |
| **Retry connection** | `svc.maint.retryConnection` | Nova sonda | — | A2 (14) |
| **Open logs / Open technician console** | `app.go` | Vai para Settings | — | manual |

## Settings

| Controle | Manipulador | Efeito / resultado | Falha / desabilitado | Teste |
| --- | --- | --- | --- | --- |
| Busca de configurações | `renderNav` | Filtra categorias e lista campos encontrados | “No setting matches” | A3 (16) |
| Categorias | `P.open` | Rascunho de cada categoria é mantido; ponto marca não salvo | — | A3 |
| **Save / Cancel / Restore Defaults** (por categoria) | `formPanel.action` | Valida, resume mudanças disruptivas, grava e aplica | Inválido: mensagem no campo e nada é salvo; conflito: “Reload newer configuration” | A3 (16, 20) |
| Appearance: Theme, Motion, Monitor identifiers, Opening sequence, Clock format, Snapping | `AW.savePrefs` | Tema, nível de movimento, etiquetas, abertura, horário | — | A3 (20) |
| **Replay opening sequence** | `wallUI.playIntro` | Toca a abertura uma vez | 2D: desabilitado | manual |
| Account: Sign out when idle, **Sign out** | `AW.savePrefs`, `app.signOut` | Encerra sessão ociosa mantendo o rascunho | — | manual |
| Hardware mapping: Wall name, saída por tile, **Detect outputs, Save mapping, Confirm mapping on hardware** | `svc.outputs.*` | Estados Planned / Detected / Confirmed / Missing | Saída repetida: erro e Save bloqueado | manual |
| Preview & rendering: preset, modo, resolução 3D, sombras, reflexos, resolução/taxa/intervalo/limite de prévias | `AW.savePrefs` → `stage.applyQuality` | Muda só o que este navegador desenha | Saída da parede é somente leitura | A3 (16) |
| Content reload: intervalo padrão, agenda, timeout, tentativas, espera, cache, intervalo por fonte, **Reload Now** | `svc.config.save('reload')`, `svc.reload.now` | Agenda recargas; estado da última recarga | Recarga em andamento: recusada, sem fila | A3 (16) |
| Network access: protocolo, portas, hostname, certificado, bind, **Test configuration, Apply…** | `svc.net.test / apply` | Lista de verificações; reinício do listener; reconexão | Erros de certificado/porta; endereço inalcançável → rollback | A3 (17) |
| Database: conexão, **Test Connection, Save connection** | `svc.db.test / save` | Só troca após teste aprovado; aviso de migração | Falha de teste mantém a conexão atual | A3 (18) |
| Backups: agenda, horário, retenção, destino, **Backup Now, Download, Restore…, Restore from file…** | `svc.db.backupNow / restore` | Arquivo real; restauração com confirmação digitada e backup de segurança | Arquivo inválido: recusado | A3 (18) |
| Configuration: **Verify persisted settings, Export, Import…, Restore previous configuration** | `svc.config.*` | Releitura do armazenamento; arquivo versionado sem segredos; prévia das diferenças | Sem licença ou perfil: desabilitado com motivo | manual |
| Logs: abas, severidade, serviço, datas, busca, **Pause/Follow, Clear View, Export filtered entries** | `settings-admin.js` | Filtra; Clear View só limpa a tela | Nada a exportar: aviso | A3 (18) |
| Log storage: nível, retenção, rotação, **Delete stored logs…** | `AW.logs.setConfig / deleteStored` | Persistem; exclusão é ação separada e auditada | Requer Technician / Administrator | manual |
| Technician console: entrada, **Run, Cancel, Clear, Export**, atalhos, ↑ ↓ | `svc.console.run` | Saída estruturada, status e código de saída | Fora da lista: 127; disruptivo: recusado; sem licença/perfil: bloqueado | A3 (18) |
| Licensing: **Import license file…, Validate, Activate, Deactivate** | `licensing-ui.js` `handle` | Estados válida, inválida, expirada, revogada, já ativada, limite, indisponível | — | A2 (9, 10) |
| Licensing: **Generate License…** (edição, recursos, validade, instalações), **Copy, Download License File, Activate on This Installation** | `openGenerate` → `svc.license.generate` | ID único e registro persistido; texto selecionável | Requer Administrator; serviço fora do ar: nada muda | A2 (9) |
| Licenças emitidas: **Copy, Download, Use, Revoke** | `licensingUI.bind` | Copia/baixa o dado real; revogar trava recursos | — | A2 (10) |
| **Simulate a different installation, Reset licensing demo data** | `svc.license.newInstallationId / resetDemo` | Permite repetir o fluxo | — | A2 (10) |
| Demo tools: 8 chaves de falha, **Force the 2D fallback, Reload page now, Simulate a concurrent settings edit, Reset all demo data…** | `settings-ui.js` painel `demo` | Provocam cada caminho de falha | Reset exige digitar RESET | A2, A3 |

## Diálogos e avisos comuns

| Controle | Manipulador | Efeito |
| --- | --- | --- |
| Fechar (×), Esc, clique fora | `AW.dialog` | Fecha e devolve o foco ao controle de origem (bloqueado em progresso de manutenção) |
| **Cancel / Confirm**, frase digitada | `AW.confirm` | Ações disruptivas só seguem com confirmação explícita |
| Aviso: **Undo / Retry**, fechar | `AW.toast` | Ação de recuperação direta |
| Diálogo de texto com **Copy** | `AW.showText` | Aparece quando o visualizador não permite salvar arquivo: o dado real fica disponível para copiar |
