# Arquitetura — HL Activity V12

## Princípios

1. Web e Discord Activity compartilham o mesmo core de sala.
2. Stream e Voz usam WebRTC, mas possuem estados independentes.
3. O servidor é autoridade para host, moderação, permissões e políticas da sala.
4. Assets de produção usam nomes estáveis; a versão pertence ao aplicativo, não ao nome do arquivo.
5. Código legado fica fora das rotas públicas.

## Frontend

### Core

`frontend/core/`

- `app-version.js`: versão visível no cliente.
- `capabilities.js`: detecção de APIs do navegador.
- `connectivity.js`: estado online/offline e bloqueio de ações realtime quando offline.
- `error-codes.js`: mensagens padronizadas.
- `room-entry.js`: pré-entrada direta na sala com perfil e teste de microfone.

### Sala

`room-core.js` é compartilhado por `room.html` e `activity-room.html`. Particularidades da Activity são determinadas pelo contexto da rota; a antiga cópia `activity-room-core.js` foi movida para legado.

### Social

- `frontend/social/social-runtime.js`: shell, participantes e coordenação.
- `chat/chat-module.js`: mensagens, edição, resposta, typing e unread.
- `voice/`: máquina de estado, dispositivos, signaling de voz, PTT, mute/deaf e cleanup.
- `soundboard/`: catálogo, filtros, preview, upload, reprodução local/sala e edição.
- `reactions/`: reactionId, deduplicação, limite visual e posicionamento relativo ao palco.

### CSS

- `tokens.css`: escala central de z-index e tokens compartilhados.
- `components.css`: componentes nativos normalizados.
- `room.css`: layout-base da sala.
- `product.css`: central de configurações/produto.
- `social-shell.css`, `chat.css`, `voice.css`, `soundboard.css`, `reactions.css`, `social-responsive.css`: social por responsabilidade.

A produção V12 possui zero `!important` nos arquivos de `styles/` no baseline entregue.

## Backend

`src/socket/` separa join, stream, signaling, chat, voz, social e disconnect.

`src/services/room-service.js` mantém salas efêmeras em memória. Persistência permanente de contas/amigos/sons não faz parte da V12.

## Escala

O limite da sala foi reduzido para 10 participantes. Voz continua P2P mesh; o produto deve ser medido principalmente em 2/4/6/8 participantes antes de considerar SFU.

## TURN

`/client-config.js` fornece ICE servers. `TURN_SHARED_SECRET` nunca é enviado ao cliente; quando configurado, o backend gera username/credential temporários.
