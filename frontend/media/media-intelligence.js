(() => {
  "use strict";

  const normalize = value => value == null ? "unknown" : String(value);

  function browserSnapshot() {
    const userAgent = navigator.userAgent || "";
    const device = /Mobile|Android|iPhone|iPad|Windows Phone/i.test(userAgent) ? "mobile" : "desktop";
    const platform = navigator.platform || "unknown";
    const browser = /Edg\//.test(userAgent)
      ? "edge"
      : /OPR\//.test(userAgent)
        ? "opera"
        : /Chrome\//.test(userAgent)
          ? "chrome"
          : /Firefox\//.test(userAgent)
            ? "firefox"
            : /Safari\//.test(userAgent)
              ? "safari"
              : "unknown";

    return { browser, device, platform, userAgent };
  }

  function capabilitySnapshot() {
    const mediaDevices = navigator.mediaDevices || {};
    const supportsGetUserMedia = typeof mediaDevices.getUserMedia === "function";
    const supportsEnumerateDevices = typeof mediaDevices.enumerateDevices === "function";
    const supportsScreenShare = !!(navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function");
    const supportsWebRTC = typeof window.RTCPeerConnection === "function" || typeof window.RTCPeerConnection === "object";
    const supportsAudioOutput = "setSinkId" in HTMLMediaElement.prototype;

    return {
      camera: supportsGetUserMedia,
      microphone: supportsGetUserMedia,
      screenShare: supportsScreenShare,
      audioOutput: supportsAudioOutput,
      enumeratingDevices: supportsEnumerateDevices,
      webrtc: supportsWebRTC
    };
  }

  function buildDisplayMediaRequest(options = {}) {
    const width = Number(options.width) || 1920;
    const height = Number(options.height) || 1080;
    const fps = Number(options.fps) || 30;
    const preferAudio = options.preferAudio !== false;
    const request = {
      video: {
        width: { ideal: width, max: width },
        height: { ideal: height, max: height },
        frameRate: { ideal: fps, max: fps },
        cursor: "always"
      }
    };

    request.audio = preferAudio && !!navigator.mediaDevices?.getDisplayMedia;
    return request;
  }

  const state = { events: [] };

  function recordEvent(event, detail = {}) {
    const entry = {
      at: new Date().toISOString(),
      event,
      detail: Object.keys(detail || {}).reduce((acc, key) => {
        const value = detail[key];
        acc[key] = typeof value === "function" ? "function" : value;
        return acc;
      }, {})
    };

    state.events.push(entry);
    if (state.events.length > 32) state.events.shift();
    return entry;
  }

  const intelligence = {
    version: "12.1.0-evolution.1",
    buildDisplayMediaRequest,
    snapshot() {
      return {
        browser: browserSnapshot(),
        capabilities: capabilitySnapshot(),
        app: {
          origin: window.location.origin,
          pathname: window.location.pathname,
          hasSocket: typeof window.io !== "undefined"
        },
        timeline: [...state.events]
      };
    },
    detect() {
      const capabilities = capabilitySnapshot();
      const summary = {
        ready: Boolean(capabilities.webrtc || capabilities.screenShare || capabilities.camera || capabilities.microphone),
        screenShare: capabilities.screenShare,
        microphone: capabilities.microphone,
        camera: capabilities.camera,
        speakers: capabilities.audioOutput,
        browser: browserSnapshot().browser,
        device: browserSnapshot().device
      };
      recordEvent("media-detect", summary);
      return summary;
    },
    record: recordEvent,
    getHistory() {
      return [...state.events];
    }
  };

  window.HLMediaIntelligence = intelligence;

  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("hl:media-intelligence-ready", {
      detail: { version: intelligence.version }
    }));
  }

  recordEvent("media-intelligence-ready", { version: intelligence.version, origin: normalize(window.location.origin) });
})();
