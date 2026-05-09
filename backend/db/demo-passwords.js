// Idempotent reset of team demo-account passwords to email-as-password.
// Runs in Node (uses bcryptjs) because Cloud SQL `zestify` user lacks
// CREATE EXTENSION pgcrypto permission, so the SQL-side crypt() approach
// silently fails on prod. Called after migrate() at every container boot.

const bcrypt = require('bcryptjs');
const { query } = require('./pool');

const TEAM_ACCOUNTS = [
    'kalharpatel10@gmail.com',
    'nihardharmeshkumar.patel@sjsu.edu',
    'sohamrajjain0007@gmail.com',
];

async function resetDemoPasswords() {
    for (const email of TEAM_ACCOUNTS) {
        try {
            const row = await query('SELECT password FROM users WHERE email = $1', [email]);
            if (!row.rows.length) continue;
            const current = row.rows[0].password;
            // Skip if current hash already verifies against email — avoids re-hashing on every boot.
            if (current && bcrypt.compareSync(email, current)) continue;
            const hash = bcrypt.hashSync(email, 10);
            await query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
            console.log(`[demo-passwords] reset password for ${email}`);
        } catch (err) {
            console.error(`[demo-passwords] failed for ${email}:`, err.message);
        }
    }
}

module.exports = { resetDemoPasswords };
