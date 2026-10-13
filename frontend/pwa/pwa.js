(() => {
  "use strict";

  const CACHE_PREFIX = "hl-activity-";
  const UPDATE_WAIT_MS = 12000;

  let deferredPrompt = null;
  let registration = null;
  let registrationPromise = null;
  let installed = window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean(window.navigator.standalone);
  let updateReloadArmed = false;
  let updateNotice = null;
  let pwaStatus = "idle";

  function dispatch(extra = {}) {
    window.dispatchEvent(new CustomEvent("hl:pwa-state", {
      detail: {
        canInstall: Boolean(deferredPrompt) && !installed,
        installed,
        status: pwaStatus,
        ...extra
      }
    }));
    document.documentElement.dataset.hlPwa = installed ? "installed" : (deferredPrompt ? "installable" : "browser");
    document.documentElement.dataset.hlPwaStatus = pwaStatus;
  }

  function setStatus(status, extra) {
    pwaStatus = status;
    dispatch(extra);
  }

  function announceUpdate(reg) {
    if (!reg?.waiting) return false;
    setStatus("update-available");
    window.dispatchEvent(new CustomEvent("hl:pwa-update", { detail: { registration: reg } }));
    return true;
  }

  function waitForWorkerState(worker, targetStates, timeoutMs = UPDATE_WAIT_MS) {
    if (!worker) return Promise.resolve(false);
    const accepted = new Set(targetStates);
    if (accepted.has(worker.state)) return Promise.resolve(true);

    return new Promise(resolve => {
      let done = false;
      const finish = value => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        worker.removeEventListener("statechange", onState);
        resolve(value);
      };
      const onState = () => {
        if (accepted.has(worker.state)) finish(true);
        else if (worker.state === "redundant") finish(false);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      worker.addEventListener("statechange", onState);
    });
  }

  async function clearManagedCaches() {
    if (!("caches" in window)) return 0;
    const keys = await caches.keys();
    const managed = keys.filter(key => key.startsWith(CACHE_PREFIX));
    await Promise.all(managed.map(key => caches.delete(key)));
    return managed.length;
  }

  async function ensureRegistration() {
    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return null;
    }
    if (!(location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      setStatus("unsupported");
      return null;
    }
    if (registration) return registration;
    if (registrationPromise) return registrationPromise;

    registrationPromise = navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none"
    }).then(reg => {
      registration = reg;
      if (reg.waiting) announceUpdate(reg);

      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        setStatus("checking");
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") {
            if (navigator.serviceWorker.controller) announceUpdate(reg);
            else setStatus("ready");
          } else if (worker.state === "redundant") {
            setStatus("error", { reason: "worker-redundant" });
          }
        });
      });

      if (!reg.waiting) setStatus("ready");
      return reg;
    }).catch(error => {
      registrationPromise = null;
      setStatus("error", { error });
      console.warn("[PWA] Service worker:", error);
      return null;
    });

    return registrationPromise;
  }

  async function checkForUpdate() {
    const reg = await ensureRegistration();
    if (!reg) return { success: false, reason: "service-worker-unavailable" };

    setStatus("checking");
    try {
      await reg.update();
      if (reg.waiting) {
        announceUpdate(reg);
        return { success: true, updateAvailable: true, registration: reg };
      }

      const worker = reg.installing;
      if (worker) {
        const installedNow = await waitForWorkerState(worker, ["installed"]);
        if (installedNow && reg.waiting) {
          announceUpdate(reg);
          return { success: true, updateAvailable: true, registration: reg };
        }
      }

      setStatus("up-to-date");
      return { success: true, updateAvailable: false, registration: reg };
    } catch (error) {
      setStatus("error", { error });
      return { success: false, reason: "update-check-failed", error };
    }
  }

  async function activateUpdate(reg = registration) {
    const activeRegistration = reg || await ensureRegistration();
    if (!activeRegistration?.waiting) {
      return { success: false, reason: "no-waiting-worker" };
    }

    updateReloadArmed = true;
    setStatus("activating");
    activeRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
    return { success: true, reloadScheduled: true };
  }

  async function reconcileVersion(remoteVersion) {
    const result = await checkForUpdate();

    if (result.updateAvailable && result.registration?.waiting) {
      return activateUpdate(result.registration);
    }

    // Se o backend mudou mas o browser ainda nao encontrou um worker waiting,
    // remove somente caches gerenciados do HL. Isso quebra loops de cache antigo
    // inclusive durante upgrade, downgrade ou rollback.
    const removedCaches = await clearManagedCaches().catch(() => 0);
    return {
      success: Boolean(result.success),
      reloadScheduled: false,
      forceFreshReload: true,
      removedCaches,
      remoteVersion: String(remoteVersion || "")
    };
  }

  function renderUpdateNotice(reg) {
    if (!reg?.waiting) return;
    if (updateNotice?.isConnected) return;

    const toast = document.createElement("div");
    toast.id = "hlPwaUpdate";
    toast.className = "hl-pwa-update";
    toast.setAttribute("role", "status");
    toast.innerHTML = '<span>Nova versão do HL disponível.</span><button type="button">Atualizar agora</button>';
    document.body.appendChild(toast);
    updateNotice = toast;

    const button = toast.querySelector("button");
    button.addEventListener("click", async () => {
      if (!reg.waiting) return;
      button.disabled = true;
      button.textContent = "Atualizando…";
      const result = await activateUpdate(reg);
      if (!result.success) {
        button.disabled = false;
        button.textContent = "Tentar novamente";
      }
    });
  }

  window.addEventListener("hl:pwa-update", event => {
    renderUpdateNotice(event.detail?.registration);
  });

  navigator.serviceWorker?.addEventListener?.("controllerchange", () => {
    if (!updateReloadArmed) return;
    updateReloadArmed = false;
    location.reload();
  });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    dispatch();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    dispatch();
  });

  window.addEventListener("load", () => {
    ensureRegistration();
  }, { once: true });

  window.HLPWA = Object.freeze({
    canInstall: () => Boolean(deferredPrompt) && !installed,
    isInstalled: () => installed,
    getStatus: () => pwaStatus,
    getRegistration: () => registration,
    checkForUpdate,
    activateUpdate,
    reconcileVersion,
    clearManagedCaches,
    install: async () => {
      if (!deferredPrompt || installed) {
        return { success: false, reason: installed ? "installed" : "unavailable" };
      }
      const prompt = deferredPrompt;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") deferredPrompt = null;
      dispatch();
      return { success: choice?.outcome === "accepted", outcome: choice?.outcome || "dismissed" };
    }
  });

  dispatch();
})();
