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
