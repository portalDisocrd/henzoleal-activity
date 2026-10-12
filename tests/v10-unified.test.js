const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRoomService } = require('../src/services/room-service');

const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('V10 carrega shell unificado, PWA e pré-entrada', () => {
  const room = read('room.html');
  const home = read('index.html');
  assert.match(room, /hl-v10\.css\?v=10/);
  assert.match(room, /hl-social\.js\?v=10/);
  assert.match(room, /hl-v10\.js\?v=10/);
  assert.match(room, /hl-pwa\.js\?v=10/);
  assert.match(home, /manifest\.webmanifest/);
  assert.match(home, /home-v10\.js\?v=10/);
});

test('V10 mantém Activity no social atual e publica CSS base V9 explicitamente', () => {
  const activity = read('activity-room.html');
  const staticFiles = read('src/middleware/static-files.js');
  assert.match(activity, /hl-social\.js\?v=10/);
  assert.match(staticFiles, /\["\/hl-v9\.css", "hl-v9\.css"\]/);
  assert.match(staticFiles, /\["\/hl-v10\.css", "hl-v10\.css"\]/);
  assert.match(staticFiles, /manifest\.webmanifest/);
  assert.match(staticFiles, /\/sw\.js/);
});

test('V10 room service suporta senha, convite temporário e uso único', () => {
  const service = createRoomService({ maxRooms: 10, emptyRoomTtl: 60_000 });
  const created = service.create();
  assert.equal(created.success, true);
  assert.equal(service.setRoomPassword(created.code, 'segredo'), true);
  assert.equal(service.verifyRoomPassword(created.code, 'segredo'), true);
  assert.equal(service.verifyRoomPassword(created.code, 'errada'), false);

  const normal = service.createInvite(created.code, { trusted: true, oneTime: false, ttlMs: 60 * 60 * 1000 });
  assert.equal(service.verifyInvite(created.code, normal.token)?.trusted, true);

  const once = service.createInvite(created.code, { trusted: true, oneTime: true, ttlMs: 60 * 60 * 1000 });
  assert.equal(service.verifyInvite(created.code, once.token, { consume: true })?.oneTime, true);
  assert.equal(service.verifyInvite(created.code, once.token), null);
});

test('V10 inclui lobby seletivo, mixer, diagnósticos, PWA, PiP, Wake Lock e Pomodoro', () => {
  const js = read('hl-v10.js');
  for (const marker of [
    'hlV10EntryPolicy', 'hlV10WaitingList', 'hlV10StreamVolume', 'hlV10VoiceVolume',
    'diagnostics:ping', 'requestPictureInPicture', 'navigator.wakeLock', 'hlV10Install',
    'Ctrl K', 'Pomodoro', 'room:create-invite', 'moderation:transfer-host'
  ]) assert.match(js, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
});

test('V10 reaction usa ID, deduplicação e limite visual pequeno', () => {
  const social = read('hl-social.js');
  const server = read('src/socket/social-events.js');
  assert.match(social, /seenReactionIds/);
  assert.match(social, /reactionId/);
  assert.match(social, /while \(host\.childElementCount >= 3\)/);
  assert.match(social, /lastReactionAt < 500/);
  assert.match(server, /socket\.to\(c\.roomCode\)\.emit\("reaction:show"/);
  assert.match(server, /lastReactionAt \|\| 0\) < 450/);
});

test('V10 soundboard evita sobreposição e vira uma coluna no celular', () => {
  const css = read('hl-v10.css');
  const social = read('hl-social.js');
  assert.match(css, /\.hl-social-view\.hl-sound-view[^\n]*grid-template-rows:auto auto auto minmax\(0,1fr\) auto/);
  assert.match(css, /\.hl-sound-grid\{[^\n]*overflow-y:auto/);
  assert.match(css, /@media\(max-width:650px\)[\s\S]*\.hl-sound-grid\{grid-template-columns:1fr!important/);
  assert.match(css, /\.hl-sound-help\{position:static!important/);
  assert.match(social, /▶ Ouvir/);
  assert.match(social, /📢 Na sala/);
});

test('V10 pré-entrada testa microfone, saída e mostra preview da sala', () => {
  const js = read('home-v10.js');
  assert.match(js, /getUserMedia/);
  assert.match(js, /enumerateDevices/);
  assert.match(js, /setSinkId/);
  assert.match(js, /hlPrejoinMuted/);
  assert.match(js, /\/api\/rooms\//);
  assert.match(js, /Permissão de microfone negada/);
});

test('V10 PWA não intercepta API nem Socket.IO', () => {
  const sw = read('sw.js');
  assert.match(sw, /hl-activity-v10-shell/);
  assert.match(sw, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /api\/socket\.io/);
  assert.match(sw, /request\.mode === "navigate"/);
});

test('V10 convites permitem validade selecionável e auditoria do host', () => {
  const js = read('hl-v10.js');
  const social = read('src/socket/social-events.js');
  assert.match(js, /hlV10InviteTtl/);
  assert.match(js, /15 minutos/);
  assert.match(js, /7 dias/);
  assert.match(js, /hlV10AuditList/);
  assert.match(social, /audit:c\.user\.role === "host"/);
});

test('V10 diagnóstico avançado expõe ICE, rota, bitrate, perda e microfone', () => {
  const js = read('hl-v10.js');
  for (const label of ['["ICE",ice]', '["Rota",transport]', '["Bitrate",bitrate]', '["Perda",loss]', '["Microfone",mic]']) {
    assert.ok(js.includes(label), `faltando ${label}`);
  }
  assert.match(js, /TURN ativo/);
});
