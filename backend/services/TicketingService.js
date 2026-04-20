// Facade: hides capacity check, payment strategy, ticket persistence,
// notification creation, organizer alert, and email dispatch.

const { v4: uuidv4 } = require('uuid');
const { withTx } = require('../db/pool');
const { EventRepository } = require('../repositories/EventRepository');
const TicketRepository = require('../repositories/TicketRepository');
const NotificationRepository = require('../repositories/NotificationRepository');
const UserRepository = require('../repositories/UserRepository');
const { selectStrategy } = require('../strategies/PaymentStrategy');
const { emitDomain, Events } = require('../domain/DomainEvents');
const { assertTicketTransition } = require('../domain/StateMachine');
const { getCache } = require('../adapters/CacheAdapter');

class TicketingService {
    static async purchase({ userId, eventId, quantity = 1, paymentMethodHint, paymentIntentId }) {
        const event = await EventRepository.findByIdRaw(eventId);
        if (!event || event.status !== 'approved') {
            throw Object.assign(new Error('Event not found or not available.'), { statusCode: 404 });
        }
        const existing = await TicketRepository.findActiveForUserEvent(userId, eventId);
        if (existing) {
            throw Object.assign(new Error('You already have a ticket for this event.'), { statusCode: 409 });
        }
        const spotsLeft = event.capacity - event.tickets_sold;
        if (quantity > spotsLeft) {
            throw Object.assign(new Error(`Only ${spotsLeft} spots remaining.`), { statusCode: 400 });
        }

        const totalPrice = (event.price || 0) * quantity;
        const strategy = selectStrategy(totalPrice, paymentMethodHint);
        const payment = await strategy.charge({ amount: totalPrice, paymentIntentId });

        const ticket = await withTx(async (client) => {
            const ticketCode = uuidv4().slice(0, 8).toUpperCase();
            const t = await TicketRepository.create({
                ticketCode, userId, eventId, quantity, totalPrice, paymentMethod: payment.method,
            }, client);
            await EventRepository.incrementSold(eventId, quantity, client);
            await NotificationRepository.create({
                userId, type: 'ticket_confirmation',
                title: 'Ticket Confirmed!',
                message: `Your ticket for ${event.title} has been confirmed.`,
                link: `/events/${eventId}`,
            }, client);
            const buyer = await UserRepository.findById(userId);
            await NotificationRepository.create({
                userId: event.organizer_id, type: 'info',
                title: 'New Registration',
                message: `${buyer.name} registered for ${event.title}.`,
                link: `/dashboard/attendees/${eventId}`,
            }, client);
            return t;
        });

        getCache().del(`event:${eventId}`).catch(() => {});
        getCache().del('events:list:').catch(() => {});

        emitDomain(Events.TICKET_PURCHASED, { userId, eventId, ticket });
        return ticket;
    }

    static async cancel({ userId, ticketId }) {
        const ticket = await TicketRepository.findByIdForUser(ticketId, userId);
        if (!ticket) throw Object.assign(new Error('Ticket not found.'), { statusCode: 404 });
        assertTicketTransition(ticket.status, 'cancelled');

        await withTx(async (client) => {
            await client.query("UPDATE tickets SET status = 'cancelled' WHERE id = $1", [ticketId]);
            await client.query('UPDATE events SET tickets_sold = tickets_sold - $1 WHERE id = $2', [ticket.quantity, ticket.event_id]);
            await NotificationRepository.create({
                userId, type: 'warning',
                title: 'Ticket Cancelled',
                message: `Your ticket has been cancelled.`,
                link: `/events/${ticket.event_id}`,
            }, client);
        });

        getCache().del(`event:${ticket.event_id}`).catch(() => {});
        emitDomain(Events.TICKET_CANCELLED, { userId, ticket });
    }
}

module.exports = TicketingService;
