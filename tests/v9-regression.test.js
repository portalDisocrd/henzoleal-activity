const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createSocialEvents, REACTION_EMOJIS } = require("../src/socket/social-events");
const { normalizeText } = require("../src/utils/validation");

const root = path.join(__dirname, "..");

test("V9 carrega CSS novo e JS com cache bust", () => {
  const room = fs.readFileSync(path.join(root,"room.html"),"utf8");
  assert.match(room,/hl-v9\.css\?v=9/);
  assert.match(room,/hl-social\.js\?v=9/);
});

test("V9 mantém soundboard mobile em uma coluna", () => {
  const css = fs.readFileSync(path.join(root,"hl-v9.css"),"utf8");
  assert.match(css,/grid-template-columns:1fr !important/);
  assert.match(css,/position:static !important/);
});

test("V9 define referências de configuração do soundboard", () => {
  const js = fs.readFileSync(path.join(root,"hl-social.js"),"utf8");
  assert.match(js,/const soundConfig = document\.getElementById\("hlSoundConfig"\)/);
  assert.match(js,/const soundSettingsClose = document\.getElementById\("hlSoundSettingsClose"\)/);
});

test("V9 registra reaction:send no servidor", () => {
  assert.equal(REACTION_EMOJIS.has("🔥"), true);
  const handlers = new Map();
  const emitted = [];
  const socket = {
    id:"s1", data:{roomCode:"AB12CD34"},
    on:(n,fn)=>handlers.set(n,fn),
    to:()=>({emit:(n,p)=>emitted.push([n,p])})
  };
  const room={ users:new Map([["s1",{name:"Lucas",role:"host"}]]), lastActivity:0 };
  const roomService={get:()=>room,audit:()=>true};
  createSocialEvents({io:{to:()=>({emit(){}})},roomService,allowSocketEvent:()=>true,getSafeTargetSocket:()=>null,normalizeText}).register(socket,()=>{});
  let ack; handlers.get("reaction:send")({emoji:"🔥"},v=>ack=v);
  assert.equal(ack.success,true);
  assert.equal(emitted[0][0],"reaction:show");
});
