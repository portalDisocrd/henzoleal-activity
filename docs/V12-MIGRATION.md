# Migração V11.1 → V12

## Principais mudanças

- versão única `12.0.0`;
- assets V10/V11 deixam de ser carregados em produção;
- CSS social dividido por responsabilidade;
- remoção do uso em massa de `!important`;
- z-index baseado em tokens;
- core Web/Activity compartilhado;
- Chat, Voz, Soundboard e Reações modularizados;
- scrypt para novas senhas de sala;
- limite global de memória para sons customizados;
- host reconnect grace period;
- suporte TURN via ENV;
- PWA/cache consolidado;
- logo WebP otimizado;
- `/ready` e versão em health/diagnóstico.

## Compatibilidade

Arquivos antigos ficam em `legacy/` e não devem ser servidos. Chaves antigas de localStorage podem permanecer quando necessárias para preservar preferências do usuário.
