import { DiscordSDK } from "@discord/embedded-app-sdk";

const CLIENT_ID = "1541114643693572128";

const statusElement =
    document.getElementById("status");

const discordSdk =
    new DiscordSDK(CLIENT_ID);

async function start() {

    try {

        await discordSdk.ready();

        console.log(
            "HL Activity conectada ao Discord."
        );

        statusElement.textContent =
            "🟢 Conectado ao Discord";

    } catch (error) {

        console.error(
            "Erro ao iniciar HL Activity:",
            error
        );

        statusElement.textContent =
            "🔴 Não foi possível conectar ao Discord";

    }

}

start();
