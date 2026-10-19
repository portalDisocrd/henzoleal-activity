(() => {
  "use strict";

  function isRemoteAvatarUrl(value) {
    return typeof value === "string" &&
      /^https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\//i.test(value);
  }

  function renderAvatar(container, avatarValue, fallback = "😎") {
    if (!container) return;
    container.textContent = "";

    if (isRemoteAvatarUrl(avatarValue)) {
      const img = document.createElement("img");
      img.src = avatarValue;
      img.alt = "Avatar";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.style.borderRadius = "inherit";
      container.appendChild(img);
      return;
    }

    container.textContent = avatarValue || fallback;
  }

  function create(options = {}) {
    const overlay = options.overlay || document.getElementById("profileOverlay");
    const nameInput = options.nameInput || document.getElementById("profileName");
    const enterButton = options.enterButton || document.getElementById("enterRoom");
    const avatarButtons = Array.from(
      options.avatarButtons || document.querySelectorAll(".profile-avatar")
    );
    const storageKey = options.storageKey || "leal_profile";
    const maxNameLength = Number(options.maxNameLength || 24);

    let selectedAvatar = "😎";
    let savedProfile = null;
    let destroyed = false;
    let modalOpen = false;
    let previousFocus = null;

    function getFocusableElements() {
      if (!overlay) return [];
      return Array.from(overlay.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(element =>
        element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility !== "hidden"
      );
    }

    function containTabFocus(event) {
      if (event.key !== "Tab" || !modalOpen) return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (!overlay.contains(current)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && current === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function selectAvatar(value) {
      if (destroyed) return;
      selectedAvatar = value || "😎";
      avatarButtons.forEach(button => {
        const valueForButton = button.dataset.avatar || button.textContent.trim();
        button.classList.toggle("selected", valueForButton === selectedAvatar);
      });
    }

    function readSavedProfile() {
      try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed.name !== "string") return null;
        return {
          name: parsed.name.slice(0, maxNameLength),
          avatar: parsed.avatar || "😎"
        };
      } catch {
        return null;
      }
    }

    function restore() {
      if (destroyed) return null;

      savedProfile = readSavedProfile();
      if (!savedProfile) return null;

      if (nameInput) nameInput.value = savedProfile.name;
      selectAvatar(savedProfile.avatar);
      return { ...savedProfile };
    }

    function show() {
      if (destroyed || !overlay) return;
      if (!modalOpen) {
        previousFocus = document.activeElement;
        document.addEventListener("keydown", containTabFocus);
        modalOpen = true;
      }
      overlay.style.display = "flex";
      (nameInput || getFocusableElements()[0])?.focus();
    }

    function hide() {
      if (destroyed || !overlay) return;
      overlay.style.display = "none";
      if (modalOpen) {
        document.removeEventListener("keydown", containTabFocus);
        modalOpen = false;
      }
      if (previousFocus?.isConnected && previousFocus !== document.body && !overlay.contains(previousFocus)) {
        previousFocus.focus();
      }
      previousFocus = null;
    }

    function submit() {
      if (destroyed) return;

      const name = String(nameInput?.value || "").trim();
      if (!name) {
        alert("Digite seu nome.");
        nameInput?.focus?.();
        return;
      }

      const profile = {
        name: name.slice(0, maxNameLength),
        avatar: selectedAvatar
      };

      try {
        sessionStorage.setItem(storageKey, JSON.stringify(profile));
      } catch {}

      window.HLRoomEntry?.persistDevices?.();
      window.HLRoomEntry?.stop?.();
      hide();

      if (typeof options.onSubmit === "function") {
        options.onSubmit(profile);
      }
    }

    const avatarHandlers = new Map();
    avatarButtons.forEach(button => {
      const handler = () => {
        selectAvatar(button.dataset.avatar || button.textContent.trim());
      };
      avatarHandlers.set(button, handler);
      button.addEventListener("click", handler);
    });

    const enterHandler = () => submit();
    enterButton?.addEventListener("click", enterHandler);

    function open() {
      if (destroyed) return;
      show();
      restore();
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;

      avatarHandlers.forEach((handler, button) => {
        button.removeEventListener("click", handler);
      });
      avatarHandlers.clear();
      enterButton?.removeEventListener("click", enterHandler);
      document.removeEventListener("keydown", containTabFocus);
      modalOpen = false;
    }

    return Object.freeze({
      open,
      show,
      hide,
      restore,
      submit,
      destroy,
      getSelectedAvatar: () => selectedAvatar
    });
  }

  window.HLProfileController = Object.freeze({
    version: window.HL_APP_VERSION || "unknown",
    isRemoteAvatarUrl,
    renderAvatar,
    create
  });
})();
