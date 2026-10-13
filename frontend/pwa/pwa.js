(() => {
  "use strict";
  let deferredPrompt = null;
  let installed = window.matchMedia?.("(display-mode: standalone)")?.matches || Boolean(window.navigator.standalone);

  function dispatch() {
    window.dispatchEvent(new CustomEvent("hl:pwa-state", { detail: { canInstall: Boolean(deferredPrompt) && !installed, installed } }));
    document.documentElement.dataset.hlPwa = installed ? "installed" : (deferredPrompt ? "installable" : "browser");
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        const announce = worker => { if (!worker) return; window.dispatchEvent(new CustomEvent("hl:pwa-update", { detail: { registration } })); };
        if (registration.waiting) announce(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => { if(worker.state === "installed" && navigator.serviceWorker.controller) announce(worker); });
        });
      } catch (error) { console.warn("[PWA] Service worker:", error); }
    });
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

  window.addEventListener("hl:pwa-update", event => {
    const registration = event.detail?.registration;
    if (!registration?.waiting || document.getElementById("hlPwaUpdate")) return;
    const toast = document.createElement("div"); toast.id="hlPwaUpdate"; toast.className="hl-pwa-update";
    toast.innerHTML='<span>Nova versão do HL disponível.</span><button type="button">Atualizar agora</button>';
    document.body.appendChild(toast);
    toast.querySelector("button").addEventListener("click",()=>{ registration.waiting.postMessage({type:"SKIP_WAITING"}); });
  });
  navigator.serviceWorker?.addEventListener?.("controllerchange",()=>location.reload());

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
