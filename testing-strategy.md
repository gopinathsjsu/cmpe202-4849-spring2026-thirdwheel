# Zestify — Testing Strategy

End-to-end testing approach for the Zestify microservice stack. Tests live at
three layers: unit (fast, no I/O), integration (real Postgres + real HTTP),
and smoke (real cluster). This doc explains what each layer covers, how it
runs locally, and how CI ties them together.

> Live cluster: https://34.107.158.154.nip.io

---

## Test pyramid

```
                    Smoke (live cluster)
                   /                    \
              Integration (real Postgres + real HTTP)
             /                                       \
        Unit (Node test runner, no I/O, pure functions)
```

| Layer | Count | Wall time | When it runs |
|-------|-------|-----------|--------------|
| Unit | 32 across 4 files | < 2 s | Every commit (CI), every save (developer's `node --watch`) |
| Integration | 24 against running stack | ~15 s | Every PR + push (CI), occasionally locally |
| Smoke | 47 vs live cluster | ~60 s | On-demand after deploy + before demo |

---

## 1. Unit tests

### Framework

Node's built-in `node:test` runner — no Jest, no Mocha, no global before/after
state. Each test imports the module under test directly + asserts with
`node:assert/strict`. Zero runtime deps.

```bash
cd backend
node --test tests/unit/PaymentStrategy.test.js \
            tests/unit/StateMachine.test.js \
            tests/unit/ModerationPipeline.test.js \
            tests/unit/validate.test.js
```

### Coverage matrix

| File | Module | Tests | Pattern under test |
|------|--------|-------|--------------------|
| `tests/unit/PaymentStrategy.test.js` | `services/tickets/strategy.js` | 8 | Strategy |
| `tests/unit/StateMachine.test.js` | `shared/domain/StateMachine.js` | 12 | State |
| `tests/unit/ModerationPipeline.test.js` | `services/events/moderation.js` | 8 | Chain of Responsibility |
| `tests/unit/validate.test.js` | `shared/middleware/validate.js` | 4 | Validation rules |

### Sample — PaymentStrategy

```js
test('selectStrategy returns Free when amount is 0', () => {
  const s = selectStrategy(0);
  assert.equal(s, strategies.free);
});

test('selectStrategy returns MockCard for positive amount', () => {
  const s = selectStrategy(25);
  assert.equal(s, strategies.mock_card);
});

test('selectStrategy honors stripe hint when amount > 0', () => {
  const s = selectStrategy(50, 'stripe');
  assert.equal(s, strategies.stripe);
});

test('FreeStrategy.charge returns completed for 0 amount', async () => {
  const r = await strategies.free.charge({ amount: 0 });
  assert.equal(r.status, 'completed');
  assert.equal(r.method, 'free');
});

test('FreeStrategy.charge rejects positive amount', async () => {
  await assert.rejects(() => strategies.free.charge({ amount: 5 }), { statusCode: 400 });
});

test('StripeStrategy.charge requires paymentIntentId', async () => {
  await assert.rejects(() => strategies.stripe.charge({ amount: 100 }), { statusCode: 400 });
});
```

### What unit tests are *not* allowed to do

- No `pg` / database I/O — use a fake repo if needed.
- No `fetch` / network I/O — strategies that wrap Stripe / SMTP take a transport
  port injected at construction time so tests pass a no-op double.
- No reading from `process.env` — config is injected as function args.
- No `setTimeout` — all assertions resolve synchronously or via `await`.

This discipline keeps the unit suite under 2 seconds locally and CI even
faster (no Postgres container spin-up).

---

## 2. Integration tests

### Setup

The integration test file (`tests/integration/api.test.js`) hits a running
backend at `TEST_API_URL` (default `http://localhost:5001`, set to the live
URL for cross-VM regression). It expects:

1. A running Postgres reachable on `PGHOST:PGPORT` with the Zestify schema +
   seed data loaded.
2. All six microservices running and reachable through the nginx gateway.

```bash
# Local docker-compose flow.
docker compose -f docker-compose.microsvc.yml up -d --build
docker compose -f docker-compose.microsvc.yml --profile init run --rm seed

# Wait for /api/health.
until curl -fsS http://localhost:8080/api/health >/dev/null; do sleep 2; done

# Run.
cd backend
TEST_API_URL=http://localhost:8080 \
STRIPE_SECRET_KEY=sk_test_... \
  node --test tests/integration/api.test.js
```

### Coverage

24 tests across these flows:

| # | Flow |
|---|------|
| 1 | `GET /healthz` returns ok |
| 2 | `GET /readyz` pings DB |
| 3 | `GET /api/health` version 2 |
| 4 | `GET /api/events` returns approved events with pagination |
| 5 | `GET /api/events?search=design` narrows results |
| 6 | `GET /api/events/categories` returns 10 |
| 7 | `GET /api/events/featured` returns featured events |
| 8 | `GET /api/events/:id` 404 for unknown |
| 9 | `GET /api/events/:id/calendar` returns ICS |
| 10 | `POST /api/auth/register` validates input |
| 11 | `POST /api/auth/login` bad password rejected |
| 12 | `POST /api/auth/login` + `/me` round-trip |
| 13 | RBAC: attendee blocked from `/api/admin/stats` |
| 14 | Admin: stats endpoint works |
| 15 | Admin: list pending events |
| 16 | Tickets: full purchase + cancel + repurchase round-trip (no UNIQUE-key conflict) |
| 17 | Notifications: list returns shape |
| 18 | Moderation pipeline: spam keywords auto-rejected on create |
| 19 | Moderation pipeline: capacity > 100k auto-rejected |
| 20 | State machine: re-approve already approved fails |
| 21 | Unknown route returns 404 |
| 22 | Stripe: PaymentIntent created for paid event |
| 23 | Stripe: PaymentIntent rejected for free event |
| 24 | Stripe: ticket purchase requires `paymentIntentId` for `stripe` method |

### Token caching

The test file maintains a per-email JWT cache (`_tokenCache = new Map()`) so
each test runs `login()` only once per email per file invocation. Cuts wall
time roughly in half.

### Stripe-aware skipping

Test 22 (`Stripe: PaymentIntent created for paid event`) is conditionally
skipped via `{ skip: !process.env.STRIPE_SECRET_KEY ? '...' : false }` so the
suite still passes in environments without Stripe creds (e.g. mirror forks
without `STRIPE_SK` secret).

### Idempotency

The tickets round-trip test (test 16) explicitly cleans up at the end so the
file can be re-run repeatedly without polluting the seed data:

```js
// Cleanup
await api(`/api/tickets/${repurchase.body.ticket.id}`,
  { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
```

The moderation tests (18, 19) create new events but those go to status
`rejected` so they don't appear in the listing. Slight schema bloat over time
is acceptable for a demo project — easy reseed via `docker compose --profile
init run --rm seed` if it ever matters.

---

## 3. Smoke tests (`scripts/smoke.sh` + `e2e_smoke.sh`)

Black-box validation against the live cluster. Bash + curl + jq. Designed to
run from a developer laptop with **zero** local Postgres / Docker — just hit
the public URL.

```bash
BASE=https://34.107.158.154.nip.io bash scripts/smoke.sh
```

Output:

```
=== Public health endpoints ===
  ✅ GET /api/health (HTTP 200)
=== Frontend pages ===
  ✅ GET / (HTTP 200)
  ✅ GET /events (HTTP 200)
  ✅ GET /login (HTTP 200)
  ✅ GET /register (HTTP 200)
=== Events public APIs ===
  ✅ GET /api/events?limit=5 (HTTP 200)
  ...
==========================================
 E2E SMOKE: 47 passed | 0 failed | 0 skipped
==========================================
```

The full smoke suite covers:

- Health endpoints (3)
- Frontend page loads (4)
- Events public APIs (9)
- Auth flow (8)
- RBAC (4)
- Tickets free purchase + cancel + repurchase (4)
- Notifications (2)
- Moderation pipeline (4)
- State machine illegal transitions (2)
- Stripe PaymentIntent + full purchase (5)
- 404 + miscellaneous (2)

### Full Stripe round-trip (server-side, no browser)

```bash
SK="sk_test_..."
BASE="https://34.107.158.154.nip.io"
TOKEN=$(curl -sS -H 'Content-Type: application/json' \
  -d '{"email":"sohamrajjain0007@gmail.com","password":"password123"}' \
  "$BASE/api/auth/login" | jq -r .token)

# 1. Create PaymentIntent.
PI=$(curl -sS -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"event_id":2,"quantity":1}' "$BASE/api/payments/intent")
PI_ID=$(echo "$PI" | jq -r .paymentIntentId)

# 2. Confirm via Stripe API with test PaymentMethod.
PM=$(curl -sS -u "$SK:" -X POST https://api.stripe.com/v1/payment_methods \
     -d type=card -d 'card[token]=tok_visa' | jq -r .id)

curl -sS -u "$SK:" -X POST "https://api.stripe.com/v1/payment_intents/$PI_ID/confirm" \
     -d "payment_method=$PM" -d 'return_url=http://localhost'

# 3. Submit ticket purchase with the verified PI.
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d "{\"event_id\":2,\"quantity\":1,\"payment_method\":\"stripe\",\"payment_intent_id\":\"$PI_ID\"}" \
     "$BASE/api/tickets"
```

Expected final JSON: `{"message":"Ticket confirmed!","ticket":{"id":...,"payment_status":"completed",...}}`

---

## 4. CI orchestration

`.github/workflows/ci.yml` jobs (sequential dependencies in parentheses):

```
unit-tests        ─┐
frontend-build     ├─→ integration-tests ─→ build-and-push ─→ deploy
                  ─┘
```

- `unit-tests`: Node 20, `node --test`. 16 s.
- `frontend-build`: `npm install --legacy-peer-deps` + `npm run lint` + `npm run build`. 28 s.
- `integration-tests`: brings up the 8-container compose stack + runs the
  integration file vs nginx on `localhost:8080`. 33 s.
- `build-and-push`: matrix over 6 backend services + nginx + frontend.
  Parallel `docker buildx build --push`. Gated on `github.repository ==
  'Nihar4/202_final_test'` so mirrors skip the deploy.
- `deploy`: `gcloud compute instance-groups managed rolling-action restart
  zestify-microsvc-mig` then a curl health check loop on `https://34.107.158.154.nip.io/api/health`.

Concurrency block at the workflow root:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

A new push to `main` while a previous run is still building cancels the
old run so we never have two rolling-restarts queued.

---

## 5. Test data philosophy

- **Seed is deterministic.** `backend/shared/db/seed.js` creates exactly 10
  users + 13 events + 12 tickets + 8 notifications + 10 categories. Repeatable.
- **No mutable global state across test files.** Each test does its own setup
  + cleanup. We did this on purpose so any subset of tests can run in any
  order, locally or in CI shards.
- **Stripe runs in test mode only.** All `pk_test_` / `sk_test_` keys.
  `pm_card_visa` shortcut is used everywhere instead of real card numbers.
- **Email goes to real Gmail SMTP** (with the team's app password). For
  attendees with placeholder addresses (e.g. `chris@zestify.com`) Gmail
  silently bounces; for the three team-member-mapped seed users the email
  delivers to the real inbox.

---

## 6. What we did *not* automate

| Gap | Why | Backlog item |
|-----|-----|--------------|
| Frontend E2E (Playwright / Cypress) | Smoke covers the user-facing behavior; full DOM-driven E2E doubles the test time without catching anything our integration file misses | ZST-046 |
| Load testing | Single-region, two-VM scale — load tests would only re-verify GCP's published autoscaling characteristics | ZST-047 |
| Security scanning (SAST) | `npm audit` runs implicitly via CI install step; full SAST tooling is overkill at our scale | ZST-048 |
| Visual regression | Wireframes are the visual contract; pixel diff tooling isn't worth the maintenance | — |

Backlog items live in [`project-journal/sprint-backlog.csv`](project-journal/sprint-backlog.csv).

---

## 7. Running everything in one shot

```bash
# 0. Bring up the stack.
docker compose -f docker-compose.microsvc.yml up -d --build
docker compose -f docker-compose.microsvc.yml --profile init run --rm seed
until curl -fsS http://localhost:8080/api/health >/dev/null; do sleep 2; done

# 1. Unit.
cd backend
node --test tests/unit/*.test.js

# 2. Integration.
TEST_API_URL=http://localhost:8080 \
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY \
  node --test tests/integration/api.test.js

# 3. Smoke (vs local stack OR vs live cluster — flip the URL).
BASE=http://localhost:8080 bash ../scripts/smoke.sh

# 4. Teardown.
docker compose -f ../docker-compose.microsvc.yml down -v
```

Expected total wall time: ~90 s for a clean run.
