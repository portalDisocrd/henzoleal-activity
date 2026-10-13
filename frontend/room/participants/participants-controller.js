(() => {
  "use strict";

  function create(options = {}) {
    const container = options.container;
    const state = new Map();
    let destroyed = false;

    function clearContainer() {
      if (container) container.textContent = "";
    }

    function render() {
      if (destroyed || !container) return;
      clearContainer();

      state.forEach(user => {
        const card = document.createElement("div");
        card.className = "person";

        if (user.streaming) card.classList.add("streaming");
        if (user.spotlighted) card.classList.add("spotlighted");

        card.dataset.userId = user.id || "";
        card.dataset.role = user.role || "member";

        const avatar = document.createElement("div");
        avatar.className = "avatar";

        if (typeof options.renderAvatar === "function") {
          options.renderAvatar(avatar, user.avatar);
        } else {
          avatar.textContent = user.avatar || "😎";
        }

        const info = document.createElement("div");
        info.className = "person-info";

        const name = document.createElement("div");
        name.className = "person-name";

        const ownId = typeof options.getSocketId === "function"
          ? options.getSocketId()
          : null;

        name.textContent = String(user.name || "Participante") +
          (user.id === ownId ? " (você)" : "");

        const status = document.createElement("div");
        status.className = "person-status";

        const activityLabel = user.streaming
          ? "AO VIVO"
          : (user.activity || (
              user.voiceJoined
                ? "No voz"
                : (user.status === "afk" ? "Ausente" : "Online")
            ));

        status.textContent = `● ${activityLabel}`;
        status.dataset.state = user.status === "afk"
          ? "afk"
          : (user.streaming ? "live" : "online");

        info.appendChild(name);
        info.appendChild(status);
        card.appendChild(avatar);
        card.appendChild(info);

        if (user.streaming) {
          card.addEventListener("click", () => {
            const hasStream = typeof options.hasStream === "function"
              ? options.hasStream(user.id)
              : true;

            if (hasStream && typeof options.onSelectStream === "function") {
              options.onSelectStream(user.id);
            }
          });
        }

        container.appendChild(card);
      });

      if (state.size === 0 && typeof options.onEmpty === "function") {
        options.onEmpty(container);
      }
    }

    function replace(list) {
      if (destroyed) return state;
      state.clear();

      for (const user of Array.isArray(list) ? list : []) {
        if (!user || !user.id) continue;
        state.set(user.id, user);
      }

      render();
      return state;
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      state.clear();
      clearContainer();
    }

    return Object.freeze({
      state,
      replace,
      render,
      destroy
    });
  }

  window.HLParticipantsController = Object.freeze({
    version: window.HL_APP_VERSION || "unknown",
    create
  });
})();
