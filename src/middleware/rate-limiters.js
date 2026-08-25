const rateLimit =
    require("express-rate-limit");


function createRateLimiters() {

    // =============================================
    // RATE LIMIT GERAL DA API
    // =============================================

    const apiLimiter =
        rateLimit({

            windowMs:
                15 * 60 * 1000,

            limit:
                300,

            standardHeaders:
                "draft-8",

            legacyHeaders:
                false,

            message: {

                success:
                    false,

                message:
                    "Muitas requisições. Aguarde um pouco."

            }

        });


    // =============================================
    // CRIACAO DE SALA
    // =============================================

    const createRoomLimiter =
        rateLimit({

            windowMs:
                15 * 60 * 1000,

            limit:
                20,

            standardHeaders:
                "draft-8",

            legacyHeaders:
                false,

            message: {

                success:
                    false,

                message:
                    "Muitas salas foram criadas. Aguarde alguns minutos."

            }

        });


    return {
        apiLimiter,
        createRoomLimiter
    };

}


module.exports = {
    createRateLimiters
};
