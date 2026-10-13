# Ambiente — V12

Node: `>=20.19.0`.

Variáveis principais:

- `PORT`
- Discord OAuth conforme `.env.example`
- `TURN_URL` opcional
- `TURN_SHARED_SECRET` preferido para credenciais TURN temporárias
- `TURN_USERNAME` + `TURN_CREDENTIAL` como fallback estático

`.env` não entra no ZIP de distribuição/deploy nem no Git.
