const crypto = require("crypto");

function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("base64url");
}

function hashToken(value) {
    return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

function safeTokenMatch(rawValue, expectedHash) {
    if (!rawValue || !expectedHash) return false;
    const actual = Buffer.from(hashToken(rawValue), "hex");
    const expected = Buffer.from(String(expectedHash), "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}


function hashPassword(value) {
    const raw = String(value || "");
    if (!raw) return null;
    const salt = crypto.randomBytes(16);
    const derived = crypto.scryptSync(raw, salt, 32);
    return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function safePasswordMatch(rawValue, encoded) {
    const value = String(rawValue || "");
    const stored = String(encoded || "");
    if (!value || !stored) return false;
    if (!stored.startsWith("scrypt$")) return safeTokenMatch(value, stored);
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    try {
        const salt = Buffer.from(parts[1], "base64url");
        const expected = Buffer.from(parts[2], "base64url");
        const actual = crypto.scryptSync(value, salt, expected.length);
        return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    } catch { return false; }
}

function safeStringEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string" || !a || !b) return false;
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sanitizeLogValue(value, max = 120) {
    return String(value ?? "")
        .replace(/[\r\n\t]/g, " ")
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .slice(0, max);
}

module.exports = { randomToken, hashToken, safeTokenMatch, hashPassword, safePasswordMatch, safeStringEqual, sanitizeLogValue };
