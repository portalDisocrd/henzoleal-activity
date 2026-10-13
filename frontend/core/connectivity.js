(() => {
  "use strict";

  const selectors = [
    "#share",
    "#hlVoiceJoin",
    "#hlSoundAdd",
    "#hlChatSend",
    '[data-sound-action="room"]'
  ];

  let offlineBanner = null;

  function ensureBanner() {
    if (offlineBanner?.isConnected) return offlineBanner;
    offlineBanner = document.createElement("div");
    offlineBanner.id = "hlOfflineBanner";
    offlineBanner.className = "hl-offline-banner";
    offlineBanner.setAttribute("role", "status");
    offlineBanner.textContent = "Sem conexão — recursos em tempo real estão temporariamente indisponíveis.";
    offlineBanner.hidden = true;
    document.body.appendChild(offlineBanner);
    return offlineBanner;
  }

  function apply() {
    const online = navigator.onLine !== false;
    document.body.classList.toggle("hl-offline", !online);
    document.documentElement.dataset.hlNetwork = online ? "online" : "offline";
    ensureBanner().hidden = online;

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(element => {
        if (!(element instanceof HTMLButtonElement || element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) return;
        if (!online) {
          if (!element.dataset.hlOfflineWasDisabled) element.dataset.hlOfflineWasDisabled = element.disabled ? "1" : "0";
          element.disabled = true;
          element.setAttribute("aria-disabled", "true");
        } else if (element.dataset.hlOfflineWasDisabled != null) {
          element.disabled = element.dataset.hlOfflineWasDisabled === "1";
          element.removeAttribute("aria-disabled");
          delete element.dataset.hlOfflineWasDisabled;
        }
      });
    }

    window.dispatchEvent(new CustomEvent("hl:network-state", { detail: { online } }));
    return online;
  }

  window.addEventListener("online", apply);
  window.addEventListener("offline", apply);

  window.HLConnectivity = Object.freeze({
    apply,
    isOnline: () => navigator.onLine !== false
  });
})();
