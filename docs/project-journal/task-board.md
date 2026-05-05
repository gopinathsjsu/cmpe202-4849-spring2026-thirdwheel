# Story Task Board — Zestify

Per-sprint task boards live in [`task-board/`](task-board/). Each sprint file contains
its own swimlane view, story table, daily burndown, and retrospective.

| Sprint | Window | Theme | Points | File |
|--------|--------|-------|--------|------|
| 1 | Feb 15 – Feb 28 | Foundations | 13 | [`sprint-1.md`](task-board/sprint-1.md) |
| 2 | Mar 1 – Mar 14 | Core Domain | 26 | [`sprint-2.md`](task-board/sprint-2.md) |
| 3 | Mar 15 – Mar 28 | Frontend + Email | 18 | [`sprint-3.md`](task-board/sprint-3.md) |
| 4 | Mar 29 – Apr 11 | Stripe + Tests | 22 | [`sprint-4.md`](task-board/sprint-4.md) |
| 5 | Apr 12 – Apr 25 | Microservices | 16 | [`sprint-5.md`](task-board/sprint-5.md) |
| 6 | Apr 26 – May 3 | GCP Deploy | 24 | [`sprint-6.md`](task-board/sprint-6.md) |
| 7 | May 4 – May 10 | Mail Flow + Polish + HTTPS | 33 | [`sprint-7.md`](task-board/sprint-7.md) |
| **Total** | **Feb 15 – May 10** | — | **152** | — |

---

## Aggregate Swimlane (end of Sprint 7)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| — | — | — | ZST-001 → ZST-040 (40 stories, 152 pts) |
| **Backlog (post-class)** | | | |
| ZST-041 Cloud SQL Auth Proxy + IAM auth | | | |
| ZST-042 Stripe webhook for async PI events | | | |
| ZST-043 Redis cache for multi-VM coherence | | | |
| ZST-044 Cloud Scheduler-driven reminder cron | | | |
| ZST-045 Frontend FSD reorganization | | | |

Full backlog with acceptance criteria + points → [`sprint-backlog.csv`](sprint-backlog.csv).
Velocity per sprint + daily burndown → [`burndown.csv`](burndown.csv).

---

## Per-Member Story Ownership

| Member | Stories owned | Points delivered |
|--------|---------------|------------------|
| Nihar Patel | 14 (events, payments, infra, CI, role-aware UI, HTTPS) | 60 |
| Soham Raj Jain | 12 (auth, tickets, frontend auth pages, tests, journal) | 42 |
| Kalhar Patel | 11 (admin, notifications, devops, email, schema, journal) | 39 |
| Shared (multi-owner) | 3 (refactor, Terraform, demo accounts) | 11 |
| **Total in scope** | **40** | **152** |

Average velocity 21.7 points/sprint across 7 two-week sprints.

---

## Definition of Done

A story moves to ✅ Done only when all hold:

1. Code merged to `main` (CI green: unit + frontend-build + integration-tests)
2. Acceptance criteria from [`sprint-backlog.csv`](sprint-backlog.csv) manually verified or covered by automated test
3. Owner pushed working state to the live deployment at <https://34.107.158.154.nip.io>
4. Reviewing teammate (rotating pair) signed off in PR comment
5. README or relevant doc updated when the change is user-visible

---

## Tools

Markdown + CSV in-repo over Jira/Notion to keep everything version-controlled with the
code. CSV files import directly into Google Sheets via *File → Import → Upload*.
