const { publicSound } = require("../routes/custom-sound-routes");

const SOUND_IDS = new Set(["airhorn", "victory", "fail", "bonk", "pop", "suspense"]);
const SOUND_POLICIES = new Set(["disabled", "hostOnly", "moderators", "everyone"]);
const REACTION_EMOJIS = new Set(["👍", "😂", "❤️", "🔥", "👏"]);

function createSocialEvents({ io, roomService, allowSocketEvent, getSafeTargetSocket, normalizeText }) {
    function ctx(socket) {
        const roomCode = socket.data.roomCode;
        if (!roomCode) return null;
        const room = roomService.get(roomCode);
        if (!room) return null;
        const user = room.users.get(socket.id);
        if (!user) return null;
        return { roomCode, room, user };
    }

    function canUseSound(user, policy) {
        if (!user || policy === "disabled") return false;
        if (policy === "everyone") return true;
        if (policy === "hostOnly") return user.role === "host";
        if (policy === "moderators") return user.role === "host" || user.role === "moderator";
        return false;
    }

    function canModerate(actor, target) {
        if (!actor || !target || actor === target) return false;
        if (actor.role === "host") return target.role !== "host";
        return actor.role === "moderator" && target.role === "member";
    }

    function register(socket, updateParticipants) {
        socket.on("social:state", ack => {
            const c = ctx(socket);
            if (!c) return typeof ack === "function" && ack({ success: false });
            if (typeof ack === "function") ack({
                success: true,
                role: c.user.role,
                hostId: c.room.hostId,
                locked: Boolean(c.room.locked),
                soundboardPolicy: c.room.soundboardPolicy,
                soundUploadPolicy: c.room.soundUploadPolicy,
                customSounds: Array.from(c.room.customSounds?.values?.() || []).map(sound => publicSound(sound, c.roomCode))
            });
        });

        socket.on("reaction:send", (payload, ack) => {
            if (!allowSocketEvent(socket, "reaction:send")) return typeof ack === "function" && ack({ success: false, message: "Muitas reações em pouco tempo." });
            const c = ctx(socket);
            if (!c) return typeof ack === "function" && ack({ success: false });
            const emoji = normalizeText(payload?.emoji, 8);
            if (!REACTION_EMOJIS.has(emoji)) return typeof ack === "function" && ack({ success: false, message: "Reação inválida." });
            const now = Date.now();
            c.room.lastActivity = now;
            socket.to(c.roomCode).emit("reaction:show", { emoji, senderId: socket.id, name: c.user.name, at: now });
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("sound:play", (payload, ack) => {
            if (!allowSocketEvent(socket, "sound:play")) return typeof ack === "function" && ack({ success: false, message: "Muitas ações em pouco tempo." });
            const c = ctx(socket);
            if (!c) return typeof ack === "function" && ack({ success: false });
            const soundId = normalizeText(payload?.soundId, 80);
            const builtin = SOUND_IDS.has(soundId);
            const custom = c.room.customSounds?.get(soundId);
            if (!builtin && !custom) return typeof ack === "function" && ack({ success: false, message: "Som inválido." });
            if (!canUseSound(c.user, c.room.soundboardPolicy)) return typeof ack === "function" && ack({ success: false, message: "Soundboard não permitido nesta sala." });

            const now = Date.now();
            if (now - (socket.data.lastSoundAt || 0) < 900) return typeof ack === "function" && ack({ success: false, message: "Aguarde o cooldown." });
            socket.data.lastSoundAt = now;
            c.room.lastActivity = now;
            socket.to(c.roomCode).emit("sound:play", { soundId, userId: socket.id, name: c.user.name, at: now });
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("sound:stop", (ack) => {
            if (!allowSocketEvent(socket, "sound:play")) return typeof ack === "function" && ack({ success: false });
            const c = ctx(socket);
            if (!c || (c.user.role !== "host" && c.user.role !== "moderator")) return typeof ack === "function" && ack({ success: false, message: "Sem permissão." });
            io.to(c.roomCode).emit("sound:stop", { by: socket.id });
            roomService.audit(c.roomCode, { type: "sound-stop", actorId: socket.id, actorName: c.user.name });
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("moderation:sound-policy", (payload, ack) => {
            if (!allowSocketEvent(socket, "moderation")) return typeof ack === "function" && ack({ success: false });
            const c = ctx(socket);
            if (!c || c.user.role !== "host") return typeof ack === "function" && ack({ success: false, message: "Somente o host pode alterar isso." });
            const policy = normalizeText(payload?.policy, 20);
            if (!SOUND_POLICIES.has(policy)) return typeof ack === "function" && ack({ success: false });
            c.room.soundboardPolicy = policy;
            roomService.audit(c.roomCode, { type: "sound-policy", actorId: socket.id, actorName: c.user.name, policy });
            io.to(c.roomCode).emit("sound:policy", { policy, by: socket.id });
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("moderation:sound-upload-policy", (payload, ack) => {
            if (!allowSocketEvent(socket, "moderation")) return typeof ack === "function" && ack({ success: false });
            const c = ctx(socket);
            if (!c || c.user.role !== "host") return typeof ack === "function" && ack({ success: false, message: "Somente o host pode alterar isso." });
            const policy = normalizeText(payload?.policy, 20);
            if (!SOUND_POLICIES.has(policy)) return typeof ack === "function" && ack({ success: false });
            c.room.soundUploadPolicy = policy;
            roomService.audit(c.roomCode, { type: "sound-upload-policy", actorId: socket.id, actorName: c.user.name, policy });
            io.to(c.roomCode).emit("sound:upload-policy", { policy, by: socket.id });
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("moderation:lock", (payload, ack) => {
            if (!allowSocketEvent(socket, "moderation")) return typeof ack === "function" && ack({ success: false });
            const c = ctx(socket);
            if (!c || c.user.role !== "host") return typeof ack === "function" && ack({ success: false });
            c.room.locked = Boolean(payload?.locked);
            roomService.audit(c.roomCode, { type: "room-lock", actorId: socket.id, actorName: c.user.name, locked: c.room.locked });
            io.to(c.roomCode).emit("room:locked", { locked: c.room.locked });
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("moderation:kick", (payload, ack) => {
            if (!allowSocketEvent(socket, "moderation")) return typeof ack === "function" && ack({ success: false });
            const c = ctx(socket);
            if (!c) return typeof ack === "function" && ack({ success: false });
            const targetSocket = getSafeTargetSocket(socket, normalizeText(payload?.target, 100));
            if (!targetSocket) return typeof ack === "function" && ack({ success: false });
            const targetUser = c.room.users.get(targetSocket.id);
            if (!canModerate(c.user, targetUser)) return typeof ack === "function" && ack({ success: false, message: "Sem permissão." });
            roomService.audit(c.roomCode, { type: "kick", actorId: socket.id, actorName: c.user.name, targetId: targetSocket.id, targetName: targetUser.name });
            targetSocket.emit("moderation:kicked", { message: "Você foi removido da sala." });
            targetSocket.disconnect(true);
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("moderation:promote", (payload, ack) => {
            if (!allowSocketEvent(socket, "moderation")) return typeof ack === "function" && ack({ success: false });
            const c = ctx(socket);
            if (!c || c.user.role !== "host") return typeof ack === "function" && ack({ success: false });
            const targetSocket = getSafeTargetSocket(socket, normalizeText(payload?.target, 100));
            const target = targetSocket && c.room.users.get(targetSocket.id);
            if (!target || target.role === "host") return typeof ack === "function" && ack({ success: false });
            target.role = payload?.moderator ? "moderator" : "member";
            roomService.audit(c.roomCode, { type: "role", actorId: socket.id, actorName: c.user.name, targetId: targetSocket.id, role: target.role });
            updateParticipants(c.roomCode);
            if (typeof ack === "function") ack({ success: true });
        });
    }

    return { register };
}

module.exports = { createSocialEvents, SOUND_IDS, SOUND_POLICIES, REACTION_EMOJIS };
