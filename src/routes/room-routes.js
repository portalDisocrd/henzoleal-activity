function registerRoomRoutes({
    app,
    roomService,
    createRoomLimiter,
    sanitizeRoomCode,
    isValidRoomCode
}) {
    app.post("/api/rooms", createRoomLimiter, (req, res) => {
        const created = roomService.create();
        if (!created.success) {
            return res.status(503).json({ success: false, message: "Limite temporário de salas atingido." });
        }

        console.log(`[ROOM] criada ${created.code}`);
        return res.status(201).json({
            success: true,
            code: created.code,
            hostToken: created.hostToken
        });
    });

    app.get("/api/rooms/:code", (req, res) => {
        const code = sanitizeRoomCode(req.params.code);
        if (!isValidRoomCode(code)) {
            return res.status(400).json({ success: false, message: "Código de sala inválido." });
        }
        const room = roomService.get(code);
        if (!room) return res.status(404).json({ success: false, message: "Sala não encontrada." });
        return res.json({
            success: true,
            code,
            users: room.users.size,
            locked: Boolean(room.locked)
        });
    });
}

module.exports = { registerRoomRoutes };
