const helmet = require("helmet");

function registerHttpSecurity({ app, express }) {
    app.disable("x-powered-by");

    app.use(helmet({
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        crossOriginResourcePolicy: { policy: "same-origin" },
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
        xFrameOptions: false,
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                scriptSrcAttr: ["'none'"],
                styleSrc: ["'self'"],
                // A UI usa style.* para posições/volumes/reações; blocos <style> foram removidos.
                styleSrcAttr: ["'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https://cdn.discordapp.com", "https://media.discordapp.net", "https://*.discordapp.com", "https://*.discordapp.net"],
                connectSrc: ["'self'", "ws:", "wss:", "https://discord.com", "https://*.discord.com"],
                mediaSrc: ["'self'", "blob:"],
                fontSrc: ["'self'", "data:"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                workerSrc: ["'self'", "blob:"],
                frameAncestors: ["'self'", "https://discord.com", "https://*.discord.com"],
                upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null
            }
        }
    }));

    app.use((req, res, next) => {
        res.setHeader(
            "Permissions-Policy",
            "camera=(), microphone=(self), display-capture=(self), fullscreen=(self), autoplay=(self), clipboard-write=(self), screen-wake-lock=(self), picture-in-picture=(self), geolocation=()"
        );
        res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
        next();
    });

    app.use(express.json({ limit: "20kb", strict: true, type: "application/json" }));
}

module.exports = { registerHttpSecurity };
