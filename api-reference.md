# Zestify — Full API Reference

Comprehensive request/response reference for every public + internal HTTP endpoint
exposed by the six microservices. Numbers in parentheses next to each route are
the upstream container port behind the nginx gateway.

All responses are `application/json` unless noted. All authenticated routes
require `Authorization: Bearer <JWT>` issued by `/api/auth/login`. The internal
verify endpoint additionally requires `X-Internal-Secret`.

Base URL for live cluster: `https://34.107.158.154.nip.io`

---

## Conventions

| Pattern | Meaning |
|---------|---------|
| `:id` | URL parameter (integer event/ticket/user id) |
| `body.<field>` | JSON payload field |
| `?key=val` | Query parameter |
| `4xx` | Client error — see `error` field |
| `5xx` | Server error — never expose stack traces (pino-redacted) |
| HTTP `204` | Success with no body |

### Error envelope (uniform across services)

```json
{
  "error": "Human-readable summary",
  "details": [ "field A is required", "field B must be > 0" ]
}
```

`details` is only present for validation failures from `shared/middleware/validate.js`.

---

## 1. api-auth · port 5001

### `POST /api/auth/register`

Creates a new attendee or organizer account.

**Body**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Pass1word!",
  "role": "attendee"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | yes | 2-80 chars |
| `email` | string | yes | RFC-5322 |
| `password` | string | yes | `≥8 chars; mix of letters + (uppercase OR digit)` (see `shared/utils/passwordPolicy.js`) |
| `role` | enum | no | `attendee` (default) or `organizer` — never `admin` |

**Responses**

| Code | When | Body |
|------|------|------|
| 201 | Created | `{ user, token }` |
| 400 | Validation | `{ error: 'Validation failed', details: [...] }` |
| 409 | Email taken | `{ error: 'Email already registered' }` |

### `POST /api/auth/login`

Issue JWT for an existing user.

**Body** — `{ email, password }`

**Responses**

| Code | When | Body |
|------|------|------|
| 200 | OK | `{ user, token }` (7-day expiry) |
| 401 | Bad creds | `{ error: 'Invalid email or password.' }` |
| 429 | Throttled | `{ error: 'Too many login attempts' }` (per-email throttle, 5 in 5min) |

### `GET /api/auth/me`

Returns the authenticated user. Useful for hydrating the client-side auth context.

**Responses** — `{ user: { id, name, email, role, ... } }`

### `PUT /api/auth/profile`

Update the authenticated user's profile. Whitelist of editable fields:
`name`, `bio`, `phone`, `avatar` (URL), `password`.

When `password` is set, it must satisfy the password policy and the user must
supply `currentPassword` so the change is authorised.

---

## 2. api-events · port 5002

### `GET /api/events`

Public list of approved events with rich filtering + pagination.

**Query params**

| Key | Default | Description |
|-----|---------|-------------|
| `search` | — | Substring match against title, description, tags |
| `category` | — | Category slug filter |
| `city` | — | Substring match against `city` (case-insensitive) |
| `date_from` | — | YYYY-MM-DD |
| `date_to` | — | YYYY-MM-DD |
| `is_online` | — | `true` / `false` |
| `is_featured` | — | `true` / `false` |
| `status` | `approved` | `pending`/`approved`/`rejected`/`cancelled`/`completed` |
| `sort` | `date` | `date`, `title`, `created`, `price` |
| `order` | `asc` | `asc` / `desc` |
| `page` | `1` | 1-indexed |
| `limit` | `12` | max 50 |

**Response**

```json
{
  "events": [ /* EventSummary[] */ ],
  "pagination": {
    "total": 142,
    "page": 1,
    "limit": 12,
    "totalPages": 12
  }
}
```

### `GET /api/events/categories`

Static category list — used by frontend filters + event create form.

```json
{
  "categories": [
    { "id": 1, "name": "Music",      "slug": "music",      "icon": "🎵", "color": "#f59e0b" },
    { "id": 2, "name": "Technology", "slug": "technology", "icon": "💻", "color": "#7c3aed" },
    ...
  ]
}
```

