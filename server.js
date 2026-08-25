const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");


// =====================================================
// APP / SERVIDOR
// =====================================================

const app = express();

const server = http.createServer(app);


// =====================================================
// CONFIGURAÇÕES
// =====================================================

const {
    PORT,
    HOST,
    MAX_ROOMS,
    MAX_USERS_PER_ROOM,
    EMPTY_ROOM_TTL,
    MAX_SOCKET_PAYLOAD,
    ALLOWED_AVATARS
} = require("./src/config/constants");

const {
    isPlainObject,
    normalizeText,
    isValidRoomCode,
    sanitizeRoomCode,
    sanitizeProfile,
    isValidDescription,
    isValidCandidate,
    isValidFlowId
} = require("./src/utils/validation");

const {
    generateRoomCode,
    getParticipants
} = require("./src/utils/room-utils");

const {
    createRoomService
} = require("./src/services/room-service");

const {
    createParticipantManager
} = require("./src/socket/participants");

const {
    createSocketGuard
} = require("./src/socket/socket-guard");

const {
    createSocketRateLimiter
} = require("./src/socket/rate-limiter");


// =====================================================
// SOCKET.IO
// =====================================================

const io =
    new Server(
        server,
        {

            maxHttpBufferSize:
                MAX_SOCKET_PAYLOAD,

            pingTimeout:
                20000,

            pingInterval:
                25000

        }
    );


// =====================================================
// SALAS
// =====================================================

const roomService =
    createRoomService({
        maxRooms:
            MAX_ROOMS,

        emptyRoomTtl:
            EMPTY_ROOM_TTL
    });

const {
    updateParticipants
} = createParticipantManager({
    io,
    roomService
});

const {
    getSafeTargetSocket
} = createSocketGuard({
    io
});

const {
    allowSocketEvent
} = createSocketRateLimiter({
    maxEvents: 250,
    windowMs: 10000
});


// =====================================================
// EXPRESS / PROXY
// =====================================================

// Render usa proxy reverso.
// Necessário para identificar IP corretamente.
app.set(
    "trust proxy",
    1
);


// Esconder informação de tecnologia
app.disable(
    "x-powered-by"
);


// =====================================================
// HEADERS DE SEGURANÇA
// =====================================================

app.use(

    helmet({

        crossOriginEmbedderPolicy:
            false,

        contentSecurityPolicy: {

            directives: {

                defaultSrc: [
                    "'self'"
                ],

                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'"
                ],

                styleSrc: [
                    "'self'",
                    "'unsafe-inline'"
                ],

                imgSrc: [
                    "'self'",
                    "data:",
                    "https:"
                ],

                connectSrc: [
                    "'self'",
                    "ws:",
                    "wss:"
                ],

                mediaSrc: [
                    "'self'",
                    "blob:"
                ],

                fontSrc: [
                    "'self'",
                    "data:"
                ],

                objectSrc: [
                    "'none'"
                ],

                baseUri: [
                    "'self'"
                ],

                frameAncestors: [
                    "'none'"
                ]

            }

        }

    })

);


// =====================================================
// LIMITES HTTP
// =====================================================

// Não aceitar JSON gigante
app.use(

    express.json({

        limit:
            "16kb"

    })

);


// Rate limit geral da API
const apiLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            300,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {

            success:
                false,

            message:
                "Muitas requisições. Aguarde um pouco."

        }

    });


app.use(
    "/api",
    apiLimiter
);


// Limite específico para criação de sala
const createRoomLimiter =
    rateLimit({

        windowMs:
            15 * 60 * 1000,

        limit:
            20,

        standardHeaders:
            "draft-8",

        legacyHeaders:
            false,

        message: {

            success:
                false,

            message:
                "Muitas salas foram criadas. Aguarde alguns minutos."

        }

    });


// =====================================================
// ARQUIVOS ESTÁTICOS
// =====================================================

app.use(

    express.static(
        __dirname,
        {

            dotfiles:
                "deny",

            index:
                false

        }
    )

);


// =====================================================
// FUNÇÕES DE SEGURANÇA
// =====================================================
















// =====================================================
// GERAR CÓDIGO
// =====================================================




// =====================================================
// PARTICIPANTES
// =====================================================







// =====================================================
// CONFIRMAR QUE DOIS SOCKETS
// ESTÃO NA MESMA SALA
// =====================================================




// =====================================================
// VALIDAR SDP
// =====================================================




// =====================================================
// VALIDAR ICE
// =====================================================




// =====================================================
// VALIDAR FLOW ID
// =====================================================




