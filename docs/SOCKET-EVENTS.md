# Eventos Socket.IO — resumo V11.1

## Sala
- `join-room`
- `room:joined`
- `participants-update`
- `room:host-changed`

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

## Reações do palco
- `reaction:send`
- `reaction:show`

**Contrato:** existe somente um handler servidor de `reaction:send`, em `src/socket/social-events.js`.

## Soundboard
- `sound:play`
- `sound:stop`
- `sound:policy`
- `sound:upload-policy`

## Moderação / produto
- `moderation:*`
- `room:entry-policy`
- `room:create-invite`
- `room:create-trusted-invite`
- `presence:update`
- `diagnostics:ping`

Todos os eventos críticos devem validar contexto de sala, role/permissão e rate limit no servidor.
