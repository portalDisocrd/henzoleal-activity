const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");

test("Lote D estabelece ordem deterministica da cascade nas salas", () => {
  for (const file of ["room.html", "activity-room.html"]) {
    const html = read(file);
    const ordered = [
      "/styles/tokens.css",
      "/styles/components.css",
      "/styles/room.css",
      "/styles/room-entry.css",
      "/styles/product.css",
      "/styles/social-shell.css",
      "/styles/chat.css",
      "/styles/voice.css",
      "/styles/soundboard.css",
      "/styles/reactions.css",
      "/styles/social-responsive.css"
    ];
    let previous = -1;
    for (const asset of ordered) {
      const index = html.indexOf(asset);
      assert.ok(index > previous, `${asset} fora de ordem em ${file}`);
      previous = index;
    }
    assert.doesNotMatch(html, /v12-overrides\.css/);
  }
});

test("override temporario V12 saiu da producao", () => {
  assert.equal(fs.existsSync(path.join(root, "styles/v12-overrides.css")), false);
  for (const file of ["room.html", "activity-room.html", "index.html"]) {
    assert.doesNotMatch(read(file), /v12-overrides\.css/);
  }
});

test("pre-entrada possui stylesheet proprietario e saiu do room.css", () => {
  const room = read("styles/room.css");
  const entry = read("styles/room-entry.css");
  assert.doesNotMatch(room, /PROFILE UI V2/);
  assert.doesNotMatch(room, /#profileOverlay\s*\{/);
  assert.match(entry, /#profileOverlay\.hl-room-entry/);
  assert.match(entry, /\.hl-room-entry-device-grid/);
  assert.match(entry, /#enterRoom\.hl-room-entry-submit/);
});

test("tokens possuem layering sem backdrop cobrindo sheet", () => {
  const tokens = read("styles/tokens.css");
  for (const token of [
    "--hl-z-panel",
    "--hl-z-popover",
    "--hl-z-backdrop",
    "--hl-z-sheet",
    "--hl-z-modal-backdrop",
    "--hl-z-modal",
    "--hl-z-toast"
  ]) assert.match(tokens, new RegExp(token));

  const responsive = read("styles/social-responsive.css");
  assert.match(responsive, /hl-social-panel[\s\S]*--hl-z-sheet/);
  assert.match(responsive, /hl-social-backdrop[\s\S]*--hl-z-backdrop/);
});

test("camadas sociais possuem donos de z-index explicitos", () => {
  assert.match(read("styles/social-shell.css"), /hl-social-panel[\s\S]*--hl-z-panel/);
  assert.match(read("styles/social-shell.css"), /hl-more-menu[\s\S]*--hl-z-popover/);
  assert.match(read("styles/social-shell.css"), /hl-settings-panel[\s\S]*--hl-z-modal/);
  assert.match(read("styles/reactions.css"), /hl-reaction-picker[\s\S]*--hl-z-popover/);
  assert.match(read("styles/soundboard.css"), /hl-sound-modal[\s\S]*--hl-z-modal/);
});

test("CSS de producao continua sem important", () => {
  const stylesDir = path.join(root, "styles");
  const files = fs.readdirSync(stylesDir).filter(name => name.endsWith(".css"));
  const content = files.map(name => read(path.join("styles", name))).join("\n");
  assert.equal((content.match(/!important/g) || []).length, 0);
});
