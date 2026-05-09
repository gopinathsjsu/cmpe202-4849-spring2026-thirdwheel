// Password strength rules used by /api/auth/register + /api/auth/profile.
const MIN_LEN = 8;

function isStrong(password) {
    if (typeof password !== 'string' || password.length < MIN_LEN) return false;
    return /[a-z]/.test(password) && /[A-Z0-9]/.test(password);
}

function describe() {
    return `min ${MIN_LEN} chars, mix of letters + at least one uppercase or digit`;
}

module.exports = { isStrong, describe, MIN_LEN };