### `GET /api/events/featured`

Top 6 featured events ordered by date ASC. Curated by admins (`is_featured = true`).

### `GET /api/events/stats`

Aggregate counts. Powers the home-page hero and the admin dashboard top band.

```json
{
  "stats": {
    "totalEvents": 14,
    "totalUsers": 11,
    "totalTickets": 38,
    "totalOrganizers": 4
  }
}
```

### `GET /api/events/:id`

Detail view of one event. Enriched with `hasTicket` + `userTicket` when caller is
authenticated (via `optionalAuth`).

```json
{
  "event": {
    "id": 2,
    "title": "Mindful Living Retreat",
    "slug": "mindful-living-retreat",
    "description": "...",
    "date": "2026-03-28",
    "time": "08:00",
    "location": "Napa",
    "capacity": 50,
    "tickets_sold": 12,
    "spots_left": 38,
    "price": 49.99,
    "currency": "USD",
    "organizer_id": 4,
    "organizer_name": "Soham Raj Jain",
    "category_name": "Health & Wellness",
    "category_icon": "🧘",
    "status": "approved",
    "google_calendar_url": "https://calendar.google.com/...",
    "is_online": false,
    "is_featured": true,
    "latitude": 38.2975,
    "longitude": -122.2869
  },
  "hasTicket": false,
  "userTicket": null
}
```

### `GET /api/events/:id/calendar`

Generates an `.ics` file (`Content-Type: text/calendar`). Same MIME type
spec'd in [RFC-5545](https://www.rfc-editor.org/rfc/rfc5545). Importable into
Apple Calendar / Google Calendar / Outlook.

### `GET /api/events/:id/attendees`

Returns the active attendee list for a single event. **Organizer-only**
(must own the event) or **admin**.

```json
{
  "event": { "id": 2, "title": "Mindful Living Retreat" },
  "attendees": [
    { "id": 21, "user_id": 6, "name": "Alex Thompson", "email": "alex@…", "ticket_code": "ZTX-K3F1-9A", "status": "confirmed", "created_at": "2026-03-25T14:21:03Z" }
  ],
  "total": 12
}
```

### `POST /api/events`

Create event. Auth: `organizer` or `admin`.

**Body** (all known fields)

```json
{
  "title": "Title",
  "description": "Long-form description",
  "short_description": "Short blurb",
  "date": "2026-12-31",
  "end_date": "2026-12-31",
  "time": "18:00",
  "end_time": "21:00",
  "location": "San Jose State University",
  "venue_name": "Engineering Building",
  "address": "1 Washington Sq",
  "city": "San Jose",
  "state": "CA",
  "zip": "95192",
  "latitude": 37.3352,
  "longitude": -121.8811,
  "is_online": false,
  "online_url": "",
  "capacity": 100,
  "price": 0,
  "category_id": 2,
  "tags": "design,ui,frontend",
  "schedule": [
    { "time": "18:00", "title": "Doors open" },
    { "time": "18:30", "title": "Talks" }
  ]
}
```

**Moderation pipeline runs immediately** (CoR):
1. SpamFilter — title/description scoring → may auto-reject
2. CapacitySanity — capacity > 100,000 → auto-reject
3. TrustedOrganizer — organizer has ≥3 approved events → auto-approve
4. Otherwise → status=`pending`, lands in admin queue

**Response** — `{ event, decision: { action, reason }, message }`

| `decision.action` | Meaning |
|-------------------|---------|
| `auto-approve` | Event live immediately |
| `auto-reject` | Status=rejected with reason |
| `manual-review` | Status=pending awaiting admin |

### `PUT /api/events/:id`

Patch fields. Owner-only or admin. Anything in the create body is patchable
except `status` (use `/cancel` / admin approve/reject for that).

### `DELETE /api/events/:id`

Hard delete the event row (CASCADE removes tickets + notifications). Reserve
for spam cleanup; prefer `POST /:id/cancel` for legitimate organizer churn.

### `POST /api/events/:id/cancel`

