function createVoiceEvents({ io, roomService, allowSocketEvent, getSafeTargetSocket, isPlainObject, isValidDescription, isValidCandidate }) {
    function getContext(socket) {
        const roomCode = socket.data.roomCode;
        if (!roomCode) return null;
        const room = roomService.get(roomCode);
        if (!room) return null;
        const user = room.users.get(socket.id);
        if (!user) return null;
        return { roomCode, room, user };
    }

    function voiceList(room) {
        return Array.from(room.users.entries())
            .filter(([, user]) => user.voiceJoined)
            .map(([id, user]) => ({ id, name: user.name, avatar: user.avatar, muted: Boolean(user.muted), deaf: Boolean(user.deaf), role: user.role }));
    }

    function register(socket, updateParticipants) {
        socket.on("voice:join", (ack) => {
            if (!allowSocketEvent(socket, "voice:state")) return typeof ack === "function" && ack({ success: false });
            const ctx = getContext(socket);
            if (!ctx) return typeof ack === "function" && ack({ success: false });
            const existing = voiceList(ctx.room).filter(item => item.id !== socket.id);
            ctx.user.voiceJoined = true;
            ctx.user.muted = false;
            ctx.user.deaf = false;
            socket.to(ctx.roomCode).emit("voice:user-joined", { id: socket.id, name: ctx.user.name, avatar: ctx.user.avatar });
            updateParticipants(ctx.roomCode);
            if (typeof ack === "function") ack({ success: true, peers: existing });
        });

        socket.on("voice:leave", (ack) => {
            if (!allowSocketEvent(socket, "voice:state")) return typeof ack === "function" && ack({ success: false });
            const ctx = getContext(socket);
            if (!ctx) return typeof ack === "function" && ack({ success: false });
            ctx.user.voiceJoined = false;
            ctx.user.muted = false;
            ctx.user.deaf = false;
            socket.to(ctx.roomCode).emit("voice:user-left", { id: socket.id });
            updateParticipants(ctx.roomCode);
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("voice:state", (payload) => {
            if (!allowSocketEvent(socket, "voice:state")) return;
            const ctx = getContext(socket);
            if (!ctx || !ctx.user.voiceJoined) return;
            ctx.user.muted = Boolean(payload?.muted);
            ctx.user.deaf = Boolean(payload?.deaf);
            io.to(ctx.roomCode).emit("voice:state", { id: socket.id, muted: ctx.user.muted, deaf: ctx.user.deaf });
            updateParticipants(ctx.roomCode);
        });

        socket.on("voice:offer", data => relayDescription(socket, data, "offer", "voice:offer"));
        socket.on("voice:answer", data => relayDescription(socket, data, "answer", "voice:answer"));
        socket.on("voice:ice", data => {
            if (!allowSocketEvent(socket, "voice:signal") || !isPlainObject(data) || !isValidCandidate(data.candidate)) return;
            const target = getSafeTargetSocket(socket, data.target);
            const ctx = getContext(socket);
            if (!target || !ctx?.user.voiceJoined) return;
            const targetUser = ctx.room.users.get(target.id);
            if (!targetUser?.voiceJoined) return;
            target.emit("voice:ice", { sender: socket.id, candidate: data.candidate });
        });

        function relayDescription(source, data, expectedType, eventName) {
            if (!allowSocketEvent(source, "voice:signal") || !isPlainObject(data) || !isValidDescription(data.description, expectedType)) return;
            const target = getSafeTargetSocket(source, data.target);
            const ctx = getContext(source);
            if (!target || !ctx?.user.voiceJoined) return;
            const targetUser = ctx.room.users.get(target.id);
            if (!targetUser?.voiceJoined) return;
            target.emit(eventName, { sender: source.id, description: data.description });
        }
    }

    return { register, voiceList };
}

module.exports = { createVoiceEvents };
