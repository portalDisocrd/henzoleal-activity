const crypto = require("crypto");

const ALLOWED_REACTIONS = new Set(["👍", "😂", "❤️", "👏", "🔥"]);

function createChatEvents({ io, roomService, allowSocketEvent, normalizeText, updateParticipants }) {
    function safeMessage(message) {
        return {
            id: message.id,
            authorId: message.authorId,
            authorName: message.authorName,
            authorAvatar: message.authorAvatar,
            text: message.text,
            createdAt: message.createdAt,
            editedAt: message.editedAt || null,
            replyTo: message.replyTo || null,
            reactions: message.reactions || {}
        };
    }

    function getContext(socket) {
        const roomCode = socket.data.roomCode;
        if (!roomCode) return null;
        const room = roomService.get(roomCode);
        if (!room) return null;
        const user = room.users.get(socket.id);
        if (!user) return null;
        return { roomCode, room, user };
    }

    function canModerate(room, actorId, targetUser) {
        const actor = room.users.get(actorId);
        if (!actor) return false;
        if (actor.role === "host") return true;
        if (actor.role === "moderator" && targetUser?.role !== "host") return true;
        return false;
    }

    function register(socket) {
        socket.on("chat:history", (ack) => {
            const ctx = getContext(socket);
            if (!ctx) return typeof ack === "function" && ack({ success: false });
            const messages = ctx.room.messages.map(safeMessage);
            if (typeof ack === "function") ack({ success: true, messages });
        });

        socket.on("chat:send", (payload, ack) => {
            if (!allowSocketEvent(socket, "chat:send")) return typeof ack === "function" && ack({ success: false, message: "Muitas ações em pouco tempo." });
            const ctx = getContext(socket);
            if (!ctx) return typeof ack === "function" && ack({ success: false, message: "Você não está em uma sala." });

            const now = Date.now();
            socket.data.lastChatAt = socket.data.lastChatAt || 0;
            if (now - socket.data.lastChatAt < 350) {
                return typeof ack === "function" && ack({ success: false, message: "Envie mensagens com um pouco menos de frequência." });
            }

            const text = normalizeText(payload?.text, 1000);
            if (!text) return typeof ack === "function" && ack({ success: false, message: "Mensagem vazia." });

            let replyTo = null;
            const requestedReply = normalizeText(payload?.replyTo, 80);
            if (requestedReply && ctx.room.messages.some(item => item.id === requestedReply)) replyTo = requestedReply;

            const message = {
                id: crypto.randomUUID(),
                authorId: socket.id,
                authorName: ctx.user.name,
                authorAvatar: ctx.user.avatar,
                text,
                createdAt: now,
                editedAt: null,
                replyTo,
                reactions: {}
            };

            ctx.room.messages.push(message);
            if (ctx.room.messages.length > 120) ctx.room.messages.splice(0, ctx.room.messages.length - 120);
            ctx.room.lastActivity = now;
            socket.data.lastChatAt = now;

            io.to(ctx.roomCode).emit("chat:message", safeMessage(message));
            if (typeof ack === "function") ack({ success: true, message: safeMessage(message) });
        });

        socket.on("chat:edit", (payload, ack) => {
            if (!allowSocketEvent(socket, "chat:edit")) return typeof ack === "function" && ack({ success: false, message: "Muitas ações em pouco tempo." });
            const ctx = getContext(socket);
            if (!ctx) return typeof ack === "function" && ack({ success: false });
            const id = normalizeText(payload?.id, 80);
            const text = normalizeText(payload?.text, 1000);
            const message = ctx.room.messages.find(item => item.id === id);
            if (!message || message.authorId !== socket.id || !text) return typeof ack === "function" && ack({ success: false, message: "Não foi possível editar." });
            message.text = text;
            message.editedAt = Date.now();
            io.to(ctx.roomCode).emit("chat:updated", safeMessage(message));
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("chat:delete", (payload, ack) => {
            if (!allowSocketEvent(socket, "chat:edit")) return typeof ack === "function" && ack({ success: false, message: "Muitas ações em pouco tempo." });
            const ctx = getContext(socket);
            if (!ctx) return typeof ack === "function" && ack({ success: false });
            const id = normalizeText(payload?.id, 80);
            const index = ctx.room.messages.findIndex(item => item.id === id);
            if (index < 0) return typeof ack === "function" && ack({ success: false });
            const message = ctx.room.messages[index];
            const author = ctx.room.users.get(message.authorId);
            if (message.authorId !== socket.id && !canModerate(ctx.room, socket.id, author)) {
                return typeof ack === "function" && ack({ success: false, message: "Sem permissão." });
            }
            ctx.room.messages.splice(index, 1);
            io.to(ctx.roomCode).emit("chat:deleted", { id });
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("chat:react", (payload, ack) => {
            if (!allowSocketEvent(socket, "chat:react")) return typeof ack === "function" && ack({ success: false });
            const ctx = getContext(socket);
            if (!ctx) return typeof ack === "function" && ack({ success: false });
            const id = normalizeText(payload?.id, 80);
            const emoji = normalizeText(payload?.emoji, 8);
            if (!ALLOWED_REACTIONS.has(emoji)) return typeof ack === "function" && ack({ success: false });
            const message = ctx.room.messages.find(item => item.id === id);
            if (!message) return typeof ack === "function" && ack({ success: false });
            const users = new Set(message.reactionUsers?.[emoji] || []);
            if (users.has(socket.id)) users.delete(socket.id); else users.add(socket.id);
            message.reactionUsers = message.reactionUsers || {};
            message.reactionUsers[emoji] = Array.from(users);
            message.reactions[emoji] = users.size;
            if (users.size === 0) delete message.reactions[emoji];
            io.to(ctx.roomCode).emit("chat:updated", safeMessage(message));
            if (typeof ack === "function") ack({ success: true });
        });

        socket.on("chat:typing", (payload) => {
            if (!allowSocketEvent(socket, "chat:typing")) return;
            const ctx = getContext(socket);
            if (!ctx) return;
            socket.to(ctx.roomCode).emit("chat:typing", {
                userId: socket.id,
                name: ctx.user.name,
                typing: Boolean(payload?.typing)
            });
        });

        // reaction:send agora é tratado exclusivamente por social-events.js.
        // Isso evita reações duplicadas (local + eco do socket em dois handlers).
    }

    return { register };
}

module.exports = { createChatEvents, ALLOWED_REACTIONS };
