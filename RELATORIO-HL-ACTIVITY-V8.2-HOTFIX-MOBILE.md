# HL Activity V8.2 — Hotfix de interação mobile

## Causa raiz

Na V8.1, o painel social era movido para dentro de `.app`, mas o backdrop permanecia diretamente no `body`. Em telas menores isso criava stacking contexts diferentes: o painel continuava visível, porém o backdrop interceptava os toques/cliques dos controles internos.

Isso afetava principalmente Voz e Soundboard no celular e podia fazer parecer que os botões estavam sem handler.

## Correções

- painel e backdrop passam a ser colocados diretamente no `body` em telas de até 920px;
- no desktop, o painel continua dentro do grid da `.app`;
- z-index mobile explícito: backdrop 1080 e painel 1100;
- `+ Adicionar som` não nasce mais permanentemente desabilitado; a permissão real continua sendo validada pelo servidor;
- cache-bust de `hl-social.js` atualizado para V8.2;
- versão do pacote atualizada para 8.2.0;
- sons padrão preservados.

## Validação automatizada

- `npm test`: 44/44 testes aprovados;
- `node --check hl-social.js`: aprovado.

## Validação de interação em navegador mobile simulado

Viewport de 467×666:

- Push-to-talk: clique funcionou e mudou para `Ativo • segure Espaço`;
- Entrar no voz: clique funcionou com `getUserMedia` simulado;
- Soundboard: 6 sons padrão renderizados;
- Adicionar som: botão habilitado e modal abriu;
- Reações: seletor abriu;
- nenhum erro JavaScript capturado nesse fluxo.

## Não afirmado como testado

- microfone físico real;
- áudio WebRTC real entre dois aparelhos;
- build Vite completo neste ambiente;
- deploy final no Render.

O atualizador PowerShell executa instalação, testes e build antes do push e interrompe a publicação se qualquer etapa falhar.
