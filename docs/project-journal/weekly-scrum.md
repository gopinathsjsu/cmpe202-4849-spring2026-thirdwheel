# Weekly Scrum Report — Zestify

CMPE 202 Spring 2026 · Team Thirdwheel · Nihar Patel, Soham Raj Jain, Kalhar Patel

Each weekly entry below covers the three daily-scrum questions for each team member:
1. **Worked on / completed** this week
2. **Planning to work on** next week
3. **Blocked on / waiting for** another team member

---

## Sprint 1

### Week 1 — Feb 15 – Feb 21

**Nihar Patel**
- Done: Initialized repo + base README + .gitignore; scaffolded Next.js 16 / React 19 frontend; scaffolded lockfile + base config.
- Next: Domain state machine for events + tickets; Google Calendar URL + ICS utility.
- Blocked: Waiting on Soham for the Postgres schema baseline before he can wire repositories.

**Soham Raj Jain**
- Done: Drafted CMPE 202 dependency requirements doc.
- Next: Initial Postgres schema (users, events, tickets, notifications); validate middleware; user repository.
- Blocked: Nothing — waiting on Kalhar's pg pool helper so the migrate runner can be reused.

**Kalhar Patel**
- Done: Backend Node/Express project scaffold + lockfile + .dockerignore.
- Next: pg pool with transaction helper + migrate runner; central async-handler / error-handler middleware; rich seed data.
- Blocked: Need Soham's schema file first before pool's `migrate()` can run.

### Week 2 — Feb 22 – Feb 28

**Nihar Patel**
- Done: Event + ticket state-machine module with legal-transition assertions; began scaffolding category repository.
- Next: Event repository with filters/pagination/counts; events API routes (list / search / detail / CRUD / attendees).
- Blocked: Awaiting Soham's user repo (used by event detail to enrich organizer info).

**Soham Raj Jain**
- Done: Postgres schema baseline; validate middleware; user repository with safe column projection.
- Next: Auth middleware (JWT) + role guard; auth routes (register / login / me / profile); domain event bus (Observer pattern).
- Blocked: None.

**Kalhar Patel**
- Done: pg pool with transaction helper + migrate runner; async / error middleware; rich seed data (10 users, 10 categories, 13 events, 12 tickets, 8 notifications).
- Next: Admin repository (audit log + dashboard stats); admin moderation + user mgmt routes.
- Blocked: None.

---

## Sprint 2

### Week 3 — Mar 1 – Mar 7

**Nihar Patel**
- Done: Category repository; began event repository design.
- Next: Event repository (filters / pagination / counts); Google Calendar URL + ICS generator; EventService orchestrating CRUD + lifecycle + cache invalidation.
- Blocked: Waiting on Soham's auth middleware so events routes can apply `requireRole('organizer','admin')`.

**Soham Raj Jain**
- Done: User repository; JWT auth middleware + role guard; auth routes (register / login / me / profile).
- Next: Ticket repository with active-ticket dedupe lookup; payment strategy (Free / MockCard / Stripe stub); domain event bus.
- Blocked: Need Nihar's StateMachine helper before TicketingService can call `assertTicketTransition`.

**Kalhar Patel**
- Done: Admin actions audit log + dashboard aggregate stats repo.
- Next: Admin moderation + user mgmt routes; email adapter (Ethereal / SMTP / Noop providers + templates); cache adapter (in-memory LRU + Redis read-through).
- Blocked: None.

### Week 4 — Mar 8 – Mar 14

**Nihar Patel**
- Done: Event repository with filters/pagination/counts; calendar utils; events routes; EventService.
- Next: Moderation pipeline (Chain of Responsibility) — SpamFilter → CapacitySanity → TrustedOrganizer.
- Blocked: Need Soham's domain event bus to emit `EVENT_APPROVED` / `EVENT_REJECTED`.

**Soham Raj Jain**
- Done: In-process domain event bus (Observer); pluggable PaymentStrategy (Free / MockCard / Stripe stub).
- Next: Ticket repository; tickets routes (purchase / my / cancel); TicketingService facade.
- Blocked: Waiting on Kalhar's email + notification repos for the side effects.

