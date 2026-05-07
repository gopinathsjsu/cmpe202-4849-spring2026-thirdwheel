# api-events

Microservice handling event CRUD, moderation, cancel + reschedule.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/events` | optional | List approved events with filters/pagination |
| GET | `/api/events/:id` | optional | Event detail (enriched with `hasTicket` for logged-in user) |
| GET | `/api/events/categories` | none | Static category list |
| GET | `/api/events/featured` | none | Top featured events |
| GET | `/api/events/stats` | none | Aggregate counts |
| GET | `/api/events/:id/calendar` | none | `.ics` download |
| GET | `/api/events/:id/attendees` | organizer / admin | Attendee list (owner-only or admin) |
| POST | `/api/events` | organizer / admin | Create event → runs moderation pipeline (CoR) |
| PUT | `/api/events/:id` | organizer (own) / admin | Update event |
| DELETE | `/api/events/:id` | organizer (own) / admin | Hard delete |
| POST | `/api/events/:id/cancel` | organizer (own) / admin | Cancel + cascade-cancel attendee tickets + email all |
| POST | `/api/events/:id/reschedule` | organizer (own) / admin | Update date/time + reset reminder + email all |

## Domain events emitted

- `EVENT_CREATED` — after auto-moderation lands in admin queue
- `EVENT_APPROVED` — auto- or admin-approved
- `EVENT_REJECTED` — auto-rejected or admin-rejected
- `EVENT_CANCELLED` — payload includes attendees snapshot
- `EVENT_RESCHEDULED` — payload includes attendees + oldDate + oldTime

Observers in this process iterate attendees and dispatch email + notification rows.

## Patterns

- **Repository** — `shared/repositories/EventRepository.js`
- **Service / Facade** — `service.js` (`EventService.create/cancel/reschedule`)
- **Chain of Responsibility** — `moderation.js` (Spam → Capacity → TrustedOrganizer → admin queue)
- **State Machine** — `assertEventTransition()` from `shared/domain/StateMachine.js`
- **Observer** — `observers.js` registers handlers on the in-process domain bus

Port: **5002**
