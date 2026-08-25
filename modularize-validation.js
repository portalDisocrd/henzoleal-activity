const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/utils/validation")'
    )
) {
    console.log(
        "VALIDACOES JA FORAM MODULARIZADAS"
    );
    process.exit(0);
}

const functionsToRemove = [
    "isPlainObject",
    "normalizeText",
    "isValidRoomCode",
    "sanitizeRoomCode",
    "sanitizeProfile",
    "isValidDescription",
    "isValidCandidate",
    "isValidFlowId"
];

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

    let brace =
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

for (const name of functionsToRemove) {
    code = removeFunction(
        code,
        name
    );
}

const importMarker =
    'const {\n    PORT,\n    HOST,';

const importIndex =
    code.indexOf(importMarker);

if (importIndex === -1) {
    throw new Error(
        "Import das configuracoes nao localizado"
    );
}

const requireEnd =
    code.indexOf(
        'require("./src/config/constants");',
        importIndex
    );

if (requireEnd === -1) {
    throw new Error(
        "Require das configuracoes nao localizado"
    );
}

const insertAt =
    requireEnd +
    'require("./src/config/constants");'.length;

const validationImport = `

const {
    isPlainObject,
    normalizeText,
    isValidRoomCode,
    sanitizeRoomCode,
    sanitizeProfile,
    isValidDescription,
    isValidCandidate,
    isValidFlowId
} = require("./src/utils/validation");`;

code =
    code.slice(0, insertAt) +
    validationImport +
    code.slice(insertAt);

fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "VALIDACOES MODULARIZADAS"
);
