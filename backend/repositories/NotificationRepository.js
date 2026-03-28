const { query } = require('../db/pool');

const NotificationRepository = {
    async create({ userId, type, title, message, link = null }, client) {
        const q = client || { query };
        const r = await q.query(
            `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [userId, type, title, message, link]
        );
        return r.rows[0];
    },
    async listForUser(userId, { unreadOnly = false, limit, offset }) {
        const where = ['user_id = $1'];
        const params = [userId];
        if (unreadOnly) where.push('is_read = FALSE');
        const w = `WHERE ${where.join(' AND ')}`;
        const total = (await query(`SELECT COUNT(*)::int AS total FROM notifications ${w}`, params)).rows[0].total;
        const unread = (await query('SELECT COUNT(*)::int AS c FROM notifications WHERE user_id = $1 AND is_read = FALSE', [userId])).rows[0].c;
        params.push(limit, offset);
        const rows = (await query(
            `SELECT * FROM notifications ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        )).rows;
        return { notifications: rows, total, unread };
    },
    async findByIdForUser(id, userId) {
        const r = await query('SELECT * FROM notifications WHERE id = $1 AND user_id = $2', [id, userId]);
        return r.rows[0] || null;
    },
    async markRead(id) {
        await query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
    },
    async markAllRead(userId) {
        await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [userId]);
    },
};

module.exports = NotificationRepository;
