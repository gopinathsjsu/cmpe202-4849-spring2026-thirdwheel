// Centralized SQL fragments for the tickets domain.
module.exports = {
    findActive: `SELECT * FROM tickets WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled'`,
    insertTicket: `INSERT INTO tickets (user_id, event_id, code, status, quantity, price_cents)
                   VALUES ($1,$2,$3,'confirmed',$4,$5) RETURNING *`,
    cancelTicket: `UPDATE tickets SET status='cancelled', cancelled_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *`,
};
