# Relatório — HL Activity V8

## Objetivo

Consolidar em um único projeto as evoluções visuais, sociais, de voz, Soundboard e segurança já existentes, adicionando recursos que aumentam a utilidade diária do HL sem transformar o produto em uma cópia de Discord/Meet/Twitch.

## Novidades implementadas

### PWA / aplicativo instalável
- `manifest.webmanifest`;
- ícones 192×192 e 512×512;
- service worker próprio;
- botão de instalação quando o navegador disponibiliza `beforeinstallprompt`;
- modo standalone;
- cache apenas de shell/arquivos estáticos;
- API e Socket.IO ficam fora do cache do service worker.

### Pré-entrada
- modal antes de criar/entrar pela home;
- seleção de microfone;
- teste visual de nível do microfone;
- tratamento de permissão negada;
- opção para entrar no voz mutado por padrão;
- dispositivo preferido salvo localmente.

### Lobby seletivo / confiança
- políticas `auto`, `approveUnknown` e `approveAll`;
- fila de entrada mantida no servidor;
- host recebe solicitações em tempo real;
- aceitar/recusar;
- convidado aprovado tenta o join novamente sem recriar a sala;
- desconexões pendentes são removidas da fila;
- convite confiável com token aleatório;
- token confiável armazenado somente como hash no servidor;
- gerar novo convite confiável rotaciona o token anterior.

### Modos de sala
- Normal;
- Cinema;
- Jogatina;
- Estudo;
- host/mod pode sincronizar modo com a sala;
- modo Estudo reduz distrações sociais;
- Cinema prioriza a transmissão.

### Mixer e áudio
- volume local da transmissão;
- volume mestre local do voz;
- volumes individuais continuam preservados;
- Smart Ducking reduz o volume do Soundboard quando há participante falando;
- preferências ficam em armazenamento local.

### Diagnóstico
- Socket conectado/desconectado;
- navegador online/offline;
- código da sala;
- `effectiveType`, downlink e RTT quando a Network Information API existe;
- indicador simples de saúde da conexão.

### Uso como app e experiência
- Picture-in-Picture quando suportado;
- Screen Wake Lock durante reprodução da transmissão quando suportado;
- `Ctrl+K` para paleta de ações;
- atalhos M/C/V/F fora de campos de texto;
- salas recentes no dispositivo;
- configurações em drawer no desktop e sheet no mobile;
- modo desempenho;
- redução de animações.

## Segurança preservada

Tudo da V6/V7 permanece, incluindo token de host, tokens efêmeros de sala, validação de origem, limites de Socket.IO/HTTP, CSP, validações de upload WAV, ausência de exposição da raiz do projeto e logs sem credenciais.

O lobby novo continua server-authoritative: o cliente não consegue se declarar aprovado sozinho.

## Decisões deliberadas

### Não foi criado um “sistema de amigos” falso
Sem conta persistente/banco, nome e avatar são insuficientes para provar identidade. Por isso a V8 usa **convite confiável** como mecanismo seguro equivalente para amigos.

### Sons personalizados continuam efêmeros
Persistência real exige R2/S3/object storage ou equivalente. Não foi simulada persistência usando o filesystem efêmero do Render.

### Não implementado nesta rodada
- lista permanente de amigos;
- QR Code nativo do convite;
- banco de dados persistente;
- storage externo do Soundboard;
- ban persistente entre reinícios;
- SFU para salas grandes;
- gravação.

Esses itens exigem infraestrutura adicional e foram deixados de fora para evitar funcionalidade falsa ou frágil.

## Testes

- `npm test`: **36/36 testes passaram**;
- `node --check` passou nos módulos JS alterados;
- novos testes cobrem PWA, convite confiável, estado inicial do lobby, carregamento da V8, pré-entrada e presença das funções de mixer/diagnóstico/PiP/Wake Lock.

## Build

O build Vite não foi validado neste ambiente porque `vite` não estava instalado e a reinstalação das dependências expirou. O atualizador PowerShell V8 executa `npm install`, `npm test` e `npm run build` no computador do usuário antes de qualquer `git push`. Se uma etapa falhar, o deploy não é enviado.

## Backup

Foi criado `BACKUP-HL-ACTIVITY-ANTES-V8.ps1`, que:

- encontra o repositório local;
- copia o código sem `node_modules`, `.git` e `dist`;
- gera um `git bundle` completo;
- protege o `.env` localmente com DPAPI do Windows quando possível;
- gera instruções de restauração;
- cria um ZIP no Desktop.
