const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'hl-v103.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'hl-social.js'), 'utf8');
const room = fs.readFileSync(path.join(root, 'room.html'), 'utf8');

test('V10.3 carrega camada final de reestruturação', () => {
  assert.match(room, /hl-v103\.css\?v=103/);
  assert.match(room, /hl-social\.js\?v=103/);
});

test('V10.3 ancora reações pela posição real do palco', () => {
  assert.match(js, /const syncReactionLayer/);
  assert.match(js, /stageEl\.getBoundingClientRect\(\)/);
  assert.match(js, /document\.body\.appendChild\(reactionLayer\)/);
  assert.match(css, /#hlFloatingReactions\.hl-floating-reactions[\s\S]*position:\s*fixed/);
  assert.match(css, /hl-v10-reaction[\s\S]*right:\s*18px/);
  assert.match(css, /hl-v10-reaction[\s\S]*bottom:\s*18px/);
});

test('V10.3 Soundboard usa fluxo próprio e uma coluna no celular', () => {
  assert.match(css, /is-active\[data-view="sounds"\][\s\S]*display:\s*flex/);
  assert.match(css, /hl-sound-grid[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /@media \(max-width:\s*650px\)[\s\S]*hl-sound-grid[\s\S]*grid-template-columns:\s*1fr/);
});

test('V10.3 painel mobile mantém margem e não corta conteúdo', () => {
  assert.match(css, /#hlSocialPanel[\s\S]*left:\s*6px/);
  assert.match(css, /#hlSocialPanel[\s\S]*right:\s*6px/);
});


test('V10.3 mantém um único handler servidor para reaction:send', () => {
  const social = fs.readFileSync(path.join(root, 'src/socket/social-events.js'), 'utf8');
  const chat = fs.readFileSync(path.join(root, 'src/socket/chat-events.js'), 'utf8');
  const count = (social.match(/socket\.on\(\"reaction:send\"/g) || []).length + (chat.match(/socket\.on\(\"reaction:send\"/g) || []).length;
  assert.equal(count, 1);
});
