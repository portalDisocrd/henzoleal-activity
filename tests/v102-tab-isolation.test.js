const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'hl-v102.css'), 'utf8');
const room = fs.readFileSync(path.join(root, 'room.html'), 'utf8');
const activityRoom = fs.readFileSync(path.join(root, 'activity-room.html'), 'utf8');
const staticFiles = fs.readFileSync(path.join(root, 'src/middleware/static-files.js'), 'utf8');

test('V10.2 isola views inativas do painel social', () => {
  assert.match(css, /\.hl-social-panel \.hl-social-view\.hl-sound-view\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.match(css, /\.hl-social-panel \.hl-social-view\.hl-sound-view\.is-active\s*\{[\s\S]*display:\s*grid\s*!important/);
});

test('V10.2 controla largura do painel desktop', () => {
  assert.match(css, /clamp\(360px,\s*25vw,\s*430px\)/);
  assert.match(css, /max-width:\s*430px\s*!important/);
});

test('V10.2 mantém soundboard mobile em uma coluna e com scroll interno', () => {
  assert.match(css, /grid-template-columns:\s*1fr\s*!important/);
  assert.match(css, /overflow-y:\s*auto\s*!important/);
});

test('V10.2 carrega folha final nas salas e publica asset', () => {
  assert.match(room, /hl-v102\.css\?v=102/);
  assert.match(activityRoom, /hl-v102\.css\?v=102/);
  assert.match(staticFiles, /\/hl-v102\.css/);
});
