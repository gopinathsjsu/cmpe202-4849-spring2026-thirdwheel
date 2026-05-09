# 12-hour Reminder Loop

Background job that lives inside `api-notifications` and sends email +
notification reminders 12 hours before each upcoming event.

## File

`services/notifications/reminderLoop.js`

## Schedule

Polls every `REMINDER_POLL_MS` (default 300_000 = 5 minutes). On each tick:

```sql
SELECT * FROM events
WHERE status = 'approved'
  AND reminder_sent_at IS NULL
  AND (date::timestamp + time::time)
      BETWEEN NOW() + INTERVAL '11 hours'
          AND NOW() + INTERVAL '13 hours';
```

For each event found:
1. Fetch attendees (`EventRepository.attendees(eventId)`).
2. Per attendee — insert notification row + send `eventReminderEmail` via Gmail SMTP.
3. `UPDATE events SET reminder_sent_at = NOW()` — prevents duplicate sends.

## Manual trigger

For demo + on-call use:

```bash
curl -X POST \
  -H 'X-Internal-Secret: internal-zestify-2026' \
  -d '' \
  https://34.107.158.154.nip.io/api/notifications/_trigger-reminder
```

Returns `{"message":"reminder tick triggered"}`. Requires internal secret —
not exposed via the LB url-map for general use.

## Idempotency

`reminder_sent_at IS NULL` guard means re-running the loop after a successful
send is a no-op. If the loop crashes between email send and `markReminderSent`
call, the next tick re-sends (small risk of duplicate emails — acceptable for
this domain).

ZST-044 will move this to a managed Cloud Scheduler → Pub/Sub → idempotent
worker so we get exactly-once delivery.

## Configuration

| Env | Default | Description |
|-----|---------|-------------|
| `REMINDER_POLL_MS` | `300000` | Polling interval (ms) |
| `REMINDER_HOURS_AHEAD` | `12` | Centre of the upcoming-event window |
| `REMINDER_WINDOW_HOURS` | `1` | Half-width — sends fire for events `[HOURS-WINDOW, HOURS+WINDOW]` ahead |

Set per-VM via instance template metadata (`scripts/vm-startup.sh` reads them
and injects into the `api-notifications` container).

## Observability

Every tick logs the count of events queued + per-event the attendee fan-out:

```
[reminder] 1 event(s) need reminders sent
[reminder] event id=19 title="E2E Reminder Test" → 2 attendee(s)
```

Per-attendee failures (SMTP bounce, notification DB error) are logged but do
not abort the loop:

```
[reminder] email fail user=12 email=ghost@example.com: 550 mailbox not found
```

Loop survives — next attendee continues. After the loop finishes, the event
is marked sent regardless of partial failures (alternative: track sent
per-attendee, more complex DB schema — deferred).
