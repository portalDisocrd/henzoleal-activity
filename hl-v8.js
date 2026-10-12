(() => {
  "use strict";
  if (typeof socket === "undefined") return;

  const $ = id => document.getElementById(id);
  const room = typeof roomCode === "string" ? roomCode : location.pathname.split("/").pop().toUpperCase();
  const state = {
    role: "member",
    entryPolicy: "auto",
    mode: "normal",
    waiting: new Map(),
    performance: localStorage.getItem("hl_performance_mode") === "1",
    reducedMotion: localStorage.getItem("hl_reduced_motion") === "1",
    smartDucking: localStorage.getItem("hl_smart_ducking") !== "off",
    streamVolume: Number(localStorage.getItem("hl_stream_volume") || "1"),
    voiceMaster: Number(localStorage.getItem("hl_voice_master") || "1")
  };
  window.HLV8VoiceMaster = Math.min(1, Math.max(0, state.voiceMaster));

  function toast(message) {
    const stack = $("hlToastStack");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = "hl-toast hl-v8-toast";
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function rememberRoom() {
    let recent = [];
    try { recent = JSON.parse(localStorage.getItem("hl_recent_rooms") || "[]"); } catch {}
    if (!Array.isArray(recent)) recent = [];
    recent = recent.filter(item => item?.code !== room);
    recent.unshift({ code: room, lastVisited: Date.now() });
    localStorage.setItem("hl_recent_rooms", JSON.stringify(recent.slice(0, 8)));
  }

  function applyLocalPrefs() {
    document.documentElement.classList.toggle("hl-performance", state.performance);
    document.documentElement.classList.toggle("hl-reduce-motion", state.reducedMotion);
    if (typeof mainVideo !== "undefined" && mainVideo) mainVideo.volume = Math.min(1, Math.max(0, state.streamVolume));
    window.HLV8VoiceMaster = Math.min(1, Math.max(0, state.voiceMaster));
    document.querySelectorAll("audio[data-voice-user]").forEach(audio => {
      const base = Number(localStorage.getItem(`hl_volume_${audio.dataset.voiceUser}`) || "1");
      audio.volume = Math.min(1, base * window.HLV8VoiceMaster);
    });
  }
  applyLocalPrefs();

  const ui = document.createElement("div");
  ui.innerHTML = `
    <button class="hl-v8-settings-trigger" id="hlV8SettingsTrigger" type="button" aria-label="Configurações" title="Configurações (Ctrl+K)">⚙</button>
    <button class="hl-v8-settings-backdrop" id="hlV8SettingsBackdrop" type="button" aria-label="Fechar configurações" hidden></button>
    <aside class="hl-v8-settings" id="hlV8Settings" aria-label="Configurações HL" hidden>
      <div class="hl-v8-settings-head"><div><span>HL CONTROL</span><h2>Configurações</h2></div><button id="hlV8SettingsClose" type="button" aria-label="Fechar">×</button></div>
      <div class="hl-v8-settings-scroll">
        <section class="hl-v8-setting-section">
          <div class="hl-v8-section-head"><div><h3>Sala</h3><p>Organização e entrada.</p></div></div>
          <div class="hl-v8-mode-grid" id="hlV8Modes">
            <button data-mode="normal" type="button">Normal<small>Equilibrado</small></button>
            <button data-mode="cinema" type="button">Cinema<small>Stream em foco</small></button>
            <button data-mode="gaming" type="button">Jogatina<small>Voz + sons</small></button>
            <button data-mode="study" type="button">Estudo<small>Menos distrações</small></button>
          </div>
          <div class="hl-v8-host-only" id="hlV8HostEntry" hidden>
            <label class="hl-v8-field"><span>Entrada na sala</span><select id="hlV8EntryPolicy"><option value="auto">Automática para todos</option><option value="approveUnknown">Aprovar desconhecidos</option><option value="approveAll">Aprovar todos</option></select></label>
            <div class="hl-v8-invite-actions"><button id="hlV8CopyInvite" type="button">🔗 Convite comum</button><button id="hlV8TrustedInvite" type="button">🛡 Convite confiável</button></div>
            <p class="hl-v8-note">Convite confiável funciona como “amigo”: entra direto quando a sala estiver aprovando desconhecidos.</p>
          </div>
        </section>

        <section class="hl-v8-setting-section hl-v8-host-only" id="hlV8WaitingSection" hidden>
          <div class="hl-v8-section-head"><div><h3>Sala de espera</h3><p id="hlV8WaitingCount">Nenhuma solicitação.</p></div><span class="hl-v8-badge" id="hlV8WaitingBadge">0</span></div>
          <div class="hl-v8-waiting-list" id="hlV8WaitingList"></div>
        </section>

        <section class="hl-v8-setting-section">
          <div class="hl-v8-section-head"><div><h3>Mixer</h3><p>Volumes só neste dispositivo.</p></div></div>
          <label class="hl-v8-range"><span>Transmissão <b id="hlV8StreamValue"></b></span><input id="hlV8StreamVolume" type="range" min="0" max="1" step="0.05"></label>
          <label class="hl-v8-range"><span>Voz <b id="hlV8VoiceValue"></b></span><input id="hlV8VoiceVolume" type="range" min="0" max="1" step="0.05"></label>
          <label class="hl-v8-switch"><input id="hlV8Ducking" type="checkbox"><span>Smart ducking<small>Abaixa o soundboard quando alguém fala.</small></span></label>
        </section>

        <section class="hl-v8-setting-section">
          <div class="hl-v8-section-head"><div><h3>Experiência</h3><p>Performance e instalação.</p></div></div>
          <label class="hl-v8-switch"><input id="hlV8Performance" type="checkbox"><span>Modo desempenho<small>Reduz animações e efeitos visuais.</small></span></label>
          <label class="hl-v8-switch"><input id="hlV8Reduced" type="checkbox"><span>Reduzir animações<small>Também respeita a preferência do sistema.</small></span></label>
          <button class="hl-v8-install" id="hlV8Install" type="button">⬇ Instalar HL Activity como app</button>
        </section>

        <section class="hl-v8-setting-section">
          <div class="hl-v8-section-head"><div><h3>Diagnóstico</h3><p>Estado real desta sessão.</p></div><span class="hl-v8-health" id="hlV8Health">●</span></div>
          <div class="hl-v8-diagnostics" id="hlV8Diagnostics"></div>
        </section>

        <section class="hl-v8-setting-section">
          <div class="hl-v8-section-head"><div><h3>Atalhos</h3><p>Não disparam enquanto você digita.</p></div></div>
          <div class="hl-v8-shortcuts"><span><kbd>M</kbd> Microfone</span><span><kbd>C</kbd> Chat</span><span><kbd>V</kbd> Voz</span><span><kbd>F</kbd> Cinema</span><span><kbd>Ctrl K</kbd> Configurações</span></div>
        </section>
      </div>
    </aside>

    <div class="hl-v8-command" id="hlV8Command" hidden><button class="hl-v8-command-backdrop" type="button" aria-label="Fechar"></button><section><input id="hlV8CommandInput" placeholder="Digite uma ação…" autocomplete="off"><div id="hlV8CommandList"></div></section></div>

    <div class="hl-v8-wait-overlay" id="hlV8WaitOverlay" hidden>
      <div class="hl-v8-wait-card"><div class="hl-v8-wait-pulse">⌛</div><h2>Aguardando o host</h2><p>Sua entrada precisa ser aprovada. Você entra automaticamente quando o host aceitar.</p><button id="hlV8WaitLeave" type="button">Voltar para o início</button></div>
    </div>`;
  document.body.append(...ui.childNodes);

  const settings = $("hlV8Settings");
  const backdrop = $("hlV8SettingsBackdrop");
  const trigger = $("hlV8SettingsTrigger");
  const close = () => { settings.hidden = true; backdrop.hidden = true; document.body.classList.remove("hl-v8-settings-open"); };
  const open = () => { settings.hidden = false; backdrop.hidden = false; document.body.classList.add("hl-v8-settings-open"); updateDiagnostics(); refreshSocialState(); };
  trigger.addEventListener("click", open);
  $("hlV8SettingsClose").addEventListener("click", close);
  backdrop.addEventListener("click", close);

  const dock = document.querySelector(".hl-social-dock");
  if (dock) dock.appendChild(trigger);
  else document.body.appendChild(trigger);

  function updateRoleUI() {
    const host = state.role === "host";
    document.querySelectorAll(".hl-v8-host-only").forEach(el => { el.hidden = !host; });
    $("hlV8EntryPolicy").value = state.entryPolicy || "auto";
    document.querySelectorAll("#hlV8Modes [data-mode]").forEach(btn => {
      btn.classList.toggle("is-active", btn.dataset.mode === state.mode);
      btn.disabled = !(state.role === "host" || state.role === "moderator");
    });
    renderWaiting();
  }

  function refreshSocialState() {
    socket.emit("social:state", result => {
      if (!result?.success) return;
      state.role = result.role || "member";
      state.entryPolicy = result.entryPolicy || "auto";
      state.mode = result.roomMode || "normal";
      state.waiting.clear();
      (result.waiting || []).forEach(item => state.waiting.set(item.id, item));
      updateRoleUI();
    });
  }

  socket.on("room:joined", data => {
    state.role = data?.role || state.role;
    state.entryPolicy = data?.entryPolicy || state.entryPolicy;
    state.mode = data?.roomMode || state.mode;
    rememberRoom();
    updateRoleUI();
    $("hlV8WaitOverlay").hidden = true;
    const current = new URL(location.href);
    if (current.searchParams.has("trust")) {
      current.searchParams.delete("trust");
      history.replaceState(null, "", current.pathname + (current.search ? current.search : "") + current.hash);
    }
  });

  socket.on("room:entry-policy", data => { state.entryPolicy = data?.policy || "auto"; updateRoleUI(); });
  socket.on("room:mode", data => { state.mode = data?.mode || "normal"; updateRoleUI(); });
  socket.on("room:host-changed", data => { if (data?.hostId === socket.id) state.role = "host"; updateRoleUI(); });
  socket.on("participants-update", () => setTimeout(refreshSocialState, 50));

  // Lobby seletivo -----------------------------------------------------------
  window.addEventListener("hl:room-waiting", () => {
    $("hlV8WaitOverlay").hidden = false;
  });
  window.addEventListener("hl:room-approval", event => {
    const data = event.detail || {};
    if (data.approved) {
      toast("Entrada aprovada.");
      $("hlV8WaitOverlay").hidden = true;
    } else {
      toast(data.message || "Entrada recusada.");
      setTimeout(() => location.href = "/", 900);
    }
  });
  socket.on("room:join-request", request => {
    if (!request?.id) return;
    state.waiting.set(request.id, request);
    renderWaiting();
    toast(`${request.name || "Alguém"} quer entrar na sala.`);
  });
  socket.on("room:join-request-removed", data => { if (data?.id) state.waiting.delete(data.id); renderWaiting(); });
  if (window.HLRoomWaitingState) $("hlV8WaitOverlay").hidden = false;
  $("hlV8WaitLeave").addEventListener("click", () => location.href = "/");

  function renderWaiting() {
    const list = $("hlV8WaitingList");
    const badge = $("hlV8WaitingBadge");
    const count = $("hlV8WaitingCount");
    if (!list) return;
    list.textContent = "";
    const requests = Array.from(state.waiting.values());
    badge.textContent = String(requests.length);
    count.textContent = requests.length ? `${requests.length} aguardando aprovação.` : "Nenhuma solicitação.";
    requests.forEach(item => {
      const row = document.createElement("div");
      row.className = "hl-v8-waiting-row";
      const avatar = document.createElement("span");
      avatar.className = "hl-v8-waiting-avatar";
      if (/^https:\/\//.test(item.avatar || "")) { const img = document.createElement("img"); img.src = item.avatar; img.alt = ""; avatar.appendChild(img); } else avatar.textContent = item.avatar || "😎";
      const copy = document.createElement("div"); copy.innerHTML = `<strong>${escapeHtml(item.name || "Convidado")}</strong><small>Solicitou entrada agora</small>`;
      const actions = document.createElement("div");
      const yes = document.createElement("button"); yes.type = "button"; yes.textContent = "Aceitar"; yes.className = "is-accept";
      const no = document.createElement("button"); no.type = "button"; no.textContent = "Recusar";
      yes.addEventListener("click", () => socket.emit("room:approve-join", { target: item.id }, result => { if (result?.success) state.waiting.delete(item.id); else toast(result?.message || "Falha ao aprovar."); renderWaiting(); }));
      no.addEventListener("click", () => socket.emit("room:reject-join", { target: item.id }, result => { if (result?.success) state.waiting.delete(item.id); else toast(result?.message || "Falha ao recusar."); renderWaiting(); }));
      actions.append(yes, no); row.append(avatar, copy, actions); list.appendChild(row);
    });
  }

  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch])); }

  $("hlV8EntryPolicy").addEventListener("change", event => {
    socket.emit("room:entry-policy", { policy: event.target.value }, result => {
      if (!result?.success) { toast(result?.message || "Não foi possível alterar a entrada."); return refreshSocialState(); }
      state.entryPolicy = result.policy; toast("Regra de entrada atualizada.");
    });
  });
  $("hlV8CopyInvite").addEventListener("click", async () => {
    const url = `${location.origin}/room/${room}`;
    try { await navigator.clipboard.writeText(url); toast("Convite comum copiado."); } catch { prompt("Copie o convite:", url); }
  });
  $("hlV8TrustedInvite").addEventListener("click", () => {
    socket.emit("room:create-trusted-invite", async result => {
      if (!result?.success || !result.token) return toast(result?.message || "Não foi possível criar o convite confiável.");
      const url = `${location.origin}/room/${room}?trust=${encodeURIComponent(result.token)}`;
      try { await navigator.clipboard.writeText(url); toast("Convite confiável copiado. Quem usar entra direto."); } catch { prompt("Convite confiável:", url); }
    });
  });

  document.querySelectorAll("#hlV8Modes [data-mode]").forEach(button => button.addEventListener("click", () => {
    if (!(state.role === "host" || state.role === "moderator")) return;
    socket.emit("room:mode", { mode: button.dataset.mode }, result => {
      if (!result?.success) return toast(result?.message || "Não foi possível alterar o modo.");
      state.mode = result.mode; updateRoleUI();
    });
  }));

  // Mixer ------------------------------------------------------------------
  const streamSlider = $("hlV8StreamVolume");
  const voiceSlider = $("hlV8VoiceVolume");
  streamSlider.value = String(state.streamVolume);
  voiceSlider.value = String(state.voiceMaster);
  $("hlV8Ducking").checked = state.smartDucking;
  $("hlV8Performance").checked = state.performance;
  $("hlV8Reduced").checked = state.reducedMotion;

  function syncRangeLabels() {
    $("hlV8StreamValue").textContent = `${Math.round(Number(streamSlider.value) * 100)}%`;
    $("hlV8VoiceValue").textContent = `${Math.round(Number(voiceSlider.value) * 100)}%`;
  }
  syncRangeLabels();
  streamSlider.addEventListener("input", () => { state.streamVolume = Number(streamSlider.value); localStorage.setItem("hl_stream_volume", String(state.streamVolume)); applyLocalPrefs(); syncRangeLabels(); });
  voiceSlider.addEventListener("input", () => { state.voiceMaster = Number(voiceSlider.value); localStorage.setItem("hl_voice_master", String(state.voiceMaster)); applyLocalPrefs(); syncRangeLabels(); });
  $("hlV8Ducking").addEventListener("change", event => { state.smartDucking = event.target.checked; localStorage.setItem("hl_smart_ducking", state.smartDucking ? "on" : "off"); toast(state.smartDucking ? "Smart ducking ativado." : "Smart ducking desativado."); });
  $("hlV8Performance").addEventListener("change", event => { state.performance = event.target.checked; localStorage.setItem("hl_performance_mode", state.performance ? "1" : "0"); applyLocalPrefs(); });
  $("hlV8Reduced").addEventListener("change", event => { state.reducedMotion = event.target.checked; localStorage.setItem("hl_reduced_motion", state.reducedMotion ? "1" : "0"); applyLocalPrefs(); });

  // PWA --------------------------------------------------------------------
  function syncInstall() {
    const button = $("hlV8Install");
    const installed = window.HLPWA?.isInstalled?.();
    button.disabled = installed || !window.HLPWA?.canInstall?.();
    button.textContent = installed ? "✓ HL Activity instalado" : (window.HLPWA?.canInstall?.() ? "⬇ Instalar HL Activity como app" : "Instalação disponível pelo navegador");
  }
  window.addEventListener("hl:pwa-state", syncInstall);
  setTimeout(syncInstall, 100);
  $("hlV8Install").addEventListener("click", async () => { const result = await window.HLPWA?.install?.(); toast(result?.success ? "HL Activity instalado." : "Instalação cancelada ou indisponível."); syncInstall(); });

  // Diagnóstico -------------------------------------------------------------
  function updateDiagnostics() {
    const network = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const socketState = socket.connected ? "Conectado" : "Desconectado";
    const online = navigator.onLine ? "Online" : "Offline";
    const rows = [
      ["Socket", socketState], ["Internet", online], ["Sala", room],
      ["Rede", network?.effectiveType ? String(network.effectiveType).toUpperCase() : "Indisponível"],
      ["Downlink", Number.isFinite(network?.downlink) ? `${network.downlink} Mbps` : "Indisponível"],
      ["Latência estimada", Number.isFinite(network?.rtt) ? `${network.rtt} ms` : "Indisponível"]
    ];
    $("hlV8Diagnostics").innerHTML = rows.map(([key, value]) => `<div><span>${key}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
    const health = $("hlV8Health");
    health.dataset.state = socket.connected && navigator.onLine ? "good" : (navigator.onLine ? "warn" : "bad");
  }
  setInterval(() => { if (!settings.hidden) updateDiagnostics(); }, 2500);
  socket.on("connect", updateDiagnostics); socket.on("disconnect", updateDiagnostics); window.addEventListener("online", updateDiagnostics); window.addEventListener("offline", updateDiagnostics);

  // Picture-in-Picture ------------------------------------------------------
  if (typeof mainVideo !== "undefined" && mainVideo && document.pictureInPictureEnabled) {
    const controls = $("videoControls");
    if (controls && !$("hlV8Pip")) {
      const pip = document.createElement("button"); pip.id = "hlV8Pip"; pip.className = "video-control"; pip.type = "button"; pip.title = "Picture-in-Picture"; pip.textContent = "▣";
      pip.addEventListener("click", async () => { try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else if (mainVideo.srcObject || mainVideo.currentSrc) await mainVideo.requestPictureInPicture(); } catch { toast("Picture-in-Picture indisponível agora."); } });
      controls.appendChild(pip);
    }
  }

  // Wake Lock durante transmissão/consumo ----------------------------------
  let wakeLock = null;
  async function requestWakeLock() {
    if (!navigator.wakeLock || document.visibilityState !== "visible") return;
    try { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.addEventListener("release", () => { wakeLock = null; }); } catch {}
  }
  function releaseWakeLock() { wakeLock?.release?.().catch(() => {}); wakeLock = null; }
  if (typeof mainVideo !== "undefined" && mainVideo) {
    mainVideo.addEventListener("playing", requestWakeLock);
    mainVideo.addEventListener("pause", releaseWakeLock);
    mainVideo.addEventListener("emptied", releaseWakeLock);
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && typeof mainVideo !== "undefined" && !mainVideo.paused) requestWakeLock(); });

  // Command palette + atalhos ----------------------------------------------
  const command = $("hlV8Command");
  const commandInput = $("hlV8CommandInput");
  const commandList = $("hlV8CommandList");
  const actions = [
    ["Abrir chat", () => document.querySelector('[data-open="chat"]')?.click()],
    ["Abrir voz", () => document.querySelector('[data-open="voice"]')?.click()],
    ["Abrir sons", () => document.querySelector('[data-open="sounds"]')?.click()],
    ["Compartilhar tela", () => $("share")?.click()],
    ["Copiar convite", () => $("copy")?.click()],
    ["Configurações", open],
    ["Modo cinema", () => socket.emit("room:mode", { mode: "cinema" })],
    ["Modo normal", () => socket.emit("room:mode", { mode: "normal" })]
  ];
  function renderCommands(query = "") {
    commandList.textContent = "";
    actions.filter(([label]) => label.toLowerCase().includes(query.toLowerCase())).forEach(([label, fn]) => {
      const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.addEventListener("click", () => { command.hidden = true; fn(); }); commandList.appendChild(button);
    });
  }
  function openCommand() { command.hidden = false; renderCommands(); setTimeout(() => commandInput.focus(), 20); }
  command.querySelector(".hl-v8-command-backdrop").addEventListener("click", () => command.hidden = true);
  commandInput.addEventListener("input", () => renderCommands(commandInput.value));
  document.addEventListener("keydown", event => {
    const tag = event.target?.tagName?.toLowerCase();
    const typing = ["input", "textarea", "select"].includes(tag) || event.target?.isContentEditable;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); command.hidden ? openCommand() : (command.hidden = true); return; }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() === "c") document.querySelector('[data-open="chat"]')?.click();
    if (event.key.toLowerCase() === "v") document.querySelector('[data-open="voice"]')?.click();
    if (event.key.toLowerCase() === "f" && (state.role === "host" || state.role === "moderator")) socket.emit("room:mode", { mode: state.mode === "cinema" ? "normal" : "cinema" });
    if (event.key.toLowerCase() === "m") $("hlVoiceMute")?.click();
  });

  refreshSocialState();
  updateDiagnostics();
})();
