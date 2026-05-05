# Sprint 3 Task Board — Mar 15 – Mar 28

**Theme:** Frontend + Email · land all user-visible pages and the email-side observer wiring.

**Sprint goal:** Build the entire Next.js frontend (landing, listing, detail, auth, dashboard,
admin, notifications) + email adapter + observers wiring domain events to email side effects.

**Capacity:** 18 story points

## Swimlanes (end of sprint)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| — | — | — | ZST-010, ZST-011, ZST-012, ZST-013 |

## Stories

| ID | Story | Owner | Points | Status |
|----|-------|-------|--------|--------|
| ZST-010 | Email adapter (Ethereal / SMTP / Noop providers + templates) | Kalhar | 3 | ✅ Done |
| ZST-011 | Frontend landing + events listing pages | Nihar | 5 | ✅ Done |
| ZST-012 | Frontend auth + dashboard (login / register / my-tickets) | Soham | 5 | ✅ Done |
| ZST-013 | Frontend admin dashboard + notifications page | Kalhar | 5 | ✅ Done |

## Burndown

| Day | Date | Remaining points | Note |
|-----|------|------------------|------|
| 0 | Mar 15 | 18 | Sprint start |
| 3 | Mar 18 | 15 | ZST-010 done |
| 7 | Mar 22 | 10 | ZST-011 done |
| 10 | Mar 25 | 5 | ZST-012 done |
| 14 | Mar 28 | 0 | ZST-013 done |

**Velocity:** 18 points · all stories closed.

## Retrospective notes
- Ethereal preview links saved us hours in W6 — visual email QA without setting up SMTP.
- Frontend chose Next.js App Router pattern; server-component-aware structure helps when we later add SSR caching.
- Vanilla CSS proved viable: zero CSS-in-JS, fast initial paint, no Tailwind bundle hit.
