(() => {
    "use strict";

    if (typeof socket === "undefined") return;

    function storedArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || "[]");
            return Array.isArray(value) ? value.filter(item => typeof item === "string").slice(0, 40) : [];
        } catch {
            return [];
        }
    }

    const savedSoundVolume = Number(localStorage.getItem("hl_sound_volume"));

    const state = {
        bootstrapped: false,
        role: "member",
        hostId: null,
        soundPolicy: "everyone",
        soundUploadPolicy: "everyone",
        apiToken: "",
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
        soundVolume: Number.isFinite(savedSoundVolume) ? Math.min(1, Math.max(0, savedSoundVolume)) : 0.72,
        soundBlockedToastAt: 0,
        unreadChat: 0,
        selectedMicId: localStorage.getItem("hl_voice_mic") || "",
        selectedOutputId: localStorage.getItem("hl_voice_output") || "",
        reactionPickerOpen: false,
        soundFavorites: new Set(storedArray("hl_sound_favorites")),
        recentSounds: storedArray("hl_sound_recent"),
        soundSearch: "",
        soundCategory: "all",
        seenReactionIds: new Set(),
        lastReactionAt: 0,
        localSpeech: null
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

      <div class="hl-more-menu" id="hlMoreMenu" hidden aria-label="Mais ações">
        <button type="button" data-more-action="settings"><span>⚙</span><b>Configurações</b></button>
        <div class="hl-more-separator" aria-hidden="true"></div>
        <button type="button" data-more-action="normal"><span>◉</span><b>Modo normal</b></button>
        <button type="button" data-more-action="focus"><span>⌖</span><b>Modo foco</b></button>
        <button type="button" data-more-action="cinema"><span>▣</span><b>Modo cinema</b></button>
        <button type="button" data-more-action="social"><span>◎</span><b>Modo social</b></button>
        <button type="button" data-more-action="invite"><span>🔗</span><b>Copiar convite</b></button>
      </div>

      <section class="hl-settings-panel" id="hlSettingsPanel" hidden aria-label="Configurações do HL Activity">
        <div class="hl-settings-head">
          <div><span>HL ACTIVITY</span><strong>Configurações</strong></div>
          <button type="button" id="hlSettingsClose" aria-label="Fechar configurações">×</button>
        </div>
        <div class="hl-settings-body">
          <label class="hl-settings-field"><span>Modo da sala</span><select id="hlSettingsMode"><option value="normal">Normal</option><option value="focus">Foco</option><option value="cinema">Cinema</option><option value="social">Social</option></select></label>
          <label class="hl-settings-field"><span>Qualidade</span><select id="hlSettingsQuality"><option value="auto">Auto</option><option value="720p30">720p • 30 FPS</option><option value="720p60">720p • 60 FPS</option><option value="1080p30">1080p • 30 FPS</option><option value="1080p60">1080p • 60 FPS</option></select></label>
          <button type="button" class="hl-settings-row" id="hlSettingsAudio"><span>🎙</span><div><strong>Áudio e voz</strong><small>Microfone, saída e push-to-talk</small></div><b>›</b></button>
          <label class="hl-settings-toggle"><span><strong>Reduzir animações</strong><small>Interface mais leve</small></span><input id="hlSettingsMotion" type="checkbox"></label>
          <div class="hl-settings-status"><span class="hl-settings-status-dot"></span><div><strong id="hlSettingsStatusText">Conectando...</strong><small>Estado da conexão em tempo real</small></div></div>
        </div>
      </section>

      <div class="hl-social-dock" aria-label="Controles sociais HL">
        <button class="hl-social-action" data-open="chat" title="Chat" aria-label="Abrir chat"><span aria-hidden="true">💬</span></button>
        <button class="hl-social-action" id="hlVoiceQuick" data-open="voice" title="Voz" aria-label="Abrir voz"><span aria-hidden="true">🎙</span></button>
        <button class="hl-social-action" data-open="sounds" title="Sons" aria-label="Abrir soundboard"><span aria-hidden="true">♫</span></button>
        <button class="hl-social-action" id="hlReactionQuick" title="Reações" aria-label="Abrir reações"><span aria-hidden="true">🔥</span></button>
        <button class="hl-social-action" id="hlSettingsQuick" title="Configurações" aria-label="Abrir configurações"><span aria-hidden="true">⚙</span></button>
        <button class="hl-social-action" id="hlModeQuick" title="Mais ações" aria-label="Abrir mais ações"><span aria-hidden="true">•••</span></button>
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
          <div class="hl-sound-hero">
            <div class="hl-sound-hero-copy">
              <span class="hl-sound-kicker">SOUNDBOARD HL</span>
              <div class="hl-section-title">Sons da sala</div>
              <div class="hl-section-subtitle">Ouça primeiro ou compartilhe com todo mundo.</div>
            </div>
            <div class="hl-sound-head-actions">
              <button class="hl-sound-config" id="hlSoundConfig" type="button" hidden aria-expanded="false" aria-controls="hlSoundPolicyWrap"><span aria-hidden="true">⚙</span><span>Configurar</span></button>
              <button class="hl-sound-add" id="hlSoundAdd" type="button" disabled><span aria-hidden="true">＋</span><span>Adicionar som</span></button>
            </div>
          </div>

          <div class="hl-sound-policy hl-sound-settings-panel" id="hlSoundPolicyWrap" hidden>
            <div class="hl-sound-settings-head">
              <div><strong>Configurações do Soundboard</strong><small>Defina quem pode tocar e adicionar sons nesta sala.</small></div>
              <button type="button" id="hlSoundSettingsClose" aria-label="Fechar configurações">×</button>
            </div>
            <div class="hl-sound-settings-grid">
              <label><span>Quem pode tocar</span>
                <select id="hlSoundPolicy" aria-label="Permissão do soundboard">
                  <option value="everyone">Todos podem usar</option>
                  <option value="moderators">Host e moderadores</option>
                  <option value="hostOnly">Somente host</option>
                  <option value="disabled">Desativado</option>
                </select>
              </label>
              <label><span>Quem pode adicionar</span>
                <select id="hlSoundUploadPolicy" aria-label="Permissão para adicionar sons">
                  <option value="everyone">Todos podem adicionar</option>
                  <option value="moderators">Host e moderadores</option>
                  <option value="hostOnly">Somente host</option>
                  <option value="disabled">Uploads desativados</option>
                </select>
              </label>
            </div>
          </div>

          <div class="hl-sound-library-tools">
            <label class="hl-sound-search"><span aria-hidden="true">⌕</span><input id="hlSoundSearch" type="search" maxlength="40" placeholder="Buscar som" autocomplete="off" aria-label="Buscar sons"></label>
            <div class="hl-sound-filters" id="hlSoundFilters" aria-label="Categorias de sons">
              <button type="button" data-sound-filter="all" class="is-active">Todos</button>
              <button type="button" data-sound-filter="favorites">★ Favoritos</button>
              <button type="button" data-sound-filter="custom">Meus sons</button>
              <button type="button" data-sound-filter="recent">Recentes</button>
            </div>
          </div>

          <div class="hl-sound-toolbar">
            <label class="hl-sound-volume-wrap">
              <span class="hl-sound-volume-label">Volume</span>
              <input id="hlSoundVolume" type="range" min="0" max="1" step="0.05" aria-label="Volume dos sons">
              <output id="hlSoundVolumeValue">72%</output>
            </label>
            <button class="hl-sound-stop" id="hlSoundStop" type="button"><span aria-hidden="true">■</span><span>Parar</span></button>
          </div>
          <div class="hl-sound-grid" id="hlSoundGrid"></div>
          <p class="hl-sound-help"><strong>Ouvir aqui</strong> é privado. <strong>Na sala</strong> compartilha com os participantes autorizados. Sons personalizados duram enquanto a sala estiver ativa.</p>
        </div>
      </section>

      <div class="hl-sound-modal" id="hlSoundModal" hidden>
        <button class="hl-sound-modal-backdrop" id="hlSoundModalBackdrop" type="button" aria-label="Fechar adicionar som"></button>
        <section class="hl-sound-modal-card" role="dialog" aria-modal="true" aria-labelledby="hlSoundModalTitle">
          <div class="hl-sound-modal-head">
            <div><span class="hl-modal-kicker">SOUNDBOARD HL</span><h3 id="hlSoundModalTitle">Adicionar som</h3></div>
            <button type="button" class="hl-sound-modal-close" id="hlSoundModalClose" aria-label="Fechar">×</button>
          </div>
          <div class="hl-sound-upload-drop" id="hlSoundDrop">
            <input id="hlSoundFile" type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a" hidden>
            <div class="hl-upload-icon" aria-hidden="true">♫</div>
            <strong>Escolha um áudio</strong>
            <span>MP3, WAV, OGG, WebM ou M4A • você recorta até 15 segundos</span>
            <button type="button" id="hlSoundChooseFile">Selecionar arquivo</button>
          </div>
          <div class="hl-sound-editor" id="hlSoundEditor" hidden>
            <div class="hl-sound-editor-meta"><strong id="hlSoundFileName">Áudio selecionado</strong><span id="hlSoundFileInfo"></span></div>
            <div class="hl-sound-trim-row">
              <label><span>Início</span><input id="hlSoundStart" type="range" min="0" max="0" step="0.1" value="0"><b id="hlSoundStartLabel">0.0s</b></label>
              <label><span>Duração</span><input id="hlSoundDuration" type="range" min="0.2" max="15" step="0.1" value="5"><b id="hlSoundDurationLabel">5.0s</b></label>
            </div>
            <div class="hl-sound-editor-actions"><button type="button" id="hlSoundPreview">▶ Prévia do trecho</button><button type="button" id="hlSoundPreviewStop">■ Parar</button></div>
            <div class="hl-sound-fields">
              <label><span>Nome</span><input id="hlSoundName" maxlength="40" placeholder="Ex.: Risada"></label>
              <label><span>Categoria</span><select id="hlSoundCategory"><option>Memes</option><option>Reações</option><option>Vitória</option><option>Falha</option><option>Suspense</option><option>Outros</option></select></label>
              <label><span>Emoji</span><input id="hlSoundEmoji" maxlength="8" value="🔊" aria-label="Emoji do som"></label>
            </div>
            <div class="hl-upload-security"><span aria-hidden="true">🔒</span><p>O trecho é convertido no seu navegador para WAV curto e o servidor valida formato, duração e tamanho novamente antes de aceitar.</p></div>
            <div class="hl-sound-modal-actions"><button type="button" id="hlSoundCancel">Cancelar</button><button type="button" class="is-primary" id="hlSoundUpload">Adicionar à sala</button></div>
          </div>
        </section>
      </div>`;

    document.body.insertAdjacentHTML("beforeend", html);

    // Portal único para popovers. Mantém Configurações/Mais/Reações fora
    // de qualquer stacking context do palco, footer ou painel social.
    let overlayRoot = document.getElementById("hlUiOverlays");
    if (!overlayRoot) {
        overlayRoot = document.createElement("div");
        overlayRoot.id = "hlUiOverlays";
        overlayRoot.className = "hl-ui-overlays";
        document.body.appendChild(overlayRoot);
    }
    ["hlReactionPicker", "hlMoreMenu", "hlSettingsPanel"].forEach(id => {
        const el = document.getElementById(id);
        if (el) overlayRoot.appendChild(el);
    });

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
    const soundUploadPolicy = document.getElementById("hlSoundUploadPolicy");
    const soundConfig = document.getElementById("hlSoundConfig");
    const soundSettingsClose = document.getElementById("hlSoundSettingsClose");
    const soundAdd = document.getElementById("hlSoundAdd");
    const soundSearch = document.getElementById("hlSoundSearch");
    const soundFilters = document.getElementById("hlSoundFilters");
    const soundModal = document.getElementById("hlSoundModal");
    const soundFile = document.getElementById("hlSoundFile");
    const soundEditor = document.getElementById("hlSoundEditor");
    const soundDrop = document.getElementById("hlSoundDrop");
    const soundStart = document.getElementById("hlSoundStart");
    const soundDuration = document.getElementById("hlSoundDuration");
    const connectionPill = document.getElementById("status");

    const stageEl = document.getElementById("stage");
    let reactionLayer = null;
    const syncReactionLayer = () => {
        if (!stageEl || !reactionLayer) return;
        const rect = stageEl.getBoundingClientRect();
        reactionLayer.style.left = `${Math.max(0, rect.left)}px`;
        reactionLayer.style.top = `${Math.max(0, rect.top)}px`;
        reactionLayer.style.width = `${Math.max(0, rect.width)}px`;
        reactionLayer.style.height = `${Math.max(0, rect.height)}px`;
    };
    if (stageEl) {
        reactionLayer = document.createElement("div");
        reactionLayer.id = "hlFloatingReactions";
        reactionLayer.className = "hl-floating-reactions";
        document.body.appendChild(reactionLayer);
        requestAnimationFrame(syncReactionLayer);
        window.addEventListener("resize", syncReactionLayer, { passive: true });
        document.addEventListener("scroll", syncReactionLayer, true);
        if (typeof ResizeObserver === "function") {
            const observer = new ResizeObserver(syncReactionLayer);
            observer.observe(stageEl);
        }
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
            state.soundUploadPolicy = result.soundUploadPolicy || "everyone";
            syncCustomSounds(result.customSounds || []);
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
        state.soundUploadPolicy = data.soundUploadPolicy || state.soundUploadPolicy;
        state.apiToken = data.apiToken || state.apiToken;
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
        const isHost = state.role === "host";
        if (soundConfig) soundConfig.hidden = !isHost;
        if (soundPolicyWrap && !isHost) soundPolicyWrap.hidden = true;
        soundPolicy.value = state.soundPolicy;
        if (soundUploadPolicy) soundUploadPolicy.value = state.soundUploadPolicy;
        const canUpload = canUploadSoundLocally();
        if (soundAdd) {
            soundAdd.disabled = !canUpload;
            soundAdd.title = canUpload ? "Adicionar som personalizado" : "O host restringiu novos sons";
        }
    }

    function setSoundSettings(open) {
        if (!soundPolicyWrap || state.role !== "host") return;
        soundPolicyWrap.hidden = !open;
        soundConfig?.classList.toggle("is-active", open);
        soundConfig?.setAttribute("aria-expanded", open ? "true" : "false");
    }

    soundConfig?.addEventListener("click", () => setSoundSettings(soundPolicyWrap?.hidden));
    soundSettingsClose?.addEventListener("click", () => setSoundSettings(false));

    soundPolicy.addEventListener("change", () => {
        socket.emit("moderation:sound-policy", { policy: soundPolicy.value }, result => {
            if (!result?.success) toast(result?.message || "Não foi possível alterar.");
        });
    });
    socket.on("sound:policy", data => { state.soundPolicy = data.policy; updateHostUI(); toast("Permissão do soundboard atualizada."); });

    soundUploadPolicy?.addEventListener("change", () => {
        socket.emit("moderation:sound-upload-policy", { policy: soundUploadPolicy.value }, result => {
            if (!result?.success) toast(result?.message || "Não foi possível alterar uploads.");
        });
    });
    socket.on("sound:upload-policy", data => { state.soundUploadPolicy = data.policy; updateHostUI(); toast("Permissão de novos sons atualizada."); });

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
                startLocalSpeechDetector(state.voiceStream);
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
            const analyser = context.createAnalyser(); analyser.fftSize = 128; source.connect(analyser);
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
                    record.speaking = speaking; record.lastEmit = now;
                    if (socket.connected) socket.emit("voice:speaking", { speaking });
                }
                record.raf = requestAnimationFrame(tick);
            };
            tick();
        } catch {}
    }

    async function joinVoice() {
        if (state.voiceJoined) return;
        try {
            state.voiceStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: state.selectedMicId ? { exact: state.selectedMicId } : undefined, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
            startLocalSpeechDetector(state.voiceStream);
            state.voiceJoined = true;
            state.muted = sessionStorage.getItem("hl_prejoin_muted") === "1";
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
        stopLocalSpeechDetector();
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
    const soundById = new Map(soundCatalog.map(([id, name, category, emoji, url]) => [id, {
        id, name, category, emoji, url, custom: false, ownerId: null, ownerName: "HL", duration: null
    }]));
    let soundEditorBuffer = null;
    let soundPreviewSource = null;
    let soundPreviewContext = null;

    for (const [, , , , file] of soundCatalog) {
        const preload = new Audio();
        preload.preload = "metadata";
        preload.src = file;
    }

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
        localStorage.setItem("hl_sound_recent", JSON.stringify(state.recentSounds));
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
            const preview = tool("▶ Ouvir", () => playSound(item.id, true));
            preview.title = "Ouvir só aqui";
            preview.dataset.soundAction = "preview";
            const all = tool("📢 Na sala", () => sendSharedSound(item.id));
            all.title = "Tocar para os participantes autorizados";
            all.dataset.soundAction = "room";
            actions.append(preview, all);

            if (item.custom && (item.ownerId === socket.id || state.role === "host" || state.role === "moderator")) {
                const edit = tool("Editar", () => editCustomSound(item.id));
                const duplicate = tool("Duplicar", () => duplicateCustomSound(item.id));
                const remove = tool("Excluir", () => deleteCustomSound(item.id));
                edit.classList.add("is-secondary");
                duplicate.classList.add("is-secondary");
                remove.classList.add("is-danger");
                actions.append(edit, duplicate, remove);
            }

            card.append(top, actions);
            grid.appendChild(card);
        }
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

    socket.on("sound:play", data => {
        if (!data?.soundId || !soundById.has(data.soundId)) return;
        playSound(data.soundId, false);
        if (data.userId !== socket.id) toast(`${data.name || "Alguém"} tocou ${soundById.get(data.soundId)?.name || "um efeito"}.`);
    });
    socket.on("sound:stop", () => stopAllSounds());
    socket.on("sound:catalog-add", item => {
        if (!item?.id || !item?.url) return;
        soundById.set(item.id, { ...item, name: String(item.name || "Som personalizado"), category: String(item.category || "Outros"), emoji: String(item.emoji || "🔊"), custom: true });
        renderSoundGrid();
        if (item.ownerId !== socket.id) toast(`${item.ownerName || "Alguém"} adicionou um som.`);
    });
    socket.on("sound:catalog-update", item => {
        if (!item?.id || !item?.url) return;
        soundById.set(item.id, { ...item, name: String(item.name || "Som personalizado"), category: String(item.category || "Outros"), emoji: String(item.emoji || "🔊"), custom: true });
        renderSoundGrid();
    });
    socket.on("sound:catalog-remove", data => {
        if (!data?.id) return;
        soundById.delete(data.id);
        state.soundFavorites.delete(data.id);
        renderSoundGrid();
    });

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

    // Reactions / more -------------------------------------
    const reactionQuick = document.getElementById("hlReactionQuick");
    const reactionPicker = document.getElementById("hlReactionPicker");
    const moreQuick = document.getElementById("hlModeQuick");
    const moreMenu = document.getElementById("hlMoreMenu");
    const settingsQuick = document.getElementById("hlSettingsQuick");
    const settingsPanel = document.getElementById("hlSettingsPanel");
    const settingsClose = document.getElementById("hlSettingsClose");
    const settingsMode = document.getElementById("hlSettingsMode");
    const settingsQuality = document.getElementById("hlSettingsQuality");
    const settingsMotion = document.getElementById("hlSettingsMotion");
    const settingsAudio = document.getElementById("hlSettingsAudio");
    const settingsStatusText = document.getElementById("hlSettingsStatusText");

    const applyRoomMode = mode => {
        if (!modes.includes(mode)) mode = "normal";
        document.body.classList.remove(...modes.map(m => `hl-mode-${m}`));
        if (mode !== "normal") document.body.classList.add(`hl-mode-${mode}`);
        state.modeIndex = Math.max(0, modes.indexOf(mode));
        if (settingsMode) settingsMode.value = mode;
    };

    const closeSettingsPanel = () => {
        if (!settingsPanel) return;
        settingsPanel.hidden = true;
        settingsQuick?.classList.remove("is-active");
        settingsQuick?.setAttribute("aria-expanded", "false");
    };

    const closeReactionPicker = () => {
        if (!reactionPicker) return;
        reactionPicker.hidden = true;
        state.reactionPickerOpen = false;
        reactionQuick?.classList.remove("is-active");
    };

    const closeMoreMenu = () => {
        if (!moreMenu) return;
        moreMenu.hidden = true;
        moreQuick?.classList.remove("is-active");
        moreQuick?.setAttribute("aria-expanded", "false");
    };

    function showFloatingReaction(emoji, reactionId = "") {
        if (!emoji) return;
        syncReactionLayer();
        if (reactionId) {
            if (state.seenReactionIds.has(reactionId)) return;
            state.seenReactionIds.add(reactionId);
            if (state.seenReactionIds.size > 80) {
                const first = state.seenReactionIds.values().next().value;
                state.seenReactionIds.delete(first);
            }
        }
        const host = document.getElementById("hlFloatingReactions");
        if (!host) return;
        while (host.childElementCount >= 3) host.firstElementChild?.remove();
        const el = document.createElement("div");
        el.className = "hl-floating-reaction hl-v10-reaction";
        el.textContent = emoji;
        el.style.setProperty("--hl-reaction-x", `${Math.floor(Math.random() * 22) - 6}px`);
        host.appendChild(el);
        setTimeout(() => el.remove(), 1450);
    }

    const openSettingsPanel = () => {
        closeReactionPicker();
        closeMoreMenu();
        if (!settingsPanel) return;
        settingsPanel.hidden = false;
        settingsQuick?.classList.add("is-active");
        settingsQuick?.setAttribute("aria-expanded", "true");
        const quality = document.getElementById("qualitySelect");
        if (settingsQuality && quality) settingsQuality.value = quality.value;
        if (settingsMode) settingsMode.value = modes[state.modeIndex] || "normal";
        if (settingsMotion) settingsMotion.checked = document.body.classList.contains("hl-reduce-motion");
        if (settingsStatusText && connectionPill) settingsStatusText.textContent = connectionPill.textContent || "Conectando...";
    };

    const toggleSettingsPanel = () => {
        if (!settingsPanel) return;
        if (settingsPanel.hidden) openSettingsPanel();
        else closeSettingsPanel();
    };

    const toggleReactionPicker = () => {
        closeMoreMenu();
        closeSettingsPanel();
        if (!reactionPicker) return;
        state.reactionPickerOpen = reactionPicker.hidden;
        reactionPicker.hidden = !state.reactionPickerOpen;
        reactionQuick?.classList.toggle("is-active", state.reactionPickerOpen);
    };

    const toggleMoreMenu = () => {
        closeReactionPicker();
        closeSettingsPanel();
        if (!moreMenu) return;
        const open = moreMenu.hidden;
        moreMenu.hidden = !open;
        moreQuick?.classList.toggle("is-active", open);
        moreQuick?.setAttribute("aria-expanded", open ? "true" : "false");
    };

    // Um único controlador para toda a dock. Ele continua funcionando mesmo
    // depois que a dock é movida/reorganizada no footer responsivo.
    dock?.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button || !dock.contains(button)) return;
        if (button === reactionQuick) {
            event.preventDefault();
            event.stopPropagation();
            toggleReactionPicker();
        } else if (button === moreQuick) {
            event.preventDefault();
            event.stopPropagation();
            toggleMoreMenu();
        } else if (button === settingsQuick) {
            event.preventDefault();
            event.stopPropagation();
            toggleSettingsPanel();
        }
    });

    reactionPicker?.querySelectorAll("[data-reaction]").forEach(button => button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        if (now - state.lastReactionAt < 500) return;
        state.lastReactionAt = now;
        const emoji = button.dataset.reaction;
        const reactionId = crypto?.randomUUID?.() || `${socket.id}-${now}-${Math.random().toString(36).slice(2)}`;
        showFloatingReaction(emoji, reactionId);
        socket.emit("reaction:send", { emoji, reactionId }, result => {
            if (result && result.success === false) toast(result.message || "Não foi possível enviar a reação.");
        });
        closeReactionPicker();
    }));

    moreQuick?.setAttribute("aria-expanded", "false");
    settingsQuick?.setAttribute("aria-expanded", "false");

    moreMenu?.querySelectorAll("[data-more-action]").forEach(button => button.addEventListener("click", async event => {
        event.stopPropagation();
        const action = button.dataset.moreAction;
        if (action === "settings") {
            openSettingsPanel();
            return;
        }
        if (["normal", "focus", "cinema", "social"].includes(action)) {
            applyRoomMode(action);
            toast(`Modo ${action}.`);
        } else if (action === "invite") {
            document.getElementById("copy")?.click();
        }
        closeMoreMenu();
    }));
    settingsClose?.addEventListener("click", closeSettingsPanel);
    settingsMode?.addEventListener("change", () => { applyRoomMode(settingsMode.value); toast(`Modo ${settingsMode.value}.`); });
    settingsQuality?.addEventListener("change", () => {
        const quality = document.getElementById("qualitySelect");
        if (!quality) return;
        quality.value = settingsQuality.value;
        quality.dispatchEvent(new Event("change", { bubbles: true }));
        toast(`Qualidade: ${settingsQuality.options[settingsQuality.selectedIndex]?.text || settingsQuality.value}`);
    });
    settingsMotion?.addEventListener("change", () => {
        document.body.classList.toggle("hl-reduce-motion", settingsMotion.checked);
        localStorage.setItem("hl_reduce_motion", settingsMotion.checked ? "1" : "0");
    });
    settingsAudio?.addEventListener("click", () => { closeSettingsPanel(); setTab("voice"); });
    if (localStorage.getItem("hl_reduce_motion") === "1") document.body.classList.add("hl-reduce-motion");

    document.addEventListener("click", event => {
        if (state.reactionPickerOpen && !reactionPicker?.contains(event.target) && event.target !== reactionQuick) closeReactionPicker();
        if (!moreMenu?.hidden && !moreMenu.contains(event.target) && event.target !== moreQuick) closeMoreMenu();
        if (!settingsPanel?.hidden && !settingsPanel.contains(event.target) && event.target !== settingsQuick) closeSettingsPanel();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") { closeReactionPicker(); closeMoreMenu(); closeSettingsPanel(); }
    });

    socket.on("reaction:show", data => {
        if (!data?.emoji) return;
        showFloatingReaction(data.emoji, data.reactionId || `${data.senderId || "remote"}-${data.at || Date.now()}`);
    });

    // Connection / reconnect --------------------------------
    socket.on("connect",()=>{ if (connectionPill) { connectionPill.textContent="Conectado"; connectionPill.dataset.state="online"; } if (settingsStatusText) settingsStatusText.textContent="Conectado"; if(state.voiceJoined && state.voiceStream){ state.voicePeers.forEach((_,id)=>closeVoicePeer(id)); socket.emit("voice:join",{},async result=>{ for(const peer of result?.peers||[]) await createVoiceOffer(peer.id); }); } });
    socket.on("disconnect",()=>{ if (connectionPill) { connectionPill.textContent="Reconectando…"; connectionPill.dataset.state="reconnecting"; } if (settingsStatusText) settingsStatusText.textContent="Reconectando…"; state.bootstrapped=false; state.voicePeers.forEach((_,id)=>closeVoicePeer(id)); });
    socket.on("connect_error",()=> { if (connectionPill) { connectionPill.textContent="Sem conexão"; connectionPill.dataset.state="offline"; } if (settingsStatusText) settingsStatusText.textContent="Sem conexão"; });
    socket.on("moderation:kicked",data=>{ toast(data?.message||"Você foi removido."); leaveVoice(false); setTimeout(()=>location.href="/",800); });

    socket.on("moderation:force-mute", () => {
        if (!state.voiceJoined) return;
        state.muted = true;
        state.voiceStream?.getAudioTracks?.().forEach(track => { track.enabled = false; });
        socket.emit("voice:state", { muted: true, deaf: state.deaf });
        updateVoiceButtons();
        toast("Seu microfone foi silenciado pela moderação.");
    });

    window.addEventListener("beforeunload",()=>{ try{ if(state.voiceJoined) socket.emit("voice:leave"); }catch{} state.voiceStream?.getTracks().forEach(t=>t.stop()); state.analysers.forEach(a=>a.context?.close().catch(()=>{})); });

    updateVoiceButtons();
})();
