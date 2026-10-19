(() => {
  "use strict";

  function createChatController(options = {}) {
    const { socket, state, panel, chatList, chatInput, chatContext, typingEl, sendButton, toast = () => {} } = options;
    if (!socket || !state || !panel || !chatList || !chatInput || !chatContext || !typingEl || !sendButton) return null;

    const typingUsers = new Map();
    const typingTimers = new Map();
    const socketHandlers = [];
    const domCleanups = [];

    function on(target, type, fn, opts) {
      target?.addEventListener?.(type, fn, opts);
      domCleanups.push(() => target?.removeEventListener?.(type, fn, opts));
    }
    function onSocket(event, fn) {
      socket.on(event, fn);
      socketHandlers.push([event, fn]);
    }

    function formatTime(value) {
      try { return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
      catch { return ""; }
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
      } else badge?.remove();
    }

    function tool(label, fn) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.addEventListener("click", fn, { once: true });
      return btn;
    }

    function updateContext() {
      const span = chatContext.querySelector("span");
      if (!span) return;
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

    function isMine(message) {
      if (!message) return false;
      if (message.authorKey && state.ownershipKey) return message.authorKey === state.ownershipKey;
      return message.authorId === socket.id;
    }

    function buildMessage(message) {
      const mine = isMine(message);
      const box = document.createElement("div");
      box.className = "hl-chat-message" + (mine ? " is-mine" : "");
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
      Object.entries(message.reactions || {}).forEach(([emoji, count]) => {
        if (!count) return;
        const badge = document.createElement("span");
        badge.className = "hl-chat-reaction";
        badge.textContent = `${emoji} ${count}`;
        reactionSummary.appendChild(badge);
      });
      if (reactionSummary.childNodes.length) box.appendChild(reactionSummary);

      const tools = document.createElement("div");
      tools.className = "hl-chat-tools";
      tools.appendChild(tool("Responder", () => {
        state.replyTo = message.id;
        state.editId = null;
        updateContext();
        chatInput.focus();
      }));
      ["👍", "😂", "❤️", "👏", "🔥"].forEach(emoji => tools.appendChild(tool(emoji, () => socket.emit("chat:react", { id: message.id, emoji }, result => {
        if (!result?.success) toast(result?.message || "Não foi possível reagir.");
      }))));
      if (mine) {
        tools.appendChild(tool("Editar", () => {
          state.editId = message.id;
          state.replyTo = null;
          chatInput.value = message.text;
          updateContext();
          chatInput.focus();
        }));
        tools.appendChild(tool("Excluir", () => socket.emit("chat:delete", { id: message.id }, result => {
          if (!result?.success) toast(result?.message || "Não foi possível excluir.");
        })));
      } else if (state.role === "host" || state.role === "moderator") {
        tools.appendChild(tool("Excluir", () => socket.emit("chat:delete", { id: message.id }, result => {
          if (!result?.success) toast(result?.message || "Não foi possível excluir.");
        })));
      }
      box.appendChild(tools);
      return box;
    }

    function render() {
      const shouldStick = chatList.scrollHeight - chatList.scrollTop - chatList.clientHeight < 80;
      chatList.textContent = "";
      const ordered = Array.from(state.messages.values()).sort((a, b) => a.createdAt - b.createdAt);
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

    function send() {
      const text = chatInput.value.trim();
      if (!text) return;
      if (navigator.onLine === false || !socket.connected) return toast("Reconecte à sala para enviar mensagens.");
      if (state.editId) {
        const id = state.editId;
        socket.emit("chat:edit", { id, text }, result => {
          if (!result?.success) return toast(result?.message || "Falha ao editar.");
          state.editId = null;
          chatInput.value = "";
          updateContext();
        });
        return;
      }
      socket.emit("chat:send", { text, replyTo: state.replyTo }, result => {
        if (!result?.success) return toast(result?.message || "Falha ao enviar.");
        chatInput.value = "";
        state.replyTo = null;
        updateContext();
        socket.emit("chat:typing", { typing: false });
      });
    }

    function renderTyping() {
      const names = Array.from(typingUsers.values());
      typingEl.textContent = names.length ? `${names.slice(0, 2).join(", ")} ${names.length === 1 ? "está" : "estão"} digitando…` : "";
    }

    function loadHistory(messages = []) {
      state.messages.clear();
      messages.forEach(message => state.messages.set(message.id, message));
      render();
      chatList.scrollTop = chatList.scrollHeight;
    }

    function clearUnread() {
      state.unreadChat = 0;
      updateUnread();
    }

    on(chatContext.querySelector("button"), "click", () => {
      state.replyTo = null;
      state.editId = null;
      chatInput.value = "";
      updateContext();
    });
    on(sendButton, "click", send);
    on(chatInput, "keydown", event => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send();
      }
    });
    on(chatInput, "input", () => {
      if (navigator.onLine === false) return;
      socket.emit("chat:typing", { typing: true });
      clearTimeout(state.typingTimer);
      state.typingTimer = setTimeout(() => socket.emit("chat:typing", { typing: false }), 1100);
    });

    onSocket("chat:typing", data => {
      if (!data?.userId) return;
      const oldTimer = typingTimers.get(data.userId);
      if (oldTimer) clearTimeout(oldTimer);
      typingTimers.delete(data.userId);
      if (data.typing) {
        typingUsers.set(data.userId, data.name || "Alguém");
        const timer = setTimeout(() => {
          typingTimers.delete(data.userId);
          typingUsers.delete(data.userId);
          renderTyping();
        }, 1800);
        typingTimers.set(data.userId, timer);
      } else {
        typingUsers.delete(data.userId);
      }
      renderTyping();
    });
    onSocket("chat:message", message => {
      state.messages.set(message.id, message);
      render();
      const chatVisible = panel.classList.contains("is-open") && panel.querySelector('.hl-social-tab[data-tab="chat"]')?.classList.contains("is-active");
      if (!chatVisible && !isMine(message)) {
        state.unreadChat += 1;
        updateUnread();
        toast(`${message.authorName}: ${message.text.slice(0, 55)}`);
      }
    });
    onSocket("chat:updated", message => { state.messages.set(message.id, message); render(); });
    onSocket("chat:deleted", data => { state.messages.delete(data.id); render(); });

    return {
      render,
      loadHistory,
      clearUnread,
      focus: () => chatInput.focus(),
      destroy() {
        clearTimeout(state.typingTimer);
        typingTimers.forEach(timer => clearTimeout(timer));
        typingTimers.clear();
        typingUsers.clear();
        domCleanups.splice(0).forEach(fn => fn());
        socketHandlers.splice(0).forEach(([event, fn]) => socket.off?.(event, fn));
      }
    };
  }

  window.HLChatModule = Object.freeze({ version: "12.0.7-foundation.8", createChatController });
})();
