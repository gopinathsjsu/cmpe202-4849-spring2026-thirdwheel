#!/usr/bin/env bash
# Kalhar's commits — Notifications + Admin + Backend infra + Adapters + MIG/Cloud SQL TF.
# Pages: /dashboard/my-events, /dashboard/attendees/[id], /admin, /notifications

source "$(dirname "$0")/_lib.sh"
ensure_snapshot
ensure_git_identity

echo "==> Replaying Kalhar's commits"

# === W01 (Feb 15-21) — backend scaffold ===
# Backend package.json — early w/o "stripe" dep. Stripe lands later (Soham Apr 20).
c_strip "2026-02-16T19:20:00" "chore(backend): scaffold Node.js Express project — package.json" \
    backend/package.json '/"stripe":/d'
c "2026-02-16T19:25:00" "chore(backend): scaffold lockfile + dockerignore" \
    backend/package-lock.json backend/.dockerignore

# === W02 (Feb 22-28) — DB infra ===
c "2026-02-23T10:30:00" "feat(db): pg pool with transaction helper + migrate runner" \
    backend/db/pool.js
c "2026-02-27T13:20:00" "chore(middleware): async handler + central error middleware" \
    backend/middleware/asyncHandler.js backend/middleware/errorHandler.js
c "2026-02-28T18:00:00" "feat(db): rich seed data (10 users, 10 categories, 13 events, 12 tickets, 8 notifications)" \
    backend/db/seed.js

# === W03 (Mar 1-7) — admin repo ===
c "2026-03-05T16:30:00" "feat(repo): admin actions audit log + dashboard aggregate stats" \
    backend/repositories/AdminRepository.js

# === W04 (Mar 8-14) — organizer + admin routes ===
c "2026-03-09T11:30:00" "feat(api): organizer routes (my events / stats)" \
    backend/routes/users.js
c "2026-03-11T14:00:00" "feat(api): admin moderation + user management routes" \
    backend/routes/admin.js

# === W05 (Mar 15-21) — email adapter ===
c "2026-03-16T18:30:00" "feat(adapter): email adapter (Ethereal/SMTP/Noop providers + templates)" \
    backend/adapters/EmailAdapter.js backend/utils/email.js

# === W06 (Mar 22-28) — adapters + notif repo ===
c "2026-03-23T10:00:00" "feat(adapter): storage adapter (local disk + GCS pluggable)" \
    backend/adapters/StorageAdapter.js
c "2026-03-26T15:00:00" "feat(adapter): cache adapter (in-memory LRU + Redis read-through)" \
    backend/adapters/CacheAdapter.js
c "2026-03-28T14:00:00" "feat(repo): notification repository" \
    backend/repositories/NotificationRepository.js

# === W07 (Mar 29-Apr 4) — server + routes/notifications + my-events ===
# server.js — early w/o /api/payments mount. Stripe lands later (Soham Apr 21).
c_strip "2026-03-30T19:15:00" "feat(server): express bootstrap with helmet, compression, rate limit, healthz/readyz, graceful shutdown" \
    backend/server.js '/api\/payments/d'
c "2026-04-02T10:30:00" "feat(api): notifications routes (list / mark read / mark all read)" \
    backend/routes/notifications.js
c "2026-04-04T11:00:00" "feat(frontend): organizer my-events page" \
    frontend/src/app/dashboard/my-events/page.js

# === W08 (Apr 5-11) — attendees + admin pages ===
c "2026-04-07T14:30:00" "feat(frontend): organizer attendees page" \
    "frontend/src/app/dashboard/attendees/[id]/page.js"
# Admin page — early w/o dashboard.css import. Fix lands Apr 28.
c_strip "2026-04-10T11:30:00" "feat(frontend): admin dashboard page (moderation queue + user mgmt)" \
    frontend/src/app/admin/page.js "/dashboard\/dashboard.css/d"
c "2026-04-10T11:35:00" "style(frontend): admin dashboard stylesheet" \
    frontend/src/app/admin/admin.css

# === W09 (Apr 12-18) — notifications page + backend Dockerfile + compose ===
# Notifications page — early w/o dashboard.css import. Fix lands Apr 28.
c_strip "2026-04-14T11:00:00" "feat(frontend): notifications page" \
    frontend/src/app/notifications/page.js "/dashboard\/dashboard.css/d"
c "2026-04-14T11:05:00" "style(frontend): notifications page stylesheet" \
    frontend/src/app/notifications/notifications.css
c "2026-04-16T15:30:00" "feat(deploy): backend Dockerfile (slim Node 20 + healthcheck)" \
    backend/Dockerfile
# docker-compose — early w/o STRIPE env. STRIPE env lands Apr 30.
c_strip "2026-04-18T13:00:00" "feat(deploy): docker-compose stack (postgres + backend + frontend + seed)" \
    docker-compose.yml '/STRIPE/d; /AUTH_RATE/d'

# === W10 (Apr 19-25) — smoke test ===
c "2026-04-24T18:50:00" "test(system): smoke test script for end-to-end black-box verification" \
    scripts/smoke.sh

# === W11 (Apr 26-May 3) — fixes + TF MIG/Cloud Run backend ===
c "2026-04-28T16:30:00" "fix(frontend): wire admin + notifications pages to dashboard stylesheet" \
    frontend/src/app/admin/page.js frontend/src/app/notifications/page.js
c "2026-04-30T11:00:00" "feat(deploy): docker-compose Stripe env wiring + auth rate-limit bump" \
    docker-compose.yml
c "2026-04-30T17:30:00" "infra(tf): cloud_run_backend module (with Cloud SQL connector + secret env refs)" \
    terraform/modules/cloud_run_backend/main.tf
c "2026-05-01T10:30:00" "infra(tf): storage module (GCS bucket for uploads)" \
    terraform/modules/storage/main.tf
c "2026-05-01T15:00:00" "infra(tf): iam module (backend service account + role bindings)" \
    terraform/modules/iam/main.tf
c "2026-05-02T11:00:00" "infra(tf): outputs + variables + tfvars.example" \
    terraform/outputs.tf terraform/variables.tf terraform/terraform.tfvars.example
c "2026-05-02T16:00:00" "infra(tf): envs/prod composition" \
    terraform/envs/prod/main.tf
c "2026-05-03T11:00:00" "chore: history rebuild scripts + per-author commit views" \
    scripts/history/_lib.sh scripts/history/prepare_history.sh scripts/history/README.md \
    scripts/history/commits_nihar.sh scripts/history/commits_soham.sh scripts/history/commits_kalhar.sh
c_inline "2026-05-03T15:30:00" "chore: env example for local dev (Stripe + JWT)" .env.example <<'EOF'
# Copy to .env (gitignored) and fill in with your test keys.
# Stripe — test mode keys (https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# JWT signing secret (rotate via GCP Secret Manager in prod)
JWT_SECRET=change-me
EOF

echo "==> Kalhar's commits done."
