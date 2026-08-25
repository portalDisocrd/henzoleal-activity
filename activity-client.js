import { DiscordSDK } from "@discord/embedded-app-sdk";

const CLIENT_ID = "1541114643693572128";

const statusElement =
    document.getElementById("status");

const connectionElement =
    document.getElementById("discordConnection");

const nameElement =
    document.getElementById("discordName");

const userInfoElement =
    document.getElementById("discordUserInfo");

const avatarElement =
    document.getElementById("discordAvatar");

const createButton =
    document.getElementById("createRoom");

const joinButton =
    document.getElementById("joinRoom");

const params =
    new URLSearchParams(
        window.location.search
    );

const frameId =
    params.get("frame_id");

const discordSdk =
    new DiscordSDK(CLIENT_ID);


function setDisconnected(message) {

    connectionElement.textContent =
        "Erro";

    statusElement.textContent =
        message;

    createButton.disabled =
        true;

    joinButton.disabled =
        true;

}


async function start() {

    if (!frameId) {

        setDisconnected(
            "Abra esta página através da Activity do Discord."
        );

        return;

    }

    try {

        await discordSdk.ready();

        connectionElement.textContent =
            "🟢 Discord conectado";

        statusElement.textContent =
            "Autorizando perfil...";


        const { code } =
            await discordSdk.commands.authorize({
                client_id:
                    CLIENT_ID,

                response_type:
                    "code",

                state:
                    "",

                prompt:
                    "none",

                scope: [
                    "identify"
                ]
            });


        const tokenResponse =
            await fetch(
                "/api/token",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            code
                        })
                }
            );


        const tokenData =
            await tokenResponse.json();


        if (
            !tokenResponse.ok ||
            !tokenData.access_token
        ) {

            throw new Error(
                tokenData.message ||
                "Falha ao obter token."
            );

        }


        const auth =
            await discordSdk.commands.authenticate({
                access_token:
                    tokenData.access_token
            });


        if (
            !auth ||
            !auth.user
        ) {

            throw new Error(
                "Discord não retornou o usuário."
            );

        }


        const user =
            auth.user;


        nameElement.textContent =
            user.global_name ||
            user.username ||
            "Usuário Discord";


        userInfoElement.textContent =
            `@${user.username}`;


        if (
            user.avatar
        ) {

            avatarElement.src =
                `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;

        }


        statusElement.textContent =
            "Perfil conectado com sucesso.";

        createButton.disabled =
            false;

        joinButton.disabled =
            false;


        console.log(
            "Usuário Discord:",
            user
        );


    } catch (error) {

        console.error(
            "Erro ao autenticar Discord:",
            error
        );

        setDisconnected(
            "Não foi possível carregar seu perfil do Discord."
        );

    }

}

start();

/* =====================================================
   SALAS
===================================================== */

const roomCodeElement =
    document.getElementById("roomCode");


function normalizeRoomCode(value) {

    return String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-F0-9]/g, "")
        .slice(0, 8);

}


function openRoom(code) {

    const safeCode =
        normalizeRoomCode(code);

    if (safeCode.length !== 8) {

        statusElement.textContent =
            "Código de sala inválido.";

        return;

    }

    statusElement.textContent =
        "Entrando na sala...";

    window.location.href =
        `/room/${safeCode}`;

}


/* =====================================================
   CRIAR SALA
===================================================== */

createButton.addEventListener(
    "click",
    async () => {

        if (createButton.disabled) {
            return;
        }

        createButton.disabled =
            true;

        joinButton.disabled =
            true;

        statusElement.textContent =
            "Criando sala...";

        try {

            const response =
                await fetch(
                    "/api/rooms",
                    {
                        method:
                            "POST",

                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success ||
                !data.code
            ) {

                throw new Error(
                    data.message ||
                    "Não foi possível criar a sala."
                );

            }


            openRoom(
                data.code
            );


        } catch (error) {

            console.error(
                "Erro ao criar sala:",
                error
            );

            statusElement.textContent =
                error.message ||
                "Não foi possível criar a sala.";

            createButton.disabled =
                false;

            joinButton.disabled =
                false;

        }

    }
);


/* =====================================================
   ENTRAR EM SALA
===================================================== */

joinButton.addEventListener(
    "click",
    async () => {

        if (joinButton.disabled) {
            return;
        }


        const code =
            normalizeRoomCode(
                roomCodeElement.value
            );


        roomCodeElement.value =
            code;


        if (code.length !== 8) {

            statusElement.textContent =
                "Digite um código de sala válido.";

            roomCodeElement.focus();

            return;

        }


        createButton.disabled =
            true;

        joinButton.disabled =
            true;

        statusElement.textContent =
            "Verificando sala...";


        try {

            const response =
                await fetch(
                    `/api/rooms/${encodeURIComponent(code)}`,
                    {
                        headers: {
                            "Accept":
                                "application/json"
                        }
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Sala não encontrada."
                );

            }


            openRoom(
                data.code ||
                code
            );


        } catch (error) {

            console.error(
                "Erro ao entrar na sala:",
                error
            );

            statusElement.textContent =
                error.message ||
                "Não foi possível entrar na sala.";

            createButton.disabled =
                false;

            joinButton.disabled =
                false;

        }

    }
);


/* =====================================================
   INPUT DO CODIGO
===================================================== */

roomCodeElement.addEventListener(
    "input",
    () => {

        roomCodeElement.value =
            normalizeRoomCode(
                roomCodeElement.value
            );

    }
);


roomCodeElement.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !joinButton.disabled
        ) {

            event.preventDefault();

            joinButton.click();

        }

    }
);

