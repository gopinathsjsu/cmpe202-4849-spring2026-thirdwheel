# Design Patterns Used in Zestify

The CMPE 202 brief asks teams to demonstrate at least three "Gang of Four"
design patterns. Zestify uses **eight** distinct patterns, each chosen because
it solved a real problem and not because it ticked a box. This guide walks
through every one — the problem, the chosen pattern, the implementation, and
the file path you can open right now to read the code.

> Patterns covered: Repository · Strategy · Facade · Observer · Chain of Responsibility · State · Adapter · Template Method

---

## 1. Repository

### Problem

Every microservice needs Postgres access for one or more aggregate roots
(`users`, `events`, `tickets`, `notifications`, `admin_actions`,
`categories`). Without abstraction, each service writes raw SQL inline,
duplicates JOINs, and makes schema migrations a coordinated multi-service
change.

### Solution

One Repository class per aggregate, all living in `backend/shared/repositories/`.
Each repo exposes a small, domain-flavored interface and hides SQL behind
methods like `findById`, `list`, `cancelAllTicketsForEvent`,
`findUpcomingNeedingReminder`.

### Implementation snippet

```js
// backend/shared/repositories/EventRepository.js
const EventRepository = {
  async findById(id) {
    const r = await query(`SELECT ${EVENT_SELECT} ${FROM_JOINS} WHERE e.id = $1`, [id]);
    return shape(r.rows[0]);
  },
  async list({ search, category, city, dateFrom, dateTo, isOnline,
               isFeatured, status, sort, order, limit, offset }) { /* ... */ },
  async cancelAllTicketsForEvent(eventId, client) { /* ... */ },
  async findUpcomingNeedingReminder(hoursAhead = 12, windowHours = 1) { /* ... */ },
  async markReminderSent(eventId) { /* ... */ },
};
```

### Trade-offs

- **Win:** One place to look. Adding `tickets_sold` to the event projection is
  a one-line change consumed by all six services.
- **Risk:** Generic repositories drift toward god-objects. Each method here is
  domain-motivated; "make ad-hoc queries" is *not* the goal — those go in the
  service that needs them.

---

## 2. Strategy

### Problem

We ship three payment methods that handle money in fundamentally different
ways: free (no I/O), mock-card (always succeed), Stripe (verify a real
PaymentIntent over HTTP). Routes shouldn't `switch (paymentMethod)` everywhere.

### Solution

`PaymentStrategy` interface; three concrete strategies. A `selectStrategy(amount, hint)`
factory picks the right one given the event price and an optional client hint.

### Implementation snippet

```js
// backend/services/tickets/strategy.js
class FreePaymentStrategy {
  async charge({ amount }) {
    if (amount > 0) throw Object.assign(new Error('Free strategy used for paid event'), { statusCode: 400 });
    return { method: 'free', status: 'completed', txId: null };
  }
}

class StripePaymentStrategy {
  async charge({ amount, paymentIntentId }) {
    if (!paymentIntentId) throw Object.assign(new Error('paymentIntentId required'), { statusCode: 400 });
    const pi = await this._fetchIntent(paymentIntentId);   // cross-service HTTP
    if (pi.status !== 'succeeded') throw Object.assign(new Error(`Payment not completed (status: ${pi.status})`), { statusCode: 400 });
    return { method: 'stripe', status: 'completed', txId: pi.id };
  }
  // private — verifies PI via api-payments internal endpoint with X-Internal-Secret.
  async _fetchIntent(piId) { /* fetch(...) */ }
}

function selectStrategy(amount, hint) {
  if (amount <= 0)      return strategies.free;
  if (hint === 'stripe') return strategies.stripe;
  return strategies.mock_card;
}
```

### Why this beats `switch`

Adding a new payment method (say, ApplePay) means adding a `ApplePayPaymentStrategy`
class. Routes, repositories, and the TicketingService facade need zero changes.
We also enforce contract at the type level — every strategy implements the
same `charge({ amount, paymentIntentId? })` signature.

---

## 3. Facade

### Problem

A ticket purchase needs five things to happen, in order, ideally inside a
database transaction:

1. Check event status + capacity + active-ticket dedupe.
2. Pick a `PaymentStrategy` and call `charge()`.
3. Insert the ticket row.
4. Increment `events.tickets_sold`.
5. Write notification rows (user + organizer).

