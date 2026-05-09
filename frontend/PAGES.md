# Frontend Pages Walk-through

Every screen in the Next.js App Router with route, file path, owner,
authentication requirements, and data dependencies.

> Live demo: https://34.107.158.154.nip.io · Wireframes: [`../wireframes.md`](../wireframes.md)

---

## Public pages

### `/` — Landing page

- **File:** `src/app/page.js` + `src/app/page.module.css` + `src/app/home.css`
- **Owner:** Nihar
- **Auth:** Public — no token required
- **API calls on mount:**
  - `GET /api/events/featured` → top 6 featured events
  - `GET /api/events/categories` → 10-item category list
  - `GET /api/events/stats` → aggregate counts powering the hero band
- **Layout:** Sticky `<Navbar>` (from `src/components/Navbar.js`), hero with
  CTA pair + 3-stat band, featured `<EventCard>` grid, 6-tile category grid,
  3-feature highlight band, `<Footer>`.
- **Notes:** All API calls fail open — if an endpoint times out the section
  silently renders an empty state instead of blocking the rest of the page.

### `/events` — Event listing

- **File:** `src/app/events/page.js` + `events.css`
- **Owner:** Nihar
- **Auth:** Public · `optionalAuth` lights up "You have a ticket" badge if
  caller is logged in
- **API calls:**
  - `GET /api/events?…filters…` driven by query string
  - `GET /api/events/categories` for the dropdown
- **Filter UI:** five controls — search input (live, 300ms debounce), category
  dropdown, city free-text, type dropdown (Online / In-Person), date dropdown.
  Each control updates the local `filters` state which is the dep of the
  `fetchEvents` callback.
- **Grid:** `auto-fill, minmax(340px, 1fr)` so the layout reflows from 3 cols
  desktop → 1 col mobile. CSS lives in `events.css` (specifically NOT in
  `home.css` — see ZST-036 for the bug that motivated the move).

### `/events/[id]` — Event detail (role-aware)

- **File:** `src/app/events/[id]/page.js` + `event-detail.css`
- **Owner:** Nihar
- **Auth:** `optionalAuth` — different sidebar action panel per role
- **API calls:**
  - `GET /api/events/:id` (enriched with `hasTicket` + `userTicket`)
  - `POST /api/payments/intent` (when user clicks Get Tickets for paid event)
  - `POST /api/tickets` (free or after Stripe confirm)
  - `POST /api/events/:id/cancel` (organizer/admin only)
  - `POST /api/events/:id/reschedule` (organizer/admin only)
- **Sidebar action panel** — three branches:
  1. **Admin** → "🛡️ Admin actions" banner + Reschedule + Cancel Event buttons.
  2. **Organizer of this event** → "✨ Your event" banner + Reschedule +
     Cancel + View Attendees buttons.
  3. **Attendee** → Register / Get Tickets — opens the `<TicketModal>` which
     embeds `<StripeCheckout>` for paid events.
- **Map:** OpenStreetMap iframe wrapped in an anchor pointing to
  `https://www.google.com/maps/search/?api=1&query=<lat>,<lon>` so the whole
  embed becomes click-to-Google-Maps. `pointer-events: none` on the iframe
  itself prevents OSM's pan/zoom from stealing clicks.
- **`<RescheduleModal>`** lives in this file (not extracted) — date, time,
  end date, end time, reason fields. Submits to `/reschedule`, which fires
  notifications + emails to every attendee.

### `/events/create` — Create event (organizer/admin)

- **File:** `src/app/events/create/page.js` + `create-event.css`
- **Owner:** Nihar
- **Auth:** Required, role ∈ {organizer, admin}
- **Special:** Maps link parser — paste a Google Maps URL → frontend extracts
  lat/lon via regex (`@(-?\d+\.\d+),(-?\d+\.\d+)` covers most patterns), pre-
  fills the lat/lon fields, and reverse-extracts an address best-effort.
