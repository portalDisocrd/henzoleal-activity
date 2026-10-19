const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("home fornece nomes acessiveis e estado de selecao para perfil", () => {
  const html = read("index.html");
  assert.match(html, /<label class="label" for="name">/);
  assert.match(html, /<fieldset class="avatar-field">[\s\S]*<legend class="label">/);
  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) || []).length, 6);
  assert.match(html, /id="homeFeedback"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(html, /class="visually-hidden" for="roomCode"/);
});

test("home restaura perfil e apresenta validacao sem dialogs bloqueantes", () => {
  const controller = read("home.js");
  const styles = read("styles/home-product.css");
  assert.match(controller, /function restoreProfile\(/);
  assert.match(controller, /sessionStorage\.getItem\(profileStorageKey\)/);
  assert.match(controller, /aria-pressed/);
  assert.match(controller, /homeFeedback/);
  assert.match(controller, /Digite um código de sala válido com 8 caracteres/);
  assert.doesNotMatch(controller, /\balert\s*\(/);
  assert.match(styles, /\.home-feedback\[data-tone="error"\]/);
  assert.match(styles, /\.visually-hidden\s*\{/);
});

test("onboarding da sala espera a entrada e nao se estica por cima do pre-join no mobile", () => {
  const runtime = read("frontend/product/product-runtime.js");
  const styles = read("styles/product.css");
  assert.match(runtime, /socket\.once\("room:joined",\s*\(\)\s*=>\s*\{/);
  assert.doesNotMatch(runtime, /document\.body\.appendChild\(banner\);[\s\S]{0,180}socket\.once/);
  assert.match(styles, /\.hl-product-onboarding\{[^}]*top:76px[^}]*pointer-events:none/);
  assert.match(styles, /@media\s*\(max-width:\s*700px\)[\s\S]*?\.hl-product-onboarding\{[^}]*top:calc\(var\(--hl-header-h,58px\)\s*\+\s*8px\);bottom:auto/);
  assert.match(styles, /\.hl-product-onboarding button\{[^}]*pointer-events:auto/);
  assert.match(styles, /body\.hl-social-panel-open \.hl-product-onboarding\{display:none\}/);
});

test("soundboard inicia audivel quando nao existe volume salvo", () => {
  const runtime = read("frontend/social/social-runtime.js");
  assert.match(runtime, /storedSoundVolume === null \? 0\.72 : Number\(storedSoundVolume\)/);
  assert.match(runtime, /soundVolume:\s*Number\.isFinite\(savedSoundVolume\)/);
});

test("dialogo de pre-entrada recebe foco e prende a navegacao por teclado", () => {
  const controller = read("frontend/room/profile/profile-controller.js");
  assert.match(controller, /function containTabFocus\(event\)/);
  assert.match(controller, /document\.addEventListener\("keydown", containTabFocus\)/);
  assert.match(controller, /\(nameInput \|\| getFocusableElements\(\)\[0\]\)\?\.focus\(\)/);
  assert.match(controller, /document\.removeEventListener\("keydown", containTabFocus\)/);
});

test("layout da sala reserva a altura real do cabecalho e do rodape", () => {
  const roomStyles = read("styles/room.css");
  assert.match(roomStyles, /\.app\s*\{\s*height:\s*calc\(100vh - 134px\);\s*height:\s*calc\(100dvh - 134px\);/);
});

test("painel social mobile permanece dentro do palco e acima do rodape", () => {
  const responsive = read("styles/social-responsive.css");
  assert.match(responsive, /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.hl-social-panel\s*\{[^}]*bottom:\s*6px;[\s\S]*?max-height:\s*calc\(100dvh - 150px\)/);
  assert.match(responsive, /@media\s*\(max-width:\s*650px\)\s*\{[\s\S]*?\.hl-social-panel\s*\{[^}]*bottom:\s*6px;[\s\S]*?max-height:\s*calc\(100dvh - 150px\)/);
});
