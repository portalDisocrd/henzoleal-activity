(() => {
  "use strict";

  const STATES = Object.freeze([
    "pre-entry",
    "joining",
    "joined",
    "waiting",
    "reconnecting",
    "error",
    "leaving",
    "closed"
  ]);

  const ALLOWED = Object.freeze({
    "pre-entry": new Set(["joining", "reconnecting", "error", "leaving"]),
    "joining": new Set(["joined", "waiting", "pre-entry", "reconnecting", "error", "leaving"]),
    "joined": new Set(["waiting", "reconnecting", "error", "leaving"]),
    "waiting": new Set(["joining", "pre-entry", "reconnecting", "error", "leaving"]),
    "reconnecting": new Set(["joining", "joined", "waiting", "pre-entry", "error", "leaving"]),
    "error": new Set(["pre-entry", "joining", "reconnecting", "leaving"]),
    "leaving": new Set(["closed"]),
    "closed": new Set()
  });

  function emitState(previous, state, detail) {
    document.documentElement.dataset.hlRoomState = state;
    window.dispatchEvent(new CustomEvent("hl:room-state", {
      detail: {
        previous,
        state,
        ...(detail || {})
      }
    }));
  }

  function create(options = {}) {
    let state = STATES.includes(options.initial) ? options.initial : "pre-entry";
    let destroyed = false;

    document.documentElement.dataset.hlRoomState = state;

    function transition(next, detail = {}) {
      if (destroyed) return state;
      if (!STATES.includes(next)) {
        console.warn("HL room lifecycle: estado desconhecido", next);
        return state;
      }
      if (next === state) return state;

      const allowed = ALLOWED[state];
      if (allowed && !allowed.has(next)) {
        console.warn(`HL room lifecycle: transicao inesperada ${state} -> ${next}`);
      }

      const previous = state;
      state = next;
      emitState(previous, state, detail);
      return state;
    }

    function getState() {
      return state;
    }

    function is(...states) {
      return states.includes(state);
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      const previous = state;
      state = "closed";
      emitState(previous, state, { reason: "destroy" });
    }

    return Object.freeze({
      transition,
      getState,
      is,
      destroy
    });
  }

  window.HLRoomLifecycle = Object.freeze({
    version: window.HL_APP_VERSION || "unknown",
    states: STATES,
    create
  });
})();
