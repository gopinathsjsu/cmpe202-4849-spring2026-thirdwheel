#!/bin/bash
# VM startup script — installs Docker, pulls microservice images, runs docker-compose.
# Runs at first boot of every Compute Engine VM created from the instance template.
# Reads instance metadata for env values (DB pass, JWT, Stripe sk, etc.).

set -euo pipefail
exec > >(tee -a /var/log/zestify-startup.log) 2>&1
echo "==> $(date) zestify VM startup"

REGION=us-west1
PROJECT=healthy-mender-491009-b4
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/zestify"

# 1. Install Docker if missing
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

# 2. Auth Docker against Artifact Registry via the VM's attached service account
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet || true

# 3. Pull metadata values (env injected at MIG create time via instance template)
META="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
fetch() { curl -fsS -H 'Metadata-Flavor: Google' "${META}/$1" || echo ""; }

DB_HOST="$(fetch DB_HOST)"
DB_PASS="$(fetch DB_PASS)"
JWT_SECRET="$(fetch JWT_SECRET)"
STRIPE_SECRET_KEY="$(fetch STRIPE_SECRET_KEY)"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$(fetch NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)"
INTERNAL_SECRET="$(fetch INTERNAL_SECRET)"

# 4. Write production compose file
mkdir -p /opt/zestify
cat > /opt/zestify/docker-compose.yml <<COMPOSE
name: zestify
services:
  api-auth:
    image: ${REGISTRY}/backend:microsvc
    restart: always
    environment:
      SERVICE: auth
      PORT: 5001
      NODE_ENV: production
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      LOG_LEVEL: info
      AUTH_RATE_LIMIT_MAX: 200

  api-events:
    image: ${REGISTRY}/backend:microsvc
    restart: always
    environment:
      SERVICE: events
      PORT: 5002
      NODE_ENV: production
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      LOG_LEVEL: info

  api-tickets:
    image: ${REGISTRY}/backend:microsvc
    restart: always
    environment:
      SERVICE: tickets
      PORT: 5003
      NODE_ENV: production
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      EMAIL_PROVIDER: ethereal
      LOG_LEVEL: info
      PAYMENTS_SERVICE_URL: http://api-payments:5006
      INTERNAL_SECRET: "${INTERNAL_SECRET}"
    depends_on: [api-payments]

  api-payments:
    image: ${REGISTRY}/backend:microsvc
    restart: always
    environment:
      SERVICE: payments
      PORT: 5006
      NODE_ENV: production
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      LOG_LEVEL: info
      STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY}"
      INTERNAL_SECRET: "${INTERNAL_SECRET}"

  api-notifications:
    image: ${REGISTRY}/backend:microsvc
    restart: always
    environment:
      SERVICE: notifications
      PORT: 5004
      NODE_ENV: production
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      LOG_LEVEL: info

  api-admin:
    image: ${REGISTRY}/backend:microsvc
    restart: always
    environment:
      SERVICE: admin
      PORT: 5005
      NODE_ENV: production
      JWT_SECRET: "${JWT_SECRET}"
      PGHOST: "${DB_HOST}"
      PGUSER: zestify
      PGPASSWORD: "${DB_PASS}"
      PGDATABASE: zestify
      EMAIL_PROVIDER: ethereal
      LOG_LEVEL: info

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

# 6. Health summary
docker compose ps
echo "==> $(date) startup complete"
