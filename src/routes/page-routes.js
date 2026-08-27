const path =
    require("path");


function registerPageRoutes({
    app,
    rootDir,
    roomService,
    sanitizeRoomCode,
    isValidRoomCode
}) {

    // =============================================
    // DISCORD ACTIVITY
    // =============================================

    app.get(
        "/activity",
        (req, res) => {

            res.sendFile(
                path.join(
                    rootDir,
                    "dist",
                    "activity.html"
                )
            );

        }
    );


    // =============================================
    // HOME
    // =============================================

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
                    rootDir,
                    "index.html"
                )
            );

        }
    );


    // =============================================
    // SHARE BRIDGE V1
    // =============================================

    app.get(
        "/share/:code",
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
                    .send(
                        "Codigo de sala invalido."
                    );

            }


            res.sendFile(
                path.join(
                    rootDir,
                    "room.html"
                )
            );

        }
    );


    // =============================================
    // ABRIR SALA
    // =============================================

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
                !roomService.has(
                    code
                )
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
                    rootDir,
                    "room.html"
                )
            );

        }
    );

}


module.exports = {
    registerPageRoutes
};
