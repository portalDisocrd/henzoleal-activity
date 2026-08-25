const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/utils/room-utils")'
    )
) {
    console.log(
        "ROOM UTILS JA FORAM MODULARIZADOS"
    );
    process.exit(0);
}

function removeFunction(source, functionName) {

    const marker =
        `function ${functionName}`;

    const start =
        source.indexOf(marker);

    if (start === -1) {
        throw new Error(
            `Funcao nao encontrada: ${functionName}`
        );
    }

    const brace =
        source.indexOf("{", start);

    if (brace === -1) {
        throw new Error(
            `Abertura nao encontrada: ${functionName}`
        );
    }

    let depth = 0;
    let end = brace;

    for (
        let i = brace;
        i < source.length;
        i++
    ) {

        if (source[i] === "{") {
            depth++;
        }

        if (source[i] === "}") {
            depth--;

            if (depth === 0) {
                end = i + 1;
                break;
            }
        }
    }

    return (
        source.slice(0, start) +
        source.slice(end)
    );
}

code = removeFunction(
    code,
    "generateRoomCode"
);

code = removeFunction(
    code,
    "getParticipants"
);

const validationRequire =
    'require("./src/utils/validation");';

const insertAt =
    code.indexOf(validationRequire);

if (insertAt === -1) {
    throw new Error(
        "Import de validation nao localizado"
    );
}

const position =
    insertAt +
    validationRequire.length;

const roomUtilsImport = `

const {
    generateRoomCode,
    getParticipants
} = require("./src/utils/room-utils");`;

code =
    code.slice(0, position) +
    roomUtilsImport +
    code.slice(position);

code =
    code.replace(
        /generateRoomCode\(\s*\)/g,
        "generateRoomCode(rooms)"
    );

fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "ROOM UTILS MODULARIZADOS"
);
