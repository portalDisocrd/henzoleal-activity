// =====================================================
// ELEMENTOS
// =====================================================

const socket = io({

    path:
        "/api/socket.io",

    reconnection:
        true,

    reconnectionAttempts:
        Infinity,

    reconnectionDelay:
        800,

    reconnectionDelayMax:
        5000,

    timeout:
        10000

});


// =====================================================
// QUALITY SELECTOR V1
// =====================================================

const qualitySelect =
    document.getElementById(
        "qualitySelect"
    );


const qualityProfiles = {

    auto: {
        label:
            "Auto",

        width:
            1920,

        height:
            1080,

        fps:
            60,

        bitrate:
            8000000,

        auto:
            true,

        _autoQualityV2:
            true
    },

    "720p30": {
        label:
            "720p • 30 FPS",

        width:
            1280,

        height:
            720,

        fps:
            30,

        bitrate:
            3500000
    },

    "720p60": {
        label:
            "720p • 60 FPS",

        width:
            1280,

        height:
            720,

        fps:
            60,

        bitrate:
            5500000
    },

    "1080p30": {
        label:
            "1080p • 30 FPS",

        width:
            1920,

        height:
            1080,

        fps:
            30,

        bitrate:
            6000000
    },

    "1080p60": {
        label:
            "1080p • 60 FPS",

        width:
            1920,

        height:
            1080,

        fps:
            60,

        bitrate:
            8000000
    }

};


function getQualityProfile() {

    return (
        qualityProfiles[
            qualitySelect?.value ||
            "1080p60"
        ] ||
        qualityProfiles[
            "1080p60"
        ]
    );

}


async function applyQualityToSender(
    sender,
    profile
) {

    if (
        !sender ||
        sender.track?.kind !==
            "video"
    ) {

        return;

    }


    try {

        const parameters =
            sender.getParameters();

        if (
            !parameters.encodings ||
            parameters.encodings.length === 0
        ) {

            parameters.encodings =
                [{}];

        }


        parameters
            .encodings[0]
            .maxBitrate =
                profile.bitrate;


        parameters
            .encodings[0]
            .maxFramerate =
                profile.fps;


        parameters
            .degradationPreference =
                profile.auto
                    ? "balanced"
                    : "maintain-resolution";


        await sender
            .setParameters(
                parameters
            );

    } catch (
        error
    ) {

        console.warn(
            "Nao foi possivel alterar parametros WebRTC:",
            error?.message ||
            error
        );

    }

}


async function applySelectedQuality() {

    const profile =
        getQualityProfile();


    const videoTrack =
        localStream
            ?.getVideoTracks?.()[0];


    if (
        videoTrack
    ) {

        try {

            videoTrack.contentHint =
                profile.auto
                    ? "motion"
                    : "detail";

        } catch {}


        try {

            if (
                profile.auto
            ) {

                await videoTrack
                    .applyConstraints({
                        frameRate: {
                            ideal:
                                60,
                            max:
                                60
                        }
                    });

            } else {

                await videoTrack
                    .applyConstraints({

                        width: {
                            ideal:
                                profile.width,
                            max:
                                profile.width
                        },

                        height: {
                            ideal:
                                profile.height,
                            max:
                                profile.height
                        },

                        frameRate: {
                            ideal:
                                profile.fps,
                            max:
                                profile.fps
                        }

                    });

            }

        } catch (
            error
        ) {

            console.warn(
                "Navegador nao aplicou todos os constraints:",
                error?.message ||
                error
            );

        }

    }


    const jobs =
        [];

    outboundPeers
        .forEach(
            peer => {

                peer
                    .getSenders()
                    .forEach(
                        sender => {

                            if (
                                sender.track?.kind ===
                                "video"
                            ) {

                                jobs.push(
                                    applyQualityToSender(
                                        sender,
                                        profile
                                    )
                                );

                            }

                        }
                    );

            }
        );


    await Promise.allSettled(
        jobs
    );


    if (
        statusElement
    ) {

        statusElement.textContent =
            "🎥 Qualidade: " +
            profile.label;

        statusElement.classList.remove(
            "status-pop"
        );

        void statusElement.offsetWidth;

        statusElement.classList.add(
            "status-pop"
        );

    }


    const qualityControl =
        document.querySelector(
            ".quality-control"
        );

    if (
        qualityControl
    ) {

        qualityControl.classList.remove(
            "quality-changing"
        );

        void qualityControl.offsetWidth;

        qualityControl.classList.add(
            "quality-changing"
        );

    }

}


if (
    qualitySelect
) {

    const savedQuality =
        localStorage.getItem(
            "leal_stream_quality"
        );

    if (
        savedQuality &&
        qualityProfiles[
            savedQuality
        ]
    ) {

        qualitySelect.value =
            savedQuality;

    }


    qualitySelect.addEventListener(
        "change",
        async () => {

            localStorage.setItem(
                "leal_stream_quality",
                qualitySelect.value
            );

            await applySelectedQuality();

        }
    );

}






// =====================================================
// AUTO QUALITY V2
// =====================================================

const autoQualityLevels = [

    "720p30",
    "720p60",
    "1080p30",
    "1080p60"

];


let autoQualityLevel =
    3;


let autoQualityBadSamples =
    0;


let autoQualityGoodSamples =
    0;


