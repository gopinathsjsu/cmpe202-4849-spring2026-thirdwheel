# ADR-0003 — In-process domain event bus (vs. broker)

**Status:** Accepted · **Date:** 2026-03-13 · **Author:** Soham → Nihar · **Sprint:** 4

## Context

The Observer pattern is one of the CMPE 202 design patterns to demonstrate.
At minimum we need to show side effects (emails, notifications, audit log
entries) decoupled from the request handler that triggers them. Several
production-grade options for the bus itself:

A. **Cloud Pub/Sub** — managed, durable, fan-out, retries.
B. **Redis Streams** — durable enough for our scale, sub-ms latency.
C. **NATS / RabbitMQ** — self-hosted broker.
D. **Postgres LISTEN/NOTIFY** — already have Postgres.
E. **Node `EventEmitter`** in-process.

## Decision

Use **option E** — Node's built-in `events.EventEmitter`. Wrap it in
`shared/domain/DomainEvents.js`:

```js
const { EventEmitter } = require('events');

class DomainEventBus extends EventEmitter {}

const bus = new DomainEventBus();
bus.setMaxListeners(50);

const Events = Object.freeze({
    TICKET_PURCHASED: 'ticket.purchased',
    TICKET_CANCELLED: 'ticket.cancelled',
    EVENT_APPROVED: 'event.approved',
    EVENT_REJECTED: 'event.rejected',
    EVENT_CREATED: 'event.created',
    EVENT_CANCELLED: 'event.cancelled',
    EVENT_RESCHEDULED: 'event.rescheduled',
    EVENT_REMINDER_DUE: 'event.reminder.due',
    USER_REGISTERED: 'user.registered',
});

function emitDomain(type, payload) {
    setImmediate(() => bus.emit(type, payload));
}

module.exports = { bus, Events, emitDomain };
```

Each service that **emits** events also **registers its own observers** in the
same Node process. Cross-service triggers are rare and explicit — they go
through direct HTTP, not the bus.

## Why not a broker?

The Eventbrite-class domain we are modelling has these emitter→consumer
relationships:

| Emit | Consumer | Reaches across processes? |
|------|----------|---------------------------|
| `TICKET_PURCHASED` | api-tickets observer (email) + api-tickets notification row | no — emitter and consumer co-located |
| `TICKET_CANCELLED` | api-tickets observer (email) | no |
| `EVENT_APPROVED` | api-events observer (organizer email + notification + admin audit) | no |
| `EVENT_CANCELLED` | api-events observer (attendee email + notification) | no |
| `EVENT_RESCHEDULED` | api-events observer (attendee email + notification) | no |
| `EVENT_REMINDER_DUE` | api-notifications cron consumer (attendee email + notification) | no |

Every emit→consume pair is intra-process. A broker would add operational cost
without adding capability.

Even the one cross-service interaction (api-tickets needing PaymentIntent
verification) is explicitly synchronous — we *want* to block ticket persistence
on Stripe's confirmation, so an async bus is the wrong model anyway.

## Consequences

**Positive**
- Zero infra — no Pub/Sub project, no Redis cluster, no NATS pod.
- Pattern requirement satisfied — Observer is clearly demonstrated.
- Side effects testable — `bus.emit('event.rescheduled', payload)` in a unit
  test triggers the real observer code path.

**Negative**
- No durability — if the Node process crashes between emit and consumer side
  effects, the side effects are lost. For our domain that means a missed email
  or notification, not a financial inconsistency (tickets are committed in a
  Postgres TX before the bus fires). Acceptable for v1.
- No cross-process delivery — events fired in api-events never reach
  api-notifications. We work around this by registering observers in the
  process that emits.

**Future paths** (logged as backlog items)

- ZST-042 — Stripe webhook for async PaymentIntent events. Requires a real bus
  or at least a durable inbound queue.
- ZST-044 — Replace 12h-reminder in-process cron with managed Cloud Scheduler →
  Pub/Sub → notifications-worker. Decouples the schedule trigger from the
  consumer process restart cycle.

## References

- `backend/shared/domain/DomainEvents.js`
- Per-service `observers.js` files
- ADR-0001 (microservice split)
