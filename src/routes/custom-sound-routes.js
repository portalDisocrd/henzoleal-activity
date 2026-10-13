const crypto = require("crypto");
const { randomToken, roomOwnershipKey, safeStringEqual } = require("../security/security-utils");

const MAX_SOUND_BYTES = 700 * 1024;
const MAX_SOUND_DURATION = 15;
const MAX_CUSTOM_SOUNDS = 16;
const MAX_ROOM_SOUND_BYTES = 7 * 1024 * 1024;
const MAX_GLOBAL_SOUND_BYTES = 64 * 1024 * 1024;
const ALLOWED_CATEGORIES = new Set(["Memes", "Reações", "Vitória", "Falha", "Suspense", "Outros"]);


function totalCustomSoundBytes(roomService) {
    let total = 0;
    for (const [, room] of roomService.entries()) total += Number(room.customSoundBytes || 0);
    return total;
}

function decodeHeader(value, max = 80) {
    try {
        return decodeURIComponent(String(value || "")).normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
    } catch {
        return String(value || "").normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
    }
}

function parsePcmWav(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 44) return null;
    if (buffer.subarray(0, 4).toString("ascii") !== "RIFF" || buffer.subarray(8, 12).toString("ascii") !== "WAVE") return null;

    let offset = 12;
    let fmt = null;
    let dataSize = null;
    while (offset + 8 <= buffer.length) {
        const id = buffer.subarray(offset, offset + 4).toString("ascii");
        const size = buffer.readUInt32LE(offset + 4);
        const start = offset + 8;
        const end = start + size;
        if (end > buffer.length) return null;

        if (id === "fmt " && size >= 16) {
            fmt = {
                format: buffer.readUInt16LE(start),
                channels: buffer.readUInt16LE(start + 2),
                sampleRate: buffer.readUInt32LE(start + 4),
                byteRate: buffer.readUInt32LE(start + 8),
                blockAlign: buffer.readUInt16LE(start + 12),
                bitsPerSample: buffer.readUInt16LE(start + 14)
            };
        } else if (id === "data") {
            dataSize = size;
        }
        offset = end + (size % 2);
    }

    if (!fmt || dataSize === null) return null;
    if (fmt.format !== 1 || fmt.channels !== 1 || fmt.bitsPerSample !== 16) return null;
    if (fmt.sampleRate < 8000 || fmt.sampleRate > 48000) return null;
    if (fmt.blockAlign !== 2 || fmt.byteRate !== fmt.sampleRate * 2) return null;
    const duration = dataSize / fmt.byteRate;
    if (!Number.isFinite(duration) || duration <= 0) return null;
    return { ...fmt, dataSize, duration };
}

function publicSound(sound, roomCode) {
    return {
        id: sound.id,
        name: sound.name,
        category: sound.category,
        emoji: sound.emoji,
        duration: sound.duration,
        ownerId: sound.ownerId,
        ownerName: sound.ownerName,
        createdAt: sound.createdAt,
        custom: true,
        url: `/api/rooms/${encodeURIComponent(roomCode)}/sounds/${encodeURIComponent(sound.id)}/audio?t=${encodeURIComponent(sound.accessToken)}`
    };
}

function canUpload(user, policy) {
    if (!user) return false;
    if (policy === "disabled") return false;
    if (policy === "everyone") return true;
    if (policy === "hostOnly") return user.role === "host";
    if (policy === "moderators") return user.role === "host" || user.role === "moderator";
    return false;
}

function canDelete(user, sound, roomCode) {
    if (!user || !sound) return false;
    const ownerKey = roomOwnershipKey(roomCode, user.clientId);
    return (ownerKey && ownerKey === sound.ownerId) || user.role === "host" || user.role === "moderator";
}

function authorizeRoomHttp(req, io, room, roomCode) {
    const socketId = String(req.get("x-hl-socket-id") || "").trim();
    const apiToken = String(req.get("x-hl-room-token") || "").trim();
    if (!socketId || socketId.length > 120 || !apiToken || apiToken.length > 160) return null;
    const socket = io.sockets.sockets.get(socketId);
    if (!socket || socket.data.roomCode !== roomCode || !safeStringEqual(apiToken, socket.data.roomApiToken)) return null;
    const user = room.users.get(socketId);
    if (!user) return null;
    return { socket, user };
}

