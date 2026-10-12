(() => {
    "use strict";

    if (typeof socket === "undefined") return;

    const state = {
        bootstrapped: false,
        role: "member",
        hostId: null,
        soundPolicy: "everyone",
        participants: new Map(),
        messages: new Map(),
        replyTo: null,
        editId: null,
        voiceJoined: false,
        voiceStream: null,
        voicePeers: new Map(),
        voiceIceQueue: new Map(),
        voiceAudio: new Map(),
        analysers: new Map(),
        muted: false,
        deaf: false,
        ptt: false,
        pttPressed: false,
        modeIndex: 0,
        typingTimer: null,
        soundContext: null,
        soundCooldownUntil: 0,
        activeSounds: new Set(),
        soundVolume: Number(localStorage.getItem("hl_sound_volume") || 0.72),
        soundBlockedToastAt: 0,
        unreadChat: 0,
        selectedMicId: localStorage.getItem("hl_voice_mic") || "",
        selectedOutputId: localStorage.getItem("hl_voice_output") || "",
        reactionPickerOpen: false
    };

    const modes = ["normal", "focus", "social", "cinema"];
    const soundCatalog = [
        ["airhorn", "Air Horn", "Impacto", "📣", "/sounds/airhorn.wav"],
        ["victory", "Vitória", "Comemoração", "🏆", "/sounds/victory.wav"],
        ["fail", "Falha", "Derrota", "📉", "/sounds/fail.wav"],
        ["bonk", "Bonk", "Reação", "🔨", "/sounds/bonk.wav"],
        ["pop", "Pop", "Reação rápida", "🫧", "/sounds/pop.wav"],
        ["suspense", "Suspense", "Tensão", "🎬", "/sounds/suspense.wav"]
    ];

    const html = `
      <div class="hl-toast-stack" id="hlToastStack" aria-live="polite"></div>
      <button class="hl-social-backdrop" id="hlSocialBackdrop" type="button" aria-label="Fechar painel social"></button>

      <div class="hl-reaction-picker" id="hlReactionPicker" aria-label="Escolher reação" hidden>
        <button type="button" data-reaction="👍" aria-label="Curtir">👍</button>
        <button type="button" data-reaction="😂" aria-label="Rir">😂</button>
        <button type="button" data-reaction="❤️" aria-label="Amor">❤️</button>
        <button type="button" data-reaction="🔥" aria-label="Fogo">🔥</button>
        <button type="button" data-reaction="👏" aria-label="Aplausos">👏</button>
      </div>

      <div class="hl-social-dock" aria-label="Controles sociais HL">
        <button class="hl-social-action" data-open="chat" title="Chat" aria-label="Abrir chat"><span aria-hidden="true">💬</span></button>
        <button class="hl-social-action" id="hlVoiceQuick" data-open="voice" title="Voz" aria-label="Abrir voz"><span aria-hidden="true">🎙</span></button>
        <button class="hl-social-action" data-open="sounds" title="Sons" aria-label="Abrir soundboard"><span aria-hidden="true">♫</span></button>
        <button class="hl-social-action" id="hlReactionQuick" title="Reações" aria-label="Abrir reações"><span aria-hidden="true">🔥</span></button>
        <button class="hl-social-action" id="hlModeQuick" title="Modo da sala" aria-label="Alternar modo da sala"><span aria-hidden="true">•••</span></button>
      </div>

      <section class="hl-social-panel" id="hlSocialPanel" aria-label="Painel social">
        <div class="hl-social-head">
          <div class="hl-social-tabs" role="tablist" aria-label="Comunicação da sala">
            <button class="hl-social-tab is-active" data-tab="chat" role="tab" aria-selected="true"><span class="hl-tab-icon" aria-hidden="true">💬</span><span>Chat</span></button>
            <button class="hl-social-tab" data-tab="voice" role="tab" aria-selected="false"><span class="hl-tab-icon" aria-hidden="true">🎙</span><span>Voz</span></button>
            <button class="hl-social-tab" data-tab="sounds" role="tab" aria-selected="false"><span class="hl-tab-icon" aria-hidden="true">♫</span><span>Sons</span></button>
          </div>
          <button class="hl-social-close" id="hlSocialClose" aria-label="Fechar painel">×</button>
        </div>

        <div class="hl-social-view is-active" data-view="chat" role="tabpanel">
          <div class="hl-chat-list" id="hlChatList">
            <div class="hl-chat-empty hl-empty-state"><div class="hl-empty-icon" aria-hidden="true">💬</div><strong>Comece a conversa da sala.</strong><span>As mensagens aparecem aqui em tempo real.</span></div>
          </div>
          <div class="hl-chat-typing" id="hlTyping"></div>
          <div class="hl-chat-compose">
            <div class="hl-chat-context" id="hlChatContext"><span></span><button type="button" aria-label="Cancelar resposta ou edição">×</button></div>
            <div class="hl-chat-compose-row">
              <input id="hlChatInput" class="hl-chat-input" maxlength="1000" placeholder="Mensagem para a sala" autocomplete="off" aria-label="Mensagem para a sala">
              <button id="hlChatSend" class="hl-chat-send" aria-label="Enviar mensagem"><span>Enviar</span><b aria-hidden="true">➜</b></button>
            </div>
          </div>
        </div>

        <div class="hl-social-view hl-voice-view" data-view="voice" role="tabpanel">
          <div class="hl-section-heading">
            <div>
              <div class="hl-section-title">Voz em tempo real</div>
              <div class="hl-section-subtitle">Converse sem interromper a transmissão.</div>
            </div>
            <div class="hl-mini-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
          </div>

          <button class="hl-primary-button hl-voice-join" id="hlVoiceJoin">
            <span class="hl-primary-icon" aria-hidden="true">🎙</span>
            <span class="hl-primary-copy"><strong>Entrar no voz</strong><small>Conectar microfone e áudio</small></span>
            <span class="hl-primary-arrow" aria-hidden="true">→</span>
          </button>

          <div class="hl-voice-controls">
            <button class="hl-secondary-button hl-voice-control" id="hlVoiceMute">
              <span class="hl-control-icon" aria-hidden="true">🎙</span>
              <span class="hl-control-copy"><strong>Microfone</strong><small id="hlVoiceMuteState">Desligado</small></span>
              <span class="hl-control-arrow" aria-hidden="true">›</span>
            </button>
            <button class="hl-secondary-button hl-voice-control" id="hlVoiceDeaf">
              <span class="hl-control-icon" aria-hidden="true">🎧</span>
              <span class="hl-control-copy"><strong>Ouvindo</strong><small id="hlVoiceDeafState">Aguardando entrada</small></span>
              <span class="hl-control-arrow" aria-hidden="true">›</span>
            </button>
            <button class="hl-secondary-button hl-voice-control" id="hlVoicePtt">
              <span class="hl-control-icon" aria-hidden="true">◉</span>
              <span class="hl-control-copy"><strong>Push-to-talk</strong><small id="hlVoicePttState">Desligado</small></span>
              <span class="hl-control-arrow" aria-hidden="true">›</span>
            </button>
            <button class="hl-secondary-button hl-voice-control is-danger" id="hlVoiceLeave">
              <span class="hl-control-icon" aria-hidden="true">↪</span>
              <span class="hl-control-copy"><strong>Sair do voz</strong><small>Desconectar áudio</small></span>
              <span class="hl-control-arrow" aria-hidden="true">›</span>
            </button>
          </div>

          <div class="hl-device-settings" id="hlVoiceDeviceSettings">
            <label class="hl-device-field">
              <span>Microfone</span>
              <select id="hlMicSelect" aria-label="Selecionar microfone"><option value="">Dispositivo padrão</option></select>
            </label>
            <label class="hl-device-field" id="hlOutputWrap">
              <span>Saída de áudio</span>
              <select id="hlOutputSelect" aria-label="Selecionar saída de áudio"><option value="">Dispositivo padrão</option></select>
            </label>
          </div>

          <div class="hl-section-heading hl-section-heading-compact">
            <div class="hl-section-title">Participantes no voz</div>
            <div class="hl-voice-count" id="hlVoiceCount">0</div>
          </div>
          <div class="hl-voice-list" id="hlVoiceList"></div>
        </div>

        <div class="hl-social-view hl-sound-view" data-view="sounds" role="tabpanel">
          <div class="hl-section-heading">
            <div>
              <div class="hl-section-title">Soundboard HL</div>
              <div class="hl-section-subtitle">Ouça aqui ou compartilhe com a sala.</div>
            </div>
            <div class="hl-sound-pulse" aria-hidden="true"></div>
          </div>
          <div class="hl-sound-policy" id="hlSoundPolicyWrap" hidden>
            <label><span>Quem pode tocar</span>
              <select id="hlSoundPolicy" aria-label="Permissão do soundboard">
                <option value="everyone">Todos podem usar</option>
                <option value="moderators">Host e moderadores</option>
                <option value="hostOnly">Somente host</option>
                <option value="disabled">Desativado</option>
              </select>
            </label>
          </div>
          <div class="hl-sound-toolbar">
            <label class="hl-sound-volume-wrap">
              <span>Volume</span>
              <input id="hlSoundVolume" type="range" min="0" max="1" step="0.05" aria-label="Volume dos sons">
            </label>
            <button class="hl-sound-stop" id="hlSoundStop" type="button">Parar</button>
          </div>
          <div class="hl-sound-grid" id="hlSoundGrid"></div>
          <p class="hl-sound-help"><strong>Ouvir aqui</strong> é privado. <strong>Tocar na sala</strong> envia o efeito aos participantes autorizados.</p>
        </div>
      </section>`;

    document.body.insertAdjacentHTML("beforeend", html);

    const panel = document.getElementById("hlSocialPanel");
    const dock = document.querySelector(".hl-social-dock");
    const appShell = document.querySelector(".app");
    const roomFooter = document.querySelector("footer");
    if (appShell && panel) appShell.appendChild(panel);
    if (roomFooter && dock) {
        const inviteButton = document.getElementById("copy");
        if (inviteButton) roomFooter.insertBefore(dock, inviteButton);
        else roomFooter.appendChild(dock);
    }

    // Organiza a toolbar em grupos visuais sem mudar IDs nem handlers existentes.
    if (roomFooter && !roomFooter.querySelector(".hl-toolbar-group")) {
        const quality = roomFooter.querySelector(".quality-control");
        const share = document.getElementById("share");
        const stop = document.getElementById("stop");
        const invite = document.getElementById("copy");
        const leave = document.getElementById("leave");

        const makeGroup = className => {
            const group = document.createElement("div");
            group.className = `hl-toolbar-group ${className}`;
            return group;
        };

        const socialGroup = makeGroup("hl-toolbar-social");
        const streamGroup = makeGroup("hl-toolbar-stream");
        const roomGroup = makeGroup("hl-toolbar-room");
        if (dock) socialGroup.appendChild(dock);
        if (share) streamGroup.appendChild(share);
        if (stop) streamGroup.appendChild(stop);
        if (quality) streamGroup.appendChild(quality);
        if (invite) roomGroup.appendChild(invite);
        if (leave) roomGroup.appendChild(leave);
        roomFooter.append(socialGroup, streamGroup, roomGroup);
    }
    const chatList = document.getElementById("hlChatList");
    const chatInput = document.getElementById("hlChatInput");
    const chatContext = document.getElementById("hlChatContext");
    const typingEl = document.getElementById("hlTyping");
    const voiceList = document.getElementById("hlVoiceList");
    const voiceJoin = document.getElementById("hlVoiceJoin");
    const voiceMute = document.getElementById("hlVoiceMute");
    const voiceDeaf = document.getElementById("hlVoiceDeaf");
    const voicePtt = document.getElementById("hlVoicePtt");
    const voiceLeave = document.getElementById("hlVoiceLeave");
    const voiceMuteState = document.getElementById("hlVoiceMuteState");
    const voiceDeafState = document.getElementById("hlVoiceDeafState");
    const voicePttState = document.getElementById("hlVoicePttState");
    const voiceCount = document.getElementById("hlVoiceCount");
    const micSelect = document.getElementById("hlMicSelect");
    const outputSelect = document.getElementById("hlOutputSelect");
    const outputWrap = document.getElementById("hlOutputWrap");
    const soundPolicy = document.getElementById("hlSoundPolicy");
    const soundPolicyWrap = document.getElementById("hlSoundPolicyWrap");
    const soundVolume = document.getElementById("hlSoundVolume");
    const soundStop = document.getElementById("hlSoundStop");
    const connectionPill = document.getElementById("status");

    const stageEl = document.getElementById("stage");
    if (stageEl) {
        const reactions = document.createElement("div");
        reactions.id = "hlFloatingReactions";
        reactions.className = "hl-floating-reactions";
        stageEl.appendChild(reactions);
    }

    const stageEmpty = document.getElementById("stageEmpty");
    if (stageEmpty && !stageEmpty.querySelector(".hl-stage-share")) {
        const cta = document.createElement("button");
        cta.type = "button";
        cta.className = "hl-stage-share";
        cta.innerHTML = '<span aria-hidden="true">▣</span><span>Compartilhar tela</span>';
        cta.addEventListener("click", () => document.getElementById("share")?.click());
        stageEmpty.appendChild(cta);
    }

    function toast(text) {
        const stack = document.getElementById("hlToastStack");
        const item = document.createElement("div");
        item.className = "hl-toast";
        item.textContent = text;
        stack.appendChild(item);
        setTimeout(() => item.remove(), 2800);
    }

    function updateUnread() {
        const chatButton = document.querySelector('.hl-social-action[data-open="chat"]');
        if (!chatButton) return;
        let badge = chatButton.querySelector(".v4-unread-badge");
        if (state.unreadChat > 0) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "v4-unread-badge";
                chatButton.appendChild(badge);
            }
            badge.textContent = state.unreadChat > 9 ? "9+" : String(state.unreadChat);
        } else if (badge) badge.remove();
    }

    function setTab(name) {
        panel.classList.add("is-open");
        document.body.classList.add("hl-social-panel-open");
        document.querySelectorAll(".hl-social-tab").forEach(btn => {
            const active = btn.dataset.tab === name;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("aria-selected", active ? "true" : "false");
        });
        document.querySelectorAll(".hl-social-view").forEach(view => view.classList.toggle("is-active", view.dataset.view === name));
        document.querySelectorAll(".hl-social-action[data-open]").forEach(btn => btn.classList.toggle("is-active", btn.dataset.open === name));
        if (name === "chat") {
            state.unreadChat = 0;
            updateUnread();
            setTimeout(() => chatInput.focus(), 80);
        }
        if (name === "voice") refreshAudioDevices();
    }

    document.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.open)));
    document.querySelectorAll(".hl-social-tab").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
    function closeSocialPanel() {
        panel.classList.remove("is-open");
        document.body.classList.remove("hl-social-panel-open");
        document.querySelectorAll(".hl-social-action[data-open]").forEach(btn => btn.classList.remove("is-active"));
    }
    document.getElementById("hlSocialClose").addEventListener("click", closeSocialPanel);
    document.getElementById("hlSocialBackdrop")?.addEventListener("click", closeSocialPanel);

    // Gesto simples de arrastar para baixo no mobile. Não interfere no scroll interno.
    let sheetStartY = null;
    let sheetDragging = false;
    panel.addEventListener("touchstart", event => {
        if (window.innerWidth > 650 || !panel.classList.contains("is-open")) return;
        const touch = event.touches?.[0];
        if (!touch) return;
        const head = event.target.closest?.(".hl-social-head");
        if (!head) return;
        sheetStartY = touch.clientY;
        sheetDragging = true;
        panel.style.transition = "none";
    }, { passive: true });
    panel.addEventListener("touchmove", event => {
        if (!sheetDragging || sheetStartY == null) return;
        const touch = event.touches?.[0];
        if (!touch) return;
        const delta = Math.max(0, touch.clientY - sheetStartY);
        panel.style.transform = `translateY(${Math.min(delta, 140)}px)`;
    }, { passive: true });
    panel.addEventListener("touchend", event => {
        if (!sheetDragging || sheetStartY == null) return;
        const touch = event.changedTouches?.[0];
        const delta = touch ? Math.max(0, touch.clientY - sheetStartY) : 0;
        panel.style.transition = "";
        panel.style.transform = "";
        sheetDragging = false;
        sheetStartY = null;
        if (delta > 86) closeSocialPanel();
    }, { passive: true });

    function currentUser() { return state.participants.get(socket.id); }
    function currentName() { return currentUser()?.name || "Você"; }

    function formatTime(value) {
        try { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
        catch { return ""; }
    }

    function renderChat() {
        const shouldStick = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 80;
        chatList.textContent = "";
        const ordered = Array.from(state.messages.values()).sort((a,b) => a.createdAt - b.createdAt);
        if (!ordered.length) {
            const empty = document.createElement("div");
            empty.className = "hl-chat-empty hl-empty-state";
            empty.innerHTML = '<div class="hl-empty-icon" aria-hidden="true">💬</div><strong>Comece a conversa da sala.</strong><span>As mensagens aparecem aqui em tempo real.</span>';
            chatList.appendChild(empty);
            return;
        }
        for (const message of ordered) chatList.appendChild(buildMessage(message));
        if (shouldStick) chatList.scrollTop = chatList.scrollHeight;
    }

    function buildMessage(message) {
        const box = document.createElement("div");
        box.className = "hl-chat-message" + (message.authorId === socket.id ? " is-mine" : "");
        box.dataset.id = message.id;

        if (message.replyTo) {
            const original = state.messages.get(message.replyTo);
            if (original) {
                const reply = document.createElement("div");
                reply.className = "hl-chat-reply";
                reply.textContent = `↪ ${original.authorName}: ${original.text.slice(0, 90)}`;
                box.appendChild(reply);
            }
        }

        const meta = document.createElement("div");
        meta.className = "hl-chat-meta";
        const author = document.createElement("span");
        author.className = "hl-chat-author";
        author.textContent = message.authorName || "Usuário";
        const time = document.createElement("span");
        time.textContent = formatTime(message.createdAt);
        meta.append(author, time);
        if (message.editedAt) {
            const edited = document.createElement("span");
            edited.className = "hl-chat-edited";
            edited.textContent = "editada";
            meta.appendChild(edited);
        }

        const text = document.createElement("div");
        text.className = "hl-chat-text";
        text.textContent = message.text;
        box.append(meta, text);

        const reactionSummary = document.createElement("div");
        reactionSummary.className = "hl-chat-reactions";
        Object.entries(message.reactions || {}).forEach(([emoji,count]) => {
            if (!count) return;
            const badge = document.createElement("span");
            badge.className = "hl-chat-reaction";
            badge.textContent = `${emoji} ${count}`;
            reactionSummary.appendChild(badge);
        });
        if (reactionSummary.childNodes.length) box.appendChild(reactionSummary);

        const tools = document.createElement("div");
        tools.className = "hl-chat-tools";
        const replyBtn = tool("Responder", () => { state.replyTo = message.id; state.editId = null; updateChatContext(); chatInput.focus(); });
        tools.appendChild(replyBtn);
        ["👍","😂","❤️","👏","🔥"].forEach(emoji => tools.appendChild(tool(emoji, () => socket.emit("chat:react", { id: message.id, emoji }))));
        if (message.authorId === socket.id) {
            tools.appendChild(tool("Editar", () => { state.editId = message.id; state.replyTo = null; chatInput.value = message.text; updateChatContext(); chatInput.focus(); }));
            tools.appendChild(tool("Excluir", () => socket.emit("chat:delete", { id: message.id }, result => { if (!result?.success) toast(result?.message || "Não foi possível excluir."); })));
        } else if (state.role === "host" || state.role === "moderator") {
            tools.appendChild(tool("Excluir", () => socket.emit("chat:delete", { id: message.id })));
        }
        box.appendChild(tools);
        return box;
    }

    function tool(label, fn) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.addEventListener("click", fn);
        return btn;
    }

    function updateChatContext() {
        const span = chatContext.querySelector("span");
        if (state.editId) {
            span.textContent = "Editando sua mensagem";
            chatContext.classList.add("is-visible");
        } else if (state.replyTo) {
            const target = state.messages.get(state.replyTo);
            span.textContent = target ? `Respondendo a ${target.authorName}` : "Respondendo";
            chatContext.classList.add("is-visible");
        } else {
            chatContext.classList.remove("is-visible");
        }
    }

    chatContext.querySelector("button").addEventListener("click", () => { state.replyTo = null; state.editId = null; chatInput.value = ""; updateChatContext(); });

    function sendChat() {
        const text = chatInput.value.trim();
        if (!text) return;
        if (state.editId) {
            const id = state.editId;
            socket.emit("chat:edit", { id, text }, result => {
                if (!result?.success) return toast(result?.message || "Falha ao editar.");
                state.editId = null; chatInput.value = ""; updateChatContext();
            });
            return;
        }
        socket.emit("chat:send", { text, replyTo: state.replyTo }, result => {
            if (!result?.success) return toast(result?.message || "Falha ao enviar.");
            chatInput.value = "";
            state.replyTo = null;
            updateChatContext();
            socket.emit("chat:typing", { typing: false });
        });
    }

    document.getElementById("hlChatSend").addEventListener("click", sendChat);
    chatInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendChat(); }
    });
    chatInput.addEventListener("input", () => {
        socket.emit("chat:typing", { typing: true });
        clearTimeout(state.typingTimer);
        state.typingTimer = setTimeout(() => socket.emit("chat:typing", { typing: false }), 1100);
    });

    const typingUsers = new Map();
    socket.on("chat:typing", data => {
        if (!data?.userId) return;
        if (data.typing) {
            typingUsers.set(data.userId, data.name || "Alguém");
            setTimeout(() => { typingUsers.delete(data.userId); renderTyping(); }, 1800);
        } else typingUsers.delete(data.userId);
        renderTyping();
    });
    function renderTyping() {
        const names = Array.from(typingUsers.values());
        typingEl.textContent = names.length ? `${names.slice(0,2).join(", ")} ${names.length === 1 ? "está" : "estão"} digitando…` : "";
    }

    socket.on("chat:message", message => {
        state.messages.set(message.id, message);
        renderChat();
        const chatVisible = panel.classList.contains("is-open") && document.querySelector('.hl-social-tab[data-tab="chat"]')?.classList.contains("is-active");
        if (!chatVisible && message.authorId !== socket.id) {
            state.unreadChat += 1;
            updateUnread();
            toast(`${message.authorName}: ${message.text.slice(0,55)}`);
        }
    });
    socket.on("chat:updated", message => { state.messages.set(message.id, message); renderChat(); });
    socket.on("chat:deleted", data => { state.messages.delete(data.id); renderChat(); });

    function bootstrapSocial() {
        if (state.bootstrapped || !state.participants.has(socket.id)) return;
        state.bootstrapped = true;
        socket.emit("social:state", result => {
            if (!result?.success) return;
            state.role = result.role || "member";
            state.hostId = result.hostId || null;
            state.soundPolicy = result.soundboardPolicy || "everyone";
            updateHostUI();
        });
        socket.emit("chat:history", result => {
            if (!result?.success) return;
            state.messages.clear();
            (result.messages || []).forEach(message => state.messages.set(message.id, message));
            renderChat();
            chatList.scrollTop = chatList.scrollHeight;
        });
    }

    socket.on("room:joined", data => {
        state.role = data.role || state.role;
        state.hostId = data.hostId || state.hostId;
        state.soundPolicy = data.soundboardPolicy || state.soundPolicy;
        updateHostUI();
    });

    socket.on("participants-update", list => {
        state.participants.clear();
        (list || []).forEach(user => state.participants.set(user.id, user));
        const self = state.participants.get(socket.id);
        if (self?.role) state.role = self.role;
        renderVoiceList();
        decorateParticipants();
        updateParticipantsCount();
        updateHostUI();
        bootstrapSocial();
    });

    socket.on("room:host-changed", data => { state.hostId = data.hostId; if (data.hostId === socket.id) { state.role = "host"; toast("Você agora é o host da sala."); } updateHostUI(); });

    function decorateParticipants() {
        const hostPanel = document.getElementById("people");
        if (!hostPanel) return;
        const cards = Array.from(hostPanel.children);
        const users = Array.from(state.participants.values());
        cards.forEach((card, index) => {
            card.querySelectorAll(".hl-role-badge,.hl-kick-mini").forEach(el => el.remove());
            const user = users[index];
            if (!user) return;
            if (user.role && user.role !== "member") {
                const badge = document.createElement("span");
                badge.className = "hl-role-badge";
                badge.textContent = user.role === "host" ? "HOST" : "MOD";
                card.appendChild(badge);
            }
            if ((state.role === "host" || state.role === "moderator") && user.id !== socket.id && user.role !== "host") {
                const kick = document.createElement("button");
                kick.className = "hl-kick-mini";
                kick.type = "button";
                kick.textContent = "Remover";
                kick.addEventListener("click", event => { event.stopPropagation(); socket.emit("moderation:kick", { target: user.id }, result => { if (!result?.success) toast(result?.message || "Sem permissão."); }); });
                card.appendChild(kick);
            }
        });
    }


    function updateParticipantsCount() {
        const title = document.querySelector(".people-title");
        if (title) {
            let count = title.querySelector(".v4-people-count");
            if (!count) {
                count = document.createElement("span");
                count.className = "v4-people-count";
                title.appendChild(count);
            }
            count.textContent = String(state.participants.size);
            count.title = `${state.participants.size} participante${state.participants.size === 1 ? "" : "s"}`;
        }
        const info = document.querySelector(".hl-room-info");
        if (info) {
            let chip = info.querySelector(".hl-v5-participant-chip");
            if (!chip) {
                chip = document.createElement("div");
                chip.className = "hl-v5-participant-chip";
                info.insertBefore(chip, info.firstChild);
            }
            chip.innerHTML = `<span aria-hidden="true">●</span><strong>${state.participants.size}</strong><em>${state.participants.size === 1 ? "participante" : "participantes"}</em>`;
        }
    }

    const roomCodeChip = document.querySelector(".hl-room-code-v2");
    if (roomCodeChip) {
        roomCodeChip.setAttribute("role", "button");
        roomCodeChip.setAttribute("tabindex", "0");
        roomCodeChip.title = "Copiar código da sala";
        const copyRoomCode = async () => {
            const code = document.getElementById("roomCode")?.textContent?.trim();
            if (!code) return;
            try {
                await navigator.clipboard.writeText(code);
                toast("Código da sala copiado.");
            } catch {
                toast("Não foi possível copiar o código.");
            }
        };
        roomCodeChip.addEventListener("click", copyRoomCode);
        roomCodeChip.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); copyRoomCode(); } });
    }

    function updateHostUI() {
        soundPolicyWrap.hidden = state.role !== "host";
        soundPolicy.value = state.soundPolicy;
    }

    soundPolicy.addEventListener("change", () => {
        socket.emit("moderation:sound-policy", { policy: soundPolicy.value }, result => {
            if (!result?.success) toast(result?.message || "Não foi possível alterar.");
        });
    });
    socket.on("sound:policy", data => { state.soundPolicy = data.policy; updateHostUI(); toast("Permissão do soundboard atualizada."); });

    // Voice -------------------------------------------------
    const voiceRtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };

    async function refreshAudioDevices() {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const microphones = devices.filter(device => device.kind === "audioinput");
            const outputs = devices.filter(device => device.kind === "audiooutput");

            const fill = (select, list, selected, fallback) => {
                if (!select) return;
                select.textContent = "";
                const base = document.createElement("option");
                base.value = "";
                base.textContent = fallback;
                select.appendChild(base);
                list.forEach((device, index) => {
                    const option = document.createElement("option");
                    option.value = device.deviceId;
                    option.textContent = device.label || `${fallback} ${index + 1}`;
                    select.appendChild(option);
                });
                select.value = list.some(device => device.deviceId === selected) ? selected : "";
            };
            fill(micSelect, microphones, state.selectedMicId, "Dispositivo padrão");
            fill(outputSelect, outputs, state.selectedOutputId, "Dispositivo padrão");
            if (outputWrap) outputWrap.hidden = !("setSinkId" in HTMLMediaElement.prototype) || outputs.length === 0;
        } catch {}
    }

    micSelect?.addEventListener("change", async () => {
        state.selectedMicId = micSelect.value;
        localStorage.setItem("hl_voice_mic", state.selectedMicId);
        if (state.voiceJoined) {
            const wasMuted = state.muted;
            const oldStream = state.voiceStream;
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
                const newTrack = stream.getAudioTracks()[0];
                state.voicePeers.forEach(peer => {
                    const sender = peer.getSenders().find(item => item.track?.kind === "audio");
                    if (sender && newTrack) sender.replaceTrack(newTrack).catch(() => {});
                });
                oldStream?.getTracks().forEach(track => track.stop());
                state.voiceStream = stream;
                state.muted = wasMuted;
                applyMicState();
                toast("Microfone atualizado.");
            } catch { toast("Não foi possível trocar o microfone."); }
        }
    });

    outputSelect?.addEventListener("change", async () => {
        state.selectedOutputId = outputSelect.value;
        localStorage.setItem("hl_voice_output", state.selectedOutputId);
        await Promise.all(Array.from(state.voiceAudio.values()).map(async audio => {
            if (typeof audio.setSinkId === "function") {
                try { await audio.setSinkId(state.selectedOutputId); } catch {}
            }
        }));
        toast("Saída de áudio atualizada.");
    });

    navigator.mediaDevices?.addEventListener?.("devicechange", refreshAudioDevices);

    async function joinVoice() {
        if (state.voiceJoined) return;
        try {
            state.voiceStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
            state.voiceJoined = true;
            state.muted = false;
            applyMicState();
            voiceJoin.classList.add("is-connected");
            voiceJoin.querySelector("strong").textContent = "Conectado ao voz";
            voiceJoin.querySelector("small").textContent = "Você está ouvindo a sala";
            voiceJoin.disabled = true;
            await refreshAudioDevices();
            document.getElementById("hlVoiceQuick").classList.add("is-active");
            socket.emit("voice:join", {}, async result => {
                if (!result?.success) { leaveVoice(false); return toast("Não foi possível entrar no voz."); }
                for (const peer of result.peers || []) await createVoiceOffer(peer.id);
            });
        } catch (error) {
            toast(error?.name === "NotAllowedError" ? "Permissão do microfone negada." : "Não foi possível acessar o microfone.");
        }
    }

    function closeVoicePeer(id) {
        const peer = state.voicePeers.get(id);
        if (peer) { try { peer.close(); } catch {} state.voicePeers.delete(id); }
        const audio = state.voiceAudio.get(id);
        if (audio) { audio.srcObject = null; audio.remove(); state.voiceAudio.delete(id); }
        state.voiceIceQueue.delete(id);
        const analyser = state.analysers.get(id);
        if (analyser?.context) analyser.context.close().catch(() => {});
        state.analysers.delete(id);
    }

    function leaveVoice(emit = true) {
        if (!state.voiceJoined && !state.voiceStream) return;
        if (emit && socket.connected) socket.emit("voice:leave", {}, () => {});
        state.voiceJoined = false;
        state.voicePeers.forEach((_, id) => closeVoicePeer(id));
        state.voiceStream?.getTracks().forEach(track => track.stop());
        state.voiceStream = null;
        state.muted = false;
        state.deaf = false;
        voiceJoin.disabled = false;
        voiceJoin.classList.remove("is-connected");
        voiceJoin.querySelector("strong").textContent = "Entrar no voz";
        voiceJoin.querySelector("small").textContent = "Conectar microfone e áudio";
        document.getElementById("hlVoiceQuick").classList.remove("is-active");
        updateVoiceButtons();
    }

    function createVoicePeer(remoteId) {
        closeVoicePeer(remoteId);
        const peer = new RTCPeerConnection(voiceRtcConfig);
        state.voicePeers.set(remoteId, peer);
        state.voiceStream?.getAudioTracks().forEach(track => peer.addTrack(track, state.voiceStream));
        peer.onicecandidate = event => { if (event.candidate) socket.emit("voice:ice", { target: remoteId, candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate }); };
        peer.ontrack = event => attachRemoteAudio(remoteId, event.streams[0] || new MediaStream([event.track]));
        peer.onconnectionstatechange = () => { if (["failed","closed"].includes(peer.connectionState)) closeVoicePeer(remoteId); };
        return peer;
    }

    async function createVoiceOffer(remoteId) {
        if (!state.voiceJoined || remoteId === socket.id) return;
        const peer = createVoicePeer(remoteId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("voice:offer", { target: remoteId, description: peer.localDescription });
    }

    async function flushIce(remoteId, peer) {
        const queue = state.voiceIceQueue.get(remoteId) || [];
        state.voiceIceQueue.delete(remoteId);
        for (const candidate of queue) { try { await peer.addIceCandidate(candidate); } catch {} }
    }

    socket.on("voice:offer", async data => {
        if (!state.voiceJoined) return;
        try {
            const peer = createVoicePeer(data.sender);
            await peer.setRemoteDescription(data.description);
            await flushIce(data.sender, peer);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.emit("voice:answer", { target: data.sender, description: peer.localDescription });
        } catch { closeVoicePeer(data.sender); }
    });

    socket.on("voice:answer", async data => {
        const peer = state.voicePeers.get(data.sender);
        if (!peer) return;
        try { await peer.setRemoteDescription(data.description); await flushIce(data.sender, peer); } catch { closeVoicePeer(data.sender); }
    });

    socket.on("voice:ice", async data => {
        const peer = state.voicePeers.get(data.sender);
        if (!peer || !peer.remoteDescription) {
            const queue = state.voiceIceQueue.get(data.sender) || [];
            queue.push(data.candidate);
            state.voiceIceQueue.set(data.sender, queue);
            return;
        }
        try { await peer.addIceCandidate(data.candidate); } catch {}
    });

    socket.on("voice:user-left", data => closeVoicePeer(data.id));
    socket.on("voice:state", data => {
        const user = state.participants.get(data.id);
        if (user) { user.muted = Boolean(data.muted); user.deaf = Boolean(data.deaf); renderVoiceList(); }
    });

    function attachRemoteAudio(id, stream) {
        let audio = state.voiceAudio.get(id);
        if (!audio) {
            audio = document.createElement("audio");
            audio.autoplay = true;
            audio.playsInline = true;
            audio.dataset.voiceUser = id;
            document.body.appendChild(audio);
            state.voiceAudio.set(id, audio);
        }
        audio.srcObject = stream;
        audio.muted = state.deaf;
        if (state.selectedOutputId && typeof audio.setSinkId === "function") audio.setSinkId(state.selectedOutputId).catch(() => {});
        audio.play().catch(() => toast("Clique na página para liberar o áudio do voz."));
        startSpeakingMeter(id, stream);
    }

    function startSpeakingMeter(id, stream) {
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            const source = context.createMediaStreamSource(stream);
            source.connect(analyser);
            const data = new Uint8Array(analyser.frequencyBinCount);
            const record = { context, analyser, speaking: false };
            state.analysers.set(id, record);
            const tick = () => {
                if (!state.analysers.has(id)) return;
                analyser.getByteFrequencyData(data);
                const avg = data.reduce((a,b) => a+b,0) / data.length;
                const speaking = avg > 18;
                if (speaking !== record.speaking) { record.speaking = speaking; renderVoiceList(); }
                setTimeout(tick, 180);
            };
            tick();
        } catch {}
    }

    function renderAvatar(el, value) {
        el.textContent = "";
        if (/^https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\//i.test(value || "")) {
            const img = document.createElement("img"); img.src = value; img.alt = ""; img.referrerPolicy = "no-referrer"; el.appendChild(img);
        } else el.textContent = value || "😎";
    }

    function renderVoiceList() {
        voiceList.textContent = "";
        const users = Array.from(state.participants.values()).filter(user => user.voiceJoined || (user.id === socket.id && state.voiceJoined));
        if (voiceCount) voiceCount.textContent = String(users.length);
        if (!users.length) {
            const empty=document.createElement("div");
            empty.className="hl-voice-empty hl-empty-state";
            empty.innerHTML='<div class="hl-voice-empty-orbit"><span aria-hidden="true">♙+</span></div><strong>Ninguém entrou no voz ainda.</strong><span>Seja o primeiro a entrar e começar a conversa.</span>';
            voiceList.appendChild(empty);
            return;
        }
        users.forEach(user => {
            const row=document.createElement("div"); row.className="hl-voice-user";
            if (state.analysers.get(user.id)?.speaking) row.classList.add("is-speaking");
            const avatar=document.createElement("div"); avatar.className="hl-voice-avatar"; renderAvatar(avatar,user.avatar);
            const info=document.createElement("div"); info.className="hl-voice-user-copy";
            const name=document.createElement("div"); name.className="hl-voice-name"; name.textContent=user.name + (user.id===socket.id?" (você)":"");
            const sub=document.createElement("small"); sub.textContent=state.analysers.get(user.id)?.speaking?"Falando":(user.muted?"Microfone mutado":"No voz");
            info.append(name,sub);
            const st=document.createElement("div"); st.className="hl-voice-state"; st.textContent=user.muted?"🔇":(user.deaf?"🎧×":"🎙");
            row.append(avatar,info,st);
            if (user.id !== socket.id) {
                const slider=document.createElement("input"); slider.type="range"; slider.min="0"; slider.max="1"; slider.step="0.05"; slider.value=localStorage.getItem(`hl_volume_${user.id}`)||"1"; slider.className="hl-volume";
                slider.addEventListener("input",()=>{ const audio=state.voiceAudio.get(user.id); if(audio) audio.volume=Number(slider.value); localStorage.setItem(`hl_volume_${user.id}`,slider.value); });
                row.appendChild(slider);
            }
            voiceList.appendChild(row);
        });
    }

    function applyMicState() {
        const enabled = state.voiceJoined && !state.muted && (!state.ptt || state.pttPressed);
        state.voiceStream?.getAudioTracks().forEach(track => track.enabled = enabled);
        updateVoiceButtons();
        if (state.voiceJoined) socket.emit("voice:state", { muted: !enabled, deaf: state.deaf });
    }

    function updateVoiceButtons() {
        voiceMute.classList.toggle("is-on", !state.muted && state.voiceJoined);
        voiceMute.classList.toggle("is-muted", state.muted);
        if (voiceMuteState) voiceMuteState.textContent = !state.voiceJoined ? "Desligado" : (state.muted ? "Mutado" : "Ativo");
        voiceDeaf.classList.toggle("is-on", state.voiceJoined && !state.deaf);
        if (voiceDeafState) voiceDeafState.textContent = !state.voiceJoined ? "Aguardando entrada" : (state.deaf ? "Áudio silenciado" : "Áudio ativo");
        voicePtt.classList.toggle("is-on", state.ptt);
        if (voicePttState) voicePttState.textContent = state.ptt ? "Ativo • segure Espaço" : "Desligado";
    }

    voiceJoin.addEventListener("click", joinVoice);
    voiceLeave.addEventListener("click", () => leaveVoice(true));
    voiceMute.addEventListener("click", () => { if (!state.voiceJoined) return joinVoice(); state.muted = !state.muted; applyMicState(); });
    voiceDeaf.addEventListener("click", () => { if (!state.voiceJoined) return; state.deaf = !state.deaf; state.voiceAudio.forEach(audio => audio.muted = state.deaf); socket.emit("voice:state", { muted: state.muted, deaf: state.deaf }); updateVoiceButtons(); });
    voicePtt.addEventListener("click", () => { state.ptt = !state.ptt; state.pttPressed = false; applyMicState(); toast(state.ptt ? "Push-to-talk: segure Espaço para falar." : "Push-to-talk desligado."); });

    function isTypingTarget(target) { return target?.matches?.("input, textarea, select, [contenteditable='true']"); }
    window.addEventListener("keydown", event => {
        if (event.code === "Space" && state.ptt && !isTypingTarget(event.target)) { event.preventDefault(); if (!state.pttPressed) { state.pttPressed = true; applyMicState(); } }
        if (event.key.toLowerCase() === "m" && !isTypingTarget(event.target)) { state.muted = !state.muted; applyMicState(); }
        if (event.key.toLowerCase() === "c" && !isTypingTarget(event.target)) setTab("chat");
    });
    window.addEventListener("keyup", event => { if (event.code === "Space" && state.ptt && state.pttPressed) { state.pttPressed = false; applyMicState(); } });

    // Soundboard --------------------------------------------
    const grid = document.getElementById("hlSoundGrid");
    const soundById = new Map(soundCatalog.map(item => [item[0], item]));

    for (const [, , , , file] of soundCatalog) {
        const preload = new Audio();
        preload.preload = "auto";
        preload.src = file;
    }

    soundVolume.value = String(Math.min(1, Math.max(0, state.soundVolume)));
    soundVolume.addEventListener("input", () => {
        state.soundVolume = Number(soundVolume.value);
        localStorage.setItem("hl_sound_volume", String(state.soundVolume));
        state.activeSounds.forEach(audio => { audio.volume = state.soundVolume; });
    });

    soundStop.addEventListener("click", () => stopAllSounds());

    soundCatalog.forEach(([id, label, desc, icon]) => {
        const card = document.createElement("div");
        card.className = "hl-sound-card";
        card.dataset.soundId = id;

        const top = document.createElement("div");
        top.className = "hl-sound-top";
        const iconEl = document.createElement("div");
        iconEl.className = "hl-sound-icon";
        iconEl.textContent = icon;
        const meta = document.createElement("div");
        meta.className = "hl-sound-meta";
        const strong = document.createElement("strong");
        strong.textContent = label;
        const small = document.createElement("small");
        small.textContent = desc;
        meta.append(strong, small);
        top.append(iconEl, meta);

        const actions = document.createElement("div");
        actions.className = "hl-sound-actions";
        const preview = tool("Ouvir aqui", () => playSound(id, true));
        preview.title = "Ouvir só aqui";
        const all = tool("Na sala", () => sendSharedSound(id));
        actions.append(preview, all);
        card.append(top, actions);
        grid.appendChild(card);
    });

    function stopAllSounds() {
        state.activeSounds.forEach(audio => {
            try { audio.pause(); audio.currentTime = 0; } catch {}
        });
        state.activeSounds.clear();
    }

    async function playSound(id, userInitiated = false) {
        const item = soundById.get(id);
        if (!item) return false;
        const file = item[4];
        const audio = new Audio(file);
        audio.preload = "auto";
        audio.volume = Math.min(1, Math.max(0, state.soundVolume));
        state.activeSounds.add(audio);
        const cleanup = () => state.activeSounds.delete(audio);
        audio.addEventListener("ended", cleanup, { once: true });
        audio.addEventListener("error", cleanup, { once: true });
        try {
            await audio.play();
            const card = document.querySelector(`.hl-sound-card[data-sound-id="${CSS.escape(id)}"]`);
            card?.classList.add("is-playing");
            setTimeout(() => card?.classList.remove("is-playing"), 520);
            return true;
        } catch (error) {
            cleanup();
            const now = Date.now();
            if (now - state.soundBlockedToastAt > 3500) {
                state.soundBlockedToastAt = now;
                toast(userInitiated ? "Não foi possível reproduzir esse som." : "O navegador bloqueou o áudio. Clique na página e tente novamente.");
            }
            return false;
        }
    }

    function canUseSoundLocally() {
        if (state.soundPolicy === "disabled") return false;
        if (state.soundPolicy === "everyone") return true;
        if (state.soundPolicy === "hostOnly") return state.role === "host";
        if (state.soundPolicy === "moderators") return state.role === "host" || state.role === "moderator";
        return false;
    }

    async function sendSharedSound(soundId) {
        const now = Date.now();
        if (now < state.soundCooldownUntil) return toast("Aguarde um instante para tocar outro som.");
        if (!canUseSoundLocally()) return toast("Você não tem permissão para usar o soundboard.");

        // O emissor escuta imediatamente dentro do gesto do clique; os demais recebem pelo servidor.
        await playSound(soundId, true);
        socket.emit("sound:play", { soundId }, result => {
            if (!result?.success) return toast(result?.message || "Som não permitido.");
            state.soundCooldownUntil = Date.now() + 900;
        });
    }

    socket.on("sound:play", data => {
        if (!data?.soundId) return;
        playSound(data.soundId, false);
        if (data.userId !== socket.id) toast(`${data.name || "Alguém"} tocou um efeito.`);
    });

    // Reactions / modes -------------------------------------
    const reactionQuick = document.getElementById("hlReactionQuick");
    const reactionPicker = document.getElementById("hlReactionPicker");
    const closeReactionPicker = () => {
        if (!reactionPicker) return;
        reactionPicker.hidden = true;
        state.reactionPickerOpen = false;
        reactionQuick?.classList.remove("is-active");
    };
    reactionQuick?.addEventListener("click", event => {
        event.stopPropagation();
        state.reactionPickerOpen = !state.reactionPickerOpen;
        reactionPicker.hidden = !state.reactionPickerOpen;
        reactionQuick.classList.toggle("is-active", state.reactionPickerOpen);
    });
    reactionPicker?.querySelectorAll("[data-reaction]").forEach(button => button.addEventListener("click", () => {
        socket.emit("reaction:send", { emoji: button.dataset.reaction });
        closeReactionPicker();
    }));
    document.addEventListener("click", event => {
        if (state.reactionPickerOpen && !reactionPicker?.contains(event.target) && event.target !== reactionQuick) closeReactionPicker();
    });
    socket.on("reaction:show",data=>{
        const host=document.getElementById("hlFloatingReactions"); if(!host)return;
        const el=document.createElement("div"); el.className="hl-floating-reaction"; el.textContent=data.emoji; el.style.right=`${Math.floor(Math.random()*70)}px`; host.appendChild(el); setTimeout(()=>el.remove(),1900);
    });

    document.getElementById("hlModeQuick").addEventListener("click",()=>{
        document.body.classList.remove(...modes.map(m=>`hl-mode-${m}`));
        state.modeIndex=(state.modeIndex+1)%modes.length;
        const mode=modes[state.modeIndex];
        if(mode!=="normal") document.body.classList.add(`hl-mode-${mode}`);
        toast(`Modo ${mode}.`);
    });

    // Connection / reconnect --------------------------------
    socket.on("connect",()=>{ if (connectionPill) { connectionPill.textContent="Conectado"; connectionPill.dataset.state="online"; } if(state.voiceJoined && state.voiceStream){ state.voicePeers.forEach((_,id)=>closeVoicePeer(id)); socket.emit("voice:join",{},async result=>{ for(const peer of result?.peers||[]) await createVoiceOffer(peer.id); }); } });
    socket.on("disconnect",()=>{ if (connectionPill) { connectionPill.textContent="Reconectando…"; connectionPill.dataset.state="reconnecting"; } state.bootstrapped=false; state.voicePeers.forEach((_,id)=>closeVoicePeer(id)); });
    socket.on("connect_error",()=> { if (connectionPill) { connectionPill.textContent="Sem conexão"; connectionPill.dataset.state="offline"; } });
    socket.on("moderation:kicked",data=>{ toast(data?.message||"Você foi removido."); leaveVoice(false); setTimeout(()=>location.href="/",800); });

    window.addEventListener("beforeunload",()=>{ try{ if(state.voiceJoined) socket.emit("voice:leave"); }catch{} state.voiceStream?.getTracks().forEach(t=>t.stop()); state.analysers.forEach(a=>a.context?.close().catch(()=>{})); });

    updateVoiceButtons();
})();
