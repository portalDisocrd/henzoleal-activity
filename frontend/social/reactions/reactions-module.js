(() => {
  "use strict";

  const DEFAULTS = Object.freeze({
    maxVisible: 3,
    durationMs: 1350,
    cooldownMs: 500
  });

  function createReactionController(options = {}) {
    const {
      socket,
      stage,
      picker,
      trigger,
      toast = () => {},
      beforeOpen = () => {},
      maxVisible = DEFAULTS.maxVisible,
      durationMs = DEFAULTS.durationMs,
      cooldownMs = DEFAULTS.cooldownMs
    } = options;

    if (!socket || !stage || !picker || !trigger) return null;

    const seenIds = new Set();
    let lastReactionAt = 0;
    let open = false;
    let resizeObserver = null;

    const layer = document.createElement("div");
    layer.id = "hlFloatingReactions";
    layer.className = "hl-floating-reactions hl-reaction-layer";
    layer.setAttribute("aria-live", "polite");
    layer.setAttribute("aria-atomic", "false");
    document.body.appendChild(layer);

    function syncLayer() {
      const rect = stage.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const right = Math.min(window.innerWidth, rect.right);
      const bottom = Math.min(window.innerHeight, rect.bottom);
      layer.style.left = `${left}px`;
      layer.style.top = `${top}px`;
      layer.style.width = `${Math.max(0, right - left)}px`;
      layer.style.height = `${Math.max(0, bottom - top)}px`;
      layer.hidden = right <= left || bottom <= top;
    }

    function remember(id) {
      if (!id) return true;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      if (seenIds.size > 80) seenIds.delete(seenIds.values().next().value);
      return true;
    }

    function release(id) {
      if (id) seenIds.delete(id);
    }

    function show(emoji, reactionId = "") {
      if (!emoji || !remember(reactionId)) return false;
      syncLayer();
      while (layer.childElementCount >= maxVisible) layer.firstElementChild?.remove();
      const el = document.createElement("div");
      el.className = "hl-floating-reaction hl-floating-reaction-vfx";
      el.textContent = emoji;
      el.setAttribute("role", "status");
      el.setAttribute("aria-label", `Reação ${emoji}`);
      el.style.setProperty("--hl-reaction-x", `${Math.floor(Math.random() * 17) - 8}px`);
      layer.appendChild(el);
      window.setTimeout(() => el.remove(), durationMs);
      return true;
    }

    function close() {
      picker.hidden = true;
      open = false;
      trigger.classList.remove("is-active");
      trigger.setAttribute("aria-expanded", "false");
    }

    function openPicker() {
      beforeOpen();
      picker.hidden = false;
      open = true;
      trigger.classList.add("is-active");
      trigger.setAttribute("aria-expanded", "true");
      picker.querySelector("[data-reaction]")?.focus?.({ preventScroll: true });
    }

    function toggle() {
      if (open) close();
      else openPicker();
    }

    function send(emoji) {
      const now = Date.now();
      if (!emoji || now - lastReactionAt < cooldownMs) return;
      lastReactionAt = now;
      const reactionId = globalThis.crypto?.randomUUID?.() || `${socket.id || "local"}-${now}-${Math.random().toString(36).slice(2)}`;
      show(emoji, reactionId);
      socket.emit("reaction:send", { emoji, reactionId }, result => {
        if (result && result.success === false) {
          release(reactionId);
          toast(result.message || "Não foi possível enviar a reação.");
        }
      });
      close();
    }

    function onPickerClick(event) {
      const button = event.target.closest("[data-reaction]");
      if (!button || !picker.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();
      send(button.dataset.reaction);
    }

    function onDocumentClick(event) {
      if (open && !picker.contains(event.target) && event.target !== trigger && !trigger.contains(event.target)) close();
    }

    function onKeyDown(event) {
      if (event.key === "Escape" && open) close();
    }

    function onRemote(data) {
      if (!data?.emoji) return;
      show(data.emoji, data.reactionId || `${data.senderId || "remote"}-${data.at || Date.now()}`);
    }

    picker.addEventListener("click", onPickerClick);
    document.addEventListener("click", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", syncLayer, { passive: true });
    document.addEventListener("scroll", syncLayer, true);
    socket.on("reaction:show", onRemote);

    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(syncLayer);
      resizeObserver.observe(stage);
    }

    trigger.setAttribute("aria-expanded", "false");
    requestAnimationFrame(syncLayer);

    return {
      toggle,
      close,
      show,
      send,
      sync: syncLayer,
      isOpen: () => open,
      destroy() {
        close();
        picker.removeEventListener("click", onPickerClick);
        document.removeEventListener("click", onDocumentClick);
        document.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", syncLayer);
        document.removeEventListener("scroll", syncLayer, true);
        socket.off?.("reaction:show", onRemote);
        resizeObserver?.disconnect?.();
        layer.remove();
        seenIds.clear();
      }
    };
  }

  window.HLReactionsModule = Object.freeze({
    version: "12.0.7-foundation.7",
    ...DEFAULTS,
    createReactionController
  });
})();
