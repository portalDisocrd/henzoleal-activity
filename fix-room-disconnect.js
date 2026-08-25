const fs = require("fs");

const file = "C:\\lealbot\\room.html";

let code = fs.readFileSync(file, "utf8");

if (code.includes("function cleanupRoomBeforeExit()")) {
    console.log("A LIMPEZA JA ESTA INSTALADA");
    process.exit(0);
}

const leavePattern =
/document\.getElementById\(\s*"leave"\s*\)\.onclick\s*=\s*\(\)\s*=>\s*\{\s*window\.location\.href\s*=\s*"\/";\s*\};/m;

if (!leavePattern.test(code)) {
    console.error("ERRO: botao LEAVE nao localizado");
    process.exit(1);
}

const replacement = `
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

        window.location.href =
            "/";

    };`;

code = code.replace(
    leavePattern,
    replacement
);

fs.writeFileSync(
    file,
    code,
    "utf8"
);

console.log(
    "LIMPEZA DE DESCONEXAO INSTALADA"
);
