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
        if (!allowSocketEvent(socket)) return;
        if (!isPlainObject(data)) return socket.emit("room-error", "Dados inválidos.");

        const roomCode = sanitizeRoomCode(data.roomCode);
        if (!isValidRoomCode(roomCode)) return socket.emit("room-error", "Código de sala inválido.");

        const room = roomService.get(roomCode);
        if (!room) return socket.emit("room-error", "Sala não encontrada.");
        if (socket.data.roomCode === roomCode) return updateParticipants(roomCode);
        if (socket.data.roomCode) return socket.emit("room-error", "Você já está em outra sala.");
        if (room.locked && room.users.size > 0) return socket.emit("room-error", "A sala está bloqueada pelo host.");
        if (room.users.size >= maxUsersPerRoom) return socket.emit("room-error", "Sala cheia.");

        const profile = sanitizeProfile(data.profile);
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.profile = profile;

        const role = room.hostId ? "member" : "host";
        if (!room.hostId) room.hostId = socket.id;

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

        console.log(`[ROOM] ${profile.name} entrou em ${roomCode} como ${role}`);

        socket.emit("room:joined", {
            roomCode,
            role,
            hostId: room.hostId,
            soundboardPolicy: room.soundboardPolicy,
            locked: room.locked
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
