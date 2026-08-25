function createSocketRateLimiter({
    maxEvents = 250,
    windowMs = 10000
} = {}) {

    function allowSocketEvent(
        socket
    ) {

        const now =
            Date.now();


        if (
            !socket.data.eventWindow ||
            now -
                socket.data.eventWindow >
                windowMs
        ) {

            socket.data.eventWindow =
                now;

            socket.data.eventCount =
                0;

        }


        socket.data.eventCount =
            (
                socket.data.eventCount ||
                0
            ) + 1;


        if (
            socket.data.eventCount >
            maxEvents
        ) {

            return false;

        }


        return true;

    }


    return {
        allowSocketEvent
    };

}


module.exports = {
    createSocketRateLimiter
};
