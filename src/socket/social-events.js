const { publicSound } = require("../routes/custom-sound-routes");

const SOUND_IDS = new Set(["airhorn", "victory", "fail", "bonk", "pop", "suspense"]);
const SOUND_POLICIES = new Set(["disabled", "hostOnly", "moderators", "everyone"]);
const REACTION_EMOJIS = new Set(["👍", "😂", "❤️", "🔥", "👏"]);
const ENTRY_POLICIES = new Set(["auto", "approveUnknown", "approveAll"]);
const ROOM_MODES = new Set(["normal", "focus", "social", "cinema", "gaming", "study"]);
const PRESENCE_STATES = new Set(["online", "afk"]);

function createSocialEvents({ io, roomService, allowSocketEvent, getSafeTargetSocket, normalizeText }) {
    function ctx(socket) {
        const roomCode = socket.data.roomCode;
        if (!roomCode) return null;
        const room = roomService.get(roomCode);
        if (!room) return null;
        const user = room.users.get(socket.id);
        if (!user) return null;
        return { roomCode, room, user, socketId: socket.id };
    }
    function canUseSound(user, policy) {
        if (!user || user.soundBlocked || policy === "disabled") return false;
        if (policy === "everyone") return true;
        if (policy === "hostOnly") return user.role === "host";
        if (policy === "moderators") return user.role === "host" || user.role === "moderator";
        return false;
    }
    function canModerate(actor, target) {
        if (!actor || !target || actor === target) return false;
        if (actor.role === "host") return target.role !== "host";
        return actor.role === "moderator" && target.role === "member";
    }
    function emitActivity(c, text, type = "info", targetId = null) {
        const item = roomService.activity(c.roomCode, { type, text, actorId: c.socketId || null, actorName: c.user?.name, targetId });
        if (item) io.to(c.roomCode).emit("activity:event", item);
    }

    function register(socket, updateParticipants) {
        socket.on("social:state", ack => {
            if (!allowSocketEvent(socket, "social:state")) return typeof ack === "function" && ack({ success:false, message:"Muitas solicitações em pouco tempo." });
            const c = ctx(socket);
            if (!c) return typeof ack === "function" && ack({ success:false });
            if (typeof ack === "function") ack({
                success:true, role:c.user.role, hostId:c.room.hostId, locked:Boolean(c.room.locked),
                soundboardPolicy:c.room.soundboardPolicy, soundUploadPolicy:c.room.soundUploadPolicy,
                entryPolicy:c.room.entryPolicy || "auto", roomMode:c.room.roomMode || "normal",
                spotlightId:c.room.spotlightId || null, hasPassword:Boolean(c.room.roomPasswordHash),
                waiting:c.user.role === "host" ? Array.from(c.room.pendingGuests?.values?.() || []) : [],
                activity:(c.room.activityFeed || []).slice(-30),
                audit:c.user.role === "host" ? (c.room.auditLog || []).slice(-40).map(item => ({
                    at:item.at, type:item.type, actorName:item.actorName || "Sistema", targetId:item.targetId || null,
                    policy:item.policy || null, enabled:typeof item.enabled === "boolean" ? item.enabled : undefined,
                    locked:typeof item.locked === "boolean" ? item.locked : undefined
                })) : [],
                customSounds:Array.from(c.room.customSounds?.values?.() || []).map(sound => publicSound(sound, c.roomCode))
            });
        });

        socket.on("diagnostics:ping", (payload, ack) => {
            if (!allowSocketEvent(socket, "diagnostics:ping")) return typeof ack === "function" && ack({ success:false });
            if (typeof ack === "function") ack({ success:true, at:Date.now(), echo:payload?.at || null });
        });

        socket.on("presence:update", (payload, ack) => {
            if (!allowSocketEvent(socket, "presence:update")) return typeof ack === "function" && ack({ success:false });
            const c = ctx(socket); if (!c) return typeof ack === "function" && ack({ success:false });
            const status = normalizeText(payload?.status, 16);
            if (!PRESENCE_STATES.has(status)) return typeof ack === "function" && ack({ success:false });
            c.user.status = status;
            c.user.lastActive = Date.now();
            if (status === "afk") c.user.activity = "Ausente";
            else if (c.user.streaming) c.user.activity = "Transmitindo";
            else if (c.user.voiceJoined) c.user.activity = "No voz";
            else c.user.activity = "Online";
            updateParticipants(c.roomCode);
            if (typeof ack === "function") ack({ success:true });
        });

        socket.on("reaction:send", (payload, ack) => {
            if (!allowSocketEvent(socket, "reaction:send")) return typeof ack === "function" && ack({ success:false, message:"Muitas reações em pouco tempo." });
            const c = ctx(socket); if (!c) return typeof ack === "function" && ack({ success:false });
            const emoji = normalizeText(payload?.emoji, 8);
            const reactionId = normalizeText(payload?.reactionId, 80) || `${socket.id}-${Date.now()}`;
            if (!REACTION_EMOJIS.has(emoji)) return typeof ack === "function" && ack({ success:false, message:"Reação inválida." });
            const now = Date.now();
            c.room.reactionIds ||= new Map();
            const previous = c.room.reactionIds.get(reactionId);
            if (previous && now - previous < 30000) {
                if (typeof ack === "function") ack({ success:true, reactionId, deduplicated:true });
                return;
            }
            if (now - (socket.data.lastReactionAt || 0) < 450) return typeof ack === "function" && ack({ success:false, message:"Aguarde um instante." });
            c.room.reactionIds.set(reactionId, now);
            while (c.room.reactionIds.size > 200) {
                const oldest = [...c.room.reactionIds.entries()].sort(([, left], [, right]) => left - right)[0];
                if (!oldest) break;
                c.room.reactionIds.delete(oldest[0]);
            }
            socket.data.lastReactionAt = now;
            c.room.lastActivity = now;
            socket.to(c.roomCode).emit("reaction:show", { emoji, reactionId, senderId:socket.id, name:c.user.name, at:now });
            if (typeof ack === "function") ack({ success:true, reactionId, deduplicated:false });
        });

        socket.on("sound:play", (payload, ack) => {
            if (!allowSocketEvent(socket, "sound:play")) return typeof ack === "function" && ack({ success:false, message:"Muitas ações em pouco tempo." });
            const c = ctx(socket); if (!c) return typeof ack === "function" && ack({ success:false });
            const soundId = normalizeText(payload?.soundId, 80);
            const builtin = SOUND_IDS.has(soundId); const custom = c.room.customSounds?.get(soundId);
            if (!builtin && !custom) return typeof ack === "function" && ack({ success:false, message:"Som inválido." });
            if (c.room.roomMode === "study") return typeof ack === "function" && ack({ success:false, message:"Soundboard desativado no modo Estudo." });
            if (!canUseSound(c.user, c.room.soundboardPolicy)) return typeof ack === "function" && ack({ success:false, message:"Soundboard não permitido para você nesta sala." });
            const now = Date.now();
            if (now - (socket.data.lastSoundAt || 0) < 900) return typeof ack === "function" && ack({ success:false, message:"Aguarde o cooldown." });
            socket.data.lastSoundAt = now; c.room.lastActivity = now;
            socket.to(c.roomCode).emit("sound:play", { soundId, userId:socket.id, name:c.user.name, at:now });
            if (typeof ack === "function") ack({ success:true });
        });

        socket.on("sound:stop", ack => {
            if (!allowSocketEvent(socket, "sound:play")) return typeof ack === "function" && ack({ success:false });
            const c=ctx(socket); if (!c || (c.user.role!=="host" && c.user.role!=="moderator")) return typeof ack === "function" && ack({ success:false, message:"Sem permissão." });
            io.to(c.roomCode).emit("sound:stop", { by:socket.id });
            roomService.audit(c.roomCode, { type:"sound-stop", actorId:socket.id, actorName:c.user.name });
            if (typeof ack === "function") ack({ success:true });
        });

        socket.on("moderation:sound-policy", (payload, ack) => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode alterar isso."});
            const policy=normalizeText(payload?.policy,20); if(!SOUND_POLICIES.has(policy)) return typeof ack === "function" && ack({success:false});
            c.room.soundboardPolicy=policy; roomService.audit(c.roomCode,{type:"sound-policy",actorId:socket.id,actorName:c.user.name,policy}); io.to(c.roomCode).emit("sound:policy",{policy,by:socket.id});
            if(typeof ack==="function") ack({success:true});
        });
        socket.on("moderation:sound-upload-policy", (payload, ack) => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode alterar isso."});
            const policy=normalizeText(payload?.policy,20); if(!SOUND_POLICIES.has(policy)) return typeof ack === "function" && ack({success:false});
            c.room.soundUploadPolicy=policy; roomService.audit(c.roomCode,{type:"sound-upload-policy",actorId:socket.id,actorName:c.user.name,policy}); io.to(c.roomCode).emit("sound:upload-policy",{policy,by:socket.id});
            if(typeof ack==="function") ack({success:true});
        });

        socket.on("room:entry-policy", (payload, ack) => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode alterar a entrada."});
            const policy=normalizeText(payload?.policy,24); if(!ENTRY_POLICIES.has(policy)) return typeof ack === "function" && ack({success:false,message:"Política inválida."});
            c.room.entryPolicy=policy; roomService.audit(c.roomCode,{type:"entry-policy",actorId:socket.id,actorName:c.user.name,policy}); io.to(c.roomCode).emit("room:entry-policy",{policy});
            if(typeof ack==="function") ack({success:true,policy});
        });

        socket.on("room:create-trusted-invite", ack => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode criar convite confiável."});
            const token=roomService.createTrustedInvite(c.roomCode); if(typeof ack==="function") ack({success:Boolean(token),token});
        });
        socket.on("room:create-invite", (payload, ack) => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode criar convites especiais."});
            const ttlMs=Number(payload?.ttlMs); const invite=roomService.createInvite(c.roomCode,{trusted:payload?.trusted!==false,oneTime:Boolean(payload?.oneTime),ttlMs});
            if(typeof ack==="function") ack({success:Boolean(invite),invite});
        });
        socket.on("room:set-password", (payload, ack) => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode alterar a senha."});
            const password=normalizeText(payload?.password,64); roomService.setRoomPassword(c.roomCode,password); c.room.lastActivity=Date.now();
            roomService.audit(c.roomCode,{type:"password-change",actorId:socket.id,actorName:c.user.name,enabled:Boolean(password)});
            io.to(c.roomCode).emit("room:password-state",{enabled:Boolean(password)}); if(typeof ack==="function") ack({success:true,enabled:Boolean(password)});
        });

        socket.on("room:approve-join", (payload, ack) => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode aprovar entradas."});
            const targetId=normalizeText(payload?.target,120); const pending=c.room.pendingGuests?.get(targetId); const targetSocket=io.sockets.sockets.get(targetId);
            if(!pending || !targetSocket || targetSocket.data.pendingRoomCode!==c.roomCode) return typeof ack === "function" && ack({success:false,message:"Solicitação não encontrada."});
            c.room.pendingGuests.delete(targetId); targetSocket.data.entryApprovedFor=c.roomCode; targetSocket.emit("room:approval",{approved:true,roomCode:c.roomCode});
            socket.emit("room:join-request-removed",{id:targetId}); if(typeof ack==="function") ack({success:true});
        });
        socket.on("room:reject-join", (payload, ack) => {
            if (!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode recusar entradas."});
            const targetId=normalizeText(payload?.target,120); const pending=c.room.pendingGuests?.get(targetId); const targetSocket=io.sockets.sockets.get(targetId);
            if(!pending) return typeof ack === "function" && ack({success:false,message:"Solicitação não encontrada."});
            c.room.pendingGuests.delete(targetId); if(targetSocket){targetSocket.data.pendingRoomCode=null;targetSocket.emit("room:approval",{approved:false,roomCode:c.roomCode,message:"Entrada recusada pelo host."});}
            socket.emit("room:join-request-removed",{id:targetId}); if(typeof ack==="function") ack({success:true});
        });

        socket.on("room:mode", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || (c.user.role!=="host"&&c.user.role!=="moderator")) return typeof ack === "function" && ack({success:false,message:"Sem permissão."});
            const mode=normalizeText(payload?.mode,20); if(!ROOM_MODES.has(mode)) return typeof ack === "function" && ack({success:false,message:"Modo inválido."});
            c.room.roomMode=mode; io.to(c.roomCode).emit("room:mode",{mode,by:socket.id}); if(typeof ack==="function") ack({success:true,mode});
        });
        socket.on("room:spotlight", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || (c.user.role!=="host"&&c.user.role!=="moderator")) return typeof ack === "function" && ack({success:false,message:"Sem permissão."});
            const target=normalizeText(payload?.target,120); if(target && !c.room.users.has(target)) return typeof ack === "function" && ack({success:false,message:"Participante inválido."});
            c.room.spotlightId=target || null; io.to(c.roomCode).emit("room:spotlight",{target:c.room.spotlightId,by:socket.id}); updateParticipants(c.roomCode); if(typeof ack==="function") ack({success:true,target:c.room.spotlightId});
        });

        socket.on("moderation:lock", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false});
            c.room.locked=Boolean(payload?.locked); io.to(c.roomCode).emit("room:locked",{locked:c.room.locked}); if(typeof ack==="function") ack({success:true,locked:c.room.locked});
        });
        socket.on("moderation:kick", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c) return typeof ack === "function" && ack({success:false});
            const targetSocket=getSafeTargetSocket(socket,normalizeText(payload?.target,100)); if(!targetSocket) return typeof ack === "function" && ack({success:false});
            const targetUser=c.room.users.get(targetSocket.id); if(!canModerate(c.user,targetUser)) return typeof ack === "function" && ack({success:false,message:"Sem permissão."});
            targetSocket.emit("moderation:kicked",{message:"Você foi removido da sala."}); targetSocket.disconnect(true); if(typeof ack==="function") ack({success:true});
        });
        socket.on("moderation:ban", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode banir."});
            const targetSocket=getSafeTargetSocket(socket,normalizeText(payload?.target,100)); const targetUser=targetSocket&&c.room.users.get(targetSocket.id);
            if(!targetSocket || !targetUser || !canModerate(c.user,targetUser)) return typeof ack === "function" && ack({success:false,message:"Alvo inválido."});
            if(targetUser.clientId) c.room.bannedClients.set(targetUser.clientId,Date.now()+24*60*60*1000);
            targetSocket.emit("moderation:kicked",{message:"Você foi bloqueado desta sala por 24 horas."}); targetSocket.disconnect(true); if(typeof ack==="function") ack({success:true});
        });
        socket.on("moderation:promote", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false});
            const targetSocket=getSafeTargetSocket(socket,normalizeText(payload?.target,100)); const target=targetSocket&&c.room.users.get(targetSocket.id);
            if(!target || target.role==="host") return typeof ack === "function" && ack({success:false}); target.role=payload?.moderator?"moderator":"member"; updateParticipants(c.roomCode); if(typeof ack==="function") ack({success:true});
        });
        socket.on("moderation:transfer-host", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || c.user.role!=="host") return typeof ack === "function" && ack({success:false,message:"Somente o host pode transferir."});
            const targetSocket=getSafeTargetSocket(socket,normalizeText(payload?.target,100)); const target=targetSocket&&c.room.users.get(targetSocket.id);
            if(!target || targetSocket.id===socket.id) return typeof ack === "function" && ack({success:false,message:"Participante inválido."});
            c.user.role="member"; target.role="host"; c.room.hostId=targetSocket.id; io.to(c.roomCode).emit("room:host-changed",{hostId:targetSocket.id}); updateParticipants(c.roomCode); if(typeof ack==="function") ack({success:true});
        });
        socket.on("moderation:user-flags", (payload, ack) => {
            if(!allowSocketEvent(socket,"moderation")) return typeof ack === "function" && ack({success:false});
            const c=ctx(socket); if(!c || (c.user.role!=="host"&&c.user.role!=="moderator")) return typeof ack === "function" && ack({success:false,message:"Sem permissão."});
            const targetSocket=getSafeTargetSocket(socket,normalizeText(payload?.target,100)); const target=targetSocket&&c.room.users.get(targetSocket.id);
            if(!target || !canModerate(c.user,target)) return typeof ack === "function" && ack({success:false,message:"Alvo inválido."});
            if(typeof payload?.soundBlocked==="boolean") target.soundBlocked=payload.soundBlocked;
            if(typeof payload?.streamBlocked==="boolean") target.streamBlocked=payload.streamBlocked;
            if(payload?.forceMute) targetSocket.emit("moderation:force-mute",{by:socket.id});
            updateParticipants(c.roomCode); if(typeof ack==="function") ack({success:true,soundBlocked:target.soundBlocked,streamBlocked:target.streamBlocked});
        });
    }
    return { register };
}

module.exports = { createSocialEvents, SOUND_IDS, SOUND_POLICIES, REACTION_EMOJIS, ENTRY_POLICIES, ROOM_MODES };
