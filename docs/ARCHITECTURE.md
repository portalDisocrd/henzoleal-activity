# Arquitetura — HL Activity V11.1

## Camadas

### HTTP / Express
- `server.js`
- `src/routes/*`
- `src/middleware/*`
- `src/security/*`

### Estado de sala
- `src/services/room-service.js`
- servidor é a autoridade para host, roles, permissões e políticas.

### Socket.IO
- `src/socket/join-room.js`
- `src/socket/chat-events.js`
- `src/socket/voice-events.js`
- `src/socket/social-events.js`
- `src/socket/stream-events.js`
- `src/socket/webrtc-signaling.js`

### Cliente principal
- `room-core.js`: stream/WebRTC e sala web.
- `activity-room-core.js`: Discord Activity.
- `hl-v10.js`: recursos de produto (configurações avançadas, lobby, mixer, diagnóstico, PWA integration).
- `hl-social-v11.js`: única camada social ativa para Chat/Voz/Sons/Reações.
- `hl-social-v11.css`: autoridade visual da camada social.

## Regra de isolamento social

Chat, Voz e Sons usam o mesmo painel, mas apenas uma view pode estar ativa. O JavaScript define `hidden`, `aria-hidden` e classe `is-active`; CSS reforça a regra.

## Legado

CSS/JS sociais antigos ficam em `legacy/social/`. Não são publicados pelo Express e não fazem parte da sala em produção.

## Reactions

1. clique local;
2. `reactionId` único;
3. feedback local imediato;
4. `reaction:send` ao servidor;
5. servidor valida e envia somente aos outros sockets;
6. clientes remotos deduplicam por ID.

A camada visual é posicionada usando `getBoundingClientRect()` do palco.

## Soundboard

- assets padrão em `/sounds`;
- personalizados temporários por sala;
- upload validado por cliente e servidor;
- grid independente com scroll próprio;
- 2 colunas desktop / 1 coluna mobile.
