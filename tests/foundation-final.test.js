const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { extractClientIp } = require("../src/security/socket-security");
const { DEFAULT_POLICIES } = require("../src/socket/rate-limiter");
const { maskedRoom } = require("../src/routes/room-routes");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Foundation final usa ultimo hop X-Forwarded-For no limite de socket", () => {
  assert.equal(extractClientIp({ "x-forwarded-for": "198.51.100.10, 203.0.113.77" }, "10.0.0.2"), "203.0.113.77");
  assert.equal(extractClientIp({}, "::ffff:127.0.0.1"), "127.0.0.1");
});

test("Foundation final limita leituras e eventos sociais de baixo custo", () => {
  for (const event of ["social:state", "chat:history", "diagnostics:ping", "presence:update", "voice:speaking"]) {
    assert.ok(DEFAULT_POLICIES[event], `policy ausente: ${event}`);
    assert.ok(DEFAULT_POLICIES[event].max > 0);
  }
  assert.match(read("src/socket/social-events.js"), /allowSocketEvent\(socket, "social:state"\)/);
  assert.match(read("src/socket/chat-events.js"), /allowSocketEvent\(socket, "chat:history"\)/);
});

test("voice speaking nao dispara broadcast completo de participantes a cada amostra", () => {
  const source = read("src/socket/voice-events.js");
  const start = source.indexOf('socket.on("voice:speaking"');
  const end = source.indexOf('socket.on("voice:offer"', start);
  const block = source.slice(start, end);
  assert.match(block, /allowSocketEvent\(socket,"voice:speaking"\)/);
  assert.doesNotMatch(block, /updateParticipants\(/);
  assert.match(block, /emit\("voice:speaking"/);
});

test("logs HTTP nao usam query string e sala criada fica mascarada", () => {
  const finalHandlers = read("src/middleware/final-handlers.js");
  assert.match(finalHandlers, /req\.path/);
  assert.match(finalHandlers, /log\("error", "http\.error"/);
  assert.doesNotMatch(finalHandlers, /console\.error\(/);
  assert.equal(maskedRoom("ABCDEF12"), "ABC***");
});

test("documentacao final explicita limitacoes de seguranca e testes de campo", () => {
  const security = read("docs/SECURITY.md");
  const finalDoc = read("docs/FOUNDATION-FINAL.md");
  assert.match(security, /Limitações conhecidas/);
  assert.match(security, /clientId/);
  assert.match(finalDoc, /Não validado automaticamente/);
  assert.match(finalDoc, /TURN/);
  assert.match(finalDoc, /duas máquinas físicas/);
});
