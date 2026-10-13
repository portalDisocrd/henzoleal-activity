(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const createButton = $("create");
  const joinButton = $("join");
  if (!createButton || !joinButton) return;

  const originalCreate = createButton.onclick;
  const originalJoin = joinButton.onclick;
  let micStream = null;
  let meterRaf = 0;
  let audioContext = null;
  let resolvePrejoin = null;
  let nextAction = "join";

  function toast(message, tone = "info") {
    let stack = document.querySelector(".hl-home-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "hl-home-toast-stack";
      document.body.appendChild(stack);
    }
    const item = document.createElement("div");
    item.className = `hl-home-toast hl-tone-${tone}`;
    item.textContent = message;
    stack.appendChild(item);
    setTimeout(() => item.remove(), 3200);
  }

  function ensureClientId() {
    let id = localStorage.getItem("hl_client_id");
    if (!id) {
      id = (crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9_-]/g, "");
      localStorage.setItem("hl_client_id", id);
    }
    return id;
  }
  ensureClientId();

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
    setTimeout(() => sync(), 120);
    button.addEventListener("click", async () => {
      const result = await window.HLPWA?.install?.();
      toast(result?.success ? "HL Activity instalado como app." : "Instalação cancelada ou indisponível.", result?.success ? "success" : "info");
    });
  }

  function renderRecentRooms() {
    const panel = document.querySelector(".panel");
    if (!panel) return;
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem("hl_recent_rooms") || "[]"); } catch {}
    if (!Array.isArray(recent) || recent.length === 0) return;
    const favorites = new Set(JSON.parse(localStorage.getItem("hl_favorite_rooms") || "[]"));
    recent.sort((a, b) => (favorites.has(b.code) - favorites.has(a.code)) || ((b.lastVisited || 0) - (a.lastVisited || 0)));
    const block = document.createElement("div");
    block.className = "hl-recent-rooms";
    block.innerHTML = '<div class="hl-recent-head"><span>Salas recentes</span><button type="button">Limpar</button></div><div class="hl-recent-list"></div>';
    const list = block.querySelector(".hl-recent-list");
    recent.slice(0, 4).forEach(item => {
      if (!item?.code || !/^[A-F0-9]{8}$/.test(item.code)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hl-recent-room";
      const star = favorites.has(item.code) ? "★" : "☆";
      button.innerHTML = `<span>${star} ${item.code}</span><small>${item.lastVisited ? new Date(item.lastVisited).toLocaleDateString("pt-BR") : "Recente"}</small>`;
      button.addEventListener("click", () => { $("roomCode").value = item.code; joinButton.click(); });
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
          <div><span class="hl-prejoin-kicker">PRÉ-ENTRADA</span><h2 id="hlPrejoinTitle">Pronto para entrar?</h2><p>Confira áudio, perfil e quem já está na sala.</p></div>
          <button class="hl-prejoin-close" type="button" aria-label="Fechar">×</button>
        </div>
        <div class="hl-prejoin-preview" id="hlPrejoinPreview" hidden></div>
        <div class="hl-prejoin-grid">
          <label><span>Microfone</span><select id="hlPrejoinMic"><option value="">Dispositivo padrão</option></select></label>
          <label><span>Saída de áudio</span><select id="hlPrejoinOutput"><option value="">Dispositivo padrão</option></select></label>
        </div>
        <div class="hl-prejoin-meter"><i id="hlPrejoinMeter"></i></div>
        <div class="hl-prejoin-test-actions">
          <button id="hlPrejoinTest" type="button">🎙 Testar microfone</button>
          <button id="hlPrejoinTestOutput" type="button">🔊 Testar áudio</button>
        </div>
        <div class="hl-prejoin-permission" id="hlPrejoinPermission" data-state="idle"><span>●</span><div><strong>Microfone ainda não testado</strong><small>Você pode entrar sem voz e liberar depois.</small></div></div>
        <label class="hl-prejoin-check"><input id="hlPrejoinMuted" type="checkbox"><span>Entrar no voz mutado por padrão</span></label>
        <div class="hl-prejoin-actions"><button id="hlPrejoinCancel" type="button">Cancelar</button><button id="hlPrejoinContinue" class="is-primary" type="button">Continuar →</button></div>
      </section>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  const prejoin = buildPrejoin();
  const micSelect = $("hlPrejoinMic");
  const outputSelect = $("hlPrejoinOutput");
  const meter = $("hlPrejoinMeter");
  const permission = $("hlPrejoinPermission");

  function setPermission(state, title, subtitle) {
    permission.dataset.state = state;
    permission.querySelector("strong").textContent = title;
    permission.querySelector("small").textContent = subtitle;
  }

  async function populateDevices() {
    try {
      const devices = await navigator.mediaDevices?.enumerateDevices?.();
      const mics = (devices || []).filter(d => d.kind === "audioinput");
      const outs = (devices || []).filter(d => d.kind === "audiooutput");
      micSelect.innerHTML = '<option value="">Dispositivo padrão</option>';
      outputSelect.innerHTML = '<option value="">Dispositivo padrão</option>';
      mics.forEach((d, i) => { const o = document.createElement("option"); o.value = d.deviceId; o.textContent = d.label || `Microfone ${i + 1}`; if (d.deviceId === localStorage.getItem("hl_voice_mic")) o.selected = true; micSelect.appendChild(o); });
      outs.forEach((d, i) => { const o = document.createElement("option"); o.value = d.deviceId; o.textContent = d.label || `Saída ${i + 1}`; if (d.deviceId === localStorage.getItem("hl_voice_output")) o.selected = true; outputSelect.appendChild(o); });
      outputSelect.disabled = !("setSinkId" in HTMLMediaElement.prototype) || outs.length === 0;
    } catch {}
  }

  function stopMicTest() {
    if (meterRaf) cancelAnimationFrame(meterRaf);
    meterRaf = 0;
    micStream?.getTracks().forEach(t => t.stop());
    micStream = null;
    if (meter) meter.style.width = "0%";
  }

  $("hlPrejoinTest").addEventListener("click", async () => {
    stopMicTest();
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: micSelect.value ? { exact: micSelect.value } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      await populateDevices();
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(micStream);
      source.connect(analyser); analyser.fftSize = 128;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!micStream) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a,b)=>a+b,0) / data.length;
        meter.style.width = `${Math.min(100, Math.max(3, avg * 1.7))}%`;
        meterRaf = requestAnimationFrame(tick);
      };
      tick();
      setPermission("granted", "Microfone liberado", "Fale para conferir o nível. Você pode trocar o dispositivo acima.");
    } catch (error) {
      const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
      setPermission("denied", denied ? "Permissão de microfone negada" : "Não foi possível abrir o microfone", denied ? "Libere o microfone nas permissões do navegador ou entre sem voz." : "Confira se outro aplicativo está usando o dispositivo.");
      toast(denied ? "Permissão de microfone negada." : "Falha ao testar microfone.", "error");
    }
  });

  $("hlPrejoinTestOutput").addEventListener("click", async () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); const dest = ctx.createMediaStreamDestination();
      osc.frequency.value = 540; gain.gain.value = .08; osc.connect(gain); gain.connect(dest);
      const audio = new Audio(); audio.srcObject = dest.stream;
      if (outputSelect.value && typeof audio.setSinkId === "function") await audio.setSinkId(outputSelect.value);
      await audio.play(); osc.start(); osc.stop(ctx.currentTime + .35);
      setTimeout(() => { audio.pause(); audio.srcObject = null; ctx.close().catch(()=>{}); }, 600);
      toast("Som de teste reproduzido.", "success");
    } catch { toast("Não foi possível testar essa saída de áudio.", "error"); }
  });

  async function loadRoomPreview() {
    const box = $("hlPrejoinPreview");
    box.hidden = true; box.textContent = "";
    if (nextAction !== "join") return;
    const code = $("roomCode")?.value?.trim()?.toUpperCase();
    if (!code) return;
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
      if (!response.ok) return;
      const data = await response.json();
      const names = (data.preview || []).map(p => `<span title="${String(p.name).replace(/["&<>]/g, "")}">${p.avatar || "🙂"}</span>`).join("");
      box.innerHTML = `<div><strong>${data.users || 0} ${data.users === 1 ? "pessoa" : "pessoas"} na sala</strong><small>${data.locked ? "Sala trancada" : data.entryPolicy === "approveAll" ? "Entrada com aprovação" : data.entryPolicy === "approveUnknown" ? "Desconhecidos precisam de aprovação" : "Entrada automática"}${data.hasPassword ? " • senha ativa" : ""}</small></div><div class="hl-prejoin-avatars">${names || "<em>Sala vazia</em>"}</div>`;
      box.hidden = false;
    } catch {}
  }

  function closePrejoin(result) {
    stopMicTest(); prejoin.hidden = true; document.body.classList.remove("hl-modal-open");
    const resolve = resolvePrejoin; resolvePrejoin = null; resolve?.(result);
  }
  prejoin.querySelector(".hl-prejoin-close").addEventListener("click",()=>closePrejoin(false));
  prejoin.querySelector(".hl-prejoin-backdrop").addEventListener("click",()=>closePrejoin(false));
  $("hlPrejoinCancel").addEventListener("click",()=>closePrejoin(false));
  $("hlPrejoinContinue").addEventListener("click",()=>{
    localStorage.setItem("hl_voice_mic", micSelect.value || "");
    localStorage.setItem("hl_voice_output", outputSelect.value || "");
    sessionStorage.setItem("hl_prejoin_muted", $("hlPrejoinMuted").checked ? "1" : "0");
    closePrejoin(true);
  });

  async function showPrejoin(action) {
    nextAction = action;
    prejoin.hidden = false; document.body.classList.add("hl-modal-open");
    $("hlPrejoinMuted").checked = sessionStorage.getItem("hl_prejoin_muted") === "1";
    setPermission("idle", "Microfone ainda não testado", "Você pode entrar sem voz e liberar depois.");
    await populateDevices(); await loadRoomPreview();
    return new Promise(resolve => { resolvePrejoin = resolve; });
  }

  createButton.onclick = async () => { if (await showPrejoin("create")) originalCreate?.(); };
  joinButton.onclick = async () => { if (await showPrejoin("join")) originalJoin?.(); };

  injectInstall();
  renderRecentRooms();
})();
