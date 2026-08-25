const {
    getParticipants
} = require("../utils/room-utils");


function createParticipantManager({
    io,
    roomService
}) {

    function updateParticipants(
        roomCode
    ) {

        const room =
            roomService.get(
                roomCode
            );

        if (!room) {
            return false;
        }

        io.to(
            roomCode
        ).emit(
            "participants-update",
            getParticipants(
                room
            )
        );

        return true;
    }


    return {
        updateParticipants
    };

}


module.exports = {
    createParticipantManager
};
