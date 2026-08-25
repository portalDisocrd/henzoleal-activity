const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/socket/socket-guard")'
    )
) {
    console.log(
        "SOCKET GUARD JA INTEGRADO"
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


// Remove funcao antiga
code =
    removeFunction(
        code,
        "getSafeTargetSocket"
    );


// Adiciona import
const participantsRequire =
    'require("./src/socket/participants");';

const importIndex =
    code.indexOf(
        participantsRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de participants nao localizado"
    );
}

const insertAt =
    importIndex +
    participantsRequire.length;

const guardImport = `

const {
    createSocketGuard
} = require("./src/socket/socket-guard");`;

code =
    code.slice(0, insertAt) +
    guardImport +
    code.slice(insertAt);


// Cria guard depois que IO existe.
// Usamos o ponto onde participant manager ja e criado.

const participantMarker =
    /const\s*\{\s*updateParticipants\s*\}\s*=\s*createParticipantManager\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        participantMarker
    );

if (!match) {
    throw new Error(
        "Criacao do participant manager nao localizada"
    );
}

const managerEnd =
    match.index +
    match[0].length;

const guardCreation = `

const {
    getSafeTargetSocket
} = createSocketGuard({
    io
});`;

code =
    code.slice(0, managerEnd) +
    guardCreation +
    code.slice(managerEnd);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "SOCKET GUARD INTEGRADO"
);
