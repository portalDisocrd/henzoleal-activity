import { DiscordSDK } from "@discord/embedded-app-sdk";

const CLIENT_ID =
    "1541114643693572128";

const discordRoomSdk =
    new DiscordSDK(
        CLIENT_ID
    );

let sdkReadyPromise =
    null;


function ensureDiscordRoomSdk() {

    if (!sdkReadyPromise) {

        sdkReadyPromise =
            discordRoomSdk
                .ready()
                .then(() => {

                    console.log(
                        "[ACTIVITY ROOM] Discord SDK pronto"
                    );

                    return discordRoomSdk;

                });

    }

    return sdkReadyPromise;

}


window.hlActivityInvite =
    async function (
        roomCode
    ) {

        const safeCode =
            String(
                roomCode || ""
            )
                .trim()
                .toUpperCase();


        if (
            !/^[A-F0-9]{8}$/.test(
                safeCode
            )
        ) {

            throw new Error(
                "Código de sala inválido."
            );

        }


        const sdk =
            await ensureDiscordRoomSdk();


        const result =
            await sdk.commands.shareLink({

                message:
                    `Entre na minha sala HL Activity • Código: ${safeCode}`,

                custom_id:
                    `room_${safeCode}`

            });


        console.log(
            "[ACTIVITY ROOM] Resultado do convite:",
            result
        );


        return result;

    };


console.log(
    "[ACTIVITY ROOM] Invite V1 carregado"
);
