#!/usr/bin/env bash
# System smoke test — verifies live stack via HTTP + JSON parsing.
# Usage: API_URL=http://localhost:5001 FRONTEND_URL=http://localhost:3000 ./scripts/smoke.sh

set -uo pipefail

API_URL="${API_URL:-http://localhost:5001}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
FAIL=0

red()   { printf "\033[31m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }

check() {
    local name="$1"; local expected="$2"; local actual="$3"
    if [ "$expected" = "$actual" ]; then
        green "  PASS  $name (got $actual)"
    else
        red   "  FAIL  $name (expected $expected, got $actual)"
        FAIL=$((FAIL+1))
    fi
}

http_code() {
    curl -s -o /dev/null -w '%{http_code}' "$@"
}

post_json_code() {
    local url="$1"; shift
    local body="$1"; shift
    curl -s -o /dev/null -w '%{http_code}' -X POST "$url" \
        -H 'Content-Type: application/json' --data "$body" "$@"
}

login_token() {
    local body="$1"
    curl -s -X POST "$API_URL/api/auth/login" \
        -H 'Content-Type: application/json' --data "$body" \
        | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))"
}

echo "=== Smoke: Health ==="
check "GET /healthz"        200 "$(http_code "$API_URL/healthz")"
check "GET /readyz"         200 "$(http_code "$API_URL/readyz")"
check "GET /api/health"     200 "$(http_code "$API_URL/api/health")"

echo "=== Smoke: Public API ==="
check "GET /api/events"            200 "$(http_code "$API_URL/api/events?limit=3")"
check "GET /api/events/categories" 200 "$(http_code "$API_URL/api/events/categories")"
check "GET /api/events/featured"   200 "$(http_code "$API_URL/api/events/featured")"
check "GET /api/events/stats"      200 "$(http_code "$API_URL/api/events/stats")"
check "GET /api/events/1"          200 "$(http_code "$API_URL/api/events/1")"
check "GET /api/events/1/calendar" 200 "$(http_code "$API_URL/api/events/1/calendar")"
check "GET /api/events/99999"      404 "$(http_code "$API_URL/api/events/99999")"

echo "=== Smoke: Auth ==="
GOOD_LOGIN='{"email":"admin@zestify.com","password":"password123"}'
BAD_LOGIN='{"email":"admin@zestify.com","password":"wrong"}'
WEAK_REGISTER='{"name":"x","email":"bad","password":"123"}'
check "POST /api/auth/login OK"        200 "$(post_json_code "$API_URL/api/auth/login" "$GOOD_LOGIN")"
check "POST /api/auth/login bad pass"  401 "$(post_json_code "$API_URL/api/auth/login" "$BAD_LOGIN")"
check "POST /api/auth/register weak"   400 "$(post_json_code "$API_URL/api/auth/register" "$WEAK_REGISTER")"

ADMIN=$(login_token "$GOOD_LOGIN")
ATTEND_LOGIN='{"email":"chris@zestify.com","password":"password123"}'
ATTEND=$(login_token "$ATTEND_LOGIN")

echo "=== Smoke: RBAC ==="
check "attendee -> /api/admin/stats" 403 "$(http_code -H "Authorization: Bearer $ATTEND" "$API_URL/api/admin/stats")"
check "admin -> /api/admin/stats"    200 "$(http_code -H "Authorization: Bearer $ADMIN" "$API_URL/api/admin/stats")"
check "no token -> /api/admin/stats" 401 "$(http_code "$API_URL/api/admin/stats")"

echo "=== Smoke: Frontend (SSR) ==="
check "GET /"               200 "$(http_code "$FRONTEND_URL/")"
check "GET /events"         200 "$(http_code "$FRONTEND_URL/events")"
check "GET /login"          200 "$(http_code "$FRONTEND_URL/login")"
check "GET /admin"          200 "$(http_code "$FRONTEND_URL/admin")"
check "GET /notifications"  200 "$(http_code "$FRONTEND_URL/notifications")"

echo
if [ "$FAIL" -eq 0 ]; then
    green "ALL SMOKE CHECKS PASSED"
    exit 0
else
    red "$FAIL smoke check(s) failed"
    exit 1
fi
