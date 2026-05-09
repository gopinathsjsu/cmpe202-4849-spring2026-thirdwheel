# terraform/modules/artifact_registry

Provisions a regional Artifact Registry Docker repository that holds every
container image the cluster pulls.

## Inputs

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `project_id` | string | — | GCP project the repository lives in |
| `region` | string | `us-west1` | Repository region (must match VM region for pull-from-AR latency) |
| `repo_id` | string | `zestify` | Repository name. Final image URI: `<region>-docker.pkg.dev/<project>/<repo_id>/<image>` |
| `description` | string | `"Zestify microservice images"` | Free-form |
| `labels` | map(string) | `{}` | Optional resource labels |

## Outputs

| Output | Description |
|--------|-------------|
| `repository_url` | Fully qualified URL (e.g. `us-west1-docker.pkg.dev/healthy-mender-491009-b4/zestify`) — paste this into `docker tag` |
| `repository_id` | Bare id for use in IAM bindings |

## Usage

```hcl
module "artifact_registry" {
  source     = "../../modules/artifact_registry"
  project_id = var.project_id
  region     = var.region
  repo_id    = "zestify"
}

output "registry_url" {
  value = module.artifact_registry.repository_url
}
```

After `terraform apply`, push the first images:

```bash
gcloud auth configure-docker us-west1-docker.pkg.dev --quiet

REG=$(terraform output -raw registry_url)
docker tag api-auth:latest        $REG/api-auth:latest
docker tag api-events:latest      $REG/api-events:latest
docker tag api-tickets:latest     $REG/api-tickets:latest
docker tag api-payments:latest    $REG/api-payments:latest
docker tag api-notifications:latest $REG/api-notifications:latest
docker tag api-admin:latest       $REG/api-admin:latest
docker tag nginx:microsvc         $REG/nginx:microsvc
docker tag frontend:latest        $REG/frontend:latest

for img in api-auth api-events api-tickets api-payments api-notifications api-admin nginx frontend; do
  docker push $REG/$img:latest
done
```

## IAM

The module does **not** grant any IAM on the repository — keep that in
`modules/iam` so all bindings live in one place. Two roles you'll need to
attach:

| Principal | Role | Why |
|-----------|------|-----|
| Default Compute SA on the VMs | `roles/artifactregistry.reader` | VMs `docker pull` on boot |
| `gha-deployer` SA | `roles/artifactregistry.writer` | GitHub Actions `docker push` |

## Cleanup

```bash
# Empty + delete the repo.
gcloud artifacts repositories delete zestify \
  --location=us-west1 --quiet
```

Deletion is irreversible — Cloud Storage backing is wiped immediately. Use
the `keep_count` lifecycle policy (not in this module yet — ZST-046 idea) to
retain the last N versions before purging.

## Cost notes

Storage: $0.10/GB/month. Each image layer dedupes — pushing the same Node 20
base layer across 6 services adds ~80 MB total, not 6 × 80 MB. Total repo
size for our 8 images: ≈ 250 MB → < $0.03/month.

Egress: free within the same region. Pulls from VMs in `us-west1` to AR in
`us-west1` are free.
