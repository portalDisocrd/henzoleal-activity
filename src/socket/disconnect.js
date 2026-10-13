const { HOST_RECONNECT_GRACE_MS } = require("../config/constants");

function registerDisconnect({ socket, roomService, updateParticipants }) {
    socket.on("disconnect", reason => {
        const pendingCode = socket.data.pendingRoomCode;
        if (pendingCode) {
            const pendingRoom = roomService.get(pendingCode);
            if (pendingRoom?.pendingGuests?.delete(socket.id) && pendingRoom.hostId) {
                socket.nsp.to(pendingRoom.hostId).emit("room:join-request-removed", { id: socket.id });
            }
        }

        const roomCode = socket.data.roomCode;
        if (!roomCode) return;
        const room = roomService.get(roomCode);
        if (!room) return;
        const user = room.users.get(socket.id);
        const wasVoice = Boolean(user?.voiceJoined);
        const wasHost = room.hostId === socket.id;

        room.users.delete(socket.id);
        room.lastActivity = Date.now();
        room.emptySince = room.users.size === 0 ? Date.now() : null;
        if (room.spotlightId === socket.id) room.spotlightId = null;

        roomService.audit(roomCode, { type: "leave", actorId: socket.id, actorName: user?.name || "Usuário", reason: String(reason || "disconnect").slice(0, 60) });
        const activity = user ? roomService.activity(roomCode, { type: "leave", text: `${user.name} saiu da sala`, actorId: socket.id, actorName: user.name }) : null;

        socket.to(roomCode).emit("user-left", socket.id);
        socket.to(roomCode).emit("stream-stopped", socket.id);
        if (wasVoice) socket.to(roomCode).emit("voice:user-left", { id: socket.id });
        if (activity) socket.to(roomCode).emit("activity:event", activity);

        if (wasHost) {
            room.hostId = null;
            room.hostGraceUntil = Date.now() + HOST_RECONNECT_GRACE_MS;
            socket.to(roomCode).emit("room:host-reconnecting", { graceMs: HOST_RECONNECT_GRACE_MS });
            const timer = setTimeout(() => {
                const current = roomService.get(roomCode);
                if (!current || current.hostId) return;
                current.hostGraceUntil = null;
                const next = Array.from(current.users.entries()).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0))[0];
                if (!next) return;
                current.hostId = next[0];
                next[1].role = "host";
                roomService.audit(roomCode, { type: "host-transfer", actorId: next[0], actorName: next[1].name, reason: "grace-expired" });
                socket.nsp.to(roomCode).emit("room:host-changed", { hostId: current.hostId });
                updateParticipants(roomCode);
            }, HOST_RECONNECT_GRACE_MS);
            timer.unref?.();
        }

        // Salas vazias permanecem durante o TTL para permitir reconexão segura.
        updateParticipants(roomCode);
    });
}

module.exports = { registerDisconnect };
