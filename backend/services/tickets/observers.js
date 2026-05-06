// Tickets-side observer — handles TICKET_PURCHASED (emitted in this process).
// Sends ticket-confirmation email. Notification rows already written by TicketingService.

const { bus, Events } = require('../../shared/domain/DomainEvents');
const UserRepository = require('../../shared/repositories/UserRepository');
const { EventRepository } = require('../../shared/repositories/EventRepository');
const { sendEmail, ticketConfirmationEmail, ticketCancellationEmail } = require('../../shared/adapters/EmailAdapter');

function registerObservers() {
    bus.on(Events.TICKET_PURCHASED, async ({ userId, ticket, eventId }) => {
        try {
            const user = await UserRepository.findByIdWithPassword(userId);
            const event = await EventRepository.findByIdRaw(eventId || ticket.event_id);
            if (user && event) await sendEmail(ticketConfirmationEmail(user, event, ticket));
        } catch (err) {
            console.error('Observer TICKET_PURCHASED failed:', err.message);
        }
    });

    bus.on(Events.TICKET_CANCELLED, async ({ userId, ticket }) => {
        try {
            const user = await UserRepository.findByIdWithPassword(userId);
            const event = await EventRepository.findByIdRaw(ticket.event_id);
            if (user && event) await sendEmail(ticketCancellationEmail(user, event, ticket));
        } catch (err) {
            console.error('Observer TICKET_CANCELLED failed:', err.message);
        }
    });
}

module.exports = { registerObservers };
