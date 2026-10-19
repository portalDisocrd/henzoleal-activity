const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("foundation PWA mantem cache de release imutavel durante fetch", () => {
  const sw = read("sw.js");
  const fetchBlock = sw.slice(sw.indexOf('addEventListener("fetch"'));
  assert.match(fetchBlock, /fetchFresh\(request\)/);
  assert.match(sw, /cache:\s*"no-store"/);
  assert.doesNotMatch(fetchBlock, /cache\.put\(/);
  assert.doesNotMatch(fetchBlock, /caches\.open\(CACHE\)/);
});

test("foundation PWA preserva update controlado e limpa cache incompleto", () => {
  const sw = read("sw.js");
  const install = sw.slice(sw.indexOf('addEventListener("install"'), sw.indexOf('addEventListener("activate"'));
  assert.doesNotMatch(install, /skipWaiting\(/);
  assert.match(install, /caches\.delete\(CACHE\)/);
  assert.match(sw, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(sw, /key\.startsWith\(CACHE_PREFIX\)/);
});

test("registro PWA ignora HTTP cache do sw e possui reconciliacao", () => {
  const pwa = read("frontend/pwa/pwa.js");
  assert.match(pwa, /updateViaCache:\s*"none"/);
  assert.match(pwa, /async function reconcileVersion/);
  assert.match(pwa, /clearManagedCaches/);
  assert.match(pwa, /controllerchange/);
  assert.match(pwa, /reloadScheduled/);
  assert.match(pwa, /function isActiveRoomPage/);
  assert.match(pwa, /deferUpdateUntilRoomEnds/);
  assert.doesNotMatch(pwa, /Atualizar agora/);
});

test("version guard monitora mudanca de release durante a sessao", () => {
  const guard = read("frontend/core/version-guard.js");
  assert.match(guard, /CHECK_INTERVAL_MS = 60000/);
  assert.match(guard, /visibilitychange/);
  assert.match(guard, /addEventListener\("online"/);
  assert.match(guard, /HLPWA\?\.reconcileVersion/);
  assert.match(guard, /_hlv/);
  assert.match(guard, /cache:\s*"no-store"/);
  assert.match(guard, /updateAutomatically/);
  assert.doesNotMatch(guard, /Atualizar agora/);
  assert.doesNotMatch(guard, /notice\.innerHTML/);
});

function loadPwa(pathname) {
  const windowListeners = new Map();
  const serviceWorkerListeners = new Map();
  const intervals = new Map();
  let nextInterval = 1;
  let reloads = 0;
  let activations = 0;
  const waiting = { postMessage: message => {
    assert.equal(message.type, "SKIP_WAITING");
    activations += 1;
  } };
  const registration = {
    waiting,
    addEventListener() {},
    update: async () => {}
  };
  const location = {
    protocol: "https:",
    hostname: "hl.test",
    pathname,
    reload: () => { reloads += 1; },
    replace: () => { reloads += 1; },
    href: `https://hl.test${pathname}`
  };
  const window = {
    navigator: { standalone: false },
    matchMedia: () => ({ matches: false }),
    addEventListener: (name, handler) => windowListeners.set(name, handler),
    dispatchEvent() {}
  };
  const navigator = {
    onLine: true,
    serviceWorker: {
      register: async () => registration,
      addEventListener: (name, handler) => serviceWorkerListeners.set(name, handler)
    }
  };
  const document = {
    documentElement: { dataset: {} },
    addEventListener() {},
    readyState: "complete"
  };
  const context = {
    window,
    navigator,
    document,
    location,
    caches: { keys: async () => [], delete: async () => true },
    CustomEvent: function CustomEvent() {},
    setTimeout,
    clearTimeout,
    setInterval: handler => {
      const id = nextInterval++;
      intervals.set(id, handler);
      return id;
    },
    clearInterval: id => intervals.delete(id),
    console
  };
  vm.runInNewContext(read("frontend/pwa/pwa.js"), context);
  return {
    window,
    intervals,
    registration,
    serviceWorkerListeners,
    location,
    load: () => windowListeners.get("load")(),
    activateCount: () => activations,
    reloadCount: () => reloads
  };
}

test("PWA ativa novas versões automaticamente fora de uma sala", async () => {
  const pwa = loadPwa("/");
  pwa.load();
  await pwa.window.HLPWA.getRegistration();
  assert.equal(pwa.activateCount(), 1);
  pwa.serviceWorkerListeners.get("controllerchange")();
  assert.equal(pwa.reloadCount(), 1);
});

test("PWA adia atualização até sair da sala ativa", async () => {
  const pwa = loadPwa("/room/AB12CD34");
  pwa.load();
  await pwa.window.HLPWA.getRegistration();
  assert.equal(pwa.activateCount(), 0);
  assert.equal(pwa.window.HLPWA.getStatus(), "update-deferred");

  const [tick] = pwa.intervals.values();
  pwa.location.pathname = "/";
  tick();
  assert.equal(pwa.activateCount(), 1);
  pwa.serviceWorkerListeners.get("controllerchange")();
  assert.equal(pwa.reloadCount(), 1);
});

test("PWA carrega antes do version guard nas paginas web", () => {
  for (const file of ["index.html", "room.html"]) {
    const html = read(file);
    const pwa = html.indexOf("/frontend/pwa/pwa.js");
    const guard = html.indexOf("/frontend/core/version-guard.js");
    assert.ok(pwa >= 0, `${file}: PWA ausente`);
    assert.ok(guard >= 0, `${file}: guard ausente`);
    assert.ok(pwa < guard, `${file}: PWA deve carregar antes do guard`);
    assert.equal((html.match(/\/frontend\/pwa\/pwa\.js/g) || []).length, 1, `${file}: PWA duplicado`);
  }
});

test("servidor publica politica explicita de cache e versao", () => {
  const server = read("server.js");
  const staticFiles = read("src/middleware/static-files.js");
  const pages = read("src/routes/page-routes.js");

  assert.match(server, /X-HL-Version/);
  assert.match(server, /Cache-Control", "no-store"/);
  assert.match(staticFiles, /Service-Worker-Allowed/);
  assert.match(staticFiles, /no-cache, no-store, must-revalidate/);
  assert.match(staticFiles, /no-cache, must-revalidate/);
  assert.match(pages, /Cache-Control", "no-store"/);
});

test("documentacao PWA cobre upgrade downgrade e rollback", () => {
  const docs = read("docs/PWA.md");
  assert.match(docs, /upgrade/);
  assert.match(docs, /downgrade/);
  assert.match(docs, /rollback/);
  assert.match(docs, /cache de release é imutável/i);
});


function loadServiceWorker({ fetchImpl, cacheMatchImpl }) {
  const handlers = {};
  const context = {
    URL,
    Response: { error: () => ({ source: "error" }) },
    fetch: fetchImpl,
    caches: {
      open: async () => ({ addAll: async () => {} }),
      delete: async () => true,
      keys: async () => [],
      match: cacheMatchImpl
    },
    self: {
      location: { origin: "https://hl.test" },
      clients: { claim: async () => {} },
      skipWaiting: () => {},
      addEventListener: (name, handler) => { handlers[name] = handler; }
    }
  };
  vm.runInNewContext(read("sw.js"), context);
  return handlers;
}

test("service worker prefere rede para asset online e usa cache apenas na falha", async () => {
  const networkResponse = { source: "network" };
  const cachedResponse = { source: "cache" };
  let cacheMode = null;

  let handlers = loadServiceWorker({
    fetchImpl: async (request, init) => {
      cacheMode = init?.cache;
      return networkResponse;
    },
    cacheMatchImpl: async () => cachedResponse
  });

  let responsePromise;
  handlers.fetch({
    request: { method: "GET", url: "https://hl.test/styles/app.css", mode: "cors" },
    respondWith: value => { responsePromise = value; }
  });
  assert.equal(await responsePromise, networkResponse);
  assert.equal(cacheMode, "no-store");

  handlers = loadServiceWorker({
    fetchImpl: async () => { throw new Error("offline"); },
    cacheMatchImpl: async () => cachedResponse
  });

  handlers.fetch({
    request: { method: "GET", url: "https://hl.test/styles/app.css", mode: "cors" },
    respondWith: value => { responsePromise = value; }
  });
  assert.equal(await responsePromise, cachedResponse);
});

test("service worker nao intercepta API dinamica", () => {
  const handlers = loadServiceWorker({
    fetchImpl: async () => ({ source: "network" }),
    cacheMatchImpl: async () => ({ source: "cache" })
  });

  let intercepted = false;
  handlers.fetch({
    request: { method: "GET", url: "https://hl.test/api/version", mode: "cors" },
    respondWith: () => { intercepted = true; }
  });

  assert.equal(intercepted, false);
});
