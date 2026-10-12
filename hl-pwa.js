(() => {
  "use strict";
  let deferredPrompt = null;
  let installed = window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean(window.navigator.standalone);

  function dispatch() {
    window.dispatchEvent(new CustomEvent("hl:pwa-state", { detail: { canInstall: Boolean(deferredPrompt) && !installed, installed } }));
    document.documentElement.dataset.hlPwa = installed ? "installed" : (deferredPrompt ? "installable" : "browser");
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(error => console.warn("[PWA] Service worker:", error)));
  }

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

  window.HLPWA = {
    canInstall: () => Boolean(deferredPrompt) && !installed,
    isInstalled: () => installed,
    install: async () => {
      if (!deferredPrompt || installed) return { success: false, reason: installed ? "installed" : "unavailable" };
      const prompt = deferredPrompt;
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") deferredPrompt = null;
      dispatch();
      return { success: choice?.outcome === "accepted", outcome: choice?.outcome || "dismissed" };
    }
  };
  dispatch();
})();
