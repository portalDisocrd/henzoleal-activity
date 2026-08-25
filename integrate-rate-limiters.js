const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/middleware/rate-limiters")'
    )
) {
    console.log(
        "RATE LIMITERS JA INTEGRADO"
    );
    process.exit(0);
}


// =============================================
// IMPORT
// =============================================

const authRoutesRequire =
    'require("./src/routes/auth-routes");';

const importIndex =
    code.indexOf(
        authRoutesRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de auth-routes nao localizado"
    );
}

const insertAt =
    importIndex +
    authRoutesRequire.length;

const limiterImport = `

const {
    createRateLimiters
} = require("./src/middleware/rate-limiters");`;

code =
    code.slice(0, insertAt) +
    limiterImport +
    code.slice(insertAt);


// =============================================
// REMOVE const apiLimiter = rateLimit(...)
// =============================================

function removeConstCall(
    source,
    constName
) {

    const marker =
        `const ${constName}`;

    const start =
        source.indexOf(
            marker
        );

    if (start === -1) {
        throw new Error(
            `Const nao encontrada: ${constName}`
        );
    }

    const callStart =
        source.indexOf(
            "rateLimit(",
            start
        );

    if (callStart === -1) {
        throw new Error(
            `rateLimit nao localizado: ${constName}`
        );
    }

    const openParen =
        source.indexOf(
            "(",
            callStart
        );

    let depth = 0;
    let quote = null;
    let escaped = false;
    let end = -1;

    for (
        let i = openParen;
        i < source.length;
        i++
    ) {

        const char =
            source[i];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (quote) {

            if (char === quote) {
                quote = null;
            }

            continue;
        }

        if (
            char === '"' ||
            char === "'" ||
            char === "`"
        ) {
            quote = char;
            continue;
        }

        if (char === "(") {
            depth++;
        }

        if (char === ")") {

            depth--;

            if (depth === 0) {

                let j =
                    i + 1;

                while (
                    /\s/.test(
                        source[j] || ""
                    )
                ) {
                    j++;
                }

                if (source[j] === ";") {
                    end = j + 1;
                } else {
                    end = i + 1;
                }

                break;
            }
        }
    }

    if (end === -1) {
        throw new Error(
            `Final nao localizado: ${constName}`
        );
    }

    return (
        source.slice(0, start) +
        source.slice(end)
    );
}


code =
    removeConstCall(
        code,
        "apiLimiter"
    );

code =
    removeConstCall(
        code,
        "createRoomLimiter"
    );


// =============================================
// CRIA LIMITERS NOVOS
// =============================================

const roomServiceMarker =
    /const roomService\s*=\s*createRoomService\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        roomServiceMarker
    );

if (!match) {
    throw new Error(
        "Criacao do roomService nao localizada"
    );
}

const createAt =
    match.index +
    match[0].length;

const limiterCreation = `

const {
    apiLimiter,
    createRoomLimiter
} = createRateLimiters();`;

code =
    code.slice(0, createAt) +
    limiterCreation +
    code.slice(createAt);


// remove require antigo se nao for mais usado
code =
    code.replace(
        'const rateLimit = require("express-rate-limit");\r\n',
        ""
    );

code =
    code.replace(
        'const rateLimit = require("express-rate-limit");\n',
        ""
    );


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "RATE LIMITERS INTEGRADO AO SERVER"
);