Cancel an event AND cascade-cancel all confirmed attendee tickets AND email
every attendee. Owner-only or admin.

**Body** — `{ reason: "Venue closed" }` (optional)

**Response**

```json
{
  "message": "Event cancelled. Attendees notified.",
  "event": { /* full event with status=cancelled */ },
  "attendeesNotified": 12,
  "ticketsCancelled": 12
}
```

**Side effects**

- `tickets.status` → `cancelled` for every active row matching `event_id`
- 1 in-app notification row per attendee (`type='event_cancelled'`)
- 1 email per attendee via Gmail SMTP (Google Maps link included)
- Cache invalidation: `event:<id>` + `events:list:*`
- Emits `EVENT_CANCELLED` on the in-process domain bus

### `POST /api/events/:id/reschedule`

Change the date/time of an upcoming event. Owner-only or admin.

**Body**

```json
{
  "date": "2026-12-31",
  "time": "20:00",
  "end_date": null,
  "end_time": null,
  "reason": "Venue change"
}
```

**Response**

```json
{
  "message": "Event rescheduled. Attendees notified.",
  "event": { /* updated event */ },
  "attendeesNotified": 12
}
```

**Side effects** — same as cancel, plus the `reminder_sent_at` column is reset
to `NULL` so the 12h-before reminder fires for the new schedule.

---

## 3. api-tickets · port 5003

### `POST /api/tickets`

Buy a ticket. Capacity-checked, payment-strategy-routed, dedupe-protected.

**Body**

```json
{
  "event_id": 2,
  "quantity": 1,
  "payment_method": "stripe",
  "payment_intent_id": "pi_3TVcZd..."
}
```

| Field | Type | Required when |
|-------|------|---------------|
| `event_id` | int | always |
| `quantity` | int | always (default 1) |
| `payment_method` | enum | only when calling `'stripe'` path |
| `payment_intent_id` | string | when `payment_method='stripe'` (Stripe must say `succeeded`) |

**PaymentStrategy selection** (`services/tickets/strategy.js`)

| Event price | Hint | Strategy used |
|-------------|------|----------------|
| 0 | — | `FreePaymentStrategy` |
| >0 | (none) | `MockCardPaymentStrategy` (always succeeds) |
| >0 | `'stripe'` | `StripePaymentStrategy` (verifies PI via api-payments internal HTTP) |

**Response**

```json
{
  "message": "Ticket confirmed!",
  "ticket": {
    "id": 31,
    "ticket_code": "UP9NFQV5U9",
    "user_id": 6,
    "event_id": 2,
    "quantity": 1,
    "total_price": 49.99,
    "status": "confirmed",
    "payment_method": "stripe",
    "payment_status": "completed",
    "checked_in": false,
    "checked_in_at": null,
    "created_at": "2026-05-10T20:13:58.832Z"
  }
}
```

**Failure modes**

| Code | When |
|------|------|
| 400 | Quantity > spots-left, free event with stripe hint, missing `payment_intent_id` |
| 404 | Event not found or not approved |
| 409 | User already has active (non-cancelled) ticket for this event |
| 502 | Stripe verify call to api-payments returned non-2xx |

### `GET /api/tickets/my`

Returns the authenticated user's tickets (all statuses). Frontend uses this
to populate `/dashboard/my-tickets`.

### `DELETE /api/tickets/:id`

Cancel a ticket. Decrements `events.tickets_sold`, writes a notification row,
emits `TICKET_CANCELLED`. The Tickets observer then sends a cancellation
email to the user via Gmail SMTP.

---

## 4. api-payments · port 5006

### `POST /api/payments/intent`

Create a Stripe PaymentIntent for a paid event. Used by the frontend's
`StripeCheckout.js` before mounting `<PaymentElement>`.

**Body** — `{ event_id, quantity }`

**Response**

```json
{
  "clientSecret": "pi_3TVcZd..._secret_...",
  "paymentIntentId": "pi_3TVcZd...",
  "amount": 49.99,
  "currency": "USD"
}
```

