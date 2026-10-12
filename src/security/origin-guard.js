function parseAllowedOrigins(env = process.env) {
    return new Set(
        String(env.HL_ALLOWED_ORIGINS || "")
            .split(",")
            .map(value => value.trim())
            .filter(Boolean)
            .map(value => {
                try { return new URL(value).origin; } catch { return null; }
            })
            .filter(Boolean)
    );
}

function requestOrigin(req) {
    const origin = String(req.headers.origin || "").trim();
    if (origin) {
        try { return new URL(origin).origin; } catch { return null; }
    }
    const referer = String(req.headers.referer || "").trim();
    if (referer) {
        try { return new URL(referer).origin; } catch { return null; }
    }
    return null;
}

function expectedOrigin(req) {
    const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
    const proto = forwardedProto || (req.socket?.encrypted ? "https" : "http");
    const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
    if (!host) return null;
    return `${proto}://${host}`;
}

function isTrustedOrigin(req, env = process.env) {
    const actual = requestOrigin(req);
    const expected = expectedOrigin(req);
    if (actual && expected && actual === expected) return true;

    const allowlist = parseAllowedOrigins(env);
    if (actual && allowlist.has(actual)) return true;

    // Requests sem Origin/Referer são permitidos em desenvolvimento e para health/read-only.
    if (!actual && env.NODE_ENV !== "production") return true;
    if (!actual && ["GET", "HEAD", "OPTIONS"].includes(String(req.method || "GET").toUpperCase())) return true;
    return false;
}

function createOriginGuard({ env = process.env } = {}) {
    return function originGuard(req, res, next) {
        if (isTrustedOrigin(req, env)) return next();
        return res.status(403).json({ success: false, message: "Origem da requisição não autorizada." });
    };
}

function isTrustedSocketOrigin(req, env = process.env) {
    const actual = requestOrigin(req);
    if (!actual) return env.NODE_ENV !== "production";
    const expected = expectedOrigin(req);
    if (expected && actual === expected) return true;
    return parseAllowedOrigins(env).has(actual);
}

module.exports = { createOriginGuard, isTrustedOrigin, isTrustedSocketOrigin, requestOrigin, expectedOrigin };
