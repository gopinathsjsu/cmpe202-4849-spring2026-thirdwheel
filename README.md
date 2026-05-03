# Zestify

CMPE 202 Spring 2026 — Team Project.

Eventbrite-like event management platform.

## Team
- Nihar Patel
- Soham Patel
- Kalhar Patel

## Deployment
- Local: `docker compose up -d` (full stack)
- Backend image: `zestify-backend` (Node 20 slim, healthcheck `/healthz`)
- Frontend image: `zestify-frontend` (Next.js standalone)
- Postgres 16 with named volume
- Cloud (GCP): Compute Engine MIG + Global HTTPS Load Balancer + Cloud SQL — see [docs/deployment-gcp.md](docs/deployment-gcp.md)
