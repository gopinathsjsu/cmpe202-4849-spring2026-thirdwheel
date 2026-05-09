// Facade: hides capacity check, payment strategy, ticket persistence,
// notification creation, organizer alert, and email dispatch.

const { v4: uuidv4 } = require('uuid');
const { withTx } = require('../../shared/db/pool');
const { EventRepository } = require('../../shared/repositories/EventRepository');
const TicketRepository = require('../../shared/repositories/TicketRepository');
const NotificationRepository = require('../../shared/repositories/NotificationRepository');
const UserRepository = require('../../shared/repositories/UserRepository');
const { selectStrategy } = require('./strategy');
const { emitDomain, Events } = require('../../shared/domain/DomainEvents');
const { assertTicketTransition } = require('../../shared/domain/StateMachine');
const { getCache } = require('../../shared/adapters/CacheAdapter');

// 10-char ticket code from a 32-letter alphabet (no ambiguous chars: 0/O, 1/I/L).
// Collision probability ~ qty^2 / (2 * 32^10) → astronomically small. UNIQUE constraint
// in schema still enforces safety; we retry up to 5x in case of a collision.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateTicketCode() {
    let s = '';
    for (let i = 0; i < 10; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
}

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

        // Retry on UNIQUE ticket_code collision (vanishingly rare with 10 chars).
        let ticket;
        let lastErr;
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                ticket = await withTx(async (client) => {
                    const ticketCode = generateTicketCode();
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
                break;
            } catch (err) {
                lastErr = err;
                // Postgres UNIQUE violation code is 23505 — retry with new code.
                if (err && err.code === '23505' && /ticket_code/i.test(err.detail || err.message || '')) {
                    continue;
                }
                throw err;
            }
        }
        if (!ticket) throw lastErr || new Error('Could not allocate unique ticket code');

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

        // Invalidate BOTH detail cache + list cache so counters update on next read.
        getCache().del(`event:${ticket.event_id}`).catch(() => {});
        getCache().del('events:list:').catch(() => {});
        emitDomain(Events.TICKET_CANCELLED, { userId, ticket });
    }
}

module.exports = TicketingService;
