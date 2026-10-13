# HL Activity — Foundation final

Versão: `12.0.7-foundation.6`

A Foundation consolida recuperação, bugs críticos, arquitetura, design system, social, PWA/cache/versionamento e hardening de segurança/performance.

## Gates obrigatórios

- sintaxe backend/CommonJS;
- testes automatizados;
- build Vite;
- `/health`;
- `/ready`;
- `/api/version`;
- headers/cache;
- assets críticos;
- Service Worker;
- smoke de criação/abertura de sala;
- smoke visual em Chromium quando disponível.

## Não validado automaticamente por esta Foundation

- áudio real entre duas máquinas físicas;
- TURN em rede restritiva real;
- compartilhamento de tela entre dois dispositivos reais;
- teclado virtual de dispositivo móvel real.

Esses itens continuam sendo gates de validação de campo; não devem ser descritos como aprovados sem execução real.
