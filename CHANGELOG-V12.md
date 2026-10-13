# Changelog — HL Activity V12.0.0

## Core
- versão global 12.0.0;
- core de sala compartilhado Web/Discord Activity;
- assets com nomes estáveis;
- `.gitattributes` para LF/CRLF consistente.

## UI/CSS
- social CSS dividido em shell/chat/voice/soundboard/reactions/responsive;
- zero `!important` nos estilos de produção entregues;
- escala de z-index central;
- inputs/range/scrollbars padronizados;
- botão Compartilhar com styling de segurança e estados explícitos;
- pré-entrada direta modernizada;
- logo WebP otimizado.

## Social
- Chat em controlador próprio;
- Voz em subsistema próprio;
- Soundboard em controlador próprio;
- Reações em controlador próprio com deduplicação.

## Backend/segurança
- scrypt para novas senhas de sala;
- limite global de memória para sons;
- sala limitada a 10 usuários;
- grace period de host de 8 s;
- suporte STUN/TURN configurável;
- `/ready`, versão e logs estruturados.

## PWA
- cache único por APP_VERSION;
- limpeza de cache antigo;
- atualização controlada;
- API, Socket.IO e client-config fora do cache.

## Testes
- testes V12 substituem checks legados excessivamente acoplados;
- testes de core/segurança/social preservados e ampliados.