let autoQualityRunning =
    false;


let autoQualityTimer =
    null;


const autoQualityPreviousStats =
    new Map();


function getAutoQualityProfile() {

    return qualityProfiles[
        autoQualityLevels[
            autoQualityLevel
        ]
    ];

}


function getAutoQualityLabel() {

    const profile =
        getAutoQualityProfile();

    return profile?.label ||
        "Auto";

}


function updateAutoQualityUI(
    state = "Estável"
) {

    const control =
        document.querySelector(
            ".quality-control"
        );

    if (!control) {
        return;
    }


    control.dataset.autoState =
        state;


    control.title =
        qualitySelect?.value ===
            "auto"
            ? (
                "Auto • " +
                getAutoQualityLabel() +
                " • " +
                state
            )
            : "";

}


async function applyAutoQualityLevel() {

    if (
        qualitySelect?.value !==
            "auto"
    ) {
        return;
    }


    const profile =
        getAutoQualityProfile();


    const videoTrack =
        localStream
            ?.getVideoTracks?.()[0];


    if (videoTrack) {

        try {

            videoTrack.contentHint =
                autoQualityLevel >= 2
                    ? "detail"
                    : "motion";

        } catch {}


        try {

            await videoTrack
                .applyConstraints({

                    width: {
                        ideal:
                            profile.width,
                        max:
                            profile.width
                    },

                    height: {
                        ideal:
                            profile.height,
                        max:
                            profile.height
                    },

                    frameRate: {
                        ideal:
                            profile.fps,
                        max:
                            profile.fps
                    }

                });

        } catch (
            error
        ) {

            console.warn(
                "Auto Quality: constraints:",
                error?.message ||
                    error
            );

        }

    }


    const jobs =
        [];


    outboundPeers.forEach(
        peer => {

            peer
                .getSenders()
                .forEach(
                    sender => {

                        if (
                            sender.track
                                ?.kind ===
                                "video"
                        ) {

                            jobs.push(
                                applyQualityToSender(
                                    sender,
                                    profile
                                )
                            );

                        }

                    }
                );

        }
    );


    await Promise.allSettled(
        jobs
    );


    updateAutoQualityUI(
        "Estável"
    );

}


async function readAutoQualityStats() {

    const samples =
        [];


    for (
        const [
            targetId,
            peer
        ]
        of outboundPeers
    ) {

        if (
            !peer ||
            peer.connectionState !==
                "connected"
        ) {
            continue;
        }


        try {

            const report =
                await peer.getStats();


            let outboundVideo =
                null;

            let remoteInbound =
                null;

            let candidatePair =
                null;


            report.forEach(
                stat => {

                    if (
                        stat.type ===
                            "outbound-rtp" &&
                        stat.kind ===
                            "video"
                    ) {

                        outboundVideo =
                            stat;

                    }


                    if (
                        stat.type ===
                            "remote-inbound-rtp" &&
                        stat.kind ===
                            "video"
                    ) {

                        remoteInbound =
                            stat;

                    }


                    if (
                        stat.type ===
                            "candidate-pair" &&
                        stat.state ===
                            "succeeded" &&
                        stat.nominated
                    ) {

                        candidatePair =
                            stat;

                    }

                }
            );


            if (!outboundVideo) {
                continue;
            }


            const key =
                String(targetId);


            const previous =
                autoQualityPreviousStats
                    .get(key);


            const current = {

                timestamp:
                    outboundVideo
                        .timestamp,

                bytesSent:
                    outboundVideo
                        .bytesSent ||
                    0

            };


            autoQualityPreviousStats
                .set(
                    key,
                    current
                );


            let bitrate =
                null;


            if (
                previous &&
                current.timestamp >
                    previous.timestamp
            ) {

                const seconds =
                    (
                        current.timestamp -
                        previous.timestamp
                    ) /
                    1000;


                bitrate =
                    (
                        (
                            current.bytesSent -
                            previous.bytesSent
                        ) *
                        8
                    ) /
                    seconds;

            }


            samples.push({

                bitrate,

                rtt:
                    remoteInbound
                        ?.roundTripTime ??
                    candidatePair
                        ?.currentRoundTripTime ??
                    null,

                fractionLost:
                    remoteInbound
                        ?.fractionLost ??
                    null,

                availableBitrate:
                    candidatePair
                        ?.availableOutgoingBitrate ??
                    null

            });

        } catch (
            error
        ) {

            console.warn(
                "Auto Quality getStats:",
                error?.message ||
                    error
            );

        }

    }


    return samples;

}


function evaluateAutoQuality(
    samples
) {

    if (
        !samples.length
    ) {

        return "unknown";

    }


    const profile =
        getAutoQualityProfile();


    let bad =
        false;


    let veryGood =
        true;


    for (
        const sample
        of samples
    ) {

        const rtt =
            sample.rtt;


        const loss =
            sample.fractionLost;


        const available =
            sample.availableBitrate;


        const bitrate =
            sample.bitrate;


        if (
            (
                rtt !== null &&
                rtt > 0.32
            ) ||
            (
                loss !== null &&
                loss > 0.08
            ) ||
            (
                available !== null &&
                available <
                    profile.bitrate *
                    0.82
            )
        ) {

            bad =
                true;

        }


        if (
            (
                rtt !== null &&
                rtt > 0.12
            ) ||
            (
                loss !== null &&
                loss > 0.02
            ) ||
            (
                available !== null &&
                available <
                    profile.bitrate *
                    1.35
            ) ||
            (
                bitrate !== null &&
                bitrate <
                    profile.bitrate *
                    0.45
            )
        ) {

            veryGood =
                false;

        }

    }


    if (bad) {
        return "bad";
    }


    if (veryGood) {
        return "good";
    }


    return "normal";

}


