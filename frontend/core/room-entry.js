(() => {
  "use strict";

  const select = document.getElementById("hlRoomEntryMic");
  const output = document.getElementById("hlRoomEntryOutput");
  const test = document.getElementById("hlRoomEntryMicTest");
  const testOutput = document.getElementById("hlRoomEntryOutputTest");
  const meter = document.getElementById("hlRoomEntryMeter");
  const status = document.getElementById("hlRoomEntryMicStatus");
  const muted = document.getElementById("hlRoomEntryMuted");

  if (!select || !test || !meter || !status || !muted) return;

  let stream = null;
  let context = null;
  let raf = 0;
  let destroyed = false;

  muted.checked = sessionStorage.getItem("hl_prejoin_muted") === "1";
  muted.addEventListener("change", () => {
    sessionStorage.setItem("hl_prejoin_muted", muted.checked ? "1" : "0");
  });

  async function refresh() {
    if (destroyed || !navigator.mediaDevices?.enumerateDevices) return;

    const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
    const previousMic = localStorage.getItem("hl_voice_mic") || "";
    const previousOutput = localStorage.getItem("hl_voice_output") || "";

    select.innerHTML = '<option value="">Padrão do sistema</option>';
    devices.filter(device => device.kind === "audioinput").forEach((device, index) => {
      const option = document.createElement("option");
      option.value = device.deviceId;
      option.textContent = device.label || `Microfone ${index + 1}`;
      select.appendChild(option);
    });
    if (previousMic && Array.from(select.options).some(option => option.value === previousMic)) {
      select.value = previousMic;
    }

    if (output) {
      output.innerHTML = '<option value="">Padrão do sistema</option>';
      devices.filter(device => device.kind === "audiooutput").forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.textContent = device.label || `Saída ${index + 1}`;
        output.appendChild(option);
      });
      if (previousOutput && Array.from(output.options).some(option => option.value === previousOutput)) {
        output.value = previousOutput;
      }
      output.disabled = !("setSinkId" in HTMLMediaElement.prototype);
    }
  }

  function stop(message = "") {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;

    stream?.getTracks?.().forEach(track => track.stop());
    stream = null;

    if (context) context.close?.().catch?.(() => {});
    context = null;

    meter.style.width = "0%";
    test.textContent = "Testar microfone";
    if (message) status.textContent = message;
  }

  async function startMicTest() {
    if (stream) {
      stop("Teste encerrado.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = "Microfone não suportado neste navegador.";
      return;
    }

    try {
      status.textContent = "Solicitando microfone…";
      stream = await navigator.mediaDevices.getUserMedia({
        audio: select.value ? { deviceId: { exact: select.value } } : true
      });

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      context = new AudioCtx();

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      test.textContent = "Parar teste";
      status.textContent = "Microfone ativo. Fale para testar.";

      const tick = () => {
        if (!stream || destroyed) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, value) => sum + value, 0) / Math.max(1, data.length);
        meter.style.width = `${Math.min(100, Math.max(3, avg * 1.5))}%`;
        raf = requestAnimationFrame(tick);
      };
      tick();
      await refresh();
    } catch (error) {
      stop();
      status.textContent = error?.name === "NotAllowedError"
        ? "Permissão de microfone negada."
        : "Não foi possível testar o microfone.";
    }
  }

  async function playOutputTest() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const destination = audioContext.createMediaStreamDestination();

      oscillator.frequency.value = 540;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(destination);

      const audio = new Audio();
      audio.srcObject = destination.stream;

      if (output?.value && typeof audio.setSinkId === "function") {
        await audio.setSinkId(output.value);
      }

      await audio.play();
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.35);

      setTimeout(() => {
        audio.pause();
        audio.srcObject = null;
        audioContext.close().catch(() => {});
      }, 600);
    } catch {
      status.textContent = "Não foi possível testar essa saída de áudio.";
    }
  }

  function persistDevices() {
    if (select.value) localStorage.setItem("hl_voice_mic", select.value);
    else localStorage.removeItem("hl_voice_mic");

    if (output) {
      if (output.value) localStorage.setItem("hl_voice_output", output.value);
      else localStorage.removeItem("hl_voice_output");
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stop();
    navigator.mediaDevices?.removeEventListener?.("devicechange", refresh);
  }

  test.addEventListener("click", startMicTest);
  testOutput?.addEventListener("click", playOutputTest);

  select.addEventListener("change", () => {
    persistDevices();
    if (stream) stop("Dispositivo alterado. Teste novamente se quiser.");
  });

  output?.addEventListener("change", persistDevices);
  navigator.mediaDevices?.addEventListener?.("devicechange", refresh);
  window.addEventListener("pagehide", destroy, { once: true });

  window.HLRoomEntry = Object.freeze({ refresh, stop, destroy, persistDevices });

  refresh();
})();
