# HL Activity V6

HL Activity é um aplicativo de salas sociais em tempo real com transmissão de tela, chat, voz WebRTC, Soundboard HL e integração com Discord Activity.

## V6 — Soundboard Pro + Segurança

A V6 preserva a essência e o streaming existente, mas endurece a arquitetura de segurança e transforma o Soundboard em uma função completa.

### Soundboard Pro

- sons originais do HL continuam disponíveis;
- botão **Adicionar som** dentro da aba Sons;
- aceita arquivo local que o navegador consiga decodificar (MP3/WAV/OGG/WebM/M4A quando suportado pelo navegador);
- recorte de início e duração de até 15 segundos;
- prévia antes de enviar;
- nome, categoria e emoji;
- conversão no navegador para WAV PCM mono 16-bit/22.05 kHz;
- servidor valida novamente estrutura WAV, duração e tamanho;
- busca;
- Favoritos;
- Recentes;
- Meus sons;
- Ouvir aqui / Na sala;
- exclusão pelo dono, host ou moderador;
- política do host para quem pode tocar;
- política separada para quem pode adicionar;
- cooldown e limite por sala;
- host/mod pode parar os sons compartilhados.

Os sons personalizados ficam apenas **na memória da sala** nesta versão. Reiniciar o serviço apaga esses uploads. Isso evita fingir persistência usando o filesystem efêmero do Render. A arquitetura pode receber R2/S3 depois sem refazer a UI.

## Segurança V6

- token criptograficamente aleatório para o criador reivindicar o papel de host;
- hash do token de host no servidor, nunca o valor puro no estado da sala;
- token efêmero de API ligado ao socket atual para ações HTTP da sala;
- comparação de tokens com `timingSafeEqual`;
- verificação de origem em requisições `/api`;
- verificação de origem no handshake Socket.IO em produção;
- limite de sockets simultâneos por IP;
- rate limit HTTP geral, criação de sala, OAuth e upload;
- rate limits Socket.IO separados para chat, reação, soundboard, moderação, voz e sinalização WebRTC;
- limite de payload Socket.IO;
- `Helmet` e CSP endurecida;
- JavaScript inline removido das páginas principais para eliminar `unsafe-inline` de `script-src`;
- `script-src-attr 'none'`;
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`;
- Permissions Policy para câmera, microfone, captura de tela, geolocalização e clipboard;
- arquivos internos não são publicados como estáticos;
- API usa `no-store`;
- Request ID por requisição;
- erros de API não expõem stack interno;
- OAuth tem limite, timeout e não registra token/response sensível;
- upload de som não grava arquivo no disco;
- áudio customizado recebe URL com token aleatório de acesso;
- logs de auditoria temporários para ações de sala/moderação/soundboard;
- timeouts HTTP e compressão WebSocket desabilitada para reduzir superfície de abuso.

### Limite importante de identidade

Usuários convidados continuam sendo identidades temporárias da sala. Sem login obrigatório/banco de dados, não existe ban persistente confiável entre sessões. A V6 não finge que existe.

## Recursos existentes preservados

- criar/entrar em sala;
- stream WebRTC;
- Auto, 720p30, 720p60, 1080p30, 1080p60;
- chat temporário;
- voz WebRTC separada da stream;
- mute/deaf/PTT;
- seleção de microfone/saída quando suportada;
- participantes e roles;
- host/moderação básica;
- reações;
- interface desktop/mobile;
- Discord Activity;
- `/health`;
- graceful shutdown.

## Instalar

```powershell
npm install
```

## Executar

```powershell
npm start
```

## Testar

```powershell
npm test
```

## Build da Discord Activity

```powershell
npm run build
```

## Render

Build Command:

```text
npm install && npm run build
```

Start Command:

```text
npm start
```

Health check:

```text
/health
```

## Variáveis

Copie `.env.example`. Nunca envie `.env` ao Git.

```text
NODE_ENV=production
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
HL_ALLOWED_ORIGINS=
```

`HL_ALLOWED_ORIGINS` é opcional para origens extras. O próprio host atual do Render/custom domain é validado dinamicamente.

## TURN

A base continua com STUN público. Para maior confiabilidade entre NATs/redes restritivas, configure TURN em uma próxima etapa e conecte as credenciais ao RTC antes de anunciar o recurso como ativo.
