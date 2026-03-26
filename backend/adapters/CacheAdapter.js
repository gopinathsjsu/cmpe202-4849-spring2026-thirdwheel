// Adapter pattern: in-memory LRU for single-node, Redis for multi-node.
// Read-through proxy used in EventService for hot list/detail.

class InMemoryCache {
    constructor(maxEntries = 500, defaultTtlMs = 30_000) {
        this.max = maxEntries;
        this.ttl = defaultTtlMs;
        this.map = new Map();
    }
    _evict() {
        while (this.map.size > this.max) {
            const firstKey = this.map.keys().next().value;
            this.map.delete(firstKey);
        }
    }
    async get(key) {
        const entry = this.map.get(key);
        if (!entry) return null;
        if (entry.exp < Date.now()) { this.map.delete(key); return null; }
        this.map.delete(key); this.map.set(key, entry);
        return entry.value;
    }
    async set(key, value, ttlMs = this.ttl) {
        this.map.set(key, { value, exp: Date.now() + ttlMs });
        this._evict();
    }
    async del(prefix) {
        for (const k of this.map.keys()) if (k.startsWith(prefix)) this.map.delete(k);
    }
}

class RedisCache {
    constructor(client) { this.client = client; this.defaultTtl = 30; }
    async get(key) {
        const v = await this.client.get(key);
        return v ? JSON.parse(v) : null;
    }
    async set(key, value, ttlMs = this.defaultTtl * 1000) {
        await this.client.set(key, JSON.stringify(value), { EX: Math.floor(ttlMs / 1000) });
    }
    async del(prefix) {
        const stream = this.client.scanIterator({ MATCH: `${prefix}*`, COUNT: 100 });
        for await (const key of stream) await this.client.del(key);
    }
}

let cache = null;
function getCache() {
    if (cache) return cache;
    if (process.env.REDIS_URL) {
        try {
            const { createClient } = require('redis');
            const client = createClient({ url: process.env.REDIS_URL });
            client.on('error', (e) => console.error('Redis error:', e));
            client.connect().catch(e => console.error('Redis connect failed:', e));
            cache = new RedisCache(client);
        } catch (err) {
            console.warn('redis lib missing, falling back to in-memory cache');
            cache = new InMemoryCache();
        }
    } else {
        cache = new InMemoryCache();
    }
    return cache;
}

module.exports = { getCache };
