const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

test('V9.x expõe botão e painel de configurações funcionais', () => {
  const js = read('hl-social.js');
  assert.match(js, /id="hlSettingsQuick"/);
  assert.match(js, /id="hlSettingsPanel"/);
  assert.match(js, /id="hlSettingsMode"/);
  assert.match(js, /id="hlSettingsQuality"/);
  assert.match(js, /id="hlSettingsAudio"/);
  assert.match(js, /(?:settingsQuick\?\.addEventListener\("click"|button === settingsQuick)/);
});

test('V9.1 corrige enquadramento e evita crop da toolbar', () => {
  const css = read('hl-v9.css');
  assert.match(css, /\.stage-empty \.icon \.hl-monitor/);
  assert.match(css, /\.hl-settings-panel/);
  assert.match(css, /\.hl-social-dock \{ flex-wrap: nowrap !important; \}/);
  assert.match(css, /overflow: visible !important/);
});

test('V9.1 remove emoji duplicado do texto de conexão', () => {
  const room = read('room-core.js');
  const activity = read('activity-room-core.js');
  assert.doesNotMatch(room, /🟢 Conectado/);
  assert.doesNotMatch(activity, /🟢 Conectado/);
  assert.doesNotMatch(room, /🟡 Reconectando à sala/);
});

test('V9.x usa cache bust atual', () => {
  for (const f of ['room.html','activity-room.html']) {
    const html = read(f);
    assert.match(html, /hl-v9\.css\?v=92/);
    assert.match(html, /hl-social\.js\?v=(?:92|10)/);
  }
});
