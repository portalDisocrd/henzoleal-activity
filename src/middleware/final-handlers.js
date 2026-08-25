function registerFinalHandlers({
    app
}) {

    // =============================================
    // 404 API
    // =============================================

    app.use(
        "/api",
        (req, res) => {

            res.status(404).json({

                success:
                    false,

                message:
                    "Endpoint não encontrado."

            });

        }
    );


    // =============================================
    // ERROS EXPRESS
    // =============================================

    app.use(
        (
            error,
            req,
            res,
            next
        ) => {

            console.error(
                "Erro interno:",
                error?.message ||
                "Erro desconhecido"
            );


            if (
                res.headersSent
            ) {

                return next(
                    error
                );

            }


            res.status(500).json({

                success:
                    false,

                message:
                    "Erro interno do servidor."

            });

        }
    );

}


module.exports = {
    registerFinalHandlers
};
