# HL Activity V12 — Core Consolidation

HL Activity é uma sala privada para pequenos grupos conversarem, usarem voz, compartilharem tela, assistirem juntos, reagirem e brincarem com sons.

## Versão

`12.0.7-foundation.8`

A V12 substitui a estratégia de empilhar arquivos versionados de correção por uma base estável com nomes permanentes de assets, módulos sociais separados e uma fonte única de versão.

## Estrutura principal

- `server.js` — bootstrap HTTP/Socket.IO.
- `src/` — rotas, serviços, segurança e eventos Socket.IO.
- `room-core.js` — core compartilhado entre sala Web e Discord Activity.
- `frontend/core/` — versão, capacidades, conectividade, erros e pré-entrada.
- `frontend/social/chat/` — controlador de chat.
- `frontend/social/voice/` — estado, dispositivos, WebRTC, diagnóstico e UX de voz.
- `frontend/media/` — inteligência e diagnóstico de mídia para transmissão, tela e voz.
- `frontend/social/soundboard/` — catálogo e controlador do Soundboard.
- `frontend/social/reactions/` — reações e deduplicação.
- `frontend/product/` — configurações, lobby, convites, diagnóstico e recursos de produto.
- `frontend/pwa/` — instalação/atualização PWA.
- `styles/` — tokens, componentes, layout e CSS social separado por responsabilidade.
- `legacy/` — histórico não servido em produção.
- `tests/` — testes Node e harness visual de navegador.

## Desenvolvimento

```bash
npm ci --include=dev
npm test
npm run build
npm start
```

Node requerido: `>=20.19.0`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha apenas no ambiente local/Render. Nunca faça commit de `.env`.

TURN é opcional. Quando `TURN_URL` e `TURN_SHARED_SECRET` estiverem configurados, o servidor gera credenciais temporárias compatíveis com coturn REST. Sem TURN, o HL usa STUN.

## Gates de release

Uma release só deve ser enviada depois de:

1. dependências instaladas;
2. sintaxe backend aprovada;
3. testes aprovados;
4. `npm run build` aprovado;
5. servidor temporário responder `/health` e `/ready`;
6. somente então commit/push.

Veja `docs/DEPLOY-ROLLBACK.md`.


## Foundation atual

A branch de reconstrução profissional usa atualização PWA controlada, cache de release imutável, VersionGuard ativo e headers de cache explícitos. Consulte `docs/PWA.md` para a política de upgrade, downgrade e rollback.


## Foundation

A trilha de estabilização final está documentada em `docs/FOUNDATION-FINAL.md` e o modelo de segurança em `docs/SECURITY.md`.
