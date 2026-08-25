const fs = require("fs");

const file = "C:\\lealbot\\server.js";
let code = fs.readFileSync(file, "utf8");

if (
    code.includes(
        'require("./src/socket/join-room")'
    )
) {
    console.log(
        "JOIN ROOM JA INTEGRADO"
    );
    process.exit(0);
}


// =============================================
// IMPORT
// =============================================

const limiterRequire =
    'require("./src/socket/rate-limiter");';

const importIndex =
    code.indexOf(
        limiterRequire
    );

if (importIndex === -1) {
    throw new Error(
        "Import do rate-limiter nao localizado"
    );
}

const insertAt =
    importIndex +
    limiterRequire.length;

const joinImport = `

const {
    registerJoinRoom
} = require("./src/socket/join-room");`;

code =
    code.slice(0, insertAt) +
    joinImport +
    code.slice(insertAt);


// =============================================
// LOCALIZAR EVENTO JOIN-ROOM
// =============================================

const eventMarker =
    'socket.on(';

let searchFrom =
    code.indexOf(
        '"join-room"'
    );

if (searchFrom === -1) {
    throw new Error(
        "Evento join-room nao localizado"
    );
}

const eventStart =
    code.lastIndexOf(
        eventMarker,
        searchFrom
    );

if (eventStart === -1) {
    throw new Error(
        "Inicio do socket.on join-room nao localizado"
    );
}

const openParen =
    code.indexOf(
        "(",
        eventStart
    );

let parenDepth = 0;
let braceDepth = 0;
let bracketDepth = 0;
let quote = null;
let escaped = false;
let eventEnd = -1;

for (
    let i = openParen;
    i < code.length;
    i++
) {

    const char = code[i];

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

        let j = i + 1;

        while (
            /\s/.test(code[j] || "")
        ) {
            j++;
        }

        if (code[j] === ";") {
            eventEnd = j + 1;
        } else {
            eventEnd = i + 1;
        }

        break;
    }
}

if (eventEnd === -1) {
    throw new Error(
        "Final do join-room nao localizado"
    );
}


// =============================================
// SUBSTITUI PELO MODULO
// =============================================

const replacement = `registerJoinRoom({
            socket,
            roomService,
            sanitizeRoomCode,
            isValidRoomCode,
            sanitizeProfile,
            isPlainObject,
            allowSocketEvent,
            maxUsersPerRoom:
                MAX_USERS_PER_ROOM,
            updateParticipants
        });`;

code =
    code.slice(0, eventStart) +
    replacement +
    code.slice(eventEnd);


fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "JOIN ROOM INTEGRADO AO SERVER"
);
