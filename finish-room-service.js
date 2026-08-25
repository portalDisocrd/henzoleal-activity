const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");


// =====================================================
// LIMPEZA AUTOMATICA
// =====================================================

const cleanupPattern =
/setInterval\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*5\s*\*\s*60\s*\*\s*1000\s*\)\.unref\(\);/m;

if (!cleanupPattern.test(code)) {
    throw new Error(
        "Bloco de limpeza automatica nao localizado"
    );
}

const cleanupReplacement = `setInterval(
    () => {

        const removed =
            roomService.cleanupExpired();

        removed.forEach(
            code => {

                console.log(
                    \`Sala expirada: \${code}\`
                );

            }
        );

    },

    5 * 60 * 1000
).unref();`;

code =
    code.replace(
        cleanupPattern,
        cleanupReplacement
    );


// =====================================================
// ULTIMO USUARIO SAIU
// =====================================================

code =
    code.replace(
        /if\s*\(\s*room\.users\.size\s*===\s*0\s*\)\s*\{\s*rooms\.delete\(\s*roomCode\s*\);[\s\S]*?return;\s*\}/m,
        `if (
                    roomService.removeIfEmpty(
                        roomCode
                    )
                ) {

                    console.log(
                        \`Sala \${roomCode} encerrada\`
                    );

                    return;

                }`
    );


// Qualquer delete restante do Map antigo
code =
    code.replace(
        /rooms\.delete\(/g,
        "roomService.remove("
    );

fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "ROOM SERVICE FINALIZADO"
);
