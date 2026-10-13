const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const room = read('room.html');
const activityRoom = read('activity-room.html');
const js = read('hl-social-v11.js');
const css = read('hl-social-v11.css');
const sw = read('sw.js');
const serverFiles = [
  'src/socket/social-events.js',
  'src/socket/chat-events.js',
  'src/socket/voice-events.js',
  'src/socket/stream-events.js',
  'src/socket/webrtc-signaling.js'
].map(read).join('\n');

test('V11.1 publica somente a camada social nova nas salas', () => {
  assert.match(room, /hl-social-v11\.css\?v=111/);
  assert.match(room, /hl-social-v11\.js\?v=111/);
  assert.match(activityRoom, /hl-social-v11\.css\?v=111/);
  assert.match(activityRoom, /hl-social-v11\.js\?v=111/);
  assert.doesNotMatch(room, /hl-social\.css/);
  assert.doesNotMatch(room, /hl-social\.js/);
  assert.doesNotMatch(room, /hl-v(?:4|5|6|7|9)\.css/);
});

test('V11.1 controla abas por estado JS e hidden', () => {
  assert.match(js, /view\.hidden = !active/);
  assert.match(js, /view\.setAttribute\("aria-hidden"/);
  assert.match(js, /panel\.querySelectorAll\("\.hl-social-view"\)/);
  assert.match(js, /data-view="voice" role="tabpanel" hidden/);
  assert.match(js, /data-view="sounds" role="tabpanel" hidden/);
  assert.match(css, /\.hl-social-view\[hidden\][\s\S]*display:\s*none\s*!important/);
});

test('V11.1 Soundboard tem scroll próprio, duas colunas desktop e uma mobile', () => {
  assert.match(css, /\.hl-sound-grid[\s\S]*overflow-y:\s*auto\s*!important/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\s*!important/);
  assert.match(css, /@media \(max-width:\s*650px\)[\s\S]*\.hl-sound-grid[\s\S]*grid-template-columns:1fr\s*!important/);
  assert.match(js, /Air Horn/);
  assert.match(js, /Vitória/);
  assert.match(js, /Falha/);
  assert.match(js, /Bonk/);
  assert.match(js, /Pop/);
  assert.match(js, /Suspense/);
});

test('V11.1 possui exatamente um handler servidor de reaction:send', () => {
  const matches = serverFiles.match(/socket\.on\(["']reaction:send["']/g) || [];
  assert.equal(matches.length, 1);
});

test('V11.1 reação fica ancorada ao palco e performance não a oculta', () => {
  assert.match(js, /stageEl\.getBoundingClientRect\(\)/);
  assert.match(js, /reactionLayer\.style\.setProperty\("left"/);
  assert.match(css, /\.hl11-reaction-layer[\s\S]*position:\s*fixed\s*!important/);
  assert.match(css, /\.hl11-floating-reaction[\s\S]*right:\s*18px\s*!important[\s\S]*bottom:\s*18px\s*!important/);
  assert.match(css, /hl-performance[\s\S]*\.hl11-floating-reaction[\s\S]*display:\s*block\s*!important/);
});

test('V11.1 atualiza cache PWA da camada social', () => {
  assert.match(sw, /hl-activity-v11-1-social-foundation/);
  assert.match(sw, /hl-social-v11\.css\?v=111/);
  assert.match(sw, /hl-social-v11\.js\?v=111/);
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /api\/socket\.io/);
});
