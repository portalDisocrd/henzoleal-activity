# HL Activity V10.2 — Panel / Tabs Fix

## Correções principais

- Corrigido o vazamento do Soundboard para as abas Chat e Voz.
- A causa era uma regra da V10 que forçava `.hl-sound-view` para `display:grid !important` mesmo quando a aba estava inativa.
- Agora todas as views do painel social são mutuamente exclusivas:
  - Chat ativo → somente Chat visível.
  - Voz ativa → somente Voz visível.
  - Sons ativo → somente Sons visível.
- Painel lateral desktop limitado a aproximadamente 360–430 px, evitando que o Chat ocupe metade da tela.
- Notebook recebe largura intermediária controlada.
- Mobile preserva bottom sheet e Soundboard em uma coluna.
- Soundboard mantém uma única área de scroll interna e o aviso inferior fora dos cards.
- Adicionado `hl-v102.css` como camada final de correção e publicado explicitamente pelo Express.
- Cache PWA atualizado para `hl-activity-v102-shell` para reduzir risco de CSS antigo permanecer ativo.

## Validação

- `node --test tests/*.test.js`: **55/55 testes aprovados**.
- `node --check` aprovado nos arquivos CommonJS/JS alterados.
- O `activity-client.js` é módulo ES/Vite e não é validado com `node --check` CommonJS.
- O build Vite não pôde ser executado neste ambiente porque o executável `vite` não está instalado no `node_modules` materializado desta sessão. O atualizador PowerShell executa `npm install --include=dev`, testes e build antes de qualquer push.
