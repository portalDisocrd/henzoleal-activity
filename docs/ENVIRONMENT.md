# Variáveis de ambiente

Baseie-se em `.env.example`.

Principais variáveis:

- `NODE_ENV`
- `PORT`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `HL_ALLOWED_ORIGINS`

## Segurança

- nunca versionar `.env`;
- nunca imprimir secrets em logs;
- não colocar tokens em scripts públicos;
- Render deve receber secrets pelo painel de Environment.
