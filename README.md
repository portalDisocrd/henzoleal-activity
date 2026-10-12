# HL Activity V10 — Unified Product

HL Activity é uma plataforma privada de salas sociais em tempo real para **compartilhar tela, conversar, usar voz, soundboard e permanecer junto com amigos**.

A V10 consolida a base visual/segura anterior e adiciona uma camada de produto mais completa sem transformar o HL em uma cópia do Discord/Twitch/Meet.

## Destaques V10

- pré-entrada com teste de microfone, seleção de entrada/saída, medidor, entrar mutado e preview de quem já está na sala;
- lobby seletivo: entrada automática, aprovar desconhecidos ou aprovar todos;
- convites normais, confiáveis, temporários (15 min / 1h / 24h / 7 dias) e de uso único;
- senha opcional e sala trancada;
- perfis/participantes com status, atividade, volume local, fixar/spotlight e moderação contextual;
- presença: online, ausente, no voz, falando e transmitindo;
- modos Normal, Cinema, Jogatina e Estudo;
- modo Estudo com Pomodoro;
- Soundboard com sons padrão + upload temporário, busca, favoritos, recentes, meus sons, edição e duplicação;
- mixer local de transmissão/voz + smart ducking do soundboard;
- diagnóstico de Socket/WebRTC com ping, ICE, rota direta/STUN/TURN, bitrate estimado e perda/jitter quando disponíveis;
- reconexão e transferência automática/manual de host;
- moderação server-side, ban temporário por identificador local, bloqueios de som/stream e histórico de auditoria do host;
- feed de atividade separado do chat;
- comandos `/help`, `/invite`, `/ping`, `/users`, `/quality`, `/sound`, `/lock`;
- atalhos M/C/V/F/Espaço/1–6/Ctrl+K;
- PWA instalável no PC/celular;
- central de configurações: Sala, Áudio, Visual, Privacidade, Atalhos e Diagnóstico;
- temas HL (azul, roxo, gelo, preto), modo desempenho e redução de animações;
- onboarding, salas recentes/favoritas, AFK, Picture-in-Picture e Screen Wake Lock;
- página de sala inexistente própria;
- segurança preservada: Helmet/CSP, origin guard, rate limits, host token, tokens efêmeros de sala, validações e uploads WAV validados.

## Limitações honestas

- **Amizade permanente** ainda não existe porque convidados não têm uma conta persistente. A V10 usa **convites confiáveis** para dar acesso direto sem fingir um sistema de amigos.
- **QR Code** não foi incluído nesta versão para não enviar convites privados a um serviço externo nem adicionar uma biblioteca nova sem validar o build. O link de convite está pronto para receber QR local depois.
- Sons personalizados continuam na memória da sala. Para persistência real, conectar Cloudflare R2/S3 ou storage equivalente.
- Banimentos persistentes reais exigem conta/banco; o ban atual é temporário e baseado em identificador local do navegador.
- TURN não é provisionado automaticamente. O diagnóstico informa quando uma rota `relay` está sendo usada, mas infraestrutura TURN precisa ser configurada separadamente.

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

Copie `.env.example` para `.env` localmente. Nunca envie `.env` ao Git.

```text
NODE_ENV=production
PORT=3000
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
HL_ALLOWED_ORIGINS=
```

`HL_ALLOWED_ORIGINS` é opcional para origens extras. O host atual do serviço é validado dinamicamente.
