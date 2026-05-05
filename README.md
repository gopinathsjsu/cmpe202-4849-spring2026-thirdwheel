# Zestify — Event Management Platform

**CMPE 202 Spring 2026 · Team Thirdwheel · San Jose State University**

Eventbrite-style event management platform built as a fully production-grade microservice
system deployed on Google Cloud Platform.

> **Live demo:** **<https://34.107.158.154.nip.io>**
> **Repo:** <https://github.com/gopinathsjsu/team-project-thirdwheel>

---

## Team

| Member | Role | GitHub |
|--------|------|--------|
| **Nihar Patel** | Events service + Payments service + CI/CD + GCP infra | [@Nihar4](https://github.com/Nihar4) |
| **Soham Raj Jain** | Auth service + Tickets service + Integration tests + Frontend chrome | [@Soham-Raj-Jain](https://github.com/Soham-Raj-Jain) |
| **Kalhar Patel** | Admin service + Notifications service + Adapters + DevOps | [@kalhar108](https://github.com/kalhar108) |

Per-service ownership table → [docs/project-journal/task-board.md](docs/project-journal/task-board.md)

---

## What You Can Do

### Attendee
- Browse approved events with search / category / city / online filters.
- Buy free tickets in one click; pay for paid events via real Stripe Elements (test mode card `4242 4242 4242 4242`).
- Receive **email confirmation** the moment a ticket is issued.
- Get a **12-hour reminder email** before any event you're registered for.
- Get **automatic email + in-app notification** if the organizer or admin cancels or reschedules the event — including a **clickable "Open in Google Maps"** link.
- See real-time spots-left counter on each event card.
- Cancel your own ticket; re-buy later thanks to the partial-unique-index hack.

### Organizer
- Create events with venue, capacity, price, schedule, lat/lon, Google Maps link, image, and tags.
- Auto-moderation: a Chain-of-Responsibility pipeline auto-approves trusted organizers, auto-rejects spam (e.g. "free iPhone giveaway") and impossible capacities (>100k).
- **Reschedule any of your events** → all registered attendees are emailed + notified with old vs new schedule + Google Maps link.
- **Cancel any of your events** → all attendees emailed + notified; their tickets cascade-cancel.
- View attendees, organizer stats.

### Admin
- See pending moderation queue; approve / reject events with audit-logged reasons.
- Cancel or reschedule ANY event in the system.
- View dashboard stats (users / events / tickets / revenue).
- Manage user accounts.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, plain CSS (no Tailwind), Stripe Elements |
| API gateway | nginx in-VM path router (per-service upstream resolution) |
| Backend | 6 Node.js / Express microservices, all `node:20-bookworm-slim` |
| Database | Postgres 16 on **Cloud SQL (Enterprise)** |
| Cache | In-memory LRU per process (Redis adapter scaffolded behind `REDIS_URL`) |
| Payments | **Stripe** (test mode, real SDK, real PaymentIntent verify) |
| Email | **Nodemailer over Gmail SMTP** (app password) + Ethereal / Noop providers |
| Auth | JWT (HS256, 7d), bcryptjs |
| Patterns | Repository, Strategy, Facade, Observer, CoR, State, Adapter, Template Method |
| Container runtime | Docker on Debian 12 Compute Engine VMs |
| Orchestration | **Compute Engine MIG** (2 × e2-medium, regional us-west1, 8 containers/VM) |
| Load balancer | **Global HTTPS LB** (Google-managed cert via nip.io domain) |
| CI/CD | GitHub Actions (unit + frontend-build + integration + AR push + MIG rolling-restart) |
| Infra as code | Terraform modules (artifact_registry · cloud_sql · cloud_run · iam · storage · secrets) |

---

## Architecture (microservices)

```
Internet
   │
   ▼
[Global HTTPS LB] 34.107.158.154.nip.io  (Google-managed TLS cert)
   │
   ▼
[Backend Service] zestify-microsvc-svc → health check /api/health
   │
   ▼
[MIG: zestify-microsvc-mig — regional us-west1]
   ├── VM zestify-microsvc-A (us-west1-b)
   │     └── Docker: nginx → routes /api/<svc>/* to upstream container
   │              ├── api-auth          (port 5001)
   │              ├── api-events        (port 5002)
   │              ├── api-tickets       (port 5003)
   │              ├── api-notifications (port 5004)  — runs 12h reminder cron
   │              ├── api-admin         (port 5005)
   │              ├── api-payments      (port 5006)
   │              └── frontend          (port 3000)
   └── VM zestify-microsvc-B (us-west1-c) — identical stack
                              │
                              ▼
                       [Cloud SQL — Postgres 16]
                              zestify-db
```

### Cross-service flow examples

**Ticket purchase with Stripe:**
1. Frontend mounts `<PaymentElement>` from Stripe Elements (publishable key baked at build).
2. `POST /api/payments/intent` → api-payments → Stripe SDK → returns `clientSecret`.
3. Browser confirms payment with `stripe.confirmPayment()`.
4. `POST /api/tickets` with `payment_intent_id` → api-tickets calls api-payments via internal HTTP (`X-Internal-Secret` header) to verify PI status → only then persists ticket and emits `TICKET_PURCHASED`.
5. api-tickets observer sends confirmation email via Gmail SMTP with Google Maps link.

**Event cancellation:**
1. Organizer or admin clicks "Cancel Event" on event detail page.
2. `POST /api/events/:id/cancel` → api-events snapshots attendees → sets event status to `cancelled` → cascade-cancels all attendee tickets → emits `EVENT_CANCELLED`.
3. api-events observer iterates attendees (per-attendee try/catch so one bounce doesn't block the rest) → writes notification row + sends cancellation email with reason + new "Open in Google Maps" link.

**12-hour reminder:**
1. `reminderLoop.js` in api-notifications polls Postgres every 5 minutes.
2. Finds events with `status='approved' AND reminder_sent_at IS NULL AND (date+time) between NOW+11h and NOW+13h`.
3. For each event → fetch attendees → write notification rows + send `Event Starting Soon` email with location block.
4. Marks event `reminder_sent_at = NOW()` to prevent duplicates.

---

## Demo Accounts (auto-fill on `/login`)

| Role | Email | Quick-Login Button |
|------|-------|--------------------|
| **Admin** — Kalhar | `kalharpatel10@gmail.com` | 👑 Admin |
| **Organizer** — Soham | `sohamrajjain0007@gmail.com` | 🎯 Organizer |
| **Attendee** — Nihar | `nihardharmeshkumar.patel@sjsu.edu` | 🎫 Attendee |

Password for all three: `password123`

Click the appropriate Quick-Login button on the `/login` page → fields auto-fill → click Sign In.

---

## Local Development

```bash
git clone https://github.com/gopinathsjsu/team-project-thirdwheel.git zestify
cd zestify

# 1. Copy env example + fill in your Stripe test keys + Gmail app password
cp .env.example .env

# 2. Bring up full microservice stack
docker compose -f docker-compose.microsvc.yml up -d --build

# 3. Seed Postgres
docker compose -f docker-compose.microsvc.yml --profile init run --rm seed

# 4. Open
open http://localhost:8080
```

Frontend → `http://localhost:8080` · Backend gateway → same URL prefixed `/api/*`

---

## Production Deployment

See [docs/deployment-gcp.md](docs/deployment-gcp.md) for full GCP runbook including:
- Compute Engine MIG + Instance Template + Startup Script
- Cloud SQL provisioning + authorized networks
- Artifact Registry repo + image promotion
- Global HTTPS Load Balancer + Google-managed SSL cert
- GitHub Actions CI → AR push → MIG rolling-restart

### Quick deploy
```bash
# Triggers full pipeline on push to main
git push origin main
```

CI builds 6 service images + nginx + frontend in parallel matrix, pushes to Artifact Registry, then `gcloud compute instance-groups managed rolling-action restart zestify-microsvc-mig` to pull `:latest`.

---

## Design Patterns Used (CMPE 202 deliverable)

| Pattern | Location | Notes |
|---------|----------|-------|
| **Repository** | `shared/repositories/{User,Event,Ticket,Category,Notification,Admin}Repository.js` | Encapsulates Postgres access |
| **Strategy** | `services/tickets/strategy.js` | Pluggable PaymentStrategy (Free / MockCard / Stripe) selected at runtime |
| **Facade** | `services/tickets/service.js` (`TicketingService.purchase`) | Single call hides capacity check + payment + persist + notify + email |
| **Observer** | `shared/domain/DomainEvents.js` + `services/*/observers.js` | In-process event bus on Node's EventEmitter |
| **Chain of Responsibility** | `services/events/moderation.js` | SpamFilter → CapacitySanity → TrustedOrganizer → admin queue |
| **State Machine** | `shared/domain/StateMachine.js` | Legal-transition assertions for events + tickets |
| **Adapter** | `shared/adapters/{Email,Cache,Storage,Stripe}Adapter.js` | Pluggable infra back-ends |
| **Template Method** | `shared/adapters/EmailAdapter.js` | Shared email-rendering skeleton, per-event-type subject + body |

---

## Project Journal (course requirement)

All project-management artefacts live under [`docs/project-journal/`](docs/project-journal/):

| File | Contents |
|------|----------|
| [`weekly-scrum.md`](docs/project-journal/weekly-scrum.md) | 12-week scrum log with the three daily-standup questions per member per week |
| [`xp-values.md`](docs/project-journal/xp-values.md) | Reflection on **Communication** + **Simplicity** XP core values |
| [`sprint-backlog.csv`](docs/project-journal/sprint-backlog.csv) | All 40 stories + 5 backlog items with acceptance criteria, owner, points |
| [`task-board.md`](docs/project-journal/task-board.md) | Swimlane view + sprint-by-sprint outcomes + per-member story ownership |
| [`burndown.csv`](docs/project-journal/burndown.csv) | Velocity per sprint + daily burndown for the final sprint |

> CSV files can be opened directly in Google Sheets via *File → Import → Upload*.

---

## Test Suite

```bash
cd backend

# Unit tests
node --test tests/unit/PaymentStrategy.test.js tests/unit/StateMachine.test.js \
            tests/unit/ModerationPipeline.test.js tests/unit/validate.test.js

# Integration tests (24 black-box cases hitting auth/events/tickets/RBAC/Stripe/state machine)
TEST_API_URL=http://localhost:8080 node --test tests/integration/api.test.js

# E2E smoke against live deployment
TEST_API_URL=https://34.107.158.154.nip.io ./scripts/smoke.sh
```

CI runs unit + integration on every push. Deploy steps require the `GCP_SA_KEY` repo secret and are skipped silently when absent.

---

## Environment Variables

Copy `.env.example` → `.env`. Required for local development:

```env
# Stripe (test mode keys: https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# JWT signing secret
JWT_SECRET=change-me

# Internal-secret for cross-service auth (api-tickets → api-payments)
INTERNAL_SECRET=internal-zestify-2026

# Gmail SMTP — use an app password, never your real Gmail password
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM="Zestify Events <your.email@gmail.com>"
```

---

## Repository Layout

```text
zestify/
├── backend/
│   ├── shared/                 # Cross-service modules
│   │   ├── adapters/           # Email, Cache, Storage, Stripe
│   │   ├── db/                 # pool.js + schema.postgres.sql + seed.js
│   │   ├── domain/             # StateMachine.js + DomainEvents.js
│   │   ├── middleware/         # auth, roles, validate, asyncHandler, errorHandler
│   │   ├── repositories/       # User/Event/Ticket/Category/Notification/Admin
│   │   ├── server-base.js      # Express factory
│   │   └── utils/              # calendar, email, passwordPolicy
│   ├── services/
│   │   ├── auth/               # server.js + routes.js + Dockerfile
│   │   ├── events/             # + service.js + observers.js + moderation.js
│   │   ├── tickets/            # + service.js + strategy.js + observers.js + refundEligibility.js
│   │   ├── payments/           # + Stripe-side endpoints
│   │   ├── notifications/      # + reminderLoop.js + dedup.js + digestBuilder.js
│   │   └── admin/              # + service.js + observers.js + csvExport.js
│   └── tests/                  # unit/ + integration/
├── frontend/
│   ├── src/app/                # Next.js App Router pages
│   ├── src/components/         # Navbar, Footer, EventCard
│   └── src/lib/                # api.js, auth.js, toast.js, storage.js
├── nginx/                      # nginx.microsvc.conf + Dockerfile
├── terraform/                  # Modules + envs/{dev,prod}
├── scripts/                    # vm-startup.sh, deploy.sh, smoke.sh, ci-local.sh, tf_apply.sh
├── docs/
│   ├── deployment-gcp.md       # GCP runbook (Compute MIG + LB + Cloud SQL + HTTPS)
│   └── project-journal/        # Weekly scrum + XP values + backlog + burndown + task board
├── docker-compose.microsvc.yml # Local 8-container stack
└── .github/workflows/ci.yml    # Unit + frontend-build + integration + AR push + MIG restart
```

---

## License

CMPE 202 Spring 2026 educational use.
