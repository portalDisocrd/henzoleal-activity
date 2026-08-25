const crypto = require("crypto");


function generateRoomCode(rooms) {

    let code;

    do {

        code =
            crypto
                .randomBytes(4)
                .toString("hex")
                .toUpperCase();

    } while (
        rooms.has(code)
    );

    return code;
}


function getParticipants(room) {

    return Array.from(
        room.users.entries()
    ).map(
        ([id, user]) => ({

            id,

            name:
                user.name,

            avatar:
                user.avatar,

            streaming:
                Boolean(
                    user.streaming
                )

        })
    );

}


module.exports = {
    generateRoomCode,
    getParticipants
};
