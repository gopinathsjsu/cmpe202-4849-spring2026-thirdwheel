# ADR-0002 — Shared module layout vs. duplicated code

**Status:** Accepted · **Date:** 2026-04-14 · **Author:** Nihar Patel · **Sprint:** 5

## Context

After committing to the per-service folder split (ADR-0001), we faced a
classic microservice trade-off: every service needs the same Postgres pool,
the same auth middleware, the same Repository pattern over `users` /
`events` / `tickets`. Three options on the table:

A. **Copy-paste** the shared code into every service folder.
B. **Publish as private npm packages** (`@zestify/shared-db`, `@zestify/shared-domain`, …) consumed via npm.
C. **Mono-repo link** — single `backend/shared/` folder, each service's
   `package.json` links to it via `link:../../shared`.

## Decision

Adopt option **C**.

Concrete layout:

```
backend/
├── shared/
│   ├── package.json          // private, lists every shared dep
│   ├── server-base.js        // Express factory used by all 6 services
│   ├── db/                   // pool + schema + seed
│   ├── repositories/         // 6 Repository classes
│   ├── adapters/             // Email, Cache, Storage, Stripe
│   ├── domain/               // StateMachine + DomainEvents bus
│   ├── middleware/           // auth, roles, validate, asyncHandler, errorHandler
│   └── utils/                // calendar, email, passwordPolicy
└── services/
    ├── auth/
    │   ├── package.json      // "dependencies": { "@zestify/shared": "link:../../shared" }
    │   ├── server.js         // const { createApp, listen } = require('../../shared/server-base')
    │   └── ...
    ├── events/ ...
    └── ...
```

Dockerfile pattern (per service):

```Dockerfile
FROM node:20-bookworm-slim
WORKDIR /app

# 1. Install shared deps first so they cache.
COPY shared/package.json ./shared/
RUN cd shared && npm install --omit=dev

# 2. Copy shared source.
COPY shared/ ./shared/

# 3. Install service-specific deps.
COPY services/<svc>/package*.json ./services/<svc>/
WORKDIR /app/services/<svc>
RUN npm install --omit=dev

# 4. Copy service source.
COPY services/<svc>/ ./

CMD ["node", "server.js"]
```

## Consequences

**Positive**
- One pg pool definition. One JWT middleware. One Repository per aggregate. A
  bug fix in `UserRepository.findById` lands once and every service inherits it
  on next image rebuild.
- BuildKit caches the shared layer separately. If you only touch
  `services/events/routes.js`, the 4 shared layers are reused — image rebuild
  finishes in ~10s.
- No npm-private-registry overhead. No version bumps to maintain. No risk of a
  service running an old shared package.

**Negative**
- Coupling — every service redeploys when shared/ changes, even if the service
  doesn't actually use the changed file. Mitigated by CI's matrix build (6 in
  parallel) — full redeploy still under 90 seconds.
- The shared folder is small and tempting to dump random utilities into. We
  enforce discipline via PR review: anything added to `shared/` must be used by
  at least 2 services or it goes back into the service folder.

## Alternatives considered

1. **npm private registry** (Verdaccio / GitHub Packages). Rejected — extra
   infra to maintain. Version-bump dance for a 3-person team isn't worth it.
2. **Symlinks instead of `link:`**. Rejected — Docker COPY does not follow
   symlinks. Would need to flatten before building, defeating the purpose.
3. **Yarn workspaces / pnpm workspaces.** Considered seriously. Would give us
   hoisted node_modules + nicer DX. Rejected for scope — npm `link:` syntax is
   built-in and works in plain npm 8+. We can migrate to workspaces later
   without rewriting consumer code (the require paths stay the same).

## References

- `backend/shared/server-base.js`
- `backend/services/auth/Dockerfile` — canonical example
- ADR-0001 (microservice split)
