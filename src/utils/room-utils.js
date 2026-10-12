const crypto = require("crypto");

function generateRoomCode(rooms) {
    let code;
    do { code = crypto.randomBytes(4).toString("hex").toUpperCase(); } while (rooms.has(code));
    return code;
}

function getParticipants(room) {
    return Array.from(room.users.entries()).map(([id, user]) => ({
        id,
        name: user.name,
        avatar: user.avatar,
        streaming: Boolean(user.streaming),
        role: user.role || "member",
        voiceJoined: Boolean(user.voiceJoined),
        muted: Boolean(user.muted),
        deaf: Boolean(user.deaf),
        status: user.status || "online",
        activity: user.activity || (user.streaming ? "Transmitindo" : user.voiceJoined ? "No voz" : "Online"),
        lastActive: Number(user.lastActive || user.joinedAt || Date.now()),
        soundBlocked: Boolean(user.soundBlocked),
        streamBlocked: Boolean(user.streamBlocked),
        spotlighted: room.spotlightId === id
    }));
}

module.exports = { generateRoomCode, getParticipants };
