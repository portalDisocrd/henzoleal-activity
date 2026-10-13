(() => {
  "use strict";
  if (typeof socket === "undefined") return;

  const $ = id => document.getElementById(id);
  const room = typeof roomCode === "string" ? roomCode : location.pathname.split("/").pop().toUpperCase();
  const state = {
    role: "member", hostId: null, entryPolicy: "auto", mode: "normal", spotlightId: null,
    waiting: new Map(), activity: [], audit: [], lastActiveAt: Date.now(), afkSent: false,
    performance: localStorage.getItem("hl_performance_mode") === "1",
    reducedMotion: localStorage.getItem("hl_reduced_motion") === "1",
    smartDucking: localStorage.getItem("hl_smart_ducking") !== "off",
    streamVolume: Number(localStorage.getItem("hl_stream_volume") || "1"),
    voiceMaster: Number(localStorage.getItem("hl_voice_master") || "1"),
    theme: localStorage.getItem("hl_theme") || "blue",
    showActivity: localStorage.getItem("hl_activity_feed") !== "off",
    showToasts: localStorage.getItem("hl_toasts") !== "off",
    hasPassword: false,
    locked: false
  };
  window.HLVoiceMaster = Math.min(1, Math.max(0, state.voiceMaster));

  function toast(message, tone = "info") {
    if (!state.showToasts) return;
    const stack = $("hlToastStack") || (() => { const el = document.createElement("div"); el.id = "hlToastStack"; el.className = "hl-toast-stack"; document.body.appendChild(el); return el; })();
    const item = document.createElement("div"); item.className = `hl-toast hl-product-toast hl-tone-${tone}`; item.textContent = message; stack.appendChild(item); setTimeout(() => item.remove(), 3000);
  }
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));

  function rememberRoom() {
    let recent = []; try { recent = JSON.parse(localStorage.getItem("hl_recent_rooms") || "[]"); } catch {}
    if (!Array.isArray(recent)) recent = [];
    recent = recent.filter(item => item?.code !== room);
    recent.unshift({ code: room, lastVisited: Date.now() });
    localStorage.setItem("hl_recent_rooms", JSON.stringify(recent.slice(0, 10)));
  }

  function applyLocalPrefs() {
    document.documentElement.dataset.hlTheme = state.theme;
    document.documentElement.classList.toggle("hl-performance", state.performance);
    document.documentElement.classList.toggle("hl-reduce-motion", state.reducedMotion);
    document.body.dataset.roomMode = state.mode;
    const study = document.getElementById("hlProductStudyTimer");
    if (study) study.hidden = state.mode !== "study";
    document.body.classList.remove("hl-mode-normal","hl-mode-focus","hl-mode-social","hl-mode-cinema","hl-mode-gaming","hl-mode-study");
    if (state.mode !== "normal") document.body.classList.add(`hl-mode-${state.mode}`);
    try { if (typeof mainVideo !== "undefined" && mainVideo) mainVideo.volume = Math.min(1, Math.max(0, state.streamVolume)); } catch {}
    window.HLVoiceMaster = Math.min(1, Math.max(0, state.voiceMaster));
    document.querySelectorAll("audio[data-voice-user]").forEach(audio => {
      const individual = Number(localStorage.getItem(`hl_volume_${audio.dataset.voiceUser}`) || "1");
      audio.volume = Math.min(1, Math.max(0, individual * window.HLVoiceMaster));
    });
  }
  applyLocalPrefs();

  // -----------------------------------------------------------------------
  // V10 Control Center / More menu / Invite center / Lobby / Password
  // -----------------------------------------------------------------------
  const shell = document.createElement("div");
  shell.innerHTML = `
    <button class="hl-product-backdrop" id="hlProductBackdrop" type="button" hidden aria-label="Fechar"></button>
    <aside class="hl-product-control" id="hlProductControl" hidden aria-label="Central de configurações">
      <header><div><span>HL CONTROL</span><h2>Configurações</h2></div><button id="hlProductClose" type="button">×</button></header>
      <nav class="hl-product-tabs" aria-label="Categorias"><button data-v10-tab="room" class="is-active">Sala</button><button data-v10-tab="audio">Áudio</button><button data-v10-tab="appearance">Visual</button><button data-v10-tab="privacy">Privacidade</button><button data-v10-tab="shortcuts">Atalhos</button><button data-v10-tab="diagnostics">Diagnóstico</button></nav>
      <div class="hl-product-scroll">
        <section data-v10-view="room" class="is-active">
          <div class="hl-product-section"><div class="hl-product-head"><div><h3>Modo da sala</h3><p>Muda o foco sem criar outro sistema.</p></div></div><div class="hl-product-modes" id="hlProductModes"><button data-mode="normal">Normal<small>Equilibrado</small></button><button data-mode="cinema">Cinema<small>Stream em foco</small></button><button data-mode="gaming">Jogatina<small>Voz + sons</small></button><button data-mode="study">Estudo<small>Menos distrações</small></button></div></div>
          <div class="hl-product-section hl-product-host" id="hlProductEntrySection" hidden><div class="hl-product-head"><div><h3>Entrada e convites</h3><p>Amigos podem entrar direto; desconhecidos podem esperar.</p></div></div><label class="hl-product-field"><span>Regra de entrada</span><select id="hlProductEntryPolicy"><option value="auto">Automática para todos</option><option value="approveUnknown">Aprovar desconhecidos</option><option value="approveAll">Aprovar todos</option></select></label><label class="hl-product-field"><span>Validade dos convites especiais</span><select id="hlProductInviteTtl"><option value="900000">15 minutos</option><option value="3600000" selected>1 hora</option><option value="86400000">24 horas</option><option value="604800000">7 dias</option></select></label><div class="hl-product-invite-grid"><button id="hlProductCopyInvite">🔗 Copiar convite</button><button id="hlProductTrustedInvite">🛡 Convite confiável</button><button id="hlProductExpiringInvite">⏱ Convite temporário</button><button id="hlProductOneTimeInvite">① Convite de uso único</button></div><div class="hl-product-password"><input id="hlProductPassword" type="password" maxlength="64" placeholder="Senha opcional da sala"><button id="hlProductSetPassword">Salvar senha</button><button id="hlProductClearPassword">Remover</button></div><label class="hl-product-switch"><input id="hlProductLock" type="checkbox"><span>Trancar sala<small>Bloqueia novas entradas comuns.</small></span></label></div>
          <div class="hl-product-section hl-product-host" id="hlProductWaitingSection" hidden><div class="hl-product-head"><div><h3>Sala de espera</h3><p id="hlProductWaitingText">Nenhuma solicitação.</p></div><span class="hl-product-badge" id="hlProductWaitingBadge">0</span></div><div id="hlProductWaitingList" class="hl-product-waiting"></div></div>
          <div class="hl-product-section"><div class="hl-product-head"><div><h3>Salas recentes</h3><p>Atalhos salvos somente neste dispositivo.</p></div></div><button id="hlProductFavoriteRoom" class="hl-product-wide">☆ Favoritar esta sala</button></div>
        </section>
        <section data-v10-view="audio">
          <div class="hl-product-section"><div class="hl-product-head"><div><h3>Mixer</h3><p>Volumes locais por tipo de áudio.</p></div></div><label class="hl-product-range"><span>Transmissão <b id="hlProductStreamValue"></b></span><input id="hlProductStreamVolume" type="range" min="0" max="1" step="0.05"></label><label class="hl-product-range"><span>Voz <b id="hlProductVoiceValue"></b></span><input id="hlProductVoiceVolume" type="range" min="0" max="1" step="0.05"></label><label class="hl-product-switch"><input id="hlProductDucking" type="checkbox"><span>Smart ducking<small>Abaixa o Soundboard quando alguém fala.</small></span></label><button id="hlProductResetAudio" class="hl-product-wide">Restaurar áudio padrão</button><button id="hlProductOpenVoice" class="hl-product-wide">🎙 Abrir configurações de voz</button></div>
        </section>
        <section data-v10-view="appearance">
          <div class="hl-product-section"><div class="hl-product-head"><div><h3>Tema</h3><p>A identidade continua HL, só muda o acento.</p></div></div><div class="hl-product-theme-grid" id="hlProductThemes"><button data-theme="blue">Azul padrão</button><button data-theme="purple">Roxo</button><button data-theme="ice">Azul gelo</button><button data-theme="black">Preto puro</button></div><label class="hl-product-switch"><input id="hlProductPerformance" type="checkbox"><span>Modo desempenho<small>Reduz efeitos e frequência visual.</small></span></label><label class="hl-product-switch"><input id="hlProductReduced" type="checkbox"><span>Reduzir animações<small>Também respeita a preferência do sistema.</small></span></label><button id="hlProductInstall" class="hl-product-wide">⬇ Instalar HL Activity como app</button></div>
        </section>
        <section data-v10-view="privacy">
          <div class="hl-product-section"><div class="hl-product-head"><div><h3>Privacidade e moderação</h3><p>As ações administrativas são validadas no servidor.</p></div></div><label class="hl-product-switch"><input id="hlProductActivityToggle" type="checkbox"><span>Feed de atividade<small>Entradas, voz e transmissão.</small></span></label><label class="hl-product-switch"><input id="hlProductToastToggle" type="checkbox"><span>Notificações da interface<small>Toasts de eventos importantes.</small></span></label><div id="hlProductAuditHint" class="hl-product-note">Banimentos atuais usam um identificador local do navegador e podem ser contornados limpando os dados. Para ban permanente real, o próximo passo é conta + banco de dados.</div><div class="hl-product-audit" id="hlProductAudit"><strong>Histórico de moderação</strong><div id="hlProductAuditList"><small>Disponível para o host.</small></div></div></div>
        </section>
        <section data-v10-view="shortcuts">
          <div class="hl-product-section"><div class="hl-product-head"><div><h3>Atalhos</h3><p>Não disparam enquanto você digita.</p></div></div><div class="hl-product-shortcuts"><span><kbd>M</kbd> Microfone</span><span><kbd>C</kbd> Chat</span><span><kbd>V</kbd> Voz</span><span><kbd>F</kbd> Cinema</span><span><kbd>Espaço</kbd> PTT</span><span><kbd>1–6</kbd> Sons favoritos/padrão</span><span><kbd>Ctrl K</kbd> Ações rápidas</span></div></div>
        </section>
        <section data-v10-view="diagnostics"><div class="hl-product-section"><div class="hl-product-head"><div><h3>Diagnóstico</h3><p>Conexão e sessão em tempo real.</p></div><span class="hl-product-health" id="hlProductHealth">●</span></div><div id="hlProductDiagnostics" class="hl-product-diagnostics"></div><button id="hlProductRefreshDiag" class="hl-product-wide">Atualizar diagnóstico</button></div></section>
      </div>
    </aside>

    <div class="hl-product-more" id="hlProductMore" hidden><button data-action="settings">⚙ Configurações</button><button data-action="invite">🔗 Convite</button><button data-action="cinema">▣ Cinema</button><button data-action="pip">▣ Picture-in-Picture</button><button data-action="diagnostics">◌ Diagnóstico</button></div>

    <aside class="hl-product-activity" id="hlProductActivity" hidden><header><strong>Atividade</strong><button id="hlProductActivityClose">×</button></header><div id="hlProductActivityList"></div></aside>

    <div class="hl-product-wait" id="hlProductWait" hidden><div><div class="hl-product-wait-pulse">⌛</div><h2>Aguardando o host</h2><p>Você entra automaticamente quando a solicitação for aprovada.</p><button onclick="location.href='/'">Voltar ao início</button></div></div>
    <div class="hl-product-password-modal" id="hlProductPasswordModal" hidden><button class="hl-product-modal-bg" type="button"></button><section><h3>Sala protegida</h3><p>Digite a senha definida pelo host.</p><input id="hlProductJoinPassword" type="password" maxlength="64" placeholder="Senha da sala"><div><button id="hlProductPasswordCancel">Cancelar</button><button id="hlProductPasswordJoin">Entrar</button></div></section></div>

    <div class="hl-product-command" id="hlProductCommand" hidden><button class="hl-product-modal-bg" type="button"></button><section><input id="hlProductCommandInput" placeholder="Digite uma ação…" autocomplete="off"><div id="hlProductCommandList"></div></section></div>

    <div class="hl-product-profile-popover" id="hlProductProfile" hidden></div>
  `;
  document.body.append(...shell.childNodes);

  const studyTimer = document.createElement("div");
  studyTimer.id = "hlProductStudyTimer";
  studyTimer.className = "hl-product-study-timer";
  studyTimer.hidden = true;
  studyTimer.innerHTML = '<span>FOCO</span><strong id="hlProductStudyClock">25:00</strong><button id="hlProductStudyStart" type="button">Iniciar</button><button id="hlProductStudyReset" type="button">↺</button>';
  document.body.appendChild(studyTimer);

  let studySeconds = 25 * 60, studyInterval = null;
  const renderStudyClock = () => { const m = Math.floor(studySeconds / 60); const sec = studySeconds % 60; $("hlProductStudyClock").textContent = `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; };
  const stopStudyTimer = () => { clearInterval(studyInterval); studyInterval = null; $("hlProductStudyStart").textContent = "Iniciar"; };
  $("hlProductStudyStart").addEventListener("click", () => {
    if (studyInterval) { stopStudyTimer(); return; }
    $("hlProductStudyStart").textContent = "Pausar";
    studyInterval = setInterval(() => { studySeconds = Math.max(0, studySeconds - 1); renderStudyClock(); if (studySeconds === 0) { stopStudyTimer(); toast("Pomodoro concluído.", "success"); } }, 1000);
  });
  $("hlProductStudyReset").addEventListener("click", () => { stopStudyTimer(); studySeconds = 25 * 60; renderStudyClock(); });

  const control = $("hlProductControl"), backdrop = $("hlProductBackdrop"), more = $("hlProductMore");
  function openSettings(tab = "room") {
    more.hidden = true; control.hidden = false; backdrop.hidden = false; document.body.classList.add("hl-product-open");
    setTab(tab); refreshSocialState(); updateDiagnostics();
  }
  function closeSettings() { control.hidden = true; backdrop.hidden = true; document.body.classList.remove("hl-product-open"); }
  function setTab(name) {
    document.querySelectorAll("[data-v10-tab]").forEach(b => b.classList.toggle("is-active", b.dataset.v10Tab === name));
    document.querySelectorAll("[data-v10-view]").forEach(v => v.classList.toggle("is-active", v.dataset.v10View === name));
  }
  document.querySelectorAll("[data-v10-tab]").forEach(b => b.addEventListener("click", () => setTab(b.dataset.v10Tab)));
  $("hlProductClose").addEventListener("click", closeSettings); backdrop.addEventListener("click", closeSettings);

  // Capture phase: makes the existing ⚙ and ••• reliable even if old handlers are broken.
  document.addEventListener("click", event => {
    const settingsButton = event.target.closest("#hlSettingsQuick");
    const moreButton = event.target.closest("#hlModeQuick");
    if (settingsButton) { event.preventDefault(); event.stopImmediatePropagation(); openSettings("room"); return; }
    if (moreButton) {
      event.preventDefault(); event.stopImmediatePropagation();
      const rect = moreButton.getBoundingClientRect();
      more.style.left = `${Math.max(8, Math.min(innerWidth - 220, rect.left))}px`;
      more.style.bottom = `${Math.max(78, innerHeight - rect.top + 8)}px`;
      more.hidden = !more.hidden; return;
    }
  }, true);

  more.addEventListener("click", event => {
    const action = event.target.closest("button")?.dataset.action; if (!action) return;
    more.hidden = true;
    if (action === "settings") openSettings("room");
    if (action === "invite") { openSettings("room"); setTimeout(() => $("hlProductCopyInvite")?.focus(), 30); }
    if (action === "cinema") setRoomMode(state.mode === "cinema" ? "normal" : "cinema");
    if (action === "diagnostics") openSettings("diagnostics");
    if (action === "pip") togglePip();
  });

  function updateRoleUI() {
    const host = state.role === "host";
    document.querySelectorAll(".hl-product-host").forEach(el => { el.hidden = !host; });
    $("hlProductEntryPolicy").value = state.entryPolicy || "auto";
    $("hlProductLock").checked = state.locked;
    document.querySelectorAll("#hlProductModes [data-mode]").forEach(btn => { btn.classList.toggle("is-active", btn.dataset.mode === state.mode); btn.disabled = !(state.role === "host" || state.role === "moderator"); });
    renderWaiting();
  }

  function refreshSocialState() {
    socket.emit("social:state", result => {
      if (!result?.success) return;
      state.role = result.role || "member"; state.hostId = result.hostId || null; state.entryPolicy = result.entryPolicy || "auto"; state.mode = result.roomMode || "normal"; state.spotlightId = result.spotlightId || null; state.locked = Boolean(result.locked); state.hasPassword = Boolean(result.hasPassword);
      state.waiting.clear(); (result.waiting || []).forEach(item => state.waiting.set(item.id, item));
      state.activity = result.activity || state.activity; state.audit = result.audit || []; applyLocalPrefs(); updateRoleUI(); renderActivity(); renderAudit();
    });
  }

  socket.on("room:joined", data => { state.role = data?.role || state.role; state.hostId = data?.hostId || state.hostId; state.entryPolicy = data?.entryPolicy || state.entryPolicy; state.mode = data?.roomMode || state.mode; state.spotlightId = data?.spotlightId || null; state.locked = Boolean(data?.locked); state.hasPassword = Boolean(data?.hasPassword); rememberRoom(); $("hlProductWait").hidden = true; applyLocalPrefs(); updateRoleUI(); });
  socket.on("room:entry-policy", data => { state.entryPolicy = data?.policy || "auto"; updateRoleUI(); });
  socket.on("room:mode", data => {
    state.mode = data?.mode || "normal";
    applyLocalPrefs(); updateRoleUI(); toast(`Modo ${state.mode}.`);
    if (state.mode === "gaming") document.querySelector('[data-open="voice"]')?.click();
    if (state.mode === "cinema") document.querySelector('.hl-social-close')?.click();
  });
  socket.on("room:locked", data => { state.locked = Boolean(data?.locked); updateRoleUI(); });
  socket.on("room:host-changed", data => { state.hostId = data?.hostId || null; if (state.hostId === socket.id) { state.role = "host"; toast("Você agora é o host da sala.", "success"); } refreshSocialState(); });
  socket.on("room:spotlight", data => { state.spotlightId = data?.target || null; if (state.spotlightId) window.HLRoomCore?.selectMainStream?.(state.spotlightId); });
  socket.on("participants-update", () => setTimeout(refreshSocialState, 80));

  // Lobby / password -------------------------------------------------------
  window.addEventListener("hl:room-waiting", () => { $("hlProductWait").hidden = false; });
  window.addEventListener("hl:room-approval", event => { if (!event.detail?.approved) { $("hlProductWait").hidden = true; toast(event.detail?.message || "Entrada recusada.", "error"); } });
  window.addEventListener("hl:room-password-required", () => { $("hlProductPasswordModal").hidden = false; setTimeout(() => $("hlProductJoinPassword").focus(), 40); });
  $("hlProductPasswordCancel").addEventListener("click", () => { $("hlProductPasswordModal").hidden = true; location.href = "/"; });
  $("hlProductPasswordModal").querySelector(".hl-product-modal-bg").addEventListener("click", () => { $("hlProductPasswordModal").hidden = true; });
  $("hlProductPasswordJoin").addEventListener("click", () => { const value = $("hlProductJoinPassword").value; sessionStorage.setItem(`hl_room_password_${room}`, value); $("hlProductPasswordModal").hidden = true; try { joined = false; joinRoom(); } catch { location.reload(); } });
  socket.on("room:join-request", request => { if (!request?.id) return; state.waiting.set(request.id, request); renderWaiting(); toast(`${request.name || "Alguém"} quer entrar na sala.`); });
  socket.on("room:join-request-removed", data => { if (data?.id) state.waiting.delete(data.id); renderWaiting(); });

  function renderWaiting() {
    const list = $("hlProductWaitingList"), requests = Array.from(state.waiting.values()); if (!list) return;
    $("hlProductWaitingBadge").textContent = String(requests.length); $("hlProductWaitingText").textContent = requests.length ? `${requests.length} aguardando.` : "Nenhuma solicitação.";
    list.textContent = "";
    requests.forEach(item => {
      const row = document.createElement("div"); row.className = "hl-product-wait-row";
      row.innerHTML = `<span class="hl-product-avatar">${escapeHtml(item.avatar || "🙂")}</span><div><strong>${escapeHtml(item.name || "Convidado")}</strong><small>Aguardando aprovação</small></div><div><button data-ok>Entrar</button><button data-no>Recusar</button></div>`;
      row.querySelector("[data-ok]").addEventListener("click", () => socket.emit("room:approve-join", { target:item.id }, result => { if (result?.success) state.waiting.delete(item.id); else toast(result?.message || "Falha ao aprovar.", "error"); renderWaiting(); }));
      row.querySelector("[data-no]").addEventListener("click", () => socket.emit("room:reject-join", { target:item.id }, result => { if (result?.success) state.waiting.delete(item.id); else toast(result?.message || "Falha ao recusar.", "error"); renderWaiting(); }));
      list.appendChild(row);
    });
  }

  $("hlProductEntryPolicy").addEventListener("change", event => socket.emit("room:entry-policy", { policy:event.target.value }, result => { if (!result?.success) return toast(result?.message || "Falha ao alterar entrada.", "error"); state.entryPolicy = result.policy; toast("Regra de entrada atualizada.", "success"); }));
  $("hlProductCopyInvite").addEventListener("click", () => copyText(`${location.origin}/room/${room}`, "Convite copiado."));
  $("hlProductTrustedInvite").addEventListener("click", () => socket.emit("room:create-trusted-invite", result => { if (!result?.success) return toast(result?.message || "Não foi possível criar convite.", "error"); copyText(`${location.origin}/room/${room}?trust=${encodeURIComponent(result.token)}`, "Convite confiável copiado."); }));
  function inviteTtl(){ return Number($("hlProductInviteTtl")?.value || 3600000); }
  function inviteTtlLabel(){ return $("hlProductInviteTtl")?.selectedOptions?.[0]?.textContent || "1 hora"; }
  $("hlProductExpiringInvite").addEventListener("click", () => socket.emit("room:create-invite", { trusted:true, ttlMs:inviteTtl(), oneTime:false }, result => { if (!result?.success) return toast(result?.message || "Falha ao criar convite.", "error"); copyText(`${location.origin}/room/${room}?invite=${encodeURIComponent(result.invite.token)}`, `Convite válido por ${inviteTtlLabel()} copiado.`); }));
  $("hlProductOneTimeInvite").addEventListener("click", () => socket.emit("room:create-invite", { trusted:true, ttlMs:inviteTtl(), oneTime:true }, result => { if (!result?.success) return toast(result?.message || "Falha ao criar convite.", "error"); copyText(`${location.origin}/room/${room}?invite=${encodeURIComponent(result.invite.token)}`, `Convite de uso único (${inviteTtlLabel()}) copiado.`); }));
  $("hlProductSetPassword").addEventListener("click", () => socket.emit("room:set-password", { password:$("hlProductPassword").value }, result => { if (!result?.success) return toast(result?.message || "Falha ao salvar senha.", "error"); state.hasPassword = result.enabled; $("hlProductPassword").value = ""; toast(result.enabled ? "Senha da sala ativada." : "Senha removida.", "success"); }));
  $("hlProductClearPassword").addEventListener("click", () => socket.emit("room:set-password", { password:"" }, result => { if (result?.success) { state.hasPassword=false; $("hlProductPassword").value=""; toast("Senha removida."); } }));
  $("hlProductLock").addEventListener("change", event => socket.emit("moderation:lock", { locked:event.target.checked }, result => { if (!result?.success) { event.target.checked = !event.target.checked; toast("Não foi possível alterar o bloqueio.", "error"); } else state.locked = result.locked; }));

  function copyText(text, message) { navigator.clipboard?.writeText(text).then(() => toast(message, "success")).catch(() => prompt("Copie:", text)); }

  // Modes / settings -------------------------------------------------------
  function setRoomMode(mode) { if (!(state.role === "host" || state.role === "moderator")) return toast("Somente host/mod pode mudar o modo."); socket.emit("room:mode", { mode }, result => { if (!result?.success) toast(result?.message || "Falha ao mudar modo.", "error"); }); }
  $("hlProductModes").addEventListener("click", event => { const b = event.target.closest("[data-mode]"); if (b) setRoomMode(b.dataset.mode); });

  const streamSlider=$("hlProductStreamVolume"), voiceSlider=$("hlProductVoiceVolume");
  streamSlider.value=String(state.streamVolume); voiceSlider.value=String(state.voiceMaster); $("hlProductDucking").checked=state.smartDucking; $("hlProductPerformance").checked=state.performance; $("hlProductReduced").checked=state.reducedMotion; $("hlProductActivityToggle").checked=state.showActivity; $("hlProductToastToggle").checked=state.showToasts;
  function syncMixer(){ $("hlProductStreamValue").textContent=`${Math.round(Number(streamSlider.value)*100)}%`; $("hlProductVoiceValue").textContent=`${Math.round(Number(voiceSlider.value)*100)}%`; }
  syncMixer();
  streamSlider.addEventListener("input",()=>{state.streamVolume=Number(streamSlider.value);localStorage.setItem("hl_stream_volume",String(state.streamVolume));applyLocalPrefs();syncMixer();});
  voiceSlider.addEventListener("input",()=>{state.voiceMaster=Number(voiceSlider.value);localStorage.setItem("hl_voice_master",String(state.voiceMaster));applyLocalPrefs();syncMixer();});
  $("hlProductDucking").addEventListener("change",e=>{state.smartDucking=e.target.checked;localStorage.setItem("hl_smart_ducking",state.smartDucking?"on":"off");});
  $("hlProductPerformance").addEventListener("change",e=>{state.performance=e.target.checked;localStorage.setItem("hl_performance_mode",state.performance?"1":"0");applyLocalPrefs();});
  $("hlProductReduced").addEventListener("change",e=>{state.reducedMotion=e.target.checked;localStorage.setItem("hl_reduced_motion",state.reducedMotion?"1":"0");applyLocalPrefs();});
  $("hlProductResetAudio").addEventListener("click",()=>{state.streamVolume=1;state.voiceMaster=1;state.smartDucking=true;streamSlider.value="1";voiceSlider.value="1";$("hlProductDucking").checked=true;localStorage.setItem("hl_stream_volume","1");localStorage.setItem("hl_voice_master","1");localStorage.setItem("hl_smart_ducking","on");applyLocalPrefs();syncMixer();toast("Mixer restaurado.");});
  $("hlProductOpenVoice").addEventListener("click",()=>{closeSettings();document.querySelector('[data-open="voice"]')?.click();});
  $("hlProductThemes").addEventListener("click",e=>{const b=e.target.closest("[data-theme]");if(!b)return;state.theme=b.dataset.theme;localStorage.setItem("hl_theme",state.theme);applyLocalPrefs();syncThemeButtons();});
  function syncThemeButtons(){document.querySelectorAll("#hlProductThemes [data-theme]").forEach(b=>b.classList.toggle("is-active",b.dataset.theme===state.theme));} syncThemeButtons();
  $("hlProductActivityToggle").addEventListener("change",e=>{state.showActivity=e.target.checked;localStorage.setItem("hl_activity_feed",state.showActivity?"on":"off");});
  $("hlProductToastToggle").addEventListener("change",e=>{state.showToasts=e.target.checked;localStorage.setItem("hl_toasts",state.showToasts?"on":"off");});

  let favorites = new Set(JSON.parse(localStorage.getItem("hl_favorite_rooms") || "[]"));
  function syncFavorite(){ $("hlProductFavoriteRoom").textContent = favorites.has(room) ? "★ Sala favoritada" : "☆ Favoritar esta sala"; }
  syncFavorite(); $("hlProductFavoriteRoom").addEventListener("click",()=>{favorites.has(room)?favorites.delete(room):favorites.add(room);localStorage.setItem("hl_favorite_rooms",JSON.stringify(Array.from(favorites).slice(0,30)));syncFavorite();});

  // PWA --------------------------------------------------------------------
  function syncInstall(){const b=$("hlProductInstall");const installed=window.HLPWA?.isInstalled?.();b.disabled=installed||!window.HLPWA?.canInstall?.();b.textContent=installed?"✓ HL Activity instalado":window.HLPWA?.canInstall?.()?"⬇ Instalar HL Activity como app":"Instalação disponível pelo menu do navegador";}
  window.addEventListener("hl:pwa-state",syncInstall);setTimeout(syncInstall,150);$("hlProductInstall").addEventListener("click",async()=>{const r=await window.HLPWA?.install?.();toast(r?.success?"HL Activity instalado.":"Instalação cancelada ou indisponível.");syncInstall();});

  // Diagnostics ------------------------------------------------------------
  async function socketPing(){return new Promise(resolve=>{const started=performance.now();const timer=setTimeout(()=>resolve(null),1600);socket.emit("diagnostics:ping",{at:Date.now()},result=>{clearTimeout(timer);resolve(result?.success?Math.round(performance.now()-started):null);});});}
  const diagSample={bytes:0,at:0};
  async function updateDiagnostics(){
    const network=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
    const ping=socket.connected?await socketPing():null;
    let rtc="Sem stream", ice="Sem conexão WebRTC", transport="Direto/STUN", bitrate="Indisponível", loss="Indisponível", mic="Não verificado";
    try {
      const peers=[...(window.HLRoomCore?.getInboundPeers?.()?.values?.()||[]),...(window.HLRoomCore?.getOutboundPeers?.()?.values?.()||[])];
      if(peers.length){
        let pair=null, localCandidate=null, remoteCandidate=null, bytes=0, lost=0, received=0, jitterValues=[];
        const stats=await peers[0].getStats();
        stats.forEach(r=>{
          if(r.type==="candidate-pair"&&r.state==="succeeded"&&(r.nominated||r.selected)) pair=r;
          if(r.type==="outbound-rtp"&&!r.isRemote) bytes+=Number(r.bytesSent||0);
          if(r.type==="inbound-rtp"&&!r.isRemote){lost+=Number(r.packetsLost||0);received+=Number(r.packetsReceived||0);if(Number.isFinite(r.jitter))jitterValues.push(r.jitter);}
        });
        if(pair){ localCandidate=stats.get(pair.localCandidateId); remoteCandidate=stats.get(pair.remoteCandidateId); rtc=Number.isFinite(pair.currentRoundTripTime)?`${Math.round(pair.currentRoundTripTime*1000)} ms RTC`:"WebRTC ativo"; ice=`${localCandidate?.candidateType||"?"} → ${remoteCandidate?.candidateType||"?"}`; if(localCandidate?.candidateType==="relay"||remoteCandidate?.candidateType==="relay")transport="TURN ativo"; else transport="Direto/STUN"; } else rtc="WebRTC ativo";
        const now=performance.now(); if(diagSample.at&&bytes>=diagSample.bytes){const seconds=(now-diagSample.at)/1000;if(seconds>.2)bitrate=`${Math.round(((bytes-diagSample.bytes)*8/seconds)/1000)} kbps`;}diagSample.bytes=bytes;diagSample.at=now;
        if(received+lost>0) loss=`${((lost/(received+lost))*100).toFixed(1)}%${jitterValues.length?` · jitter ${(Math.max(...jitterValues)*1000).toFixed(0)} ms`:""}`;
      }
    } catch {}
    try{const devices=await navigator.mediaDevices?.enumerateDevices?.();mic=(devices||[]).some(d=>d.kind==="audioinput")?"Detectado":"Não detectado";}catch{}
    const rows=[["Socket",socket.connected?"Conectado":"Desconectado"],["Internet",navigator.onLine?"Online":"Offline"],["Ping",ping===null?"Indisponível":`${ping} ms`],["WebRTC",rtc],["ICE",ice],["Rota",transport],["Bitrate",bitrate],["Perda",loss],["Microfone",mic],["Rede",network?.effectiveType?String(network.effectiveType).toUpperCase():"Indisponível"],["Downlink",Number.isFinite(network?.downlink)?`${network.downlink} Mbps`:"Indisponível"],["Sala",room]];
    $("hlProductDiagnostics").innerHTML=rows.map(([k,v])=>`<div><span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong></div>`).join("");
    const health=$("hlProductHealth");health.dataset.state=socket.connected&&navigator.onLine?((ping||0)>280?"warn":"good"):(navigator.onLine?"warn":"bad");
  }
  $("hlProductRefreshDiag").addEventListener("click",updateDiagnostics);socket.on("connect",updateDiagnostics);socket.on("disconnect",updateDiagnostics);window.addEventListener("online",updateDiagnostics);window.addEventListener("offline",updateDiagnostics);

  // Activity feed ----------------------------------------------------------
  socket.on("activity:event",item=>{if(!item)return;state.activity.push(item);if(state.activity.length>60)state.activity.shift();renderActivity();});
  function renderActivity(){const list=$("hlProductActivityList");if(!list)return;list.textContent="";(state.activity||[]).slice(-30).reverse().forEach(item=>{const row=document.createElement("div");row.innerHTML=`<span>${escapeHtml(item.text||item.type||"Evento")}</span><small>${new Date(item.at||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>`;list.appendChild(row);});}
  function renderAudit(){const list=$("hlProductAuditList");if(!list)return;list.textContent="";if(state.role!=="host"){const small=document.createElement("small");small.textContent="Somente o host pode ver este histórico.";list.appendChild(small);return;}const items=(state.audit||[]).slice(-20).reverse();if(!items.length){const small=document.createElement("small");small.textContent="Nenhuma ação administrativa registrada.";list.appendChild(small);return;}items.forEach(item=>{const row=document.createElement("div");const label={join:"Entrada",kick:"Remoção",ban:"Banimento","sound-policy":"Permissão de sons","sound-upload-policy":"Upload de sons","entry-policy":"Regra de entrada","password-change":"Senha","sound-upload":"Som adicionado","sound-delete":"Som removido","sound-duplicate":"Som duplicado"}[item.type]||item.type||"Ação";row.innerHTML=`<span>${escapeHtml(label)} · ${escapeHtml(item.actorName||"Sistema")}</span><small>${new Date(item.at||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</small>`;list.appendChild(row);});}
  $("hlProductActivityClose").addEventListener("click",()=>$("hlProductActivity").hidden=true);

  // Presence / AFK ---------------------------------------------------------
  ["pointerdown","keydown","touchstart","mousemove"].forEach(type=>window.addEventListener(type,()=>{state.lastActiveAt=Date.now();if(state.afkSent&&socket.connected){state.afkSent=false;socket.emit("presence:update",{status:"online"});}},{passive:true}));
  setInterval(()=>{if(socket.connected&&!state.afkSent&&Date.now()-state.lastActiveAt>5*60*1000){state.afkSent=true;socket.emit("presence:update",{status:"afk"});}},30000);

  // Participant profile / moderation / spotlight --------------------------
  document.addEventListener("click",event=>{
    const card=event.target.closest(".person[data-user-id]"); if(!card||event.target.closest("button"))return;
    const id=card.dataset.userId; const person=window.HLRoomCore?.getParticipants?.()?.get?.(id); if(!person)return;
    const pop=$("hlProductProfile"); const rect=card.getBoundingClientRect(); pop.style.left=`${Math.max(8,Math.min(innerWidth-290,rect.left))}px`;pop.style.top=`${Math.min(innerHeight-260,rect.bottom+8)}px`;
    const canMod=(state.role==="host"&&id!==socket.id)||(state.role==="moderator"&&person.role==="member");
    pop.innerHTML=`<div class="hl-product-profile-head"><span>${escapeHtml(person.avatar||"🙂")}</span><div><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.activity||"Online")} • ${escapeHtml(person.role||"member")}</small></div></div><label>Volume local<input data-profile-volume type="range" min="0" max="1" step="0.05" value="${localStorage.getItem(`hl_volume_${id}`)||"1"}"></label><div class="hl-product-profile-actions"><button data-profile="pin">📌 Fixar</button>${state.role==="host"||state.role==="moderator"?'<button data-profile="spotlight">✨ Spotlight</button>':''}${canMod?'<button data-profile="mute">🔇 Silenciar</button><button data-profile="sound">🔕 Bloquear sons</button><button data-profile="kick">Remover</button>':''}${state.role==="host"&&id!==socket.id?'<button data-profile="host">Transferir host</button><button data-profile="ban">Banir 24h</button>':''}</div>`;
    pop.hidden=false; pop.dataset.userId=id;
  });
  $("hlProductProfile").addEventListener("input",event=>{if(event.target.matches("[data-profile-volume]")){const id=$("hlProductProfile").dataset.userId;localStorage.setItem(`hl_volume_${id}`,event.target.value);const audio=document.querySelector(`audio[data-voice-user="${CSS.escape(id)}"]`);if(audio)audio.volume=Math.min(1,Number(event.target.value)*window.HLVoiceMaster);}});
  $("hlProductProfile").addEventListener("click",event=>{const action=event.target.closest("[data-profile]")?.dataset.profile;if(!action)return;const id=$("hlProductProfile").dataset.userId;const person=window.HLRoomCore?.getParticipants?.()?.get?.(id);if(action==="pin")window.HLRoomCore?.selectMainStream?.(id);if(action==="spotlight")socket.emit("room:spotlight",{target:id});if(action==="mute")socket.emit("moderation:user-flags",{target:id,forceMute:true});if(action==="sound")socket.emit("moderation:user-flags",{target:id,soundBlocked:!person?.soundBlocked},()=>refreshSocialState());if(action==="kick")socket.emit("moderation:kick",{target:id});if(action==="host")socket.emit("moderation:transfer-host",{target:id});if(action==="ban")socket.emit("moderation:ban",{target:id});$("hlProductProfile").hidden=true;});
  document.addEventListener("click",event=>{if(!$("hlProductProfile").hidden&&!$("hlProductProfile").contains(event.target)&&!event.target.closest(".person"))$("hlProductProfile").hidden=true;if(!more.hidden&&!more.contains(event.target)&&!event.target.closest("#hlModeQuick"))more.hidden=true;});

  // Picture-in-Picture + Wake Lock ----------------------------------------
  async function togglePip(){try{if(!document.pictureInPictureEnabled)throw new Error();if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(typeof mainVideo!=="undefined"&&(mainVideo.srcObject||mainVideo.currentSrc))await mainVideo.requestPictureInPicture();else toast("Inicie ou assista uma transmissão primeiro.");}catch{toast("Picture-in-Picture indisponível agora.","error");}}
  let wakeLock=null;async function requestWake(){if(!navigator.wakeLock||document.visibilityState!=="visible")return;try{wakeLock=await navigator.wakeLock.request("screen");wakeLock.addEventListener("release",()=>wakeLock=null);}catch{}}function releaseWake(){wakeLock?.release?.().catch(()=>{});wakeLock=null;}
  try{if(typeof mainVideo!=="undefined"&&mainVideo){mainVideo.addEventListener("playing",requestWake);mainVideo.addEventListener("pause",releaseWake);mainVideo.addEventListener("emptied",releaseWake);}}catch{}
  document.addEventListener("visibilitychange",()=>{try{if(document.visibilityState==="visible"&&typeof mainVideo!=="undefined"&&!mainVideo.paused)requestWake();}catch{}});

  // Command palette / slash commands / hotkeys -----------------------------
  const command=$("hlProductCommand"), commandInput=$("hlProductCommandInput"), commandList=$("hlProductCommandList");
  const actions=[["Abrir chat",()=>document.querySelector('[data-open="chat"]')?.click()],["Abrir voz",()=>document.querySelector('[data-open="voice"]')?.click()],["Abrir sons",()=>document.querySelector('[data-open="sounds"]')?.click()],["Compartilhar tela",()=>$("share")?.click()],["Copiar convite",()=>$("hlProductCopyInvite")?.click()],["Configurações",()=>openSettings("room")],["Diagnóstico",()=>openSettings("diagnostics")],["Modo cinema",()=>setRoomMode("cinema")],["Modo normal",()=>setRoomMode("normal")]];
  function renderCommands(q=""){commandList.textContent="";actions.filter(([l])=>l.toLowerCase().includes(q.toLowerCase())).forEach(([l,fn])=>{const b=document.createElement("button");b.textContent=l;b.addEventListener("click",()=>{command.hidden=true;fn();});commandList.appendChild(b);});}
  function openCommand(){command.hidden=false;renderCommands();setTimeout(()=>commandInput.focus(),30);} command.querySelector(".hl-product-modal-bg").addEventListener("click",()=>command.hidden=true);commandInput.addEventListener("input",()=>renderCommands(commandInput.value));

  function runSlash(text){const [cmd,...rest]=text.trim().split(/\s+/);const arg=rest.join(" ");if(cmd==="/help"){toast("/invite /ping /users /quality /sound /lock");return true;}if(cmd==="/invite"){$("hlProductCopyInvite")?.click();return true;}if(cmd==="/ping"){updateDiagnostics().then(()=>openSettings("diagnostics"));return true;}if(cmd==="/users"){toast(`${window.HLRoomCore?.getParticipants?.()?.size||0} participante(s).`);return true;}if(cmd==="/quality"){toast(`Qualidade: ${$("qualitySelect")?.selectedOptions?.[0]?.text||"Auto"}`);return true;}if(cmd==="/sound"){document.querySelector('[data-open="sounds"]')?.click();return true;}if(cmd==="/lock"&&state.role==="host"){const next=arg?arg.toLowerCase()!=="off":!state.locked;socket.emit("moderation:lock",{locked:next});return true;}return false;}
  const chatInput=$("hlChatInput"); if(chatInput){chatInput.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&chatInput.value.trim().startsWith("/")){const text=chatInput.value.trim();if(runSlash(text)){event.preventDefault();event.stopImmediatePropagation();chatInput.value="";}}},true);}

  document.addEventListener("keydown",event=>{const tag=event.target?.tagName?.toLowerCase();const typing=["input","textarea","select"].includes(tag)||event.target?.isContentEditable;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();command.hidden?openCommand():(command.hidden=true);return;}if(typing||event.ctrlKey||event.metaKey||event.altKey)return;const key=event.key.toLowerCase();if(key==="c")document.querySelector('[data-open="chat"]')?.click();if(key==="v")document.querySelector('[data-open="voice"]')?.click();if(key==="f"&&(state.role==="host"||state.role==="moderator"))setRoomMode(state.mode==="cinema"?"normal":"cinema");if(key==="m")$("hlVoiceMute")?.click();if(/^[1-6]$/.test(event.key)){const ids=["airhorn","victory","fail","bonk","pop","suspense"];const target=document.querySelector(`[data-sound-id="${ids[Number(event.key)-1]}"] [data-sound-action="room"]`);target?.click();}});

  // Room mode hooks / smart ducking ---------------------------------------
  window.addEventListener("hl:voice-speaking",event=>{const data=event.detail;if(!state.smartDucking)return;const range=$("hlSoundVolume");if(!range)return;if(data?.speaking){if(!range.dataset.beforeDuck)range.dataset.beforeDuck=range.value;range.value=String(Math.max(.15,Number(range.dataset.beforeDuck)*.45));range.dispatchEvent(new Event("input",{bubbles:true}));}else if(range.dataset.beforeDuck){range.value=range.dataset.beforeDuck;delete range.dataset.beforeDuck;range.dispatchEvent(new Event("input",{bubbles:true}));}});

  // Install + first-run onboarding ----------------------------------------
  function syncInstall(){const b=$("hlProductInstall");const installed=window.HLPWA?.isInstalled?.();b.disabled=installed||!window.HLPWA?.canInstall?.();b.textContent=installed?"✓ HL Activity instalado":window.HLPWA?.canInstall?.()?"⬇ Instalar HL Activity como app":"Instalação disponível pelo menu do navegador";}
  window.addEventListener("hl:pwa-state",syncInstall);setTimeout(syncInstall,120);
  $("hlProductInstall").addEventListener("click",async()=>{const result=await window.HLPWA?.install?.();toast(result?.success?"HL Activity instalado.":"Instalação cancelada ou indisponível.");syncInstall();});

  if(!localStorage.getItem("hl_onboarding_done") && !document.querySelector(".hl-product-onboarding")){
    const banner=document.createElement("div");
    banner.className="hl-product-onboarding";
    banner.innerHTML='<strong>HL Activity pronto.</strong><span>1. Convide amigos · 2. Entre no voz · 3. Compartilhe sua tela · 4. Use Chat e Sons</span><button>Entendi</button>';
    document.body.appendChild(banner);
    banner.querySelector("button").addEventListener("click",()=>{localStorage.setItem("hl_onboarding_done","1");banner.remove();});
  }

  // Activity quick access in header when there is room ---------------------
  const headerInfo=document.querySelector(".hl-room-info");if(headerInfo){const b=document.createElement("button");b.className="hl-product-activity-trigger";b.type="button";b.textContent="Atividade";b.addEventListener("click",()=>{$("hlProductActivity").hidden=!$("hlProductActivity").hidden;renderActivity();});headerInfo.prepend(b);}

  refreshSocialState(); updateDiagnostics();
})();
