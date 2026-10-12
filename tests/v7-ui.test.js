const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('V7 carrega o CSS final nas duas salas', () => {
  assert.match(read('room.html'), /hl-v7\.css\?v=7/);
  assert.match(read('activity-room.html'), /hl-v7\.css\?v=7/);
  assert.match(read('src/middleware/static-files.js'), /hl-v7\.css/);
});

test('V7 recolhe configuracoes administrativas do soundboard', () => {
  const source = read('hl-social.js');
  assert.match(source, /id="hlSoundConfig"/);
  assert.match(source, /Configurações do Soundboard/);
  assert.match(source, /function setSoundSettings\(open\)/);
  assert.match(source, /soundPolicyWrap\.hidden = !open/);
});

test('V7 elimina controles nativos brancos e define layout mobile do soundboard', () => {
  const css = read('hl-v7.css');
  assert.match(css, /appearance:\s*none/);
  assert.match(css, /@media \(max-width: 650px\)/);
  assert.match(css, /\.hl-sound-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*!important/);
  assert.match(css, /\.hl-sound-search[\s\S]*?background:\s*#0a101a\s*!important/);
});

test('V7 mostra valor do volume e preserva filtros do soundboard', () => {
  const source = read('hl-social.js');
  assert.match(source, /id="hlSoundVolumeValue"/);
  assert.match(source, /syncSoundVolumeUI/);
  for (const filter of ['all','favorites','custom','recent']) {
    assert.match(source, new RegExp(`data-sound-filter="${filter}"`));
  }
});
