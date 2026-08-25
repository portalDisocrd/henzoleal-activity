const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/socket/webrtc-signaling")'
    )
) {
    console.log(
        "WEBRTC SIGNALING JA INTEGRADO"
    );
    process.exit(0);
}


// =============================================
// IMPORT
// =============================================

const streamRequire =
    'require("./src/socket/stream-events");';

const importIndex =
    code.indexOf(
        streamRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de stream-events nao localizado"
    );
}

const insertAt =
    importIndex +
    streamRequire.length;

const webrtcImport = `

const {
    registerWebRTCSignaling
} = require("./src/socket/webrtc-signaling");`;

code =
    code.slice(0, insertAt) +
    webrtcImport +
    code.slice(insertAt);


// =============================================
// REMOVE SOCKET.ON POR EVENTO
// =============================================

function removeSocketEvent(
    source,
    eventName
) {

    const eventPosition =
        source.indexOf(
            `"${eventName}"`
        );

    if (eventPosition === -1) {
        throw new Error(
            `Evento nao encontrado: ${eventName}`
        );
    }

    const start =
        source.lastIndexOf(
            "socket.on(",
            eventPosition
        );

    if (start === -1) {
        throw new Error(
            `Inicio nao encontrado: ${eventName}`
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
            `Final nao encontrado: ${eventName}`
        );
    }

    return (
        source.slice(0, start) +
        source.slice(end)
    );
}


// Remove handlers antigos
code =
    removeSocketEvent(
        code,
        "offer"
    );

code =
    removeSocketEvent(
        code,
        "answer"
    );

code =
    removeSocketEvent(
        code,
        "ice-candidate"
    );


// =============================================
// REGISTRA NOVO MODULO
// =============================================

const streamRegistration =
    /registerStreamEvents\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        streamRegistration
    );

if (!match) {
    throw new Error(
        "Registro de stream-events nao localizado"
    );
}

const registerAt =
    match.index +
    match[0].length;

const webrtcRegistration = `

        registerWebRTCSignaling({
            socket,
            allowSocketEvent,
            isPlainObject,
            normalizeText,
            getSafeTargetSocket,
            isValidFlowId,
            isValidDescription,
            isValidCandidate
        });`;

code =
    code.slice(0, registerAt) +
    webrtcRegistration +
    code.slice(registerAt);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "WEBRTC SIGNALING INTEGRADO AO SERVER"
);
