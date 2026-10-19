const test = require("node:test");
const assert = require("node:assert/strict");
const { createVoiceEvents } = require("../src/socket/voice-events");

function fakeSocket(id, roomCode = "AB12CD34") {
  const handlers = new Map();
  const emitted = [];
  return {
    id,
    data: { roomCode },
    handlers,
    emitted,
    on(name, handler) { handlers.set(name, handler); },
    emit(name, payload) { emitted.push([name, payload]); },
    to(room) {
      return { emit(name, payload) { emitted.push([`to:${room}:${name}`, payload]); } };
    }
  };
}

test("voice join and leave acknowledge payload-plus-callback Socket.IO events", () => {
  const socket = fakeSocket("s1");
  const room = {
    users: new Map([
      ["s1", { name: "Host", role: "host", voiceJoined: false }],
      ["s2", { name: "Membro", role: "member", voiceJoined: true }]
    ])
  };
  const io = {
    to(roomCode) {
      return { emit(name, payload) { socket.emitted.push([`${roomCode}:${name}`, payload]); } };
    }
  };
  const roomService = {
    get: () => room,
    activity: () => null
  };
  const events = createVoiceEvents({
    io,
    roomService,
    allowSocketEvent: () => true,
    getSafeTargetSocket: () => null,
    isPlainObject: value => Boolean(value && typeof value === "object"),
    isValidDescription: () => true,
    isValidCandidate: () => true
  });
  let participantUpdates = 0;
  events.register(socket, () => { participantUpdates += 1; });

  let joinAck;
  socket.handlers.get("voice:join")({}, result => { joinAck = result; });
  assert.deepEqual(joinAck, { success: true, peers: [{ id: "s2", name: "Membro", avatar: undefined, muted: false, deaf: false, role: "member", status: "online" }] });
  assert.equal(room.users.get("s1").voiceJoined, true);

  let leaveAck;
  socket.handlers.get("voice:leave")({}, result => { leaveAck = result; });
  assert.deepEqual(leaveAck, { success: true });
  assert.equal(room.users.get("s1").voiceJoined, false);
  assert.equal(participantUpdates, 2);
});
