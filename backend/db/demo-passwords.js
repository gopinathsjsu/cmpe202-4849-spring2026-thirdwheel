// Idempotent reset of team demo-account passwords to email-as-password +
// idempotent insert of dummy demo users + register them on random events.
// Runs in Node (uses bcryptjs) because Cloud SQL `zestify` user lacks
// CREATE EXTENSION pgcrypto permission, so the SQL-side crypt() approach
// silently fails on prod. Called after migrate() at every container boot.

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('./pool');

const TEAM_ACCOUNTS = [
    'kalharpatel10@gmail.com',
    'nihardharmeshkumar.patel@sjsu.edu',
    'sohamrajjain0007@gmail.com',
];

const DUMMY_USERS = [
    ['Priya Sharma', 'priya@zestify.com', 'attendee', 'UX designer & event lover', '555-0301'],
    ['Ravi Kumar', 'ravi@zestify.com', 'attendee', 'Backend developer', '555-0302'],
    ['Anita Desai', 'anita@zestify.com', 'attendee', 'Data analyst', '555-0303'],
    ['Kevin Zhang', 'kevin@zestify.com', 'attendee', 'Product manager', '555-0304'],
    ['Tanya Miller', 'tanya@zestify.com', 'attendee', 'Startup founder', '555-0305'],
    ['Omar Farooq', 'omar@zestify.com', 'attendee', 'DevOps engineer', '555-0306'],
    ['Jessica Lee', 'jessica@zestify.com', 'attendee', 'Content strategist', '555-0307'],
    ['Ryan Brooks', 'ryan@zestify.com', 'organizer', 'Community event host', '555-0308'],
];

async function resetDemoPasswords() {
    for (const email of TEAM_ACCOUNTS) {
        try {
            const row = await query('SELECT password FROM users WHERE email = $1', [email]);
            if (!row.rows.length) continue;
            const current = row.rows[0].password;
            if (current && bcrypt.compareSync(email, current)) continue;
            const hash = bcrypt.hashSync(email, 10);
            await query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
            console.log(`[demo-passwords] reset password for ${email}`);
        } catch (err) {
            console.error(`[demo-passwords] failed for ${email}:`, err.message);
        }
    }
}

async function seedDummyUsers() {
    for (const [name, email, role, bio, phone] of DUMMY_USERS) {
        try {
            const exists = await query('SELECT id, password FROM users WHERE email = $1', [email]);
            if (exists.rows.length) {
                // Already present — only repair password if it doesn't verify against email.
                const cur = exists.rows[0].password;
                if (!cur || !bcrypt.compareSync(email, cur)) {
                    const hash = bcrypt.hashSync(email, 10);
                    await query('UPDATE users SET password = $1 WHERE email = $2', [hash, email]);
                    console.log(`[demo-passwords] repaired password for dummy ${email}`);
                }
                continue;
            }
            const hash = bcrypt.hashSync(email, 10);
            await query(
                'INSERT INTO users (name, email, password, role, bio, phone) VALUES ($1,$2,$3,$4,$5,$6)',
                [name, email, hash, role, bio, phone]
            );
            console.log(`[demo-passwords] inserted dummy user ${email}`);
        } catch (err) {
            console.error(`[demo-passwords] dummy insert failed for ${email}:`, err.message);
        }
    }
}

async function seedDummyRegistrations() {
    // Each dummy attendee buys a free ticket on a random approved event they don't already hold.
    try {
        const dummies = await query(
            "SELECT id, email FROM users WHERE email LIKE '%@zestify.com' AND role = 'attendee' AND email NOT IN ('admin@zestify.com','sarah@zestify.com','marcus@zestify.com','elena@zestify.com','david@zestify.com','alex@zestify.com','maya@zestify.com','james@zestify.com','lisa@zestify.com','chris@zestify.com')"
        );
        const events = await query(
            "SELECT id, capacity, tickets_sold FROM events WHERE status = 'approved' AND price = 0 ORDER BY id"
        );
        if (!events.rows.length) return;
        for (const u of dummies.rows) {
            const existing = await query(
                "SELECT COUNT(*)::int AS c FROM tickets WHERE user_id = $1 AND status != 'cancelled'",
                [u.id]
            );
            if (existing.rows[0].c > 0) continue; // already registered somewhere
            // Pick 2 random events with capacity left
            const candidates = events.rows.filter((e) => e.tickets_sold < e.capacity);
            if (!candidates.length) continue;
            const picks = candidates.sort(() => Math.random() - 0.5).slice(0, 2);
            for (const ev of picks) {
                const code = uuidv4().slice(0, 8).toUpperCase();
                try {
                    await query(
                        `INSERT INTO tickets (ticket_code, user_id, event_id, quantity, total_price, status, payment_method, payment_status)
                         VALUES ($1, $2, $3, 1, 0, 'confirmed', 'free', 'completed')`,
                        [code, u.id, ev.id]
                    );
                    await query('UPDATE events SET tickets_sold = tickets_sold + 1 WHERE id = $1', [ev.id]);
                } catch (err) {
                    // duplicate ticket — skip
                }
            }
            console.log(`[demo-passwords] registered dummy ${u.email} on ${picks.length} events`);
        }
    } catch (err) {
        console.error('[demo-passwords] seedDummyRegistrations failed:', err.message);
    }
}

async function runDemoSeeds() {
    await resetDemoPasswords();
    await seedDummyUsers();
    await seedDummyRegistrations();
}

module.exports = { resetDemoPasswords, seedDummyUsers, seedDummyRegistrations, runDemoSeeds };
