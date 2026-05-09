// Integration tests: run against a fully-running backend.
// Set TEST_API_URL=http://localhost:5001 (default) before running.

const test = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.TEST_API_URL || 'http://localhost:5001';

async function api(path, opts = {}) {
    const res = await fetch(BASE + path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: res.status, body, contentType: res.headers.get('content-type') || '' };
}

const _tokenCache = new Map();
async function login(email, password) {
    if (_tokenCache.has(email)) return _tokenCache.get(email);
    const r = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(r.status, 200, `login failed for ${email}: ${JSON.stringify(r.body)}`);
    _tokenCache.set(email, r.body.token);
    return r.body.token;
}

// Demo convention: password = email for every demo account (team gmails +
// any @zestify.com). Other domains (real signups) keep 'password123' in tests.
const PASS = 'password123';
const TEAM_EMAILS = new Set([
    'kalharpatel10@gmail.com',
    'nihardharmeshkumar.patel@sjsu.edu',
    'sohamrajjain0007@gmail.com',
]);
function passFor(email) {
    if (TEAM_EMAILS.has(email)) return email;
    if (email.endsWith('@zestify.com')) return email;
    return PASS;
}

test('GET /healthz returns ok', async () => {
    const r = await api('/healthz');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ok');
});

test('GET /readyz pings DB', async () => {
    const r = await api('/readyz');
    assert.equal(r.status, 200);
    assert.equal(r.body.status, 'ready');
});

test('GET /api/health version 2', async () => {
    const r = await api('/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.body.version, '2.0.0');
});

test('GET /api/events returns approved events with pagination', async () => {
    const r = await api('/api/events?limit=5');
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.events));
    assert.ok(r.body.pagination.total >= 1);
    for (const e of r.body.events) assert.equal(e.status, 'approved');
});

test('GET /api/events search narrows results', async () => {
    const r = await api('/api/events?search=design');
    assert.equal(r.status, 200);
    assert.ok(r.body.events.some(e => /design/i.test(e.title)));
});

test('GET /api/events/categories returns 10', async () => {
    const r = await api('/api/events/categories');
    assert.equal(r.status, 200);
    assert.equal(r.body.categories.length, 10);
});

test('GET /api/events/featured returns featured events', async () => {
    const r = await api('/api/events/featured');
    assert.equal(r.status, 200);
    assert.ok(r.body.events.length > 0);
});

test('GET /api/events/:id 404 for unknown', async () => {
    const r = await api('/api/events/99999');
    assert.equal(r.status, 404);
});

test('GET /api/events/:id/calendar returns ICS', async () => {
    const r = await api('/api/events/1/calendar');
    assert.equal(r.status, 200);
    assert.match(r.contentType, /text\/calendar/);
});

test('Auth: register validates input', async () => {
    const r = await api('/api/auth/register', { method: 'POST', body: { name: 'x', email: 'bad', password: '123' } });
    assert.equal(r.status, 400);
    assert.ok(r.body.details);
});

test('Auth: login bad password rejected', async () => {
    const r = await api('/api/auth/login', { method: 'POST', body: { email: 'kalharpatel10@gmail.com', password: 'wrong' } });
    assert.equal(r.status, 401);
});

