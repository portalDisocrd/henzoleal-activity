const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/socket/stream-events")'
    )
) {
    console.log(
        "STREAM EVENTS JA INTEGRADO"
    );
    process.exit(0);
}


// =============================================
// IMPORT
// =============================================

const joinRequire =
    'require("./src/socket/join-room");';

const importIndex =
    code.indexOf(
        joinRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import de join-room nao localizado"
    );
}

const insertAt =
    importIndex +
    joinRequire.length;

const streamImport = `

const {
    registerStreamEvents
} = require("./src/socket/stream-events");`;

code =
    code.slice(0, insertAt) +
    streamImport +
    code.slice(insertAt);


// =============================================
// REMOVE UM SOCKET.ON PELO NOME DO EVENTO
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

        if (
            char === "\\"
        ) {
            escaped = true;
            continue;
        }

        if (quote) {

            if (
                char === quote
            ) {
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

            if (
                source[j] === ";"
            ) {
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


// Remove os dois eventos antigos
code =
    removeSocketEvent(
        code,
        "stream-started"
    );

code =
    removeSocketEvent(
        code,
        "stream-stopped"
    );


// =============================================
// REGISTRA NOVO MODULO
// =============================================

const joinRegistration =
    /registerJoinRoom\(\{[\s\S]*?\}\);/m;

const match =
    code.match(
        joinRegistration
    );

if (!match) {
    throw new Error(
        "Registro de join-room nao localizado"
    );
}

const registerAt =
    match.index +
    match[0].length;

const streamRegistration = `

        registerStreamEvents({
            socket,
            roomService,
            allowSocketEvent,
            updateParticipants
        });`;

code =
    code.slice(0, registerAt) +
    streamRegistration +
    code.slice(registerAt);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "STREAM EVENTS INTEGRADO AO SERVER"
);
