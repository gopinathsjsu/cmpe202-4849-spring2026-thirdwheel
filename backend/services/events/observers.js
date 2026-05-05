// Events-side observers — react to lifecycle changes emitted in api-events process.
// Side effects: notification rows + emails for all attendees on cancel/reschedule.

const { bus, Events } = require('../../shared/domain/DomainEvents');
const NotificationRepository = require('../../shared/repositories/NotificationRepository');
const { sendEmail, eventCancelledEmail, eventRescheduledEmail } = require('../../shared/adapters/EmailAdapter');

function registerObservers() {
    bus.on(Events.EVENT_CANCELLED, async ({ event, attendees, reason }) => {
        try {
            console.log(`[observer] EVENT_CANCELLED id=${event.id} attendees=${attendees.length}`);
            for (const a of attendees) {
                await NotificationRepository.create({
                    userId: a.user_id,
                    type: 'event_cancelled',
                    title: 'Event Cancelled',
                    message: `"${event.title}" scheduled for ${event.date} ${event.time} has been cancelled.`,
                    link: `/events/${event.id}`,
                });
                await sendEmail(eventCancelledEmail({ name: a.name, email: a.email }, event, reason));
            }
        } catch (err) {
            console.error('Observer EVENT_CANCELLED failed:', err.message);
        }
    });

    bus.on(Events.EVENT_RESCHEDULED, async ({ event, attendees, oldDate, oldTime }) => {
        try {
            console.log(`[observer] EVENT_RESCHEDULED id=${event.id} attendees=${attendees.length}`);
            for (const a of attendees) {
                await NotificationRepository.create({
                    userId: a.user_id,
                    type: 'event_rescheduled',
                    title: 'Event Rescheduled',
                    message: `"${event.title}" moved from ${oldDate} ${oldTime} → ${event.date} ${event.time}.`,
                    link: `/events/${event.id}`,
                });
                await sendEmail(eventRescheduledEmail({ name: a.name, email: a.email }, event, oldDate, oldTime));
            }
        } catch (err) {
            console.error('Observer EVENT_RESCHEDULED failed:', err.message);
        }
    });
}

module.exports = { registerObservers };
