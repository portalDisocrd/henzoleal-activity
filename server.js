const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Salas em memória
const rooms = new Map();

app.use(express.json());
app.use(express.static(__dirname));


// =====================================================
// GERAR CÓDIGO
// =====================================================

function generateRoomCode() {

    let code;

    do {

        code = crypto
            .randomBytes(4)
            .toString("hex")
            .toUpperCase();

    } while (rooms.has(code));

    return code;
}


// =====================================================
// SANITIZAR PERFIL
// =====================================================

function sanitizeProfile(profile) {

    const name =
        String(profile?.name || "Usuário")
            .trim()
            .substring(0, 24);

    const avatar =
        String(profile?.avatar || "😎")
            .substring(0, 8);

    return {
        name: name || "Usuário",
        avatar: avatar || "😎"
    };
}


// =====================================================
// PARTICIPANTES
// =====================================================

function getParticipants(room) {

    return Array.from(
        room.users.entries()
    ).map(([id, user]) => ({

        id,

        name:
            user.name,

        avatar:
            user.avatar,

        streaming:
            user.streaming

    }));

}


function updateParticipants(roomCode) {

    const room =
        rooms.get(roomCode);

    if (!room) {
        return;
    }

    io.to(roomCode).emit(
        "participants-update",
        getParticipants(room)
    );

}


// =====================================================
// INÍCIO
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "index.html"
        )
    );

});


// =====================================================
// CRIAR SALA
// UM CLIQUE = UMA SALA
// =====================================================

app.post("/api/rooms", (req, res) => {

    const code =
        generateRoomCode();

    rooms.set(code, {

        createdAt:
            Date.now(),

        users:
            new Map()

    });

    console.log(
        "Sala criada:",
        code
    );

    res.json({
        success: true,
        code
    });

});


// =====================================================
// VERIFICAR SALA
// =====================================================

app.get("/api/rooms/:code", (req, res) => {

    const code =
        String(
            req.params.code
        ).toUpperCase();

    const room =
        rooms.get(code);

    if (!room) {

        return res.status(404).json({
            success: false,
            message: "Sala não encontrada."
        });

    }

    res.json({
        success: true,
        code,
        users: room.users.size
    });

});


// =====================================================
// ABRIR SALA
// =====================================================

app.get("/room/:code", (req, res) => {

    const code =
        String(
            req.params.code
        ).toUpperCase();

    if (!rooms.has(code)) {

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

<h1>Sala não encontrada</h1>

<p>
Essa sala não existe ou o servidor foi reiniciado.
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

});


// =====================================================
// SOCKET.IO
// =====================================================

io.on("connection", socket => {

    console.log(
        "Socket conectado:",
        socket.id
    );


    // =================================================
    // ENTRAR
    // =================================================

    socket.on("join-room", data => {

        const roomCode =
            String(
                data?.roomCode || ""
            ).toUpperCase();

        const room =
            rooms.get(roomCode);

        if (!room) {

            socket.emit(
                "room-error",
                "Sala não encontrada."
            );

            return;

        }


        // Evitar entrada duplicada
        if (
            socket.data.roomCode ===
            roomCode
        ) {

            return;

        }


        const profile =
            sanitizeProfile(
                data?.profile
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


        // Novo usuário para transmissores
        socket.to(roomCode).emit(
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

    });


    // =================================================
    // COMEÇOU A TRANSMITIR
    // =================================================

    socket.on(
        "stream-started",
        () => {

            const roomCode =
                socket.data.roomCode;

            if (!roomCode) {
                return;
            }

            const room =
                rooms.get(roomCode);

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


    // =================================================
    // PAROU DE TRANSMITIR
    // =================================================

    socket.on(
        "stream-stopped",
        () => {

            const roomCode =
                socket.data.roomCode;

            if (!roomCode) {
                return;
            }

            const room =
                rooms.get(roomCode);

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


            // Apenas a transmissão desta pessoa parou
            socket.to(roomCode).emit(
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


    // =================================================
    // WEBRTC OFFER
    // =================================================

    socket.on(
        "offer",
        data => {

            if (!data?.target) {
                return;
            }

            io.to(
                data.target
            ).emit(
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


    // =================================================
    // WEBRTC ANSWER
    // =================================================

    socket.on(
        "answer",
        data => {

            if (!data?.target) {
                return;
            }

            io.to(
                data.target
            ).emit(
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


    // =================================================
    // ICE
    // =================================================

    socket.on(
        "ice-candidate",
        data => {

            if (!data?.target) {
                return;
            }

            io.to(
                data.target
            ).emit(
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


    // =================================================
    // DESCONECTOU
    // =================================================

    socket.on(
        "disconnect",
        () => {

            const roomCode =
                socket.data.roomCode;

            if (!roomCode) {
                return;
            }

            const room =
                rooms.get(roomCode);

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


            socket.to(roomCode).emit(
                "user-left",
                socket.id
            );


            socket.to(roomCode).emit(
                "stream-stopped",
                socket.id
            );


            console.log(
                `${user?.name || "Usuário"} saiu`
            );


            if (
                room.users.size === 0
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

});


// =====================================================
// SERVIDOR
// =====================================================

server.listen(
    PORT,
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
            `Servidor: http://localhost:${PORT}`
        );
        console.log("");

    }
);