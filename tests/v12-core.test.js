const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRoomService } = require('../src/services/room-service');
const { APP_VERSION } = require('../src/config/version');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

test('V12 usa versionamento único e assets estáveis',()=>{
  assert.equal(APP_VERSION,'12.0.1');
  const room=read('room.html'), activity=read('activity-room.html'), sw=read('sw.js');
  for(const source of [room,activity,sw]) assert.doesNotMatch(source,/\?v=(?:10|103|111)/);
  assert.match(room,/\/styles\/social-shell\.css/);
  assert.match(room,/\/frontend\/social\/social-runtime\.js/);
  assert.match(sw,/hl-activity-\$\{APP_VERSION\}/);
});

test('V12 CSS social não depende de important em massa',()=>{
  const socialFiles=['styles/social-shell.css','styles/chat.css','styles/voice.css','styles/soundboard.css','styles/reactions.css','styles/social-responsive.css'].map(read).join('\n');
  const count=(socialFiles.match(/!important/g)||[]).length;
  assert.ok(count <= 5, `!important demais: ${count}`);
  assert.match(read('styles/tokens.css'),/--hl-z-modal/);
});

test('V12 reutiliza um único CSS de sala no Web e Activity',()=>{
  assert.match(read('room.html'),/\/styles\/room\.css/);
  assert.match(read('activity-room.html'),/\/styles\/room\.css/);
  assert.equal(fs.existsSync(path.join(root,'activity-room.css')),false);
});

test('V12 senha de sala usa scrypt e aceita validação',()=>{
  const service=createRoomService({maxRooms:2,emptyRoomTtl:1000});
  const created=service.create();
  service.setRoomPassword(created.code,'segredo forte');
  assert.match(created.room.roomPasswordHash,/^scrypt\$/);
  assert.equal(service.verifyRoomPassword(created.code,'segredo forte'),true);
  assert.equal(service.verifyRoomPassword(created.code,'errado'),false);
});

test('V12 expõe módulos iniciais de voz e social',()=>{
  for(const f of ['frontend/social/voice/voice-state.js','frontend/social/voice/voice-config.js','frontend/social/voice/voice-devices.js','frontend/social/soundboard/soundboard-module.js','frontend/social/reactions/reactions-module.js','frontend/social/chat/chat-module.js']) assert.ok(fs.existsSync(path.join(root,f)),f);
  assert.match(read('frontend/social/voice/voice-controller.js'),/HLVoiceConfig/);
});

test('V12 PWA exclui API Socket e config dinâmica do cache',()=>{
  const sw=read('sw.js');
  assert.match(sw,/url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw,/api\/socket\.io/);
  assert.match(sw,/client-config\.js/);
  assert.match(sw,/SKIP_WAITING/);
});

test('V12 mantém exatamente um handler servidor reaction:send',()=>{
  const files=['src/socket/social-events.js','src/socket/chat-events.js','src/socket/voice-events.js','src/socket/stream-events.js','src/socket/webrtc-signaling.js'].map(read).join('\n');
  assert.equal((files.match(/socket\.on\(["']reaction:send["']/g)||[]).length,1);
});

test('V12 social separa controladores reais de chat, voz e reações',()=>{
  const social=read('frontend/social/social-runtime.js');
  const chat=read('frontend/social/chat/chat-module.js');
  const voice=read('frontend/social/voice/voice-controller.js');
  const reactions=read('frontend/social/reactions/reactions-module.js');
  assert.match(chat,/createChatController/);
  assert.match(voice,/createHLVoiceController/);
  assert.match(reactions,/createReactionController/);
  assert.match(social,/HLChatModule\?\.createChatController/);
  assert.match(social,/HLReactionsModule\?\.createReactionController/);
  assert.doesNotMatch(social,/renderSounds\(/);
});

test('V12 limita áudio customizado globalmente e mantém limite de sala',()=>{
  const sounds=require('../src/routes/custom-sound-routes');
  assert.ok(sounds.MAX_GLOBAL_SOUND_BYTES >= sounds.MAX_ROOM_SOUND_BYTES);
  assert.ok(sounds.MAX_GLOBAL_SOUND_BYTES <= 128*1024*1024);
  assert.equal(typeof sounds.totalCustomSoundBytes,'function');
});

test('V12 usa grace period de host e limite menor para mesh',()=>{
  const constants=require('../src/config/constants');
  const disconnect=read('src/socket/disconnect.js');
  assert.equal(constants.MAX_USERS_PER_ROOM,10);
  assert.ok(constants.HOST_RECONNECT_GRACE_MS >= 5000);
  assert.match(disconnect,/room:host-reconnecting/);
  assert.match(disconnect,/grace-expired/);
});

test('V12 usa core compartilhado Web e Discord Activity',()=>{
  const room=read('room.html'), activity=read('activity-room.html');
  assert.match(room,/src="\/room-core\.js"/);
  assert.match(activity,/src="\/room-core\.js"/);
  assert.equal(fs.existsSync(path.join(root,'activity-room-core.js')),false);
});

test('V12 streaming possui estados explícitos de compartilhamento',()=>{
  const core=read('room-core.js');
  for(const state of ['idle','requesting','sharing','stopping','error']) assert.match(core,new RegExp(`setShareState\\("${state}"`));
  assert.match(core,/track\.onended\s*=\s*stopSharing/);
});

test('V12 não carrega nomes de assets V10/V11 em produção',()=>{
  const targets=['room.html','activity-room.html','index.html','sw.js','src/middleware/static-files.js'].map(read).join('\n');
  assert.doesNotMatch(targets,/hl-v10|hl-social-v11|home-v10|\?v=(?:10|103|111)/);
});

test('V12 bloqueia regressão do comentário CSS que quebrava o Lightning CSS',()=>{
  const social=read('styles/social-shell.css');
  assert.match(social,/\/\* ={20,}\n\s*FALLBACK SETTINGS \+ PARTICIPANT DECORATION\n\s*INTERNAL FALLBACK SETTINGS[\s\S]*?={20,} \*\//);
  assert.doesNotMatch(social,/\/\* FALLBACK SETTINGS \+ PARTICIPANT DECORATION \*\/\s*INTERNAL FALLBACK SETTINGS/);
});

test('V12 marca scripts clássicos da Activity para o Vite não tentar empacotá-los',()=>{
  const activity=read('activity-room.html');
  const classicScripts=[...activity.matchAll(/<script\s+([^>]*?)src="([^"]+)"([^>]*)><\/script>/g)]
    .filter(([,before,,after])=>!`${before} ${after}`.includes('type="module"'));
  assert.ok(classicScripts.length > 0);
  for(const match of classicScripts) assert.match(match[0],/\svite-ignore(?:\s|>)/);
});

test('V12 mantém pré-entrada nítida sem blur no próprio overlay',()=>{
  const components=read('styles/components.css');
  const room=read('styles/room.css');
  assert.match(components,/\.hl-room-entry\{[^}]*backdrop-filter:none[^}]*isolation:isolate/);
  assert.match(room,/#profileOverlay\s*\{[\s\S]*?backdrop-filter:\s*none;[\s\S]*?-webkit-backdrop-filter:\s*none;[\s\S]*?isolation:\s*isolate;/);
  assert.match(room,/#profileOverlay \.profile-card > \*[\s\S]*?z-index:\s*1;/);
});
