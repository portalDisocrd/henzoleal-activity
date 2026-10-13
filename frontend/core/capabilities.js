(() => {
  "use strict";
  const caps = Object.freeze({
    displayCapture: Boolean(navigator.mediaDevices?.getDisplayMedia),
    microphone: Boolean(navigator.mediaDevices?.getUserMedia),
    mediaDevices: Boolean(navigator.mediaDevices),
    audioOutput: typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype,
    wakeLock: Boolean(navigator.wakeLock),
    pictureInPicture: Boolean(document.pictureInPictureEnabled),
    audioContext: Boolean(window.AudioContext || window.webkitAudioContext)
  });
  window.HLCapabilities = caps;
  for (const [key,value] of Object.entries(caps)) document.documentElement.dataset[`hlCap${key[0].toUpperCase()}${key.slice(1)}`] = value ? "1" : "0";
  window.dispatchEvent(new CustomEvent("hl:capabilities", { detail: caps }));
})();
