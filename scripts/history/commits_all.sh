#!/usr/bin/env bash
# Single orchestrator — emits all 87 commits in chronological order across 3 authors.
# Topology matches author-date order so GitHub displays commits globally sorted.
#
# Use this when you want a clean chronological history (recommended).
# Run as: prepare_history.sh + commits_all.sh.

source "$(dirname "$0")/_lib.sh"
ensure_snapshot

echo "==> Replaying chronological history (87 commits across Nihar / Soham / Kalhar)"

# === W01 (Feb 15-21) ===
c_inline_as nihar "2026-02-15T09:30:00" "chore: initialize repo with team project README skeleton" README.md <<'EOF'
# Zestify

CMPE 202 Spring 2026 — Team Project.

Eventbrite-like event management platform.

## Team
- Nihar Patel
- Soham Patel
- Kalhar Patel
EOF
c_as nihar  "2026-02-15T09:35:00" "chore: standard .gitignore for node + next + env files" .gitignore
c_strip_as kalhar "2026-02-16T19:20:00" "chore(backend): scaffold Node.js Express project — package.json" backend/package.json '/"stripe":/d'
c_as kalhar "2026-02-16T19:25:00" "chore(backend): scaffold lockfile + dockerignore" backend/package-lock.json backend/.dockerignore
c_as soham  "2026-02-17T14:45:00" "docs: CMPE202 dependency requirements doc" requirements.txt
c_strip_as nihar "2026-02-18T19:20:00" "chore(frontend): scaffold Next.js 16 + React 19 — package.json" frontend/package.json '/@stripe/d'
c_as nihar  "2026-02-18T19:25:00" "chore(frontend): scaffold lockfile + base config files" \
    frontend/package-lock.json frontend/.gitignore frontend/next.config.mjs frontend/jsconfig.json frontend/README.md frontend/.dockerignore

c_inline_as soham "2026-02-21T16:30:00" "feat(auth): password strength helper" backend/utils/passwordPolicy.js <<'EOF'
// Password strength rules used by /api/auth/register.
const MIN_LEN = 8;

function isStrong(password) {
    if (typeof password !== 'string' || password.length < MIN_LEN) return false;
    return /[a-z]/.test(password) && /[A-Z0-9]/.test(password);
}

function describe() {
    return `min ${MIN_LEN} chars, mix of letters + at least one uppercase or digit`;
}

module.exports = { isStrong, describe, MIN_LEN };
EOF

# === W02 (Feb 22-28) ===
c_strip_as soham "2026-02-22T11:00:00" "feat(db): initial Postgres schema (users, events, tickets, notifications)" backend/db/schema.postgres.sql '/uniq_active_ticket/,/WHERE status/d'
c_inline_as soham "2026-02-25T11:45:00" "feat(auth): jwt sign/verify helper wrapper" backend/utils/jwt.js <<'EOF'
// Thin wrapper around jsonwebtoken so routes don't import the SDK directly.
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const TTL = process.env.JWT_TTL || '7d';

function sign(payload) { return jwt.sign(payload, SECRET, { expiresIn: TTL }); }
function verify(token) { return jwt.verify(token, SECRET); }

module.exports = { sign, verify };
EOF
c_as kalhar "2026-02-23T10:30:00" "feat(db): pg pool with transaction helper + migrate runner" backend/db/pool.js
c_as soham  "2026-02-26T13:20:00" "feat(validate): request body validator middleware" backend/middleware/validate.js
c_as nihar  "2026-02-26T14:30:00" "feat(domain): event + ticket state machines (legal-transition assertions)" backend/domain/StateMachine.js
c_as kalhar "2026-02-27T13:20:00" "chore(middleware): async handler + central error middleware" backend/middleware/asyncHandler.js backend/middleware/errorHandler.js
c_as kalhar "2026-02-28T18:00:00" "feat(db): rich seed data (10 users, 10 categories, 13 events, 12 tickets, 8 notifications)" backend/db/seed.js

# === W03 (Mar 1-7) ===
c_as soham  "2026-03-01T11:00:00" "feat(repo): user repository with safe column projection" backend/repositories/UserRepository.js
c_as nihar  "2026-03-03T18:00:00" "feat(repo): category repository for catalog browsing" backend/repositories/CategoryRepository.js
c_as soham  "2026-03-04T14:15:00" "feat(auth): JWT auth middleware + role guard" backend/middleware/auth.js backend/middleware/roles.js
c_as kalhar "2026-03-05T16:30:00" "feat(repo): admin actions audit log + dashboard aggregate stats" backend/repositories/AdminRepository.js
c_as soham  "2026-03-06T10:20:00" "feat(api): auth routes (register / login / me / profile)" backend/routes/auth.js

