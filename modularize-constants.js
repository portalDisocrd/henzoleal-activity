const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (code.includes('require("./src/config/constants")')) {
    console.log("CONSTANTES JA FORAM MODULARIZADAS");
    process.exit(0);
}

const startPattern =
    /const PORT\s*=\s*process\.env\.PORT\s*\|\|\s*3000\s*;/m;

const endPattern =
    /const ALLOWED_AVATARS\s*=\s*new Set\(\[[\s\S]*?\]\);/m;

const startMatch = code.match(startPattern);
const endMatch = code.match(endPattern);

if (!startMatch || !endMatch) {
    console.error("ERRO: BLOCO DE CONSTANTES NAO LOCALIZADO");
    process.exit(1);
}

const start = startMatch.index;
const end =
    endMatch.index +
    endMatch[0].length;

const replacement = `const {
    PORT,
    HOST,
    MAX_ROOMS,
    MAX_USERS_PER_ROOM,
    EMPTY_ROOM_TTL,
    MAX_SOCKET_PAYLOAD,
    ALLOWED_AVATARS
} = require("./src/config/constants");`;

code =
    code.slice(0, start) +
    replacement +
    code.slice(end);

fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log("CONFIGURACOES MODULARIZADAS");
