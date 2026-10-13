# HL Activity V12 — Core Consolidation

## Veredito V12

A V12 foi tratada como consolidação arquitetural, não como nova camada de hotfix. A base de produção foi reorganizada para reduzir conflito entre gerações de CSS/JS, separar responsabilidades do social, unificar Web e Discord Activity onde havia duplicação e criar gates mais seguros de atualização.

**Status desta entrega:** código alterado e auditado estaticamente; suíte local de testes aprovada; build Vite, health/readiness com dependências instaladas e E2E real de navegador não puderam ser validados neste ambiente por indisponibilidade/timeout na instalação das dependências de desenvolvimento e por falha do Chromium headless no ambiente. O atualizador PowerShell exige esses gates antes de qualquer push.

## O que foi reconstruído

- Versionamento único `12.0.0` para app, backend, PWA/cache e diagnóstico.
- Assets de produção com nomes estáveis, sem `?v=10`, `?v=103` e `?v=111`.
- Camada social separada em Chat, Voice, Soundboard e Reactions.
- CSS social dividido fisicamente por responsabilidade, sem `!important` em produção.
- Escala central de z-index e tokens visuais.
- Um core de sala compartilhado entre Web e Discord Activity; diferenças específicas ficam condicionais/adaptadas.
- Sistema de Voz com state machine explícita, dispositivos, WebRTC, áudio/PTT e cleanup.
- Frontend do Soundboard extraído para controlador próprio.
- Reações extraídas para módulo próprio com deduplicação por `reactionId`.
- Chat extraído para controlador próprio.
- Estratégia PWA/cache V12 com atualização controlada.
- Pré-entrada direta da sala modernizada.
- Estado de compartilhamento de tela explícito.
- Tratamento online/offline, capability detection e catálogo de códigos de erro.

## O que foi removido / aposentado da produção

- `activity-room-core.js` duplicado.
- `activity-room.css` duplicado.
- nomes vivos `hl-v10.*`, `home-v10.*`, `hl-social-v11.*` e `hl-pwa.*` da camada de produção.
- camada unificada antiga de CSS social da produção.
- testes V11 frágeis que apenas protegiam nomes/estrutura legados.
- dependência de query strings de versão manuais nos assets de produção.

Histórico útil foi preservado em `legacy/` e `docs/history/`, mas não deve ser servido como asset de produção.

## O que foi preservado

- Node.js + Express + Socket.IO + WebRTC.
- criação/entrada de sala e códigos de sala.
- compartilhamento de tela e presets de qualidade.
- Chat e histórico.
- Voz e signaling P2P.
- Soundboard, sons embutidos e upload customizado.
- Reações.
- convites/lobby/trusted invite.
- painel de configurações e recursos de produto existentes.
- PiP, Wake Lock, PWA e diagnóstico quando suportados.
- autoridade de host/moderação no servidor, rate limits, Helmet/CSP/origin guard e validação de payloads/uploads.

## CSS

Produção atual usa:

- `styles/tokens.css`
- `styles/components.css`
- `styles/room.css`
- `styles/product.css`
- `styles/home-product.css`
- `styles/social-shell.css`
- `styles/chat.css`
- `styles/voice.css`
- `styles/soundboard.css`
- `styles/reactions.css`
- `styles/social-responsive.css`
- `styles/v12-overrides.css`

Auditoria final: **0 ocorrências de `!important` em `styles/*.css`**.

A escala de z-index passou a ser controlada por tokens (`base`, `header`, `footer`, `panel`, `popover`, `backdrop`, `modal`, `toast`) em vez da sequência anterior de valores arbitrários muito altos.

Risco residual: `styles/room.css` ainda é grande (~3005 linhas) e merece uma futura divisão por layout/palco/footer, mas foi mantido nesta consolidação para não introduzir regressão desnecessária no core visual já existente.

## Soundboard

- Controller separado em `frontend/social/soundboard/soundboard-controller.js`.
- Catálogo/persistência auxiliar em `soundboard-module.js`.
- Corrigida regressão real onde `setTab("sounds")` chamava `renderSounds()` inexistente; agora usa o controller.
- 2 colunas no desktop e 1 no mobile via CSS dedicado.
- lista de sons como principal área rolável.
- preview local, room play, stop, favoritos, recentes, busca e CRUD customizado preservados.
- listeners Socket.IO principais agora possuem referências nomeadas e são removidos no `destroy()`.
- reaplicação de estado offline depois da renderização dinâmica dos cards.
- limite global de memória para áudio customizado adicionado no servidor (64 MB), além do limite por sala.

## Reações

- Controller separado em `frontend/social/reactions/reactions-module.js`.
- local immediate feedback + `reactionId` único + broadcast remoto + deduplicação.
- limite visual de 3 simultâneas.
- duração aproximada de 1,35 s.
- camada ancorada ao palco.
- um único handler servidor `reaction:send` preservado e testado.

## Chat

- Controller separado em `frontend/social/chat/chat-module.js`.
- mensagens, reply, edit/delete, reactions de mensagem, typing e unread preservados.
- cleanup dos principais handlers de DOM/Socket centralizado.

