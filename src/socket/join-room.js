function registerJoinRoom({
    socket,
    roomService,
    sanitizeRoomCode,
    isValidRoomCode,
    sanitizeProfile,
    isPlainObject,
    allowSocketEvent,
    maxUsersPerRoom,
    updateParticipants
}) {

    socket.on(
        "join-room",
        data => {

            if (
                !allowSocketEvent(
                    socket
                )
            ) {
                return;
            }


            if (
                !isPlainObject(
                    data
                )
            ) {

                socket.emit(
                    "room-error",
                    "Dados invalidos."
                );

                return;
            }


            const roomCode =
                sanitizeRoomCode(
                    data.roomCode
                );


            if (
                !isValidRoomCode(
                    roomCode
                )
            ) {

                socket.emit(
                    "room-error",
                    "Codigo de sala invalido."
                );

                return;
            }


            const room =
                roomService.get(
                    roomCode
                );


            if (!room) {

                socket.emit(
                    "room-error",
                    "Sala nao encontrada."
                );

                return;
            }


            if (
                socket.data.roomCode ===
                roomCode
            ) {

                updateParticipants(
                    roomCode
                );

                return;
            }


            if (
                socket.data.roomCode
            ) {

                socket.emit(
                    "room-error",
                    "Voce ja esta em outra sala."
                );

                return;
            }


            if (
                room.users.size >=
                maxUsersPerRoom
            ) {

                socket.emit(
                    "room-error",
                    "Sala cheia."
                );

                return;
            }


            const profile =
                sanitizeProfile(
                    data.profile
                );


            socket.join(
                roomCode
            );


            socket.data.roomCode =
                roomCode;


            room.users.set(
                socket.id,
                {
                    name:
                        profile.name,

                    avatar:
                        profile.avatar,

                    streaming:
                        false
                }
            );


            console.log(
                `${profile.name} entrou em ${roomCode}`
            );


            // Avisa quem ja estava na sala.
            // Se alguem estiver transmitindo,
            // o cliente inicia WebRTC para o novo usuario.
            socket.to(
                roomCode
            ).emit(
                "user-joined",
                {
                    id:
                        socket.id,

                    name:
                        profile.name,

                    avatar:
                        profile.avatar,

                    streaming:
                        false
                }
            );


            updateParticipants(
                roomCode
            );

        }
    );

}


module.exports = {
    registerJoinRoom
};
