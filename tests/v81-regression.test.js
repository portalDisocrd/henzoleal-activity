const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const social = fs.readFileSync(path.join(root, "hl-social.js"), "utf8");
const room = fs.readFileSync(path.join(root, "room.html"), "utf8");
const activityRoom = fs.readFileSync(path.join(root, "activity-room.html"), "utf8");

function hasCatalogItem(id) {
  return new RegExp(`\\["${id}"`).test(social);
}

test("V8.1 declara controles administrativos antes de usa-los", () => {
  assert.match(social, /const soundConfig = document\.getElementById\("hlSoundConfig"\)/);
  assert.match(social, /const soundSettingsClose = document\.getElementById\("hlSoundSettingsClose"\)/);
});

test("V8.1 preserva os seis sons padrao", () => {
  for (const id of ["airhorn", "victory", "fail", "bonk", "pop", "suspense"]) assert.equal(hasCatalogItem(id), true, id);
});

test("V8.1+ mantém cache-bust do hl-social", () => {
  assert.match(room, /hl-social\.js\?v=8[12]/);
  assert.match(activityRoom, /hl-social\.js\?v=8[12]/);
});

test("V8.1 preserva handlers de reacao e modo", () => {
  assert.match(social, /hlReactionQuick/);
  assert.match(social, /data-reaction/);
  assert.match(social, /hlModeQuick/);
});
