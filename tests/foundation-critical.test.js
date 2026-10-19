const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("foundation usa versao local unica", () => {
  const { APP_VERSION } = require("../src/config/version");
  assert.equal(APP_VERSION, "12.0.7-foundation.8");
  assert.match(read("frontend/core/app-version.js"), /12\.0\.7-foundation\.8/);
  assert.match(read("sw.js"), /12\.0\.7-foundation\.8/);
});

test("shell PWA referencia apenas arquivos existentes", () => {
  const sw = read("sw.js");
  const shellBlock = sw.slice(sw.indexOf("const SHELL"), sw.indexOf("];", sw.indexOf("const SHELL")) + 2);
  const urls = [...shellBlock.matchAll(/"(\/[^"?]+)"/g)].map(match => match[1]).filter(url => url !== "/");
  for (const url of urls) {
    const relative = url.replace(/^\//, "");
    assert.ok(fs.existsSync(path.join(root, relative)), `asset ausente no SHELL: ${url}`);
  }
});

test("service worker nao referencia asset inexistente e nao pula espera automaticamente", () => {
  const sw = read("sw.js");
  assert.doesNotMatch(sw, /styles\/social\.css/);
  const installBlock = sw.slice(sw.indexOf('addEventListener("install"'), sw.indexOf('addEventListener("activate"'));
  assert.doesNotMatch(installBlock, /skipWaiting\(/);
  assert.match(sw, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(sw, /client-config\.js/);
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
});

test("version guard compara frontend e backend", () => {
  const guard = read("frontend/core/version-guard.js");
  assert.match(guard, /fetch\("\/api\/version"/);
  assert.match(guard, /remoteVersion !== localVersion/);
  assert.match(read("index.html"), /frontend\/core\/version-guard\.js/);
  assert.match(read("room.html"), /frontend\/core\/version-guard\.js/);
  assert.match(read("activity-room.html"), /frontend\/core\/version-guard\.js/);
});

test("share bridge exige sala existente", () => {
  const routes = read("src/routes/page-routes.js");
  const share = routes.slice(routes.indexOf('"/share/:code"'), routes.indexOf("// =============================================\n    // ABRIR SALA"));
  assert.match(share, /roomService\.has/);
  assert.match(share, /status\(404\)/);
});

test("cliente trata room-error e servidor envia codigos", () => {
  const core = read("room-core.js");
  const join = read("src/socket/join-room.js");
  assert.match(core, /socket\.on\("room-error"/);
  for (const code of ["ROOM_NOT_FOUND", "ROOM_FULL", "ROOM_LOCKED", "ROOM_BANNED"]) {
    assert.match(join, new RegExp(code));
  }
});

test("ownership do soundboard usa identidade estavel por sala", () => {
  const routes = read("src/routes/custom-sound-routes.js");
  const security = read("src/security/security-utils.js");
  const soundboard = read("frontend/social/soundboard/soundboard-controller.js");
  assert.match(security, /function roomOwnershipKey/);
  assert.match(routes, /roomOwnershipKey\(roomCode, user\.clientId\)/);
  assert.doesNotMatch(routes, /ownerId:\s*socket\.id/);
  assert.match(soundboard, /state\.ownershipKey/);
});

test("pre-entrada oficial fica na sala e possui cleanup", () => {
  const home = read("frontend/home/home-enhancements.js");
  const roomEntry = read("frontend/core/room-entry.js");
  const core = read("room-core.js");
  const profileController = read("frontend/room/profile/profile-controller.js");
  assert.doesNotMatch(home, /buildPrejoin|hl-prejoin-card|showPrejoin/);
  assert.match(roomEntry, /window\.HLRoomEntry/);
  assert.match(roomEntry, /function destroy\(/);
  assert.match(profileController, /window\.HLRoomEntry\?\.stop/);
  assert.match(core, /let entryConfirmed = false/);
  assert.match(core, /!entryConfirmed/);
  assert.doesNotMatch(core, /JSON\.parse\(saved\);\s*joinRoom\(\)/);
});

test("pre-entrada da sala oferece microfone e saida", () => {
  for (const file of ["room.html", "activity-room.html"]) {
    const html = read(file);
    assert.match(html, /id="hlRoomEntryMic"/);
    assert.match(html, /id="hlRoomEntryOutput"/);
    assert.match(html, /id="hlRoomEntryMicTest"/);
    assert.match(html, /id="hlRoomEntryOutputTest"/);
  }
});
