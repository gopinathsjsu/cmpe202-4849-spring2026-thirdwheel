const { query } = require('../db/pool');

const TicketRepository = {
    async findActiveForUserEvent(userId, eventId, client) {
        const q = client || { query };
        const r = await q.query("SELECT * FROM tickets WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled'", [userId, eventId]);
        return r.rows[0] || null;
    },

    async findById(id) {
        const r = await query('SELECT * FROM tickets WHERE id = $1', [id]);
        return r.rows[0] || null;
    },

    async findByIdForUser(id, userId) {
        const r = await query('SELECT * FROM tickets WHERE id = $1 AND user_id = $2', [id, userId]);
        return r.rows[0] || null;
    },

    async create({ ticketCode, userId, eventId, quantity, totalPrice, paymentMethod }, client) {
        const q = client || { query };
        const r = await q.query(
            `INSERT INTO tickets (ticket_code, user_id, event_id, quantity, total_price, status, payment_method, payment_status)
       VALUES ($1,$2,$3,$4,$5,'confirmed',$6,'completed') RETURNING *`,
            [ticketCode, userId, eventId, quantity, totalPrice, paymentMethod]
        );
        return r.rows[0];
    },

    async cancel(id) {
        await query("UPDATE tickets SET status = 'cancelled' WHERE id = $1", [id]);
    },

    async listByUser(userId) {
        const r = await query(
            `SELECT t.*, e.title AS event_title, e.date AS event_date, e.time AS event_time,
              e.location AS event_location, e.image AS event_image, e.slug AS event_slug,
              e.is_online AS event_is_online, e.online_url AS event_online_url,
              c.name AS category_name, c.icon AS category_icon
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       LEFT JOIN categories c ON e.category_id = c.id
       WHERE t.user_id = $1 ORDER BY t.created_at DESC`, [userId]);
        return r.rows;
    },
};

module.exports = TicketRepository;
