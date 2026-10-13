(() => {
  "use strict";
  const select = document.getElementById("hlRoomEntryMic");
  const test = document.getElementById("hlRoomEntryMicTest");
  const meter = document.getElementById("hlRoomEntryMeter");
  const status = document.getElementById("hlRoomEntryMicStatus");
  const muted = document.getElementById("hlRoomEntryMuted");
  if (!select || !test || !meter || !status || !muted) return;

  let stream = null, context = null, raf = 0;
  muted.checked = sessionStorage.getItem("hl_prejoin_muted") === "1";
  muted.addEventListener("change", () => sessionStorage.setItem("hl_prejoin_muted", muted.checked ? "1" : "0"));

  async function refresh() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const previous = localStorage.getItem("hl_voice_mic") || "";
    select.innerHTML = '<option value="">Padrão do sistema</option>';
    devices.filter(d => d.kind === "audioinput").forEach((d, index) => {
      const option = document.createElement("option");
      option.value = d.deviceId;
      option.textContent = d.label || `Microfone ${index + 1}`;
      select.appendChild(option);
    });
    if (previous && Array.from(select.options).some(o => o.value === previous)) select.value = previous;
  }

  function stop() {
    cancelAnimationFrame(raf);
    stream?.getTracks?.().forEach(track => track.stop());
    stream = null;
    context?.close?.().catch?.(() => {});
    context = null;
    meter.style.width = "0%";
    test.textContent = "Testar microfone";
  }

  test.addEventListener("click", async () => {
    if (stream) { stop(); status.textContent = "Teste encerrado."; return; }
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = "Microfone não suportado neste navegador."; return; }
    try {
      status.textContent = "Solicitando microfone…";
      stream = await navigator.mediaDevices.getUserMedia({ audio: select.value ? { deviceId: { exact: select.value } } : true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      context = new AudioCtx();
      const analyser = context.createAnalyser(); analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      test.textContent = "Parar teste";
      status.textContent = "Microfone ativo. Fale para testar.";
      const tick = () => {
        if (!stream) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a,b) => a+b, 0) / Math.max(1, data.length);
        meter.style.width = `${Math.min(100, Math.max(3, avg * 1.5))}%`;
        raf = requestAnimationFrame(tick);
      };
      tick();
      await refresh();
    } catch (error) {
      stop();
      status.textContent = error?.name === "NotAllowedError" ? "Permissão de microfone negada." : "Não foi possível testar o microfone.";
    }
  });

  select.addEventListener("change", () => {
    if (select.value) localStorage.setItem("hl_voice_mic", select.value); else localStorage.removeItem("hl_voice_mic");
    if (stream) { stop(); status.textContent = "Dispositivo alterado. Teste novamente se quiser."; }
  });
  navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
  window.addEventListener("pagehide", stop, { once: true });
  refresh();
})();