- **Submit:** `POST /api/events` → moderation pipeline runs server-side →
  response includes `decision.action` which we surface as a toast
  ("Live now!" / "Pending admin review" / "Rejected — try again with cleaner
  copy").

---

## Auth pages

### `/login` — Sign in

- **File:** `src/app/login/page.js` + `auth.css`
- **Owner:** Soham
- **Auth:** Anonymous-only — logged-in users redirect to `/dashboard/my-tickets`.
- **API:** `POST /api/auth/login` → on 200, store `{ token, user }` in
  `localStorage` via `lib/auth.js` context.
- **Quick-Login buttons (Sprint 7 addition):** Three small ghost buttons —
  👑 Admin / 🎯 Organizer / 🎫 Attendee — that **auto-fill** the email + password
  fields with Kalhar / Soham / Nihar test credentials. The user still has to
  press "Sign In" to commit — this matches the user's preference to keep the
  one-extra-click for clarity.
- **Post-login redirect:** role-based — admin → `/admin`, organizer →
  `/dashboard/my-events`, attendee → `/events`.

### `/register` — Sign up

- **File:** `src/app/register/page.js`
- **Owner:** Soham
- **Special:** Client-side password strength check using
  `backend/shared/utils/passwordPolicy.js`'s rules (mirrored here as a small
  helper) so the user sees the error before round-tripping.

---

## Attendee dashboard

### `/dashboard/my-tickets` — My tickets

- **File:** `src/app/dashboard/my-tickets/page.js` + `dashboard.css`
- **Owner:** Soham
- **API:** `GET /api/tickets/my`
- **Per-row actions:** View (opens event detail in a modal preview),
  Cancel ticket (calls `DELETE /api/tickets/:id`).
- **Filtering:** status dropdown (All / Confirmed / Cancelled / Past) +
  client-side search by event title.

---

## Organizer dashboard

### `/dashboard/my-events` — My events

- **File:** `src/app/dashboard/my-events/page.js`
- **Owner:** Kalhar (built in Sprint 4, refactored in Sprint 6)
- **API:** `GET /api/users/organizer/events`, `GET /api/users/organizer/stats`
- **Stat band:** total events, attendees, revenue, pending review count.
- **Per-row actions:** Edit, Cancel, Reschedule, View Attendees.

### `/dashboard/attendees/[id]` — Per-event attendee list

- **File:** `src/app/dashboard/attendees/[id]/page.js`
- **Owner:** Kalhar
- **API:** `GET /api/events/:id/attendees`
- **CSV export:** uses `backend/services/admin/csvExport.js` server-side via
  `?export=csv` query param (returns `text/csv` instead of JSON).

---

## Admin

### `/admin` — Admin dashboard

- **File:** `src/app/admin/page.js` + `admin.css`
- **Owner:** Kalhar
- **Auth:** Admin-only. Non-admin GETs redirect via the `<RequireRole>` HOC.
- **Tabs:** Pending events / All events / Users / Audit log.
- **API:** `GET /api/admin/stats`, `GET /api/admin/events?status=pending`,
  `GET /api/admin/users`, `GET /api/admin/audit-log`.
- **Per-event actions:** Approve (`PUT /api/admin/events/:id/approve`),
  Reject (`PUT /api/admin/events/:id/reject`), View (deep-links to public
  detail page).

### `/notifications` — Notification inbox

- **File:** `src/app/notifications/page.js` + `notifications.css`
- **Owner:** Kalhar
- **API:** `GET /api/notifications`, `PUT /api/notifications/:id/read`,
  `PUT /api/notifications/read-all`.
- **Each row:** dot + emoji icon + title + message + relative timestamp.
  Clicking the row marks it read and navigates to `link`.

---

## Components

### `<Navbar>` (`src/components/Navbar.js`)

- Sticky at top, full-width container, violet glow border on scroll.
- Notification bell with unread badge — polls `GET /api/notifications?limit=1`
  every 30s to refresh the count without forcing a hard reload.
