function registerAuthRoutes({ app, oauthLimiter, fetchImpl = fetch, env = process.env }) {
    app.post("/api/token", oauthLimiter, async (req, res) => {
        try {
            const code = String(req.body?.code || "").trim();
            if (!code || code.length > 512 || /[\u0000-\u001f\u007f]/.test(code)) {
                return res.status(400).json({ success: false, message: "Código OAuth inválido." });
            }

            const clientId = String(env.DISCORD_CLIENT_ID || "").trim();
            const clientSecret = String(env.DISCORD_CLIENT_SECRET || "").trim();
            if (!clientId || !clientSecret) {
                return res.status(503).json({ success: false, message: "Discord OAuth não configurado." });
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 9000);
            timeout.unref?.();

            let response;
            try {
                response = await fetchImpl("https://discord.com/api/oauth2/token", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "application/json"
                    },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        grant_type: "authorization_code",
                        code
                    }),
                    signal: controller.signal
                });
            } finally {
                clearTimeout(timeout);
            }

            const data = await response.json().catch(() => ({}));
            if (!response.ok || typeof data.access_token !== "string") {
                console.warn(`[AUTH] Discord OAuth recusado (${response.status}) request=${req.requestId || "-"}`);
                return res.status(400).json({ success: false, message: "Falha na autorização Discord." });
            }

            return res.json({
                success: true,
                access_token: data.access_token,
                token_type: data.token_type || "Bearer",
                expires_in: Number(data.expires_in) || undefined
            });
        } catch (error) {
            const timedOut = error?.name === "AbortError";
            console.error(`[AUTH] ${timedOut ? "timeout" : "erro"} request=${req.requestId || "-"}`);
            return res.status(timedOut ? 504 : 500).json({
                success: false,
                message: timedOut ? "Discord demorou para responder." : "Erro interno OAuth."
            });
        }
    });
}

module.exports = { registerAuthRoutes };