**Kalhar Patel**
- Done: Admin routes (moderation + user mgmt); organizer routes (my-events / stats); email adapter; storage adapter (local disk + GCS pluggable).
- Next: Notification repository; notifications routes; observers wiring domain events to side effects.
- Blocked: Need Soham's tickets observer registration so TICKET_PURCHASED triggers email.

---

## Sprint 3

### Week 5 — Mar 15 – Mar 21

**Nihar Patel**
- Done: EventService; moderation pipeline (CoR).
- Next: Frontend — landing page, EventCard, events listing page.
- Blocked: Need Soham's API client (frontend lib/api.js) before pages can fetch.

**Soham Raj Jain**
- Done: Ticket repository; tickets routes (with c_strip pattern hiding payment_intent_id until Stripe lands); TicketingService facade.
- Next: Frontend — login / register / dashboard pages; API client; JWT auth context + toast.
- Blocked: Waiting on Nihar's home / event pages for shared navbar wiring.

**Kalhar Patel**
- Done: Cache adapter; notification repository.
- Next: Express server bootstrap (helmet, compression, rate limit, healthz/readyz, graceful shutdown); observers wiring domain events.
- Blocked: None.

### Week 6 — Mar 22 – Mar 28

**Nihar Patel**
- Done: Frontend landing page + EventCard + events listing page; began event detail page.
- Next: Event detail page with OpenStreetMap embed; event creation page with map link parsing; backend Dockerfile.
- Blocked: Awaiting Soham's API client + auth context so pages can authenticate.

**Soham Raj Jain**
- Done: Frontend API client (auth + events + tickets + admin + notifications); JWT auth context + toast; login + register pages; Navbar + Footer.
- Next: My-tickets dashboard page; dashboard CSS; integration tests covering full flow.
- Blocked: None.

**Kalhar Patel**
- Done: Server bootstrap; observers wiring; notifications routes; backend Dockerfile.
- Next: Docker Compose stack (postgres + backend + frontend + seed); admin dashboard page; notifications page.
- Blocked: Waiting on Nihar's frontend Dockerfile for the compose front-end service.

---

## Sprint 4

### Week 7 — Mar 29 – Apr 4

**Nihar Patel**
- Done: Event detail page; event creation page with Google Maps link parsing.
- Next: Stripe SDK adapter — `PaymentIntent` create + retrieve; `/api/payments/intent` endpoint.
- Blocked: Need Soham's PaymentStrategy.js to accept `paymentIntentId` parameter so tickets flow can verify Stripe.

**Soham Raj Jain**
- Done: My-tickets page + dashboard CSS; partial unique index migration for ticket re-purchase after cancel.
- Next: Real Stripe verification in PaymentStrategy + wire payment_intent_id through ticketing flow; frontend Stripe Elements checkout.
- Blocked: Awaiting Nihar's Stripe adapter for PaymentIntent.retrieve calls.

**Kalhar Patel**
- Done: Docker Compose stack; admin dashboard page; notifications page.
- Next: Per-service Dockerfile pattern; nginx in-VM path router config; docker-compose.microsvc.yml (8-container stack).
- Blocked: None.

### Week 8 — Apr 5 – Apr 11

**Nihar Patel**
- Done: Stripe SDK adapter; `/api/payments/intent` endpoint.
- Next: Frontend Stripe Elements checkout on event detail page; integration tests for Stripe flow.
- Blocked: None.

**Soham Raj Jain**
- Done: Real Stripe verification in PaymentStrategy; integration tests (24 tests covering auth/events/tickets/RBAC/state machine/Stripe).
- Next: Cross-service Stripe verify — api-tickets calls api-payments via internal HTTP.
- Blocked: Need Nihar's per-service folder refactor before the cross-service URL pattern is wired.

**Kalhar Patel**
- Done: Per-service Dockerfiles; nginx microsvc router; docker-compose.microsvc.yml; backend Dockerfile finalized.
- Next: Per-service refactor — split monolith into `services/{auth,events,tickets,payments,notifications,admin}/`.
- Blocked: None.

---

## Sprint 5

### Week 9 — Apr 12 – Apr 18

