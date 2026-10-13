# HL Activity V10.3 — Social Restructure

## Objetivo
Corrigir de forma estrutural os problemas de posicionamento das reações e de layout do Soundboard, evitando novos remendos sobre CSS antigo.

## Principais mudanças

### Reações
- A camada de reactions não fica mais presa ao DOM interno do palco.
- O cliente calcula a posição real do palco com `getBoundingClientRect()`.
- A layer é posicionada em `position: fixed` exatamente sobre o palco.
- O emoji nasce no canto inferior direito do palco, em tamanho pequeno, sobe e desaparece.
- O posicionamento é recalculado em resize, scroll e mudança de tamanho do palco.
- Há apenas um handler servidor para `reaction:send`, evitando duplicação.

### Soundboard
- A aba Sons ganhou um layout final isolado das regras antigas.
- Estrutura: cabeçalho > ações > busca/filtros > volume > lista > ajuda.
- A lista é a única área com rolagem interna.
- Desktop: até duas colunas de cards compactos.
- Mobile: uma coluna.
- Cabeçalho e botões não cortam a lateral da tela.
- Mobile mantém 6px de margem lateral e painel com borda completa.
- Texto informativo não cobre os cards.

### Abas
- Chat, Voz e Sons continuam mutuamente exclusivos.
- Nenhuma aba inativa pode vazar visualmente.

### PWA/cache
- Cache atualizado para `hl-activity-v10-shell-v103`.
- `hl-v103.css` incluído no shell e publicado pelo servidor.

## Validação
- `node --check` nos JS alterados: aprovado.
- `npm test`: **60/60 testes aprovados**.
- `npm run build` não foi executado neste ambiente porque o Vite não estava instalado após a cópia do projeto. O atualizador PowerShell executa `npm install --include=dev`, testes e build antes de qualquer push.
