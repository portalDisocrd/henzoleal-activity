# PWA — V12

A V12 usa uma única versão de cache: `hl-activity-${APP_VERSION}`.

O Service Worker:

- não intercepta `/api/`;
- não intercepta Socket.IO;
- não cacheia `/client-config.js`;
- remove caches antigos `hl-activity-*`;
- suporta `SKIP_WAITING`;
- sinaliza atualização para o frontend.

Quando existe uma nova versão, o cliente mostra “Nova versão do HL disponível” e oferece “Atualizar agora”.

Offline pode manter o shell, mas recursos realtime devem ser tratados como indisponíveis.