| Code | When |
|------|------|
| 400 | Free event (price=0) — Stripe must not be invoked |
| 404 | Event not found |

### `GET /internal/payments/:pi`

**Internal-only.** Verifies a PaymentIntent's status against Stripe. Used by
api-tickets right before persisting a ticket so we never trust the client.

**Auth** — `X-Internal-Secret: <INTERNAL_SECRET>` (constant-time compared
against the env var). No JWT.

**Response**

```json
{
  "status": "succeeded",
  "amount": 4999,
  "currency": "usd",
  "metadata": {}
}
```

Calls outside the Docker bridge network are blocked at the VPC firewall layer
(this port is not on the LB url-map).

---

## 5. api-notifications · port 5004

### `GET /api/notifications`

List notifications for the authenticated user with pagination.

**Query** — `unread_only` (bool), `page`, `limit`.

**Response**

```json
{
  "notifications": [
    {
      "id": 401,
      "type": "event_cancelled",
      "title": "Event Cancelled",
      "message": "\"Mindful Living Retreat\" scheduled for 2026-03-28 08:00 has been cancelled.",
      "link": "/events/2",
      "is_read": false,
      "created_at": "2026-05-10T19:53:32.069Z"
    }
  ],
  "unreadCount": 7,
  "pagination": { "total": 38, "page": 1, "limit": 20, "totalPages": 2 }
}
```

### `PUT /api/notifications/:id/read`

Mark a single notification read. Idempotent.

### `PUT /api/notifications/read-all`

Bulk mark-all-read for the authenticated user.

### `POST /api/notifications/_trigger-reminder` (internal)

Force the 12h-reminder cron to tick now. Used in E2E tests and during
incident response. Requires `X-Internal-Secret`. Returns `{message:'reminder tick triggered'}`.

The normal cron schedule:

```
poll every REMINDER_POLL_MS (default 300_000)
for events where:
  status='approved'
  AND reminder_sent_at IS NULL
  AND (date+time) BETWEEN NOW()+11h AND NOW()+13h
```

Each upcoming event → fetch attendees → write notification rows + send
`eventReminderEmail` via Gmail SMTP → mark `reminder_sent_at=NOW()`.

---

## 6. api-admin · port 5005

### `GET /api/admin/stats`

Admin-only aggregate dashboard.

```json
{
  "stats": {
    "totalUsers": 11,
    "totalEvents": 14,
    "totalTickets": 38,
    "totalRevenue": 1247.83,
    "pendingEvents": 3,
    "rejectedEvents": 2,
    "cancelledEvents": 1,
    "activeOrganizers": 4
  }
}
```

### `GET /api/admin/events?status=pending`

Paginated event list filterable by status. Admin-only.

### `PUT /api/admin/events/:id/approve`

Move a pending event to `approved`. Emits `EVENT_APPROVED`.

**Body** — `{ reason: "Looks good" }` (optional, logged in `admin_actions`)

| Code | When |
|------|------|
| 200 | Approved |
| 400 | Illegal transition (already approved/rejected/cancelled) |
| 404 | Not found |

### `PUT /api/admin/events/:id/reject`

Reject. Emits `EVENT_REJECTED`. Body `{ reason }`.

### `GET /api/admin/users`

Paginated user list. Admin-only.

### `PUT /api/admin/users/:id`

Patch role + active flag.

```json
{
  "role": "organizer",
  "is_active": true
}
```

### `GET /api/admin/audit-log`

Last N admin actions (audit trail). Useful for review.

```json
{
  "actions": [
    {
      "id": 42,
      "admin_id": 1,
      "admin_name": "Kalhar Patel",
      "action": "approve",
      "target_type": "event",
      "target_id": 17,
      "reason": "",
      "created_at": "2026-05-10T22:00:00Z"
    }
  ]
}
```

---

## 7. Health + readiness (every service)

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Process liveness — returns immediately if event loop responsive |
| `GET /readyz` | Pings Postgres — used by LB / k8s readiness gate |
| `GET /api/health` | Identical to `/healthz` but routed via nginx (used by GCP LB health check) |

