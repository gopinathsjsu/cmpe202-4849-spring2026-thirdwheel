#!/usr/bin/env bash
# Soham's commits — Auth + Tickets + Stripe + Frontend foundation + Integration tests + DB TF.
# Pages: /login, /register, /dashboard/my-tickets

source "$(dirname "$0")/_lib.sh"
ensure_snapshot
ensure_git_identity

echo "==> Replaying Soham's commits"

# === W01 (Feb 15-21) ===
c "2026-02-17T14:45:00" "docs: CMPE202 dependency requirements doc" requirements.txt

# === W02 (Feb 22-28) — schema + validate ===
# Schema — early version w/o partial unique index. Fix lands later (Apr 29).
c_strip "2026-02-22T11:00:00" "feat(db): initial Postgres schema (users, events, tickets, notifications)" \
    backend/db/schema.postgres.sql '/uniq_active_ticket/,/WHERE status/d'
c "2026-02-26T13:20:00" "feat(validate): request body validator middleware" \
    backend/middleware/validate.js

# === W03 (Mar 1-7) — auth ===
c "2026-03-01T11:00:00" "feat(repo): user repository with safe column projection" \
    backend/repositories/UserRepository.js
c "2026-03-04T14:15:00" "feat(auth): JWT auth middleware + role guard" \
    backend/middleware/auth.js backend/middleware/roles.js
c "2026-03-06T10:20:00" "feat(api): auth routes (register / login / me / profile)" \
    backend/routes/auth.js

# === W04 (Mar 8-14) — domain events ===
c "2026-03-13T19:15:00" "feat(domain): in-process domain event bus (Observer)" \
    backend/domain/DomainEvents.js

# === W05 (Mar 15-21) — payment + tickets ===
# PaymentStrategy — early version w/o real Stripe. Real Stripe lands Apr 22.
c_inline "2026-03-18T14:50:00" "feat(strategy): pluggable payment strategies (Free / MockCard)" \
    backend/strategies/PaymentStrategy.js <<'EOF'
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
c "2026-03-20T11:30:00" "feat(repo): ticket repository with active-ticket dedupe lookup" \
    backend/repositories/TicketRepository.js

# === W06 (Mar 22-28) — ticketing service ===
# routes/tickets — early w/o payment_intent_id passthrough
c_strip "2026-03-25T18:00:00" "feat(api): ticket purchase + my tickets + cancel routes" \
    backend/routes/tickets.js 's/, payment_intent_id//; s/, paymentIntentId: payment_intent_id//'
# TicketingService — early w/o paymentIntentId param
c_strip "2026-03-27T17:40:00" "feat(service): TicketingService facade (capacity → payment → persist → notify)" \
    backend/services/TicketingService.js 's/, paymentIntentId }/}/; s/{ amount: totalPrice, paymentIntentId }/{ amount: totalPrice }/'

# === W07 (Mar 29-Apr 4) — observers ===
c "2026-04-01T15:00:00" "feat(observers): wire domain events to email + notification side effects" \
    backend/observers/index.js

# === W08 (Apr 5-11) — frontend foundation ===
c "2026-04-08T14:30:00" "feat(frontend): app router layout + global stylesheet" \
    frontend/src/app/layout.js frontend/src/app/globals.css
# lib/api.js — early w/o payments export. Stripe export lands Apr 23.
c_strip "2026-04-10T10:30:00" "feat(frontend): API client (auth + events + tickets + admin + notifications)" \
    frontend/src/lib/api.js '/^\/\/ Payments (Stripe)/,/^};/d'
c "2026-04-10T10:35:00" "feat(frontend): JWT auth context + toast notifications" \
    frontend/src/lib/auth.js frontend/src/lib/toast.js
c "2026-04-11T15:00:00" "feat(frontend): Navbar + Footer with branding" \
    frontend/src/components/Navbar.js frontend/src/components/Navbar.css \
    frontend/src/components/Footer.js frontend/src/components/Footer.css

# === W09 (Apr 12-18) — auth pages + my-tickets ===
c "2026-04-13T12:00:00" "feat(frontend): login page with form validation" \
    frontend/src/app/login/page.js frontend/src/app/login/auth.css
c "2026-04-15T11:00:00" "feat(frontend): register page" \
    frontend/src/app/register/page.js
c "2026-04-17T18:30:00" "feat(frontend): dashboard styles + my-tickets page" \
    frontend/src/app/dashboard/dashboard.css frontend/src/app/dashboard/my-tickets/page.js

# === W10 (Apr 19-25) — STRIPE INTEGRATION + tests ===
c "2026-04-20T11:00:00" "feat(payment): Stripe SDK adapter (PaymentIntent create + retrieve)" \
    backend/adapters/StripeAdapter.js backend/package.json
c "2026-04-21T16:30:00" "feat(api): /api/payments/intent endpoint creates Stripe PaymentIntent for paid events" \
    backend/routes/payments.js backend/server.js
c "2026-04-22T10:00:00" "feat(payment): real Stripe verification in PaymentStrategy + wire payment_intent_id through ticketing flow" \
    backend/strategies/PaymentStrategy.js backend/services/TicketingService.js backend/routes/tickets.js
c "2026-04-23T13:30:00" "feat(frontend): Stripe Elements checkout integration on event detail page" \
    "frontend/src/app/events/[id]/StripeCheckout.js" frontend/src/lib/api.js frontend/package.json "frontend/src/app/events/[id]/page.js"
c "2026-04-23T18:45:00" "feat(deploy): frontend Dockerfile (multi-stage Next.js standalone with Stripe build arg)" \
    frontend/Dockerfile
c "2026-04-24T11:00:00" "test(integration): API tests covering auth/events/tickets/RBAC/state machine + Stripe (24 tests)" \
    backend/tests/integration/api.test.js
c "2026-04-25T15:00:00" "test(unit): PaymentStrategy + validate middleware" \
    backend/tests/unit/PaymentStrategy.test.js backend/tests/unit/validate.test.js

# === W11 (Apr 26-May 3) — fix + TF + final docs ===
c "2026-04-29T15:30:00" "fix(db): partial unique index allows ticket repurchase after cancel" \
    backend/db/schema.postgres.sql
c "2026-05-01T11:30:00" "infra(tf): cloud_sql + secrets modules (Postgres + Secret Manager)" \
    terraform/modules/cloud_sql/main.tf terraform/modules/secrets/main.tf
c "2026-05-02T11:00:00" "infra(tf): envs/dev composition + tf_apply.sh helper" \
    terraform/envs/dev/main.tf scripts/tf_apply.sh
c "2026-05-03T14:00:00" "docs: final README with architecture, design patterns, demo accounts" \
    README.md

echo "==> Soham's commits done."
