(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const createButton = $("create");
  const joinButton = $("join");
  const originalCreate = createButton?.onclick;
  const originalJoin = joinButton?.onclick;
  let micStream = null;

  function toast(message) {
    let stack = document.querySelector(".hl-home-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "hl-home-toast-stack";
      document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = "hl-home-toast";
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 2600);
  }

  function injectInstall() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hl-install-app";
    button.hidden = true;
    button.innerHTML = '<span aria-hidden="true">⬇</span><span>Instalar HL</span>';
    document.body.appendChild(button);
    const sync = event => {
      const detail = event?.detail || {};
      button.hidden = !(detail.canInstall || window.HLPWA?.canInstall?.());
    };
    window.addEventListener("hl:pwa-state", sync);
    setTimeout(() => sync(), 100);
    button.addEventListener("click", async () => {
      const result = await window.HLPWA?.install?.();
      toast(result?.success ? "HL Activity instalado como aplicativo." : "Instalação cancelada ou indisponível.");
    });
  }

  function renderRecentRooms() {
    const panel = document.querySelector(".panel");
    if (!panel) return;
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem("hl_recent_rooms") || "[]"); } catch {}
    if (!Array.isArray(recent) || recent.length === 0) return;
    const block = document.createElement("div");
    block.className = "hl-recent-rooms";
    block.innerHTML = '<div class="hl-recent-head"><span>Salas recentes</span><button type="button">Limpar</button></div><div class="hl-recent-list"></div>';
    const list = block.querySelector(".hl-recent-list");
    recent.slice(0, 4).forEach(item => {
      if (!item?.code || !/^[A-F0-9]{8}$/.test(item.code)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hl-recent-room";
      button.innerHTML = `<span>${item.code}</span><small>${item.lastVisited ? new Date(item.lastVisited).toLocaleDateString("pt-BR") : "Recente"}</small>`;
      button.addEventListener("click", () => { $("roomCode").value = item.code; joinButton?.click(); });
      list.appendChild(button);
    });
    block.querySelector(".hl-recent-head button").addEventListener("click", () => {
      localStorage.removeItem("hl_recent_rooms");
      block.remove();
    });
    panel.appendChild(block);
  }

  function buildPrejoin() {
    const overlay = document.createElement("div");
    overlay.className = "hl-prejoin";
    overlay.hidden = true;
    overlay.innerHTML = `
      <button class="hl-prejoin-backdrop" type="button" aria-label="Fechar"></button>
      <section class="hl-prejoin-card" role="dialog" aria-modal="true" aria-labelledby="hlPrejoinTitle">
        <div class="hl-prejoin-head">
          <div><span class="hl-prejoin-kicker">PRÉ-ENTRADA</span><h2 id="hlPrejoinTitle">Tudo certo para entrar?</h2><p>Teste seu áudio antes de abrir a sala.</p></div>
          <button class="hl-prejoin-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="hl-prejoin-device">
          <label><span>Microfone</span><select id="hlPrejoinMic"><option value="">Dispositivo padrão</option></select></label>
          <div class="hl-prejoin-meter"><i id="hlPrejoinMeter"></i></div>
          <button id="hlPrejoinTest" type="button">🎙 Testar microfone</button>
        </div>
        <label class="hl-prejoin-check"><input id="hlPrejoinMuted" type="checkbox"><span>Entrar no voz mutado por padrão</span></label>
        <div class="hl-prejoin-actions"><button id="hlPrejoinCancel" type="button">Cancelar</button><button id="hlPrejoinContinue" class="is-primary" type="button">Continuar →</button></div>
      </section>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  const prejoin = buildPrejoin();
  const micSelect = $("hlPrejoinMic");
  const meter = $("hlPrejoinMeter");
  let meterTimer = null;
  let resolvePrejoin = null;

  async function populateMics() {
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.();
      const mics = (devices || []).filter(device => device.kind === "audioinput");
      micSelect.innerHTML = '<option value="">Dispositivo padrão</option>';
      mics.forEach((device, index) => {
        const option = document.createElement("option");
        option.value = device.deviceId;
        option.textContent = device.label || `Microfone ${index + 1}`;
        if (device.deviceId === localStorage.getItem("hl_voice_mic")) option.selected = true;
        micSelect.appendChild(option);
      });
    } catch {}
  }

  function stopMicTest() {
    if (meterTimer) cancelAnimationFrame(meterTimer);
    meterTimer = null;
    micStream?.getTracks().forEach(track => track.stop());
    micStream = null;
    if (meter) meter.style.width = "0%";
  }

  $("hlPrejoinTest").addEventListener("click", async () => {
    stopMicTest();
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: micSelect.value ? { exact: micSelect.value } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      await populateMics();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      const source = ctx.createMediaStreamSource(micStream);
      source.connect(analyser);
      analyser.fftSize = 128;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!micStream) return ctx.close().catch(() => {});
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
        meter.style.width = `${Math.min(100, Math.max(4, avg * 1.8))}%`;
        meterTimer = requestAnimationFrame(tick);
      };
      tick();
      toast("Microfone liberado. Fale para testar o nível.");
    } catch {
      toast("Não foi possível acessar o microfone. Confira a permissão do navegador.");
    }
  });

  function closePrejoin(result) {
    stopMicTest();
    prejoin.hidden = true;
    document.body.classList.remove("hl-modal-open");
    const resolve = resolvePrejoin;
    resolvePrejoin = null;
    resolve?.(result);
  }
  prejoin.querySelector(".hl-prejoin-close").addEventListener("click", () => closePrejoin(false));
  prejoin.querySelector(".hl-prejoin-backdrop").addEventListener("click", () => closePrejoin(false));
  $("hlPrejoinCancel").addEventListener("click", () => closePrejoin(false));
  $("hlPrejoinContinue").addEventListener("click", () => {
    localStorage.setItem("hl_voice_mic", micSelect.value || "");
    sessionStorage.setItem("hl_prejoin_muted", $("hlPrejoinMuted").checked ? "1" : "0");
    closePrejoin(true);
  });

  async function showPrejoin() {
    prejoin.hidden = false;
    document.body.classList.add("hl-modal-open");
    $("hlPrejoinMuted").checked = sessionStorage.getItem("hl_prejoin_muted") === "1";
    await populateMics();
    return new Promise(resolve => { resolvePrejoin = resolve; });
  }

  if (createButton && typeof originalCreate === "function") {
    createButton.onclick = async () => { if (await showPrejoin()) originalCreate(); };
  }
  if (joinButton && typeof originalJoin === "function") {
    joinButton.onclick = async () => { if (await showPrejoin()) originalJoin(); };
  }

  injectInstall();
  renderRecentRooms();
})();
