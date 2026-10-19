(() => {
    "use strict";

    if (typeof socket === "undefined") return;

    document.body.classList.add("hl-social-ready");
    document.documentElement.dataset.hlSocialVersion = "12.0.7-foundation.7";

    const storedSoundVolume = localStorage.getItem("hl_sound_volume");
    const savedSoundVolume = storedSoundVolume === null ? 0.72 : Number(storedSoundVolume);

    const state = {
        bootstrapped: false,
        role: "member",
        hostId: null,
        soundPolicy: "everyone",
        soundUploadPolicy: "everyone",
        apiToken: "",
        ownershipKey: "",
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
        soundFavorites: new Set(window.HLSoundboardModule?.loadStringArray?.("hl_sound_favorites") || []),
        recentSounds: window.HLSoundboardModule?.loadStringArray?.("hl_sound_recent") || [],
        soundSearch: "",
        soundCategory: "all",
        localSpeech: null
    };

    const modes = ["normal", "focus", "social", "cinema"];
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

        <div class="hl-social-view hl-voice-view" data-view="voice" role="tabpanel" hidden>
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

        <div class="hl-social-view hl-sound-view" data-view="sounds" role="tabpanel" hidden>
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
    window.HLConnectivity?.apply?.();

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

    const chatController = window.HLChatModule?.createChatController?.({
        socket, state, panel, chatList, chatInput, chatContext, typingEl,
        sendButton: document.getElementById("hlChatSend"),
        toast
    });

    function setTab(name) {
        const valid = new Set(["chat", "voice", "sounds"]);
        if (!valid.has(name)) name = "chat";
        panel.classList.add("is-open");
        document.body.classList.add("hl-social-panel-open");
        panel.querySelectorAll(".hl-social-tab").forEach(btn => {
            const active = btn.dataset.tab === name;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("aria-selected", active ? "true" : "false");
            btn.tabIndex = active ? 0 : -1;
        });
        panel.querySelectorAll(".hl-social-view").forEach(view => {
            const active = view.dataset.view === name;
            view.classList.toggle("is-active", active);
            view.hidden = !active;
            view.setAttribute("aria-hidden", active ? "false" : "true");
        });
        dock?.querySelectorAll(".hl-social-action[data-open]").forEach(btn => btn.classList.toggle("is-active", btn.dataset.open === name));
        if (name === "chat") {
            chatController?.clearUnread?.();
            setTimeout(() => chatController?.focus?.(), 80);
        }
        if (name === "voice") refreshAudioDevices();
        if (name === "sounds") soundboardController?.render?.();
    }

    dock?.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.open)));
    const socialTabs = Array.from(panel.querySelectorAll(".hl-social-tab"));
    socialTabs.forEach((btn, index) => {
        const view = panel.querySelector(`.hl-social-view[data-view="${btn.dataset.tab}"]`);
        btn.id ||= `hlSocialTab-${btn.dataset.tab}`;
        if (view) {
            view.id ||= `hlSocialView-${btn.dataset.tab}`;
            btn.setAttribute("aria-controls", view.id);
            view.setAttribute("aria-labelledby", btn.id);
        }
        btn.addEventListener("click", () => setTab(btn.dataset.tab));
        btn.addEventListener("keydown", event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            let next = index;
            if (event.key === "ArrowLeft") next = (index - 1 + socialTabs.length) % socialTabs.length;
            if (event.key === "ArrowRight") next = (index + 1) % socialTabs.length;
            if (event.key === "Home") next = 0;
            if (event.key === "End") next = socialTabs.length - 1;
            const target = socialTabs[next];
            setTab(target.dataset.tab);
            target.focus();
        });
    });
    function closeSocialPanel() {
        panel.classList.remove("is-open");
        document.body.classList.remove("hl-social-panel-open");
        document.querySelectorAll(".hl-social-action[data-open]").forEach(btn => btn.classList.remove("is-active"));
    }
    document.getElementById("hlSocialClose").addEventListener("click", closeSocialPanel);
    document.getElementById("hlSocialBackdrop")?.addEventListener("click", closeSocialPanel);

    // Estado inicial determinístico: apenas Chat existe visualmente até o usuário trocar de aba.
    panel.querySelectorAll(".hl-social-view").forEach(view => {
        const active = view.dataset.view === "chat";
        view.hidden = !active;
        view.classList.toggle("is-active", active);
        view.setAttribute("aria-hidden", active ? "false" : "true");
    });

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

    function bootstrapSocial() {
        if (state.bootstrapped || !state.participants.has(socket.id)) return;
        state.bootstrapped = true;
        socket.emit("social:state", result => {
            if (!result?.success) return;
            state.role = result.role || "member";
            state.hostId = result.hostId || null;
            state.soundPolicy = result.soundboardPolicy || "everyone";
            state.soundUploadPolicy = result.soundUploadPolicy || "everyone";
            soundboardController?.syncCustomSounds?.(result.customSounds || []);
            updateHostUI();
        });
        socket.emit("chat:history", result => {
            if (!result?.success) return;
            chatController?.loadHistory?.(result.messages || []);
        });
    }

    socket.on("room:joined", data => {
        state.role = data.role || state.role;
        state.hostId = data.hostId || state.hostId;
        state.soundPolicy = data.soundboardPolicy || state.soundPolicy;
        state.soundUploadPolicy = data.soundUploadPolicy || state.soundUploadPolicy;
        state.apiToken = data.apiToken || state.apiToken;
        state.ownershipKey = data.ownershipKey || state.ownershipKey;
        updateHostUI();
        voiceController?.handleRoomJoined?.();
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
    socket.on("room:host-reconnecting", data => {
        const seconds = Math.max(1, Math.ceil(Number(data?.graceMs || 8000) / 1000));
        toast(`Host reconectando… aguardando até ${seconds}s antes de transferir a sala.`);
    });

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
        const canUpload = soundboardController?.canUpload?.() ?? false;
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
    const voiceController = window.createHLVoiceController?.({
        state, socket, toast,
        openChat: () => setTab("chat"),
        elements: {
            voiceList, voiceJoin, voiceMute, voiceDeaf, voicePtt, voiceLeave,
            voiceMuteState, voiceDeafState, voicePttState, voiceCount,
            micSelect, outputSelect, outputWrap,
            voiceQuick: document.getElementById("hlVoiceQuick")
        }
    });

    const refreshAudioDevices = () => voiceController?.refreshAudioDevices?.();
    const renderVoiceList = () => voiceController?.renderList?.();
    const leaveVoice = emit => voiceController?.leave?.(emit);

    // Soundboard --------------------------------------------
    const soundboardController = window.HLSoundboardController?.create?.({ socket, state, roomCode, toast });

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

    const closeMoreMenu = () => {
        if (!moreMenu) return;
        moreMenu.hidden = true;
        moreQuick?.classList.remove("is-active");
        moreQuick?.setAttribute("aria-expanded", "false");
    };

    const openSettingsPanel = () => {
        reactionController?.close?.();
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

    const toggleMoreMenu = () => {
        reactionController?.close?.();
        closeSettingsPanel();
        if (!moreMenu) return;
        const open = moreMenu.hidden;
        moreMenu.hidden = !open;
        moreQuick?.classList.toggle("is-active", open);
        moreQuick?.setAttribute("aria-expanded", open ? "true" : "false");
    };

    const reactionController = window.HLReactionsModule?.createReactionController?.({
        socket,
        stage: stageEl,
        picker: reactionPicker,
        trigger: reactionQuick,
        toast,
        beforeOpen: () => { closeMoreMenu(); closeSettingsPanel(); }
    });

    // Um único controlador para toda a dock. Ele continua funcionando mesmo
    // depois que a dock é movida/reorganizada no footer responsivo.
    dock?.addEventListener("click", event => {
        const button = event.target.closest("button");
        if (!button || !dock.contains(button)) return;
        if (button === reactionQuick) {
            event.preventDefault();
            event.stopPropagation();
            reactionController?.toggle?.();
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
        if (!moreMenu?.hidden && !moreMenu.contains(event.target) && event.target !== moreQuick) closeMoreMenu();
        if (!settingsPanel?.hidden && !settingsPanel.contains(event.target) && event.target !== settingsQuick) closeSettingsPanel();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") { reactionController?.close?.(); closeMoreMenu(); closeSettingsPanel(); }
    });

    // Connection / reconnect --------------------------------
    socket.on("connect",()=>{ if (connectionPill) { connectionPill.textContent="Conectado"; connectionPill.dataset.state="online"; } if (settingsStatusText) settingsStatusText.textContent="Conectado"; voiceController?.handleSocketConnected?.(); });
    socket.on("disconnect",()=>{ if (connectionPill) { connectionPill.textContent="Reconectando…"; connectionPill.dataset.state="reconnecting"; } if (settingsStatusText) settingsStatusText.textContent="Reconectando…"; state.bootstrapped=false; voiceController?.handleDisconnect?.(); });
    socket.on("connect_error",()=> { if (connectionPill) { connectionPill.textContent="Sem conexão"; connectionPill.dataset.state="offline"; } if (settingsStatusText) settingsStatusText.textContent="Sem conexão"; voiceController?.handleConnectError?.(); });
    socket.on("moderation:kicked",data=>{ toast(data?.message||"Você foi removido."); leaveVoice(false); setTimeout(()=>location.href="/",800); });

    window.addEventListener("pagehide", () => {
        try { soundboardController?.stopAll?.(); } catch {}
        try { state.voiceStream?.getTracks?.().forEach(track => track.stop()); } catch {}
    }, { once: true });

    socket.on("moderation:force-mute", () => voiceController?.forceMute?.());

    window.addEventListener("beforeunload",()=>{
        voiceController?.destroy?.();
        reactionController?.destroy?.();
        chatController?.destroy?.();
        soundboardController?.destroy?.();
    }, { once: true });
})();
