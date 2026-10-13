# PWA / Cache / Versionamento — Foundation

A release usa uma única identidade:

`APP_VERSION = 12.0.7-foundation.6`

O mesmo valor aparece no backend, frontend, Service Worker, `/health`, `/ready`, `/api/version` e diagnóstico.

## Política do Service Worker

Cache gerenciado:

`hl-activity-${APP_VERSION}`

A instalação:

- pré-cacheia somente um shell pequeno e conhecido;
- não chama `skipWaiting()` automaticamente;
- apaga o cache novo se o precache falhar.

A ativação:

- ocorre somente após autorização explícita (`SKIP_WAITING`) quando já existe um worker ativo;
- remove caches antigos `hl-activity-*`;
- chama `clients.claim()`.

## Regra crítica: cache de release é imutável

Enquanto existe rede, HTML e assets estáticos são buscados no servidor com estratégia **network-first / no-store**.

O `fetch` do Service Worker **não escreve novamente** no cache da release.

Isso evita o cenário:

- HTML novo;
- JS antigo;
- CSS novo;
- cache antigo sendo atualizado parcialmente.

O cache da release serve apenas como fallback de rede para o shell que foi pré-cacheado.

## Nunca interceptar realtime/dinâmico

O Service Worker não intercepta:

- `/api/*`;
- Socket.IO;
- `/client-config.js`.

## Atualização

`frontend/pwa/pwa.js` registra o worker com:

`updateViaCache: "none"`

Quando há worker `waiting`, a interface oferece atualização explícita.

O botão:

1. envia `SKIP_WAITING`;
2. espera `controllerchange`;
3. recarrega a página uma única vez.

## VersionGuard

`frontend/core/version-guard.js` consulta `/api/version` com `cache: no-store`.

Ele verifica:

- ao abrir a página;
- a cada 60 segundos enquanto visível/online;
- ao voltar para a aba;
- ao recuperar conexão.

Se frontend e backend divergirem:

1. sinaliza `hl:version-mismatch`;
2. mostra a versão local e remota;
3. pede atualização;
4. solicita `registration.update()`;
5. ativa worker waiting quando disponível;
6. se ainda não houver worker novo, remove apenas caches gerenciados do HL e faz fresh reload.

A comparação é por igualdade, não por ordem semântica. Portanto funciona para:

- upgrade;
- downgrade;
- rollback.

## Headers HTTP

- HTML dinâmico: `Cache-Control: no-store`;
- `/sw.js`: `no-cache, no-store, must-revalidate`;
- JS/CSS estáveis: `no-cache, must-revalidate`;
- `/api/version`, `/health`, `/ready`, `/client-config.js`: `no-store`;
- responses recebem `X-HL-Version`.

## Discord Activity

A Activity não depende da instalação PWA. O VersionGuard continua ativo e usa fresh reload quando necessário.
