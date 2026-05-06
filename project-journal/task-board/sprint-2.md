# Sprint 2 Task Board — Mar 1 – Mar 14

**Theme:** Core Domain · repositories, services, payment strategy, moderation pipeline.

**Sprint goal:** Land all 6 repository modules, EventService + TicketingService facades,
PaymentStrategy (Free / MockCard / Stripe-stub), CoR-based moderation, in-process event bus.

**Capacity:** 26 story points

## Swimlanes (end of sprint)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| — | — | — | ZST-005, ZST-006, ZST-007, ZST-008, ZST-009, ZST-014 |

## Stories

| ID | Story | Owner | Points | Status |
|----|-------|-------|--------|--------|
| ZST-005 | Event repository + routes (list / detail / CRUD / attendees) | Nihar | 8 | ✅ Done |
| ZST-006 | Tickets routes (purchase / my-tickets / cancel) + TicketingService facade | Soham | 5 | ✅ Done |
| ZST-007 | Pluggable PaymentStrategy (Free / MockCard / Stripe stub) | Soham | 3 | ✅ Done |
| ZST-008 | Moderation pipeline (CoR — Spam + CapacitySanity + TrustedOrganizer) | Nihar | 5 | ✅ Done |
| ZST-009 | Cache adapter (in-memory LRU + Redis read-through) | Kalhar | 3 | ✅ Done |
| ZST-014 | Domain event bus (Observer) | Soham | 2 | ✅ Done |

## Burndown

| Day | Date | Remaining points | Note |
|-----|------|------------------|------|
| 0 | Mar 1 | 26 | Sprint start |
| 3 | Mar 4 | 23 | ZST-007 done |
| 5 | Mar 6 | 18 | ZST-014 done |
| 8 | Mar 9 | 13 | ZST-005 → 5pt slice done |
| 10 | Mar 11 | 10 | ZST-008 done |
| 12 | Mar 13 | 5 | ZST-006 done |
| 14 | Mar 14 | 0 | ZST-009 done |

**Velocity:** 26 points · all stories closed.

## Retrospective notes
- Strategy pattern paid off — adding StripePaymentStrategy in Sprint 4 was a one-class change.
- Decided to keep cache invalidation hand-rolled (prefix-based del) instead of using Redis tags.
- Bus = `EventEmitter`; no broker. Sufficient for single-process testing, will reconsider if we add reminder cron (deferred to S6).
