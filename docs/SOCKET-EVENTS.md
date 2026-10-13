# Eventos Socket.IO — HL Activity V12

## Sala
- `join-room`
- `room:joined`
- `participants-update`
- `room:host-changed`
- `room:host-reconnecting`
- `room:entry-policy`
- `room:create-invite`
- `room:create-trusted-invite`
- `room:approve-join`
- `room:reject-join`
- `room:mode`
- `room:spotlight`

## Stream / signaling
- `stream-started`
- `stream-stopped`
- `offer`
- `answer`
- `ice-candidate`

## Chat
- `chat:send`
- `chat:history`
- `chat:edit`
- `chat:delete`
- `chat:react`
- `chat:typing`

## Voz
- `voice:join`
- `voice:leave`
- `voice:state`
- `voice:speaking`
- `voice:offer`
- `voice:answer`
- `voice:ice`
- `voice:user-left`

## Reações do palco
- `reaction:send`
- `reaction:show`

Contrato V12: existe somente um handler servidor de `reaction:send`, em `src/socket/social-events.js`.

## Soundboard
- `sound:play`
- `sound:stop`
- `sound:policy`
- `sound:upload-policy`
- `sound:catalog-add`
- `sound:catalog-update`
- `sound:catalog-remove`

## Moderação / presença / diagnóstico
- `moderation:*`
- `presence:update`
- `diagnostics:ping`

## Regras

Eventos críticos devem validar contexto da sala, permissão/role no servidor, payload e rate limit. Eventos com target devem confirmar que o socket alvo pertence à mesma sala.
