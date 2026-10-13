(() => {
  "use strict";
  const valid = new Set(["disconnected","requesting-permission","connecting","connected","reconnecting","error"]);
  window.HLVoiceState = {
    phase: "disconnected",
    set(next){ if(!valid.has(next)) return this.phase; this.phase=next; document.documentElement.dataset.hlVoiceState=next; window.dispatchEvent(new CustomEvent("hl:voice-state",{detail:{phase:next}})); return next; },
    get(){ return this.phase; }
  };
})();
