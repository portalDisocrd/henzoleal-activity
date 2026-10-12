const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sounds = ["airhorn", "victory", "fail", "bonk", "pop", "suspense"];

test("soundboard possui assets WAV validos", () => {
  for (const id of sounds) {
    const file = path.join(__dirname, "..", "sounds", `${id}.wav`);
    assert.equal(fs.existsSync(file), true, `${id}.wav ausente`);
    const buffer = fs.readFileSync(file);
    assert.ok(buffer.length > 1000, `${id}.wav vazio`);
    assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(buffer.subarray(8, 12).toString("ascii"), "WAVE");
  }
});
