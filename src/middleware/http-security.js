const helmet =
    require("helmet");


function registerHttpSecurity({
    app,
    express
}) {

    // Esconder informacao de tecnologia
    app.disable(
        "x-powered-by"
    );


    // =============================================
    // HEADERS DE SEGURANCA
    // =============================================

    app.use(
        helmet({

            crossOriginEmbedderPolicy:
                false,

            // A Activity roda dentro de um iframe do Discord.
            // A CSP abaixo controla quais sites podem incorporar.
            xFrameOptions:
                false,

            contentSecurityPolicy: {

                directives: {

                    defaultSrc: [
                        "'self'"
                    ],

                    scriptSrc: [
                        "'self'",
                        "'unsafe-inline'"
                    ],

                    styleSrc: [
                        "'self'",
                        "'unsafe-inline'"
                    ],

                    imgSrc: [
                        "'self'",
                        "data:",
                        "https:"
                    ],

                    connectSrc: [
                        "'self'",
                        "ws:",
                        "wss:"
                    ],

                    mediaSrc: [
                        "'self'",
                        "blob:"
                    ],

                    fontSrc: [
                        "'self'",
                        "data:"
                    ],

                    objectSrc: [
                        "'none'"
                    ],

                    baseUri: [
                        "'self'"
                    ],

                    frameAncestors: [
                        "'self'",
                        "https://discord.com",
                        "https://*.discord.com"
                    ]

                }

            }

        })
    );


    // =============================================
    // JSON
    // =============================================

    app.use(
        express.json({
            limit:
                "16kb"
        })
    );

}


module.exports = {
    registerHttpSecurity
};

