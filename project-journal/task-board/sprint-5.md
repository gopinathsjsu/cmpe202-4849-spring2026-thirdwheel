# Sprint 5 Task Board — Apr 12 – Apr 25

**Theme:** Microservices · split monolith into per-service folders, wire nginx router.

**Sprint goal:** Move from `SERVICE=auth/events/...` env-switch monolith to per-service
folders with own Dockerfile, package.json, and shared/ module. Wire api-tickets to
call api-payments over internal HTTP with `X-Internal-Secret` header.

**Capacity:** 16 story points

## Swimlanes (end of sprint)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| — | — | — | ZST-020, ZST-021, ZST-022 |

## Stories

| ID | Story | Owner | Points | Status |
|----|-------|-------|--------|--------|
| ZST-020 | Microservice topology (nginx in-VM path router + 8-container compose) | Kalhar | 5 | ✅ Done |
| ZST-021 | Per-service folder refactor (`services/{auth,events,tickets,payments,notifications,admin}/`) | All 3 | 8 | ✅ Done |
| ZST-022 | Cross-service Stripe verify (api-tickets → api-payments via HTTP + `X-Internal-Secret`) | Soham + Nihar | 3 | ✅ Done |

## Burndown

| Day | Date | Remaining points | Note |
|-----|------|------------------|------|
| 0 | Apr 12 | 16 | Sprint start |
| 4 | Apr 16 | 11 | ZST-020 done |
| 9 | Apr 21 | 3 | ZST-021 done |
| 14 | Apr 25 | 0 | ZST-022 done |

**Velocity:** 16 points · all stories closed.

## Retrospective notes
- The `SERVICE=auth` env-switch intermediate state was a refactor stepping-stone — let us validate nginx + Docker DNS before committing to folder split.
- nginx `resolver 127.0.0.11 ipv6=off valid=10s; set $upstream …;` pattern fixed lazy DNS — without it, an upstream restart killed the whole gateway.
- Shared module `backend/shared/package.json` (private workspace) avoided per-service copies of repository code.