- Avatar dropdown — Sign out, Account settings, Dashboard.

### `<Footer>` (`src/components/Footer.js`)

- Static — about / privacy / terms / copyright.

### `<EventCard>` (`src/components/EventCard.js`)

- Reused on `/`, `/events`, `/dashboard/my-events`.
- Banner emoji + price pill + title + date/time/location/capacity rows + spots
  progress bar + organizer attribution.
- Pure presentational — accepts `event` prop, no API calls.

### `<StripeCheckout>` (`src/app/events/[id]/StripeCheckout.js`)

- Wraps Stripe Elements `<PaymentElement>`.
- Lifecycle: mount → call `/api/payments/intent` → receive `clientSecret` →
  render `<Elements>` provider → user fills card → on submit, call
  `stripe.confirmPayment()` with `redirect: 'if_required'` → on `succeeded`,
  submit the ticket purchase request to `/api/tickets`.
- **`paymentReady` gate** (Sprint 7 fix): the Pay button stays disabled until
  `PaymentElement.onReady` fires. Prevents a race where users tabbed off the
  page during initial mount and tried to submit before Stripe Elements was
  ready, which surfaced as `"Element not mounted"` in the console.
- Test card: `4242 4242 4242 4242`, any future expiry, any 3-digit CVC.

### `<RescheduleModal>` (inline in event detail page)

- Renders inside the existing `<ModalBackdrop>` component.
- Submits via `POST /api/events/:id/reschedule`. Loading state disables the
  Reschedule button while waiting for server.

### `<TicketModal>` (inline in event detail page)

- Two variants:
  - Free → quantity dropdown + "Confirm Registration" button submits directly
    to `POST /api/tickets`.
  - Paid → quantity + total + Stripe test-mode hint banner + `<StripeCheckout>`
    embed. Cancel button at footer.

---

## Lib modules

### `lib/api.js` (Soham)

Central fetch wrapper. Adds `Authorization: Bearer <token>` from localStorage,
normalises error shape, exports named namespaces:

- `auth.register / login / me / updateProfile`
- `events.list / get / create / update / delete / cancel / reschedule / featured / categories / stats / attendees`
- `tickets.purchase / my / cancel`
- `admin.stats / pendingEvents / users / approve / reject`
- `notifications.list / markRead / markAllRead`
- `payments.createIntent`

### `lib/auth.js` (Soham)

React context wrapping `{ user, token, login(), logout() }`. Token stored in
`localStorage('zestify_token')`; user object in `localStorage('zestify_user')`.

### `lib/toast.js` (Soham)

Tiny event-bus toast manager. `useToast()` returns `{ success, error, info }`.
Toasts auto-dismiss after 4 seconds, max 4 stacked.

### `lib/storage.js` (Soham, Sprint 8)

SSR-safe wrapper around `localStorage`. Existed because Next.js App Router
server components would crash trying to access `window` directly.

---

## Routing summary

| Route | File | Public | Roles |
|-------|------|--------|-------|
| `/` | `app/page.js` | ✓ | — |
| `/events` | `app/events/page.js` | ✓ | — |
| `/events/[id]` | `app/events/[id]/page.js` | ✓ | optional sidebar varies |
| `/events/create` | `app/events/create/page.js` | ✗ | organizer, admin |
| `/login` | `app/login/page.js` | ✓ | — (anonymous only) |
| `/register` | `app/register/page.js` | ✓ | — (anonymous only) |
| `/dashboard/my-tickets` | `app/dashboard/my-tickets/page.js` | ✗ | attendee, organizer, admin |
| `/dashboard/my-events` | `app/dashboard/my-events/page.js` | ✗ | organizer, admin |
| `/dashboard/attendees/[id]` | `app/dashboard/attendees/[id]/page.js` | ✗ | organizer (own), admin |
| `/admin` | `app/admin/page.js` | ✗ | admin |
| `/notifications` | `app/notifications/page.js` | ✗ | any logged-in user |
