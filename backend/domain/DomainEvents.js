const { EventEmitter } = require('events');

class DomainEventBus extends EventEmitter {}

const bus = new DomainEventBus();
bus.setMaxListeners(50);

const Events = Object.freeze({
    TICKET_PURCHASED: 'ticket.purchased',
    TICKET_CANCELLED: 'ticket.cancelled',
    EVENT_APPROVED: 'event.approved',
    EVENT_REJECTED: 'event.rejected',
    EVENT_CREATED: 'event.created',
    USER_REGISTERED: 'user.registered',
});

function emitDomain(type, payload) {
    setImmediate(() => bus.emit(type, payload));
}

module.exports = { bus, Events, emitDomain };
