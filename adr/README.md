# Architecture Decision Records

Short write-ups of significant architectural choices made during the project.
Each ADR follows the lightweight Michael Nygard template — Context, Decision,
Consequences, Alternatives. Numbered in the order the decision was *finalised*,
not necessarily the order it was first considered.

| # | Title | Sprint | Status |
|---|-------|--------|--------|
| [0001](0001-microservice-split.md) | Split monolith into per-service folders | 5 | Accepted |
| [0002](0002-shared-module-layout.md) | Shared module layout vs. duplicated code | 5 | Accepted |
| [0003](0003-in-process-event-bus.md) | In-process domain event bus (vs. broker) | 4 | Accepted |
| [0004](0004-postgres-partial-unique-index.md) | Partial UNIQUE index for ticket re-purchase | 4 | Accepted |
| [0005](0005-compute-mig-over-cloud-run.md) | Compute MIG + Global LB over Cloud Run | 6 | Accepted |

## How we use ADRs

- We open an ADR PR **before** committing to a non-trivial architectural
  decision. The PR description doubles as the discussion record.
- Once merged, the ADR is **never edited** — only superseded by a new ADR that
  references the older one in its Context section. This way the history of
  *why* the system looks like it does stays intact even when the *what*
  changes.
- New team members read this folder front-to-back as part of onboarding.
