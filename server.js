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

const PORT =
    process.env.PORT || 3000;

const HOST =
    "0.0.0.0";


// Máximo de salas existentes ao mesmo tempo
const MAX_ROOMS =
    500;


// Máximo de pessoas por sala
const MAX_USERS_PER_ROOM =
    20;


// Sala criada mas nunca usada expira
// depois de 30 minutos
const EMPTY_ROOM_TTL =
    30 * 60 * 1000;


// Limite de tamanho dos eventos Socket.IO
const MAX_SOCKET_PAYLOAD =
    64 * 1024;


// Avatares permitidos
const ALLOWED_AVATARS =
    new Set([
        "😎",
        "👾",
        "🐺",
        "🦊",
        "🐉",
        "🤖"
    ]);


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

const rooms =
    new Map();


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

function isPlainObject(value) {

    return (
        value !== null &&
        typeof value ===
            "object" &&
        !Array.isArray(value)
    );

}


function normalizeText(
    value,
    maxLength
) {

    return String(
        value ?? ""
    )
        .normalize("NFKC")
        .replace(
            /[\u0000-\u001F\u007F]/g,
            ""
        )
        .trim()
        .substring(
            0,
            maxLength
        );

}


function isValidRoomCode(
    code
) {

    return (
        typeof code ===
            "string" &&
        /^[A-F0-9]{8}$/.test(
            code
        )
    );

}


function sanitizeRoomCode(
    value
) {

    const code =
        normalizeText(
            value,
            8
        )
        .toUpperCase();

    return code;

}


function sanitizeProfile(
    profile
) {

    const name =
        normalizeText(
            profile?.name ||
            "Usuário",
            24
        );


    const requestedAvatar =
        normalizeText(
            profile?.avatar ||
            "😎",
            8
        );


    const avatar =
        ALLOWED_AVATARS.has(
            requestedAvatar
        )
            ? requestedAvatar
            : "😎";


    return {

        name:
            name ||
            "Usuário",

        avatar

    };

}


// =====================================================
// GERAR CÓDIGO
// =====================================================

function generateRoomCode() {

    let code;


    do {

        code =
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase();


    } while (
        rooms.has(code)
    );


    return code;

}


// =====================================================
// PARTICIPANTES
// =====================================================

function getParticipants(
    room
) {

    return Array.from(
        room.users.entries()
    ).map(
        ([id, user]) => ({

            id,

            name:
                user.name,

            avatar:
                user.avatar,

            streaming:
                Boolean(
                    user.streaming
                )

        })
    );

}


function updateParticipants(
    roomCode
) {

    const room =
        rooms.get(
            roomCode
        );


    if (!room) {
        return;
    }


    io.to(
        roomCode
    ).emit(

        "participants-update",

        getParticipants(
            room
        )

    );

}


// =====================================================
// CONFIRMAR QUE DOIS SOCKETS
// ESTÃO NA MESMA SALA
// =====================================================

function getSafeTargetSocket(
    socket,
    targetId
) {

    if (
        typeof targetId !==
        "string"
    ) {

        return null;

    }


    if (
        targetId.length > 100
    ) {

        return null;

    }


    if (
        targetId ===
        socket.id
    ) {

        return null;

    }


    const targetSocket =
        io.sockets.sockets.get(
            targetId
        );


    if (!targetSocket) {

        return null;

    }


    const senderRoom =
        socket.data.roomCode;


    const targetRoom =
        targetSocket.data.roomCode;


    if (
        !senderRoom ||
        !targetRoom ||
        senderRoom !==
            targetRoom
    ) {

        return null;

    }


    return targetSocket;

}


// =====================================================
// VALIDAR SDP
// =====================================================

function isValidDescription(
    description,
    expectedType
) {

    if (
        !isPlainObject(
            description
        )
    ) {

        return false;

    }


    if (
        description.type !==
        expectedType
    ) {

        return false;

    }


    if (
        typeof description.sdp !==
        "string"
    ) {

        return false;

    }


    if (
        description.sdp.length === 0 ||
        description.sdp.length >
            50000
    ) {

        return false;

    }


    return true;

}


// =====================================================
// VALIDAR ICE
// =====================================================

function isValidCandidate(
    candidate
) {

    if (
        !isPlainObject(
            candidate
        )
    ) {

        return false;

    }


    if (
        typeof candidate.candidate !==
        "string"
    ) {

        return false;

    }


    if (
        candidate.candidate.length >
        5000
    ) {

        return false;

    }


    return true;

}


// =====================================================
// VALIDAR FLOW ID
// =====================================================

function isValidFlowId(
    socket,
    targetId,
    flowId
) {

    if (
        typeof flowId !==
        "string"
    ) {

        return false;

    }


    // No sistema atual o flowId
    // precisa representar o transmissor:
    // ou quem envia ou quem recebe.
    return (
        flowId ===
            socket.id ||
        flowId ===
            targetId
    );

}


// =====================================================
// RATE LIMIT SIMPLES PARA SOCKET
// =====================================================

function allowSocketEvent(
    socket
) {

    const now =
        Date.now();


    if (
        !socket.data.eventWindow ||
        now -
            socket.data.eventWindow >
            10000
    ) {

        socket.data.eventWindow =
            now;

        socket.data.eventCount =
            0;

    }


    socket.data.eventCount =
        (
            socket.data.eventCount ||
            0
        ) + 1;


    // Máximo aproximado:
    // 250 eventos a cada 10 segundos
    if (
        socket.data.eventCount >
        250
    ) {

        console.warn(
            "Socket limitado:",
            socket.id
        );


        return false;

    }


    return true;

}


// =====================================================
// LIMPEZA DE SALAS ABANDONADAS
// =====================================================

setInterval(
    () => {

        const now =
            Date.now();


        for (
            const [
                code,
                room
            ]
            of rooms
        ) {

            if (
                room.users.size ===
                    0 &&
                now -
                    room.createdAt >
                    EMPTY_ROOM_TTL
            ) {

                rooms.delete(
                    code
                );


                console.log(
                    `Sala expirada: ${code}`
                );

            }

        }

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

app.post(

    "/api/rooms",

    createRoomLimiter,

    (req, res) => {

        if (
            rooms.size >=
            MAX_ROOMS
        ) {

            return res
                .status(503)
                .json({

                    success:
                        false,

                    message:
                        "Limite temporário de salas atingido."

                });

        }


        const code =
            generateRoomCode();


        rooms.set(
            code,
            {

                createdAt:
                    Date.now(),

                users:
                    new Map()

            }
        );


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
            rooms.get(
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
            !rooms.has(code)
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
                    rooms.get(
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
                    rooms.get(
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
                    rooms.get(
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
                    rooms.get(
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
                    room.users.size ===
                    0
                ) {

                    rooms.delete(
                        roomCode
                    );


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