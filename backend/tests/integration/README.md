# Backend Integration Tests

24 black-box test cases hitting a live backend through the nginx gateway.
Lives in [`api.test.js`](api.test.js).

## Running locally

```bash
# Bring up the full stack.
docker compose -f docker-compose.microsvc.yml up -d --build
docker compose -f docker-compose.microsvc.yml --profile init run --rm seed

# Wait for /api/health.
until curl -fsS http://localhost:8080/api/health >/dev/null; do sleep 2; done

# Run tests.
cd backend
TEST_API_URL=http://localhost:8080 \
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY \
  node --test tests/integration/api.test.js
```

## Running against live cluster

```bash
TEST_API_URL=https://34.107.158.154.nip.io \
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY \
  node --test tests/integration/api.test.js
```

## Test cases

| # | Name | Covers |
|---|------|--------|
| 1 | `GET /healthz` returns ok | Liveness |
| 2 | `GET /readyz` pings DB | Readiness |
| 3 | `GET /api/health` version 2 | Health endpoint behind nginx |
| 4 | `GET /api/events?limit=5` | Listing + pagination |
| 5 | `GET /api/events?search=design` | Full-text search |
| 6 | `GET /api/events/categories` | 10 categories |
| 7 | `GET /api/events/featured` | Featured events |
| 8 | `GET /api/events/99999` | 404 for unknown |
| 9 | `GET /api/events/1/calendar` | ICS download |
| 10 | `POST /api/auth/register` validation | 400 + details |
| 11 | `POST /api/auth/login` bad password | 401 |
| 12 | `POST /api/auth/login` + `GET /api/auth/me` | Round-trip |
| 13 | RBAC blocks attendee from `/api/admin/stats` | 403 |
| 14 | Admin stats endpoint | 200 + counts |
| 15 | Admin pending events list | 200 + array |
| 16 | Tickets: full purchase + cancel + repurchase round-trip | Partial unique index |
| 17 | Notifications list shape | unreadCount + array |
| 18 | Moderation: spam keywords auto-rejected | CoR pipeline |
| 19 | Moderation: capacity > 100k auto-rejected | CoR pipeline |
| 20 | State machine: re-approve already approved | 400 |
| 21 | Unknown `/api/*` route | 404 |
| 22 | Stripe: PaymentIntent for paid event | 200 + clientSecret |
| 23 | Stripe: PaymentIntent rejected for free event | 400 |
| 24 | Stripe: ticket purchase requires paymentIntentId | 400 |

## Token caching

`_tokenCache = new Map()` per file invocation — each test calls `login(email,
password)` at most once per email. Cuts wall time roughly in half.

## Stripe-aware skipping

Test 22 is conditionally skipped with `{ skip: !process.env.STRIPE_SECRET_KEY ? '...' : false }`
so the suite stays green in environments without Stripe keys (e.g. mirror
forks without the secret).

## Idempotency

Test 16 explicitly cleans up at the end:

```js
await api(`/api/tickets/${repurchase.body.ticket.id}`,
  { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
```

Tests 18 + 19 create events that land in `status='rejected'`, so they don't
pollute the listing. Reseed via `docker compose --profile init run --rm seed`
if cumulative state ever matters.
