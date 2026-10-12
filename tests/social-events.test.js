const test = require("node:test");
const assert = require("node:assert/strict");
const { createChatEvents } = require("../src/socket/chat-events");
const { createSocialEvents } = require("../src/socket/social-events");
const { normalizeText } = require("../src/utils/validation");

function fakeSocket(id, roomCode = "AB12CD34") {
    const handlers = new Map();
    const emitted = [];
    return {
        id,
        data: { roomCode },
        handlers,
        emitted,
        on(name, fn) { handlers.set(name, fn); },
        emit(name, payload) { emitted.push([name, payload]); },
        to() { return { emit(name, payload) { emitted.push([`to:${name}`, payload]); } }; },
        disconnect() { this.disconnected = true; }
    };
}

function fakeIo() {
    const emitted = [];
    return {
        emitted,
        to(room) { return { emit(name, payload) { emitted.push([room, name, payload]); } }; }
    };
}

test("chat envia mensagem com id e historico limitado", () => {
    const io = fakeIo();
    const socket = fakeSocket("s1");
    const room = { users: new Map([["s1", { name: "Lucas", avatar: "😎", role: "host" }]]), messages: [], lastActivity: 0 };
    const roomService = { get: () => room };
    const chat = createChatEvents({ io, roomService, allowSocketEvent: () => true, normalizeText, updateParticipants: () => {} });
    chat.register(socket);
    let result;
    socket.handlers.get("chat:send")({ text: "Olá <b>mundo</b>" }, value => { result = value; });
    assert.equal(result.success, true);
    assert.equal(room.messages.length, 1);
    assert.match(room.messages[0].id, /^[0-9a-f-]{36}$/i);
    assert.equal(room.messages[0].text, "Olá <b>mundo</b>");
    assert.equal(io.emitted[0][1], "chat:message");
});

test("soundboard respeita politica da sala", () => {
    const io = fakeIo();
    const host = fakeSocket("host");
    const member = fakeSocket("member");
    const room = {
        hostId: "host",
        soundboardPolicy: "everyone",
        locked: false,
        users: new Map([
            ["host", { name: "Host", role: "host" }],
            ["member", { name: "Membro", role: "member" }]
        ])
    };
    const roomService = { get: () => room };
    const sockets = new Map([["host", host], ["member", member]]);
    const getSafeTargetSocket = (source, target) => target !== source.id ? sockets.get(target) : null;
    const factory = createSocialEvents({ io, roomService, allowSocketEvent: () => true, getSafeTargetSocket, normalizeText });
    factory.register(host, () => {});
    factory.register(member, () => {});

    let play;
    member.handlers.get("sound:play")({ soundId: "bonk" }, value => { play = value; });
    assert.equal(play.success, true);

    let policy;
    host.handlers.get("moderation:sound-policy")({ policy: "disabled" }, value => { policy = value; });
    assert.equal(policy.success, true);
    assert.equal(room.soundboardPolicy, "disabled");

    member.data.lastSoundAt = 0;
    member.handlers.get("sound:play")({ soundId: "bonk" }, value => { play = value; });
    assert.equal(play.success, false);
});
