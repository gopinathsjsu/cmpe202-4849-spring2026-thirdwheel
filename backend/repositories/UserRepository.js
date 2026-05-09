const { query } = require('../db/pool');

const SAFE_COLS = 'id, name, email, role, avatar, bio, phone, created_at, is_active';

const UserRepository = {
    async findById(id) {
        const r = await query(`SELECT ${SAFE_COLS} FROM users WHERE id = $1`, [id]);
        return r.rows[0] || null;
    },
    async findByIdWithPassword(id) {
        const r = await query('SELECT * FROM users WHERE id = $1', [id]);
        return r.rows[0] || null;
    },
    async findByEmail(email) {
        const r = await query('SELECT * FROM users WHERE email = $1', [email]);
        return r.rows[0] || null;
    },
    async create({ name, email, password, role = 'attendee', bio = '', phone = '' }) {
        const r = await query(
            `INSERT INTO users (name, email, password, role, bio, phone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${SAFE_COLS}`,
            [name, email, password, role, bio, phone]
        );
        return r.rows[0];
    },
    async updateProfile(id, { name, bio, phone }) {
        const r = await query(
            `UPDATE users SET name = COALESCE($1, name), bio = COALESCE($2, bio),
        phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4
       RETURNING ${SAFE_COLS}`,
            [name, bio, phone, id]
        );
        return r.rows[0];
    },
    async listForAdmin({ role, search, limit, offset }) {
        const where = [];
        const params = [];
        if (role) { params.push(role); where.push(`role = $${params.length}`); }
        if (search) {
            params.push(`%${search}%`);
            where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
        }
        const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const total = (await query(`SELECT COUNT(*)::int AS total FROM users ${w}`, params)).rows[0].total;
        params.push(limit, offset);
        const users = (await query(
            `SELECT ${SAFE_COLS} FROM users ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        )).rows;
        return { users, total };
    },
    async setRole(id, role) {
        await query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, id]);
    },
    async setActive(id, isActive) {
        await query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, id]);
    },
    async countEventsByOrganizer(id) {
        return (await query('SELECT COUNT(*)::int AS c FROM events WHERE organizer_id = $1', [id])).rows[0].c;
    },
    async countTicketsByUser(id) {
        return (await query("SELECT COUNT(*)::int AS c FROM tickets WHERE user_id = $1 AND status = 'confirmed'", [id])).rows[0].c;
    },
    async listByRole(role) {
        const r = await query(`SELECT ${SAFE_COLS} FROM users WHERE role = $1 AND is_active = TRUE`, [role]);
        return r.rows;
    },
};

module.exports = UserRepository;
