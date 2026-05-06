// 12h-before reminder cron loop. Runs in api-notifications process only.
// Polls every REMINDER_POLL_MS and emails attendees of events starting in
// REMINDER_HOURS_AHEAD ± REMINDER_WINDOW_HOURS hours.

const { EventRepository } = require('../../shared/repositories/EventRepository');
const NotificationRepository = require('../../shared/repositories/NotificationRepository');
const { sendEmail, eventReminderEmail } = require('../../shared/adapters/EmailAdapter');

const POLL_MS = parseInt(process.env.REMINDER_POLL_MS || '300000', 10); // 5 min
const HOURS_AHEAD = parseInt(process.env.REMINDER_HOURS_AHEAD || '12', 10);
const WINDOW_HOURS = parseInt(process.env.REMINDER_WINDOW_HOURS || '1', 10);

let running = false;

async function tick() {
    if (running) return;
    running = true;
    try {
        const events = await EventRepository.findUpcomingNeedingReminder(HOURS_AHEAD, WINDOW_HOURS);
        if (events.length === 0) return;
        console.log(`[reminder] ${events.length} event(s) need reminders sent`);
        for (const event of events) {
            const attendees = await EventRepository.attendees(event.id);
            console.log(`[reminder] event id=${event.id} title="${event.title}" → ${attendees.length} attendee(s)`);
            for (const a of attendees) {
                try {
                    await NotificationRepository.create({
                        userId: a.user_id,
                        type: 'event_reminder',
                        title: 'Event Starting Soon',
                        message: `"${event.title}" starts in ~${HOURS_AHEAD} hours.`,
                        link: `/events/${event.id}`,
                    });
                    await sendEmail(eventReminderEmail({ name: a.name, email: a.email }, event, HOURS_AHEAD));
                } catch (err) {
                    console.error(`[reminder] send failed user=${a.user_id}:`, err.message);
                }
            }
            await EventRepository.markReminderSent(event.id);
        }
    } catch (err) {
        console.error('[reminder] loop error:', err.message);
    } finally {
        running = false;
    }
}

function start() {
    console.log(`[reminder] loop starting — every ${POLL_MS / 1000}s, ${HOURS_AHEAD}h±${WINDOW_HOURS}h ahead`);
    // Fire once shortly after boot, then on interval.
    setTimeout(tick, 10_000);
    setInterval(tick, POLL_MS);
}

module.exports = { start, tick };
