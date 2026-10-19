(() => {
  "use strict";

  function emptyReport() {
    return {
      phase: "unknown",
      supports: {
        getUserMedia: !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"),
        enumerateDevices: !!(navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === "function"),
        setSinkId: "setSinkId" in HTMLMediaElement.prototype,
        peerConnection: typeof window.RTCPeerConnection === "function" || typeof window.RTCPeerConnection === "object"
      },
      devices: {
        inputs: [],
        outputs: []
      },
      warnings: [],
      logs: []
    };
  }

  const state = {
    log: [],
    phase: "unknown"
  };

  async function collect() {
    const report = emptyReport();
    const currentPhase = window.HLVoiceState?.get?.() || state.phase || "unknown";
    report.phase = currentPhase;

    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        report.devices = {
          inputs: devices.filter(device => device.kind === "audioinput"),
          outputs: devices.filter(device => device.kind === "audiooutput")
        };
      }
    } catch (error) {
      report.warnings.push(error?.message || "Não foi possível listar dispositivos de áudio.");
    }

    return report;
  }

  function record(message, detail = {}) {
    const entry = {
      at: new Date().toISOString(),
      message,
      detail
    };
    state.log.push(entry);
    if (state.log.length > 32) state.log.shift();
    return entry;
  }

  const diagnostics = {
    version: "12.1.0-evolution.1",
    record,
    collect,
    snapshot: collect,
    getLog() {
      return [...state.log];
    },
    getState() {
      return window.HLVoiceState?.get?.() || state.phase || "unknown";
    },
    setPhase(nextPhase, detail = {}) {
      if (typeof nextPhase !== "string") return state.phase;
      state.phase = nextPhase;
      if (window.HLVoiceState?.set) {
        window.HLVoiceState.set(nextPhase, detail);
      }
      if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new CustomEvent("hl:voice-diagnostics", { detail: { phase: nextPhase, meta: detail } }));
      }
      return state.phase;
    },
    async summary() {
      const report = await collect();
      return {
        phase: report.phase,
        supports: report.supports,
        microphoneCount: report.devices.inputs.length,
        outputCount: report.devices.outputs.length,
        warnings: report.warnings,
        logs: report.logs
      };
    }
  };

  window.HLVoiceDiagnostics = diagnostics;

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("hl:voice-diagnostics-ready", { detail: { version: diagnostics.version } }));
  }

  record("voice diagnostics initialized", { version: diagnostics.version, state: diagnostics.getState() });
})();
