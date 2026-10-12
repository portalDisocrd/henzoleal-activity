const crypto = require("crypto");

function registerRequestContext(app) {
    app.use((req, res, next) => {
        const provided = String(req.get("x-request-id") || "").trim();
        const requestId = /^[A-Za-z0-9._:-]{8,80}$/.test(provided) ? provided : crypto.randomUUID();
        req.requestId = requestId;
        res.setHeader("X-Request-Id", requestId);
        if (req.path.startsWith("/api/")) {
            res.setHeader("Cache-Control", "no-store, max-age=0");
            res.setHeader("Pragma", "no-cache");
        }
        next();
    });
}

module.exports = { registerRequestContext };
