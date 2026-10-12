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
    function admit({ roomCode, room, profile, validOwnerToken = false }) {
        if (room.users.size >= maxUsersPerRoom) {
            socket.emit("room-error", "Sala cheia.");
            return false;
        }

        socket.join(roomCode);
        socket.data.roomCode = roomCode;
        socket.data.pendingRoomCode = null;
        socket.data.profile = profile;
        socket.data.roomApiToken = randomToken(24);
        room.pendingGuests?.delete(socket.id);

        let role = "member";
        if (!room.hostId && validOwnerToken) {
            role = "host";
            room.hostId = socket.id;
            room.hostClaimedAt = Date.now();
        } else if (!room.hostTokenHash && !room.hostId) {
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
            entryPolicy: room.entryPolicy || "auto",
            roomMode: room.roomMode || "normal",
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
        return true;
    }

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
        const requestedTrustToken = typeof data.trustToken === "string" ? data.trustToken.slice(0, 160) : "";
        const validOwnerToken = roomService.verifyHostToken(roomCode, requestedHostToken);
        const validTrustedInvite = roomService.verifyTrustedInvite(roomCode, requestedTrustToken);
        const approvedRetry = socket.data.entryApprovedFor === roomCode;
        const profile = sanitizeProfile(data.profile);

        if (room.locked && room.users.size > 0 && !validOwnerToken && !validTrustedInvite && !approvedRetry) {
            return socket.emit("room-error", "A sala está bloqueada pelo host.");
        }

        const policy = room.entryPolicy || "auto";
        const shouldWait = !validOwnerToken && !validTrustedInvite && !approvedRetry && (
            policy === "approveAll" || policy === "approveUnknown"
        );

        if (shouldWait) {
            room.pendingGuests ||= new Map();
            room.pendingGuests.set(socket.id, {
                id: socket.id,
                name: profile.name,
                avatar: profile.avatar,
                requestedAt: Date.now()
            });
            socket.data.pendingRoomCode = roomCode;
            socket.data.profile = profile;
            roomService.audit(roomCode, { type: "join-request", actorId: socket.id, actorName: profile.name });
            socket.emit("room:waiting", { roomCode, message: "Aguardando aprovação do host." });
            if (room.hostId) {
                socket.nsp.to(room.hostId).emit("room:join-request", {
                    id: socket.id,
                    name: profile.name,
                    avatar: profile.avatar,
                    requestedAt: Date.now()
                });
            }
            return;
        }

        if (approvedRetry) delete socket.data.entryApprovedFor;
        admit({ roomCode, room, profile, validOwnerToken });
    });
}

module.exports = { registerJoinRoom };
