function normalizeIp(value) {
    const ip = String(value || "").trim();
    if (!ip) return "unknown";
    return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function extractClientIp(headers = {}, remoteAddress = "") {
    // O app usa trust proxy = 1. Atrás de um único proxy confiável, o hop
    // imediatamente anterior ao proxy é o ÚLTIMO valor de X-Forwarded-For.
    // Usar o primeiro valor permite que um prefixo forjado pelo cliente
    // contorne o limite de conexões quando o proxy preserva a cadeia.
    const forwarded = String(headers["x-forwarded-for"] || "")
        .split(",")
        .map(part => part.trim())
        .filter(Boolean);
    const candidate = forwarded.length ? forwarded[forwarded.length - 1] : remoteAddress;
    return normalizeIp(candidate);
}

function createSocketConnectionGuard({ maxPerIp = 12 } = {}) {
    const activeByIp = new Map();

    function ipOf(socket) {
        return extractClientIp(socket.handshake?.headers || {}, socket.handshake?.address || "");
    }

    function middleware(socket, next) {
        const ip = ipOf(socket);
        const current = activeByIp.get(ip) || 0;
        if (current >= maxPerIp) return next(new Error("Muitas conexões simultâneas deste endereço."));
        activeByIp.set(ip, current + 1);
        socket.data.securityIp = ip;
        socket.once("disconnect", () => {
            const left = Math.max(0, (activeByIp.get(ip) || 1) - 1);
            if (left === 0) activeByIp.delete(ip); else activeByIp.set(ip, left);
        });
        next();
    }

    return { middleware, activeByIp, ipOf };
}

module.exports = { createSocketConnectionGuard, extractClientIp, normalizeIp };
