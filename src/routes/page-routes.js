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
    // ACTIVITY ROOM (Discord Activity)
    // =============================================

    app.get(
        "/activity-room.html",
        (req, res) => {
            const code = sanitizeRoomCode(req.query.room);
            if (!isValidRoomCode(code) || !roomService.has(code)) {
                return res.status(404).send("Sala nao encontrada.");
            }
            res.sendFile(path.join(rootDir, "activity-room.html"));
        }
    );

    app.get("/activity.html", (req, res) => res.redirect("/activity"));

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
                    .sendFile(path.join(rootDir, "not-found.html"));

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
