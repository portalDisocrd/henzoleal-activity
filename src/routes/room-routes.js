function registerRoomRoutes({
    app,
    roomService,
    createRoomLimiter,
    sanitizeRoomCode,
    isValidRoomCode
}) {

    // =============================================
    // CRIAR SALA
    // =============================================

    app.post(
        "/api/rooms",

        createRoomLimiter,

        (req, res) => {

            const created =
                roomService.create();


            if (!created.success) {

                return res
                    .status(503)
                    .json({
                        success: false,
                        message:
                            "Limite temporario de salas atingido."
                    });

            }


            const code =
                created.code;


            console.log(
                "Sala criada:",
                code
            );


            res.status(201).json({
                success: true,
                code
            });

        }
    );


    // =============================================
    // VERIFICAR SALA
    // =============================================

    app.get(
        "/api/rooms/:code",

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
                    .json({
                        success: false,
                        message:
                            "Código de sala inválido."
                    });

            }


            const room =
                roomService.get(
                    code
                );


            if (!room) {

                return res
                    .status(404)
                    .json({
                        success: false,
                        message:
                            "Sala não encontrada."
                    });

            }


            res.json({
                success: true,
                code,
                users:
                    room.users.size
            });

        }
    );

}


module.exports = {
    registerRoomRoutes
};
