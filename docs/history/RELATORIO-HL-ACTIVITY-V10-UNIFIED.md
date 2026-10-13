# Relatório — HL Activity V10 Unified Product

## Objetivo

A V10 foi construída como consolidação do HL Activity, preservando a identidade visual aprovada e a base de segurança, mas substituindo a lógica de “hotfix em cima de hotfix” por uma camada unificada de produto.

## Correções estruturais

- Configurações e menu **Mais** passam a ser capturados por uma camada V10 própria, reduzindo dependência dos handlers antigos.
- Reações usam `reactionId` único e deduplicação local; o servidor transmite para os demais com `socket.to`, evitando eco duplo.
- Soundboard mobile usa uma coluna e um único scroll interno; o texto explicativo fica fora da lista e não cobre os cards.
- `hl-v9.css`, ainda usado como base visual, agora é publicado explicitamente pelo servidor.
- Activity do Discord usa a versão atual do `hl-social.js` para não ficar presa em handlers antigos.

## Pré-entrada

Implementado:

- nome/avatar existentes preservados;
- teste real de microfone;
- medidor visual de nível;
- seleção de microfone;
- seleção de saída quando `setSinkId` é suportado;
- teste de saída de áudio;
- entrar no voz mutado por padrão;
- preview da sala via API com quantidade de participantes, avatares/status, bloqueio, senha e regra de entrada;
- aviso específico para permissão negada ou dispositivo indisponível.

## Entrada, convites e lobby

Implementado:

- entrada automática;
- aprovação de desconhecidos;
- aprovação de todos;
- convite comum;
- convite confiável;
- convite temporário com 15 min / 1h / 24h / 7 dias;
- convite de uso único;
- senha opcional;
- sala trancada;
- sala de espera com aceitar/recusar;
- host recebe notificação de solicitação.

A V10 não chama convidados de “amigos” sem identidade persistente. Convite confiável entrega a experiência de acesso direto sem criar uma segurança falsa.

## Perfis, presença e moderação

- avatar, nome, role, status e atividade;
- Online / Ausente / No voz / Falando / Transmitindo;
- volume individual local;
- fixar transmissão;
- spotlight;
- silenciar via moderação;
- bloquear soundboard de participante;
- bloquear transmissão de participante;
- kick;
- ban temporário do navegador;
- promover moderador;
- transferência manual de host;
- transferência automática quando o host sai;
- auditoria temporária de ações e painel de histórico para o host.

## Modos

- **Normal** — equilíbrio geral;
- **Cinema** — transmissão em foco, controles reduzidos, compatível com PiP;
- **Jogatina** — voz + sons/interação priorizados;
- **Estudo** — menos distrações, soundboard/reação reduzidos e Pomodoro.

## Soundboard

Preservado/evoluído:

- Air Horn, Vitória, Falha, Bonk, Pop e Suspense;
- upload temporário de áudio;
- conversão local para WAV curto e nova validação no servidor;
- máximo de 15 segundos;
- preview e corte;
- nome, categoria e emoji;
- busca;
- favoritos;
- recentes;
- meus sons;
- editar metadata;
- duplicar;
- excluir;
- ouvir localmente versus tocar na sala;
- políticas separadas para tocar/adicionar;
- cooldown;
- hotkeys 1–6;
- mobile em uma coluna e desktop em até duas colunas.

Persistência ainda é de sessão; R2/S3 é o próximo passo para sons permanentes.

## Áudio

- voz WebRTC separada do stream;
- mute/deaf/PTT;
- seleção de microfone/saída quando suportada;
- mixer local de transmissão e voz;
- volume individual por participante;
- Smart Ducking reduz o Soundboard enquanto alguém fala;
- restauração de volumes padrão.

## Diagnóstico

O painel tenta mostrar, quando o navegador disponibiliza:

- Socket conectado/desconectado;
- internet online/offline;
- ping Socket.IO;
- RTT WebRTC;
- tipos de candidatos ICE;
- rota direta/STUN ou TURN (`relay`);
- bitrate estimado;
- perda de pacotes e jitter;
- microfone detectado;
- tipo de rede e downlink;
- sala atual.

## UX e app

- PWA instalável;
- service worker evita interceptar `/api` e Socket.IO;
- salas recentes;
- favoritar sala localmente;
- onboarding inicial;
- feed de atividade;
- Ctrl+K;
- slash commands;
- atalhos de teclado;
- AFK automático;
- Picture-in-Picture;
- Screen Wake Lock;
- temas HL;
- modo desempenho;
- `prefers-reduced-motion` e redução manual de animações.

## Segurança preservada

- host token criptograficamente aleatório e hash no servidor;
- token efêmero de API por Socket.IO para ações HTTP da sala;
- origin guard HTTP e handshake Socket.IO;
- limite de conexões por IP;
- rate limit HTTP e por eventos Socket.IO;
- Helmet + CSP sem `unsafe-inline` em scripts;
- validação de SDP/ICE;
- validação e limites de upload;
- nenhum upload é gravado no filesystem efêmero;
- arquivos internos não são publicados como estáticos;
- OAuth com timeout e sem log de token;
- logs de auditoria temporários;
- timeouts HTTP e graceful shutdown.

## Testes executados nesta entrega

- `npm test`: **51/51 passaram**.
- `node --check` nos arquivos JavaScript modificados: passou.

### Não validado neste ambiente

O `npm install` expirou neste ambiente e o executável Vite não ficou disponível. Por isso não foi possível afirmar como aprovados aqui:

- `npm run build` com Vite;
- subida completa do Express/Socket.IO neste container;
- WebRTC real entre dois dispositivos;
- instalação PWA em dispositivo físico;
- Discord Activity dentro do Discord;
- deploy final no Render.

O atualizador PowerShell exige `npm install`, `npm test` e `npm run build` no computador do usuário **antes do commit/push**.

## Deliberadamente não fingido

- QR Code local: não incluído ainda. A V10 não envia link privado a serviço externo de QR. Pode ser adicionado depois com encoder local/biblioteca validada.
- amizade persistente: exige contas + banco.
- ban persistente confiável: exige identidade persistente.
- sons permanentes: exigem object storage.
- SFU: não necessário para a proposta atual de salas pequenas; mesh continua coerente para grupos reduzidos.
- TURN: infraestrutura ainda precisa ser provisionada/configurada.
