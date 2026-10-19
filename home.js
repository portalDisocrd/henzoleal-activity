"use strict";

const nameInput = document.getElementById("name");
const roomInput = document.getElementById("roomCode");
const createButton = document.getElementById("create");
const joinButton = document.getElementById("join");
const feedback = document.getElementById("homeFeedback");
const avatarButtons = [...document.querySelectorAll(".avatar")];
const defaultAvatar = "😎";
const profileStorageKey = "leal_profile";

let selectedAvatar = defaultAvatar;
let activeAction = false;

function showFeedback(message, tone = "info") {
  feedback.textContent = message;
  feedback.dataset.tone = tone;
  feedback.hidden = !message;
}

function selectAvatar(button) {
  selectedAvatar = button.textContent.trim() || defaultAvatar;
  avatarButtons.forEach(avatar => {
    const selected = avatar === button;
    avatar.classList.toggle("selected", selected);
    avatar.setAttribute("aria-pressed", String(selected));
  });
}

function restoreProfile() {
  try {
    const profile = JSON.parse(sessionStorage.getItem(profileStorageKey) || "null");
    if (!profile || typeof profile.name !== "string") return;

    nameInput.value = profile.name.slice(0, 24);
    const savedAvatar = avatarButtons.find(button =>
      button.textContent.trim() === profile.avatar
    );
    if (savedAvatar) selectAvatar(savedAvatar);
  } catch (error) {
    console.warn("Não foi possível restaurar o perfil desta sessão.", error);
  }
}

function saveProfile() {
  const name = nameInput.value.trim();
  if (!name) {
    showFeedback("Digite seu nome para continuar.", "error");
    nameInput.focus();
    return false;
  }

  try {
    sessionStorage.setItem(profileStorageKey, JSON.stringify({
      name: name.slice(0, 24),
      avatar: selectedAvatar
    }));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar o perfil da sala.", error);
    showFeedback("O navegador não permitiu salvar seu perfil nesta sessão. Habilite o armazenamento e tente novamente.", "error");
    return false;
  }
}

function setBusy(isBusy, action = "") {
  activeAction = isBusy;
  [createButton, joinButton].forEach(button => {
    button.disabled = isBusy;
    button.setAttribute("aria-busy", String(isBusy));
  });
  createButton.querySelector("span:nth-child(2)").textContent =
    isBusy && action === "create"
      ? "Criando sala..."
      : "Criar nova sala";
  joinButton.querySelector("span:first-child").textContent =
    isBusy && action === "join"
      ? "Conectando..."
      : "Entrar na sala";
}

async function createRoom() {
  if (activeAction || !saveProfile()) return;

  setBusy(true, "create");
  showFeedback("Criando sua sala...");

  try {
    const response = await fetch("/api/rooms", { method: "POST" });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || "Não foi possível criar a sala.");
    }

    if (data.hostToken) {
      sessionStorage.setItem(`hl_host_token_${data.code}`, data.hostToken);
    }
    window.location.href = `/room/${encodeURIComponent(data.code)}`;
  } catch (error) {
    console.error("Falha ao criar uma sala.", error);
    showFeedback(error instanceof TypeError
      ? "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
      : error.message || "Não foi possível criar a sala.", "error");
  } finally {
    setBusy(false);
  }
}

async function joinRoom() {
  if (activeAction) return;

  const code = roomInput.value.trim().toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(code)) {
    showFeedback("Digite um código de sala válido com 8 caracteres.", "error");
    roomInput.focus();
    return;
  }
  if (!saveProfile()) return;

  setBusy(true, "join");
  showFeedback("Procurando a sala...");

  try {
    const response = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
    if (!response.ok) {
      showFeedback("Sala não encontrada. Confira o código e tente novamente.", "error");
      return;
    }
    window.location.href = `/room/${encodeURIComponent(code)}`;
  } catch (error) {
    console.error("Falha ao entrar na sala.", error);
    showFeedback("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.", "error");
  } finally {
    setBusy(false);
  }
}

avatarButtons.forEach(button => {
  button.addEventListener("click", () => {
    selectAvatar(button);
    showFeedback("");
  });
});

nameInput.addEventListener("input", () => showFeedback(""));
roomInput.addEventListener("input", () => {
  roomInput.value = roomInput.value.toUpperCase();
  showFeedback("");
});
roomInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    joinRoom();
  }
});
createButton.addEventListener("click", createRoom);
joinButton.addEventListener("click", joinRoom);

restoreProfile();
