// Events-side observers — react to lifecycle changes emitted in api-events process.
// Side effects: notification rows + emails for all attendees on cancel/reschedule.

const { bus, Events } = require('../../shared/domain/DomainEvents');
const NotificationRepository = require('../../shared/repositories/NotificationRepository');
const { sendEmail, eventCancelledEmail, eventRescheduledEmail } = require('../../shared/adapters/EmailAdapter');

function registerObservers() {
    bus.on(Events.EVENT_CANCELLED, async ({ event, attendees, reason }) => {
        console.log(`[observer] EVENT_CANCELLED id=${event.id} attendees=${attendees.length}`);
        let okN = 0, okE = 0;
        for (const a of attendees) {
            try {
                await NotificationRepository.create({
                    userId: a.user_id,
                    type: 'event_cancelled',
                    title: 'Event Cancelled',
                    message: `"${event.title}" scheduled for ${event.date} ${event.time} has been cancelled.`,
                    link: `/events/${event.id}`,
                });
                okN++;
            } catch (err) {
                console.error(`[observer] notif fail user=${a.user_id}:`, err.message);
            }
            try {
                const r = await sendEmail(eventCancelledEmail({ name: a.name, email: a.email }, event, reason));
                if (r && r.success) okE++;
                else console.error(`[observer] email fail user=${a.user_id} email=${a.email}:`, r && r.error);
            } catch (err) {
                console.error(`[observer] email throw user=${a.user_id}:`, err.message);
            }
        }
        console.log(`[observer] EVENT_CANCELLED done: notif=${okN}/${attendees.length} email=${okE}/${attendees.length}`);
    });

    bus.on(Events.EVENT_RESCHEDULED, async ({ event, attendees, oldDate, oldTime }) => {
        console.log(`[observer] EVENT_RESCHEDULED id=${event.id} attendees=${attendees.length}`);
        let okN = 0, okE = 0;
        for (const a of attendees) {
            try {
                await NotificationRepository.create({
                    userId: a.user_id,
                    type: 'event_rescheduled',
                    title: 'Event Rescheduled',
                    message: `"${event.title}" moved from ${oldDate} ${oldTime} → ${event.date} ${event.time}.`,
                    link: `/events/${event.id}`,
                });
                okN++;
            } catch (err) {
                console.error(`[observer] notif fail user=${a.user_id}:`, err.message);
            }
            try {
                const r = await sendEmail(eventRescheduledEmail({ name: a.name, email: a.email }, event, oldDate, oldTime));
                if (r && r.success) okE++;
                else console.error(`[observer] email fail user=${a.user_id} email=${a.email}:`, r && r.error);
            } catch (err) {
                console.error(`[observer] email throw user=${a.user_id}:`, err.message);
            }
        }
        console.log(`[observer] EVENT_RESCHEDULED done: notif=${okN}/${attendees.length} email=${okE}/${attendees.length}`);
    });
}

module.exports = { registerObservers };
