require("dotenv").config();

const express = require("express");
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");
const { APP_VERSION } = require("./src/config/version");
const { log } = require("./src/utils/logger");

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
const { registerCustomSoundRoutes } = require("./src/routes/custom-sound-routes");
const { createRateLimiters } = require("./src/middleware/rate-limiters");
const { registerHttpSecurity } = require("./src/middleware/http-security");
const { registerStaticFiles } = require("./src/middleware/static-files");
const { registerFinalHandlers } = require("./src/middleware/final-handlers");
const { registerRequestContext } = require("./src/security/request-context");
const { createOriginGuard, isTrustedSocketOrigin } = require("./src/security/origin-guard");
const { createSocketConnectionGuard } = require("./src/security/socket-security");

const app = express();
const server = http.createServer(app);
server.headersTimeout = 12000;
server.requestTimeout = 20000;
server.keepAliveTimeout = 5000;
server.maxRequestsPerSocket = 500;

const io = new Server(server, {
    path: "/api/socket.io",
    maxHttpBufferSize: MAX_SOCKET_PAYLOAD,
    pingTimeout: 20000,
    pingInterval: 25000,
    perMessageDeflate: false,
    allowRequest: (req, callback) => callback(null, isTrustedSocketOrigin(req))
});

app.set("trust proxy", 1);
registerRequestContext(app);
registerHttpSecurity({ app, express });

app.use((req, res, next) => {
    res.set("X-HL-Version", APP_VERSION);
    next();
});

const originGuard = createOriginGuard();
app.use("/api", originGuard);

const { apiLimiter, createRoomLimiter, oauthLimiter, soundUploadLimiter } = createRateLimiters();
app.use("/api", apiLimiter);

const roomService = createRoomService({ maxRooms: MAX_ROOMS, emptyRoomTtl: EMPTY_ROOM_TTL });
const { updateParticipants } = createParticipantManager({ io, roomService });
const { getSafeTargetSocket } = createSocketGuard({ io });
const { allowSocketEvent } = createSocketRateLimiter({ maxEvents: 180, windowMs: 10000 });
const { middleware: socketConnectionGuard } = createSocketConnectionGuard({ maxPerIp: 12 });
io.use(socketConnectionGuard);

const chatEvents = createChatEvents({ io, roomService, allowSocketEvent, normalizeText, updateParticipants });
const voiceEvents = createVoiceEvents({ io, roomService, allowSocketEvent, getSafeTargetSocket, isPlainObject, isValidDescription, isValidCandidate });
const socialEvents = createSocialEvents({ io, roomService, allowSocketEvent, getSafeTargetSocket, normalizeText });

app.get("/health", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ status: "ok", service: "hl-activity", version: APP_VERSION, uptime: Math.floor(process.uptime()) });
});

app.get("/ready", (req, res) => {
    const ready = server.listening;
    res.set("Cache-Control", "no-store");
    res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "starting", service: "hl-activity", version: APP_VERSION });
});

app.get("/api/version", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ success: true, version: APP_VERSION, cache: `hl-activity-${APP_VERSION}` });
});

app.get("/client-config.js", (req, res) => {
    const iceServers = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ];
    if (process.env.TURN_URL && process.env.TURN_SHARED_SECRET) {
        const expires = Math.floor(Date.now() / 1000) + 3600;
        const username = `${expires}:hl`;
        const credential = crypto.createHmac("sha1", process.env.TURN_SHARED_SECRET).update(username).digest("base64");
        iceServers.push({ urls: process.env.TURN_URL, username, credential });
    } else if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
        iceServers.push({ urls: process.env.TURN_URL, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
    }
    res.type("application/javascript").set("Cache-Control", "no-store").send(`window.HL_CONFIG=${JSON.stringify({ version: APP_VERSION, iceServers, turnAvailable: iceServers.length > 2 })};`);
});

registerStaticFiles({ app, express, rootDir: __dirname, appVersion: APP_VERSION });
registerRoomRoutes({ app, roomService, createRoomLimiter, sanitizeRoomCode, isValidRoomCode });
registerPageRoutes({ app, rootDir: __dirname, roomService, sanitizeRoomCode, isValidRoomCode });
registerAuthRoutes({ app, oauthLimiter });
registerCustomSoundRoutes({ app, express, io, roomService, sanitizeRoomCode, isValidRoomCode, soundUploadLimiter });

io.on("connection", socket => {
    log("info", "socket.connected", { socketId: socket.id });

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
    roomService.cleanupExpired().forEach(code => log("info", "room.expired", { room: String(code).slice(0, 3) + "***" }));
}, 5 * 60 * 1000);
cleanupTimer.unref();

registerFinalHandlers({ app });

server.listen(PORT, HOST, () => {
    console.log("");
    console.log("================================");
    console.log("          HL ACTIVITY");
    console.log("================================");
    console.log(`Versão: ${APP_VERSION}`);
    console.log(`Porta: ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || "development"}`);
    console.log("Segurança: ATIVA");
    console.log("");
});

let shuttingDown = false;
function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    log("info", "server.shutdown", { signal });
    clearInterval(cleanupTimer);
    io.close(() => {
        server.close(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 8000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
