(() => {
  "use strict";

  function create(options = {}) {
    const { socket, state, roomCode, toast = () => {} } = options;
    if (!socket || !state || !roomCode) return null;

    const soundVolume = document.getElementById("hlSoundVolume");
    const soundStop = document.getElementById("hlSoundStop");
    const soundAdd = document.getElementById("hlSoundAdd");
    const soundSearch = document.getElementById("hlSoundSearch");
    const soundFilters = document.getElementById("hlSoundFilters");
    const soundModal = document.getElementById("hlSoundModal");
    const soundFile = document.getElementById("hlSoundFile");
    const soundEditor = document.getElementById("hlSoundEditor");
    const soundDrop = document.getElementById("hlSoundDrop");
    const soundStart = document.getElementById("hlSoundStart");
    const soundDuration = document.getElementById("hlSoundDuration");

    const grid = document.getElementById("hlSoundGrid");
    const soundById = window.HLSoundboardModule?.createCatalog?.() || new Map();
    const soundTool = window.HLSoundboardModule?.createActionButton || ((label, handler) => { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.addEventListener("click", handler); return button; });
    let soundEditorBuffer = null;
    let soundPreviewSource = null;
    let soundPreviewContext = null;

    window.HLSoundboardModule?.preloadBuiltins?.();

    function canUploadSoundLocally() {
        if (state.soundUploadPolicy === "disabled") return false;
        if (state.soundUploadPolicy === "everyone") return true;
        if (state.soundUploadPolicy === "hostOnly") return state.role === "host";
        if (state.soundUploadPolicy === "moderators") return state.role === "host" || state.role === "moderator";
        return false;
    }

    function syncCustomSounds(items) {
        for (const [id, item] of soundById) if (item.custom) soundById.delete(id);
        for (const item of items || []) {
            if (!item?.id || !item?.url) continue;
            soundById.set(item.id, {
                id: item.id,
                name: String(item.name || "Som personalizado").slice(0, 40),
                category: String(item.category || "Outros").slice(0, 30),
                emoji: String(item.emoji || "🔊").slice(0, 8),
                url: item.url,
                custom: true,
                ownerId: item.ownerId || null,
                ownerName: item.ownerName || "Usuário",
                duration: Number(item.duration) || null,
                createdAt: Number(item.createdAt) || Date.now()
            });
        }
        renderSoundGrid();
    }

    function rememberRecentSound(id) {
        state.recentSounds = [id, ...state.recentSounds.filter(item => item !== id)].slice(0, 12);
        window.HLSoundboardModule?.saveStringArray?.("hl_sound_recent", state.recentSounds);
    }

    function toggleFavorite(id) {
        if (state.soundFavorites.has(id)) state.soundFavorites.delete(id); else state.soundFavorites.add(id);
        localStorage.setItem("hl_sound_favorites", JSON.stringify(Array.from(state.soundFavorites).slice(0, 40)));
        renderSoundGrid();
    }

    function renderSoundGrid() {
        if (!grid) return;
        grid.textContent = "";
        const query = state.soundSearch.trim().toLocaleLowerCase("pt-BR");
        let items = Array.from(soundById.values());
        if (query) items = items.filter(item => `${item.name} ${item.category} ${item.ownerName || ""}`.toLocaleLowerCase("pt-BR").includes(query));
        if (state.soundCategory === "favorites") items = items.filter(item => state.soundFavorites.has(item.id));
        if (state.soundCategory === "custom") items = items.filter(item => item.custom && item.ownerId === socket.id);
        if (state.soundCategory === "recent") {
            const rank = new Map(state.recentSounds.map((id, index) => [id, index]));
            items = items.filter(item => rank.has(item.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
        }

        if (!items.length) {
            const empty = document.createElement("div");
            empty.className = "hl-sound-empty";
            const icon = document.createElement("span"); icon.setAttribute("aria-hidden", "true"); icon.textContent = "♫";
            const title = document.createElement("strong"); title.textContent = state.soundSearch ? "Nenhum som encontrado." : "Nenhum som por aqui.";
            const desc = document.createElement("small"); desc.textContent = state.soundSearch ? "Tente outro termo ou limpe a busca." : "Adicione um som curto para começar.";
            empty.append(icon, title, desc);
            if (canUploadSoundLocally() && !state.soundSearch) {
                const cta = document.createElement("button");
                cta.type = "button"; cta.className = "hl-sound-empty-cta"; cta.textContent = "＋ Adicionar primeiro som";
                cta.addEventListener("click", openSoundModal);
                empty.appendChild(cta);
            }
            grid.appendChild(empty);
            return;
        }

        for (const item of items) {
            const card = document.createElement("article");
            card.className = `hl-sound-card${item.custom ? " is-custom" : ""}`;
            card.dataset.soundId = item.id;

            const top = document.createElement("div");
            top.className = "hl-sound-top";
            const iconEl = document.createElement("div");
            iconEl.className = "hl-sound-icon";
            iconEl.textContent = item.emoji;
            const meta = document.createElement("div");
            meta.className = "hl-sound-meta";
            const strong = document.createElement("strong");
            strong.textContent = item.name;
            const small = document.createElement("small");
            small.textContent = item.custom
                ? `${item.category} • ${item.duration ? `${item.duration.toFixed(1)}s` : "personalizado"}`
                : item.category;
            meta.append(strong, small);

            const fav = document.createElement("button");
            fav.type = "button";
            fav.className = `hl-sound-favorite${state.soundFavorites.has(item.id) ? " is-active" : ""}`;
            fav.textContent = state.soundFavorites.has(item.id) ? "★" : "☆";
            fav.title = state.soundFavorites.has(item.id) ? "Remover dos favoritos" : "Adicionar aos favoritos";
            fav.setAttribute("aria-label", fav.title);
            fav.addEventListener("click", () => toggleFavorite(item.id));
            top.append(iconEl, meta, fav);

            const actions = document.createElement("div");
            actions.className = "hl-sound-actions";
            const preview = soundTool("▶ Ouvir", () => playSound(item.id, true));
            preview.title = "Ouvir só aqui";
            preview.dataset.soundAction = "preview";
            const all = soundTool("📢 Na sala", () => sendSharedSound(item.id));
            all.title = "Tocar para os participantes autorizados";
            all.dataset.soundAction = "room";
            actions.append(preview, all);

            if (item.custom && (item.ownerId === socket.id || state.role === "host" || state.role === "moderator")) {
                const edit = soundTool("Editar", () => editCustomSound(item.id));
                const duplicate = soundTool("Duplicar", () => duplicateCustomSound(item.id));
                const remove = soundTool("Excluir", () => deleteCustomSound(item.id));
                edit.classList.add("is-secondary");
                duplicate.classList.add("is-secondary");
                remove.classList.add("is-danger");
                actions.append(edit, duplicate, remove);
            }

            card.append(top, actions);
            grid.appendChild(card);
        }
        try { window.HLConnectivity?.apply?.(); } catch {}
    }

    const soundVolumeValue = document.getElementById("hlSoundVolumeValue");
    function syncSoundVolumeUI() {
        const value = Math.round(Math.min(1, Math.max(0, state.soundVolume)) * 100);
        if (soundVolumeValue) soundVolumeValue.textContent = `${value}%`;
        if (soundVolume) soundVolume.style.setProperty("--hl-range-value", `${value}%`);
    }
    soundVolume.value = String(Math.min(1, Math.max(0, state.soundVolume)));
    syncSoundVolumeUI();
    soundVolume.addEventListener("input", () => {
        state.soundVolume = Number(soundVolume.value);
        localStorage.setItem("hl_sound_volume", String(state.soundVolume));
        state.activeSounds.forEach(audio => { audio.volume = state.soundVolume; });
        syncSoundVolumeUI();
    });

    soundStop.addEventListener("click", () => {
        stopAllSounds();
        if (state.role === "host" || state.role === "moderator") socket.emit("sound:stop", () => {});
    });

    soundSearch?.addEventListener("input", () => {
        state.soundSearch = soundSearch.value;
        renderSoundGrid();
    });
    soundFilters?.querySelectorAll("[data-sound-filter]").forEach(button => button.addEventListener("click", () => {
        state.soundCategory = button.dataset.soundFilter || "all";
        soundFilters.querySelectorAll("[data-sound-filter]").forEach(item => item.classList.toggle("is-active", item === button));
        renderSoundGrid();
    }));

    function stopAllSounds() {
        state.activeSounds.forEach(audio => {
            try { audio.pause(); audio.currentTime = 0; } catch {}
        });
        state.activeSounds.clear();
    }

    async function playSound(id, userInitiated = false) {
        const item = soundById.get(id);
        if (!item) return false;
        const audio = new Audio(item.url);
        audio.preload = "auto";
        audio.volume = Math.min(1, Math.max(0, state.soundVolume));
        state.activeSounds.add(audio);
        rememberRecentSound(id);
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
        if (!soundById.has(soundId)) return toast("Esse som não está mais disponível.");

        await playSound(soundId, true);
        socket.emit("sound:play", { soundId }, result => {
            if (!result?.success) return toast(result?.message || "Som não permitido.");
            state.soundCooldownUntil = Date.now() + 900;
        });
    }

    const onSoundPlay = data => {
        if (!data?.soundId || !soundById.has(data.soundId)) return;
        playSound(data.soundId, false);
        if (data.userId !== socket.id) toast(`${data.name || "Alguém"} tocou ${soundById.get(data.soundId)?.name || "um efeito"}.`);
    };
    const onSoundStop = () => stopAllSounds();
    const onSoundCatalogAdd = item => {
        if (!item?.id || !item?.url) return;
        soundById.set(item.id, { ...item, name: String(item.name || "Som personalizado"), category: String(item.category || "Outros"), emoji: String(item.emoji || "🔊"), custom: true });
        renderSoundGrid();
        if (item.ownerId !== socket.id) toast(`${item.ownerName || "Alguém"} adicionou um som.`);
    };
    const onSoundCatalogUpdate = item => {
        if (!item?.id || !item?.url) return;
        soundById.set(item.id, { ...item, name: String(item.name || "Som personalizado"), category: String(item.category || "Outros"), emoji: String(item.emoji || "🔊"), custom: true });
        renderSoundGrid();
    };
    const onSoundCatalogRemove = data => {
        if (!data?.id) return;
        soundById.delete(data.id);
        state.soundFavorites.delete(data.id);
        renderSoundGrid();
    };
    socket.on("sound:play", onSoundPlay);
    socket.on("sound:stop", onSoundStop);
    socket.on("sound:catalog-add", onSoundCatalogAdd);
    socket.on("sound:catalog-update", onSoundCatalogUpdate);
    socket.on("sound:catalog-remove", onSoundCatalogRemove);

    async function editCustomSound(id) {
        const item = soundById.get(id);
        if (!item?.custom || !state.apiToken) return;
        const name = prompt("Nome do som:", item.name);
        if (name === null) return;
        const emoji = prompt("Emoji do som:", item.emoji || "🔊");
        if (emoji === null) return;
        try {
            const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/sounds/${encodeURIComponent(id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "x-hl-socket-id": socket.id, "x-hl-room-token": state.apiToken },
                body: JSON.stringify({ name: name.trim().slice(0,40), emoji: emoji.trim().slice(0,8), category: item.category })
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível editar.");
            toast("Som atualizado.");
        } catch (error) { toast(error.message || "Não foi possível editar o som."); }
    }

    async function duplicateCustomSound(id) {
        if (!state.apiToken) return toast("Reconecte à sala antes de duplicar sons.");
        try {
            const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/sounds/${encodeURIComponent(id)}/duplicate`, {
                method: "POST",
                headers: { "x-hl-socket-id": socket.id, "x-hl-room-token": state.apiToken }
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível duplicar.");
            toast("Som duplicado.");
        } catch (error) { toast(error.message || "Não foi possível duplicar o som."); }
    }

    async function deleteCustomSound(id) {
        const item = soundById.get(id);
        if (!item?.custom) return;
        if (!state.apiToken) return toast("Reconecte à sala antes de excluir sons.");
        try {
            const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/sounds/${encodeURIComponent(id)}`, {
                method: "DELETE",
                headers: { "x-hl-socket-id": socket.id, "x-hl-room-token": state.apiToken }
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível excluir.");
            toast("Som excluído da sala.");
        } catch (error) {
            toast(error.message || "Não foi possível excluir o som.");
        }
    }

    function openSoundModal() {
        if (!canUploadSoundLocally()) return toast("O host restringiu novos sons.");
        soundModal.hidden = false;
        document.body.classList.add("hl-modal-open");
        document.getElementById("hlSoundChooseFile")?.focus();
    }

    function closeSoundModal() {
        stopEditorPreview();
        soundModal.hidden = true;
        document.body.classList.remove("hl-modal-open");
        soundEditor.hidden = true;
        soundDrop.hidden = false;
        soundEditorBuffer = null;
        if (soundFile) soundFile.value = "";
    }

    soundAdd?.addEventListener("click", openSoundModal);
    document.getElementById("hlSoundModalClose")?.addEventListener("click", closeSoundModal);
    document.getElementById("hlSoundModalBackdrop")?.addEventListener("click", closeSoundModal);
    document.getElementById("hlSoundCancel")?.addEventListener("click", closeSoundModal);
    document.getElementById("hlSoundChooseFile")?.addEventListener("click", () => soundFile?.click());

    soundFile?.addEventListener("change", async () => {
        const file = soundFile.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            soundFile.value = "";
            return toast("Escolha um áudio de até 20 MB.");
        }
        const chooseButton = document.getElementById("hlSoundChooseFile");
        if (chooseButton) { chooseButton.disabled = true; chooseButton.textContent = "Lendo áudio..."; }
        try {
            const bytes = await file.arrayBuffer();
            const context = new (window.AudioContext || window.webkitAudioContext)();
            soundEditorBuffer = await context.decodeAudioData(bytes.slice(0));
            await context.close();
            if (!soundEditorBuffer?.duration || !Number.isFinite(soundEditorBuffer.duration)) throw new Error("Áudio inválido.");
            if (soundEditorBuffer.duration > 60 * 30) throw new Error("Áudio longo demais para edição rápida.");

            document.getElementById("hlSoundFileName").textContent = file.name.slice(0, 70);
            document.getElementById("hlSoundFileInfo").textContent = `${formatSeconds(soundEditorBuffer.duration)} • ${(file.size / 1024 / 1024).toFixed(1)} MB`;
            const cleanName = file.name.replace(/\.[^.]+$/, "").slice(0, 40);
            document.getElementById("hlSoundName").value = cleanName;
            soundStart.max = String(Math.max(0, soundEditorBuffer.duration - 0.2));
            soundStart.value = "0";
            soundDuration.max = String(Math.min(15, soundEditorBuffer.duration));
            soundDuration.value = String(Math.min(5, Math.max(0.2, soundEditorBuffer.duration)));
            updateTrimLabels();
            soundDrop.hidden = true;
            soundEditor.hidden = false;
        } catch (error) {
            soundEditorBuffer = null;
            soundFile.value = "";
            toast(error.message || "O navegador não conseguiu abrir esse áudio.");
        } finally {
            if (chooseButton) { chooseButton.disabled = false; chooseButton.textContent = "Selecionar arquivo"; }
        }
    });

    function updateTrimLabels() {
        if (!soundEditorBuffer) return;
        const start = Math.min(Number(soundStart.value) || 0, Math.max(0, soundEditorBuffer.duration - 0.1));
        const maxDuration = Math.min(15, Math.max(0.1, soundEditorBuffer.duration - start));
        soundDuration.max = String(maxDuration);
        if (Number(soundDuration.value) > maxDuration) soundDuration.value = String(maxDuration);
        document.getElementById("hlSoundStartLabel").textContent = `${start.toFixed(1)}s`;
        document.getElementById("hlSoundDurationLabel").textContent = `${Number(soundDuration.value).toFixed(1)}s`;
    }
    soundStart?.addEventListener("input", updateTrimLabels);
    soundDuration?.addEventListener("input", updateTrimLabels);

    function formatSeconds(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    }

    function stopEditorPreview() {
        try { soundPreviewSource?.stop(); } catch {}
        soundPreviewSource = null;
        if (soundPreviewContext) { soundPreviewContext.close().catch(() => {}); soundPreviewContext = null; }
    }

    document.getElementById("hlSoundPreviewStop")?.addEventListener("click", stopEditorPreview);
    document.getElementById("hlSoundPreview")?.addEventListener("click", async () => {
        if (!soundEditorBuffer) return;
        stopEditorPreview();
        soundPreviewContext = new (window.AudioContext || window.webkitAudioContext)();
        soundPreviewSource = soundPreviewContext.createBufferSource();
        soundPreviewSource.buffer = soundEditorBuffer;
        soundPreviewSource.connect(soundPreviewContext.destination);
        const start = Number(soundStart.value) || 0;
        const duration = Math.min(15, Number(soundDuration.value) || 1);
        soundPreviewSource.start(0, start, duration);
        soundPreviewSource.onended = () => {
            soundPreviewSource = null;
            const context = soundPreviewContext;
            soundPreviewContext = null;
            context?.close().catch(() => {});
        };
    });

    function encodeWavMono16(audioBuffer) {
        const samples = audioBuffer.getChannelData(0);
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const write = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
        write(0, "RIFF");
        view.setUint32(4, 36 + samples.length * 2, true);
        write(8, "WAVE");
        write(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        write(36, "data");
        view.setUint32(40, samples.length * 2, true);
        let offset = 44;
        for (let i = 0; i < samples.length; i += 1) {
            const sample = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += 2;
        }
        return new Blob([buffer], { type: "audio/wav" });
    }

    async function buildTrimmedWav() {
        if (!soundEditorBuffer) throw new Error("Escolha um áudio primeiro.");
        const start = Number(soundStart.value) || 0;
        const duration = Math.min(15, Math.max(0.2, Number(soundDuration.value) || 1));
        const sampleRate = 22050;
        const frames = Math.max(1, Math.ceil(duration * sampleRate));
        const OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!OfflineContext) throw new Error("Seu navegador não oferece edição de áudio offline.");
        const offline = new OfflineContext(1, frames, sampleRate);
        const source = offline.createBufferSource();
        source.buffer = soundEditorBuffer;
        source.connect(offline.destination);
        source.start(0, start, duration);
        const rendered = await offline.startRendering();
        return encodeWavMono16(rendered);
    }

    document.getElementById("hlSoundUpload")?.addEventListener("click", async event => {
        if (!soundEditorBuffer) return toast("Escolha um áudio primeiro.");
        if (!state.apiToken || !socket.connected) return toast("Reconecte à sala antes de adicionar o som.");
        const button = event.currentTarget;
        const name = document.getElementById("hlSoundName").value.trim().slice(0, 40) || "Som personalizado";
        const category = document.getElementById("hlSoundCategory").value;
        const emoji = document.getElementById("hlSoundEmoji").value.trim().slice(0, 8) || "🔊";
        button.disabled = true;
        button.textContent = "Processando...";
        try {
            const wav = await buildTrimmedWav();
            if (wav.size > 700 * 1024) throw new Error("O trecho ficou grande demais. Reduza a duração.");
            button.textContent = "Enviando...";
            const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/sounds`, {
                method: "POST",
                headers: {
                    "Content-Type": "audio/wav",
                    "x-hl-socket-id": socket.id,
                    "x-hl-room-token": state.apiToken,
                    "x-hl-sound-name": encodeURIComponent(name),
                    "x-hl-sound-category": encodeURIComponent(category),
                    "x-hl-sound-emoji": encodeURIComponent(emoji)
                },
                body: wav
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.success) throw new Error(result.message || "Não foi possível adicionar o som.");
            toast("Som adicionado à sala.");
            closeSoundModal();
        } catch (error) {
            toast(error.message || "Não foi possível adicionar o som.");
        } finally {
            button.disabled = false;
            button.textContent = "Adicionar à sala";
        }
    });

    renderSoundGrid();


    return {
      render: renderSoundGrid,
      syncCustomSounds,
      canUpload: canUploadSoundLocally,
      stopAll: stopAllSounds,
      destroy() {
        stopAllSounds();
        stopEditorPreview();
        socket.off?.("sound:play", onSoundPlay);
        socket.off?.("sound:stop", onSoundStop);
        socket.off?.("sound:catalog-add", onSoundCatalogAdd);
        socket.off?.("sound:catalog-update", onSoundCatalogUpdate);
        socket.off?.("sound:catalog-remove", onSoundCatalogRemove);
        try { state.soundContext?.close?.(); } catch {}
        state.soundContext = null;
      }
    };
  }

  window.HLSoundboardController = Object.freeze({ version: "12.0.0", create });
})();
