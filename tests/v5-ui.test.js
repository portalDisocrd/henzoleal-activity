const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('V5 CSS existe e e carregado pela sala', () => {
  assert.equal(fs.existsSync(path.join(root, 'hl-v5.css')), true);
  assert.match(read('room.html'), /hl-v5\.css\?v=5/);
  assert.match(read('activity-room.html'), /hl-v5\.css\?v=5/);
});

test('V5 social possui seletor de dispositivos e reacoes', () => {
  const source = read('hl-social.js');
  assert.match(source, /id="hlMicSelect"/);
  assert.match(source, /id="hlOutputSelect"/);
  assert.match(source, /id="hlReactionPicker"/);
  assert.match(source, /navigator\.mediaDevices/);
});

test('servidor publica somente o CSS V5 explicitamente', () => {
  const source = read('src/middleware/static-files.js');
  assert.match(source, /\["\/hl-v5\.css", "hl-v5\.css"\]/);
});
