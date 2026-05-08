# terraform/modules/cloud_run_frontend

Provisions a Cloud Run service running the Next.js standalone frontend image.

## Inputs

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `project_id` | string | — | GCP project |
| `region` | string | `us-west1` | Cloud Run region |
| `image` | string | — | Full image URI (e.g. `us-west1-docker.pkg.dev/<proj>/zestify/frontend:latest`) |
| `next_public_api_url` | string | `/api` | API base URL baked into the bundle |
| `next_public_stripe_pk` | string | — | Stripe publishable key (test mode) |
| `min_instances` | number | `0` | Scale-to-zero by default |
| `max_instances` | number | `10` | Autoscale ceiling |

## Outputs

| Output | Description |
|--------|-------------|
| `service_url` | Public Cloud Run URL |
| `service_name` | Resource name for downstream IAM bindings |

## Usage

```hcl
module "frontend" {
  source                = "../../modules/cloud_run_frontend"
  project_id            = var.project_id
  region                = var.region
  image                 = "us-west1-docker.pkg.dev/${var.project_id}/zestify/frontend:latest"
  next_public_stripe_pk = var.stripe_publishable_key
}
```

## Notes

- The frontend is **public** — ingress allows unauthenticated traffic.
- `NEXT_PUBLIC_*` env vars must be set at **build** time (Docker `ARG`), not
  Cloud Run runtime — these get inlined into the JS bundle.
- For the production path we use Compute MIG instead; this module is kept for
  the cheaper Cloud Run dev environment.
