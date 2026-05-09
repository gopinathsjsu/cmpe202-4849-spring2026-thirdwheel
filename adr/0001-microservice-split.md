# ADR-0001 — Split monolith into per-service folders

**Status:** Accepted · **Date:** 2026-04-12 · **Author:** Nihar Patel · **Sprint:** 5

## Context

Through Sprint 4, the codebase was a single Express monolith with one `server.js`
in `backend/` and the whole route tree (auth + events + tickets + admin +
notifications + payments) mounted on the same process. We had a working
`SERVICE=<svc>` environment-variable switch that let us run six processes from
the same image, each binding a different port, but every container shipped the
entire codebase. That worked but did not match the course requirement to
demonstrate a microservice topology, and it forced every routine push to rebuild
all 6 images even when only one logical service had changed.

CMPE 202 requires demonstrating a microservice architecture with at least three
services, independent deployments, and bounded contexts. The `SERVICE` env
switch satisfied the *runtime* shape but not the *source* shape — anyone reading
the repo would conclude we had built a monolith with namespace tricks.

## Decision

Split the source tree into `backend/services/<svc>/` per service. Each service
owns its own:
- `server.js` — Express factory call + port bind
- `routes.js` — domain routes
- `service.js` — Facade orchestrating repositories + adapters
- `observers.js` — domain bus subscriptions (where applicable)
- `Dockerfile` — multi-stage Node 20 slim image
- `package.json` — minimal per-service deps + a workspace `link:` to shared

Cross-cutting code lives in `backend/shared/`:
- `repositories/` — six repository modules
- `adapters/` — Email, Cache, Storage, Stripe
- `domain/` — StateMachine + DomainEvents bus
- `middleware/` — auth, roles, validate, asyncHandler, errorHandler
- `db/` — pool, schema, seed
- `server-base.js` — Express factory shared by every service
- `utils/` — calendar, email, passwordPolicy

Communication patterns:
- **Synchronous** — internal HTTP between services via the Docker bridge network
  hostname (e.g. `http://api-payments:5006/internal/...`) guarded by
  `X-Internal-Secret`. Used only by api-tickets → api-payments for Stripe
  PaymentIntent verification.
- **Asynchronous in-process** — Node's built-in `EventEmitter` (see ADR-0003).
  Each service that emits also registers its own observers; no cross-process
  fan-out yet.

## Consequences

**Positive**
- Source layout finally matches the runtime topology. Demo reviewers can run
  `tree backend/services/` and immediately see six bounded contexts.
- Each service has its own Dockerfile + can be rebuilt independently. CI matrix
  build hits six parallel jobs instead of one big serial build.
- Domain expertise is localized — Nihar owns events+payments folders, Soham
  owns auth+tickets, Kalhar owns admin+notifications.

**Negative**
- Six small `package.json` files instead of one big one. Bumping a shared dep
  (e.g. `pg` major) requires N changes. Mitigated by keeping shared deps in
  `backend/shared/package.json` and linking from each service.
- Local `docker compose up` builds 6 images on cold cache, which can take 3+
  minutes the first time. Acceptable — usually only one service changes per PR
  and BuildKit's layer cache absorbs the rest.

**Migration path**

We did not big-bang the refactor. The intermediate `SERVICE=<svc>` env-switch
stage stayed live for one full sprint (sprint 5 week 1) while we validated:
- nginx in-VM router with `resolver 127.0.0.11 ipv6=off valid=10s` for lazy
  DNS resolution against per-container hostnames.
- docker-compose service-to-service DNS (`api-tickets` resolves to
  `api-tickets-1` automatically inside the Docker bridge).
- Health-check endpoints (`/api/health`, `/readyz`) behave identically whether
  one or six processes serve them.

Only after that worked did we split the source tree (commit ZST-021).

## Alternatives considered

1. **Stay monolith, expose multiple `/api/*` prefixes from one process.**
   Rejected — would not demonstrate the microservice course requirement.
2. **Use a message broker (NATS / RabbitMQ) for all cross-service traffic.**
   Rejected for scope — async fan-out is single-event, single-consumer in our
   problem domain. Direct HTTP + shared internal secret is simpler and equally
   secure inside the VPC. See ADR-0005 for the trade-off.
3. **Use gRPC instead of REST internally.** Rejected — only one cross-service
   call exists (Stripe verify). gRPC tooling overhead would dominate.

## References

- Sprint 5 planning meeting notes (Apr 12)
- nginx microsvc.conf — `nginx/nginx.microsvc.conf`
- ADR-0002 (shared module layout)
- ADR-0003 (in-process domain bus)
