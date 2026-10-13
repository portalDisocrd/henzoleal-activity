(() => {
  "use strict";
  const fallback=[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}];
  window.HLVoiceConfig={
    rtc(){ const list=window.HL_CONFIG?.iceServers; return {iceServers:Array.isArray(list)&&list.length?list:fallback}; },
    supports(){ return Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia); }
  };
})();
