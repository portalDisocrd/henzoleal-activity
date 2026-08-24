const fs = require("fs");

const path = "C:\\lealbot\\server.js";
let code = fs.readFileSync(path, "utf8");

if (code.includes('"/api/token"')) {
    console.log("A rota /api/token ja existe.");
    process.exit(0);
}

const marker = /app\.post\(\s*["']\/api\/rooms["']/m;
const match = code.match(marker);

if (!match) {
    console.error("Nao encontrei a rota /api/rooms.");
    process.exit(1);
}

const route = `
// =====================================================
// DISCORD OAUTH - TOKEN
// =====================================================

app.post(
    "/api/token",
    async (req, res) => {

        try {

            const code =
                String(
                    req.body?.code || ""
                ).trim();

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: "Codigo OAuth ausente."
                });
            }

            const clientId =
                process.env.DISCORD_CLIENT_ID;

            const clientSecret =
                process.env.DISCORD_CLIENT_SECRET;

            if (!clientId || !clientSecret) {
                return res.status(500).json({
                    success: false,
                    message: "Discord OAuth nao configurado."
                });
            }

            const response =
                await fetch(
                    "https://discord.com/api/oauth2/token",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded"
                        },

                        body:
                            new URLSearchParams({
                                client_id: clientId,
                                client_secret: clientSecret,
                                grant_type: "authorization_code",
                                code
                            })
                    }
                );

            const data =
                await response.json();

            if (!response.ok || !data.access_token) {

                console.error(
                    "Discord OAuth falhou:",
                    data
                );

                return res.status(400).json({
                    success: false,
                    message: "Falha na autorizacao Discord."
                });
            }

            return res.json({
                success: true,
                access_token: data.access_token
            });

        } catch (error) {

            console.error(
                "Erro OAuth Discord:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Erro interno OAuth."
            });
        }
    }
);


`;

code =
    code.slice(0, match.index) +
    route +
    code.slice(match.index);

fs.writeFileSync(path, code, "utf8");

console.log("ROTA /api/token ADICIONADA COM SUCESSO");
