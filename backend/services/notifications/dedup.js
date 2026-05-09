// Cheap in-process dedup window — suppresses duplicate notifications fired by
// the same domain event landing in two listeners. Backstop, not authoritative.

const TTL_MS = 30 * 1000;
const seen = new Map();

function _evict(now) {
    for (const [k, exp] of seen) {
        if (exp < now) seen.delete(k);
    }
}

function shouldSuppress(userId, type, link) {
    const now = Date.now();
    _evict(now);
    const key = `${userId}|${type}|${link || ''}`;
    if (seen.has(key)) return true;
    seen.set(key, now + TTL_MS);
    return false;
}

module.exports = { shouldSuppress };
