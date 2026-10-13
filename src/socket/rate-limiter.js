const DEFAULT_POLICIES = Object.freeze({
    "generic": { max: 180, windowMs: 10000 },
    "room:join": { max: 8, windowMs: 15000 },
    "social:state": { max: 12, windowMs: 10000 },
    "chat:history": { max: 12, windowMs: 10000 },
    "diagnostics:ping": { max: 20, windowMs: 10000 },
    "presence:update": { max: 12, windowMs: 10000 },
    "chat:send": { max: 18, windowMs: 10000 },
    "chat:edit": { max: 14, windowMs: 10000 },
    "chat:react": { max: 20, windowMs: 10000 },
    "chat:typing": { max: 30, windowMs: 10000 },
    "reaction:send": { max: 14, windowMs: 10000 },
    "sound:play": { max: 8, windowMs: 10000 },
    "moderation": { max: 12, windowMs: 10000 },
    "voice:state": { max: 30, windowMs: 10000 },
    "voice:speaking": { max: 24, windowMs: 10000 },
    "voice:signal": { max: 180, windowMs: 10000 },
    "stream:signal": { max: 220, windowMs: 10000 }
});

function createSocketRateLimiter({ maxEvents = 180, windowMs = 10000, policies = DEFAULT_POLICIES } = {}) {
    function allowBucket(socket, key, policy) {
        const now = Date.now();
        socket.data.rateBuckets ||= Object.create(null);
        let bucket = socket.data.rateBuckets[key];
        if (!bucket || now - bucket.startedAt >= policy.windowMs) {
            bucket = { startedAt: now, count: 0 };
            socket.data.rateBuckets[key] = bucket;
        }
        bucket.count += 1;
        return bucket.count <= policy.max;
    }

    function allowSocketEvent(socket, eventName = "generic") {
        const genericPolicy = { max: maxEvents, windowMs };
        if (!allowBucket(socket, "__global", genericPolicy)) return false;
        const policy = policies[eventName];
        if (!policy) return true;
        return allowBucket(socket, eventName, policy);
    }

    return { allowSocketEvent };
}

module.exports = { createSocketRateLimiter, DEFAULT_POLICIES };