function registerCustomSoundRoutes({ app, express, io, roomService, sanitizeRoomCode, isValidRoomCode, soundUploadLimiter }) {
    const rawAudio = express.raw({
        type: ["audio/wav", "audio/x-wav", "application/octet-stream"],
        limit: `${MAX_SOUND_BYTES}b`
    });

    app.post("/api/rooms/:code/sounds", soundUploadLimiter, rawAudio, (req, res) => {
        const roomCode = sanitizeRoomCode(req.params.code);
        if (!isValidRoomCode(roomCode)) return res.status(400).json({ success: false, message: "Sala inválida." });
        const room = roomService.get(roomCode);
        if (!room) return res.status(404).json({ success: false, message: "Sala não encontrada." });

        const auth = authorizeRoomHttp(req, io, room, roomCode);
        if (!auth) return res.status(401).json({ success: false, message: "Sessão da sala inválida. Reconecte e tente novamente." });
        const { socket, user } = auth;
        if (!canUpload(user, room.soundUploadPolicy || "everyone")) return res.status(403).json({ success: false, message: "Você não tem permissão para adicionar sons." });

        if (!Buffer.isBuffer(req.body) || req.body.length < 44) return res.status(400).json({ success: false, message: "Arquivo de áudio inválido." });
        if (req.body.length > MAX_SOUND_BYTES) return res.status(413).json({ success: false, message: "Som muito grande." });

        const wav = parsePcmWav(req.body);
        if (!wav) return res.status(415).json({ success: false, message: "O trecho processado precisa ser WAV PCM mono de 16 bits." });
        if (wav.duration > MAX_SOUND_DURATION + 0.05) return res.status(400).json({ success: false, message: `O som precisa ter até ${MAX_SOUND_DURATION} segundos.` });

        const name = decodeHeader(req.get("x-hl-sound-name"), 40) || "Som personalizado";
        const categoryRaw = decodeHeader(req.get("x-hl-sound-category"), 30) || "Outros";
        const category = ALLOWED_CATEGORIES.has(categoryRaw) ? categoryRaw : "Outros";
        const emojiRaw = decodeHeader(req.get("x-hl-sound-emoji"), 8);
        const emoji = emojiRaw || "🔊";

        room.customSounds ||= new Map();
        room.customSoundBytes ||= 0;
        if (room.customSounds.size >= MAX_CUSTOM_SOUNDS) return res.status(409).json({ success: false, message: `A sala já chegou ao limite de ${MAX_CUSTOM_SOUNDS} sons personalizados.` });
        if (room.customSoundBytes + req.body.length > MAX_ROOM_SOUND_BYTES) return res.status(409).json({ success: false, code: "SOUND_ROOM_LIMIT", message: "A sala chegou ao limite temporário de sons." });
        if (totalCustomSoundBytes(roomService) + req.body.length > MAX_GLOBAL_SOUND_BYTES) return res.status(503).json({ success: false, code: "SOUND_GLOBAL_LIMIT", message: "O servidor atingiu o limite temporário de áudio. Tente novamente mais tarde." });

        const now = Date.now();
        if (now - (socket.data.lastSoundUploadAt || 0) < 3000) return res.status(429).json({ success: false, message: "Aguarde alguns segundos antes de adicionar outro som." });
        socket.data.lastSoundUploadAt = now;

        const id = `custom-${crypto.randomUUID()}`;
        const sound = {
            id,
            name,
            category,
            emoji,
            duration: Math.round(wav.duration * 10) / 10,
            ownerId: roomOwnershipKey(roomCode, user.clientId),
            ownerName: user.name,
            createdAt: now,
            mime: "audio/wav",
            bytes: req.body.length,
            buffer: Buffer.from(req.body),
            accessToken: randomToken(18)
        };
        room.customSounds.set(id, sound);
        room.customSoundBytes += sound.bytes;
        room.lastActivity = now;
        roomService.audit(roomCode, { type: "sound-upload", actorId: socket.id, actorName: user.name, soundId: id, bytes: sound.bytes });

        const metadata = publicSound(sound, roomCode);
        io.to(roomCode).emit("sound:catalog-add", metadata);
        return res.status(201).json({ success: true, sound: metadata, persistence: "session" });
    });

    app.get("/api/rooms/:code/sounds/:soundId/audio", (req, res) => {
        const roomCode = sanitizeRoomCode(req.params.code);
        if (!isValidRoomCode(roomCode)) return res.status(404).end();
        const room = roomService.get(roomCode);
        const sound = room?.customSounds?.get(String(req.params.soundId || ""));
        if (!sound || !safeStringEqual(String(req.query.t || ""), sound.accessToken)) return res.status(404).end();
        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Content-Length", String(sound.buffer.length));
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        return res.send(sound.buffer);
    });



    app.patch("/api/rooms/:code/sounds/:soundId", soundUploadLimiter, (req, res) => {
        const roomCode = sanitizeRoomCode(req.params.code);
        if (!isValidRoomCode(roomCode)) return res.status(400).json({ success: false, message: "Sala inválida." });
        const room = roomService.get(roomCode);
        if (!room) return res.status(404).json({ success: false, message: "Sala não encontrada." });
        const auth = authorizeRoomHttp(req, io, room, roomCode);
        if (!auth) return res.status(401).json({ success: false, message: "Sessão da sala inválida." });
        const sound = room.customSounds?.get(String(req.params.soundId || ""));
        if (!sound) return res.status(404).json({ success: false, message: "Som não encontrado." });
        if (!canDelete(auth.user, sound, roomCode)) return res.status(403).json({ success: false, message: "Sem permissão para editar este som." });

        const name = decodeHeader(req.body?.name, 40);
        const categoryRaw = decodeHeader(req.body?.category, 30);
        const emoji = decodeHeader(req.body?.emoji, 8);
        if (name) sound.name = name;
        if (ALLOWED_CATEGORIES.has(categoryRaw)) sound.category = categoryRaw;
        if (emoji) sound.emoji = emoji;
        roomService.audit(roomCode, { type: "sound-edit", actorId: auth.socket.id, actorName: auth.user.name, soundId: sound.id });
        const metadata = publicSound(sound, roomCode);
        io.to(roomCode).emit("sound:catalog-update", metadata);
        return res.json({ success: true, sound: metadata });
    });

    app.post("/api/rooms/:code/sounds/:soundId/duplicate", soundUploadLimiter, (req, res) => {
        const roomCode = sanitizeRoomCode(req.params.code);
        if (!isValidRoomCode(roomCode)) return res.status(400).json({ success: false, message: "Sala inválida." });
        const room = roomService.get(roomCode);
        if (!room) return res.status(404).json({ success: false, message: "Sala não encontrada." });
        const auth = authorizeRoomHttp(req, io, room, roomCode);
        if (!auth) return res.status(401).json({ success: false, message: "Sessão da sala inválida." });
        const original = room.customSounds?.get(String(req.params.soundId || ""));
        if (!original) return res.status(404).json({ success: false, message: "Som não encontrado." });
        if (!canUpload(auth.user, room.soundUploadPolicy || "everyone")) return res.status(403).json({ success: false, message: "Sem permissão para duplicar sons." });
        if (room.customSounds.size >= MAX_CUSTOM_SOUNDS) return res.status(409).json({ success: false, message: `A sala já chegou ao limite de ${MAX_CUSTOM_SOUNDS} sons personalizados.` });
        if (room.customSoundBytes + original.bytes > MAX_ROOM_SOUND_BYTES) return res.status(409).json({ success: false, code: "SOUND_ROOM_LIMIT", message: "A sala chegou ao limite temporário de sons." });
        if (totalCustomSoundBytes(roomService) + original.bytes > MAX_GLOBAL_SOUND_BYTES) return res.status(503).json({ success: false, code: "SOUND_GLOBAL_LIMIT", message: "O servidor atingiu o limite temporário de áudio. Tente novamente mais tarde." });

        const id = `custom-${crypto.randomUUID()}`;
        const copy = { ...original, id, name: `${original.name} (cópia)`.slice(0,40), ownerId: roomOwnershipKey(roomCode, auth.user.clientId), ownerName: auth.user.name, createdAt: Date.now(), buffer: Buffer.from(original.buffer), accessToken: randomToken(18) };
        room.customSounds.set(id, copy);
        room.customSoundBytes += copy.bytes;
        roomService.audit(roomCode, { type: "sound-duplicate", actorId: auth.socket.id, actorName: auth.user.name, soundId: id, sourceId: original.id });
        const metadata = publicSound(copy, roomCode);
        io.to(roomCode).emit("sound:catalog-add", metadata);
        return res.status(201).json({ success: true, sound: metadata, persistence: "session" });
    });

    app.delete("/api/rooms/:code/sounds/:soundId", soundUploadLimiter, (req, res) => {
        const roomCode = sanitizeRoomCode(req.params.code);
        if (!isValidRoomCode(roomCode)) return res.status(400).json({ success: false, message: "Sala inválida." });
        const room = roomService.get(roomCode);
        if (!room) return res.status(404).json({ success: false, message: "Sala não encontrada." });

        const auth = authorizeRoomHttp(req, io, room, roomCode);
        if (!auth) return res.status(401).json({ success: false, message: "Sessão da sala inválida." });
        const sound = room.customSounds?.get(String(req.params.soundId || ""));
        if (!sound) return res.status(404).json({ success: false, message: "Som não encontrado." });
        if (!canDelete(auth.user, sound, roomCode)) return res.status(403).json({ success: false, message: "Sem permissão para excluir este som." });

        room.customSounds.delete(sound.id);
        room.customSoundBytes = Math.max(0, (room.customSoundBytes || 0) - sound.bytes);
        roomService.audit(roomCode, { type: "sound-delete", actorId: auth.socket.id, actorName: auth.user.name, soundId: sound.id });
        io.to(roomCode).emit("sound:catalog-remove", { id: sound.id });
        return res.json({ success: true });
    });
}

module.exports = {
    registerCustomSoundRoutes,
    publicSound,
    parsePcmWav,
    canUpload,
    authorizeRoomHttp,
    MAX_SOUND_BYTES,
    MAX_SOUND_DURATION,
    MAX_CUSTOM_SOUNDS,
    MAX_ROOM_SOUND_BYTES,
    MAX_GLOBAL_SOUND_BYTES,
    totalCustomSoundBytes
};
