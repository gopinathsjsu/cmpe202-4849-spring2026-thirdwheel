# Story Task Board — Zestify

Snapshot at end of Sprint 7 (May 10, 2026). All 40 in-scope stories are **Done**.

> The full breakdown of stories, points, owners and acceptance criteria lives in
> [`sprint-backlog.csv`](sprint-backlog.csv). This board summarises the **swimlane
> view** at the end of each sprint and tracks team-level WIP.

---

## Swimlane View — End of Sprint 7 (current)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| ZST-041 Cloud SQL Auth Proxy (Backlog) | — | — | ZST-001 → ZST-040 |
| ZST-042 Stripe refund webhook (Backlog) | | | (all 40 in-scope stories) |
| ZST-043 Redis multi-VM cache (Backlog) | | | |
| ZST-044 Cloud Scheduler reminder cron (Backlog) | | | |
| ZST-045 Frontend FSD reorganization (Backlog) | | | |

---

## Sprint-by-Sprint Outcome

### Sprint 1 — Feb 15-28 (Foundations)
- ZST-001 Node/Next scaffolds ✅ Nihar+Kalhar
- ZST-002 Postgres schema + seed ✅ Soham
- ZST-003 JWT + role guard ✅ Soham
- ZST-004 State machine ✅ Nihar

**Burndown:** 13 / 13 points complete · velocity 13

### Sprint 2 — Mar 1-14 (Core Domain)
- ZST-005 Event repo + routes ✅ Nihar
- ZST-006 Tickets routes + TicketingService ✅ Soham
- ZST-007 PaymentStrategy ✅ Soham
- ZST-008 Moderation pipeline (CoR) ✅ Nihar
- ZST-009 Cache adapter ✅ Kalhar
- ZST-014 Domain event bus ✅ Soham

**Burndown:** 26 / 26 points complete · velocity 26

### Sprint 3 — Mar 15-28 (Frontend + Email)
- ZST-010 Email adapter ✅ Kalhar
- ZST-011 Landing + listing pages ✅ Nihar
- ZST-012 Auth + dashboard pages ✅ Soham
- ZST-013 Admin + notifications pages ✅ Kalhar

**Burndown:** 18 / 18 points complete · velocity 18

### Sprint 4 — Mar 29 - Apr 11 (Stripe + Tests)
- ZST-015 Backend Dockerfile + compose ✅ Kalhar
- ZST-016 Stripe SDK ✅ Nihar
- ZST-017 Stripe Elements ✅ Nihar
- ZST-018 24 integration tests ✅ Soham
- ZST-019 Partial unique index fix ✅ Soham

**Burndown:** 22 / 22 points complete · velocity 22

### Sprint 5 — Apr 12-25 (Microservices)
- ZST-020 nginx router + 8-container compose ✅ Kalhar
- ZST-021 Per-service folder refactor ✅ All 3
- ZST-022 Cross-service Stripe verify ✅ Soham → Nihar

**Burndown:** 16 / 16 points complete · velocity 16

### Sprint 6 — Apr 26 - May 3 (GCP Deploy)
- ZST-023 GitHub Actions CI/CD ✅ Nihar
- ZST-024 Compute MIG + HTTPS LB ✅ Nihar
- ZST-025 Terraform modules ✅ All 3
- ZST-026 Smoke + unit suites ✅ Kalhar+Nihar

**Burndown:** 24 / 24 points complete · velocity 24

### Sprint 7 — May 4-10 (Mail Flow + Polish + HTTPS)
- ZST-027 Gmail SMTP + 5 templates ✅ Kalhar
- ZST-028 Role-aware event detail ✅ Nihar
- ZST-029 Cancel + reschedule endpoints + emails ✅ Nihar
- ZST-030 12h reminder cron loop ✅ Kalhar
- ZST-031 Google Maps link in emails ✅ Kalhar
- ZST-032 Demo accounts mapped to team ✅ Kalhar+Soham
- ZST-033 Quick-login buttons ✅ Soham
- ZST-034 HTTPS (managed cert) ✅ Nihar
- ZST-035 Stripe paymentReady fix ✅ Nihar
- ZST-036 Events-grid CSS fix ✅ Nihar
- ZST-037 Real-time counter (cache TTL) ✅ Nihar+Soham
- ZST-038 10-char ticket code + retry ✅ Soham
- ZST-039 Observer hardening ✅ Nihar
- ZST-040 Project journal ✅ Soham+Kalhar

**Burndown:** 33 / 33 points complete · velocity 33

---

## Per-Member Story Ownership

| Member | Stories owned | Points delivered |
|--------|---------------|------------------|
| Nihar Patel | 14 (events, payments, infra, CI, role-aware UI, HTTPS) | 60 |
| Soham Raj Jain | 12 (auth, tickets, frontend auth pages, tests, journal) | 42 |
| Kalhar Patel | 11 (admin, notifications, devops, email, schema, journal) | 39 |
| Shared (multi-owner) | 3 (refactor, Terraform, demo accounts) | 11 |
| **Total in scope** | **40** | **152 points** |

> Average velocity 21.7 points/sprint across 7 two-week sprints.

---

## Definition of Done (applied to every story)

A story is moved to "Done" only when **all** of the following are true:

1. Code merged to `main` (passes CI: unit + frontend-build + integration-tests)
2. Acceptance criteria from `sprint-backlog.csv` manually verified or covered by automated test
3. Owner pushed working state to the live deployment at https://34.107.158.154.nip.io
4. Reviewing teammate (rotating pair) signed off in PR comment
5. README or relevant doc updated when the change is user-visible

---

## Tools

We chose **markdown + CSV in-repo** over Jira/Notion to keep everything version-controlled
with the code. Burndown numbers live in [`burndown.csv`](burndown.csv). For visual
reference, the same data can be opened in Google Sheets via *File → Import → Upload*.
