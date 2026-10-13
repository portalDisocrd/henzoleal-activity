# HL Activity V4 — revisão de produto e interface

## Direção da V4

A V4 não foi tratada como uma simples troca de cores. O problema principal da V3 era composição: palco, participantes, painel social e dock ainda disputavam espaço visual. A nova versão reorganiza a experiência inteira para que transmissão continue sendo o centro, enquanto chat, voz e soundboard ocupam uma área lateral real no desktop e um painel móvel no celular.

## Home

- linguagem visual unificada em preto/azul sem aparência de protótipo;
- hero com hierarquia mais clara e tipografia menos exagerada;
- selo mudou para “Salas em tempo real”;
- bloco informativo novo com Tela/Voz/Chat/Sons, entrada rápida e suporte PC/celular;
- painel de criação/entrada refinado;
- microanimações discretas no logo, botões e cards;
- informações reais de sessão: perfil local e sala por código;
- mantém criação e entrada exatamente no fluxo já existente.

## Sala — desktop

- palco permanece como elemento dominante;
- coluna de participantes compacta e integrada;
- Chat/Voz/Sons passam a usar a mesma coluna lateral em vez de flutuar sobre o vídeo;
- quando o painel social abre, participantes cedem o espaço sem sobreposição;
- rodapé reorganizado e visualmente mais leve;
- controles sociais ficam dentro do rodapé;
- somente um indicador de conexão permanece, no canto inferior esquerdo;
- código da sala pode ser clicado para copiar;
- contador real de participantes adicionado;
- mensagem de estado vazio ganhou contexto sem criar função falsa.

## Sala — notebook/tablet

- coluna lateral vira faixa horizontal de participantes;
- palco mantém prioridade;
- painel social abre como overlay lateral apenas em larguras onde não há espaço suficiente para uma segunda coluna;
- backdrop escurece o conteúdo para deixar claro qual camada está ativa.

## Sala — celular

- cabeçalho reduzido;
- qualidade sai do rodapé para não disputar espaço em telas pequenas;
- botões do rodapé são compactados;
- ações sociais prioritárias permanecem acessíveis;
- reações/modo secundários deixam de ocupar o rodapé em telas muito pequenas;
- participantes ficam em carrossel horizontal;
- Chat/Voz/Sons abrem como bottom sheet;
- painel usa até 72% da altura dinâmica da viewport;
- espaçamento e alvos de toque foram aumentados onde necessário.

## Chat

- badge de mensagens não lidas no botão de chat;
- zera automaticamente ao abrir a aba Chat;
- mensagens e área de composição refinadas visualmente;
- mantém reply, edição, exclusão, reações, typing e histórico temporário já existentes.

## Voz

- visual reorganizado para parecer controle de chamada, não formulário;
- mantém entrada/saída, mute, deaf, PTT, volume individual e detecção de fala;
- voz continua separada do WebRTC da transmissão.

## Soundboard

- cards menores e mais claros;
- controles locais/compartilhados continuam separados;
- volume e parar continuam disponíveis;
- assets WAV originais da V3 preservados;
- permissões do host preservadas;
- nenhuma função decorativa foi adicionada.

## Conexão

O texto do status foi simplificado para:

- Conectado;
- Reconectando…;
- Sem conexão.

A cor do ponto muda de acordo com o estado, evitando emojis e status repetidos pelo layout.

## Discord Activity

- fonte, superfícies e identidade visual alinhadas com a nova linguagem do site;
- arquivos `activity.html` e `activity-room.html` também recebem a camada V4;
- build continua sendo feito via Vite.

## Arquitetura da UI

Foi criada uma camada separada:

- `hl-v4.css`

Ela é carregada por último e funciona como a camada visual atual, evitando uma reescrita perigosa dos fluxos WebRTC/Socket.IO já existentes.

Também foi atualizado:

- `src/middleware/static-files.js` para servir `/hl-v4.css`;
- `hl-social.js` para unread, backdrop, contador de participantes, cópia de código e status refinado;
- `index.html`;
- `room.html`;
- `activity.html`;
- `activity-room.html`;
- `package.json` para versão 4.0.0.

## Validação feita neste ambiente

- `npm test`: 12/12 testes aprovados;
- `node --check` dos módulos CommonJS: aprovado;
- `node --check hl-social.js`: aprovado.

## Build

`npm run build` foi solicitado neste ambiente, mas não executou porque o binário local do Vite não está instalado (`vite: not found`). Isso não é tratado como build aprovado. O atualizador PowerShell executa `npm install`, depois testes e build antes de qualquer push para o Git.

## O que não foi afirmado como testado

- layout visual real em Chrome/Opera/Edge após deploy;
- viewport real de iPhone/Android;
- WebRTC entre dois dispositivos;
- Discord Activity dentro do cliente Discord;
- deploy final no Render.

Esses itens exigem o ambiente real/navegador e devem ser verificados após o push.
