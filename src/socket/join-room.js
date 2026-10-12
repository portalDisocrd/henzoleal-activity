const { randomToken } = require("../security/security-utils");

function registerJoinRoom({
    socket,
    roomService,
    sanitizeRoomCode,
    isValidRoomCode,
    sanitizeProfile,
    isPlainObject,
    allowSocketEvent,
    maxUsersPerRoom,
    updateParticipants
}) {
    socket.on("join-room", data => {
        if (!allowSocketEvent(socket, "room:join")) return;
        if (!isPlainObject(data)) return socket.emit("room-error", "Dados inválidos.");

        const roomCode = sanitizeRoomCode(data.roomCode);
        if (!isValidRoomCode(roomCode)) return socket.emit("room-error", "Código de sala inválido.");

        const room = roomService.get(roomCode);
        if (!room) return socket.emit("room-error", "Sala não encontrada.");
        if (socket.data.roomCode === roomCode) return updateParticipants(roomCode);
        if (socket.data.roomCode) return socket.emit("room-error", "Você já está em outra sala.");

        const requestedHostToken = typeof data.hostToken === "string" ? data.hostToken.slice(0, 160) : "";
        const validOwnerToken = roomService.verifyHostToken(roomCode, requestedHostToken);
        if (room.locked && room.users.size > 0 && !validOwnerToken) return socket.emit("room-error", "A sala está bloqueada pelo host.");
        if (room.users.size >= maxUsersPerRoom) return socket.emit("room-error", "Sala cheia.");

        const profile = sanitizeProfile(data.profile);
        const validHostClaim = !room.hostId && validOwnerToken;

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.profile = profile;
        socket.data.roomApiToken = randomToken(24);

        let role = "member";
        if (validHostClaim) {
            role = "host";
            room.hostId = socket.id;
            room.hostClaimedAt = Date.now();
        } else if (!room.hostTokenHash && !room.hostId) {
            // Compatibilidade apenas para salas antigas em memória, sem token de host.
            role = "host";
            room.hostId = socket.id;
            room.hostClaimedAt = Date.now();
        }

        room.users.set(socket.id, {
            name: profile.name,
            avatar: profile.avatar,
            role,
            streaming: false,
            voiceJoined: false,
            muted: false,
            deaf: false,
            joinedAt: Date.now()
        });

        room.lastActivity = Date.now();
        room.emptySince = null;
        roomService.audit(roomCode, { type: "join", actorId: socket.id, actorName: profile.name, role });

        console.log(`[ROOM] ${profile.name} entrou em ${roomCode} como ${role}`);

        socket.emit("room:joined", {
            roomCode,
            role,
            hostId: room.hostId,
            soundboardPolicy: room.soundboardPolicy,
            soundUploadPolicy: room.soundUploadPolicy,
            locked: room.locked,
            apiToken: socket.data.roomApiToken
        });

        socket.to(roomCode).emit("user-joined", {
            id: socket.id,
            name: profile.name,
            avatar: profile.avatar,
            role,
            streaming: false
        });

        updateParticipants(roomCode);
    });
}

module.exports = { registerJoinRoom };
