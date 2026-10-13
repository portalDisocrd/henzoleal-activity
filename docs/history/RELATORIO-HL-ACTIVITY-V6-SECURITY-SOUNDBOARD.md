# HL Activity V6 — Relatório geral

## Objetivo

Elevar o HL Activity em duas frentes: Soundboard personalizável e segurança real de servidor, mantendo a essência, o streaming atual e a separação total do projeto Leal Affiliate.

## Soundboard Pro

Implementado upload temporário de sons personalizados. O navegador decodifica o arquivo escolhido, permite definir início/duração e converte o trecho para WAV PCM mono 16-bit em 22.05 kHz. O servidor aceita apenas o resultado validado, recalcula duração pelo WAV e limita tamanho, quantidade e armazenamento por sala.

Funções: busca, favoritos, recentes, meus sons, preview local, reprodução na sala, nome/categoria/emoji, exclusão autorizada, políticas separadas de tocar/adicionar, cooldown e stop compartilhado por host/mod.

Persistência: sessão/memória apenas. Nenhum upload é gravado no filesystem do Render.

## Segurança

### Autoridade de host
A criação da sala gera um token aleatório. Só o navegador que recebeu esse token pode reivindicar o primeiro `host`. O servidor armazena apenas SHA-256 do token e valida com comparação segura.

### Ações HTTP ligadas ao Socket
Ao entrar, o servidor gera um token efêmero para aquela conexão. Upload e exclusão de som exigem `socket.id` + token efêmero; possuir somente um socket ID não basta.

### Origem e CSRF
Requisições `/api` que alteram estado passam por validação de origem. Handshake Socket.IO também exige origem confiável em produção.

### Rate limit
Há limites separados para API, criação de sala, OAuth, upload, conexões simultâneas por IP e eventos Socket.IO por classe.

### CSP / front-end
Scripts e estilos inline das páginas principais foram externalizados. `script-src` não usa mais `unsafe-inline`, e atributos de script inline são bloqueados.

### Uploads
O servidor não confia no MIME ou duração enviados pelo cliente. Valida RIFF/WAVE, PCM, canais, bits, sample rate, byte rate e duração. O áudio recebe URL com token aleatório e cache privado/no-store.

### OAuth
Código OAuth limitado, timeout de rede e logs sem resposta/tokens sensíveis.

### Logs e erros
Request ID em respostas, auditoria temporária de ações relevantes e respostas de erro sem stack interno.

## Arquivos estruturais novos

- `hl-v6.css`
- `home.css`, `home.js`
- `room.css`, `room-core.js`
- `activity.css`
- `activity-room.css`, `activity-room-core.js`
- `not-found.html`, `not-found.css`
- `src/security/security-utils.js`
- `src/security/origin-guard.js`
- `src/security/request-context.js`
- `src/security/socket-security.js`
- `src/routes/custom-sound-routes.js`
- `tests/v6-security.test.js`

## Validação executada

- sintaxe dos módulos principais: aprovada;
- `npm test`: 24/24 testes aprovados antes do empacotamento;
- testes adicionais cobrem token de host, comparação de tokens, parser WAV, ausência de script/style inline, CSP e integração dos tokens no cliente.

## Não validado neste ambiente

As dependências não estavam instaladas e `npm install` expirou no ambiente de execução. Portanto, ainda precisam ser validados no computador/Render:

- `npm run build` com Vite;
- subida completa Express/Socket.IO;
- upload real pelo navegador;
- voz/stream entre dois dispositivos;
- Discord Activity;
- deploy Render.

O atualizador PowerShell interrompe antes do push se `npm install`, testes ou build falharem.
