(() => {
  "use strict";

  function createHLVoiceController({ state, socket, elements, toast, openChat }) {
    const {
      voiceList, voiceJoin, voiceMute, voiceDeaf, voicePtt, voiceLeave,
      voiceMuteState, voiceDeafState, voicePttState, voiceCount,
      micSelect, outputSelect, outputWrap, voiceQuick
    } = elements;

    const voiceRtcConfig = window.HLVoiceConfig?.rtc?.() || {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    };

    const cleanupFns = [];
    const keydown = event => {
      if (event.code === "Space" && state.ptt && !isTypingTarget(event.target)) {
        event.preventDefault();
        if (!state.pttPressed) { state.pttPressed = true; applyMicState(); }
      }
      if (event.key.toLowerCase() === "m" && !isTypingTarget(event.target)) {
        if (!state.voiceJoined) return;
        state.muted = !state.muted;
        applyMicState();
      }
      if (event.key.toLowerCase() === "c" && !isTypingTarget(event.target)) openChat?.();
    };
    const keyup = event => {
      if (event.code === "Space" && state.ptt && state.pttPressed) {
        state.pttPressed = false;
        applyMicState();
      }
    };

    function on(target, name, handler, options) {
      if (!target?.addEventListener) return;
      target.addEventListener(name, handler, options);
      cleanupFns.push(() => target.removeEventListener(name, handler, options));
    }

    function onSocket(name, handler) {
      socket.on(name, handler);
      cleanupFns.push(() => socket.off?.(name, handler));
    }

    async function refreshAudioDevices() {
      const provider = window.HLVoiceDevices?.list;
      if (!provider && !navigator.mediaDevices?.enumerateDevices) return;
      try {
        const result = provider ? await provider() : (() => null)();
        const devices = result ? [...result.inputs, ...result.outputs] : await navigator.mediaDevices.enumerateDevices();
        const microphones = result ? result.inputs : devices.filter(device => device.kind === "audioinput");
        const outputs = result ? result.outputs : devices.filter(device => device.kind === "audiooutput");
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

    async function changeMic() {
      state.selectedMicId = micSelect?.value || "";
      localStorage.setItem("hl_voice_mic", state.selectedMicId);
      if (!state.voiceJoined) return;
      const wasMuted = state.muted;
      const oldStream = state.voiceStream;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, video: false
        });
        const newTrack = stream.getAudioTracks()[0];
        state.voicePeers.forEach(peer => {
          const sender = peer.getSenders().find(item => item.track?.kind === "audio");
          if (sender && newTrack) sender.replaceTrack(newTrack).catch(() => {});
        });
        oldStream?.getTracks().forEach(track => track.stop());
        state.voiceStream = stream;
        startLocalSpeechDetector(stream);
        state.muted = wasMuted;
        applyMicState();
        toast?.("Microfone atualizado.");
      } catch {
        toast?.("Não foi possível trocar o microfone.");
      }
    }

    async function changeOutput() {
      state.selectedOutputId = outputSelect?.value || "";
      localStorage.setItem("hl_voice_output", state.selectedOutputId);
      await Promise.all(Array.from(state.voiceAudio.values()).map(async audio => {
        if (typeof audio.setSinkId === "function") {
          try { await audio.setSinkId(state.selectedOutputId); } catch {}
        }
      }));
      toast?.("Saída de áudio atualizada.");
    }

    function stopLocalSpeechDetector() {
      const record = state.localSpeech;
      if (!record) return;
      record.active = false;
      if (record.raf) cancelAnimationFrame(record.raf);
      record.context?.close?.().catch(() => {});
      state.localSpeech = null;
      if (socket.connected) socket.emit("voice:speaking", { speaking: false });
    }

    function startLocalSpeechDetector(stream) {
      stopLocalSpeechDetector();
      try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const record = { context, analyser, data, speaking: false, active: true, raf: 0, lastEmit: 0 };
        state.localSpeech = record;
        const tick = () => {
          if (!record.active || state.localSpeech !== record) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
          const speaking = !state.muted && avg > 18;
          const now = Date.now();
          if (speaking !== record.speaking || now - record.lastEmit > 2200) {
            record.speaking = speaking;
            record.lastEmit = now;
            if (socket.connected) socket.emit("voice:speaking", { speaking });
          }
          record.raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {}
    }

    async function join() {
      if (state.voiceJoined) return;
      if (!window.HLVoiceConfig?.supports?.() && !navigator.mediaDevices?.getUserMedia) {
        window.HLVoiceState?.set("error");
        toast?.("Voz não é suportado neste navegador.");
        return;
      }
      window.HLVoiceState?.set("requesting-permission");
      try {
        state.voiceStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }, video: false
        });
        startLocalSpeechDetector(state.voiceStream);
        state.voiceJoined = true;
        window.HLVoiceState?.set("connecting");
        state.muted = sessionStorage.getItem("hl_prejoin_muted") === "1";
        applyMicState();
        voiceJoin?.classList.add("is-connected");
        const strong = voiceJoin?.querySelector("strong");
        const small = voiceJoin?.querySelector("small");
        if (strong) strong.textContent = "Conectado ao voz";
        if (small) small.textContent = "Você está ouvindo a sala";
        if (voiceJoin) voiceJoin.disabled = true;
        await refreshAudioDevices();
        voiceQuick?.classList.add("is-active");
        socket.emit("voice:join", {}, async result => {
          if (!result?.success) {
            window.HLVoiceState?.set("error");
            leave(false);
            toast?.("Não foi possível entrar no voz.");
            return;
          }
          for (const peer of result.peers || []) await createOffer(peer.id);
          window.HLVoiceState?.set("connected");
        });
      } catch (error) {
        window.HLVoiceState?.set("error");
        const code = error?.name === "NotAllowedError" ? "MIC_PERMISSION_DENIED" : error?.name === "NotFoundError" ? "MIC_NOT_FOUND" : "VOICE_CONNECT_FAILED";
        document.documentElement.dataset.hlVoiceError = code;
        toast?.(code === "MIC_PERMISSION_DENIED" ? "Permissão do microfone negada." : code === "MIC_NOT_FOUND" ? "Nenhum microfone foi encontrado." : "Não foi possível acessar o microfone.");
      }
    }

    function closePeer(id) {
      const peer = state.voicePeers.get(id);
      if (peer) { try { peer.close(); } catch {} state.voicePeers.delete(id); }
      const audio = state.voiceAudio.get(id);
      if (audio) { audio.srcObject = null; audio.remove(); state.voiceAudio.delete(id); }
      state.voiceIceQueue.delete(id);
      const analyser = state.analysers.get(id);
      if (analyser?.timer) clearTimeout(analyser.timer);
      if (analyser?.context) analyser.context.close().catch(() => {});
      state.analysers.delete(id);
    }

    function leave(emit = true) {
      window.HLVoiceState?.set("disconnected");
      if (!state.voiceJoined && !state.voiceStream) return;
      if (emit && socket.connected) socket.emit("voice:leave", {}, () => {});
      state.voiceJoined = false;
      Array.from(state.voicePeers.keys()).forEach(closePeer);
      stopLocalSpeechDetector();
      state.voiceStream?.getTracks().forEach(track => track.stop());
      state.voiceStream = null;
      state.muted = false;
      state.deaf = false;
      if (voiceJoin) voiceJoin.disabled = false;
      voiceJoin?.classList.remove("is-connected");
      const strong = voiceJoin?.querySelector("strong");
      const small = voiceJoin?.querySelector("small");
      if (strong) strong.textContent = "Entrar no voz";
      if (small) small.textContent = "Conectar microfone e áudio";
      voiceQuick?.classList.remove("is-active");
      updateButtons();
    }

    function createPeer(remoteId) {
      closePeer(remoteId);
      const peer = new RTCPeerConnection(voiceRtcConfig);
      state.voicePeers.set(remoteId, peer);
      state.voiceStream?.getAudioTracks().forEach(track => peer.addTrack(track, state.voiceStream));
      peer.onicecandidate = event => {
        if (event.candidate) socket.emit("voice:ice", { target: remoteId, candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate });
      };
      peer.ontrack = event => attachRemoteAudio(remoteId, event.streams[0] || new MediaStream([event.track]));
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected" && state.voiceJoined) window.HLVoiceState?.set("connected");
        if (peer.connectionState === "disconnected" && state.voiceJoined) window.HLVoiceState?.set("reconnecting");
        if (["failed", "closed"].includes(peer.connectionState)) {
          if (peer.connectionState === "failed" && state.voiceJoined) window.HLVoiceState?.set("error");
          closePeer(remoteId);
        }
      };
      return peer;
    }

    async function createOffer(remoteId) {
      if (!state.voiceJoined || remoteId === socket.id) return;
      const peer = createPeer(remoteId);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("voice:offer", { target: remoteId, description: peer.localDescription });
    }

    async function flushIce(remoteId, peer) {
      const queue = state.voiceIceQueue.get(remoteId) || [];
      state.voiceIceQueue.delete(remoteId);
      for (const candidate of queue) { try { await peer.addIceCandidate(candidate); } catch {} }
    }

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
      audio.play().catch(() => toast?.("Clique na página para liberar o áudio do voz."));
      startSpeakingMeter(id, stream);
    }

    function startSpeakingMeter(id, stream) {
      try {
        const old = state.analysers.get(id);
        if (old?.timer) clearTimeout(old.timer);
        old?.context?.close?.().catch(() => {});
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const record = { context, analyser, speaking: false, timer: null };
        state.analysers.set(id, record);
        const tick = () => {
          if (state.analysers.get(id) !== record) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const speaking = avg > 18;
          if (speaking !== record.speaking) { record.speaking = speaking; renderList(); }
          record.timer = setTimeout(tick, 180);
        };
        tick();
      } catch {}
    }

    function renderAvatar(el, value) {
      el.textContent = "";
      if (/^https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\//i.test(value || "")) {
        const img = document.createElement("img");
        img.src = value; img.alt = ""; img.referrerPolicy = "no-referrer";
        el.appendChild(img);
      } else el.textContent = value || "😎";
    }

    function renderList() {
      if (!voiceList) return;
      voiceList.textContent = "";
      const users = Array.from(state.participants.values()).filter(user => user.voiceJoined || (user.id === socket.id && state.voiceJoined));
      if (voiceCount) voiceCount.textContent = String(users.length);
      if (!users.length) {
        const empty = document.createElement("div");
        empty.className = "hl-voice-empty hl-empty-state";
        empty.innerHTML = '<div class="hl-voice-empty-orbit"><span aria-hidden="true">♙+</span></div><strong>Ninguém entrou no voz ainda.</strong><span>Seja o primeiro a entrar e começar a conversa.</span>';
        voiceList.appendChild(empty);
        return;
      }
      users.forEach(user => {
        const row = document.createElement("div"); row.className = "hl-voice-user";
        if (state.analysers.get(user.id)?.speaking) row.classList.add("is-speaking");
        const avatar = document.createElement("div"); avatar.className = "hl-voice-avatar"; renderAvatar(avatar, user.avatar);
        const info = document.createElement("div"); info.className = "hl-voice-user-copy";
        const name = document.createElement("div"); name.className = "hl-voice-name"; name.textContent = user.name + (user.id === socket.id ? " (você)" : "");
        const sub = document.createElement("small"); sub.textContent = state.analysers.get(user.id)?.speaking ? "Falando" : (user.muted ? "Microfone mutado" : "No voz");
        info.append(name, sub);
        const st = document.createElement("div"); st.className = "hl-voice-state"; st.textContent = user.muted ? "🔇" : (user.deaf ? "🎧×" : "🎙");
        row.append(avatar, info, st);
        if (user.id !== socket.id) {
          const slider = document.createElement("input");
          slider.type = "range"; slider.min = "0"; slider.max = "1"; slider.step = "0.05";
          slider.value = localStorage.getItem(`hl_volume_${user.id}`) || "1"; slider.className = "hl-volume";
          slider.addEventListener("input", () => {
            const audio = state.voiceAudio.get(user.id);
            if (audio) audio.volume = Number(slider.value);
            localStorage.setItem(`hl_volume_${user.id}`, slider.value);
          });
          row.appendChild(slider);
        }
        voiceList.appendChild(row);
      });
    }

    function applyMicState() {
      const enabled = state.voiceJoined && !state.muted && (!state.ptt || state.pttPressed);
      state.voiceStream?.getAudioTracks().forEach(track => { track.enabled = enabled; });
      updateButtons();
      if (state.voiceJoined) socket.emit("voice:state", { muted: !enabled, deaf: state.deaf });
    }

    function updateButtons() {
      voiceMute?.classList.toggle("is-on", !state.muted && state.voiceJoined);
      voiceMute?.classList.toggle("is-muted", state.muted);
      if (voiceMuteState) voiceMuteState.textContent = !state.voiceJoined ? "Desligado" : (state.muted ? "Mutado" : "Ativo");
      voiceDeaf?.classList.toggle("is-on", state.voiceJoined && !state.deaf);
      if (voiceDeafState) voiceDeafState.textContent = !state.voiceJoined ? "Aguardando entrada" : (state.deaf ? "Áudio silenciado" : "Áudio ativo");
      voicePtt?.classList.toggle("is-on", state.ptt);
      if (voicePttState) voicePttState.textContent = state.ptt ? "Ativo • segure Espaço" : "Desligado";
    }

    function isTypingTarget(target) {
      return target?.matches?.("input, textarea, select, [contenteditable='true']");
    }

    function handleReconnect() {
      window.HLVoiceState?.set(state.voiceJoined ? "reconnecting" : "disconnected");
      if (!state.voiceJoined || !state.voiceStream) return;
      Array.from(state.voicePeers.keys()).forEach(closePeer);
      socket.emit("voice:join", {}, async result => {
        if (!result?.success) { window.HLVoiceState?.set("error"); return; }
        for (const peer of result.peers || []) await createOffer(peer.id);
        window.HLVoiceState?.set("connected");
      });
    }

    function handleDisconnect() {
      if (state.voiceJoined) window.HLVoiceState?.set("reconnecting");
      Array.from(state.voicePeers.keys()).forEach(closePeer);
    }

    function handleConnectError() {
      if (state.voiceJoined) window.HLVoiceState?.set("error");
    }

    function forceMute() {
      if (!state.voiceJoined) return;
      state.muted = true;
      state.voiceStream?.getAudioTracks?.().forEach(track => { track.enabled = false; });
      socket.emit("voice:state", { muted: true, deaf: state.deaf });
      updateButtons();
      toast?.("Seu microfone foi silenciado pela moderação.");
    }

    function destroy() {
      try { if (state.voiceJoined && socket.connected) socket.emit("voice:leave"); } catch {}
      leave(false);
      cleanupFns.splice(0).forEach(fn => { try { fn(); } catch {} });
      try { deviceUnsubscribe?.(); } catch {}
    }

    on(micSelect, "change", changeMic);
    on(outputSelect, "change", changeOutput);
    on(voiceJoin, "click", join);
    on(voiceLeave, "click", () => leave(true));
    on(voiceMute, "click", () => { if (!state.voiceJoined) return join(); state.muted = !state.muted; applyMicState(); });
    on(voiceDeaf, "click", () => {
      if (!state.voiceJoined) return;
      state.deaf = !state.deaf;
      state.voiceAudio.forEach(audio => { audio.muted = state.deaf; });
      socket.emit("voice:state", { muted: state.muted, deaf: state.deaf });
      updateButtons();
    });
    on(voicePtt, "click", () => {
      state.ptt = !state.ptt;
      state.pttPressed = false;
      applyMicState();
      toast?.(state.ptt ? "Push-to-talk: segure Espaço para falar." : "Push-to-talk desligado.");
    });
    on(window, "keydown", keydown);
    on(window, "keyup", keyup);

    const deviceUnsubscribe = window.HLVoiceDevices?.subscribe?.(() => refreshAudioDevices()) || (() => {});

    onSocket("voice:offer", async data => {
      if (!state.voiceJoined) return;
      try {
        const peer = createPeer(data.sender);
        await peer.setRemoteDescription(data.description);
        await flushIce(data.sender, peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("voice:answer", { target: data.sender, description: peer.localDescription });
      } catch { closePeer(data.sender); }
    });
    onSocket("voice:answer", async data => {
      const peer = state.voicePeers.get(data.sender);
      if (!peer) return;
      try { await peer.setRemoteDescription(data.description); await flushIce(data.sender, peer); } catch { closePeer(data.sender); }
    });
    onSocket("voice:ice", async data => {
      const peer = state.voicePeers.get(data.sender);
      if (!peer || !peer.remoteDescription) {
        const queue = state.voiceIceQueue.get(data.sender) || [];
        queue.push(data.candidate);
        state.voiceIceQueue.set(data.sender, queue);
        return;
      }
      try { await peer.addIceCandidate(data.candidate); } catch {}
    });
    onSocket("voice:user-left", data => closePeer(data.id));
    onSocket("voice:state", data => {
      const user = state.participants.get(data.id);
      if (user) { user.muted = Boolean(data.muted); user.deaf = Boolean(data.deaf); renderList(); }
    });

    onSocket("voice:speaking", data => {
      window.dispatchEvent(new CustomEvent("hl:voice-speaking", { detail: data || {} }));
    });

    updateButtons();

    return {
      join, leave, refreshAudioDevices, renderList, updateButtons,
      handleReconnect, handleDisconnect, handleConnectError, forceMute, destroy,
      closePeer, createOffer
    };
  }

  window.createHLVoiceController = createHLVoiceController;
})();