async function autoQualityTick() {

    if (
        autoQualityRunning ||
        qualitySelect?.value !==
            "auto" ||
        !localStream
    ) {
        return;
    }


    autoQualityRunning =
        true;


    try {

        const samples =
            await readAutoQualityStats();


        const state =
            evaluateAutoQuality(
                samples
            );


        if (
            state === "bad"
        ) {

            autoQualityBadSamples++;

            autoQualityGoodSamples =
                0;


            updateAutoQualityUI(
                "Ajustando conexão..."
            );


            if (
                autoQualityBadSamples >=
                    2 &&
                autoQualityLevel > 0
            ) {

                autoQualityLevel--;

                autoQualityBadSamples =
                    0;


                await applyAutoQualityLevel();

            }

        } else if (
            state === "good"
        ) {

            autoQualityGoodSamples++;

            autoQualityBadSamples =
                0;


            updateAutoQualityUI(
                "Estável"
            );


            if (
                autoQualityGoodSamples >=
                    5 &&
                autoQualityLevel <
                    autoQualityLevels
                        .length -
                        1
            ) {

                autoQualityLevel++;

                autoQualityGoodSamples =
                    0;


                await applyAutoQualityLevel();

            }

        } else {

            autoQualityBadSamples =
                0;


            if (
                state === "normal"
            ) {

                autoQualityGoodSamples =
                    Math.max(
                        0,
                        autoQualityGoodSamples -
                            1
                    );


                updateAutoQualityUI(
                    "Estável"
                );

            }

        }

    } finally {

        autoQualityRunning =
            false;

    }

}


function startAutoQuality() {

    clearInterval(
        autoQualityTimer
    );


    autoQualityTimer =
        setInterval(
            autoQualityTick,
            4000
        );

}


function resetAutoQuality() {

    autoQualityBadSamples =
        0;

    autoQualityGoodSamples =
        0;

    autoQualityPreviousStats
        .clear();


    if (
        qualitySelect?.value ===
            "auto"
    ) {

        autoQualityLevel =
            3;


        applyAutoQualityLevel()
            .catch(
                () => {}
            );


        updateAutoQualityUI(
            "Estável"
        );

    }

}


qualitySelect
    ?.addEventListener(
        "change",
        () => {

            if (
                qualitySelect.value ===
                    "auto"
            ) {

                resetAutoQuality();

            } else {

                autoQualityBadSamples =
                    0;

                autoQualityGoodSamples =
                    0;

                autoQualityPreviousStats
                    .clear();

            }

        }
    );


startAutoQuality();


// =====================================================
// FIM AUTO QUALITY V2
// =====================================================


// =====================================================
// ACTIVITY ROOM CODE V1
// =====================================================

const activityRoomParams =
    new URLSearchParams(
        window.location.search
    );

const roomCode =
    (
        activityRoomParams.get(
            "room"
        ) ||
        ""
    )
        .trim()
        .toUpperCase();


// ACTIVITY ROOM VALIDATION V1

if (
    !/^[A-F0-9]{8}$/.test(
        roomCode
    )
) {

    console.error(
        "Codigo de sala invalido:",
        roomCode
    );

}

document.getElementById(
    "roomCode"
).textContent =
    roomCode;


const stage =
    document.getElementById(
        "stage"
    );


const mainVideo =
    document.getElementById(
        "mainVideo"
    );


const stageEmpty =
    document.getElementById(
        "stageEmpty"
    );


const mainLabel =
    document.getElementById(
        "mainLabel"
    );


const liveBadge =
    document.getElementById(
        "liveBadge"
    );


const videoControls =
    document.getElementById(
        "videoControls"
    );


const audioButton =
    document.getElementById(
        "audioButton"
    );


const fullscreenButton =
    document.getElementById(
        "fullscreenButton"
    );


const peopleElement =
    document.getElementById(
        "people"
    );


const streamStrip =
    document.getElementById(
        "streamStrip"
    );


const shareButton =
    document.getElementById(
        "share"
    );


const stopButton =
    document.getElementById(
        "stop"
    );


const statusElement =
    document.getElementById(
        "status"
    );


const profileOverlay =
    document.getElementById(
        "profileOverlay"
    );


// =====================================================
// DADOS
// =====================================================

let profile = null;


// =====================================================
// DISCORD AVATAR V1
// =====================================================

function isDiscordAvatarUrl(
    value
) {

    return (
        typeof value === "string" &&
        /^https:\/\/cdn\.discordapp\.com\//i.test(
            value
        )
    );

}


