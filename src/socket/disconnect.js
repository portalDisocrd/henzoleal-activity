function registerDisconnect({ socket, roomService, updateParticipants }) {
    socket.on("disconnect", () => {
        const roomCode = socket.data.roomCode;
        if (!roomCode) return;

        const room = roomService.get(roomCode);
        if (!room) return;

        const user = room.users.get(socket.id);
        const wasVoice = Boolean(user?.voiceJoined);
        room.users.delete(socket.id);
        room.lastActivity = Date.now();

        socket.to(roomCode).emit("user-left", socket.id);
        socket.to(roomCode).emit("stream-stopped", socket.id);
        if (wasVoice) socket.to(roomCode).emit("voice:user-left", { id: socket.id });

        if (room.hostId === socket.id) {
            const next = room.users.entries().next().value;
            if (next) {
                room.hostId = next[0];
                next[1].role = "host";
                socket.to(roomCode).emit("room:host-changed", { hostId: room.hostId });
            } else {
                room.hostId = null;
            }
        }

        console.log(`[ROOM] ${user?.name || "Usuário"} saiu de ${roomCode}`);

        if (roomService.removeIfEmpty(roomCode)) {
            console.log(`[ROOM] Sala ${roomCode} encerrada`);
            return;
        }

        updateParticipants(roomCode);
    });
}

module.exports = { registerDisconnect };
