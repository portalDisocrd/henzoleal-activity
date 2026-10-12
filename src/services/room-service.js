const { generateRoomCode } = require("../utils/room-utils");
const { randomToken, hashToken, safeTokenMatch } = require("../security/security-utils");

const INVITE_TTLS = new Set([15 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000, 7 * 24 * 60 * 60 * 1000]);

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
            roomPasswordHash: null,
            trustedInviteHash: null,
            invites: new Map(),
            pendingGuests: new Map(),
            bannedClients: new Map(),
            spotlightId: null,
            soundboardPolicy: "everyone",
            soundUploadPolicy: "everyone",
            customSounds: new Map(),
            customSoundBytes: 0,
            users: new Map(),
            messages: [],
            activityFeed: [],
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

    function createInvite(code, options = {}) {
        const room = rooms.get(code);
        if (!room) return null;
        const token = randomToken(24);
        const tokenHash = hashToken(token);
        const requestedTtl = Number(options.ttlMs);
        const ttlMs = INVITE_TTLS.has(requestedTtl) ? requestedTtl : 60 * 60 * 1000;
        const invite = {
            trusted: options.trusted !== false,
            oneTime: Boolean(options.oneTime),
            createdAt: Date.now(),
            expiresAt: Date.now() + ttlMs,
            used: false
        };
        room.invites.set(tokenHash, invite);
        if (room.invites.size > 40) {
            const oldest = room.invites.keys().next().value;
            room.invites.delete(oldest);
        }
        return { token, ...invite };
    }

    function verifyInvite(code, token, { consume = false } = {}) {
        const room = rooms.get(code);
        if (!room || !token) return null;
        const key = hashToken(token);
        const invite = room.invites.get(key);
        if (!invite) return null;
        if (invite.expiresAt <= Date.now() || (invite.oneTime && invite.used)) {
            room.invites.delete(key);
            return null;
        }
        if (consume && invite.oneTime) invite.used = true;
        return { ...invite };
    }

    function setRoomPassword(code, password) {
        const room = rooms.get(code);
        if (!room) return false;
        const value = String(password || "").trim();
        room.roomPasswordHash = value ? hashToken(value) : null;
        return true;
    }

    function verifyRoomPassword(code, password) {
        const room = rooms.get(code);
        if (!room) return false;
        if (!room.roomPasswordHash) return true;
        return safeTokenMatch(String(password || ""), room.roomPasswordHash);
    }

    function audit(code, entry) {
        const room = rooms.get(code);
        if (!room) return false;
        room.auditLog ||= [];
        room.auditLog.push({ at: Date.now(), ...entry });
        if (room.auditLog.length > 180) room.auditLog.splice(0, room.auditLog.length - 180);
        return true;
    }

    function activity(code, entry) {
        const room = rooms.get(code);
        if (!room) return null;
        const item = { id: randomToken(8), at: Date.now(), ...entry };
        room.activityFeed ||= [];
        room.activityFeed.push(item);
        if (room.activityFeed.length > 60) room.activityFeed.splice(0, room.activityFeed.length - 60);
        return item;
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
            for (const [key, invite] of room.invites || []) {
                if (invite.expiresAt <= now || (invite.oneTime && invite.used)) room.invites.delete(key);
            }
            for (const [clientId, until] of room.bannedClients || []) {
                if (Number(until) <= now) room.bannedClients.delete(clientId);
            }
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
        size, has, get, create, verifyHostToken, createTrustedInvite, verifyTrustedInvite,
        createInvite, verifyInvite, setRoomPassword, verifyRoomPassword, audit, activity,
        remove, entries, markActivity, removeIfEmpty, cleanupExpired
    };
}

module.exports = { createRoomService, INVITE_TTLS };