function renderUserAvatar(
    container,
    avatarValue,
    fallback = "😎"
) {

    if (!container) {
        return;
    }


    container.textContent =
        "";


    if (
        isDiscordAvatarUrl(
            avatarValue
        )
    ) {

        const img =
            document.createElement(
                "img"
            );


        img.src =
            avatarValue;


        img.alt =
            "Avatar do Discord";


        img.loading =
            "lazy";


        img.referrerPolicy =
            "no-referrer";


        img.style.width =
            "100%";


        img.style.height =
            "100%";


        img.style.objectFit =
            "cover";


        img.style.borderRadius =
            "inherit";


        container.appendChild(
            img
        );


        return;

    }


    container.textContent =
        avatarValue ||
        fallback;

}

let localStream = null;

let currentMainOwner = null;

let audioMuted = true;


const participants =
    new Map();


const streams =
    new Map();


const outboundPeers =
    new Map();


const inboundPeers =
    new Map();


const outboundIce =
    new Map();


const inboundIce =
    new Map();


// =====================================================
// WEBRTC
// =====================================================

const rtcConfig = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        },

        {
            urls:
                "stun:stun1.l.google.com:19302"
        }

    ]

};


// =====================================================
// PERFIL
// =====================================================

function loadProfile() {

    try {

        const saved =
            sessionStorage.getItem(
                "leal_profile"
            );


        if (!saved) {

            profileOverlay.style.display =
                "flex";

            return;

        }


        profile =
            JSON.parse(saved);


        joinRoom();


    } catch {

        profileOverlay.style.display =
            "flex";

    }

}


let selectedAvatar =
    "😎";


document
    .querySelectorAll(
        ".profile-avatar"
    )
    .forEach(button => {

        button.onclick =
            () => {

                document
                    .querySelectorAll(
                        ".profile-avatar"
                    )
                    .forEach(item => {

                        item.classList.remove(
                            "selected"
                        );

                    });


                button.classList.add(
                    "selected"
                );


                selectedAvatar =
                    button.dataset.avatar ||
                    button.textContent.trim();

            };

    });


document.getElementById(
    "enterRoom"
).onclick =
    () => {

        const name =
            document
                .getElementById(
                    "profileName"
                )
                .value
                .trim();


        if (!name) {

            alert(
                "Digite seu nome."
            );

            return;

        }


        profile = {

            name:
                name.substring(
                    0,
                    24
                ),

            avatar:
                selectedAvatar

        };


        sessionStorage.setItem(
            "leal_profile",
            JSON.stringify(
                profile
            )
        );


        profileOverlay.style.display =
            "none";


        joinRoom();

    };


// =====================================================
// ENTRAR NA SALA
// =====================================================

let joined = false;


// =====================================================
// RECONNECT V1
// =====================================================

let reconnectingRoom =
    false;

let reconnectGeneration =
    0;


/* RECONNECT V1 FIX */

let pendingReconnectRepair =
    false;

let reconnectRepairTimer =
    null;


function closePeerMap(
    peerMap,
    iceMap
) {

    peerMap.forEach(
        peer => {

            try {
                peer.close();
            } catch {}

        }
    );

    peerMap.clear();

    if (iceMap) {
        iceMap.clear();
    }

}


function resetPeersForReconnect() {

    closePeerMap(
        outboundPeers,
        outboundIce
    );

    closePeerMap(
        inboundPeers,
        inboundIce
    );

}


function repairOutboundPeers() {

    if (
        !localStream ||
        !socket.connected ||
        !joined
    ) {

        return;

    }


    clearTimeout(
        reconnectRepairTimer
    );


    reconnectRepairTimer =
        setTimeout(
            () => {

                participants.forEach(
                    user => {

                        if (
                            user.id !==
                            socket.id
                        ) {

                            startOutbound(
                                user.id
                            ).catch(
                                () => {}
                            );

                        }

                    }
                );

            },
            350
        );

}


// Evita que uma falha antiga de peer
// reinicie uma conexao que ja foi substituida.
function watchOutboundPeer(
    peer,
    targetId
) {

    const generation =
        reconnectGeneration;


    let recoveryTimer =
        null;


    const recover =
        () => {

            if (
                generation !==
                reconnectGeneration
            ) {

                return;

            }


            if (
                !socket.connected ||
                !joined ||
                !localStream
            ) {

                return;

            }


            clearTimeout(
                recoveryTimer
            );


            recoveryTimer =
                setTimeout(
                    () => {

                        if (
                            outboundPeers.get(
                                targetId
                            ) !==
                            peer
                        ) {

                            return;

                        }


                        startOutbound(
                            targetId
                        ).catch(
                            () => {}
                        );

                    },
                    1200
                );

        };


    peer.addEventListener(
        "connectionstatechange",
        () => {

            const state =
                peer.connectionState;


            if (
                state === "failed"
            ) {

                recover();

            }


            if (
                state === "connected"
            ) {

                clearTimeout(
                    recoveryTimer
                );

            }

        }
    );


    peer.addEventListener(
        "iceconnectionstatechange",
        () => {

            const state =
                peer.iceConnectionState;


            if (
                state === "failed"
            ) {

                recover();

            }

        }
    );

}


function joinRoom() {

    if (
        joined ||
        !profile ||
        !socket.connected
    ) {

        return;

    }


    joined = true;


    socket.emit(
        "join-room",
        {

            roomCode,

            profile,

            hostToken: sessionStorage.getItem(`hl_host_token_${roomCode}`) || "",

            trustToken: new URLSearchParams(location.search).get("trust") || ""

        }
    );

}


