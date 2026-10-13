# HL Activity V9 — Stable Polish

Base reconstruída a partir da V7 aprovada visualmente, evitando a cadeia de hotfixes V8.x.

## Correções principais
- Reações agora têm handler real no servidor e animação local imediata.
- Emojis são pequenos, sobem suavemente no palco e somem sem poluir a transmissão.
- Soundboard mobile forçado para uma coluna.
- Texto de ajuda do soundboard volta ao fluxo normal e não cobre cards.
- Referências `soundConfig` e `soundSettingsClose` foram declaradas para impedir interrupção do JavaScript.
- Botão `•••` virou menu de ações real com modos e copiar convite.
- Mantidos sons padrão e upload personalizado já existentes na base V7.

## Segurança
Mantida a camada de segurança da V7/V6: autorização de upload por token de sala, validação WAV no servidor, rate limits, validação de payloads, proteção de origem e arquivos internos fora da exposição estática.

## Testes
Inclui testes de regressão V9 para CSS/JS, referências do Soundboard e `reaction:send` no servidor.
