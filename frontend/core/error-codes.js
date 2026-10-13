(() => {
  "use strict";
  window.HLErrorMessages = Object.freeze({
    ROOM_NOT_FOUND: "Essa sala não existe mais.",
    ROOM_FULL: "A sala atingiu o limite de participantes.",
    ROOM_LOCKED: "A sala está trancada pelo host.",
    ROOM_PASSWORD_INVALID: "A senha informada está incorreta.",
    ROOM_BANNED: "Esta identidade foi bloqueada nesta sala.",
    MIC_PERMISSION_DENIED: "Permita o acesso ao microfone para entrar no voz.",
    MIC_NOT_FOUND: "Nenhum microfone disponível foi encontrado.",
    VOICE_CONNECT_FAILED: "Não foi possível conectar ao voz.",
    SCREEN_SHARE_CANCELLED: "Compartilhamento cancelado.",
    SCREEN_SHARE_FAILED: "Não foi possível iniciar o compartilhamento.",
    INVITE_EXPIRED: "Esse convite expirou.",
    INVITE_INVALID: "Esse convite não é válido.",
    SOUND_TOO_LARGE: "O áudio ultrapassa o limite permitido.",
    SOUND_INVALID: "O arquivo de áudio não é válido.",
    SOUND_FORBIDDEN: "Você não tem permissão para usar esse som."
  });
  window.HLErrorMessage = (code, fallback = "Ocorreu um erro.") => window.HLErrorMessages[code] || fallback;
})();