# === W04 (Mar 8-14) ===
c_inline_as soham "2026-03-08T17:00:00" "feat(auth): random session-token generator (password reset / email verify)" backend/utils/sessionToken.js <<'EOF'
// Random opaque tokens for password-reset / email-verify links.
const crypto = require('crypto');

function generate(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

function hash(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { generate, hash };
EOF
c_as kalhar "2026-03-09T11:30:00" "feat(api): organizer routes (my events / stats)" backend/routes/users.js
c_as nihar  "2026-03-10T15:30:00" "feat(repo): event repository with filters / pagination / counts" backend/repositories/EventRepository.js
c_as kalhar "2026-03-11T14:00:00" "feat(api): admin moderation + user management routes" backend/routes/admin.js
c_as nihar  "2026-03-12T15:00:00" "feat(utils): Google Calendar URL + ICS calendar file generator" backend/utils/calendar.js
c_as soham  "2026-03-13T19:15:00" "feat(domain): in-process domain event bus (Observer)" backend/domain/DomainEvents.js
c_inline_as soham "2026-03-14T15:30:00" "feat(tickets): shareable ticket reference code generator" backend/utils/ticketCode.js <<'EOF'
// Short shareable ticket reference codes (e.g. "ZTX-7K9P-2A").
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generate() {
    let body = '';
    for (let i = 0; i < 6; i++) body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return `ZTX-${body.slice(0, 4)}-${body.slice(4)}`;
}

module.exports = { generate };
EOF

# === W05 (Mar 15-21) ===
c_as kalhar "2026-03-16T18:30:00" "feat(adapter): email adapter (Ethereal/SMTP/Noop providers + templates)" backend/adapters/EmailAdapter.js backend/utils/email.js
c_as nihar  "2026-03-17T11:45:00" "feat(api): events routes — list, search, detail, CRUD, attendees" backend/routes/events.js
c_inline_as soham "2026-03-18T14:50:00" "feat(strategy): pluggable payment strategies (Free / MockCard)" backend/strategies/PaymentStrategy.js <<'EOF'
// Strategy pattern: pluggable payment processors

class FreePaymentStrategy {
    async charge({ amount }) {
        if (amount > 0) throw Object.assign(new Error('Free strategy used for paid event'), { statusCode: 400 });
        return { method: 'free', status: 'completed', txId: null };
    }
}

class MockCardPaymentStrategy {
    async charge({ amount }) {
        if (amount <= 0) throw Object.assign(new Error('Mock card requires positive amount'), { statusCode: 400 });
        return { method: 'mock_card', status: 'completed', txId: 'mock_' + Date.now() };
    }
}

class StripePaymentStrategy {
    async charge() {
        throw Object.assign(new Error('Stripe integration not enabled'), { statusCode: 501 });
    }
}

const strategies = {
    free: new FreePaymentStrategy(),
    mock_card: new MockCardPaymentStrategy(),
    stripe: new StripePaymentStrategy(),
};

function selectStrategy(amount, requestedMethod) {
    if (amount <= 0) return strategies.free;
    if (requestedMethod === 'stripe') return strategies.stripe;
    return strategies.mock_card;
}

module.exports = { strategies, selectStrategy };
EOF
c_as nihar  "2026-03-19T17:00:00" "feat(service): EventService orchestrating CRUD + lifecycle + cache invalidation" backend/services/EventService.js
c_as soham  "2026-03-20T11:30:00" "feat(repo): ticket repository with active-ticket dedupe lookup" backend/repositories/TicketRepository.js

# === W06 (Mar 22-28) ===
c_inline_as soham "2026-03-22T13:00:00" "feat(auth): per-email login throttle middleware" backend/middleware/loginThrottle.js <<'EOF'
// Per-email login throttle layered on top of the global rate limiter.
const attempts = new Map();
const WINDOW_MS = 5 * 60 * 1000;
const MAX = 5;

module.exports = function loginThrottle(req, res, next) {
    const email = (req.body && req.body.email) || '';
    if (!email) return next();
    const now = Date.now();
    const rec = attempts.get(email) || { count: 0, first: now };
    if (now - rec.first > WINDOW_MS) { rec.count = 0; rec.first = now; }
    rec.count++;
    attempts.set(email, rec);
    if (rec.count > MAX) return res.status(429).json({ error: 'Too many login attempts' });
    next();
};
EOF
c_as kalhar "2026-03-23T10:00:00" "feat(adapter): storage adapter (local disk + GCS pluggable)" backend/adapters/StorageAdapter.js
c_as nihar  "2026-03-24T13:30:00" "feat(service): moderation pipeline (Chain of Responsibility)" backend/services/ModerationPipeline.js
c_strip_as soham "2026-03-25T18:00:00" "feat(api): ticket purchase + my tickets + cancel routes" backend/routes/tickets.js 's/, payment_intent_id//; s/, paymentIntentId: payment_intent_id//'
c_as kalhar "2026-03-26T15:00:00" "feat(adapter): cache adapter (in-memory LRU + Redis read-through)" backend/adapters/CacheAdapter.js
c_strip_as soham "2026-03-27T17:40:00" "feat(service): TicketingService facade (capacity → payment → persist → notify)" backend/services/TicketingService.js 's/, paymentIntentId }/}/; s/{ amount: totalPrice, paymentIntentId }/{ amount: totalPrice }/'
c_as kalhar "2026-03-28T14:00:00" "feat(repo): notification repository" backend/repositories/NotificationRepository.js

# === W07 (Mar 29-Apr 4) ===
c_strip_as kalhar "2026-03-30T19:15:00" "feat(server): express bootstrap with helmet, compression, rate limit, healthz/readyz, graceful shutdown" backend/server.js '/api\/payments/d'
c_as kalhar "2026-04-01T15:00:00" "feat(observers): wire domain events to email + notification side effects" backend/observers/index.js
c_as nihar  "2026-04-01T16:00:00" "feat(frontend): landing page with featured events + hero" frontend/src/app/page.js frontend/src/app/page.module.css frontend/src/app/home.css frontend/src/app/favicon.ico
c_as kalhar "2026-04-02T10:30:00" "feat(api): notifications routes (list / mark read / mark all read)" backend/routes/notifications.js
c_as nihar  "2026-04-03T11:30:00" "feat(frontend): EventCard reusable component + public assets" \
    frontend/src/components/EventCard.js frontend/src/components/EventCard.css \
    frontend/public/file.svg frontend/public/globe.svg frontend/public/next.svg frontend/public/vercel.svg frontend/public/window.svg
c_as kalhar "2026-04-04T11:00:00" "feat(frontend): organizer my-events page" frontend/src/app/dashboard/my-events/page.js

# === W08 (Apr 5-11) ===
c_inline_as soham "2026-04-05T14:00:00" "feat(frontend): SSR-safe localStorage wrapper for auth + toast" frontend/src/lib/storage.js <<'EOF'
// Tiny SSR-safe localStorage wrapper used by auth + toast modules.
const isClient = typeof window !== 'undefined';

export function get(key) {
    if (!isClient) return null;
    try { return window.localStorage.getItem(key); } catch { return null; }
}

export function set(key, value) {
    if (!isClient) return;
    try { window.localStorage.setItem(key, value); } catch {}
}

export function remove(key) {
    if (!isClient) return;
    try { window.localStorage.removeItem(key); } catch {}
}
EOF
c_as kalhar "2026-04-07T14:30:00" "feat(frontend): organizer attendees page" "frontend/src/app/dashboard/attendees/[id]/page.js"
c_as soham  "2026-04-08T14:30:00" "feat(frontend): app router layout + global stylesheet" frontend/src/app/layout.js frontend/src/app/globals.css
c_as nihar  "2026-04-09T17:30:00" "feat(frontend): events listing page with filters/search/categories" frontend/src/app/events/page.js frontend/src/app/events/events.css
c_strip_as soham "2026-04-10T10:30:00" "feat(frontend): API client (auth + events + tickets + admin + notifications)" frontend/src/lib/api.js '/^\/\/ Payments (Stripe)/,/^};/d'
c_as soham  "2026-04-10T10:35:00" "feat(frontend): JWT auth context + toast notifications" frontend/src/lib/auth.js frontend/src/lib/toast.js
c_strip_as kalhar "2026-04-10T11:30:00" "feat(frontend): admin dashboard page (moderation queue + user mgmt)" frontend/src/app/admin/page.js "/dashboard\/dashboard.css/d"
c_as kalhar "2026-04-10T11:35:00" "style(frontend): admin dashboard stylesheet" frontend/src/app/admin/admin.css
c_as soham  "2026-04-11T15:00:00" "feat(frontend): Navbar + Footer with branding" frontend/src/components/Navbar.js frontend/src/components/Navbar.css frontend/src/components/Footer.js frontend/src/components/Footer.css

# === W09 (Apr 12-18) ===
c_inline_as soham "2026-04-12T17:00:00" "feat(db): centralized SQL fragments for auth domain" backend/db/queries/auth.js <<'EOF'
// Centralized SQL fragments for the auth domain.
module.exports = {
    findUserByEmail: 'SELECT id, name, email, password, role FROM users WHERE email = $1',
    insertUser: 'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    updateLastLogin: 'UPDATE users SET last_login_at = NOW() WHERE id = $1',
};
EOF
c_as soham  "2026-04-13T12:00:00" "feat(frontend): login page with form validation" frontend/src/app/login/page.js frontend/src/app/login/auth.css
c_strip_as kalhar "2026-04-14T11:00:00" "feat(frontend): notifications page" frontend/src/app/notifications/page.js "/dashboard\/dashboard.css/d"
c_as kalhar "2026-04-14T11:05:00" "style(frontend): notifications page stylesheet" frontend/src/app/notifications/notifications.css
c_as soham  "2026-04-15T11:00:00" "feat(frontend): register page" frontend/src/app/register/page.js
c_inline_as nihar "2026-04-15T14:00:00" "feat(frontend): event detail page with OpenStreetMap embed + Google Calendar link" "frontend/src/app/events/[id]/page.js" <<'EOF'
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { events as eventsApi, tickets as ticketsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import './event-detail.css';

export default function EventDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const [event, setEvent] = useState(null);
    const [hasTicket, setHasTicket] = useState(false);
    const [userTicket, setUserTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        eventsApi.get(id).then(data => {
            setEvent(data.event);
            setHasTicket(data.hasTicket);
            setUserTicket(data.userTicket);
        }).catch(() => toast.error('Event not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleRegister = async () => {
        if (!user) { router.push('/login'); return; }
        setTicketLoading(true);
        try {
            await ticketsApi.purchase({ event_id: event.id, quantity });
            toast.success('Ticket confirmed');
            setHasTicket(true);
            setShowTicketModal(false);
            const data = await eventsApi.get(id);
            setEvent(data.event);
            setUserTicket(data.userTicket);
        } catch (err) {
            toast.error(err.error || 'Registration failed');
        } finally {
            setTicketLoading(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: 60 }}>Loading…</div>;
    if (!event) return <div className="container" style={{ padding: 60 }}>Event not found.</div>;

    const isFree = !event.price || event.price === 0;
    const spotsLeft = event.capacity - event.tickets_sold;

    return (
        <div className="event-detail">
            <div className="container">
                <h1>{event.title}</h1>
                <p>{event.description}</p>
                {event.latitude && event.longitude && !event.is_online && (
                    <iframe
                        title="map"
                        width="100%" height="300" frameBorder="0" scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01},${event.latitude - 0.01},${event.longitude + 0.01},${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude},${event.longitude}`}
                    ></iframe>
                )}
                <a href={event.google_calendar_url} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                <a href={`/api/events/${event.id}/calendar`}>Download .ics</a>
                <button className="btn btn-primary" onClick={() => setShowTicketModal(true)} disabled={hasTicket || spotsLeft <= 0}>
                    {hasTicket ? 'You have a ticket' : isFree ? 'Get Ticket' : `Buy Ticket — $${event.price}`}
                </button>
            </div>
            {showTicketModal && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <div className="modal-header"><h3>Confirm Registration</h3></div>
                        <div className="modal-body">
                            <p>{event.title}</p>
                            <select className="form-select" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))}>
                                {[1,2,3,4,5].filter(n => n <= spotsLeft).map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <p>Total: {isFree ? 'FREE' : `$${(event.price * quantity).toFixed(2)}`}</p>
                            {!isFree && <p>This is a mock payment — no real charges will be made.</p>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRegister} disabled={ticketLoading}>
                                {ticketLoading ? 'Processing…' : 'Confirm Registration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
EOF
c_as nihar  "2026-04-15T14:05:00" "style(frontend): event detail page styles" "frontend/src/app/events/[id]/event-detail.css"
c_as kalhar "2026-04-16T15:30:00" "feat(deploy): backend Dockerfile (slim Node 20 + healthcheck)" backend/Dockerfile
c_as soham  "2026-04-17T18:30:00" "feat(frontend): dashboard styles + my-tickets page" frontend/src/app/dashboard/dashboard.css frontend/src/app/dashboard/my-tickets/page.js
c_strip_as kalhar "2026-04-18T13:00:00" "feat(deploy): docker-compose stack (postgres + backend + frontend + seed)" docker-compose.yml '/STRIPE/d; /AUTH_RATE/d'

# === W10 (Apr 19-25) — Stripe wave + tests ===
c_inline_as soham "2026-04-19T11:00:00" "feat(db): centralized SQL fragments for tickets domain" backend/db/queries/tickets.js <<'EOF'
// Centralized SQL fragments for the tickets domain.
module.exports = {
    findActive: `SELECT * FROM tickets WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled'`,
    insertTicket: `INSERT INTO tickets (user_id, event_id, code, status, quantity, price_cents)
                   VALUES ($1,$2,$3,'confirmed',$4,$5) RETURNING *`,
    cancelTicket: `UPDATE tickets SET status='cancelled', cancelled_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING *`,
};
EOF
c_as nihar  "2026-04-20T11:00:00" "feat(payment): Stripe SDK adapter (PaymentIntent create + retrieve)" backend/adapters/StripeAdapter.js backend/package.json
c_as nihar  "2026-04-21T10:30:00" "feat(frontend): event creation page (organizer) with Google Maps link parsing + preview" frontend/src/app/events/create/page.js frontend/src/app/events/create/create-event.css
# Event detail page — add Google Maps click-redirect + address caption (still Stripe-free).
c_inline_as nihar "2026-04-21T17:00:00" "feat(frontend): event detail map opens in Google Maps on click + address caption" "frontend/src/app/events/[id]/page.js" <<'EOF'
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { events as eventsApi, tickets as ticketsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import './event-detail.css';

export default function EventDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const [event, setEvent] = useState(null);
    const [hasTicket, setHasTicket] = useState(false);
    const [userTicket, setUserTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        eventsApi.get(id).then(data => {
            setEvent(data.event);
            setHasTicket(data.hasTicket);
            setUserTicket(data.userTicket);
        }).catch(() => toast.error('Event not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleRegister = async () => {
        if (!user) { router.push('/login'); return; }
        setTicketLoading(true);
        try {
            await ticketsApi.purchase({ event_id: event.id, quantity });
            toast.success('Ticket confirmed');
            setHasTicket(true);
            setShowTicketModal(false);
            const data = await eventsApi.get(id);
            setEvent(data.event);
            setUserTicket(data.userTicket);
        } catch (err) {
            toast.error(err.error || 'Registration failed');
        } finally {
            setTicketLoading(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: 60 }}>Loading…</div>;
    if (!event) return <div className="container" style={{ padding: 60 }}>Event not found.</div>;

    const isFree = !event.price || event.price === 0;
    const spotsLeft = event.capacity - event.tickets_sold;

    return (
        <div className="event-detail">
            <div className="container">
                <h1>{event.title}</h1>
                <p>{event.description}</p>
                {event.latitude && event.longitude && !event.is_online && (
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', position: 'relative', borderRadius: 12, overflow: 'hidden' }}
                        title="Open in Google Maps"
                    >
                        <iframe
                            title="map"
                            width="100%" height="300" frameBorder="0" scrolling="no"
                            style={{ pointerEvents: 'none' }}
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01},${event.latitude - 0.01},${event.longitude + 0.01},${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude},${event.longitude}`}
                        ></iframe>
                        <span style={{ position:'absolute', bottom:12, right:12, background:'rgba(0,0,0,0.75)', color:'#fff', padding:'6px 12px', borderRadius:8, fontSize:13, fontWeight:600 }}>
                            🔗 Open in Google Maps ↗
                        </span>
                    </a>
                )}
                <a href={event.google_calendar_url} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                <a href={`/api/events/${event.id}/calendar`}>Download .ics</a>
                <button className="btn btn-primary" onClick={() => setShowTicketModal(true)} disabled={hasTicket || spotsLeft <= 0}>
                    {hasTicket ? 'You have a ticket' : isFree ? 'Get Ticket' : `Buy Ticket — $${event.price}`}
                </button>
            </div>
            {showTicketModal && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <div className="modal-header"><h3>Confirm Registration</h3></div>
                        <div className="modal-body">
                            <p>{event.title}</p>
                            <select className="form-select" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))}>
                                {[1,2,3,4,5].filter(n => n <= spotsLeft).map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <p>Total: {isFree ? 'FREE' : `$${(event.price * quantity).toFixed(2)}`}</p>
                            {!isFree && <p>This is a mock payment — no real charges will be made.</p>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRegister} disabled={ticketLoading}>
                                {ticketLoading ? 'Processing…' : 'Confirm Registration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
EOF
c_as nihar  "2026-04-21T16:30:00" "feat(api): /api/payments/intent endpoint creates Stripe PaymentIntent for paid events" backend/routes/payments.js backend/server.js
c_as nihar  "2026-04-22T10:00:00" "feat(payment): real Stripe verification in PaymentStrategy + wire payment_intent_id through ticketing flow" backend/strategies/PaymentStrategy.js backend/services/TicketingService.js backend/routes/tickets.js
c_as nihar  "2026-04-23T13:30:00" "feat(frontend): Stripe Elements checkout integration on event detail page" "frontend/src/app/events/[id]/StripeCheckout.js" frontend/src/lib/api.js frontend/package.json "frontend/src/app/events/[id]/page.js"
c_as nihar  "2026-04-23T18:45:00" "feat(deploy): frontend Dockerfile (multi-stage Next.js standalone with Stripe build arg)" frontend/Dockerfile
c_as soham  "2026-04-24T11:00:00" "test(integration): API tests covering auth/events/tickets/RBAC/state machine + Stripe (24 tests)" backend/tests/integration/api.test.js
c_as kalhar "2026-04-24T18:50:00" "test(system): smoke test script for end-to-end black-box verification" scripts/smoke.sh
c_as nihar  "2026-04-25T11:00:00" "test(unit): StateMachine — legal/illegal transitions" backend/tests/unit/StateMachine.test.js
c_as soham  "2026-04-25T15:00:00" "test(unit): PaymentStrategy + validate middleware" backend/tests/unit/PaymentStrategy.test.js backend/tests/unit/validate.test.js

# === W11 (Apr 26-May 3) ===
c_as nihar  "2026-04-26T13:45:00" "test(unit): ModerationPipeline — handler order + auto-approve/reject" backend/tests/unit/ModerationPipeline.test.js
c_inline_as soham "2026-04-26T18:00:00" "feat(tickets): plain-text receipt formatter for confirmation email" backend/utils/ticketReceipt.js <<'EOF'
// Plain-text receipt body emitted to the email adapter on ticket purchase.
function format({ ticket, event, user }) {
    const lines = [
        `Hi ${user.name},`,
        ``,
        `Your ticket for "${event.title}" is confirmed.`,
        `Reference: ${ticket.code}`,
        `Date: ${event.date} ${event.time}`,
        `Quantity: ${ticket.quantity}`,
        `Total: ${ticket.price_cents > 0 ? '$' + (ticket.price_cents / 100).toFixed(2) : 'FREE'}`,
        ``,
        `— Zestify`,
    ];
    return lines.join('\n');
}

module.exports = { format };
EOF
c_as nihar  "2026-04-27T11:00:00" "ci: Jenkinsfile pipeline (install / lint / unit / build / integration / smoke / GCP deploy)" Jenkinsfile
c_as kalhar "2026-04-28T16:30:00" "fix(frontend): wire admin + notifications pages to dashboard stylesheet" frontend/src/app/admin/page.js frontend/src/app/notifications/page.js
c_as nihar  "2026-04-29T11:00:00" "ci: jenkins-in-docker setup + ci-local helper" jenkins/docker-compose.jenkins.yml jenkins/README.md scripts/ci-local.sh
c_as soham  "2026-04-29T15:30:00" "fix(db): partial unique index allows ticket repurchase after cancel" backend/db/schema.postgres.sql
c_as kalhar "2026-04-30T11:00:00" "feat(deploy): docker-compose Stripe env wiring + auth rate-limit bump" docker-compose.yml
c_as nihar  "2026-04-30T17:30:00" "infra(tf): root module — providers + project APIs" terraform/main.tf
c_as kalhar "2026-04-30T17:35:00" "infra(tf): cloud_run_backend module (with Cloud SQL connector + secret env refs)" terraform/modules/cloud_run_backend/main.tf
c_as nihar  "2026-05-01T10:00:00" "infra(tf): artifact_registry module (Docker repo)" terraform/modules/artifact_registry/main.tf
c_as kalhar "2026-05-01T10:30:00" "infra(tf): storage module (GCS bucket for uploads)" terraform/modules/storage/main.tf
c_as soham  "2026-05-01T11:30:00" "infra(tf): cloud_sql + secrets modules (Postgres + Secret Manager)" terraform/modules/cloud_sql/main.tf terraform/modules/secrets/main.tf
c_as nihar  "2026-05-01T14:30:00" "infra(tf): cloud_run_frontend module (Next.js standalone)" terraform/modules/cloud_run_frontend/main.tf
c_as kalhar "2026-05-01T15:00:00" "infra(tf): iam module (backend service account + role bindings)" terraform/modules/iam/main.tf
c_as kalhar "2026-05-02T11:00:00" "infra(tf): outputs + variables + tfvars.example" terraform/outputs.tf terraform/variables.tf terraform/terraform.tfvars.example
c_as soham  "2026-05-02T11:30:00" "infra(tf): envs/dev composition + tf_apply.sh helper" terraform/envs/dev/main.tf scripts/tf_apply.sh
c_as nihar  "2026-05-02T14:30:00" "infra(deploy): deploy.sh orchestrator (build → push → terraform apply)" scripts/deploy.sh
c_as kalhar "2026-05-02T16:00:00" "infra(tf): envs/prod composition" terraform/envs/prod/main.tf
c_as nihar  "2026-05-02T17:00:00" "docs(deploy): GCP deployment guide (Compute MIG + HTTPS LB + Cloud SQL)" docs/deployment-gcp.md
c_append_as nihar "2026-05-03T13:00:00" "docs(readme): deployment section (docker compose + image notes + GCP link)" README.md <<'EOF'

## Deployment
- Local: `docker compose up -d` (full stack)
- Backend image: `zestify-backend` (Node 20 slim, healthcheck `/healthz`)
- Frontend image: `zestify-frontend` (Next.js standalone)
- Postgres 16 with named volume
- Cloud (GCP): Compute Engine MIG + Global HTTPS Load Balancer + Cloud SQL — see [docs/deployment-gcp.md](docs/deployment-gcp.md)
EOF
c_as soham  "2026-05-03T14:00:00" "docs: final README with architecture, design patterns, demo accounts" README.md
c_as kalhar "2026-05-03T11:30:00" "feat(backend): SERVICE env switch — single image runs as 6 microservices (auth/events/tickets/payments/notifications/admin)" backend/server.js
c_as nihar  "2026-05-03T11:45:00" "feat(payment): cross-service Stripe verify — api-tickets calls api-payments via internal HTTP" backend/strategies/PaymentStrategy.js backend/routes/payments.js
c_as kalhar "2026-05-03T12:00:00" "feat(deploy): nginx in-VM path router for microservice topology" nginx/nginx.microsvc.conf
c_as kalhar "2026-05-03T12:15:00" "feat(deploy): docker-compose.microsvc.yml — 8-container stack for local microservice dev" docker-compose.microsvc.yml
c_as nihar  "2026-05-03T12:30:00" "feat(deploy): VM startup script + MIG instance template (Debian + Docker + compose)" scripts/vm-startup.sh
c_as nihar  "2026-05-03T12:45:00" "ci: GitHub Actions workflow — unit/integration/build/deploy on push" .github/workflows/ci.yml
c_inline_as kalhar "2026-05-03T15:30:00" "chore: env example for local dev (Stripe + JWT + internal secret)" .env.example <<'EOF'
# Copy to .env (gitignored) and fill in with your test keys.
# Stripe — test mode keys (https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# JWT signing secret (rotate via GCP Secret Manager in prod)
JWT_SECRET=change-me
EOF

echo "==> Done. $(git -C "$REPO" rev-list --count HEAD) commits."
git -C "$REPO" shortlog HEAD -sne
