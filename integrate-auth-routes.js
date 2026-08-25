const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/routes/auth-routes")'
    )
) {
    console.log(
        "AUTH ROUTES JA INTEGRADO"
    );
    process.exit(0);
}


// =============================================
// IMPORT
// =============================================

const pageRoutesRequire =
    'require("./src/routes/page-routes");';

const importIndex =
    code.indexOf(
        pageRoutesRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de page-routes nao localizado"
    );
}

const insertAt =
    importIndex +
    pageRoutesRequire.length;

const authImport = `

const {
    registerAuthRoutes
} = require("./src/routes/auth-routes");`;

code =
    code.slice(0, insertAt) +
    authImport +
    code.slice(insertAt);


// =============================================
// REMOVE /api/token ANTIGO
// =============================================

const routePosition =
    code.indexOf(
        '"/api/token"'
    );

if (routePosition === -1) {
    throw new Error(
        "Rota /api/token nao localizada"
    );
}

const start =
    code.lastIndexOf(
        "app.post(",
        routePosition
    );

if (start === -1) {
    throw new Error(
        "Inicio de /api/token nao localizado"
    );
}

const openParen =
    code.indexOf(
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
    i < code.length;
    i++
) {

    const char =
        code[i];

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
                code[j] || ""
            )
        ) {
            j++;
        }

        if (code[j] === ";") {
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
        "Final de /api/token nao localizado"
    );
}

code =
    code.slice(0, start) +
    code.slice(end);


// =============================================
// REGISTRA NOVO MODULO
// =============================================

const pageRegistration =
    /registerPageRoutes\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        pageRegistration
    );

if (!match) {
    throw new Error(
        "Registro de page-routes nao localizado"
    );
}

const registerAt =
    match.index +
    match[0].length;

const authRegistration = `

registerAuthRoutes({
    app
});`;

code =
    code.slice(0, registerAt) +
    authRegistration +
    code.slice(registerAt);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "AUTH ROUTES INTEGRADO AO SERVER"
);
