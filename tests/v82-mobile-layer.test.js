const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const social = fs.readFileSync(path.join(root, 'hl-social.js'), 'utf8');
const v8css = fs.readFileSync(path.join(root, 'hl-v8.css'), 'utf8');
const room = fs.readFileSync(path.join(root, 'room.html'), 'utf8');

test('V8.2 move painel e backdrop para o body em telas menores', () => {
  assert.match(social, /matchMedia\("\(max-width: 920px\)"\)/);
  assert.match(social, /document\.body\.appendChild\(socialBackdrop\)/);
  assert.match(social, /document\.body\.appendChild\(panel\)/);
});

test('V8.2 mantém painel acima do backdrop no mobile', () => {
  assert.match(v8css, /body > \.hl-social-backdrop \{ z-index: 1080 !important; \}/);
  assert.match(v8css, /body > \.hl-social-panel \{ z-index: 1100 !important; \}/);
});

test('V8.2 não nasce com Adicionar som permanentemente desabilitado', () => {
  assert.doesNotMatch(social, /id="hlSoundAdd" type="button" disabled/);
});

test('V8.2 força novo cache-bust do social', () => {
  assert.match(room, /\/hl-social\.js\?v=82/);
});