If a route does that inline, the route becomes 60 lines and every other
checkout path duplicates it.

### Solution

`TicketingService` exposes a single static `purchase(...)` method that
orchestrates all five sub-steps + emits the `TICKET_PURCHASED` domain event.
The HTTP route shrinks to "call the facade, return whatever it returns."

### Implementation snippet

```js
// backend/services/tickets/service.js
class TicketingService {
  static async purchase({ userId, eventId, quantity = 1, paymentMethodHint, paymentIntentId }) {
    const event = await EventRepository.findByIdRaw(eventId);
    if (!event || event.status !== 'approved') throw /* 404 */;

    const existing = await TicketRepository.findActiveForUserEvent(userId, eventId);
    if (existing) throw /* 409 */;

    if (quantity > event.capacity - event.tickets_sold) throw /* 400 */;

    const totalPrice = (event.price || 0) * quantity;
    const strategy = selectStrategy(totalPrice, paymentMethodHint);
    const payment  = await strategy.charge({ amount: totalPrice, paymentIntentId });

    const ticket = await withTx(async (client) => {
      // ... insert ticket + increment sold + 2 notifications ...
    });

    getCache().del(`event:${eventId}`);
    getCache().del('events:list:');
    emitDomain(Events.TICKET_PURCHASED, { userId, eventId, ticket });
    return ticket;
  }
}
```

The route is thin:

```js
router.post('/', authenticateToken, validate({ event_id: { required: true, type: 'number' } }),
  asyncHandler(async (req, res) => {
    const ticket = await TicketingService.purchase({
      userId: req.user.id,
      eventId: req.body.event_id,
      quantity: req.body.quantity,
      paymentMethodHint: req.body.payment_method,
      paymentIntentId: req.body.payment_intent_id,
    });
    res.status(201).json({ message: 'Ticket confirmed!', ticket });
  }));
```

---

## 4. Observer

### Problem

A ticket purchase has side effects: send a confirmation email, notify the
organizer, log to an audit trail. If the route handler does these inline, the
synchronous request latency balloons and a failure in one side effect breaks
the whole purchase.

### Solution

In-process `EventEmitter`-based domain event bus. The route does its
transactional work, commits, then emits an event. Observers registered in the
same process pick it up asynchronously (via `setImmediate`).

See [`adr/0003-in-process-event-bus.md`](adr/0003-in-process-event-bus.md)
for the deeper why-not-broker reasoning.

### Implementation snippet

```js
// backend/shared/domain/DomainEvents.js
const bus = new EventEmitter();
bus.setMaxListeners(50);

const Events = Object.freeze({
  TICKET_PURCHASED: 'ticket.purchased',
  TICKET_CANCELLED: 'ticket.cancelled',
  EVENT_APPROVED:   'event.approved',
  EVENT_REJECTED:   'event.rejected',
  EVENT_CREATED:    'event.created',
  EVENT_CANCELLED:  'event.cancelled',
  EVENT_RESCHEDULED: 'event.rescheduled',
  EVENT_REMINDER_DUE: 'event.reminder.due',
  USER_REGISTERED:  'user.registered',
});

function emitDomain(type, payload) {
  setImmediate(() => bus.emit(type, payload));
}
```

```js
// backend/services/tickets/observers.js
bus.on(Events.TICKET_PURCHASED, async ({ userId, ticket, eventId }) => {
  try {
    const user  = await UserRepository.findByIdWithPassword(userId);
    const event = await EventRepository.findByIdRaw(eventId || ticket.event_id);
    if (user && event) await sendEmail(ticketConfirmationEmail(user, event, ticket));
  } catch (err) {
    console.error('Observer TICKET_PURCHASED failed:', err.message);
  }
});
```

The `try/catch` is critical — observer failures must not crash the host process.

---

## 5. Chain of Responsibility

### Problem

Events go through three independent moderation rules before landing in the
admin queue: spam-keyword scoring, capacity sanity (no event ever needs
500k seats), and a "trusted organizer" fast-pass for users with ≥3 approved
events. We want the rule order to be visible and the chain to be easily
re-orderable.

### Solution

