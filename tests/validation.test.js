const test = require("node:test");
const assert = require("node:assert/strict");
const {
    normalizeText,
    isValidRoomCode,
    sanitizeRoomCode,
    sanitizeProfile,
    isValidDescription,
    isValidCandidate
} = require("../src/utils/validation");

test("normaliza e valida codigo de sala", () => {
    assert.equal(sanitizeRoomCode(" ab12cd34 "), "AB12CD34");
    assert.equal(isValidRoomCode("AB12CD34"), true);
    assert.equal(isValidRoomCode("ZZ12CD34"), false);
});

test("remove controles de texto", () => {
    assert.equal(normalizeText("  oi\u0000 mundo  ", 20), "oi mundo");
});

test("aceita avatar permitido e CDN do Discord", () => {
    assert.equal(sanitizeProfile({ name: "Lucas", avatar: "🐺" }).avatar, "🐺");
    const url = "https://cdn.discordapp.com/avatars/123456/avatar_hash.png?size=128";
    assert.equal(sanitizeProfile({ name: "Lucas", avatar: url }).avatar, url);
    assert.equal(sanitizeProfile({ name: "Lucas", avatar: "<script>" }).avatar, "😎");
});

test("valida SDP e ICE com limites", () => {
    assert.equal(isValidDescription({ type: "offer", sdp: "v=0" }, "offer"), true);
    assert.equal(isValidDescription({ type: "answer", sdp: "v=0" }, "offer"), false);
    assert.equal(isValidCandidate({ candidate: "candidate:1" }), true);
    assert.equal(isValidCandidate({ candidate: 123 }), false);
});
