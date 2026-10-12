const test = require("node:test");
const assert = require("node:assert/strict");
const { createRoomService } = require("../src/services/room-service");

test("cria sala com codigo unico e estado social", () => {
    const service = createRoomService({ maxRooms: 2, emptyRoomTtl: 1000 });
    const first = service.create();
    const second = service.create();
    assert.equal(first.success, true);
    assert.match(first.code, /^[A-F0-9]{8}$/);
    assert.notEqual(first.code, second.code);
    assert.equal(first.room.soundboardPolicy, "everyone");
    assert.equal(first.room.hostId, null);
    assert.ok(first.room.users instanceof Map);
    assert.ok(Array.isArray(first.room.messages));
});

test("respeita limite de salas", () => {
    const service = createRoomService({ maxRooms: 1, emptyRoomTtl: 1000 });
    assert.equal(service.create().success, true);
    assert.deepEqual(service.create(), { success: false, reason: "limit" });
});

test("remove sala vazia expirada", () => {
    const service = createRoomService({ maxRooms: 2, emptyRoomTtl: 10 });
    const created = service.create();
    created.room.emptySince = 1;
    const removed = service.cleanupExpired(100);
    assert.deepEqual(removed, [created.code]);
    assert.equal(service.has(created.code), false);
});
