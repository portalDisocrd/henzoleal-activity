const { DiscordSDK } = require("@discord/embedded-app-sdk");

const CLIENT_ID = "1541114643693572128";

const discordSdk = new DiscordSDK(CLIENT_ID);

async function startDiscordActivity() {
    try {
        await discordSdk.ready();

        console.log("HL Activity conectada ao Discord.");

        return discordSdk;
    } catch (error) {
        console.error(
            "Erro ao iniciar Discord Activity:",
            error
        );

        return null;
    }
}

module.exports = {
    startDiscordActivity
};