## Voice

Criados:

- `voice-state.js`
- `voice-config.js`
- `voice-devices.js`
- `voice-controller.js`

O controller passou a concentrar:

- state machine `disconnected/requesting-permission/connecting/connected/reconnecting/error`;
- seleção e troca de dispositivos;
- `devicechange`;
- `getUserMedia`;
- offer/answer/ICE;
- peers e áudio remoto;
- mute/deaf/PTT;
- speaking detection;
- cleanup de streams, peers, AudioContext, listeners e socket handlers.

Voice continua independente do compartilhamento de tela.

**Não testado fisicamente nesta entrega:** microfones reais em dois dispositivos, troca real de headset e conectividade TURN através de NAT restritivo.

## Stream / compartilhamento

`room-core.js` agora possui estados explícitos:

- idle
- requesting
- sharing
- stopping
- error

`getDisplayMedia` tem capability check e `track.onended` sincroniza a UI quando o usuário interrompe a captura pelo navegador.

Risco residual: `room-core.js` continua grande e é candidato a futura divisão em room/stream/participants/reconnect, embora a duplicação Web/Activity tenha sido removida nesta fase.

## WebRTC

- Voice e stream não compartilham estado de sessão.
- configuração ICE do Voice vem de `window.HL_CONFIG.iceServers`.
- `/client-config.js` fornece STUN e TURN opcional.
- suporte a TURN por `TURN_URL`, `TURN_SHARED_SECRET` ou credenciais explícitas.
- com shared secret, o servidor gera credencial temporária compatível com coturn; o segredo não é enviado ao cliente.
- limite de usuários por sala reduzido de 20 para 10 para uma base P2P mais realista.

SFU não foi adicionado; permanece backlog até testes mostrarem necessidade real.

## Socket.IO

- mantidos guards, validação, rate limiting e autoridade servidor.
- documentação V12 atualizada em `docs/SOCKET-EVENTS.md`.
- eventos cliente e servidor não foram confundidos como “duplicados” apenas por compartilharem nomes.
- grace period do host de 8 s adicionado antes de promoção após desconexão.

## Segurança

- senha humana de sala passa a usar `crypto.scryptSync` com salt aleatório.
- verificação aceita formato scrypt e compatibilidade legada quando necessário.
- tokens aleatórios continuam usando hash rápido/timing-safe, apropriado à alta entropia deles.
- host/moderação permanecem validados no servidor.
- upload de som permanece validado servidor-side.
- logger estruturado evita registrar campos com nomes sensíveis como token/password/secret/credential/cookie.

Limitação preservada e documentada: ban baseado em identidade local/clientId não equivale a ban forte por conta autenticada.

## Performance

- `logo-hl.webp` criado com ~201 KB versus PNG original ~1,6 MB; HTML de produção usa WebP.
- assets antigos deixaram de ser carregados em paralelo apenas por versão.
- social runtime foi reduzido de um arquivo monolítico para runtime + módulos.
- limite global de memória para sons customizados reduz risco de crescimento sem limite.

## PWA

- cache único `hl-activity-12.0.0`.
- sem assets V10/V11 na lista shell.
- `/api/`, `/socket.io` e `/client-config.js` ficam fora do cache.
- caches antigos `hl-activity-*` são removidos na ativação.
- update controlado com aviso “Nova versão do HL disponível” e `SKIP_WAITING`.
- modo offline exibe estado explícito e desabilita ações realtime principais.

## Mobile / Desktop

CSS dedicado mantém:

- social como bottom sheet em mobile;
- Soundboard em 1 coluna mobile / 2 desktop;
- safe-area;
- tabs/toolbar responsivas;
- controle do palco e painel em desktop.

**Não testado visualmente em navegador real nesta entrega:** 1920×1080, 1366×768, 1280×720, 1024×768, 430×932, 390×844 e 360×800. O Chromium headless disponível no ambiente não completou a inicialização/navegação, portanto nenhum resultado visual foi inventado.

## Acessibilidade

- tabs social recebem ids/aria-controls/aria-labelledby.
- navegação por ArrowLeft/ArrowRight/Home/End adicionada.
- focus-visible, reduced-motion e touch sizing seguem o design system.
- capability detection impede oferecer silenciosamente recursos impossíveis quando a API não existe.

## Testes realizados

### TESTE ESTÁTICO

- `node --check` aprovado em **50 arquivos JS** clássicos/backend modificados.
- `activity-client.js` é ESM e é deliberadamente deixado para validação pelo Vite, evitando repetir o falso positivo de CommonJS da V11.1.
- auditoria final confirmou **0 `!important`** nos CSS de produção.
- auditoria final confirmou ausência de referências de assets antigos V10/V11 em produção; menções restantes aparecem apenas nos testes que verificam sua ausência e em histórico/legacy.

### TESTE UNITÁRIO / INTEGRAÇÃO

`npm test`:

- **35 testes**
- **35 aprovados**
- **0 falhas**
- **0 skipped**

