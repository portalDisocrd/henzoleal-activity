function registerStreamEvents({
    socket,
    roomService,
    allowSocketEvent,
    updateParticipants
}) {

    // =============================================
    // COMECOU A TRANSMITIR
    // =============================================

    socket.on(
        "stream-started",
        () => {

            if (
                !allowSocketEvent(
                    socket
                )
            ) {
                return;
            }


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

            if (!user) {
                return;
            }


            user.streaming =
                true;


            console.log(
                `${user.name} começou a transmitir`
            );


            updateParticipants(
                roomCode
            );

        }
    );


    // =============================================
    // PAROU DE TRANSMITIR
    // =============================================

    socket.on(
        "stream-stopped",
        () => {

            if (
                !allowSocketEvent(
                    socket
                )
            ) {
                return;
            }


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


            if (user) {

                user.streaming =
                    false;

            }


            socket.to(
                roomCode
            ).emit(
                "stream-stopped",
                socket.id
            );


            updateParticipants(
                roomCode
            );


            console.log(
                `${user?.name || "Usuário"} parou de transmitir`
            );

        }
    );

}


module.exports = {
    registerStreamEvents
};
