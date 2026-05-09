# ADR-0005 — Compute MIG + Global LB over Cloud Run

**Status:** Accepted · **Date:** 2026-04-26 · **Author:** Nihar Patel · **Sprint:** 6

## Context

The course requirement reads "Auto Scaled EC2 Cluster + LB". On GCP the
literal equivalent is **Compute Engine Managed Instance Group + Global HTTPS
Load Balancer**. The natural alternative for a small Node service is **Cloud
Run** (serverless, auto-scale-to-zero, built-in HTTPS) — which is what our
Terraform modules originally targeted.

We have to choose one of these for the *production demo* path. (We will keep
both available.)

## Decision

Promote **Compute MIG + Global HTTPS LB** as the production deployment path.
Keep Cloud Run modules in Terraform for cheaper dev environments.

Why MIG:

1. The course requirement explicitly asks for a cluster + LB topology. MIG +
   LB is the literal equivalent of AWS ASG + ALB on GCP. Cloud Run is a
   different architectural pattern (FaaS-style autoscaling).
2. We need to run **eight containers per VM** (nginx + frontend + 6 api-*
   services). Cloud Run is one-container-per-revision; we'd need 8 separate
   services + Cloud Run cannot host the nginx in-VM router. Cloud Run *can*
   host a single multi-container revision (added in 2024) but the spec
   matches a different topology than what we have in `docker-compose.microsvc.yml`.
3. SSH-able VMs make demo debugging straightforward. Cloud Run is opaque.
4. Cost is comparable for our scale: 2 × e2-medium ≈ $40/mo; Cloud Run with
   min_instances=1 to avoid cold starts on a demo is similar.

## Resulting topology

```
Internet → Global HTTPS LB (Google-managed TLS cert)
         → backend-service zestify-microsvc-svc (health check /api/health)
         → MIG zestify-microsvc-mig (regional us-west1)
           ├── VM-A (us-west1-b) — Debian 12 + Docker, 8 containers
           └── VM-B (us-west1-c) — identical stack
                          → Cloud SQL Postgres 16 (Enterprise)
                          → Artifact Registry (8 images)
```

Boot flow: instance template → cloud-init runs `scripts/vm-startup.sh` →
installs Docker → reads metadata for secrets (DB_PASS, JWT_SECRET, STRIPE_SK,
SMTP creds) → emits `/opt/zestify/docker-compose.yml` → `docker compose pull`
+ `docker compose up -d`.

## Consequences

**Positive**
- Matches the AWS-flavored course spec verbatim. Reviewers can map mental
  models 1:1.
- Two VMs running an identical 8-container stack means horizontal redundancy.
  LB health-checks via `/api/health` evict bad VMs.
- Rolling deploys via `gcloud compute instance-groups managed rolling-action
  restart` pull `:latest` from Artifact Registry — zero-downtime.
- nginx-in-VM router gives us full control over `X-Forwarded-*` headers and
  per-path rate limits, which would be harder on Cloud Run.

**Negative**
- More moving parts than Cloud Run. We manage VM disk, Docker, OS patching
  windows. Mitigated by Debian's auto-update + the fact that VMs are
  cattle-not-pets (regenerable from the instance template).
- Cold scale-up of a third VM is ~2-3 minutes (vs. Cloud Run's seconds). Not
  an issue at our traffic level.
- 2 × e2-medium running 24/7 costs ≈ $40/mo even when idle. Cloud Run could
  scale to zero. Acceptable for a demo running through end of semester.

## Cloud Run path (kept as backup)

The Terraform modules `cloud_run_backend` + `cloud_run_frontend` are still in
the repo. To deploy that variant:

```bash
cd terraform/envs/dev
terraform apply -var-file=cloud-run.tfvars
```

This is useful for student-cheap dev environments and for the assessment
matrix that shows we considered both topologies.

## References

- `scripts/vm-startup.sh`
- `terraform/modules/cloud_run_backend/`
- `architecture.md` (deployment diagram)
- `deployment-gcp.md` (runbook)
