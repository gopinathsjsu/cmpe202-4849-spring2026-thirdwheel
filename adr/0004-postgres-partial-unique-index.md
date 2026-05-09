# ADR-0004 — Partial UNIQUE index for ticket re-purchase

**Status:** Accepted · **Date:** 2026-04-09 · **Author:** Soham Raj Jain · **Sprint:** 4

## Context

A user buys a ticket for event X. Later they cancel it. Then they change their
mind and want to buy again for event X. With a naive `UNIQUE (user_id,
event_id)` constraint on the `tickets` table, the second INSERT fails on the
existing cancelled row.

We caught this in our integration tests
(`tests/integration/api.test.js — "Tickets: full purchase + cancel + repurchase
round-trip (no unique-key conflict)"`). Three approaches considered:

A. **Soft-delete + history table.** Move cancelled rows to `tickets_history`,
   keep `tickets` for active only. Drop the UNIQUE constraint problem.
B. **Composite UNIQUE with status.** `UNIQUE (user_id, event_id, status)` lets
   `confirmed` + `cancelled` co-exist for the same (user, event) but allows
   multiple cancelled rows, which is fine.
C. **Partial UNIQUE index.** `UNIQUE (user_id, event_id) WHERE status !=
   'cancelled'`. Postgres-only feature — exactly what we want.

## Decision

Adopt **option C**:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_ticket
  ON tickets (user_id, event_id)
  WHERE status != 'cancelled';
```

## Consequences

**Positive**
- One-line schema change. No migration to a history table. No multi-row
  proliferation. INSERT path stays a single statement.
- Read path stays trivial — `SELECT * FROM tickets WHERE user_id=? AND event_id=?
  AND status != 'cancelled'` returns at most one row (proven by the unique
  index), so no `LIMIT 1` ambiguity.
- Cancel + re-buy works without touching any application code.

**Negative**
- Postgres-only. We can't trivially migrate to SQLite for local dev. Acceptable
  since we ship a docker-compose Postgres for local anyway.
- Subtle for new readers. Partial indexes are a less-known feature. Mitigated by
  the migration comment + this ADR.

## Test coverage

Integration test asserts the round-trip:

```js
// Buy → 201
// Buy again same event → 409 (active dedupe)
// Cancel ticket → 200
// Buy again → 201   ← this is the partial-unique-index magic
```

That test would fail without the `WHERE status != 'cancelled'` clause.

## References

- `backend/shared/db/schema.postgres.sql` lines for `uniq_active_ticket`
- Postgres docs on partial indexes:
  https://www.postgresql.org/docs/current/indexes-partial.html
