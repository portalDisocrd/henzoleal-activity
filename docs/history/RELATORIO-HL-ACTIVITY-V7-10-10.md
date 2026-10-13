# HL Activity V7 — Revisão 10/10 Desktop + Mobile

## Motivo da revisão

A V6 trouxe segurança e Soundboard Pro, mas os prints reais mostraram problemas de acabamento: controles nativos brancos no celular, configurações de host ocupando o topo do Soundboard, filtros quebrando linha, busca com aparência crua, volume nativo, excesso de vazio e toolbar visualmente fragmentada no desktop.

## Direção aplicada

A V7 não troca o fundo da sala e não muda a essência do HL. O trabalho foi estrutural: densidade, hierarquia, consistência, responsividade e acabamento.

## Soundboard

- configurações `Quem pode tocar` e `Quem pode adicionar` foram retiradas da interface principal;
- host recebe botão `⚙ Configurar` e abre as políticas somente quando precisar;
- usuários comuns não veem controles administrativos;
- `+ Adicionar som` virou CTA consistente;
- cabeçalho do Soundboard foi reorganizado;
- busca ocupa a largura correta;
- filtros são chips horizontais com scroll no mobile;
- controles nativos foram neutralizados com `appearance: none` e estilos próprios;
- selects ganharam seta e tema HL;
- volume ganhou trilha própria, thumb próprio e porcentagem em tempo real;
- botão Parar foi compactado no mobile;
- grid desktop usa duas colunas quando há espaço;
- mobile usa uma coluna sempre;
- cards foram compactados e têm hierarquia nome/categoria/favorito/ações;
- estado vazio recebeu CTA para adicionar o primeiro som quando permitido;
- ajuda inferior some no mobile para não consumir espaço.

## Voz

- CTA `Entrar no voz` ganhou hierarquia maior sem exagerar no neon;
- controles ganharam superfícies, bordas e estados consistentes;
- mobile usa duas colunas quando cabe e uma coluna abaixo de 380 px;
- seletores de microfone/saída foram estilizados e permanecem funcionais;
- lista de voz preserva speaking/mute/deaf/PTT da V5/V6.

## Chat

- empty state ficou menor e centralizado;
- campo e botão de envio foram refinados;
- foco tem feedback azul discreto;
- mobile mantém botão compacto e input confortável para toque.

## Palco e desktop

- palco continua como protagonista;
- empty state foi compactado para reduzir sensação de vazio morto;
- Compartilhar continua como CTA principal;
- painel social recebeu bordas/sombra mais integradas à sala;
- footer foi dividido visualmente em grupos sociais, stream e sala;
- qualidade e Compartilhar passam a parecer parte do mesmo sistema.

## Mobile

- painel social é bottom sheet de largura total;
- altura máxima ~80dvh;
- scroll ocorre dentro das áreas necessárias;
- cabeçalho das abas continua acessível;
- toolbar deixa somente ações prioritárias;
- qualidade, parar stream, convite e sair não esmagam a barra principal;
- cards do Soundboard usam uma coluna;
- modal de upload vira sheet inferior;
- targets de toque permanecem próximos/acima de 40–44 px.

## Segurança preservada

Nenhum hardening da V6 foi removido. Permanecem token de host, hash no servidor, token efêmero de API, origin guard, CSP, rate limits HTTP/Socket.IO, upload WAV validado, limites de tamanho/duração, arquivos internos fora do static e logs sem segredos.

## Testes executados

- `node --check hl-social.js`: aprovado;
- `node --check server.js`: aprovado;
- `npm test`: **28/28 aprovados**.

Foram adicionados 4 testes V7 para:

- carregamento/publicação do `hl-v7.css`;
- painel administrativo recolhido;
- neutralização de controles nativos e layout mobile do Soundboard;
- porcentagem de volume + filtros.

## Build

A primeira tentativa de `npm run build` não foi concluída porque o ambiente possuía `node_modules` incompleto e não tinha o executável do Vite. Uma tentativa offline de reconstruir dependências também falhou porque um pacote não estava no cache local. Isso não foi contado como build aprovado.

O atualizador PowerShell V7 executa `npm install`, `npm test` e `npm run build` no computador do usuário antes de qualquer push. Se falhar, ele não publica.

## Validação visual

Foi preparada uma página estática de preview para inspeção, mas o Chromium headless do ambiente travou durante a captura. Portanto, a nota visual definitiva deve ser confirmada pelos prints reais após o deploy. A V7 foi construída especificamente para resolver os defeitos observados nos prints V6, mas não é correto afirmar que o browser real foi testado aqui.

## Arquivos centrais alterados

- `hl-v7.css` — camada final de design/responsividade;
- `hl-social.js` — Soundboard reorganizado, configuração do host recolhida, porcentagem de volume e empty-state CTA;
- `room.html`;
- `activity-room.html`;
- `src/middleware/static-files.js`;
- `package.json` / `package-lock.json`;
- `tests/v7-ui.test.js`;
- `README.md`.
