const PORT =
    process.env.PORT || 3000;

const HOST =
    "0.0.0.0";

const MAX_ROOMS =
    500;

const MAX_USERS_PER_ROOM =
    20;

const EMPTY_ROOM_TTL =
    30 * 60 * 1000;

const MAX_SOCKET_PAYLOAD =
    64 * 1024;

const ALLOWED_AVATARS =
    new Set([
        "😎",
        "👾",
        "🐺",
        "🦊",
        "🐉",
        "🤖"
    ]);

module.exports = {
    PORT,
    HOST,
    MAX_ROOMS,
    MAX_USERS_PER_ROOM,
    EMPTY_ROOM_TTL,
    MAX_SOCKET_PAYLOAD,
    ALLOWED_AVATARS
};
