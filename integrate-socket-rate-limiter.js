const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/socket/rate-limiter")'
    )
) {
    console.log(
        "SOCKET RATE LIMITER JA INTEGRADO"
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


// remove funcao antiga
code =
    removeFunction(
        code,
        "allowSocketEvent"
    );


// adiciona import
const guardRequire =
    'require("./src/socket/socket-guard");';

const importIndex =
    code.indexOf(
        guardRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de socket-guard nao localizado"
    );
}

const insertAt =
    importIndex +
    guardRequire.length;

const limiterImport = `

const {
    createSocketRateLimiter
} = require("./src/socket/rate-limiter");`;

code =
    code.slice(0, insertAt) +
    limiterImport +
    code.slice(insertAt);


// cria limiter depois do socket guard
const guardMarker =
    /const\s*\{\s*getSafeTargetSocket\s*\}\s*=\s*createSocketGuard\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        guardMarker
    );

if (!match) {
    throw new Error(
        "Criacao do socket guard nao localizada"
    );
}

const guardEnd =
    match.index +
    match[0].length;

const limiterCreation = `

const {
    allowSocketEvent
} = createSocketRateLimiter({
    maxEvents: 250,
    windowMs: 10000
});`;

code =
    code.slice(0, guardEnd) +
    limiterCreation +
    code.slice(guardEnd);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "SOCKET RATE LIMITER INTEGRADO"
);
