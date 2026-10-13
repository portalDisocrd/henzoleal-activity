const { log } = require("../utils/logger");

function maskedRoom(code) {
    const value = String(code || "");
    return value ? `${value.slice(0, 3)}***` : "-";
}

function registerRoomRoutes({ app, roomService, createRoomLimiter, sanitizeRoomCode, isValidRoomCode }) {
    app.post("/api/rooms", createRoomLimiter, (req,res)=>{
        const created=roomService.create();
        if(!created.success) return res.status(503).json({success:false,message:"Limite temporário de salas atingido."});
        log("info", "room.created", { room: maskedRoom(created.code), requestId: req.requestId || "-" });
        return res.status(201).json({success:true,code:created.code,hostToken:created.hostToken});
    });
    app.get("/api/rooms/:code", (req,res)=>{
        const code=sanitizeRoomCode(req.params.code);
        if(!isValidRoomCode(code)) return res.status(400).json({success:false,message:"Código de sala inválido."});
        const room=roomService.get(code); if(!room) return res.status(404).json({success:false,message:"Sala não encontrada."});
        const preview=Array.from(room.users.values()).slice(0,6).map(user=>({name:user.name,avatar:user.avatar,status:user.status||"online",activity:user.activity||"Online"}));
        return res.json({success:true,code,users:room.users.size,locked:Boolean(room.locked),hasPassword:Boolean(room.roomPasswordHash),entryPolicy:room.entryPolicy||"auto",mode:room.roomMode||"normal",preview});
    });
}
module.exports={registerRoomRoutes, maskedRoom};
