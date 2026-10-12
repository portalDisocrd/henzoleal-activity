const {
    ALLOWED_AVATARS
} = require("../config/constants");


function isPlainObject(value) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );

}


function normalizeText(
    value,
    maxLength
) {

    return String(
        value ?? ""
    )
        .normalize("NFKC")
        .replace(
            /[\u0000-\u001F\u007F]/g,
            ""
        )
        .trim()
        .substring(
            0,
            maxLength
        );

}


function isValidRoomCode(code) {

    return (
        typeof code === "string" &&
        /^[A-F0-9]{8}$/.test(code)
    );

}


function sanitizeRoomCode(value) {

    return normalizeText(
        value,
        8
    ).toUpperCase();

}


function sanitizeProfile(profile) {

    const name =
        normalizeText(
            profile?.name || "Usuário",
            24
        );

    const rawAvatar = String(profile?.avatar || "😎").trim();
    const isDiscordAvatar = /^https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/avatars\/[0-9]+\/[A-Za-z0-9_\-.]+(?:\?[^\s]*)?$/i.test(rawAvatar);
    const requestedAvatar = normalizeText(rawAvatar, isDiscordAvatar ? 300 : 8);
    const avatar = isDiscordAvatar || ALLOWED_AVATARS.has(requestedAvatar)
        ? requestedAvatar
        : "😎";

    return {
        name: name || "Usuário",
        avatar
    };

}


function isValidDescription(
    description,
    expectedType
) {

    if (!isPlainObject(description)) {
        return false;
    }

    if (description.type !== expectedType) {
        return false;
    }

    if (typeof description.sdp !== "string") {
        return false;
    }

    return (
        description.sdp.length > 0 &&
        description.sdp.length <= 50000
    );

}


function isValidCandidate(candidate) {

    if (!isPlainObject(candidate)) {
        return false;
    }

    if (
        typeof candidate.candidate !==
        "string"
    ) {
        return false;
    }

    return (
        candidate.candidate.length <= 5000
    );

}


function isValidFlowId(
    socket,
    targetId,
    flowId
) {

    if (typeof flowId !== "string") {
        return false;
    }

    return (
        flowId === socket.id ||
        flowId === targetId
    );

}


module.exports = {
    isPlainObject,
    normalizeText,
    isValidRoomCode,
    sanitizeRoomCode,
    sanitizeProfile,
    isValidDescription,
    isValidCandidate,
    isValidFlowId
};
