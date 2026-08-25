function registerDisconnect({
    socket,
    roomService,
    updateParticipants
}) {

    socket.on(
        "disconnect",
        () => {

            const roomCode =
                socket.data.roomCode;


            if (!roomCode) {
                return;
            }


            const room =
                roomService.get(
                    roomCode
                );


            if (!room) {
                return;
            }


            const user =
                room.users.get(
                    socket.id
                );


            room.users.delete(
                socket.id
            );


            socket.to(
                roomCode
            ).emit(
                "user-left",
                socket.id
            );


            socket.to(
                roomCode
            ).emit(
                "stream-stopped",
                socket.id
            );


            console.log(
                `${user?.name || "Usuário"} saiu`
            );


            if (
                roomService.removeIfEmpty(
                    roomCode
                )
            ) {

                console.log(
                    `Sala ${roomCode} encerrada`
                );

                return;
            }


            updateParticipants(
                roomCode
            );

        }
    );

}


module.exports = {
    registerDisconnect
};
