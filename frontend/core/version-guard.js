(() => {
  "use strict";

  const CHECK_INTERVAL_MS = 60000;
  const localVersion = String(window.HL_APP_VERSION || "");
  let mismatchShown = false;
  let checkPromise = null;
  let timer = null;
  let reloadScheduled = false;

  function setMismatchState(value, remoteVersion = "") {
    document.documentElement.dataset.hlVersionMismatch = value ? "true" : "false";
    if (remoteVersion) document.documentElement.dataset.hlRemoteVersion = remoteVersion;
    else delete document.documentElement.dataset.hlRemoteVersion;
  }

  async function forceFreshReload(remoteVersion) {
    try {
      if (window.HLPWA?.clearManagedCaches) {
        await window.HLPWA.clearManagedCaches();
      } else if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter(key => key.startsWith("hl-activity-")).map(key => caches.delete(key))
        );
      }
    } catch (error) {
      console.warn("[VersionGuard] Limpeza do cache gerenciado:", error);
    }

    const url = new URL(location.href);
    url.searchParams.set("_hlv", remoteVersion || String(Date.now()));
    location.replace(url.toString());
  }

  async function updateAutomatically(remoteVersion) {
    if (reloadScheduled) return;
    try {
      if (window.HLPWA?.reconcileVersion) {
        const result = await window.HLPWA.reconcileVersion(remoteVersion);
        if (result?.reloadScheduled) {
          reloadScheduled = true;
          return;
        }
        if (result?.deferred) return;
        if (result?.forceFreshReload) {
          reloadScheduled = true;
          await forceFreshReload(remoteVersion);
          return;
        }
      } else {
        if (isActiveRoomPage()) return;
        const registrations = await navigator.serviceWorker?.getRegistrations?.();
        for (const registration of registrations || []) {
          await registration.update();
          if (registration.waiting) {
            reloadScheduled = true;
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            return;
          }
        }
      }
    } catch (error) {
      console.warn("[VersionGuard] Atualização automática:", error);
    }

    if (isActiveRoomPage()) return;
    reloadScheduled = true;
    await forceFreshReload(remoteVersion);
  }

  function isActiveRoomPage() {
    return window.HLPWA?.isActiveRoomPage?.() ||
      /^\/(?:room|share)\/[^/]+\/?$/.test(location.pathname) ||
      location.pathname === "/activity-room.html";
  }

  function showMismatch(remoteVersion) {
    setMismatchState(true, remoteVersion);

    window.dispatchEvent(new CustomEvent("hl:version-mismatch", {
      detail: { localVersion, remoteVersion }
    }));

    if (mismatchShown) return;
    mismatchShown = true;
    updateAutomatically(remoteVersion);
  }

  function clearMismatch() {
    setMismatchState(false);
    mismatchShown = false;
    reloadScheduled = false;
  }

  async function performCheck() {
    if (!localVersion) return { ok: false, reason: "local-version-missing" };

    try {
      const response = await fetch("/api/version", {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (!response.ok) return { ok: false, reason: `http-${response.status}` };

      const data = await response.json();
      const remoteVersion = String(data?.version || response.headers.get("x-hl-version") || "");
      if (!remoteVersion) return { ok: false, reason: "remote-version-missing" };

      if (remoteVersion !== localVersion) {
        showMismatch(remoteVersion);
        return { ok: false, reason: "mismatch", localVersion, remoteVersion };
      }

      clearMismatch();
      return { ok: true, localVersion, remoteVersion };
    } catch (error) {
      return { ok: false, reason: "network", error };
    }
  }

  function check() {
    if (checkPromise) return checkPromise;
    checkPromise = performCheck().finally(() => {
      checkPromise = null;
    });
    return checkPromise;
  }

  function start() {
    check();

    if (!timer) {
      timer = setInterval(() => {
        if (document.visibilityState === "visible" && navigator.onLine !== false) check();
      }, CHECK_INTERVAL_MS);
    }
  }

  window.addEventListener("online", () => check());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine !== false) check();
  });

  window.HLVersionGuard = Object.freeze({
    check,
    localVersion,
    checkIntervalMs: CHECK_INTERVAL_MS
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
