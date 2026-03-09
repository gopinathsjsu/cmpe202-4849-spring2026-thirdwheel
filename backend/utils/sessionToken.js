// Random opaque tokens for password-reset / email-verify links.
const crypto = require('crypto');

function generate(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

function hash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generate, hash };
