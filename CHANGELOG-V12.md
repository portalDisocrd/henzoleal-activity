
## 12.0.7-foundation.6 — Foundation final

- hardening de IP no limite de conexões Socket.IO atrás de um proxy;
- rate limit para `social:state`, `chat:history`, diagnostics, presence e speaking;
- speaking de voz deixa de republicar a lista completa de participantes;
- logs HTTP não registram query string de áudio;
- criação de sala usa log estruturado e código mascarado;
- documentação de segurança e limites de validação final;
- gate final combina segurança, performance, build, HTTP e smoke visual quando Chromium estiver disponível.
# Changelog — HL Activity Foundation

## 12.0.7-foundation.7 — Soundboard e atualização automática

- corrige o cabeçalho CSS que impedia o layout vertical e os controles do Soundboard;
- atualiza releases automaticamente e adia a aplicação enquanto uma sala está ativa;
- remove o aviso e o botão manual “Atualizar agora”.

## 12.0.7-foundation.6 — PWA, cache e versionamento previsíveis

- torna o cache de cada release imutável depois da instalação;
- troca assets online para network-first com bypass do HTTP cache;
- mantém cache apenas como fallback de rede do shell;
- registra o Service Worker com `updateViaCache: "none"`;
- adiciona reconciliação de versão para upgrade, downgrade e rollback;
- VersionGuard verifica a versão ao abrir, a cada 60 s, ao voltar à aba e ao recuperar internet;
- `/sw.js`, HTML e endpoints de versão recebem políticas explícitas de cache;
- respostas passam a expor `X-HL-Version` para diagnóstico;
- remove loop de reload que podia manter frontend e backend em versões diferentes.

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