// =====================================================
// RATE LIMIT SIMPLES PARA SOCKET
// =====================================================




// =====================================================
// LIMPEZA DE SALAS ABANDONADAS
// =====================================================

setInterval(
    () => {

        const removed =
            roomService.cleanupExpired();

        removed.forEach(
            code => {

                console.log(
                    `Sala expirada: ${code}`
                );

            }
        );

    },

    5 * 60 * 1000
).unref();



// =====================================================
// DISCORD ACTIVITY
// =====================================================

app.use(
    "/assets",
    express.static(
        path.join(
            __dirname,
            "dist",
            "assets"
        )
    )
);

app.get(
    "/activity",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "dist",
                "activity.html"
            )
        );

    }
);


// =====================================================
// HOME
// =====================================================

app.get(
    "/",
    (req, res) => {

        const userAgent =
            String(
                req.headers["user-agent"] || ""
            ).toLowerCase();

        const referer =
            String(
                req.headers.referer || ""
            ).toLowerCase();

        const fromDiscord =
            userAgent.includes("discord") ||
            referer.includes("discord.com") ||
            referer.includes("discordapp.com");

        if (fromDiscord) {

            return res.redirect(
                "/activity"
            );

        }

        res.sendFile(
            path.join(
                __dirname,
                "index.html"
            )
        );

    }
);


// =====================================================
// CRIAR SALA
// =====================================================


// =====================================================
// DISCORD OAUTH - TOKEN
// =====================================================

app.post(
    "/api/token",
    async (req, res) => {

        try {

            const code =
                String(
                    req.body?.code || ""
                ).trim();

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: "Codigo OAuth ausente."
                });
            }

            const clientId =
                process.env.DISCORD_CLIENT_ID;

            const clientSecret =
                process.env.DISCORD_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                return res.status(500).json({
                    success: false,
                    message: "Discord OAuth nao configurado."
                });
            }

            const response =
                await fetch(
                    "https://discord.com/api/oauth2/token",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            new URLSearchParams({
                                client_id: clientId,
                                client_secret: clientSecret,
                                grant_type: "authorization_code",
                                code
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok || !data.access_token) {

                console.error(
                    "Discord OAuth falhou:",
                    data
                );

                return res.status(400).json({
                    success: false,
                    message: "Falha na autorizacao Discord."
                });
            }

            return res.json({
                success: true,
                access_token: data.access_token
            });

        } catch (error) {

            console.error(
                "Erro OAuth Discord:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Erro interno OAuth."
            });
        }
    }
);


app.post(

    "/api/rooms",

    createRoomLimiter,

    (req, res) => {

        const created =
            roomService.create();

        if (!created.success) {

            return res
                .status(503)
                .json({
                    success: false,
                    message:
                        "Limite temporario de salas atingido."
                });

        }

        const code =
            created.code;

        console.log(
            "Sala criada:",
            code
        );


        res.status(201).json({

            success:
                true,

            code

        });

    }

);


// =====================================================
// VERIFICAR SALA
// =====================================================

app.get(

    "/api/rooms/:code",

    (req, res) => {

        const code =
            sanitizeRoomCode(
                req.params.code
            );


        if (
            !isValidRoomCode(
                code
            )
        ) {

            return res
                .status(400)
                .json({

                    success:
                        false,

                    message:
                        "Código de sala inválido."

                });

        }


        const room =
            roomService.get(
                code
            );


        if (!room) {

            return res
                .status(404)
                .json({

                    success:
                        false,

                    message:
                        "Sala não encontrada."

                });

        }


        res.json({

            success:
                true,

            code,

            users:
                room.users.size

        });

    }

);


// =====================================================
// ABRIR SALA
// =====================================================

app.get(

    "/room/:code",

    (req, res) => {

        const code =
            sanitizeRoomCode(
                req.params.code
            );


        if (
            !isValidRoomCode(
                code
            ) ||
            !roomService.has(code)
        ) {

            return res
                .status(404)
                .send(`
<!DOCTYPE html>

<html lang="pt-BR">

<head>

<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
>

<title>Sala não encontrada</title>

<style>

body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #08080b;
    color: white;
    font-family: Arial, sans-serif;
}

.box {
    text-align: center;
}

a {
    display: inline-block;
    margin-top: 20px;
    padding: 13px 20px;
    background: #5865f2;
    color: white;
    border-radius: 10px;
    text-decoration: none;
}

</style>

</head>

<body>

<div class="box">

<h1>
Sala não encontrada
</h1>

<p>
Essa sala não existe ou já foi encerrada.
</p>

<a href="/">
Voltar
</a>

</div>

</body>

</html>
                `);

        }


        res.sendFile(

            path.join(
                __dirname,
                "room.html"
            )

        );

    }

);


