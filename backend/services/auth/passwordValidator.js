// Wraps shared password policy + returns standardised error structure for the
// auth routes layer. Keeps register/profile-update endpoints free of policy details.

const { isStrong, describe } = require('../../shared/utils/passwordPolicy');

function validatePassword(password) {
    if (!isStrong(password)) {
        return {
            ok: false,
            error: 'Password too weak.',
            requirements: describe(),
        };
    }
    return { ok: true };
}

module.exports = { validatePassword };
