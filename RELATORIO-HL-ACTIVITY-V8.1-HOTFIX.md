# HL Activity V8.1 — Hotfix Soundboard e Controles Sociais

## Problema corrigido

A V8 possuía uma regressão em `hl-social.js`: os elementos `soundConfig` e `soundSettingsClose` eram usados sem terem sido inicializados com `document.getElementById(...)`.

No navegador isso interrompia a execução do JavaScript antes da inicialização completa do Soundboard e dos handlers finais da interface. Como consequência:

- os 6 sons padrão não eram renderizados;
- `+ Adicionar som` permanecia desabilitado;
- o menu de reações `🔥` não recebia seu handler;
- o botão `•••` de modo/mais não recebia seu handler.

## Correções

- adicionadas as referências DOM ausentes;
- acesso à política de Soundboard endurecido para tolerar ausência de DOM;
- cache-bust de `hl-social.js` alterado para `?v=81`;
- service worker atualizado para cache `hl-activity-v81-shell`;
- registro do service worker atualizado para `/sw.js?v=81`;
- preservados os sons padrão:
  - Air Horn;
  - Vitória;
  - Falha;
  - Bonk;
  - Pop;
  - Suspense;
- preservado upload de sons personalizados;
- preservados Reações e modos da sala.

## Validação

- `node --check hl-social.js`: aprovado;
- `node --check hl-pwa.js`: aprovado;
- `node --check hl-v8.js`: aprovado;
- `npm test`: 40/40 testes aprovados.

O build Vite não pôde ser executado neste ambiente porque o executável `vite` não está instalado aqui. O atualizador PowerShell executa `npm install`, `npm test` e `npm run build` no computador do usuário antes de qualquer push.
