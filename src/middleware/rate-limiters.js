const rateLimit = require("express-rate-limit");

function json429(message) {
    return { success: false, message };
}

function createRateLimiters() {
    const shared = {
        standardHeaders: "draft-8",
        legacyHeaders: false,
        ipv6Subnet: 56
    };

    const apiLimiter = rateLimit({
        ...shared,
        windowMs: 15 * 60 * 1000,
        limit: 360,
        message: json429("Muitas requisições. Aguarde um pouco.")
    });

    const createRoomLimiter = rateLimit({
        ...shared,
        windowMs: 15 * 60 * 1000,
        limit: 15,
        message: json429("Muitas salas foram criadas deste endereço. Aguarde alguns minutos.")
    });

    const oauthLimiter = rateLimit({
        ...shared,
        windowMs: 10 * 60 * 1000,
        limit: 30,
        message: json429("Muitas tentativas de autenticação. Aguarde alguns minutos.")
    });

    const soundUploadLimiter = rateLimit({
        ...shared,
        windowMs: 5 * 60 * 1000,
        limit: 24,
        message: json429("Muitos uploads de som. Aguarde alguns minutos.")
    });

    return { apiLimiter, createRoomLimiter, oauthLimiter, soundUploadLimiter };
}

module.exports = { createRateLimiters };
