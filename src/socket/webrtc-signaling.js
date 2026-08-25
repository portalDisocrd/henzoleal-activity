function registerWebRTCSignaling({
    socket,
    allowSocketEvent,
    isPlainObject,
    normalizeText,
    getSafeTargetSocket,
    isValidFlowId,
    isValidDescription,
    isValidCandidate
}) {

    // =============================================
    // OFFER
    // =============================================

    socket.on(
        "offer",
        data => {

            if (!allowSocketEvent(socket)) {
                return;
            }

            if (!isPlainObject(data)) {
                return;
            }

            const targetId =
                normalizeText(
                    data.target,
                    100
                );

            const targetSocket =
                getSafeTargetSocket(
                    socket,
                    targetId
                );

            if (!targetSocket) {

                console.warn(
                    "Offer bloqueada fora da sala:",
                    socket.id
                );

                return;
            }

            if (
                !isValidFlowId(
                    socket,
                    targetId,
                    data.flowId
                )
            ) {
                return;
            }

            if (
                !isValidDescription(
                    data.offer,
                    "offer"
                )
            ) {
                return;
            }

            targetSocket.emit(
                "offer",
                {
                    sender:
                        socket.id,

                    flowId:
                        data.flowId,

                    offer:
                        data.offer,

                    profile:
                        socket.data.profile
                }
            );

        }
    );


    // =============================================
    // ANSWER
    // =============================================

    socket.on(
        "answer",
        data => {

            if (!allowSocketEvent(socket)) {
                return;
            }

            if (!isPlainObject(data)) {
                return;
            }

            const targetId =
                normalizeText(
                    data.target,
                    100
                );

            const targetSocket =
                getSafeTargetSocket(
                    socket,
                    targetId
                );

            if (!targetSocket) {

                console.warn(
                    "Answer bloqueada fora da sala:",
                    socket.id
                );

                return;
            }

            if (
                !isValidFlowId(
                    socket,
                    targetId,
                    data.flowId
                )
            ) {
                return;
            }

            if (
                !isValidDescription(
                    data.answer,
                    "answer"
                )
            ) {
                return;
            }

            targetSocket.emit(
                "answer",
                {
                    sender:
                        socket.id,

                    flowId:
                        data.flowId,

                    answer:
                        data.answer
                }
            );

        }
    );


    // =============================================
    // ICE CANDIDATE
    // =============================================

    socket.on(
        "ice-candidate",
        data => {

            if (!allowSocketEvent(socket)) {
                return;
            }

            if (!isPlainObject(data)) {
                return;
            }

            const targetId =
                normalizeText(
                    data.target,
                    100
                );

            const targetSocket =
                getSafeTargetSocket(
                    socket,
                    targetId
                );

            if (!targetSocket) {
                return;
            }

            if (
                !isValidFlowId(
                    socket,
                    targetId,
                    data.flowId
                )
            ) {
                return;
            }

            if (
                !isValidCandidate(
                    data.candidate
                )
            ) {
                return;
            }

            targetSocket.emit(
                "ice-candidate",
                {
                    sender:
                        socket.id,

                    flowId:
                        data.flowId,

                    candidate:
                        data.candidate
                }
            );

        }
    );

}


module.exports = {
    registerWebRTCSignaling
};
