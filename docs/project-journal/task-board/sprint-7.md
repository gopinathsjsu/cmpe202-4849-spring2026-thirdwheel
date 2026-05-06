# Sprint 7 Task Board — May 4 – May 10 (final sprint)

**Theme:** Mail Flow + Polish + HTTPS · production-quality role-aware UX with real emails.

**Sprint goal:** Wire the full email lifecycle (confirm / cancel / reschedule / 12h-reminder)
through real Gmail SMTP, add role-aware action UI on event detail (admin/organizer can
cancel + reschedule), terminate TLS at the LB via a Google-managed cert, and ship
real-time counters + 10-char unique ticket codes.

**Capacity:** 33 story points

## Swimlanes (end of sprint)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| — | — | — | ZST-027 through ZST-040 (14 stories) |

## Stories

| ID | Story | Owner | Points | Status |
|----|-------|-------|--------|--------|
| ZST-027 | Real Gmail SMTP + 5 email templates (confirm / cancel / reschedule / reminder / ticket-cancel) | Kalhar | 5 | ✅ Done |
| ZST-028 | Role-aware event detail page (admin/organizer cancel + reschedule; attendee register) | Nihar | 5 | ✅ Done |
| ZST-029 | `POST /api/events/:id/cancel` + `/reschedule` with attendee emails | Nihar | 5 | ✅ Done |
| ZST-030 | 12h-before reminder cron loop in api-notifications | Kalhar | 3 | ✅ Done |
| ZST-031 | Google Maps location link button baked into all event emails | Kalhar | 2 | ✅ Done |
| ZST-032 | Demo accounts mapped to team Gmails + display names | Kalhar + Soham | 2 | ✅ Done |
| ZST-033 | Quick-login buttons on `/login` auto-fill team credentials | Soham | 1 | ✅ Done |
| ZST-034 | HTTPS via Google-managed cert (`34.107.158.154.nip.io`) | Nihar | 3 | ✅ Done |
| ZST-035 | Stripe Elements `paymentReady` gate fix | Nihar | 2 | ✅ Done |
| ZST-036 | Events-grid CSS fix (move from `home.css` to `events.css`) | Nihar | 1 | ✅ Done |
| ZST-037 | Real-time counter — 2s cache TTL + invalidate-on-write | Nihar + Soham | 2 | ✅ Done |
| ZST-038 | 10-char ticket code from unambiguous alphabet + retry on UNIQUE collision | Soham | 1 | ✅ Done |
| ZST-039 | Observer hardening — per-attendee try/catch + log success counts | Nihar | 1 | ✅ Done |
| ZST-040 | Project journal + weekly scrum + XP values + burndown | Soham + Kalhar | 2 | ✅ Done |

## Daily burndown

| Day | Date | Remaining points | Completed today |
|-----|------|------------------|-----------------|
| 0 | May 4 | 33 | sprint start |
| 1 | May 4 | 28 | ZST-027 (Kalhar: SMTP + 4 templates) |
| 2 | May 5 | 18 | ZST-029 + tickets observer (Nihar + Soham) |
| 3 | May 6 | 12 | ZST-030 + schema migrations (Kalhar) |
| 4 | May 7 | 5 | ZST-028 + ZST-033 + VM SMTP env (Nihar + Soham) |
| 5 | May 8 | 2 | ZST-031 + ZST-032 (Kalhar + Soham) |
| 6 | May 9 | 0 | ZST-034 + ZST-035 + ZST-036 (Nihar) |
| 7 | May 10 | 0 | ZST-037 + ZST-038 + ZST-039 + ZST-040 hardening + journal |

**Velocity:** 33 points · all stories closed. **All in-scope work delivered.**

## Retrospective notes
- Multi-VM in-memory caches caused cross-VM staleness (one VM's cache invalidate didn't propagate to peer). Pragmatic fix: drop TTL to 2s. Long-term: ZST-043 (Redis).
- Gmail SMTP rate-limited bulk attendee sends briefly (~50 emails/burst). Acceptable for current demo scale; ZST-044 will move to managed Cloud Scheduler + per-recipient queue.
- Demo migrations are idempotent — they fire on every container start but only swap rows still matching the old fixtures. Safe to redeploy any number of times.
- Stripe `confirmPayment()` raised "Element not mounted" intermittently when users rapidly toggled the quantity selector → cleanly fixed with `onReady` callback + disabled-until-ready button state (ZST-035).
