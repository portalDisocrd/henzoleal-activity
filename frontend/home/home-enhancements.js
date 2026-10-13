(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const joinButton = $("join");
  if (!joinButton) return;

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
      id = (crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`)
        .replace(/[^a-zA-Z0-9_-]/g, "");
      localStorage.setItem("hl_client_id", id);
    }
    return id;
  }

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
      toast(
        result?.success ? "HL Activity instalado como app." : "Instalação cancelada ou indisponível.",
        result?.success ? "success" : "info"
      );
    });
  }

  function renderRecentRooms() {
    const panel = document.querySelector(".panel");
    if (!panel) return;

    let recent = [];
    try { recent = JSON.parse(localStorage.getItem("hl_recent_rooms") || "[]"); } catch {}
    if (!Array.isArray(recent) || recent.length === 0) return;

    let favoriteList = [];
    try { favoriteList = JSON.parse(localStorage.getItem("hl_favorite_rooms") || "[]"); } catch {}
    const favorites = new Set(Array.isArray(favoriteList) ? favoriteList : []);

    recent.sort((a, b) =>
      (Number(favorites.has(b.code)) - Number(favorites.has(a.code))) ||
      ((b.lastVisited || 0) - (a.lastVisited || 0))
    );

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
      button.addEventListener("click", () => {
        $("roomCode").value = item.code;
        joinButton.click();
      });
      list.appendChild(button);
    });

    block.querySelector(".hl-recent-head button").addEventListener("click", () => {
      localStorage.removeItem("hl_recent_rooms");
      block.remove();
    });

    panel.appendChild(block);
  }

  ensureClientId();
  injectInstall();
  renderRecentRooms();
})();
