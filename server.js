require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const {
    PORT,
    HOST,
    MAX_ROOMS,
    MAX_USERS_PER_ROOM,
    EMPTY_ROOM_TTL,
    MAX_SOCKET_PAYLOAD
} = require("./src/config/constants");

const {
    isPlainObject,
    normalizeText,
    isValidRoomCode,
    sanitizeRoomCode,
    sanitizeProfile,
    isValidDescription,
    isValidCandidate,
    isValidFlowId
} = require("./src/utils/validation");

const { createRoomService } = require("./src/services/room-service");
const { createParticipantManager } = require("./src/socket/participants");
const { createSocketGuard } = require("./src/socket/socket-guard");
const { createSocketRateLimiter } = require("./src/socket/rate-limiter");
const { registerJoinRoom } = require("./src/socket/join-room");
const { registerStreamEvents } = require("./src/socket/stream-events");
const { registerWebRTCSignaling } = require("./src/socket/webrtc-signaling");
const { registerDisconnect } = require("./src/socket/disconnect");
const { createChatEvents } = require("./src/socket/chat-events");
const { createVoiceEvents } = require("./src/socket/voice-events");
const { createSocialEvents } = require("./src/socket/social-events");

const { registerRoomRoutes } = require("./src/routes/room-routes");
const { registerPageRoutes } = require("./src/routes/page-routes");
const { registerAuthRoutes } = require("./src/routes/auth-routes");
const { createRateLimiters } = require("./src/middleware/rate-limiters");
const { registerHttpSecurity } = require("./src/middleware/http-security");
const { registerStaticFiles } = require("./src/middleware/static-files");
const { registerFinalHandlers } = require("./src/middleware/final-handlers");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    path: "/api/socket.io",
    maxHttpBufferSize: MAX_SOCKET_PAYLOAD,
    pingTimeout: 20000,
    pingInterval: 25000
});

app.set("trust proxy", 1);
registerHttpSecurity({ app, express });

const { apiLimiter, createRoomLimiter } = createRateLimiters();
app.use("/api", apiLimiter);

const roomService = createRoomService({ maxRooms: MAX_ROOMS, emptyRoomTtl: EMPTY_ROOM_TTL });
const { updateParticipants } = createParticipantManager({ io, roomService });
const { getSafeTargetSocket } = createSocketGuard({ io });
const { allowSocketEvent } = createSocketRateLimiter({ maxEvents: 250, windowMs: 10000 });

const chatEvents = createChatEvents({ io, roomService, allowSocketEvent, normalizeText, updateParticipants });
const voiceEvents = createVoiceEvents({ io, roomService, allowSocketEvent, getSafeTargetSocket, isPlainObject, isValidDescription, isValidCandidate });
const socialEvents = createSocialEvents({ io, roomService, allowSocketEvent, getSafeTargetSocket, normalizeText });

app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "hl-activity", uptime: Math.floor(process.uptime()) });
});

registerStaticFiles({ app, express, rootDir: __dirname });
registerRoomRoutes({ app, roomService, createRoomLimiter, sanitizeRoomCode, isValidRoomCode });
registerPageRoutes({ app, rootDir: __dirname, roomService, sanitizeRoomCode, isValidRoomCode });
registerAuthRoutes({ app });

io.on("connection", socket => {
    console.log("[SOCKET] conectado", socket.id);

    registerJoinRoom({
        socket,
        roomService,
        sanitizeRoomCode,
        isValidRoomCode,
        sanitizeProfile,
        isPlainObject,
        allowSocketEvent,
        maxUsersPerRoom: MAX_USERS_PER_ROOM,
        updateParticipants
    });

    registerStreamEvents({ socket, roomService, allowSocketEvent, updateParticipants });
    registerWebRTCSignaling({ socket, allowSocketEvent, isPlainObject, normalizeText, getSafeTargetSocket, isValidFlowId, isValidDescription, isValidCandidate });
    chatEvents.register(socket);
    voiceEvents.register(socket, updateParticipants);
    socialEvents.register(socket, updateParticipants);
    registerDisconnect({ socket, roomService, updateParticipants });
});

const cleanupTimer = setInterval(() => {
    roomService.cleanupExpired().forEach(code => console.log(`[ROOM] expirada ${code}`));
}, 5 * 60 * 1000);
cleanupTimer.unref();

registerFinalHandlers({ app });

server.listen(PORT, HOST, () => {
    console.log("");
    console.log("================================");
    console.log("          HL ACTIVITY");
    console.log("================================");
    console.log(`Porta: ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log("Segurança: ATIVA");
    console.log("");
});

let shuttingDown = false;
function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[SERVER] ${signal} recebido. Encerrando...`);
    clearInterval(cleanupTimer);
    io.close(() => {
        server.close(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 8000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
