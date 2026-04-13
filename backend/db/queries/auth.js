// Centralized SQL fragments for the auth domain.
module.exports = {
    findUserByEmail: 'SELECT id, name, email, password, role FROM users WHERE email = $1',
    insertUser: 'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    updateLastLogin: 'UPDATE users SET last_login_at = NOW() WHERE id = $1',
};
