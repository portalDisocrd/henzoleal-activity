function registerStreamEvents({ socket, roomService, allowSocketEvent, updateParticipants }) {
    socket.on("stream-started", () => {
        if (!allowSocketEvent(socket,"stream:signal")) return;
        const roomCode=socket.data.roomCode; if(!roomCode) return;
        const room=roomService.get(roomCode); const user=room?.users.get(socket.id); if(!room||!user) return;
        if(user.streamBlocked){ socket.emit("stream:blocked",{message:"O host bloqueou sua transmissão nesta sala."}); return; }
        user.streaming=true; user.status="online"; user.activity="Transmitindo"; user.lastActive=Date.now();
        const item=roomService.activity(roomCode,{type:"stream-start",text:`${user.name} começou a transmitir`,actorId:socket.id,actorName:user.name});
        if(item) socket.nsp.to(roomCode).emit("activity:event",item);
        updateParticipants(roomCode);
    });
    socket.on("stream-stopped", () => {
        if (!allowSocketEvent(socket,"stream:signal")) return;
        const roomCode=socket.data.roomCode; if(!roomCode) return;
        const room=roomService.get(roomCode); const user=room?.users.get(socket.id); if(!room) return;
        if(user){user.streaming=false;user.activity=user.voiceJoined?"No voz":"Online";user.lastActive=Date.now();}
        socket.to(roomCode).emit("stream-stopped",socket.id); updateParticipants(roomCode);
        if(user){const item=roomService.activity(roomCode,{type:"stream-stop",text:`${user.name} parou de transmitir`,actorId:socket.id,actorName:user.name});if(item) socket.nsp.to(roomCode).emit("activity:event",item);}
    });
}
module.exports={registerStreamEvents};
