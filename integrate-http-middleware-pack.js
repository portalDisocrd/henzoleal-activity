const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/middleware/http-security")'
    )
) {
    console.log("PACOTE HTTP JA INTEGRADO");
    process.exit(0);
}


function removeCallContaining(
    source,
    searchText,
    allowedStarts = [
        "app.use(",
        "app.disable("
    ]
) {

    const inside =
        source.indexOf(searchText);

    if (inside === -1) {
        throw new Error(
            `Marcador nao encontrado: ${searchText}`
        );
    }


    let start = -1;

    for (const marker of allowedStarts) {

        const candidate =
            source.lastIndexOf(
                marker,
                inside
            );

        if (candidate > start) {
            start = candidate;
        }
    }


    if (start === -1) {
        throw new Error(
            `Inicio nao encontrado: ${searchText}`
        );
    }


    const openParen =
        source.indexOf(
            "(",
            start
        );


    let parentheses = 0;
    let braces = 0;
    let brackets = 0;

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

        const charCode =
            char.charCodeAt(0);


        // barra invertida
        if (escaped) {
            escaped = false;
            continue;
        }

        if (charCode === 92) {
            escaped = true;
            continue;
        }


        if (quote !== null) {

            if (char === quote) {
                quote = null;
            }

            continue;
        }


        // aspas simples, duplas ou template literal
        if (
            charCode === 34 ||
            charCode === 39 ||
            charCode === 96
        ) {
            quote = char;
            continue;
        }


        if (charCode === 40) parentheses++;
        if (charCode === 41) parentheses--;

        if (charCode === 123) braces++;
        if (charCode === 125) braces--;

        if (charCode === 91) brackets++;
        if (charCode === 93) brackets--;


        if (
            parentheses === 0 &&
            braces === 0 &&
            brackets === 0
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
                end = j + 1;
            } else {
                end = i + 1;
            }

            break;
        }
    }


    if (end === -1) {
        throw new Error(
            `Final nao encontrado: ${searchText}`
        );
    }


    return (
        source.slice(0, start) +
        source.slice(end)
    );
}


// =====================================================
// IMPORTS
// =====================================================

const limiterImport =
    'require("./src/middleware/rate-limiters");';

const importPosition =
    code.indexOf(limiterImport);

if (importPosition === -1) {
    throw new Error(
        "Import de rate-limiters nao localizado"
    );
}

const insertAt =
    importPosition +
    limiterImport.length;


const newImports = `

const {
    registerHttpSecurity
} = require("./src/middleware/http-security");

const {
    registerStaticFiles
} = require("./src/middleware/static-files");

const {
    registerFinalHandlers
} = require("./src/middleware/final-handlers");`;


code =
    code.slice(0, insertAt) +
    newImports +
    code.slice(insertAt);


// =====================================================
// REMOVE IMPLEMENTACOES ANTIGAS
// =====================================================

code =
    removeCallContaining(
        code,
        '"x-powered-by"'
    );

code =
    removeCallContaining(
        code,
        "helmet({",
        ["app.use("]
    );

code =
    removeCallContaining(
        code,
        "express.json({",
        ["app.use("]
    );


// Static raiz
const staticPositions = [];

let searchPosition = 0;

while (true) {

    const position =
        code.indexOf(
            "express.static(",
            searchPosition
        );

    if (position === -1) {
        break;
    }

    staticPositions.push(position);

    searchPosition =
        position + 1;
}


let rootStaticFound =
    false;

for (
    const position
    of staticPositions
) {

    const nearby =
        code.slice(
            position,
            position + 300
        );


    if (
        nearby.includes("__dirname") &&
        !nearby.includes('"dist"')
    ) {

        const marker =
            code.slice(
                position,
                position + 30
            );

        code =
            removeCallContaining(
                code,
                marker,
                ["app.use("]
            );

        rootStaticFound =
            true;

        break;
    }
}


if (!rootStaticFound) {
    throw new Error(
        "Static raiz nao localizado"
    );
}


// Assets da Activity
code =
    removeCallContaining(
        code,
        '"/assets"',
        ["app.use("]
    );


// 404 API
code =
    removeCallContaining(
        code,
        '"Endpoint não encontrado."',
        ["app.use("]
    );


// Handler de erros
code =
    removeCallContaining(
        code,
        '"Erro interno:"',
        ["app.use("]
    );


// Helmet agora pertence ao modulo
code =
    code.replace(
        /const\s+helmet\s*=\s*require\("helmet"\);\s*/m,
        ""
    );


// =====================================================
// HTTP SECURITY
// =====================================================

const limitsPosition =
    code.indexOf(
        "// LIMITES HTTP"
    );

if (limitsPosition === -1) {
    throw new Error(
        "Secao LIMITES HTTP nao localizada"
    );
}


const securityRegistration = `registerHttpSecurity({
    app,
    express
});


`;


code =
    code.slice(0, limitsPosition) +
    securityRegistration +
    code.slice(limitsPosition);


// =====================================================
// STATIC FILES
// =====================================================

const roomRoutesPosition =
    code.indexOf(
        "registerRoomRoutes({"
    );

if (roomRoutesPosition === -1) {
    throw new Error(
        "Registro de room-routes nao localizado"
    );
}


const staticRegistration = `registerStaticFiles({
    app,
    express,
    rootDir: __dirname
});


`;


code =
    code.slice(0, roomRoutesPosition) +
    staticRegistration +
    code.slice(roomRoutesPosition);


// =====================================================
// FINAL HANDLERS
// =====================================================

const serverPosition =
    code.indexOf(
        "// SERVIDOR"
    );

if (serverPosition === -1) {
    throw new Error(
        "Secao SERVIDOR nao localizada"
    );
}


const handlersRegistration = `registerFinalHandlers({
    app
});


`;


code =
    code.slice(0, serverPosition) +
    handlersRegistration +
    code.slice(serverPosition);


// =====================================================
// SALVAR
// =====================================================

fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "PACOTE HTTP INTEGRADO"
);
