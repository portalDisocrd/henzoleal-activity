# HL Activity — Segurança da Foundation

## Princípios

- servidor é autoridade para role, moderação, Soundboard e signaling;
- payloads possuem limites de tamanho e validação;
- tokens de host são armazenados por hash;
- senha de sala usa scrypt;
- APIs mutáveis exigem origem confiável;
- uploads de áudio exigem sessão efêmera da sala;
- logs não devem conter senha, token, segredo, credential, cookie ou query string de áudio;
- Socket.IO possui limite global, políticas por evento e limite de conexões por IP;
- o IP do Socket.IO considera o último hop de `X-Forwarded-For` para o modelo `trust proxy = 1`.

## Limitações conhecidas

O ban de 24 horas usa o `clientId` local da sala. Sem conta autenticada ou identidade persistente de servidor, um usuário determinado pode limpar/recriar a identidade local. Portanto o ban atual é uma ferramenta de moderação de sessão/grupo, não uma barreira de identidade forte.

TURN deve ser configurado por variável de ambiente. Quando `TURN_SHARED_SECRET` é usado, o cliente recebe credencial temporária, não o segredo compartilhado permanente.

## Logging

Erros HTTP usam logger estruturado e registram somente pathname, nunca query string. Isso evita registrar o token efêmero usado na URL de áudio customizado.

## Publicação

Antes de deploy, executar `npm test`, `npm run build`, health/readiness/version, smoke HTTP e, quando navegador Chromium estiver disponível, smoke visual desktop/mobile.
