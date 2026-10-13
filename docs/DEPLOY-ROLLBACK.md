# Deploy e rollback — V12

## Gate obrigatório

1. criar backup;
2. `npm ci --include=dev --no-audit --no-fund`;
3. syntax check apenas do backend/CommonJS apropriado;
4. `npm test`;
5. `npm run build`;
6. subir servidor temporário;
7. validar `/health` e `/ready`;
8. commit;
9. push;
10. Render auto-deploy.

Se qualquer etapa falhar, não fazer push.

## Rollback

Antes da atualização, registrar o HEAD anterior e criar backup ZIP/Git bundle quando possível. Para voltar, restaurar o backup ou fazer checkout/revert do commit anterior conforme a situação. Nunca usar force push como procedimento padrão.
