# HL Activity V9.1 — Frame & Settings Fix

## Correções

- enquadramento do monitor no estado vazio corrigido;
- indicador de conexão reduzido a um único ponto visual;
- removidos emojis de cor duplicados do texto de conexão;
- toolbar/dock impedidos de cortar o último botão;
- botão dedicado `⚙ Configurações` adicionado;
- `•••` passa a significar apenas “Mais ações”;
- painel de configurações funcional com modo da sala, qualidade, áudio/voz, redução de animações e status da conexão;
- cache bust atualizado para `v=91`.

## Validação

- `node --check` em `hl-social.js`, `room-core.js` e `activity-room-core.js`: passou;
- `node --test tests/*.test.js`: 36/36 testes passaram.

## Observação

O build Vite deve ser executado no computador do usuário pelo atualizador antes do push. O script interrompe a publicação se testes ou build falharem.
