const { sanitizeLogValue } = require("../security/security-utils");
const { log } = require("../utils/logger");

function registerFinalHandlers({ app }) {
    app.use("/api", (req, res) => {
        res.status(404).json({ success: false, message: "Endpoint não encontrado.", requestId: req.requestId });
    });

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);

        const requestId = req.requestId || "-";
        // Nunca registrar query string: URLs de áudio customizado carregam token
        // efêmero em ?t=. req.path mantém somente o pathname.
        const safePath = sanitizeLogValue(req.path || String(req.originalUrl || req.url || "").split("?")[0], 180);
        const method = sanitizeLogValue(req.method || "", 12);
        const message = sanitizeLogValue(error?.message || "Erro desconhecido", 180);
        log("error", "http.error", { requestId, method, path: safePath, message, errorName: error?.name || "Error" });

        if (error?.type === "entity.too.large" || error?.status === 413) {
            return res.status(413).json({ success: false, message: "Conteúdo enviado é grande demais.", requestId });
        }
        if (error instanceof SyntaxError && error?.status === 400 && "body" in error) {
            return res.status(400).json({ success: false, message: "JSON inválido.", requestId });
        }

        return res.status(500).json({ success: false, message: "Erro interno do servidor.", requestId });
    });
}

module.exports = { registerFinalHandlers };
