const { sanitizeLogValue } = require("../security/security-utils");

function registerFinalHandlers({ app }) {
    app.use("/api", (req, res) => {
        res.status(404).json({ success: false, message: "Endpoint não encontrado.", requestId: req.requestId });
    });

    app.use((error, req, res, next) => {
        if (res.headersSent) return next(error);

        const requestId = req.requestId || "-";
        const path = sanitizeLogValue(req.originalUrl || req.url || "", 180);
        const method = sanitizeLogValue(req.method || "", 12);
        const message = sanitizeLogValue(error?.message || "Erro desconhecido", 180);
        console.error(`[HTTP] ${method} ${path} request=${requestId} erro=${message}`);

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
