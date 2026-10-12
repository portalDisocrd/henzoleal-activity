const { generateRoomCode } = require("../utils/room-utils");
const { randomToken, hashToken, safeTokenMatch } = require("../security/security-utils");

function createRoomService({ maxRooms, emptyRoomTtl }) {
    const rooms = new Map();

    function size() { return rooms.size; }
    function has(code) { return rooms.has(code); }
    function get(code) { return rooms.get(code); }

    function create() {
        if (rooms.size >= maxRooms) return { success: false, reason: "limit" };
        const code = generateRoomCode(rooms);
        const now = Date.now();
        const hostToken = randomToken(32);
        const room = {
            createdAt: now,
            lastActivity: now,
            emptySince: now,
            hostId: null,
            hostTokenHash: hashToken(hostToken),
            hostClaimedAt: null,
            locked: false,
            entryPolicy: "auto",
            roomMode: "normal",
            trustedInviteHash: null,
            pendingGuests: new Map(),
            soundboardPolicy: "everyone",
            soundUploadPolicy: "everyone",
            customSounds: new Map(),
            customSoundBytes: 0,
            users: new Map(),
            messages: [],
            auditLog: []
        };
        rooms.set(code, room);
        return { success: true, code, room, hostToken };
    }

    function verifyHostToken(code, token) {
        const room = rooms.get(code);
        return Boolean(room && safeTokenMatch(token, room.hostTokenHash));
    }


    function createTrustedInvite(code) {
        const room = rooms.get(code);
        if (!room) return null;
        const token = randomToken(24);
        room.trustedInviteHash = hashToken(token);
        room.lastActivity = Date.now();
        return token;
    }

    function verifyTrustedInvite(code, token) {
        const room = rooms.get(code);
        return Boolean(room && room.trustedInviteHash && safeTokenMatch(token, room.trustedInviteHash));
    }

    function audit(code, entry) {
        const room = rooms.get(code);
        if (!room) return false;
        room.auditLog ||= [];
        room.auditLog.push({ at: Date.now(), ...entry });
        if (room.auditLog.length > 120) room.auditLog.splice(0, room.auditLog.length - 120);
        return true;
    }

    function remove(code) { return rooms.delete(code); }
    function entries() { return rooms.entries(); }

    function markActivity(code) {
        const room = rooms.get(code);
        if (!room) return false;
        room.lastActivity = Date.now();
        room.emptySince = room.users.size === 0 ? (room.emptySince || Date.now()) : null;
        return true;
    }

    function removeIfEmpty(code) {
        const room = rooms.get(code);
        if (!room || room.users.size !== 0) return false;
        rooms.delete(code);
        return true;
    }

    function cleanupExpired(now = Date.now()) {
        const removed = [];
        for (const [code, room] of rooms) {
            if (room.users.size !== 0) continue;
            const since = room.emptySince || room.lastActivity || room.createdAt;
            if (now - since > emptyRoomTtl) {
                rooms.delete(code);
                removed.push(code);
            }
        }
        return removed;
    }

    return {
        size, has, get, create, verifyHostToken, createTrustedInvite, verifyTrustedInvite, audit,
        remove, entries, markActivity, removeIfEmpty, cleanupExpired
    };
}

module.exports = { createRoomService };