All three return:

```json
{
  "status": "ok",
  "service": "api-events",
  "timestamp": "2026-05-10T20:00:00.000Z",
  "version": "3.0.0-microservice"
}
```

---

## 8. Rate limiting

All services use `express-rate-limit` with sliding-window IP buckets:

| Bucket | Default | Override env |
|--------|---------|--------------|
| Default per-IP | 300 / 60s | `RATE_LIMIT_MAX` |
| Auth burst | 200 / 60s (registers, logins) | `AUTH_RATE_LIMIT_MAX` |
| Login per-email | 5 / 5min | hard-coded in `services/auth/loginThrottle.js` |

`trust proxy` is **true** in `shared/server-base.js` so the limiter uses the
real client IP from `X-Forwarded-For` (set by the LB) instead of the loopback.

---

## 9. CORS

By default every service allows credentials from the same origin only. For
local dev `CORS_ORIGIN=http://localhost:3000` is set via env. In production the
gateway co-locates frontend + backend on the same hostname so CORS is moot.

---

## 10. JWT structure

| Claim | Value |
|-------|-------|
| `id` | user id |
| `email` | string |
| `role` | `attendee` / `organizer` / `admin` |
| `name` | display name |
| `iat` | issued-at unix seconds |
| `exp` | iat + 7 days (configurable via `JWT_TTL`) |

Algorithm: HS256. Secret rotates via `JWT_SECRET` env var; rotating invalidates
all in-flight tokens (acceptable since 7-day expiry is short).

---

## 11. Cache keys

Every service goes through `getCache()` (in-memory LRU OR Redis behind
`REDIS_URL`). Keys are stable + prefix-based for selective invalidation.

| Service | Key pattern | TTL |
|---------|-------------|-----|
| api-events | `events:list:<json(filter-params)>` | 2 s |
| api-events | `event:<id>` | 2 s |
| api-events | `event:featured` | 30 s |
| api-events | `event:categories` | 5 min |

Mutating endpoints (`create`, `update`, `cancel`, `reschedule`, ticket
buy/cancel) call `del('event:<id>')` + `del('events:list:')` (prefix delete).

The 2-second TTL keeps the spots-left counter near-realtime across the two VMs
without paying for Redis.

---

## 12. Domain events emitted

| Event | Producer service | Consumer-side observers |
|-------|------------------|--------------------------|
| `USER_REGISTERED` | api-auth | api-notifications |
| `TICKET_PURCHASED` | api-tickets | api-tickets (email), api-notifications (notification row) |
| `TICKET_CANCELLED` | api-tickets | api-tickets (email) |
| `EVENT_CREATED` | api-events | api-admin (queue notification) |
| `EVENT_APPROVED` | api-events / api-admin | api-events (organizer email + notification) |
| `EVENT_REJECTED` | api-events / api-admin | api-events (organizer email + notification) |
| `EVENT_CANCELLED` | api-events | api-events (attendee email + notification) |
| `EVENT_RESCHEDULED` | api-events | api-events (attendee email + notification) |
| `EVENT_REMINDER_DUE` | api-notifications cron | api-notifications (attendee email + notification) |

Bus is in-process EventEmitter (see `shared/domain/DomainEvents.js`). Cross-
process delivery is via direct HTTP call with `X-Internal-Secret`.

---

## 13. Error codes summary

| Code | Meaning | Example |
|------|---------|---------|
| 400 | Validation / business rule | Spam event, capacity > 100k, illegal state transition |
| 401 | Missing or bad JWT | `/api/auth/me` without `Authorization` header |
| 403 | RBAC denied | Attendee hitting `/api/admin/*` |
| 404 | Resource not found | Unknown event/ticket/user id |
| 409 | Conflict | Duplicate active ticket, registered email |
| 429 | Rate-limited | Too many login attempts |
| 500 | Unhandled exception | (rare; pino logs full stack server-side, response body redacted) |
| 502 | Upstream service failure | api-tickets → api-payments call failed |
| 503 | Readiness probe failed | Postgres unreachable during `/readyz` |