**Nihar Patel**
- Done: Frontend Stripe Elements checkout; refactor of EventService for new per-service layout.
- Next: GitHub Actions CI/CD workflow (matrix build, AR push, MIG rolling-restart); GCP deployment guide; deploy.sh orchestrator.
- Blocked: Awaiting Kalhar's per-service refactor of admin/notifications.

**Soham Raj Jain**
- Done: Cross-service Stripe verify (api-tickets → api-payments internal HTTP); auth + tickets services split out.
- Next: Unit tests for PaymentStrategy + validate; smoke + integration tests for new microservice topology.
- Blocked: None.

**Kalhar Patel**
- Done: Refactored admin + notifications services into per-service folders; shared/ module structure.
- Next: VM startup script that pulls + composes 8 containers; instance template + MIG provisioning notes.
- Blocked: Waiting on Nihar's CI workflow so MIG metadata aligns with Artifact Registry image names.

### Week 10 — Apr 19 – Apr 25

**Nihar Patel**
- Done: CI/CD workflow; deploy.sh; GCP deploy guide; VM startup script + instance template.
- Next: Jenkins-in-Docker setup + ci-local helper; Terraform root module + artifact_registry / cloud_run_frontend modules.
- Blocked: None.

**Soham Raj Jain**
- Done: Unit tests; smoke test script; integration tests against nginx-fronted microsvc stack.
- Next: Terraform cloud_sql + secrets modules; envs/dev composition; tf_apply.sh helper.
- Blocked: Waiting on Kalhar's iam module so service-account roles can be referenced.

**Kalhar Patel**
- Done: Started Terraform — cloud_run_backend module + storage module + iam module; envs/prod composition.
- Next: Terraform outputs + variables + tfvars.example; final infra glue.
- Blocked: None.

---

## Sprint 6

### Week 11 — Apr 26 – May 3

**Nihar Patel**
- Done: Jenkinsfile + jenkins/docker-compose setup; Terraform root + AR + cloud_run_frontend modules.
- Next: Migrate seed users to team Gmails; HTTPS LB; **role-aware event detail page** with cancel + reschedule for admin/organizer.
- Blocked: Need Kalhar's reminder cron + email templates before observers can send the event-cancelled / rescheduled emails.

**Soham Raj Jain**
- Done: Terraform cloud_sql + secrets modules; envs/dev composition; tf_apply.sh helper; ticket repurchase fix.
- Next: API client `events.cancel` / `events.reschedule` methods; quick-login buttons on /login auto-fill team credentials.
- Blocked: Waiting on Nihar's role-aware page shell.

**Kalhar Patel**
- Done: Terraform outputs + variables + tfvars.example + envs/prod composition.
- Next: Real Gmail SMTP provider; 4 new email templates (cancel / reschedule / reminder / ticket-cancel); 12h-before reminder cron loop in api-notifications.
- Blocked: Need Soham's `EVENT_CANCELLED` / `EVENT_RESCHEDULED` domain event types before observer registration.

### Week 12 — May 4 – May 10

**Nihar Patel**
- Done: `EventService.cancel` + `reschedule`; events routes for cancel/reschedule; events-side observer wiring; role-aware event detail page with `RescheduleModal`; VM startup SMTP env injection; HTTPS LB via Google-managed cert + nip.io; events-grid CSS fix; Stripe paymentReady gate; lower cache TTLs; per-attendee try/catch in observers.
- Next: Final E2E demo prep; documentation pass.
- Blocked: None.

**Soham Raj Jain**
- Done: 3 new domain event types; tickets observer for ticket-cancellation email; API client cancel/reschedule; quick-login buttons; 10-char ticket code with retry on UNIQUE collision; cache invalidate on ticket cancel; refund eligibility helper; password validator wrapper.
- Next: Project journal docs; weekly scrum write-up; XP values reflection.
- Blocked: None.

**Kalhar Patel**
- Done: Real Gmail SMTP + 4 new email templates; Google Maps link helper baked into all event emails; demo accounts migration (admin → Kalhar, organizer → Soham, attendee → Nihar) + display names; 12h reminder cron loop; idempotent schema migrations; notification dedup helper; admin CSV export; email digest builder.
- Next: Sprint backlog spreadsheet; burndown chart; final journal entries.
- Blocked: None.
