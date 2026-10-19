(() => {
  "use strict";

  const valid = new Set([
    "disconnected",
    "requesting-permission",
    "connecting",
    "connected",
    "reconnecting",
    "ready",
    "muted",
    "error",
    "unavailable"
  ]);

  const state = {
    phase: "disconnected",
    meta: {},
    history: [],
    listeners: new Set()
  };

  function publish(nextPhase, detail = {}) {
    state.phase = nextPhase;
    state.meta = { ...detail };
    state.history.push({ phase: nextPhase, at: Date.now(), detail: { ...detail } });
    if (state.history.length > 20) state.history.shift();

    const root = typeof document !== "undefined" ? document.documentElement : null;
    if (root) root.dataset.hlVoiceState = nextPhase;

    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      const event = new CustomEvent("hl:voice-state", { detail: { phase: nextPhase, meta: { ...detail } } });
      window.dispatchEvent(event);
    }

    for (const listener of state.listeners) {
      try {
        listener(nextPhase, { ...detail });
      } catch {}
    }
  }

  window.HLVoiceState = {
    validStates: [...valid],
    phase: state.phase,
    history: state.history,
    get() { return state.phase; },
    getMeta() { return { ...state.meta }; },
    is(name) { return state.phase === name; },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      state.listeners.add(listener);
      return () => state.listeners.delete(listener);
    },
    set(next, detail = {}) {
      if (!valid.has(next)) return state.phase;
      publish(next, detail);
      this.phase = state.phase;
      this.history = state.history;
      return state.phase;
    },
    transition(next, detail = {}) {
      return this.set(next, detail);
    },
    reset() {
      publish("disconnected", { reason: "reset" });
      this.phase = state.phase;
      this.history = state.history;
      return state.phase;
    }
  };

  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.dataset.hlVoiceState = state.phase;
  }
})();
