const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/services/room-service")'
    )
) {
    console.log(
        "ROOM SERVICE JA INTEGRADO"
    );
    process.exit(0);
}

const roomUtilsRequire =
    'require("./src/utils/room-utils");';

const requireIndex =
    code.indexOf(
        roomUtilsRequire
    );

if (requireIndex === -1) {
    throw new Error(
        "Import de room-utils nao localizado"
    );
}

const insertAt =
    requireIndex +
    roomUtilsRequire.length;

const serviceImport = `

const {
    createRoomService
} = require("./src/services/room-service");`;

code =
    code.slice(0, insertAt) +
    serviceImport +
    code.slice(insertAt);


// Remove o Map global antigo
code =
    code.replace(
        /const rooms\s*=\s*new Map\(\s*\);/m,
        `const roomService =
    createRoomService({
        maxRooms:
            MAX_ROOMS,

        emptyRoomTtl:
            EMPTY_ROOM_TTL
    });`
    );


// Criar sala
code =
    code.replace(
        /if\s*\(\s*rooms\.size\s*>=\s*MAX_ROOMS\s*\)\s*\{[\s\S]*?const code\s*=\s*generateRoomCode\(rooms\);\s*rooms\.set\([\s\S]*?\);\s*console\.log\(\s*"Sala criada:",\s*code\s*\);/m,
        `const created =
            roomService.create();

        if (!created.success) {

            return res
                .status(503)
                .json({
                    success: false,
                    message:
                        "Limite temporario de salas atingido."
                });

        }

        const code =
            created.code;

        console.log(
            "Sala criada:",
            code
        );`
    );


// Consultas simples
code =
    code.replace(
        /rooms\.get\(/g,
        "roomService.get("
    );

code =
    code.replace(
        /rooms\.has\(/g,
        "roomService.has("
    );

fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "ROOM SERVICE INTEGRADO NAS ROTAS"
);