A pipeline where each handler decides one of three outcomes:
`auto-approve`, `auto-reject`, or `pass-to-next`. The chain ends when a
handler short-circuits with a verdict or when all handlers pass and the
event lands in `pending`.

### Implementation snippet

```js
// backend/services/events/moderation.js
function buildPipeline(deps) {
  const handlers = [
    spamFilter,
    capacitySanity,
    trustedOrganizer(deps.countApprovedByOrganizer),
  ];

  return {
    async handle(ctx) {
      for (const h of handlers) {
        const r = await h(ctx);
        if (r.action !== 'pass') return r;
      }
      return { action: 'manual-review' };
    },
  };
}

function spamFilter({ event }) {
  const text = `${event.title} ${event.description}`.toLowerCase();
  const spammy = ['free iphone', 'click here', 'sign up now', 'limited time'];
  const hits = spammy.filter(s => text.includes(s)).length;
  if (hits >= 2) return { action: 'auto-reject', reason: `Spam keywords detected: ${hits} hits` };
  return { action: 'pass' };
}

function capacitySanity({ event }) {
  if (event.capacity > 100_000) return { action: 'auto-reject', reason: 'Capacity exceeds 100k limit' };
  return { action: 'pass' };
}

function trustedOrganizer(countApproved) {
  return async ({ event }) => {
    const count = await countApproved(event.organizer_id);
    if (count >= 3) return { action: 'auto-approve', reason: `Trusted organizer (${count} approved events)` };
    return { action: 'pass' };
  };
}
```

Adding a new handler is a one-line addition to the `handlers` array.

---

## 6. State

### Problem

Events and tickets each go through a small set of statuses. Without explicit
state-machine rules, we end up with bugs like "re-approve an already-approved
event" (idempotent on the surface, but the side effects fire twice).

### Solution

Declarative state-transition map per aggregate, plus
`assertEventTransition(from, to)` / `assertTicketTransition(from, to)`
helpers that throw HTTP 400 on illegal moves.

### Implementation snippet

```js
// backend/shared/domain/StateMachine.js
const EVENT_TRANSITIONS = {
  pending:   ['approved', 'rejected', 'cancelled'],
  approved:  ['cancelled', 'completed'],
  rejected:  [],
  cancelled: [],
  completed: [],
};

const TICKET_TRANSITIONS = {
  confirmed: ['cancelled', 'attended', 'refunded'],
  cancelled: [],
  attended:  ['refunded'],
  refunded:  [],
};

function assertEventTransition(from, to) {
  if (!EVENT_TRANSITIONS[from] || !EVENT_TRANSITIONS[from].includes(to)) {
    const err = new Error(`Illegal event status transition: ${from} -> ${to}`);
    err.statusCode = 400;
    throw err;
  }
}
```

EventService and TicketingService both consult these before mutating status.

---

## 7. Adapter

### Problem

Four cross-cutting infra concerns we want to swap between back-ends without
touching consumer code:

| Concern | Local/dev | Production |
|---------|-----------|------------|
| Email | Ethereal (preview link) | Real SMTP (Gmail app password) |
| Cache | In-memory LRU | Redis (future) |
| Storage | Local disk | Google Cloud Storage |
| Payments | Stub | Real Stripe SDK |

### Solution

One Adapter per concern in `backend/shared/adapters/`. Each adapter file
exports both implementations behind a common interface; a `getX()` factory
picks the right one based on environment.

### Implementation snippet

```js
// backend/shared/adapters/EmailAdapter.js
class NoopEmailProvider {  async send({ to, subject }) { /* console.log */ return { success: true }; } }
class EtherealEmailProvider { /* nodemailer.createTestAccount + getTestMessageUrl */ }
class SmtpEmailProvider { /* real nodemailer transport using SMTP_HOST/PORT/USER/PASS */ }

function getProvider() {
  const choice = (process.env.EMAIL_PROVIDER || 'ethereal').toLowerCase();
  if (choice === 'noop') return new NoopEmailProvider();
  if (choice === 'smtp') return new SmtpEmailProvider({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || '"Zestify Events" <noreply@zestify.com>',
  });
  return new EtherealEmailProvider();
}

async function sendEmail(message) { return getProvider().send(message); }
```

Consumer code is back-end-agnostic:

