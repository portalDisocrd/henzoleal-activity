const fs = require("fs");

const file =
    "C:\\lealbot\\src\\socket\\join-room.js";

let code =
    fs.readFileSync(
        file,
        "utf8"
    );


if (
    code.includes(
        '"user-joined"'
    )
) {

    console.log(
        "USER-JOINED JA EXISTE"
    );

    process.exit(0);
}


const marker = `            console.log(
                \`\${profile.name} entrou em \${roomCode}\`
            );


            updateParticipants(
                roomCode
            );`;


if (
    !code.includes(
        marker
    )
) {

    throw new Error(
        "Ponto de insercao nao localizado"
    );

}


const replacement = `            console.log(
                \`\${profile.name} entrou em \${roomCode}\`
            );


            // Avisa quem ja estava na sala.
            // Se alguem estiver transmitindo,
            // o cliente inicia WebRTC para o novo usuario.
            socket.to(
                roomCode
            ).emit(
                "user-joined",
                {
                    id:
                        socket.id,

                    name:
                        profile.name,

                    avatar:
                        profile.avatar,

                    streaming:
                        false
                }
            );


            updateParticipants(
                roomCode
            );`;


code =
    code.replace(
        marker,
        replacement
    );


fs.writeFileSync(
    file,
    code,
    "utf8"
);


console.log(
    "USER-JOINED RESTAURADO"
);
