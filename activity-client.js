import { DiscordSDK } from "@discord/embedded-app-sdk";

const CLIENT_ID = "1541114643693572128";

const statusElement =
    document.getElementById("status");

const params =
    new URLSearchParams(
        window.location.search
    );

const frameId =
    params.get("frame_id");

const instanceId =
    params.get("instance_id");

const platform =
    params.get("platform");

console.log(
    "URL Activity:",
    window.location.href
);

console.log(
    "frame_id:",
    frameId
);

console.log(
    "instance_id:",
    instanceId
);

console.log(
    "platform:",
    platform
);

async function start() {

    if (!frameId) {

        statusElement.textContent =
            "Discord abriu a página sem frame_id";

        console.error(
            "Activity iniciada sem frame_id."
        );

        return;

    }

    try {

        const discordSdk =
            new DiscordSDK(
                CLIENT_ID
            );

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
            "🔴 Erro ao conectar ao Discord";

    }

}

start();
