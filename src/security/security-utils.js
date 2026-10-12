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

module.exports = { randomToken, hashToken, safeTokenMatch, safeStringEqual, sanitizeLogValue };