test('Auth: login + me round-trip', async () => {
    const token = await login('kalharpatel10@gmail.com', passFor('kalharpatel10@gmail.com'));
    const r = await api('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, 'admin');
});

test('RBAC: attendee blocked from /api/admin/stats', async () => {
    const token = await login('chris@zestify.com', passFor('chris@zestify.com'));
    const r = await api('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 403);
});

test('Admin: stats endpoint works', async () => {
    const token = await login('kalharpatel10@gmail.com', passFor('kalharpatel10@gmail.com'));
    const r = await api('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200);
    assert.ok(r.body.stats.totalUsers > 0);
});

test('Admin: list pending events', async () => {
    const token = await login('kalharpatel10@gmail.com', passFor('kalharpatel10@gmail.com'));
    const r = await api('/api/admin/events?status=pending', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body.events));
});

test('Tickets: full purchase + cancel + repurchase round-trip (no unique-key conflict)', async () => {
    // Use lisa who has no seeded tickets; pick a free, available event.
    const token = await login('lisa@zestify.com', passFor('lisa@zestify.com'));
    // Find a free event lisa has no ticket for.
    const events = await api('/api/events?limit=20');
    const candidate = events.body.events.find(e => e.price === 0 && e.spots_left > 0);
    assert.ok(candidate, 'No free event available for ticket test');

    // Ensure clean slate: delete any existing ticket for this event (best-effort).
    const my = await api('/api/tickets/my', { headers: { Authorization: `Bearer ${token}` } });
    const existing = my.body.tickets.find(t => t.event_id === candidate.id && t.status !== 'cancelled');
    if (existing) {
        await api(`/api/tickets/${existing.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    }

    const buy = await api('/api/tickets', { method: 'POST', body: { event_id: candidate.id, quantity: 1 }, headers: { Authorization: `Bearer ${token}` } });
    assert.equal(buy.status, 201, JSON.stringify(buy.body));
    const ticketId = buy.body.ticket.id;

    const buy2 = await api('/api/tickets', { method: 'POST', body: { event_id: candidate.id, quantity: 1 }, headers: { Authorization: `Bearer ${token}` } });
    assert.equal(buy2.status, 409, 'Should reject duplicate active ticket');

    const cancel = await api(`/api/tickets/${ticketId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(cancel.status, 200);

    const repurchase = await api('/api/tickets', { method: 'POST', body: { event_id: candidate.id, quantity: 1 }, headers: { Authorization: `Bearer ${token}` } });
    assert.equal(repurchase.status, 201, 'Repurchase after cancel must succeed: ' + JSON.stringify(repurchase.body));

    // Cleanup
    await api(`/api/tickets/${repurchase.body.ticket.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
});

test('Notifications: list returns shape', async () => {
    const token = await login('sohamrajjain0007@gmail.com', passFor('sohamrajjain0007@gmail.com'));
    const r = await api('/api/notifications?limit=5', { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(r.status, 200);
    assert.ok('unreadCount' in r.body);
    assert.ok(Array.isArray(r.body.notifications));
});

test('Moderation pipeline: spam keywords auto-rejected on create', async () => {
    const token = await login('nihardharmeshkumar.patel@sjsu.edu', passFor('nihardharmeshkumar.patel@sjsu.edu'));
    const r = await api('/api/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
            title: 'Free iPhone giveaway test',
            description: 'click here to win and sign up now for the iphone',
            date: '2026-12-31', time: '10:00', location: 'Online', capacity: 50,
        },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.event.status, 'rejected');
    assert.equal(r.body.decision.action, 'auto-reject');
});

test('Moderation pipeline: capacity > 100k auto-rejected', async () => {
    const token = await login('nihardharmeshkumar.patel@sjsu.edu', passFor('nihardharmeshkumar.patel@sjsu.edu'));
    const r = await api('/api/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: {
            title: 'Stadium Mega Show',
            description: 'Massive event with millions joining all night long',
            date: '2026-12-31', time: '10:00', location: 'Stadium', capacity: 500000,
        },
    });
    assert.equal(r.status, 201);
    assert.equal(r.body.event.status, 'rejected');
});

test('State machine: re-approve already approved fails', async () => {
    const token = await login('kalharpatel10@gmail.com', passFor('kalharpatel10@gmail.com'));
    const r = await api('/api/admin/events/1/approve', {
        method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: {},
    });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /Illegal/);
});

test('Unknown route returns 404', async () => {
    // Microservice layout: nginx routes unknown /api/* paths to frontend → Next.js 404 page (HTML).
    // Monolith layout: backend's express 404 handler returns JSON.
    // Either way status must be 404.
    const r = await api('/api/this-does-not-exist');
    assert.equal(r.status, 404);
});

test('Stripe: PaymentIntent created for paid event', { skip: !process.env.STRIPE_SECRET_KEY ? 'STRIPE_SECRET_KEY not set' : false }, async () => {
    const token = await login('sohamrajjain0007@gmail.com', passFor('sohamrajjain0007@gmail.com'));
    const events = await api('/api/events?limit=20');
    const paid = events.body.events.find(e => e.price > 0);
    assert.ok(paid, 'no paid event seeded');
    const r = await api('/api/payments/intent', {
        method: 'POST',
        body: { event_id: paid.id, quantity: 1 },
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.match(r.body.clientSecret, /^pi_[A-Za-z0-9_]+_secret_/);
    assert.match(r.body.paymentIntentId, /^pi_/);
    assert.equal(r.body.amount, paid.price);
});

test('Stripe: PaymentIntent rejected for free event', async () => {
    const token = await login('sohamrajjain0007@gmail.com', passFor('sohamrajjain0007@gmail.com'));
    const events = await api('/api/events?limit=20');
    const free = events.body.events.find(e => e.price === 0);
    const r = await api('/api/payments/intent', {
        method: 'POST',
        body: { event_id: free.id, quantity: 1 },
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /free/i);
});

test('Stripe: ticket purchase requires paymentIntentId for stripe method', async () => {
    // Use a user with no existing ticket on the chosen paid event so the dedupe check passes.
    const token = await login('lisa@zestify.com', passFor('lisa@zestify.com'));
    const events = await api('/api/events?limit=20');
    const my = await api('/api/tickets/my', { headers: { Authorization: `Bearer ${token}` } });
    const ownedEventIds = new Set((my.body.tickets || []).filter(t => t.status !== 'cancelled').map(t => t.event_id));
    const paid = events.body.events.find(e => e.price > 0 && !ownedEventIds.has(e.id));
    assert.ok(paid, 'no available paid event for fresh purchase');
    const r = await api('/api/tickets', {
        method: 'POST',
        body: { event_id: paid.id, quantity: 1, payment_method: 'stripe' },
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(r.status, 400, JSON.stringify(r.body));
    assert.match(r.body.error, /paymentIntentId/);
});
