#!/usr/bin/env bash
# Mirrors Jenkinsfile stages on a local machine for fast feedback.
# Usage: ./scripts/ci-local.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PROJECT="zestify-cilocal"
export COMPOSE_PROJECT_NAME="$PROJECT"
export API_URL="${API_URL:-http://localhost:5001}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

bold() { printf "\n\033[1;36m=== %s ===\033[0m\n" "$1"; }

cleanup() {
    bold "Tearing down stack"
    docker compose -p "$PROJECT" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

bold "Stage: Install backend deps"
( cd backend && (npm ci 2>/dev/null || npm install) )

bold "Stage: Install frontend deps"
( cd frontend && (npm ci 2>/dev/null || npm install) )

bold "Stage: Frontend lint"
( cd frontend && npm run lint )

bold "Stage: Unit tests"
( cd backend && npm run test:unit )

bold "Stage: Build images"
docker compose -p "$PROJECT" build

bold "Stage: Bring up stack + seed"
docker compose -p "$PROJECT" up -d postgres
for i in $(seq 1 30); do
    if docker compose -p "$PROJECT" exec -T postgres pg_isready -U zestify -d zestify >/dev/null 2>&1; then break; fi
    sleep 2
done
docker compose -p "$PROJECT" run --rm seed
docker compose -p "$PROJECT" up -d backend frontend
for i in $(seq 1 60); do curl -fsS "$API_URL/readyz" >/dev/null && break; sleep 2; done
for i in $(seq 1 60); do curl -fsS "$FRONTEND_URL/" >/dev/null && break; sleep 2; done

bold "Stage: Integration tests"
( cd backend && TEST_API_URL="$API_URL" npm run test:integration )

bold "Stage: System smoke"
bash scripts/smoke.sh

bold "PIPELINE OK"
