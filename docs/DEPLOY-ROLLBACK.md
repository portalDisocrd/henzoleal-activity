# Deploy e rollback

## Antes de publicar

1. backup local;
2. preservar `.git` e `.env`;
3. `npm install`;
4. `npm test`;
5. `npm run build`;
6. syntax check;
7. iniciar servidor temporário;
8. validar `/health`;
9. somente então commit/push.

## Render

- Build: `npm install && npm run build`
- Start: `npm start`
- Health: `/health`

## Rollback

O atualizador V11.1 cria um backup antes de alterar o projeto. Se a validação falhar, nada é enviado ao Git/Render.

Para voltar manualmente, restaure a pasta do backup ou use o Git bundle criado pelo script quando disponível.

## PWA/cache

A release V11.1 usa cache `hl-activity-v11-1-social-foundation`. Alterar a camada social exige atualização do cache e dos query params dos assets.
