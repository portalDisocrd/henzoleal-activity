const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("foundation Lote C separa lifecycle, perfil e participantes do room core", () => {
  for (const relative of [
    "frontend/room/room-lifecycle.js",
    "frontend/room/profile/profile-controller.js",
    "frontend/room/participants/participants-controller.js"
  ]) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, `${relative} deveria existir`);
  }

  const core = read("room-core.js");
  assert.match(core, /HLRoomLifecycle/);
  assert.match(core, /HLProfileController/);
  assert.match(core, /HLParticipantsController/);
  assert.doesNotMatch(core, /function\s+loadProfile\s*\(/);
  assert.doesNotMatch(core, /function\s+renderParticipants\s*\(/);
  assert.doesNotMatch(core, /function\s+isRemoteAvatarUrl\s*\(/);
});

test("modulos de sala carregam antes do room-core em Web e Activity", () => {
  for (const relative of ["room.html", "activity-room.html"]) {
    const html = read(relative);
    const coreIndex = html.indexOf("/room-core.js");
    assert.ok(coreIndex > 0);

    for (const asset of [
      "/frontend/room/room-lifecycle.js",
      "/frontend/room/profile/profile-controller.js",
      "/frontend/room/participants/participants-controller.js"
    ]) {
      const index = html.indexOf(asset);
      assert.ok(index > 0, `${asset} deveria ser carregado em ${relative}`);
      assert.ok(index < coreIndex, `${asset} deve carregar antes de room-core em ${relative}`);
    }
  }
});

test("room lifecycle possui estados explicitos e telemetria DOM", () => {
  const lifecycle = read("frontend/room/room-lifecycle.js");
  for (const state of [
    "pre-entry",
    "joining",
    "joined",
    "waiting",
    "reconnecting",
    "error",
    "leaving",
    "closed"
  ]) {
    assert.ok(lifecycle.includes(`"${state}"`), `estado ${state} ausente`);
  }
  assert.match(lifecycle, /hl:room-state/);
  assert.match(lifecycle, /dataset\.hlRoomState/);
});

test("profile controller centraliza persistencia, cleanup e avatar", () => {
  const profile = read("frontend/room/profile/profile-controller.js");
  assert.match(profile, /sessionStorage\.getItem/);
  assert.match(profile, /sessionStorage\.setItem/);
  assert.match(profile, /HLRoomEntry\?\.stop/);
  assert.match(profile, /removeEventListener/);
  assert.match(profile, /renderAvatar/);
});

test("participants controller possui estado proprio e cleanup", () => {
  const participants = read("frontend/room/participants/participants-controller.js");
  assert.match(participants, /new Map\(\)/);
  assert.match(participants, /function replace/);
  assert.match(participants, /function render/);
  assert.match(participants, /function destroy/);
});
