// Refund eligibility rules for a paid ticket cancellation.
// Pure function — no DB access. Used by tickets/service.js cancel path.

const FULL_REFUND_HOURS = 48;
const HALF_REFUND_HOURS = 12;

function hoursUntil(eventDate, eventTime) {
    const t = new Date(`${eventDate}T${eventTime || '00:00'}:00Z`).getTime();
    return (t - Date.now()) / (1000 * 60 * 60);
}

function eligibility({ event, ticket, now = Date.now() }) {
    if (!ticket || ticket.status !== 'confirmed') {
        return { refund: 'none', reason: 'Ticket not eligible' };
    }
    if (ticket.payment_method === 'free' || ticket.total_price === 0) {
        return { refund: 'none', reason: 'Free ticket — no charge to refund' };
    }
    const h = hoursUntil(event.date, event.time);
    if (h >= FULL_REFUND_HOURS) return { refund: 'full', percent: 100 };
    if (h >= HALF_REFUND_HOURS) return { refund: 'partial', percent: 50 };
    return { refund: 'none', reason: 'Less than 12h before event' };
}

module.exports = { eligibility, FULL_REFUND_HOURS, HALF_REFUND_HOURS };
