const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'hl-social.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'hl-v9.css'), 'utf8');
const room = fs.readFileSync(path.join(root, 'room.html'), 'utf8');

test('V9.2 usa portal de overlays para popovers', () => {
  assert.match(js, /hlUiOverlays/);
  assert.match(css, /\.hl-ui-overlays/);
});

test('V9.2 usa controlador único da dock para Configurações e Mais', () => {
  assert.match(js, /dock\?\.addEventListener\("click"/);
  assert.match(js, /button === moreQuick/);
  assert.match(js, /button === settingsQuick/);
});

test('menu Mais oferece Configurações como rota alternativa', () => {
  assert.match(js, /data-more-action="settings"/);
  assert.match(js, /action === "settings"/);
});

test('Configurações fica visível no mobile e footer fica acima do backdrop', () => {
  assert.match(css, /#hlSettingsQuick\s*\{[\s\S]*display:\s*grid\s*!important/);
  assert.match(css, /footer\s*\{[\s\S]*z-index:\s*1400\s*!important/);
});

test('V9.2 usa cache bust novo', () => {
  assert.match(room, /hl-v9\.css\?v=92/);
  assert.match(room, /hl-social\.js\?v=(?:92|10)/);
});
