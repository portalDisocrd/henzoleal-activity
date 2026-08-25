function createSocketGuard({
    io
}) {

    function getSafeTargetSocket(
        socket,
        targetId
    ) {

        if (
            typeof targetId !==
            "string"
        ) {
            return null;
        }


        if (
            targetId.length > 100
        ) {
            return null;
        }


        if (
            targetId === socket.id
        ) {
            return null;
        }


        const targetSocket =
            io.sockets.sockets.get(
                targetId
            );


        if (!targetSocket) {
            return null;
        }


        const senderRoom =
            socket.data.roomCode;

        const targetRoom =
            targetSocket.data.roomCode;


        if (
            !senderRoom ||
            !targetRoom ||
            senderRoom !== targetRoom
        ) {
            return null;
        }


        return targetSocket;
    }


    return {
        getSafeTargetSocket
    };
}


module.exports = {
    createSocketGuard
};
