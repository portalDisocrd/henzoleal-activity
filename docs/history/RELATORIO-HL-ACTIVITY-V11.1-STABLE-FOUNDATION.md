# HL Activity V11.1 — Stable Foundation

## Resumo executivo

A V11.1 consolida a camada social do HL Activity depois de várias releases com CSS/JS concorrentes. O objetivo principal foi deixar de empilhar hotfixes e criar uma base social previsível para Chat, Voz, Sons e Reações.

## ANALISADO

- `room.html` e `activity-room.html`;
- camada social anterior;
- arquivos CSS legados publicados;
- eventos Socket.IO de chat, voz, reações e Soundboard;
- PWA/service worker;
- políticas do Soundboard;
- layout desktop/mobile;
- testes históricos que ainda exigiam assets obsoletos.

## Problemas encontrados

1. `room.html` já referenciava `hl-social-v11.css`, mas o arquivo não existia.
2. A suíte mantinha testes antigos obrigando V5/V6/V7/V9 a continuarem carregados.
3. O Express ainda publicava vários assets sociais antigos, mesmo sem uso na sala atual.
4. Abas sociais dependiam principalmente de classes CSS, permitindo regressões de conteúdo vazando entre views.
5. Reactions ainda podiam sofrer interferência de regras antigas de posicionamento e do modo desempenho.
6. O Soundboard precisava de uma autoridade visual única para desktop e mobile.
7. Configurações/`•••` precisavam de fallback para a Discord Activity, onde o control center V10 não é carregado.

## CORRIGIDO

### Camada social

- criada `hl-social-v11.css` do zero;
- `hl-social-v11.js` passou a controlar `hidden`, `aria-hidden` e `is-active` de Chat/Voz/Sons;
- apenas uma view social fica visível por vez;
- painel desktop com largura controlada (~410 px);
- em larguras comuns, participantes cedem espaço ao painel social para preservar o palco;
- mobile usa bottom sheet com margem lateral e altura limitada.

### Soundboard

- estrutura fixa: cabeçalho → ações → busca/filtros → volume → lista → ajuda;
- lista é a principal região rolável;
- 2 colunas no desktop;
- 1 coluna no mobile;
- cards compactos;
- 6 sons padrão preservados;
- upload personalizado preservado;
- Configurar/Adicionar permanecem funcionais conforme role/política.

### Reações

- existe somente um handler servidor `reaction:send`;
- `reactionId` preservado;
- feedback local imediato;
- broadcast somente para outros sockets;
- limite de 3 reações visuais simultâneas;
- camada posicionada pela geometria real do palco (`getBoundingClientRect`);
- emoji nasce no canto inferior direito do palco;
- modo desempenho reduz duração, mas não esconde reação.

### Configurações e Mais

- control center V10 continua sendo a interface principal no site web;
- fallback social interno continua disponível para Discord Activity;
- `⚙` e `•••` foram testados em navegador no fallback.

### Bundle/legado

Movidos para `legacy/social/` e removidos do mapa público do Express:

- `hl-social.css`
- `hl-social.js`
- `hl-v5.css`
- `hl-v6.css`
- `hl-v7.css`
- `hl-v9.css`
- `hl-v102.css`
- `hl-v103.css`
- harness visual antigo V10.3

`hl-v4.css` permanece público porque a home/Activity ainda usa esse arquivo.

### Documentação

Criados:

- `docs/ARCHITECTURE.md`
- `docs/SOCKET-EVENTS.md`
- `docs/DEPLOY-ROLLBACK.md`
- `docs/ENVIRONMENT.md`
- `docs/history/` para relatórios antigos.

## Segurança preservada

- host token com hash;
- token efêmero de sala;
- origin guard;
- Helmet/CSP;
- rate limits;
- validação Socket.IO;
- validação de upload WAV;
- limites de payload;
- servidor como autoridade para roles/políticas.

## TESTE ESTÁTICO / SINTAXE

Executado `node --check` em:

- servidor;
- cores de sala;
- social V11;
- V10 product layer;
- PWA/service worker;
- todos os arquivos `src/**/*.js`.

Resultado: **sem erros de sintaxe**.

## TESTE AUTOMATIZADO

Resultado final: **38/38 testes aprovados, 0 falhas**.

A suíte atual remove expectativas de UI de releases antigas e mantém testes de:

- room service;
- validação;
- segurança;
- Soundboard;
- convites/senha;
- PWA;
- social V11;
- reaction handler único;
- broadcast remoto de reaction;
- isolamento de abas.

## TESTE EM NAVEGADOR

Executado em Chromium Headless 144 via Chrome DevTools Protocol.

### Desktop — 1366×768

Validado:

- versão social `11.1` carregada;
- Chat: somente Chat visível;
- Voz: somente Voz visível;
- Sons: somente Sons visível;
- painel social: 410 px;
- Soundboard: 6 cards;
- Soundboard: 2 colunas;
- lista: `overflow-y: auto`;
- `Adicionar som`: habilitado para host;
- `Configurar`: visível para host;
- reação: exatamente 1 elemento;
- reação: canto inferior direito do palco;
- reação removida após animação.

### Mobile — 390×844

Validado:

- painel com margem: x=6 px e largura=378 px;
- apenas Sons visível ao selecionar Sons;
- 6 sons;
- 1 coluna;
- scroll próprio;
- troca para Voz esconde Sons;
- reação: exatamente 1 elemento;
- reação: canto inferior direito do palco.

### Configurações/More fallback

No navegador:

- `⚙ Configurações`: abriu;
- fechar Configurações: funcionou;
- `••• Mais`: abriu.

## BUILD EXECUTADO

**Tentado, mas não concluído neste ambiente.**

`npm run build` retornou `vite: not found` porque o `node_modules` disponível não contém o binário do Vite. A tentativa de `npm install` expirou no ambiente.

Por isso o build não é marcado como aprovado aqui.

O atualizador PowerShell V11.1 força:

1. instalação limpa com dependências de desenvolvimento;
2. testes;
3. syntax check;
4. build;
5. servidor temporário;
6. `/health`;
7. commit/push somente depois de tudo passar.

## TESTE COM DOIS CLIENTES

- broadcast multiplayer foi validado em teste automatizado de socket com emissor remoto;
- **não foi executado teste WebRTC/voz com dois navegadores reais neste ambiente**.

Esse item permanece explicitamente como não testado em browser real.

## NÃO TESTADO AQUI

- microfone físico real;
- saída de áudio física;
- voz entre duas máquinas reais;
- TURN real;
- deploy Render real desta versão;
- PiP/Wake Lock em dispositivo físico.

## Próximos avanços recomendados

1. Playwright/E2E incorporado ao projeto quando dependência puder ser instalada.
2. teste de dois clientes com voz e stream reais.
3. separar futuramente `hl-v10.css` em shell/produto para reduzir ainda mais dívida visual.
4. persistência real de sons via R2/S3.
5. contas + PostgreSQL antes de amizade/ban permanente.

## Conclusão

A V11.1 deve ser tratada como **nova base social estável**, não como mais um hotfix V10.x. O histórico continua disponível em `legacy/` e `docs/history/`, mas não interfere no bundle público atual.
