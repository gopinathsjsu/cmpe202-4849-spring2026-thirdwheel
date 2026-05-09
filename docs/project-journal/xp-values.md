# XP Core Values — Team Thirdwheel's Reflection

Of the five XP Core Values (Communication, Simplicity, Feedback, Courage, Respect),
we leaned most heavily on **Communication** and **Simplicity** throughout the Zestify project.

---

## 1. Communication

Three people, twelve weeks, one shared codebase, and a hard 2+2+2 service-ownership
boundary (Nihar: events + payments · Soham: auth + tickets · Kalhar: admin + notifications)
meant communication had to be deliberate, not accidental.

**Where it showed up:**

- **Domain-event contracts as the integration handshake.** Rather than letting each
  service silently grow its own coupling, we agreed up-front on a single
  `shared/domain/DomainEvents.js` registry. Every cross-service interaction —
  `TICKET_PURCHASED`, `EVENT_APPROVED`, `EVENT_CANCELLED`, `EVENT_RESCHEDULED`,
  `EVENT_REMINDER_DUE` — went through the bus. Adding an event type required a Slack
  thread + a one-line PR before any consumer/producer could land. Result: when Kalhar
  added the 12h reminder cron, Nihar's events observer already knew exactly what payload
  to expect, and Soham's tickets observer didn't break.

- **Per-week scrum check-ins** (recorded in [`weekly-scrum.md`](weekly-scrum.md)) caught
  blockers early. The Week 7 entry shows the textbook example: Nihar was about to ship
  the Stripe SDK adapter and called out that Soham's `PaymentStrategy.charge()` signature
  needed to accept an optional `paymentIntentId`. That conversation in the Wednesday
  stand-up cost ten minutes; without it, we'd have lost two days to merge-conflict-induced
  rework.

- **README + project journal as living docs.** Every architectural decision lives in
  `docs/` or the top-level README — Compute MIG + LB topology, microservice ports,
  email templates, demo accounts, deployment runbooks. New context never had to be
  rediscovered by reading code. When we onboarded a fourth voice (TA review), the
  reviewer could read the README, hit `https://34.107.158.154.nip.io`, log in via the
  quick-login buttons, and exercise every role in under ten minutes.

- **Commit messages as a second channel.** Every commit message states the *why* in
  one sentence, e.g. *"perf(events): lower in-memory cache TTLs to 2s — keeps counters
  fresh across multi-VM in-memory caches"*. When you walk the 127-commit history, the
  reasoning trail is intact even months later.

**What this looked like in practice:** zero ambiguity blockers in the burndown chart.
Every block was a real dependency (waiting on someone else's code), never a
"I-didn't-know-you-needed-that-from-me" misunderstanding.

---

## 2. Simplicity

We deliberately resisted the temptation to over-architect. Eventbrite-style platforms
often metastasize into Kafka + service-mesh + event-sourcing rabbit holes; we kept
Zestify deliberately small even while honoring the microservice constraint.

**Concrete simplicity choices:**

- **In-process domain event bus instead of Kafka.** `shared/domain/DomainEvents.js`
  is a 22-line wrapper around Node's built-in `EventEmitter`. Each microservice that
  emits also registers its own observers in the same process. Cross-service triggers
  (`api-tickets → api-payments`) go through a single direct internal HTTP call with an
  `X-Internal-Secret` header. No broker, no DLQ, no schemas registry — and the system
  still demonstrates the Observer pattern cleanly for the CMPE 202 design-pattern
  requirement.

- **Postgres partial unique index instead of a soft-delete table.** The
  *user-cancels-ticket-then-rebuys* edge case looked at first like it needed a separate
  `ticket_history` archive. Soham's one-line fix —
  `CREATE UNIQUE INDEX uniq_active_ticket ON tickets (user_id, event_id) WHERE status != 'cancelled'`
  — solved it without any schema reshuffle.

- **In-memory LRU cache with 2-second TTL** instead of Redis for the demo. We kept the
  Redis adapter in `CacheAdapter.js` behind a `REDIS_URL` env flag (Strategy pattern),
  but for two VMs we run the simple in-memory path. When we noticed cross-VM staleness
  during E2E testing, instead of provisioning Redis we just dropped the TTL to 2s —
  acceptable for a counter that updates a few times per minute.

- **nip.io domain for HTTPS** instead of registering a real domain. `34.107.158.154.nip.io`
  resolves to the LB IP for free, no DNS records to manage, and Google's managed cert
  validates it in under 10 minutes. Same TLS lock-icon, zero recurring cost.

- **Markdown task board + CSV burndown** instead of pulling in Jira / Notion. Plain
  files live in `docs/project-journal/`, get diffed in pull requests, never go stale
  because they're version-controlled with the code.

- **`SERVICE` env switch as a refactor stepping-stone.** Before splitting into per-service
  folders, we ran 6 microservices off a single backend image switched by `SERVICE=auth`
  vs `SERVICE=events` env var. That intermediate state let us validate the topology
  (nginx routing, container-to-container DNS, env wiring) before committing to the
  folder split. The split landed without surprises.

**What this looked like in practice:** the entire backend is ~6000 lines across six
services and a `shared/` module — small enough that the whole team can read the diff
of any sprint in one sitting. The CI pipeline finishes unit + integration tests in
under 90 seconds. The 8-container production stack boots from a 140-line bash startup
script.

---

## Trade-offs we'd revisit

We knowingly traded Feedback (we did not set up a staging environment with synthetic
load tests) and Courage (we did not refactor early when EventService cache invalidation
started getting messy across multi-VM containers — we band-aided with shorter TTLs).
Those would be the first items on a v4 backlog.