```js
// services/tickets/observers.js
const { sendEmail, ticketConfirmationEmail } = require('../../shared/adapters/EmailAdapter');

await sendEmail(ticketConfirmationEmail(user, event, ticket));
```

---

## 8. Template Method

### Problem

Every event email shares the same outer HTML skeleton — gradient header card,
white body card, footer signature. Only the title, color, and body content
change per email type. Repeating the skeleton in five template functions is
copy-paste-prone.

### Solution

The skeleton lives in shared helper code; per-event-type functions fill in
the variable parts. We treat the skeleton as a Template Method even though
JavaScript doesn't have abstract classes — the *idea* is the same: a fixed
algorithm with hooks.

### Implementation snippet

```js
// backend/shared/adapters/EmailAdapter.js
function locationBlock(event) {
  const url = mapsUrlForEvent(event);
  const label = event.is_online
    ? `💻 ${event.venue_name || 'Online Event'}`
    : `📍 ${[event.venue_name, event.address, event.city, event.state, event.zip].filter(Boolean).join(', ')}`;
  const linkText = event.is_online ? '→ Join Online' : '→ Open in Google Maps';
  return `
    <p style="margin:8px 0">${label}</p>
    <p style="margin:8px 0">
      <a href="${url}" target="_blank" rel="noopener"
         style="display:inline-block;background:#06b6d4;color:#fff;padding:10px 16px;
                border-radius:8px;text-decoration:none;font-weight:600">
        ${linkText}
      </a>
    </p>`;
}

function ticketConfirmationEmail(user, event, ticket) {
  return {
    to: user.email,
    subject: `🎫 Ticket Confirmed: ${event.title}`,
    html: `<div ...>
      <h1>🎉 You're In!</h1>
      <h2>${event.title}</h2>
      <p>📅 ${event.date} at ${event.time}</p>
      ${locationBlock(event)}
      <p>🎫 Code: <strong>${ticket.ticket_code}</strong></p>
    </div>`,
  };
}

function eventCancelledEmail(user, event, reason) {
  return {
    to: user.email,
    subject: `❌ Event Cancelled: ${event.title}`,
    html: `<div ...>
      <h1>❌ Event Cancelled</h1>
      <h2>${event.title}</h2>
      <p>The event you registered for has been cancelled.</p>
      ${locationBlock(event)}
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    </div>`,
  };
}
```

`locationBlock` is the reusable hook. Its output is consistent across all
five emails (confirm, cancel, reschedule, reminder, ticket-cancel) so users
get the same Google Maps button regardless of email type.

---

## Pattern summary table

| Pattern | File(s) | Why it's there |
|---------|--------|----------------|
| Repository | `shared/repositories/*Repository.js` | Encapsulate per-aggregate Postgres queries |
| Strategy | `services/tickets/strategy.js` | Pluggable payment methods |
| Facade | `services/tickets/service.js`, `services/events/service.js` | Single entry point hides multi-step orchestration |
| Observer | `shared/domain/DomainEvents.js` + `services/*/observers.js` | Async side effects on domain events |
| Chain of Responsibility | `services/events/moderation.js` | Sequential moderation rules |
| State | `shared/domain/StateMachine.js` | Legal event/ticket status transitions |
| Adapter | `shared/adapters/{Email,Cache,Storage,Stripe}Adapter.js` | Pluggable infra back-ends |
| Template Method | `shared/adapters/EmailAdapter.js` (`locationBlock`) | Shared email skeleton |

---

## Reading order if you have 20 minutes

1. **Repository** — read `EventRepository.js`. Sets the vocabulary.
2. **Strategy** — read `services/tickets/strategy.js`. Smallest pattern in
   the codebase, single file.
3. **Facade** — read `services/tickets/service.js`. Watch how it composes
   Strategy + Repository + Observer + State.
4. **Observer** — read `shared/domain/DomainEvents.js` + one observer (try
   `services/events/observers.js`).
5. **Chain of Responsibility** — read `services/events/moderation.js`.
   Compact, three handlers.
6. **State** — read `shared/domain/StateMachine.js`. Twenty lines.
7. **Adapter** — read `shared/adapters/EmailAdapter.js` (most complex of the
   adapters; the others follow the same shape).
8. **Template Method** — already covered while reading the Email adapter.
