const EVENT_TRANSITIONS = {
    pending: ['approved', 'rejected', 'cancelled'],
    approved: ['cancelled', 'completed'],
    rejected: [],
    cancelled: [],
    completed: [],
};

const TICKET_TRANSITIONS = {
    confirmed: ['cancelled', 'attended', 'refunded'],
    cancelled: [],
    attended: ['refunded'],
    refunded: [],
};

function canTransition(map, from, to) {
    if (!map[from]) return false;
    return map[from].includes(to);
}

function assertEventTransition(from, to) {
    if (!canTransition(EVENT_TRANSITIONS, from, to)) {
        const err = new Error(`Illegal event status transition: ${from} -> ${to}`);
        err.statusCode = 400;
        throw err;
    }
}

function assertTicketTransition(from, to) {
    if (!canTransition(TICKET_TRANSITIONS, from, to)) {
        const err = new Error(`Illegal ticket status transition: ${from} -> ${to}`);
        err.statusCode = 400;
        throw err;
    }
}

module.exports = { canTransition, assertEventTransition, assertTicketTransition, EVENT_TRANSITIONS, TICKET_TRANSITIONS };