// =====================================================
// 404 API
// =====================================================

app.use(
    "/api",
    (req, res) => {

        res.status(404).json({

            success:
                false,

            message:
                "Endpoint não encontrado."

        });

    }
);


// =====================================================
// SOCKET.IO
// =====================================================

io.on(
    "connection",
    socket => {

        console.log(
            "Socket conectado:",
            socket.id
        );


        // =============================================
        // ENTRAR NA SALA
        // =============================================

        socket.on(
            "join-room",
            data => {

                if (
                    !allowSocketEvent(
                        socket
                    )
                ) {

                    return;

                }


                if (
                    !isPlainObject(
                        data
                    )
                ) {

                    socket.emit(
                        "room-error",
                        "Dados inválidos."
                    );

                    return;

                }


                const roomCode =
                    sanitizeRoomCode(
                        data.roomCode
                    );


                if (
                    !isValidRoomCode(
                        roomCode
                    )
                ) {

                    socket.emit(
                        "room-error",
                        "Código de sala inválido."
                    );

                    return;

                }


                const room =
                    roomService.get(
                        roomCode
                    );


                if (!room) {

                    socket.emit(
                        "room-error",
                        "Sala não encontrada."
                    );

                    return;

                }


                // Já entrou
                if (
                    socket.data.roomCode ===
                    roomCode
                ) {

                    return;

                }


                // Não permitir trocar de sala
                // no mesmo socket.
                if (
                    socket.data.roomCode &&
                    socket.data.roomCode !==
                        roomCode
                ) {

                    socket.emit(
                        "room-error",
                        "Conexão já vinculada a outra sala."
                    );

                    return;

                }


                if (
                    room.users.size >=
                    MAX_USERS_PER_ROOM
                ) {

                    socket.emit(
                        "room-error",
                        "A sala atingiu o limite de participantes."
                    );

                    return;

                }


                const profile =
                    sanitizeProfile(
                        data.profile
                    );


                socket.data.roomCode =
                    roomCode;


                socket.data.profile =
                    profile;


                socket.join(
                    roomCode
                );


                room.users.set(
                    socket.id,
                    {

                        ...profile,

                        streaming:
                            false

                    }
                );


                console.log(
                    `${profile.name} entrou em ${roomCode}`
                );


                socket.to(
                    roomCode
                ).emit(
                    "user-joined",
                    {

                        id:
                            socket.id,

                        ...profile

                    }
                );


                updateParticipants(
                    roomCode
                );

            }
        );


        // =============================================
        // COMEÇOU A TRANSMITIR
        // =============================================

        socket.on(
            "stream-started",
            () => {

                if (
                    !allowSocketEvent(
                        socket
                    )
                ) {

                    return;

                }


                const roomCode =
                    socket.data.roomCode;


                if (!roomCode) {
                    return;
                }


                const room =
                    roomService.get(
                        roomCode
                    );


                if (!room) {
                    return;
                }


                const user =
                    room.users.get(
                        socket.id
                    );


                if (!user) {
                    return;
                }


                user.streaming =
                    true;


                console.log(
                    `${user.name} começou a transmitir`
                );


                updateParticipants(
                    roomCode
                );

            }
        );


        // =============================================
        // PAROU DE TRANSMITIR
        // =============================================

        socket.on(
            "stream-stopped",
            () => {

                if (
                    !allowSocketEvent(
                        socket
                    )
                ) {

                    return;

                }


                const roomCode =
                    socket.data.roomCode;


                if (!roomCode) {
                    return;
                }


                const room =
                    roomService.get(
                        roomCode
                    );


                if (!room) {
                    return;
                }


                const user =
                    room.users.get(
                        socket.id
                    );


                if (user) {

                    user.streaming =
                        false;

                }


                socket.to(
                    roomCode
                ).emit(
                    "stream-stopped",
                    socket.id
                );


                updateParticipants(
                    roomCode
                );


                console.log(
                    `${user?.name || "Usuário"} parou de transmitir`
                );

            }
        );


        // =============================================
        // OFFER
        // =============================================

        socket.on(
            "offer",
            data => {

                if (
                    !allowSocketEvent(
                        socket
                    )
                ) {

                    return;

                }


                if (
                    !isPlainObject(
                        data
                    )
                ) {

                    return;

                }


                const targetId =
                    normalizeText(
                        data.target,
                        100
                    );


                const targetSocket =
                    getSafeTargetSocket(
                        socket,
                        targetId
                    );


                if (!targetSocket) {

                    console.warn(
                        "Offer bloqueada fora da sala:",
                        socket.id
                    );

                    return;

                }


                if (
                    !isValidFlowId(
                        socket,
                        targetId,
                        data.flowId
                    )
                ) {

                    return;

                }


                if (
                    !isValidDescription(
                        data.offer,
                        "offer"
                    )
                ) {

                    return;

                }


                targetSocket.emit(
                    "offer",
                    {

                        sender:
                            socket.id,

                        flowId:
                            data.flowId,

                        offer:
                            data.offer,

                        profile:
                            socket.data.profile

                    }
                );

            }
        );


        // =============================================
        // ANSWER
        // =============================================

        socket.on(
            "answer",
            data => {

                if (
                    !allowSocketEvent(
                        socket
                    )
                ) {

                    return;

                }


                if (
                    !isPlainObject(
                        data
                    )
                ) {

                    return;

                }


                const targetId =
                    normalizeText(
                        data.target,
                        100
                    );


                const targetSocket =
                    getSafeTargetSocket(
                        socket,
                        targetId
                    );


                if (!targetSocket) {

                    console.warn(
                        "Answer bloqueada fora da sala:",
                        socket.id
                    );

                    return;

                }


                if (
                    !isValidFlowId(
                        socket,
                        targetId,
                        data.flowId
                    )
                ) {

                    return;

                }


                if (
                    !isValidDescription(
                        data.answer,
                        "answer"
                    )
                ) {

                    return;

                }


                targetSocket.emit(
                    "answer",
                    {

                        sender:
                            socket.id,

                        flowId:
                            data.flowId,

                        answer:
                            data.answer

                    }
                );

            }
        );


        // =============================================
        // ICE CANDIDATE
        // =============================================

        socket.on(
            "ice-candidate",
            data => {

                if (
                    !allowSocketEvent(
                        socket
                    )
                ) {

                    return;

                }


                if (
                    !isPlainObject(
                        data
                    )
                ) {

                    return;

                }


                const targetId =
                    normalizeText(
                        data.target,
                        100
                    );


                const targetSocket =
                    getSafeTargetSocket(
                        socket,
                        targetId
                    );


                if (!targetSocket) {

                    return;

                }


                if (
                    !isValidFlowId(
                        socket,
                        targetId,
                        data.flowId
                    )
                ) {

                    return;

                }


                if (
                    !isValidCandidate(
                        data.candidate
                    )
                ) {

                    return;

                }


                targetSocket.emit(
                    "ice-candidate",
                    {

                        sender:
                            socket.id,

                        flowId:
                            data.flowId,

                        candidate:
                            data.candidate

                    }
                );

            }
        );


        // =============================================
        // DESCONECTOU
        // =============================================

        socket.on(
            "disconnect",
            () => {

                const roomCode =
                    socket.data.roomCode;


                if (!roomCode) {
                    return;
                }


                const room =
                    roomService.get(
                        roomCode
                    );


                if (!room) {
                    return;
                }


                const user =
                    room.users.get(
                        socket.id
                    );


                room.users.delete(
                    socket.id
                );


                socket.to(
                    roomCode
                ).emit(
                    "user-left",
                    socket.id
                );


                socket.to(
                    roomCode
                ).emit(
                    "stream-stopped",
                    socket.id
                );


                console.log(
                    `${user?.name || "Usuário"} saiu`
                );


                if (
                    roomService.removeIfEmpty(
                        roomCode
                    )
                ) {

                    console.log(
                        `Sala ${roomCode} encerrada`
                    );

                    return;

                }


                updateParticipants(
                    roomCode
                );

            }
        );

    }

);


// =====================================================
// ERROS EXPRESS
// =====================================================

app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Erro interno:",
            error?.message ||
            "Erro desconhecido"
        );


        if (
            res.headersSent
        ) {

            return next(
                error
            );

        }


        res.status(500).json({

            success:
                false,

            message:
                "Erro interno do servidor."

        });

    }
);


// =====================================================
// SERVIDOR
// =====================================================

server.listen(
    PORT,
    HOST,
    () => {

        console.log("");
        console.log(
            "================================"
        );
        console.log(
            "        LEAL ACTIVITY"
        );
        console.log(
            "================================"
        );
        console.log("");
        console.log(
            `Porta: ${PORT}`
        );
        console.log(
            "Segurança: ATIVA"
        );
        console.log("");

    }
);