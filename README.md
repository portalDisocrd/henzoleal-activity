# HL Activity

HL Activity é um aplicativo de salas sociais em tempo real com transmissão de tela via WebRTC, Socket.IO, chat, voz, soundboard e integração com Discord Activity.

## Estado desta versão

Esta revisão preserva o streaming existente e adiciona uma camada social modular para reduzir o risco de regressão no WebRTC principal.

### Recursos

- criação e entrada em salas por código;
- transmissão WebRTC com Auto, 720p30, 720p60, 1080p30 e 1080p60;
- presença em tempo real e roles `host`, `moderator` e `member`;
- chat temporário em memória com reply, edição, exclusão e reações;
- voz WebRTC separada da transmissão;
- mute, deaf, push-to-talk e volume local por participante;
- indicador local de fala no painel de voz;
- Soundboard HL com seis efeitos originais em WAV, volume local, stop e reprodução compartilhada autorizada pelo servidor;
- política de soundboard controlada pelo host;
- reações flutuantes;
- modos Normal, Foco, Social e Cinema;
- remoção básica de participantes por host/mod;
- reconnect do Socket.IO e reconstrução de voz;
- `/health`;
- graceful shutdown;
- Helmet, CSP, rate limit HTTP e Socket.IO;
- arquivos internos do servidor não são mais expostos pelo `express.static`.

## Importante sobre persistência

Salas, chat e roles ficam em memória. Reiniciar o serviço apaga esse estado. Não use o filesystem efêmero do Render para fingir persistência de dados importantes.

## Instalação

```powershell
npm install
```

Crie um `.env` local a partir de `.env.example` quando precisar do Discord Activity.

## Executar

```powershell
npm start
```

Desenvolvimento do servidor:

```powershell
npm run dev
```

Desenvolvimento da Discord Activity com Vite:

```powershell
npm run activity:dev
```

Build da Activity:

```powershell
npm run build
```

## Testes

```powershell
npm test
```

Os testes automatizados cobrem serviço de salas, códigos, perfil/validação e estado público de participantes. WebRTC de voz e streaming ainda exigem teste real em dois navegadores/dispositivos.

## Render

Sugestão de comandos:

**Build Command**

```text
npm install && npm run build
```

**Start Command**

```text
npm start
```

O servidor usa `process.env.PORT` e faz bind em `0.0.0.0`.

Health check:

```text
/health
```

## Discord

Variáveis atualmente utilizadas no fluxo OAuth/Activity:

```text
DISCORD_CLIENT_ID
DISCORD_CLIENT_SECRET
```

Nunca coloque o secret no front-end ou no Git.

## STUN/TURN

O cliente ainda possui STUN público como fallback. Em redes/NATs restritivos, P2P pode falhar sem TURN. As variáveis TURN estão documentadas para a próxima etapa de configuração, mas não são anunciadas como ativas até a configuração ser conectada ao RTC do cliente.

## Limitações conhecidas

- WebRTC de voz está em topologia mesh e é indicado para grupos pequenos;
- não há banco de dados nesta versão;
- DMs persistentes e upload de soundboard não foram ativados porque exigem uma estratégia real de identidade/storage/retention;
- ban persistente depende de identidade estável/autenticada;
- lock de sala existe no servidor, mas não é destacado na UI até existir um token de reconexão seguro para não bloquear o próprio host após refresh;
- os efeitos do soundboard são assets WAV originais do próprio pacote, sem mídia de terceiros;
- TURN precisa ser configurado para maior confiabilidade entre redes diferentes.

## Segurança

Não envie `.env`, tokens ou secrets junto do projeto. O `.gitignore` deve manter esses arquivos fora do Git.


## Interface V3

A interface principal foi reorganizada para evitar sobreposição de painéis:

- no desktop, Participantes e Chat/Voz/Sons usam o mesmo trilho lateral e alternam entre si;
- os controles sociais ficam integrados à barra inferior;
- somente o status inferior esquerdo comunica conexão/reconexão;
- o selo BETA e indicadores duplicados de ONLINE/conectado foram removidos;
- no mobile, participantes viram uma faixa horizontal e Chat/Voz/Sons abre como bottom sheet acima da toolbar;
- a home mantém a identidade preto/azul, mas com menos chips, menos ruído e hierarquia mais clara.


## V5 — Visual, voz e interação

A V5 mantém o fundo e a essência do HL Activity e concentra a evolução nos elementos da interface. Principais mudanças: painel social refinado, aba Voz com estados e dispositivos, seleção de microfone/saída quando suportada pelo navegador, feedback de participante falando, soundboard com feedback visual, seletor de reações, toolbar agrupada, CTA de compartilhamento no palco vazio, contador de participantes no cabeçalho e bottom sheet com gesto de fechar no mobile.

A V5 também respeita `prefers-reduced-motion` e evita animações decorativas pesadas para não competir com WebRTC.
