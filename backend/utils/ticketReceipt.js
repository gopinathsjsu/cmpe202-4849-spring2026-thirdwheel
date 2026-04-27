// Plain-text receipt body emitted to the email adapter on ticket purchase.
function format({ ticket, event, user }) {
    const lines = [
        `Hi ${user.name},`,
        ``,
        `Your ticket for "${event.title}" is confirmed.`,
        `Reference: ${ticket.code}`,
        `Date: ${event.date} ${event.time}`,
        `Quantity: ${ticket.quantity}`,
        `Total: ${ticket.price_cents > 0 ? '$' + (ticket.price_cents / 100).toFixed(2) : 'FREE'}`,
        ``,
        `— Zestify`,
    ];
    return lines.join('\n');
}

module.exports = { format };
