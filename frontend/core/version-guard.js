(() => {
  "use strict";

  const CHECK_INTERVAL_MS = 60000;
  const localVersion = String(window.HL_APP_VERSION || "");
  let mismatchShown = false;
  let mismatchNotice = null;
  let checkPromise = null;
  let timer = null;

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
    } catch {}

    const url = new URL(location.href);
    url.searchParams.set("_hlv", remoteVersion || String(Date.now()));
    location.replace(url.toString());
  }

  async function updateNow(remoteVersion, button) {
    if (button) {
      button.disabled = true;
      button.textContent = "Atualizando…";
    }

    try {
      if (window.HLPWA?.reconcileVersion) {
        const result = await window.HLPWA.reconcileVersion(remoteVersion);
        if (result?.reloadScheduled) return;
        if (result?.forceFreshReload) {
          await forceFreshReload(remoteVersion);
          return;
        }
      } else {
        const registrations = await navigator.serviceWorker?.getRegistrations?.();
        for (const registration of registrations || []) {
          await registration.update().catch(() => {});
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
          }
        }
      }
    } catch {}

    await forceFreshReload(remoteVersion);
  }

  function showMismatch(remoteVersion) {
    setMismatchState(true, remoteVersion);

    window.dispatchEvent(new CustomEvent("hl:version-mismatch", {
      detail: { localVersion, remoteVersion }
    }));

    if (mismatchShown && mismatchNotice?.isConnected) {
      const versionText = mismatchNotice.querySelector("[data-hl-version-detail]");
      if (versionText) versionText.textContent = `${localVersion || "?"} → ${remoteVersion || "?"}`;
      return;
    }

    mismatchShown = true;
    const notice = document.createElement("div");
    mismatchNotice = notice;
    notice.id = "hlVersionMismatch";
    notice.className = "hl-version-mismatch";
    notice.setAttribute("role", "alert");
    notice.innerHTML = `
      <div>
        <strong>Atualização necessária</strong>
        <span>O servidor está em outra versão. Atualize antes de continuar para evitar arquivos incompatíveis.</span>
        <small data-hl-version-detail>${localVersion || "?"} → ${remoteVersion || "?"}</small>
      </div>
      <button type="button">Atualizar agora</button>
    `;

    notice.querySelector("button").addEventListener("click", event => {
      updateNow(remoteVersion, event.currentTarget);
    });

    document.body.appendChild(notice);
  }

  function clearMismatch() {
    setMismatchState(false);
    mismatchShown = false;
    if (mismatchNotice?.isConnected) mismatchNotice.remove();
    mismatchNotice = null;
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
