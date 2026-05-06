# Sprint 6 Task Board — Apr 26 – May 3

**Theme:** GCP Deploy · live cloud deployment with CI/CD + IaC.

**Sprint goal:** Run the full microservice stack on Google Cloud — Compute Engine MIG
fronted by a Global HTTPS Load Balancer, Cloud SQL Postgres, Artifact Registry images,
GitHub Actions CI pipeline, full Terraform modules covering every resource.

**Capacity:** 24 story points

## Swimlanes (end of sprint)

| 🆕 To Do | 🚧 In Progress | 🔍 In Review | ✅ Done |
|---------|----------------|--------------|--------|
| — | — | — | ZST-023, ZST-024, ZST-025, ZST-026 |

## Stories

| ID | Story | Owner | Points | Status |
|----|-------|-------|--------|--------|
| ZST-023 | GitHub Actions CI/CD (matrix build + AR push + MIG rolling-restart) | Nihar | 5 | ✅ Done |
| ZST-024 | GCP Compute MIG + Global HTTPS LB (2 × e2-medium serving 8 containers each via single LB IP) | Nihar | 8 | ✅ Done |
| ZST-025 | Terraform infra modules (artifact_registry / cloud_sql / cloud_run / iam / storage / secrets) | All 3 | 8 | ✅ Done |
| ZST-026 | Smoke + unit test suites (scripts/smoke.sh against live LB) | Kalhar + Nihar | 3 | ✅ Done |

## Burndown

| Day | Date | Remaining points | Note |
|-----|------|------------------|------|
| 0 | Apr 26 | 24 | Sprint start |
| 2 | Apr 28 | 19 | ZST-023 done |
| 5 | May 1 | 11 | ZST-024 done |
| 7 | May 3 | 3 | ZST-025 done |
| 8 | May 3 | 0 | ZST-026 done |

**Velocity:** 24 points · all stories closed.

## Retrospective notes
- MIG `max-unavailable` had to equal number of zones (3) for regional MIG — surprise gotcha.
- Cloud SQL Auth Proxy + IAM-based auth was the right pattern but slowed iteration; switched to authorized-networks for the demo (slated for Sprint 7+ refactor — backlog item ZST-041).
- GitHub Actions matrix build ran 6 services in parallel; first run was 4 minutes end-to-end → reduced to ~90s with Docker layer caching across runs.