Cobertura inclui room service, room utils, chat/social events, reaction broadcast único, WAV assets, scrypt, limites de áudio, grace period de host, shared core, PWA exclusions, segurança, origem e validação SDP/ICE.

## Build

**NÃO VALIDADO neste ambiente.**

Comando final executado:

`npm run build`

Resultado:

`vite: not found` (exit 127)

Antes disso, tentativas de `npm ci --include=dev` foram interrompidas por timeout de transporte do ambiente. Portanto isso não foi classificado como bug do código. O PowerShell de atualização instala dependências e só permite push depois que `npm run build` passar.

## Health / Ready

As rotas foram implementadas:

- `/health`
- `/ready`
- `/api/version`

**NÃO VALIDADO em runtime final neste ambiente**, pois as dependências do servidor ficaram indisponíveis após o timeout de instalação. O updater valida `/health` e `/ready` numa porta temporária antes do Git push.

## E2E / navegador / dois clientes

**NÃO TESTADO / NÃO APROVADO.**

Foi preparado `tests/browser-harness-v12.html`, porém o Chromium headless do ambiente ficou bloqueado/pendurado por limitações do runtime (incluindo DBus), sem resultado confiável.

Não afirmar que:

- dois clientes reais trocaram áudio;
- TURN foi usado numa rede restritiva;
- keyboard virtual mobile foi validado;
- screenshots de regressão visual foram aprovadas.

Esses itens continuam no gate de validação manual/E2E real.

## Deploy

**NENHUM push/deploy V12 foi feito deste ambiente.**

A árvore de trabalho usada aqui veio de ZIP e não contém `.git`.

O script `ATUALIZAR-HL-ACTIVITY-V12-CORE-CONSOLIDATION.ps1`:

1. encontra o projeto local;
2. cria backup e registra HEAD/bundle quando Git existe;
3. preserva `.env` e `.git`;
4. aplica a V12 de forma limpa;
5. instala dependências;
6. valida sintaxe backend/CommonJS;
7. executa testes;
8. executa Vite build;
9. sobe servidor temporário;
10. valida `/health` e `/ready` com versão 12.0.0;
11. só então faz commit e push da branch atual.

Não usa force push.

## Rollback

- backup inicial da base usada nesta sessão: `HL-Activity-V11.1-BACKUP-BEFORE-V12.zip`.
- updater Windows cria novo backup imediatamente antes da atualização real e tenta gerar Git bundle/HEAD quando aplicável.
- documentação: `docs/DEPLOY-ROLLBACK.md`.

## Riscos restantes

1. `room-core.js` ainda é grande e merece modularização adicional com testes E2E cobrindo comportamento antes de um corte maior.
2. `frontend/product/product-runtime.js` ainda concentra recursos de configurações/produto.
3. pré-entrada da Home e pré-entrada de acesso direto agora são coerentes visual/funcionalmente, mas ainda não são literalmente a mesma implementação compartilhada.
4. Voice precisa teste físico de dois dispositivos, PTT real, devicechange real e TURN.
5. visual regression precisa navegador real nas resoluções definidas.
6. Soundboard deve ser exercitado em navegador real com upload/preview/broadcast após o build passar.
7. alguns logs legados ainda usam `console.*`; logger estruturado foi introduzido, não aplicado universalmente.

## Próximos passos

1. Executar o atualizador no Windows do projeto real.
2. Se dependências/testes/build/health passarem, o script fará commit/push automaticamente.
3. Aguardar Render concluir o deploy.
4. Fazer smoke test Web em dois navegadores/dispositivos: sala, Chat, Reactions, Soundboard, Voice, stream e reconexão.
5. Fazer smoke test Discord Activity separado.
6. Somente depois aprovar a V12 como release de uso normal.

## Correção pós-validação Windows — 13/10/2026

Durante a aplicação real da V12 no Windows, a suíte original passou com 35/35 testes, porém o primeiro build Vite identificou um comentário CSS malformado em `styles/social-shell.css`. O bloco foi corrigido no pacote-fonte final, e foi acrescentado teste de regressão específico para impedir que esse defeito volte.

O `activity-room.html` também passou a marcar scripts clássicos intencionalmente externos com o atributo `vite-ignore`, evitando que o Vite tente tratá-los como scripts ESM/bundláveis apenas para emitir avisos. Esses scripts continuam clássicos e mantêm a ordem/global API existente.

Após a correção manual do CSS no Windows do projeto real, `npm test` e `npm run build` foram aprovados. Health/readiness e o push final continuam obrigatoriamente atrás do gate do atualizador/finalizador; não devem ser considerados aprovados até a execução desse gate no projeto real.

No pacote-fonte corrigido desta revisão, a suíte foi ampliada para **37 testes** e executada com **37 aprovados / 0 falhas**. O build Vite não foi revalidado neste ambiente de empacotamento porque a instalação das dependências de desenvolvimento sofreu timeout de transporte; por isso a aprovação do build continua baseada na execução real do Windows após a correção e deve ser repetida pelo script final antes do push.
