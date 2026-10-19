(() => {
  "use strict";

  const BUILTIN_SOUNDS = Object.freeze([
    Object.freeze({ id: "airhorn", name: "Air Horn", category: "Impacto", emoji: "📣", url: "/sounds/airhorn.wav", custom: false, ownerId: null, ownerName: "HL", duration: null }),
    Object.freeze({ id: "victory", name: "Vitória", category: "Comemoração", emoji: "🏆", url: "/sounds/victory.wav", custom: false, ownerId: null, ownerName: "HL", duration: null }),
    Object.freeze({ id: "fail", name: "Falha", category: "Derrota", emoji: "📉", url: "/sounds/fail.wav", custom: false, ownerId: null, ownerName: "HL", duration: null }),
    Object.freeze({ id: "bonk", name: "Bonk", category: "Reação", emoji: "🔨", url: "/sounds/bonk.wav", custom: false, ownerId: null, ownerName: "HL", duration: null }),
    Object.freeze({ id: "pop", name: "Pop", category: "Reação rápida", emoji: "🫧", url: "/sounds/pop.wav", custom: false, ownerId: null, ownerName: "HL", duration: null }),
    Object.freeze({ id: "suspense", name: "Suspense", category: "Tensão", emoji: "🎬", url: "/sounds/suspense.wav", custom: false, ownerId: null, ownerName: "HL", duration: null })
  ]);

  function loadStringArray(key, limit = 40) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.filter(item => typeof item === "string").slice(0, limit) : [];
    } catch {
      return [];
    }
  }

  function saveStringArray(key, values, limit = 40) {
    const safe = Array.from(new Set(Array.from(values || []).filter(item => typeof item === "string"))).slice(0, limit);
    localStorage.setItem(key, JSON.stringify(safe));
    return safe;
  }

  function createCatalog() {
    return new Map(BUILTIN_SOUNDS.map(item => [item.id, { ...item }]));
  }

  function createActionButton(label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function preloadBuiltins() {
    for (const item of BUILTIN_SOUNDS) {
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = item.url;
    }
  }

  window.HLSoundboardModule = Object.freeze({
    version: "12.0.7-foundation.7",
    maxVisibleColumns: Object.freeze({ desktop: 2, mobile: 1 }),
    BUILTIN_SOUNDS,
    loadStringArray,
    saveStringArray,
    createCatalog,
    preloadBuiltins,
    createActionButton
  });
})();