// Lobby seletivo V8: captura o estado antes da camada visual carregar.
socket.on("room:waiting", data => {
    joined = false;
    window.HLRoomWaitingState = data || {};
    window.dispatchEvent(new CustomEvent("hl:room-waiting", { detail: data || {} }));
});

socket.on("room:approval", data => {
    window.HLRoomWaitingState = null;
    window.dispatchEvent(new CustomEvent("hl:room-approval", { detail: data || {} }));
    if (data?.approved) {
        joined = false;
        setTimeout(() => joinRoom(), 40);
    } else {
        joined = false;
    }
});

// =====================================================
// SOCKET
// =====================================================

socket.on(
    "connect",
    () => {

        const wasReconnecting =
            reconnectingRoom;


        pendingReconnectRepair =
            wasReconnecting;


        statusElement.textContent =
            wasReconnecting
                ? "🟡 Reconectando à sala..."
                : "🟢 Conectado";


        // O Socket.IO recebe um novo socket.id
        // depois de uma reconexao.
        // Precisamos permitir novo join-room.
        joined =
            false;


        reconnectGeneration +=
            1;


        resetPeersForReconnect();


        joinRoom();


        reconnectingRoom =
            false;


        setTimeout(
            () => {

                if (
                    socket.connected &&
                    joined
                ) {

                    statusElement.textContent =
                        wasReconnecting
                            ? "🟢 Reconectado"
                            : "🟢 Conectado";

                }

            },
            500
        );

    }
);


socket.on(
    "disconnect",
    reason => {

        if (
            leavingRoom
        ) {

            return;

        }


        reconnectingRoom =
            true;

        joined =
            false;


        statusElement.textContent =
            "🟠 Conexão perdida. Reconectando...";


        resetPeersForReconnect();


        console.warn(
            "Socket desconectado:",
            reason
        );

    }
);


socket.on(
    "connect_error",
    error => {

        if (
            leavingRoom
        ) {

            return;

        }


        reconnectingRoom =
            true;


        statusElement.textContent =
            "🔴 Falha de conexão. Tentando novamente...";


        console.warn(
            "Erro de conexão:",
            error?.message ||
            error
        );

    }
);


window.addEventListener(
    "online",
    () => {

        if (
            !socket.connected &&
            !leavingRoom
        ) {

            statusElement.textContent =
                "🟡 Internet voltou. Reconectando...";


            try {
                socket.connect();
            } catch {}

        }

    }
);


window.addEventListener(
    "offline",
    () => {

        if (
            leavingRoom
        ) {

            return;

        }


        statusElement.textContent =
            "🔴 Sem internet • reconexão automática ativa";

    }
);


// =====================================================
// PARTICIPANTES
// =====================================================

socket.on(
    "participants-update",
    list => {

        participants.clear();


        list.forEach(
            user => {

                participants.set(
                    user.id,
                    user
                );

            }
        );


        renderParticipants();


        if (
            pendingReconnectRepair &&
            localStream &&
            socket.connected &&
            joined
        ) {

            pendingReconnectRepair =
                false;

            repairOutboundPeers();

        }


        if (
            currentMainOwner
        ) {

            updateMainLabel();

        }

    }
);


function renderParticipants() {

    peopleElement.innerHTML =
        "";


    participants.forEach(
        user => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "person";


            if (
                user.streaming
            ) {

                card.classList.add(
                    "streaming"
                );

            }


            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "avatar";


            renderUserAvatar(
                avatar,
                user.avatar
            );


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "person-info";


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "person-name";


            name.textContent =
                user.name +
                (
                    user.id ===
                    socket.id
                        ? " (você)"
                        : ""
                );


            const personStatus =
                document.createElement(
                    "div"
                );


            personStatus.className =
                "person-status";


            personStatus.textContent =
                user.streaming
                    ? "● AO VIVO"
                    : "● Online";


            info.appendChild(
                name
            );


            info.appendChild(
                personStatus
            );


            card.appendChild(
                avatar
            );


            card.appendChild(
                info
            );


            if (
                user.streaming
            ) {

                card.onclick =
                    () => {

                        if (
                            streams.has(
                                user.id
                            )
                        ) {

                            selectMainStream(
                                user.id
                            );

                        }

                    };

            }


            peopleElement.appendChild(
                card
            );

        }
    );

}


// =====================================================
// STREAM VISUAL
// =====================================================

function addStream(
    ownerId,
    stream
) {

    streams.set(
        ownerId,
        stream
    );


    renderStreamStrip();


    if (
        !currentMainOwner ||
        !streams.has(
            currentMainOwner
        )
    ) {

        selectMainStream(
            ownerId
        );

    }

}


function removeStream(
    ownerId
) {

    streams.delete(
        ownerId
    );


    renderStreamStrip();


    if (
        currentMainOwner ===
        ownerId
    ) {

        const next =
            streams.keys()
                .next()
                .value;


        if (next) {

            selectMainStream(
                next
            );

        } else {

            clearMainStage();

        }

    }

}


function clearMainStage() {

    currentMainOwner =
        null;


    mainVideo.srcObject =
        null;


    mainVideo.style.display =
        "none";


    stageEmpty.style.display =
        "block";


    mainLabel.style.display =
        "none";


    liveBadge.style.display =
        "none";


    videoControls.style.display =
        "none";

}


