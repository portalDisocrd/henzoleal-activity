const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/routes/page-routes")'
    )
) {
    console.log(
        "PAGE ROUTES JA INTEGRADO"
    );
    process.exit(0);
}


// =============================================
// IMPORT
// =============================================

const roomRoutesRequire =
    'require("./src/routes/room-routes");';

const importIndex =
    code.indexOf(
        roomRoutesRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de room-routes nao localizado"
    );
}

const insertAt =
    importIndex +
    roomRoutesRequire.length;

const pageImport = `

const {
    registerPageRoutes
} = require("./src/routes/page-routes");`;

code =
    code.slice(0, insertAt) +
    pageImport +
    code.slice(insertAt);


// =============================================
// REMOVE ROTA EXPRESS
// =============================================

function removeAppRoute(
    source,
    method,
    route
) {

    const routePosition =
        source.indexOf(
            `"${route}"`
        );

    if (routePosition === -1) {
        throw new Error(
            `Rota nao encontrada: ${route}`
        );
    }

    const marker =
        `app.${method}(`;

    const start =
        source.lastIndexOf(
            marker,
            routePosition
        );

    if (start === -1) {
        throw new Error(
            `Inicio nao encontrado: ${method} ${route}`
        );
    }

    const openParen =
        source.indexOf(
            "(",
            start
        );

    let parenDepth = 0;
    let braceDepth = 0;
    let bracketDepth = 0;

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

        if (char === "(") parenDepth++;
        if (char === ")") parenDepth--;

        if (char === "{") braceDepth++;
        if (char === "}") braceDepth--;

        if (char === "[") bracketDepth++;
        if (char === "]") bracketDepth--;

        if (
            parenDepth === 0 &&
            braceDepth === 0 &&
            bracketDepth === 0
        ) {

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
                end =
                    j + 1;
            } else {
                end =
                    i + 1;
            }

            break;
        }
    }

    if (end === -1) {
        throw new Error(
            `Final nao encontrado: ${route}`
        );
    }

    return (
        source.slice(0, start) +
        source.slice(end)
    );
}


// =============================================
// REMOVE ROTAS ANTIGAS
// =============================================

code =
    removeAppRoute(
        code,
        "get",
        "/activity"
    );

code =
    removeAppRoute(
        code,
        "get",
        "/"
    );

code =
    removeAppRoute(
        code,
        "get",
        "/room/:code"
    );


// =============================================
// REGISTRA NOVO MODULO
// =============================================

const roomRegistration =
    /registerRoomRoutes\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        roomRegistration
    );

if (!match) {
    throw new Error(
        "Registro de room-routes nao localizado"
    );
}

const registerAt =
    match.index +
    match[0].length;

const pageRegistration = `

registerPageRoutes({
    app,
    rootDir: __dirname,
    roomService,
    sanitizeRoomCode,
    isValidRoomCode
});`;

code =
    code.slice(0, registerAt) +
    pageRegistration +
    code.slice(registerAt);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "PAGE ROUTES INTEGRADO AO SERVER"
);
