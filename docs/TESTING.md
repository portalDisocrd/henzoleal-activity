# Testes — V12

## Automatizados

```bash
npm test
```

Cobrem serviços de sala, validação, segurança, chat, soundboard, reactionId, versionamento, scrypt, core compartilhado, PWA, limites e estados de compartilhamento.

## Build

```bash
npm run build
```

O frontend ESM deve ser validado pelo Vite. Não executar `node --check` cegamente em `activity-client.js`, pois o projeto backend é CommonJS e esse arquivo é ESM de browser.

## Navegador

`tests/browser-harness-v12.html` é um harness de inspeção. A matriz de viewport desejada é 1920×1080, 1366×768, 1280×720, 1024×768, 430×932, 390×844 e 360×800.

## E2E multiplayer esperado

A cria sala → B entra → chat nos dois sentidos → 1 clique em reação gera exatamente 1 reação local e 1 remota → soundboard → voz → saída/reconexão.

O E2E real de dois clientes não foi validado no ambiente de construção desta entrega; deve fazer parte do gate manual/CI futuro.