function updateMainLabel() {

    if (
        !currentMainOwner
    ) {

        return;

    }


    const user =
        participants.get(
            currentMainOwner
        );


    mainLabel.textContent =
        user?.name ||
        "Usuário";

}


function updateAudioControls(
    ownerId,
    stream
) {

    const isOwn =
        ownerId ===
        socket.id;


    const hasAudio =
        stream
            .getAudioTracks()
            .length > 0;


    if (
        isOwn ||
        !hasAudio
    ) {

        mainVideo.muted =
            true;


        audioMuted =
            true;


        audioButton.textContent =
            "🔇";


        audioButton.disabled =
            true;


        audioButton.title =
            isOwn
                ? "Sua própria transmissão fica muda"
                : "Esta transmissão não possui áudio";


        return;

    }


    audioButton.disabled =
        false;


    mainVideo.muted =
        audioMuted;


    audioButton.textContent =
        audioMuted
            ? "🔇"
            : "🔊";


    audioButton.title =
        audioMuted
            ? "Ativar áudio"
            : "Mutar áudio";

}


function selectMainStream(
    ownerId
) {

    const stream =
        streams.get(
            ownerId
        );


    if (!stream) {
        return;
    }


    currentMainOwner =
        ownerId;


    mainVideo.srcObject =
        stream;


    mainVideo.style.display =
        "block";


    stageEmpty.style.display =
        "none";


    liveBadge.style.display =
        "block";


    mainLabel.style.display =
        "block";


    videoControls.style.display =
        "flex";


    updateMainLabel();


    updateAudioControls(
        ownerId,
        stream
    );


    mainVideo.play()
        .catch(() => {

            statusElement.textContent =
                "Clique no botão de áudio para reproduzir.";

        });


    renderStreamStrip();

}


// =====================================================
// AUDIO
// =====================================================

audioButton.onclick =
    async () => {

        if (
            audioButton.disabled ||
            !currentMainOwner
        ) {

            return;

        }


        audioMuted =
            !audioMuted;


        mainVideo.muted =
            audioMuted;


        audioButton.textContent =
            audioMuted
                ? "🔇"
                : "🔊";


        audioButton.title =
            audioMuted
                ? "Ativar áudio"
                : "Mutar áudio";


        if (!audioMuted) {

            try {

                await mainVideo.play();

                statusElement.textContent =
                    "🔊 Áudio ativado";

            } catch {

                statusElement.textContent =
                    "O navegador bloqueou o áudio.";

            }

        } else {

            statusElement.textContent =
                "🔇 Áudio mutado";

        }

    };


// =====================================================
// TELA CHEIA
// =====================================================

fullscreenButton.onclick =
    async () => {

        try {

            if (
                document.fullscreenElement
            ) {

                await document
                    .exitFullscreen();

                return;

            }


            await stage
                .requestFullscreen();

        } catch (error) {

            console.error(
                "Erro tela cheia:",
                error
            );

        }

    };


document.addEventListener(
    "fullscreenchange",
    () => {

        fullscreenButton.textContent =
            document.fullscreenElement
                ? "✕"
                : "⛶";

    }
);


// =====================================================
// THUMBNAILS
// =====================================================

function renderStreamStrip() {

    streamStrip.innerHTML =
        "";


    if (
        streams.size <= 1
    ) {

        streamStrip.style.display =
            "none";

        return;

    }


    streamStrip.style.display =
        "flex";


    streams.forEach(
        (stream, ownerId) => {

            const thumb =
                document.createElement(
                    "div"
                );


            thumb.className =
                "stream-thumb";


            if (
                ownerId ===
                currentMainOwner
            ) {

                thumb.classList.add(
                    "active"
                );

            }


            const video =
                document.createElement(
                    "video"
                );


            video.autoplay =
                true;


            video.playsInline =
                true;


            video.muted =
                true;


            video.srcObject =
                stream;


            const user =
                participants.get(
                    ownerId
                );


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "thumb-name";


            name.textContent =
                user?.name ||
                "Usuário";


            thumb.appendChild(
                video
            );


            thumb.appendChild(
                name
            );


            thumb.onclick =
                () => {

                    selectMainStream(
                        ownerId
                    );

                };


            streamStrip.appendChild(
                thumb
            );


            video.play()
                .catch(
                    () => {}
                );

        }
    );

}


// =====================================================
// ICE QUEUE
// =====================================================

function queueCandidate(
    map,
    key,
    candidate
) {

    if (
        !map.has(key)
    ) {

        map.set(
            key,
            []
        );

    }


    map.get(key)
        .push(candidate);

}


async function flushCandidates(
    map,
    key,
    peer
) {

    const list =
        map.get(key) ||
        [];


    for (
        const candidate
        of list
    ) {

        try {

            await peer.addIceCandidate(
                candidate
            );

        } catch {}

    }


    map.delete(
        key
    );

}


// =====================================================
// OUTBOUND
// =====================================================

