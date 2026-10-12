const { generateRoomCode } = require("../utils/room-utils");

function createRoomService({ maxRooms, emptyRoomTtl }) {
    const rooms = new Map();

    function size() { return rooms.size; }
    function has(code) { return rooms.has(code); }
    function get(code) { return rooms.get(code); }

    function create() {
        if (rooms.size >= maxRooms) return { success: false, reason: "limit" };
        const code = generateRoomCode(rooms);
        const now = Date.now();
        const room = {
            createdAt: now,
            lastActivity: now,
            emptySince: now,
            hostId: null,
            locked: false,
            soundboardPolicy: "everyone",
            users: new Map(),
            messages: []
        };
        rooms.set(code, room);
        return { success: true, code, room };
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

    return { size, has, get, create, remove, entries, markActivity, removeIfEmpty, cleanupExpired };
}

module.exports = { createRoomService };
