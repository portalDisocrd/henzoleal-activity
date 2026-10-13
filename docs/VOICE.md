# Voz — V12

O sistema de voz é independente da transmissão de tela.

## Estados

- `disconnected`
- `requesting-permission`
- `connecting`
- `connected`
- `reconnecting`
- `error`

## Módulos

- `voice-state.js` — estado explícito.
- `voice-config.js` — ICE/STUN/TURN.
- `voice-devices.js` — microfones/saída/devicechange.
- `voice-controller.js` — sessão, peers, PTT, speaking e cleanup.

## Cleanup obrigatório

Ao sair/desmontar: tracks são paradas, peers fechados, AudioContexts encerrados, timers/listeners removidos quando registrados pelo controlador.

## Limites

A arquitetura atual é mesh. Não assumir escala infinita. SFU fica fora da V12 até testes demonstrarem necessidade real.

## Não validado neste ambiente

Microfone físico, troca real de headset, TURN externo e conversa WebRTC entre dois dispositivos físicos precisam ser testados fora do container.
