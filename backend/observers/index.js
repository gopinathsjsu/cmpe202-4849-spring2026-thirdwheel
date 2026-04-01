const { bus, Events } = require('../domain/DomainEvents');
const NotificationRepository = require('../repositories/NotificationRepository');
const UserRepository = require('../repositories/UserRepository');
const { sendEmail, ticketConfirmationEmail, eventApprovalEmail } = require('../adapters/EmailAdapter');
const AdminRepository = require('../repositories/AdminRepository');

function registerObservers() {
    bus.on(Events.TICKET_PURCHASED, async ({ userId, ticket, eventId }) => {
        try {
            const user = await UserRepository.findByIdWithPassword(userId);
            const { EventRepository } = require('../repositories/EventRepository');
            const event = await EventRepository.findByIdRaw(eventId);
            if (user && event) await sendEmail(ticketConfirmationEmail(user, event, ticket));
        } catch (err) { console.error('Observer TICKET_PURCHASED failed:', err.message); }
    });

    bus.on(Events.EVENT_APPROVED, async ({ event, adminId, reason, autoApproved }) => {
        try {
            const organizer = await UserRepository.findByIdWithPassword(event.organizer_id);
            await NotificationRepository.create({
                userId: event.organizer_id, type: 'event_approved',
                title: 'Event Approved', message: `Your event "${event.title}" has been approved!`,
                link: `/events/${event.id}`,
            });
            if (organizer) await sendEmail(eventApprovalEmail(organizer, event, true));
            if (adminId) await AdminRepository.logAction({ adminId, action: 'approve', targetType: 'event', targetId: event.id, reason });
            if (autoApproved) await AdminRepository.logAction({ adminId: event.organizer_id, action: 'auto_approve', targetType: 'event', targetId: event.id, reason: reason || 'auto' });
        } catch (err) { console.error('Observer EVENT_APPROVED failed:', err.message); }
    });

    bus.on(Events.EVENT_REJECTED, async ({ event, adminId, reason, autoRejected }) => {
        try {
            const organizer = await UserRepository.findByIdWithPassword(event.organizer_id);
            await NotificationRepository.create({
                userId: event.organizer_id, type: 'event_rejected',
                title: 'Event Rejected',
                message: `Your event "${event.title}" was not approved. ${reason || ''}`,
                link: `/dashboard/my-events`,
            });
            if (organizer) await sendEmail(eventApprovalEmail(organizer, event, false));
            if (adminId) await AdminRepository.logAction({ adminId, action: 'reject', targetType: 'event', targetId: event.id, reason });
            if (autoRejected) await AdminRepository.logAction({ adminId: event.organizer_id, action: 'auto_reject', targetType: 'event', targetId: event.id, reason: reason || 'auto' });
        } catch (err) { console.error('Observer EVENT_REJECTED failed:', err.message); }
    });
}

module.exports = { registerObservers };
