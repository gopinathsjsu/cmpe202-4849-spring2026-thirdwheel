// Thin wrapper around jsonwebtoken so routes don't import the SDK directly.
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const TTL = process.env.JWT_TTL || '7d';

function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: TTL }); }
function verify(token) { return jwt.verify(token, SECRET); }

module.exports = { sign, verify };
