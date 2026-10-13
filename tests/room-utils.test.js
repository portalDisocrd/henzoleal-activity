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
    assert.deepEqual(user, { id: "sock1", name: "A", avatar: "😎", streaming: true, role: "host", voiceJoined: true, muted: false, deaf: false });
    assert.equal("secret" in user, false);
});
