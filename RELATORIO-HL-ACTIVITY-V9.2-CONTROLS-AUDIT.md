# HL Activity V9.2 — Auditoria de controles e camadas

## Diagnóstico

A revisão foi feita sobre a base V9.1, usando os prints enviados e o código atual. O site publicado no Render não ficou acessível ao navegador de inspeção deste ambiente, então as correções foram validadas no código e pela suíte automatizada.

Os dois controles problemáticos eram **Configurações (⚙)** e **Mais (•••)**. A base acumulava regras responsivas antigas, inclusive regras por posição (`nth-child`), além de backdrop/painel/rodapé com diferentes níveis de empilhamento. Isso tornava os controles frágeis em tamanhos menores.

## Alterações V9.2

- controlador único para os botões da dock social;
- Configurações e Mais não dependem mais de listeners isolados que podem se perder após reorganização da toolbar;
- portal `hlUiOverlays` para Reações, Mais e Configurações;
- footer/dock acima do backdrop em telas móveis;
- `touch-action: manipulation` nos controles da dock;
- Configurações explicitamente visível no mobile;
- menu Mais também oferece **Configurações** como rota alternativa;
- menu Mais responsivo vira painel largo no mobile;
- cache bust atualizado para `v=92`;
- pequeno refinamento visual do painel de participantes no desktop;
- preservadas as correções anteriores de enquadramento do monitor e indicador único de conexão.

## Validação

- `node --check hl-social.js`: aprovado;
- `node --check server.js`: aprovado;
- `node --check room-core.js`: aprovado;
- `node --check activity-room-core.js`: aprovado;
- `npm test`: **41/41 testes aprovados**.

## Observação de build

O atualizador PowerShell continua executando `npm install`, testes e `npm run build` no computador do usuário antes de qualquer push. Se uma dessas etapas falhar, o Render não recebe a nova versão.
