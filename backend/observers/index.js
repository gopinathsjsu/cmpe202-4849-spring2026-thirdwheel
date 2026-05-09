const { bus, Events } = require('../domain/DomainEvents');
const NotificationRepository = require('../repositories/NotificationRepository');
const UserRepository = require('../repositories/UserRepository');
const { sendEmail, ticketConfirmationEmail, eventApprovalEmail, eventCreatedEmail, eventPendingReviewAdminEmail, eventCancelledEmail, eventRescheduledEmail } = require('../adapters/EmailAdapter');
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

    bus.on(Events.EVENT_CREATED, async ({ event }) => {
        try {
            const organizer = await UserRepository.findByIdWithPassword(event.organizer_id);
            if (organizer) {
                // 1. Notify organizer that submission landed and is pending review.
                await NotificationRepository.create({
                    userId: organizer.id, type: 'info',
                    title: 'Event Submitted',
                    message: `Your event "${event.title}" is pending admin review.`,
                    link: `/dashboard/my-events`,
                });
                await sendEmail(eventCreatedEmail(organizer, event));
            }
            // 2. Notify every active admin so they can review promptly.
            const admins = await UserRepository.listByRole('admin');
            for (const admin of admins) {
                try {
                    await NotificationRepository.create({
                        userId: admin.id, type: 'info',
                        title: 'New Event Pending',
                        message: `${organizer?.name || 'An organizer'} submitted "${event.title}" — please review.`,
                        link: `/admin`,
                    });
                    if (organizer) await sendEmail(eventPendingReviewAdminEmail(admin, organizer, event));
                } catch (err) { console.error(`[observer] admin notif fail user=${admin.id}:`, err.message); }
            }
        } catch (err) { console.error('Observer EVENT_CREATED failed:', err.message); }
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

    bus.on(Events.EVENT_CANCELLED, async ({ event, attendees, reason }) => {
        console.log(`[observer] EVENT_CANCELLED id=${event.id} attendees=${attendees.length}`);
        for (const a of attendees) {
            try {
                await NotificationRepository.create({
                    userId: a.user_id, type: 'event_cancelled',
                    title: 'Event Cancelled',
                    message: `"${event.title}" scheduled for ${event.date} ${event.time} has been cancelled.`,
                    link: `/events/${event.id}`,
                });
            } catch (err) { console.error(`[observer] notif fail user=${a.user_id}:`, err.message); }
            try {
                await sendEmail(eventCancelledEmail({ name: a.name, email: a.email }, event, reason));
            } catch (err) { console.error(`[observer] email fail user=${a.user_id}:`, err.message); }
        }
    });

    bus.on(Events.EVENT_RESCHEDULED, async ({ event, attendees, oldDate, oldTime }) => {
        console.log(`[observer] EVENT_RESCHEDULED id=${event.id} attendees=${attendees.length}`);
        for (const a of attendees) {
            try {
                await NotificationRepository.create({
                    userId: a.user_id, type: 'event_rescheduled',
                    title: 'Event Rescheduled',
                    message: `"${event.title}" moved from ${oldDate} ${oldTime} → ${event.date} ${event.time}.`,
                    link: `/events/${event.id}`,
                });
            } catch (err) { console.error(`[observer] notif fail user=${a.user_id}:`, err.message); }
            try {
                await sendEmail(eventRescheduledEmail({ name: a.name, email: a.email }, event, oldDate, oldTime));
            } catch (err) { console.error(`[observer] email fail user=${a.user_id}:`, err.message); }
        }
    });
}

module.exports = { registerObservers };