async function startOutbound(
    targetId
) {

    if (
        !localStream ||
        targetId === socket.id
    ) {

        return;

    }


    if (
        outboundPeers.has(
            targetId
        )
    ) {

        try {

            outboundPeers
                .get(targetId)
                .close();

        } catch {}


        outboundPeers.delete(
            targetId
        );

    }


    const peer =
        new RTCPeerConnection(
            rtcConfig
        );


    outboundPeers.set(
        targetId,
        peer
    );


    watchOutboundPeer(
        peer,
        targetId
    );


    localStream
        .getTracks()
        .forEach(
            track => {

                const sender =
                    peer.addTrack(
                        track,
                        localStream
                    );

                if (track.kind === "video") {

                    try {

                        const parameters =
                            sender.getParameters();

                        if (
                            !parameters.encodings ||
                            parameters.encodings.length === 0
                        ) {
                            parameters.encodings = [{}];
                        }

                        const qualityProfile =
                            getQualityProfile();

                        parameters.encodings[0].maxBitrate =
                            qualityProfile.bitrate;

                        parameters.encodings[0].maxFramerate =
                            qualityProfile.fps;

                        parameters.degradationPreference =
                            qualityProfile.auto
                                ? "balanced"
                                : "maintain-resolution";

                        sender
                            .setParameters(parameters)
                            .catch(() => {});

                    } catch {}

                }

            }
        );


    peer.onicecandidate =
        event => {

            if (
                !event.candidate
            ) {

                return;

            }


            socket.emit(
                "ice-candidate",
                {

                    target:
                        targetId,

                    flowId:
                        socket.id,

                    candidate:
                        event.candidate

                }
            );

        };


    const offer =
        await peer.createOffer();


    await peer.setLocalDescription(
        offer
    );


    socket.emit(
        "offer",
        {

            target:
                targetId,

            flowId:
                socket.id,

            offer:
                peer.localDescription

        }
    );

}


// =====================================================
// OFERTA RECEBIDA
// =====================================================

socket.on(
    "offer",
    async data => {

        const ownerId =
            data.flowId ||
            data.sender;


        if (
            inboundPeers.has(
                ownerId
            )
        ) {

            try {

                inboundPeers
                    .get(ownerId)
                    .close();

            } catch {}

        }


        const peer =
            new RTCPeerConnection(
                rtcConfig
            );


        inboundPeers.set(
            ownerId,
            peer
        );


        peer.ontrack =
            event => {

                let stream =
                    event.streams?.[0];


                if (!stream) {

                    stream =
                        streams.get(
                            ownerId
                        ) ||
                        new MediaStream();


                    stream.addTrack(
                        event.track
                    );

                }


                addStream(
                    ownerId,
                    stream
                );

            };


        peer.onicecandidate =
            event => {

                if (
                    !event.candidate
                ) {

                    return;

                }


                socket.emit(
                    "ice-candidate",
                    {

                        target:
                            data.sender,

                        flowId:
                            ownerId,

                        candidate:
                            event.candidate

                    }
                );

            };


        try {

            await peer.setRemoteDescription(
                new RTCSessionDescription(
                    data.offer
                )
            );


            await flushCandidates(
                inboundIce,
                ownerId,
                peer
            );


            const answer =
                await peer.createAnswer();


            await peer.setLocalDescription(
                answer
            );


            socket.emit(
                "answer",
                {

                    target:
                        data.sender,

                    flowId:
                        ownerId,

                    answer:
                        peer.localDescription

                }
            );


        } catch (error) {

            console.error(
                "Erro na oferta:",
                error
            );

        }

    }
);


// =====================================================
// ANSWER
// =====================================================

socket.on(
    "answer",
    async data => {

        if (
            data.flowId !==
            socket.id
        ) {

            return;

        }


        const peer =
            outboundPeers.get(
                data.sender
            );


        if (!peer) {
            return;
        }


        try {

            await peer.setRemoteDescription(
                new RTCSessionDescription(
                    data.answer
                )
            );


            await flushCandidates(
                outboundIce,
                data.sender,
                peer
            );


        } catch (error) {

            console.error(
                "Erro na resposta:",
                error
            );

        }

    }
);


// =====================================================
// ICE
// =====================================================

socket.on(
    "ice-candidate",
    async data => {

        const candidate =
            new RTCIceCandidate(
                data.candidate
            );


        if (
            data.flowId ===
            socket.id
        ) {

            const peer =
                outboundPeers.get(
                    data.sender
                );


            if (
                !peer ||
                !peer.remoteDescription
            ) {

                queueCandidate(
                    outboundIce,
                    data.sender,
                    candidate
                );

                return;

            }


            try {

                await peer.addIceCandidate(
                    candidate
                );

            } catch {}


            return;

        }


        const ownerId =
            data.flowId;


        const peer =
            inboundPeers.get(
                ownerId
            );


        if (
            !peer ||
            !peer.remoteDescription
        ) {

            queueCandidate(
                inboundIce,
                ownerId,
                candidate
            );

            return;

        }


        try {

            await peer.addIceCandidate(
                candidate
            );

        } catch {}

    }
);


// =====================================================
// NOVO USUÁRIO
// =====================================================

socket.on(
    "user-joined",
    user => {

        if (
            localStream
        ) {

            startOutbound(
                user.id
            );

        }

    }
);


// =====================================================
// USUÁRIO SAIU
// =====================================================

socket.on(
    "user-left",
    userId => {

        if (
            outboundPeers.has(
                userId
            )
        ) {

            try {

                outboundPeers
                    .get(userId)
                    .close();

            } catch {}


            outboundPeers.delete(
                userId
            );

        }


        if (
            inboundPeers.has(
                userId
            )
        ) {

            try {

                inboundPeers
                    .get(userId)
                    .close();

            } catch {}


            inboundPeers.delete(
                userId
            );

        }


        removeStream(
            userId
        );

    }
);


