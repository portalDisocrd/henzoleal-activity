# PWA / Cache / Versionamento — Foundation

A release usa uma única identidade:

`APP_VERSION = 12.0.7-foundation.7`

O mesmo valor aparece no backend, frontend, Service Worker, `/health`, `/ready`, `/api/version` e diagnóstico.

## Política do Service Worker

Cache gerenciado:

`hl-activity-${APP_VERSION}`

A instalação:

- pré-cacheia somente um shell pequeno e conhecido;
- mantém o novo worker em espera enquanto uma sala está ativa;
- apaga o cache novo se o precache falhar.

A ativação:

- envia `SKIP_WAITING` automaticamente assim que é seguro;
- não recarrega uma sala ou Discord Activity enquanto ela estiver em uso; ativa/aplica a release ao sair;
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

Quando há worker `waiting`, a aplicação ativa a nova release sem botão ou confirmação. Após `controllerchange`, a página recarrega uma única vez. Em uma rota de sala (`/room/*`, `/share/*` ou `/activity-room.html`), a atualização fica pendente até o usuário sair, evitando interromper uma conversa.

## VersionGuard

`frontend/core/version-guard.js` consulta `/api/version` com `cache: no-store`.

Ele verifica:

- ao abrir a página;
- a cada 60 segundos enquanto visível/online;
- ao voltar para a aba;
- ao recuperar conexão.

Se frontend e backend divergirem:

1. sinaliza `hl:version-mismatch`;
2. solicita `registration.update()` e inicia a atualização automática;
3. não mostra o aviso/botão “Atualizar agora”;
4. ativa worker waiting quando disponível;
5. se ainda não houver worker novo, remove apenas caches gerenciados do HL e faz fresh reload.

Uma aba que já estava aberta antes da publicação continua executando os scripts que tinha carregado. Ela detecta a release pela consulta periódica de versão e atualiza automaticamente; se estiver em uma sala, aplica a atualização ao sair.

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
