# Sprint 4 Task Board — Mar 29 – Apr 11

**Theme:** Stripe + Tests · real-money flow end-to-end + integration test harness.

**Sprint goal:** Replace the stub Stripe path with a real PaymentIntent flow (server +
client + ticket-side verify) and lock in regression coverage via 24 integration tests.

**Capacity:** 22 story points

## Swimlanes (end of sprint)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| — | — | — | ZST-015, ZST-016, ZST-017, ZST-018, ZST-019 |

## Stories

| ID | Story | Owner | Points | Status |
|----|-------|-------|--------|--------|
| ZST-015 | Backend Dockerfile + docker-compose stack (postgres+backend+frontend+seed) | Kalhar | 3 | ✅ Done |
| ZST-016 | Real Stripe SDK integration (PaymentIntent create + retrieve) | Nihar | 5 | ✅ Done |
| ZST-017 | Stripe Elements checkout on event detail page | Nihar (UI) + Soham (PaymentStrategy) | 5 | ✅ Done |
| ZST-018 | Integration tests covering 24 API flows | Soham | 5 | ✅ Done |
| ZST-019 | Partial unique index fix for ticket re-purchase after cancel | Soham | 2 | ✅ Done |

## Burndown

| Day | Date | Remaining points | Note |
|-----|------|------------------|------|
| 0 | Mar 29 | 22 | Sprint start |
| 3 | Apr 1 | 19 | ZST-015 done |
| 5 | Apr 3 | 14 | ZST-016 done |
| 8 | Apr 6 | 9 | ZST-017 done |
| 11 | Apr 9 | 7 | ZST-019 done |
| 14 | Apr 11 | 0 | ZST-018 done |

**Velocity:** 22 points · all stories closed.

## Retrospective notes
- Stripe test mode (`pm_card_visa`) made E2E testing reproducible without hitting the dashboard.
- Partial unique index (`WHERE status != 'cancelled'`) — one-line fix vs. soft-delete archive table. Big win.
- Integration tests caught the cross-service-call timing bug before Sprint 5 deploy.
