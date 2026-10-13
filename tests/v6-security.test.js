const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRoomService } = require("../src/services/room-service");
const { parsePcmWav } = require("../src/routes/custom-sound-routes");
const { safeStringEqual } = require("../src/security/security-utils");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("V6 cria token de host e valida por hash", () => {
    const service = createRoomService({ maxRooms: 2, emptyRoomTtl: 1000 });
    const created = service.create();
    assert.equal(created.success, true);
    assert.ok(created.hostToken.length >= 32);
    assert.equal(service.verifyHostToken(created.code, created.hostToken), true);
    assert.equal(service.verifyHostToken(created.code, `${created.hostToken}x`), false);
    assert.notEqual(created.room.hostTokenHash, created.hostToken);
});

test("comparacao de token exige valores completos", () => {
    assert.equal(safeStringEqual("abc123", "abc123"), true);
    assert.equal(safeStringEqual("abc123", "abc124"), false);
    assert.equal(safeStringEqual("", ""), false);
});

test("validador WAV reconhece assets PCM e calcula duracao", () => {
    const buffer = fs.readFileSync(path.join(root, "sounds", "bonk.wav"));
    const info = parsePcmWav(buffer);
    assert.ok(info);
    assert.equal(info.format, 1);
    assert.ok(info.duration > 0);
});

test("paginas principais nao possuem script ou style inline", () => {
    for (const file of ["index.html", "room.html", "activity.html", "activity-room.html"]) {
        const source = read(file);
        assert.doesNotMatch(source, /<style[\s>]/i, `${file} ainda possui style inline`);
        assert.doesNotMatch(source, /<script(?![^>]*\bsrc=)[^>]*>/i, `${file} ainda possui script inline`);
    }
});

test("CSP V6 nao permite unsafe-inline em scripts", () => {
    const source = read("src/middleware/http-security.js");
    assert.match(source, /scriptSrc:\s*\["'self'"\]/);
    assert.doesNotMatch(source, /scriptSrc:[\s\S]{0,100}unsafe-inline/);
});

test("segurança continua externalizada na base atual", () => {
    assert.match(read("room.html"), /hl-social-v11\.css\?v=111/);
    assert.match(read("activity-room.html"), /hl-social-v11\.css\?v=111/);
    const staticFiles = read("src/middleware/static-files.js");
    for (const file of ["hl-social-v11.css", "hl-social-v11.js", "home.js", "room-core.js", "activity-room-core.js"]) {
        assert.match(staticFiles, new RegExp(file.replace(".", "\\.")));
    }
});

test("cliente envia token de host e token efemero protege upload", () => {
    assert.match(read("home.js"), /hl_host_token_/);
    assert.match(read("room-core.js"), /hostToken:/);
    assert.match(read("hl-social-v11.js"), /x-hl-room-token/);
    assert.match(read("src/routes/custom-sound-routes.js"), /safeStringEqual\(apiToken, socket\.data\.roomApiToken\)/);
});

test("origin guard aceita mesma origem e bloqueia origem externa", () => {
    const { isTrustedOrigin, isTrustedSocketOrigin } = require("../src/security/origin-guard");
    const base = {
        method: "POST",
        headers: { host: "hl.example.com", origin: "https://hl.example.com", "x-forwarded-proto": "https" },
        socket: { encrypted: false }
    };
    assert.equal(isTrustedOrigin(base, { NODE_ENV: "production" }), true);
    assert.equal(isTrustedOrigin({ ...base, headers: { ...base.headers, origin: "https://evil.example" } }, { NODE_ENV: "production" }), false);
    assert.equal(isTrustedSocketOrigin(base, { NODE_ENV: "production" }), true);
    assert.equal(isTrustedSocketOrigin({ ...base, headers: { host: "hl.example.com", "x-forwarded-proto": "https" } }, { NODE_ENV: "production" }), false);
});

test("Soundboard Pro expoe upload seguro e filtros", () => {
    const source = read("hl-social-v11.js");
    assert.match(source, /id="hlSoundAdd"/);
    assert.match(source, /id="hlSoundFile"/);
    assert.match(source, /OfflineAudioContext|webkitOfflineAudioContext/);
    assert.match(source, /data-sound-filter="favorites"/);
    assert.match(source, /data-sound-filter="recent"/);
    assert.match(source, /x-hl-room-token/);
});