// =====================================================
// OUTRA PESSOA PAROU
// =====================================================

socket.on(
    "stream-stopped",
    ownerId => {

        if (
            inboundPeers.has(
                ownerId
            )
        ) {

            try {

                inboundPeers
                    .get(ownerId)
                    .close();

            } catch {}


            inboundPeers.delete(
                ownerId
            );

        }


        removeStream(
            ownerId
        );

    }
);


// =====================================================
// COMPARTILHAR TELA + ÁUDIO
// SHARE BRIDGE BUTTON V1
// =====================================================

shareButton.onclick =
    () => {

        const shareUrl =
            location.origin +
            "/share/" +
            encodeURIComponent(
                roomCode
            );


        statusElement.textContent =
            "Abrindo transmissor no navegador...";


        const externalWindow =
            window.open(
                shareUrl,
                "_blank",
                "noopener,noreferrer"
            );


        if (
            externalWindow
        ) {

            statusElement.textContent =
                "🟢 Transmissor aberto no navegador";

            return;

        }


        // Caso o Discord bloqueie popup,
        // deixamos a URL disponível.
        statusElement.textContent =
            "Abra no navegador: " +
            shareUrl;

    };


// =====================================================
// PARAR DA ACTIVITY
// =====================================================

// =====================================================
// PARAR SOMENTE MINHA TRANSMISSÃO
// =====================================================

function stopSharing() {

    if (!localStream) {
        return;
    }


    const oldStream =
        localStream;


    localStream =
        null;


    oldStream
        .getTracks()
        .forEach(
            track => {

                track.onended =
                    null;

                track.stop();

            }
        );


    outboundPeers.forEach(
        peer => {

            try {

                peer.close();

            } catch {}

        }
    );


    outboundPeers.clear();


    outboundIce.clear();


    // NÃO mexer nas transmissões
    // que você está recebendo.

    removeStream(
        socket.id
    );


    socket.emit(
        "stream-stopped"
    );


    shareButton.style.display =
        "inline-block";


    stopButton.style.display =
        "none";


    statusElement.textContent =
        "Você parou sua transmissão";

}


stopButton.onclick =
    stopSharing;


// =====================================================
// CONVITE - CODIGO DA SALA V1
// =====================================================

document.getElementById(
    "copy"
).onclick =
    async () => {

        const copyButton =
            document.getElementById(
                "copy"
            );

        try {

            await navigator
                .clipboard
                .writeText(
                    roomCode
                );

            statusElement.textContent =
                "✅ Código copiado: " +
                roomCode;

            copyButton.textContent =
                "✅ Código copiado!";

            copyButton.classList.add(
                "copied"
            );

            clearTimeout(
                copyButton._copiedTimer
            );

            copyButton._copiedTimer =
                setTimeout(
                    () => {

                        copyButton.textContent =
                            "🔗 Convite";

                        copyButton.classList.remove(
                            "copied"
                        );

                    },
                    1800
                );

        } catch {

            statusElement.textContent =
                "Código da sala: " +
                roomCode;

        }

    };


// =====================================================
// SAIR
// =====================================================


// =====================================================
// LIMPEZA COMPLETA AO SAIR
// =====================================================

let leavingRoom = false;

function cleanupRoomBeforeExit() {

    if (leavingRoom) {
        return;
    }

    leavingRoom = true;


    // Para minha transmissao
    if (localStream) {

        const oldStream =
            localStream;

        localStream =
            null;

        oldStream
            .getTracks()
            .forEach(track => {

                track.onended =
                    null;

                try {
                    track.stop();
                } catch {}

            });

    }


    // Fecha conexoes de envio
    outboundPeers.forEach(peer => {

        try {
            peer.close();
        } catch {}

    });

    outboundPeers.clear();
    outboundIce.clear();


    // Fecha conexoes recebidas
    inboundPeers.forEach(peer => {

        try {
            peer.close();
        } catch {}

    });

    inboundPeers.clear();
    inboundIce.clear();


    // Limpa os streams locais da interface
    streams.clear();

    currentMainOwner =
        null;


    if (socket.connected) {

        try {
            socket.emit(
                "stream-stopped"
            );
        } catch {}

        try {
            socket.disconnect();
        } catch {}

    }

}


// Fechou aba, Activity ou navegou para outra pagina
window.addEventListener(
    "pagehide",
    cleanupRoomBeforeExit
);

window.addEventListener(
    "beforeunload",
    cleanupRoomBeforeExit
);


// =====================================================
// SAIR
// =====================================================

document.getElementById(
    "leave"
).onclick =
    () => {

        cleanupRoomBeforeExit();

        sessionStorage.setItem(
            "hl_activity_returning",
            "1"
        );


        if (
            window.history.length > 1
        ) {

            window.history.back();

            return;

        }


        // Fallback caso o historico nao esteja disponivel
        const activityParams =
            new URLSearchParams(
                window.location.search
            );

        activityParams.delete(
            "room"
        );

        const query =
            activityParams.toString();

        window.location.href =
            "/activity.html" +
            (query ? "?" + query : "");

    };


// =====================================================
// CARREGAR PERFIL
// =====================================================

loadProfile();
