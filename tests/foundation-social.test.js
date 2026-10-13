const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createChatEvents } = require("../src/socket/chat-events");
const { normalizeText } = require("../src/utils/validation");
const { roomOwnershipKey } = require("../src/security/security-utils");

function fakeSocket(id, roomCode = "AB12CD34", clientId = "client-stable") {
  const handlers = new Map();
  return {
    id,
    data: { roomCode, clientId },
    handlers,
    on(name, fn) { handlers.set(name, fn); },
    emit() {},
    to() { return { emit() {} }; }
  };
}

function fakeIo() {
  const emitted = [];
  return { emitted, to(room) { return { emit(name, payload) { emitted.push([room, name, payload]); } }; } };
}

test("Lote E preserva autoria do chat depois de reconnect", () => {
  const io = fakeIo();
  const roomCode = "AB12CD34";
  const clientId = "client-stable";
  const room = {
    users: new Map(),
    messages: [],
    lastActivity: 0
  };
  const roomService = { get: () => room };
  const factory = createChatEvents({ io, roomService, allowSocketEvent: () => true, normalizeText, updateParticipants: () => {} });

  const first = fakeSocket("socket-old", roomCode, clientId);
  room.users.set(first.id, { name: "Lucas", avatar: "😎", role: "member", clientId });
  factory.register(first);
  let sendAck;
  first.handlers.get("chat:send")({ text: "mensagem original" }, value => { sendAck = value; });
  assert.equal(sendAck.success, true);
  assert.equal(room.messages[0].authorKey, roomOwnershipKey(roomCode, clientId));

  room.users.delete(first.id);
  const second = fakeSocket("socket-new", roomCode, clientId);
  room.users.set(second.id, { name: "Lucas", avatar: "😎", role: "member", clientId });
  factory.register(second);

  let editAck;
  second.handlers.get("chat:edit")({ id: room.messages[0].id, text: "editada depois do reconnect" }, value => { editAck = value; });
  assert.equal(editAck.success, true);
  assert.equal(room.messages[0].text, "editada depois do reconnect");

  let deleteAck;
  second.handlers.get("chat:delete")({ id: room.messages[0].id }, value => { deleteAck = value; });
  assert.equal(deleteAck.success, true);
  assert.equal(room.messages.length, 0);
});

test("Lote E usa identidade estavel para toggle de reação no chat", () => {
  const io = fakeIo();
  const roomCode = "AB12CD34";
  const clientId = "same-browser";
  const message = {
    id: "m1",
    authorId: "other",
    authorKey: "other-key",
    authorName: "Outro",
    authorAvatar: "🙂",
    text: "oi",
    createdAt: Date.now(),
    reactions: {},
    reactionUsers: {}
  };
  const room = { users: new Map(), messages: [message] };
  const roomService = { get: () => room };
  const factory = createChatEvents({ io, roomService, allowSocketEvent: () => true, normalizeText, updateParticipants: () => {} });

  const first = fakeSocket("s1", roomCode, clientId);
  room.users.set("s1", { name: "Lucas", role: "member", clientId });
  factory.register(first);
  first.handlers.get("chat:react")({ id: "m1", emoji: "🔥" }, () => {});
  assert.equal(message.reactions["🔥"], 1);

  room.users.delete("s1");
  const second = fakeSocket("s2", roomCode, clientId);
  room.users.set("s2", { name: "Lucas", role: "member", clientId });
  factory.register(second);
  second.handlers.get("chat:react")({ id: "m1", emoji: "🔥" }, () => {});
  assert.equal(message.reactions["🔥"], undefined);
});

test("Lote E frontend usa autoria estável, timers de typing e reconnect de voz após room:joined", () => {
  const root = path.join(__dirname, "..");
  const chat = fs.readFileSync(path.join(root, "frontend/social/chat/chat-module.js"), "utf8");
  const voice = fs.readFileSync(path.join(root, "frontend/social/voice/voice-controller.js"), "utf8");
  const runtime = fs.readFileSync(path.join(root, "frontend/social/social-runtime.js"), "utf8");
  const soundboard = fs.readFileSync(path.join(root, "frontend/social/soundboard/soundboard-controller.js"), "utf8");

  assert.match(chat, /message\.authorKey\s*&&\s*state\.ownershipKey/);
  assert.match(chat, /const typingTimers = new Map\(\)/);
  assert.match(chat, /typingTimers\.forEach\(timer => clearTimeout\(timer\)\)/);
  assert.match(voice, /let joiningVoice = false/);
  assert.match(voice, /function handleRoomJoined\(\)/);
  assert.match(runtime, /voiceController\?\.handleRoomJoined\?\.\(\)/);
  assert.doesNotMatch(runtime, /handleReconnect\?\.\(\)/);
  assert.match(soundboard, /socket\.emit\("sound:play"[\s\S]*await playSound\(soundId, true\)/);
});

test("Lote E corrige actorId das atividades sociais", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src/socket/social-events.js"), "utf8");
  assert.match(source, /socketId:\s*socket\.id/);
  assert.doesNotMatch(source, /c\.user\s*\?\s*c\.user\.id/);
});
