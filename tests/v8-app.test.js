const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRoomService } = require("../src/services/room-service");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("V8 cria e valida convite confiavel sem armazenar token em texto puro", () => {
  const service = createRoomService({ maxRooms: 4, emptyRoomTtl: 1000 });
  const created = service.create();
  const token = service.createTrustedInvite(created.code);
  assert.ok(token && token.length > 20);
  assert.equal(service.verifyTrustedInvite(created.code, token), true);
  assert.equal(service.verifyTrustedInvite(created.code, token + "x"), false);
  assert.notEqual(service.get(created.code).trustedInviteHash, token);
});

test("V8 sala inicia com politica de entrada, modo e fila seguros", () => {
  const service = createRoomService({ maxRooms: 2, emptyRoomTtl: 1000 });
  const { code } = service.create();
  const room = service.get(code);
  assert.equal(room.entryPolicy, "auto");
  assert.equal(room.roomMode, "normal");
  assert.ok(room.pendingGuests instanceof Map);
});

test("V8 PWA possui manifest, service worker e icones", () => {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some(icon => icon.sizes === "192x192"));
  assert.ok(manifest.icons.some(icon => icon.sizes === "512x512"));
  assert.ok(fs.existsSync(path.join(root, "sw.js")));
  assert.ok(fs.statSync(path.join(root, "icon-192.png")).size > 1000);
  assert.ok(fs.statSync(path.join(root, "icon-512.png")).size > 1000);
});

test("service worker evita interceptar API e Socket.IO", () => {
  const sw = read("sw.js");
  assert.match(sw, /\/api\//);
  assert.match(sw, /socket\.io/);
  assert.match(sw, /request\.mode === "navigate"/);
});

test("paginas web carregam PWA e camada visual V8", () => {
  for (const file of ["index.html", "room.html", "activity-room.html"]) {
    const html = read(file);
    assert.match(html, /manifest\.webmanifest/);
    assert.match(html, /hl-v8\.css\?v=8/);
    assert.match(html, /hl-pwa\.js\?v=8/);
  }
  assert.match(read("index.html"), /home-v8\.js\?v=8/);
  assert.match(read("room.html"), /hl-v8\.js\?v=8/);
});

test("V8 implementa lobby seletivo e convite confiavel no servidor", () => {
  const join = read("src/socket/join-room.js");
  const social = read("src/socket/social-events.js");
  assert.match(join, /room:waiting/);
  assert.match(join, /verifyTrustedInvite/);
  assert.match(social, /room:approve-join/);
  assert.match(social, /room:reject-join/);
  assert.match(social, /room:create-trusted-invite/);
  assert.match(social, /approveUnknown/);
});

test("V8 cliente possui mixer, diagnostico, PWA, PiP e Wake Lock", () => {
  const js = read("hl-v8.js");
  for (const token of ["Smart ducking", "Diagnóstico", "Picture-in-Picture", "wakeLock", "HLPWA", "hl_recent_rooms", "Ctrl K"]) {
    assert.ok(js.includes(token), `esperava ${token}`);
  }
});

test("V8 pre-entrada testa microfone antes de seguir", () => {
  const js = read("home-v8.js");
  assert.match(js, /getUserMedia/);
  assert.match(js, /hlPrejoinMic/);
  assert.match(js, /hl_prejoin_muted/);
  assert.match(js, /originalCreate/);
  assert.match(js, /originalJoin/);
});
