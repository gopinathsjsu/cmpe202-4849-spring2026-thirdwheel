// Per-email login throttle layered on top of the global rate limiter.
const attempts = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX = 5;

module.exports = function loginThrottle(req, res, next) {
    const email = (req.body && req.body.email) || '';
    if (!email) return next();
    const now = Date.now();
    const rec = attempts.get(email) || { count: 0, first: now };
    if (now - rec.first > WINDOW_MS) { rec.count = 0; rec.first = now; }
    rec.count++;
    attempts.set(email, rec);
    if (rec.count > MAX) return res.status(429).json({ error: 'Too many login attempts' });
    next();
};
