const { query } = require('../db/pool');

const AdminRepository = {
    async logAction({ adminId, action, targetType, targetId, reason = '' }) {
        await query(
            `INSERT INTO admin_actions (admin_id, action, target_type, target_id, reason)
       VALUES ($1,$2,$3,$4,$5)`,
            [adminId, action, targetType, targetId, reason]
        );
    },
    async stats() {
        const totalUsers = (await query('SELECT COUNT(*)::int AS c FROM users')).rows[0].c;
        const totalEvents = (await query('SELECT COUNT(*)::int AS c FROM events')).rows[0].c;
        const pendingEvents = (await query("SELECT COUNT(*)::int AS c FROM events WHERE status = 'pending'")).rows[0].c;
        const approvedEvents = (await query("SELECT COUNT(*)::int AS c FROM events WHERE status = 'approved'")).rows[0].c;
        const totalTickets = (await query("SELECT COUNT(*)::int AS c FROM tickets WHERE status = 'confirmed'")).rows[0].c;
        const totalRevenue = (await query("SELECT COALESCE(SUM(total_price),0)::float AS total FROM tickets WHERE payment_status = 'completed'")).rows[0].total;
        const usersByRole = (await query('SELECT role, COUNT(*)::int AS count FROM users GROUP BY role')).rows;
        const recentActions = (await query(
            `SELECT aa.*, u.name AS admin_name FROM admin_actions aa
       JOIN users u ON aa.admin_id = u.id ORDER BY aa.created_at DESC LIMIT 10`
        )).rows;
        return { totalUsers, totalEvents, pendingEvents, approvedEvents, totalTickets, totalRevenue, usersByRole, recentActions };
    },
};

module.exports = AdminRepository;
