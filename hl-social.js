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
        soundCooldownUntil: 0
    };

    const modes = ["normal", "focus", "social", "cinema"];
    const soundCatalog = [
        ["airhorn", "Air Horn", "Impacto"],
        ["victory", "Vitória", "Comemoração"],
        ["fail", "Falha", "Derrota"],
        ["bonk", "Bonk", "Reação"],
        ["pop", "Pop", "Reação rápida"],
        ["suspense", "Suspense", "Tensão"]
    ];

    const html = `
      <div class="hl-connection-pill" id="hlConnectionPill">🟢 conectado</div>
      <div class="hl-toast-stack" id="hlToastStack" aria-live="polite"></div>
      <div class="hl-social-dock" aria-label="Controles sociais HL">
        <button class="hl-social-action" data-open="chat" title="Chat">💬</button>
        <button class="hl-social-action" id="hlVoiceQuick" data-open="voice" title="Voz">🎙️</button>
        <button class="hl-social-action" data-open="sounds" title="Soundboard">🎛️</button>
        <button class="hl-social-action" id="hlReactionQuick" title="Reação">🔥</button>
        <button class="hl-social-action" id="hlModeQuick" title="Modo da sala">◫</button>
      </div>
      <section class="hl-social-panel" id="hlSocialPanel" aria-label="Painel social">
        <div class="hl-social-head">
          <div class="hl-social-tabs">
            <button class="hl-social-tab is-active" data-tab="chat">Chat</button>
            <button class="hl-social-tab" data-tab="voice">Voz</button>
            <button class="hl-social-tab" data-tab="sounds">Sons</button>
          </div>
          <button class="hl-social-close" id="hlSocialClose" aria-label="Fechar">×</button>
        </div>
        <div class="hl-social-view is-active" data-view="chat">
          <div class="hl-chat-list" id="hlChatList"><div class="hl-chat-empty">Comece a conversa da sala.</div></div>
          <div class="hl-chat-typing" id="hlTyping"></div>
          <div class="hl-chat-compose">
            <div class="hl-chat-context" id="hlChatContext"><span></span><button type="button">×</button></div>
            <div class="hl-chat-compose-row">
              <input id="hlChatInput" class="hl-chat-input" maxlength="1000" placeholder="Mensagem para a sala" autocomplete="off">
              <button id="hlChatSend" class="hl-chat-send">Enviar</button>
            </div>
          </div>
        </div>
        <div class="hl-social-view hl-voice-view" data-view="voice">
          <div class="hl-section-title">Voz em tempo real</div>
          <button class="hl-primary-button" id="hlVoiceJoin">Entrar no voz</button>
          <div class="hl-voice-controls">
            <button class="hl-secondary-button" id="hlVoiceMute">🔈 Microfone</button>
            <button class="hl-secondary-button" id="hlVoiceDeaf">🎧 Ouvir</button>
            <button class="hl-secondary-button" id="hlVoicePtt">PTT desligado</button>
            <button class="hl-secondary-button" id="hlVoiceLeave">Sair do voz</button>
          </div>
          <div class="hl-section-title">Participantes no voz</div>
          <div class="hl-voice-list" id="hlVoiceList"></div>
        </div>
        <div class="hl-social-view hl-sound-view" data-view="sounds">
          <div class="hl-section-title">Soundboard HL</div>
          <div class="hl-sound-policy" id="hlSoundPolicyWrap" hidden>
            <select id="hlSoundPolicy" aria-label="Permissão do soundboard">
              <option value="everyone">Todos podem usar</option>
              <option value="moderators">Host e moderadores</option>
              <option value="hostOnly">Somente host</option>
              <option value="disabled">Desativado</option>
            </select>
          </div>
          <div class="hl-sound-grid" id="hlSoundGrid"></div>
          <small style="color:var(--hl-social-muted)">Prévia toca só para você. “Todos” passa pelo servidor e respeita cooldown/permissões.</small>
        </div>
      </section>`;

    document.body.insertAdjacentHTML("beforeend", html);

    const panel = document.getElementById("hlSocialPanel");
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
    const soundPolicy = document.getElementById("hlSoundPolicy");
    const soundPolicyWrap = document.getElementById("hlSoundPolicyWrap");
    const connectionPill = document.getElementById("hlConnectionPill");

    const stageEl = document.getElementById("stage");
    if (stageEl) {
        const reactions = document.createElement("div");
        reactions.id = "hlFloatingReactions";
        reactions.className = "hl-floating-reactions";
        stageEl.appendChild(reactions);
    }

    function toast(text) {
        const stack = document.getElementById("hlToastStack");
        const item = document.createElement("div");
        item.className = "hl-toast";
        item.textContent = text;
        stack.appendChild(item);
        setTimeout(() => item.remove(), 2800);
    }

    function setTab(name) {
        panel.classList.add("is-open");
        document.querySelectorAll(".hl-social-tab").forEach(btn => btn.classList.toggle("is-active", btn.dataset.tab === name));
        document.querySelectorAll(".hl-social-view").forEach(view => view.classList.toggle("is-active", view.dataset.view === name));
        if (name === "chat") setTimeout(() => chatInput.focus(), 80);
    }

    document.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.open)));
    document.querySelectorAll(".hl-social-tab").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
    document.getElementById("hlSocialClose").addEventListener("click", () => panel.classList.remove("is-open"));

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
            empty.className = "hl-chat-empty";
            empty.textContent = "Comece a conversa da sala.";
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

    socket.on("chat:message", message => { state.messages.set(message.id, message); renderChat(); if (!panel.classList.contains("is-open")) toast(`${message.authorName}: ${message.text.slice(0,55)}`); });
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

    async function joinVoice() {
        if (state.voiceJoined) return;
        try {
            state.voiceStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
            state.voiceJoined = true;
            state.muted = false;
            applyMicState();
            voiceJoin.textContent = "No voz";
            voiceJoin.disabled = true;
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
        voiceJoin.textContent = "Entrar no voz";
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
        if (!users.length) { const empty=document.createElement("div"); empty.className="hl-chat-empty"; empty.textContent="Ninguém entrou no voz ainda."; voiceList.appendChild(empty); return; }
        users.forEach(user => {
            const row=document.createElement("div"); row.className="hl-voice-user";
            if (state.analysers.get(user.id)?.speaking) row.classList.add("is-speaking");
            const avatar=document.createElement("div"); avatar.className="hl-voice-avatar"; renderAvatar(avatar,user.avatar);
            const name=document.createElement("div"); name.className="hl-voice-name"; name.textContent=user.name + (user.id===socket.id?" (você)":"");
            const st=document.createElement("div"); st.className="hl-voice-state"; st.textContent=user.muted?"🔇":(user.deaf?"🎧×":"🎙️");
            row.append(avatar,name,st);
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
        voiceMute.textContent = state.muted ? "🔇 Mutado" : "🎙️ Microfone";
        voiceMute.classList.toggle("is-on", !state.muted && state.voiceJoined);
        voiceDeaf.textContent = state.deaf ? "🎧 Surdo" : "🎧 Ouvindo";
        voiceDeaf.classList.toggle("is-on", state.voiceJoined && !state.deaf);
        voicePtt.textContent = state.ptt ? "PTT ligado" : "PTT desligado";
        voicePtt.classList.toggle("is-on", state.ptt);
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
    soundCatalog.forEach(([id,label,desc]) => {
        const card=document.createElement("div"); card.className="hl-sound-card";
        const strong=document.createElement("strong"); strong.textContent=label;
        const small=document.createElement("small"); small.textContent=desc;
        const actions=document.createElement("div"); actions.className="hl-sound-actions";
        const preview=tool("Prévia",()=>playSound(id));
        const all=tool("Todos",()=>sendSharedSound(id));
        actions.append(preview,all); card.append(strong,small,actions); grid.appendChild(card);
    });

    function audioContext() {
        if (!state.soundContext) state.soundContext = new (window.AudioContext || window.webkitAudioContext)();
        if (state.soundContext.state === "suspended") state.soundContext.resume().catch(()=>{});
        return state.soundContext;
    }

    function tone(ctx, freq, start, duration, gain=.08, type="sine", endFreq=null) {
        const osc=ctx.createOscillator(); const g=ctx.createGain(); osc.type=type; osc.frequency.setValueAtTime(freq,start); if(endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),start+duration); g.gain.setValueAtTime(.0001,start); g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),start+.015); g.gain.exponentialRampToValueAtTime(.0001,start+duration); osc.connect(g).connect(ctx.destination); osc.start(start); osc.stop(start+duration+.02);
    }

    function playSound(id) {
        const ctx=audioContext(); const t=ctx.currentTime+.01;
        if(id==="airhorn"){ tone(ctx,220,t,.42,.09,"sawtooth",170); tone(ctx,330,t,.38,.05,"square",260); }
        else if(id==="victory"){ [523,659,784,1047].forEach((f,i)=>tone(ctx,f,t+i*.11,.18,.055,"triangle")); }
        else if(id==="fail"){ [440,370,311,220].forEach((f,i)=>tone(ctx,f,t+i*.13,.2,.05,"sawtooth")); }
        else if(id==="bonk"){ tone(ctx,150,t,.16,.13,"square",70); }
        else if(id==="pop"){ tone(ctx,680,t,.08,.07,"sine",220); }
        else if(id==="suspense"){ tone(ctx,95,t,.8,.045,"sawtooth",125); tone(ctx,142,t+.08,.72,.035,"sine",175); }
    }

    function sendSharedSound(soundId) {
        const now=Date.now();
        if(now<state.soundCooldownUntil) return toast("Soundboard em cooldown.");
        socket.emit("sound:play",{soundId},result=>{
            if(!result?.success) return toast(result?.message||"Som não permitido.");
            state.soundCooldownUntil=Date.now()+900;
        });
    }
    socket.on("sound:play",data=>{ playSound(data.soundId); if(data.userId!==socket.id) toast(`${data.name||"Alguém"} tocou um efeito.`); });

    // Reactions / modes -------------------------------------
    document.getElementById("hlReactionQuick").addEventListener("click",()=>socket.emit("reaction:send",{emoji:"🔥"}));
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
    socket.on("connect",()=>{ connectionPill.textContent="🟢 conectado"; if(state.voiceJoined && state.voiceStream){ state.voicePeers.forEach((_,id)=>closeVoicePeer(id)); socket.emit("voice:join",{},async result=>{ for(const peer of result?.peers||[]) await createVoiceOffer(peer.id); }); } });
    socket.on("disconnect",()=>{ connectionPill.textContent="🟠 reconectando"; state.bootstrapped=false; state.voicePeers.forEach((_,id)=>closeVoicePeer(id)); });
    socket.on("connect_error",()=> connectionPill.textContent="🔴 sem conexão");
    socket.on("moderation:kicked",data=>{ toast(data?.message||"Você foi removido."); leaveVoice(false); setTimeout(()=>location.href="/",800); });

    window.addEventListener("beforeunload",()=>{ try{ if(state.voiceJoined) socket.emit("voice:leave"); }catch{} state.voiceStream?.getTracks().forEach(t=>t.stop()); state.analysers.forEach(a=>a.context?.close().catch(()=>{})); });

    updateVoiceButtons();
})();
