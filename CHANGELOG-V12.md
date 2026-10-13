# Changelog — HL Activity V12.0.0

## 12.0.1 — correção visual da pré-entrada

- Corrige regressão no Chromium/Opera em que o `backdrop-filter` aplicado no overlay da pré-entrada podia fazer o conteúdo do card ficar desfocado enquanto o input focado permanecia nítido.
- Remove o blur do próprio ancestral `#profileOverlay`/`.hl-room-entry` e isola o card em uma camada própria.
- Mantém o glow decorativo atrás dos controles por z-index explícito.
- Adiciona teste de regressão para impedir que o blur volte ao ancestral da pré-entrada.
- Incrementa a versão para `12.0.1`, forçando um cache PWA novo (`hl-activity-12.0.1`).


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