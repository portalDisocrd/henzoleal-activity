const { randomToken, roomOwnershipKey } = require("../security/security-utils");

function registerJoinRoom({ socket, roomService, sanitizeRoomCode, isValidRoomCode, sanitizeProfile, isPlainObject, allowSocketEvent, maxUsersPerRoom, updateParticipants }) {
    const emitRoomError = (code, message) => socket.emit("room-error", { code, message });
    function emitActivity(roomCode, room, user, text, type = "info") {
        const item = roomService.activity(roomCode, { type, text, actorId: socket.id, actorName: user?.name || "Usuário" });
        if (item) socket.nsp.to(roomCode).emit("activity:event", item);
    }

    function admit({ roomCode, room, profile, validOwnerToken = false, clientId = "" }) {
        if (room.users.size >= maxUsersPerRoom) { emitRoomError("ROOM_FULL", "Sala cheia."); return false; }
        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.pendingRoomCode = null;
        socket.data.profile = profile;
        socket.data.clientId = clientId;
        socket.data.roomApiToken = randomToken(24);
        room.pendingGuests?.delete(socket.id);

        let role = "member";
        if (!room.hostId && validOwnerToken) { role = "host"; room.hostId = socket.id; room.hostClaimedAt = Date.now(); }
        else if (!room.hostTokenHash && !room.hostId) { role = "host"; room.hostId = socket.id; room.hostClaimedAt = Date.now(); }

        const now = Date.now();
        const user = {
            name: profile.name, avatar: profile.avatar, role,
            clientId, streaming: false, voiceJoined: false, muted: false, deaf: false,
            status: "online", activity: "Online", lastActive: now,
            soundBlocked: false, streamBlocked: false, joinedAt: now
        };
        room.users.set(socket.id, user);
        room.lastActivity = now;
        room.emptySince = null;
        roomService.audit(roomCode, { type: "join", actorId: socket.id, actorName: profile.name, role });
        emitActivity(roomCode, room, user, `${profile.name} entrou na sala`, "join");

        socket.emit("room:joined", {
            roomCode, role, hostId: room.hostId, soundboardPolicy: room.soundboardPolicy,
            soundUploadPolicy: room.soundUploadPolicy, locked: room.locked,
            entryPolicy: room.entryPolicy || "auto", roomMode: room.roomMode || "normal",
            spotlightId: room.spotlightId || null, hasPassword: Boolean(room.roomPasswordHash),
            apiToken: socket.data.roomApiToken,
            ownershipKey: roomOwnershipKey(roomCode, clientId)
        });
        socket.to(roomCode).emit("user-joined", { id: socket.id, name: profile.name, avatar: profile.avatar, role, streaming: false });
        updateParticipants(roomCode);
        return true;
    }

    socket.on("join-room", data => {
        if (!allowSocketEvent(socket, "room:join")) return;
        if (!isPlainObject(data)) return emitRoomError("ROOM_DATA_INVALID", "Dados inválidos.");
        const roomCode = sanitizeRoomCode(data.roomCode);
        if (!isValidRoomCode(roomCode)) return emitRoomError("ROOM_CODE_INVALID", "Código de sala inválido.");
        const room = roomService.get(roomCode);
        if (!room) return emitRoomError("ROOM_NOT_FOUND", "Sala não encontrada.");
        if (socket.data.roomCode === roomCode) return updateParticipants(roomCode);
        if (socket.data.roomCode) return emitRoomError("ROOM_ALREADY_JOINED", "Você já está em outra sala.");

        const requestedHostToken = typeof data.hostToken === "string" ? data.hostToken.slice(0,160) : "";
        const requestedTrustToken = typeof data.trustToken === "string" ? data.trustToken.slice(0,160) : "";
        const inviteToken = typeof data.inviteToken === "string" ? data.inviteToken.slice(0,160) : "";
        const password = typeof data.password === "string" ? data.password.slice(0,80) : "";
        const clientId = typeof data.clientId === "string" ? data.clientId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0,80) : "";
        const validOwnerToken = roomService.verifyHostToken(roomCode, requestedHostToken);
        const legacyTrusted = roomService.verifyTrustedInvite(roomCode, requestedTrustToken);
        const invite = roomService.verifyInvite(roomCode, inviteToken || requestedTrustToken);
        const trustedInvite = legacyTrusted || Boolean(invite?.trusted);
        const approvedRetry = socket.data.entryApprovedFor === roomCode;
        const profile = sanitizeProfile(data.profile);

        const banUntil = clientId ? Number(room.bannedClients?.get(clientId) || 0) : 0;
        if (banUntil > Date.now()) return emitRoomError("ROOM_BANNED", "Seu acesso a esta sala foi bloqueado pelo host.");
        if (room.roomPasswordHash && !validOwnerToken && !trustedInvite && !approvedRetry && !roomService.verifyRoomPassword(roomCode, password)) {
            return socket.emit("room:password-required", { roomCode, message: "Esta sala possui senha." });
        }
        if (room.locked && room.users.size > 0 && !validOwnerToken && !trustedInvite && !approvedRetry) return emitRoomError("ROOM_LOCKED", "A sala está bloqueada pelo host.");

        const policy = room.entryPolicy || "auto";
        const shouldWait = !validOwnerToken && !trustedInvite && !approvedRetry && (policy === "approveAll" || policy === "approveUnknown");
        if (shouldWait) {
            room.pendingGuests ||= new Map();
            room.pendingGuests.set(socket.id, { id: socket.id, name: profile.name, avatar: profile.avatar, clientId, requestedAt: Date.now() });
            socket.data.pendingRoomCode = roomCode;
            socket.data.profile = profile;
            socket.data.clientId = clientId;
            roomService.audit(roomCode, { type: "join-request", actorId: socket.id, actorName: profile.name });
            socket.emit("room:waiting", { roomCode, message: "Aguardando aprovação do host." });
            if (room.hostId) socket.nsp.to(room.hostId).emit("room:join-request", { id: socket.id, name: profile.name, avatar: profile.avatar, requestedAt: Date.now() });
            return;
        }

        if (approvedRetry) delete socket.data.entryApprovedFor;
        if (inviteToken || requestedTrustToken) roomService.verifyInvite(roomCode, inviteToken || requestedTrustToken, { consume: true });
        admit({ roomCode, room, profile, validOwnerToken, clientId });
    });
}

module.exports = { registerJoinRoom };
