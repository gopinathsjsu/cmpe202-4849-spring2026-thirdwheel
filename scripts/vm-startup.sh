#!/bin/bash
# VM startup script — runs at first boot of every Compute Engine VM created from
# the instance template. Pulls 8 microservice images + runs docker-compose.

set -euo pipefail
exec > >(tee -a /var/log/zestify-startup.log) 2>&1
echo "==> $(date) zestify VM startup"

REGION=us-west1
PROJECT=healthy-mender-491009-b4
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/zestify"

# 1. Install Docker
if ! command -v docker >/dev/null; then
    apt-get update
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    cat > /etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release; echo "$VERSION_CODENAME") stable
EOF
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# 2. Auth Docker for Artifact Registry
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet || true

# 3. Read instance metadata
META="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
fetch() { curl -fsS -H 'Metadata-Flavor: Google' "${META}/$1" || echo ""; }

DB_HOST="$(fetch DB_HOST)"
DB_PASS="$(fetch DB_PASS)"
JWT_SECRET="$(fetch JWT_SECRET)"
STRIPE_SECRET_KEY="$(fetch STRIPE_SECRET_KEY)"
INTERNAL_SECRET="$(fetch INTERNAL_SECRET)"
SMTP_HOST="$(fetch SMTP_HOST)"
SMTP_PORT="$(fetch SMTP_PORT)"
SMTP_USER="$(fetch SMTP_USER)"
SMTP_PASS="$(fetch SMTP_PASS)"
EMAIL_FROM="$(fetch EMAIL_FROM)"
EMAIL_PROVIDER="$(fetch EMAIL_PROVIDER)"
[ -z "$EMAIL_PROVIDER" ] && EMAIL_PROVIDER="ethereal"

# 4. Write production compose — 8 containers per VM
mkdir -p /opt/zestify
cat > /opt/zestify/docker-compose.yml <<COMPOSE
name: zestify
services:
  api-auth:
    image: ${REGISTRY}/api-auth:latest
    restart: always
    environment:
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      AUTH_RATE_LIMIT_MAX: 200

  api-events:
    image: ${REGISTRY}/api-events:latest
    restart: always
    environment:
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      EMAIL_PROVIDER: "${EMAIL_PROVIDER}"
      SMTP_HOST: "${SMTP_HOST}"
      SMTP_PORT: "${SMTP_PORT}"
      SMTP_USER: "${SMTP_USER}"
      SMTP_PASS: "${SMTP_PASS}"
      EMAIL_FROM: "${EMAIL_FROM}"

  api-tickets:
    image: ${REGISTRY}/api-tickets:latest
    restart: always
    environment:
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      EMAIL_PROVIDER: "${EMAIL_PROVIDER}"
      SMTP_HOST: "${SMTP_HOST}"
      SMTP_PORT: "${SMTP_PORT}"
      SMTP_USER: "${SMTP_USER}"
      SMTP_PASS: "${SMTP_PASS}"
      EMAIL_FROM: "${EMAIL_FROM}"
      PAYMENTS_SERVICE_URL: http://api-payments:5006
      INTERNAL_SECRET: "${INTERNAL_SECRET}"
    depends_on: [api-payments]

  api-payments:
    image: ${REGISTRY}/api-payments:latest
    restart: always
    environment:
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY}"
      INTERNAL_SECRET: "${INTERNAL_SECRET}"

  api-notifications:
    image: ${REGISTRY}/api-notifications:latest
    restart: always
    environment:
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      EMAIL_PROVIDER: "${EMAIL_PROVIDER}"
      SMTP_HOST: "${SMTP_HOST}"
      SMTP_PORT: "${SMTP_PORT}"
      SMTP_USER: "${SMTP_USER}"
      SMTP_PASS: "${SMTP_PASS}"
      EMAIL_FROM: "${EMAIL_FROM}"
      INTERNAL_SECRET: "${INTERNAL_SECRET}"
      REMINDER_HOURS_AHEAD: "12"
      REMINDER_WINDOW_HOURS: "1"
      REMINDER_POLL_MS: "300000"

  api-admin:
    image: ${REGISTRY}/api-admin:latest
    restart: always
    environment:
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      EMAIL_PROVIDER: "${EMAIL_PROVIDER}"
      SMTP_HOST: "${SMTP_HOST}"
      SMTP_PORT: "${SMTP_PORT}"
      SMTP_USER: "${SMTP_USER}"
      SMTP_PASS: "${SMTP_PASS}"
      EMAIL_FROM: "${EMAIL_FROM}"

  frontend:
    image: ${REGISTRY}/frontend:latest
    restart: always
    environment:
      NODE_ENV: production

  nginx:
    image: ${REGISTRY}/nginx:microsvc
    restart: always
    ports:
      - "80:80"
    depends_on:
      - api-auth
      - api-events
      - api-tickets
      - api-payments
      - api-notifications
      - api-admin
      - frontend
COMPOSE

# 5. Pull + run
cd /opt/zestify
docker compose pull
docker compose up -d

docker compose ps

# 6. Wait for nginx + report aggregate health so MIG sees the VM as live quickly.
for i in $(seq 1 30); do
    if curl -fsS http://localhost/api/health >/dev/null 2>&1; then
        echo "==> $(date) /api/health OK after ${i} probe(s)"
        break
    fi
    sleep 2
done

echo "==> $(date) startup complete"
