const test = require("node:test");
const assert = require("node:assert/strict");
const { generateRoomCode, getParticipants } = require("../src/utils/room-utils");

test("generateRoomCode segue formato esperado", () => {
    const rooms = new Map();
    const code = generateRoomCode(rooms);
    assert.match(code, /^[A-F0-9]{8}$/);
});

test("getParticipants devolve apenas estado publico", () => {
    const room = { users: new Map([["sock1", { name: "A", avatar: "😎", role: "host", streaming: true, voiceJoined: true, muted: false, deaf: false, secret: "x" }]]) };
    const [user] = getParticipants(room);
    assert.equal(user.id, "sock1");
    assert.equal(user.name, "A");
    assert.equal(user.avatar, "😎");
    assert.equal(user.streaming, true);
    assert.equal(user.role, "host");
    assert.equal(user.voiceJoined, true);
    assert.equal(user.muted, false);
    assert.equal(user.deaf, false);
    assert.equal(user.status, "online");
    assert.equal(user.activity, "Transmitindo");
    assert.equal(typeof user.lastActive, "number");
    assert.equal(user.soundBlocked, false);
    assert.equal(user.streamBlocked, false);
    assert.equal(user.spotlighted, false);
    assert.equal("secret" in user, false);
});
