# HL Activity V11.1 — Stable Foundation

HL Activity é uma sala privada para pequenos grupos conversarem, usarem voz, compartilharem tela, assistirem juntos, reagirem e usarem Soundboard.

A V11.1 marca uma mudança de estratégia: **parar de empilhar hotfixes e consolidar uma base social estável**.

## O que mudou

- camada social única: `hl-social-v11.js` + `hl-social-v11.css`;
- Chat, Voz e Sons controlados por estado JavaScript e `hidden`;
- apenas uma aba social pode ficar visível;
- Soundboard reconstruído com scroll próprio, 2 colunas no desktop e 1 no mobile;
- 6 sons padrão sempre disponíveis;
- upload de som personalizado preservado;
- reactions com `reactionId`, deduplicação e um único handler servidor;
- reactions ancoradas à geometria real do palco;
- modo desempenho reduz animação, mas não esconde feedback funcional;
- Configurações e menu Mais preservados;
- arquivos sociais legados movidos para `legacy/social/` e removidos do bundle público;
- PWA com cache versionado para a nova base.

## Recursos preservados

- compartilhamento WebRTC;
- voz WebRTC;
- chat;
- Soundboard;
- pré-entrada;
- lobby seletivo;
- convites temporários/confiáveis/uso único;
- sala com senha e bloqueio;
- moderação server-side;
- modos Normal/Cinema/Jogatina/Estudo;
- mixer e smart ducking;
- diagnóstico;
- PWA/PiP/Wake Lock;
- segurança V6+.

## Instalar

```powershell
npm install
```

## Testar

```powershell
npm test
```

## Build

```powershell
npm run build
```

## Executar

```powershell
npm start
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

Health Check:

```text
/health
```

## Ambiente

Use `.env.example` como referência. Nunca envie `.env` para Git ou para terceiros.

## Documentação

- `docs/ARCHITECTURE.md`
- `docs/SOCKET-EVENTS.md`
- `docs/DEPLOY-ROLLBACK.md`
- `docs/ENVIRONMENT.md`
