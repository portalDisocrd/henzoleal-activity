const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/socket/participants")'
    )
) {
    console.log(
        "PARTICIPANTS JA INTEGRADO"
    );
    process.exit(0);
}


function removeFunction(
    source,
    functionName
) {

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
        source.indexOf(
            "{",
            start
        );

    if (brace === -1) {
        throw new Error(
            `Abertura nao encontrada: ${functionName}`
        );
    }

    let depth = 0;
    let end = -1;

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

    if (end === -1) {
        throw new Error(
            `Final nao encontrado: ${functionName}`
        );
    }

    return (
        source.slice(0, start) +
        source.slice(end)
    );

}


// Remove função antiga
code =
    removeFunction(
        code,
        "updateParticipants"
    );


// Adiciona import
const roomServiceRequire =
    'require("./src/services/room-service");';

const importPosition =
    code.indexOf(
        roomServiceRequire
    );

if (importPosition === -1) {
    throw new Error(
        "Import do room-service nao localizado"
    );
}

const insertAt =
    importPosition +
    roomServiceRequire.length;

const participantsImport = `

const {
    createParticipantManager
} = require("./src/socket/participants");`;

code =
    code.slice(0, insertAt) +
    participantsImport +
    code.slice(insertAt);


// Precisamos criar o manager DEPOIS de io e roomService existirem.
// Vamos inserir imediatamente depois da criação do roomService.

const serviceMarker =
    /const roomService\s*=\s*createRoomService\(\{[\s\S]*?\}\);/m;

const serviceMatch =
    code.match(
        serviceMarker
    );

if (!serviceMatch) {
    throw new Error(
        "Criacao do roomService nao localizada"
    );
}

const serviceEnd =
    serviceMatch.index +
    serviceMatch[0].length;

const managerCreation = `

const {
    updateParticipants
} = createParticipantManager({
    io,
    roomService
});`;

code =
    code.slice(0, serviceEnd) +
    managerCreation +
    code.slice(serviceEnd);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "PARTICIPANTS INTEGRADO AO SERVER"
);
