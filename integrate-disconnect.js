const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/socket/disconnect")'
    )
) {
    console.log(
        "DISCONNECT JA INTEGRADO"
    );
    process.exit(0);
}


// =============================================
// IMPORT
// =============================================

const webrtcRequire =
    'require("./src/socket/webrtc-signaling");';

const importIndex =
    code.indexOf(
        webrtcRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de webrtc-signaling nao localizado"
    );
}

const insertAt =
    importIndex +
    webrtcRequire.length;

const disconnectImport = `

const {
    registerDisconnect
} = require("./src/socket/disconnect");`;

code =
    code.slice(0, insertAt) +
    disconnectImport +
    code.slice(insertAt);


// =============================================
// LOCALIZAR DISCONNECT ANTIGO
// =============================================

const eventPosition =
    code.indexOf(
        '"disconnect"'
    );

if (eventPosition === -1) {
    throw new Error(
        "Evento disconnect nao localizado"
    );
}

const start =
    code.lastIndexOf(
        "socket.on(",
        eventPosition
    );

if (start === -1) {
    throw new Error(
        "Inicio do disconnect nao localizado"
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
            end = j + 1;
        } else {
            end = i + 1;
        }

        break;
    }
}

if (end === -1) {
    throw new Error(
        "Final do disconnect nao localizado"
    );
}


// Remove handler antigo
code =
    code.slice(0, start) +
    code.slice(end);


// =============================================
// REGISTRA NOVO MODULO
// =============================================

const webrtcRegistration =
    /registerWebRTCSignaling\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        webrtcRegistration
    );

if (!match) {
    throw new Error(
        "Registro WebRTC nao localizado"
    );
}

const registerAt =
    match.index +
    match[0].length;

const disconnectRegistration = `

        registerDisconnect({
            socket,
            roomService,
            updateParticipants
        });`;

code =
    code.slice(0, registerAt) +
    disconnectRegistration +
    code.slice(registerAt);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "DISCONNECT INTEGRADO AO SERVER"
);
