function createSocketConnectionGuard({ maxPerIp = 12 } = {}) {
    const activeByIp = new Map();

    function ipOf(socket) {
        const forwarded = String(socket.handshake.headers["x-forwarded-for"] || "").split(",")[0].trim();
        return forwarded || socket.handshake.address || "unknown";
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

    return { middleware, activeByIp };
}

module.exports = { createSocketConnectionGuard };
