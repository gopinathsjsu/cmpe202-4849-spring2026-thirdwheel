# Jenkins setup for Zestify

## One-command Jenkins (Docker)

```bash
cd jenkins
docker compose -f docker-compose.jenkins.yml up -d
# wait ~30s, fetch admin password (only needed if setup wizard ever ran):
docker exec zestify-jenkins cat /var/jenkins_home/secrets/initialAdminPassword 2>/dev/null || echo "Setup wizard disabled; create user via /signup"
```

Open http://localhost:8080.

## Required plugins

Install via *Manage Jenkins → Plugins*:

- Pipeline (workflow-aggregator)
- Git
- Pipeline: Multibranch
- AnsiColor
- Timestamper
- Docker Pipeline (optional, for advanced docker steps)

## Tools available inside the Jenkins container

The image already has `git`, `curl`, `bash`. We additionally need:

- **Node 20+** — Jenkinsfile runs `npm ci` and `node --test`. Install once:

  ```bash
  docker exec -u root zestify-jenkins bash -c '
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs python3
  '
  ```

- **Docker CLI** — already mounted via socket; install client:

  ```bash
  docker exec -u root zestify-jenkins bash -c '
    apt-get update && apt-get install -y docker.io docker-compose-plugin
  '
  ```

## Create the pipeline job

1. *New Item → Pipeline*, name `zestify-main`.
2. **Build Triggers** → *Poll SCM* `H/2 * * * *` (or hook a GitHub webhook to `/github-webhook/`).
3. **Pipeline** → *Pipeline script from SCM*:
   - SCM: Git
   - Repository URL: `<your repo url>`
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`
4. *Save → Build Now*.

## What runs on every push

| Stage | Command | Purpose |
|---|---|---|
| Install | `npm ci` (backend, frontend) | Reproducible deps |
| Lint | `next lint` | Catch JS issues |
| Unit | `npm run test:unit` | Strategy / state machine / CoR / validate (28 tests) |
| Build images | `docker compose build` | Reproducible artifacts |
| Bring up stack | `compose up -d postgres → seed → backend → frontend`, wait for `/readyz` | Realistic environment |
| Integration | `TEST_API_URL=... npm run test:integration` | 21 HTTP + DB tests |
| Smoke | `scripts/smoke.sh` | End-to-end black-box checks |
| Publish | `docker tag/push` (main only) | Release artifacts (set `REGISTRY` env in job) |
| Post | dump `compose-logs.txt`, tear down | Always cleans up |

## Local pipeline dry-run

Before pushing:

```bash
./scripts/ci-local.sh
```

Runs the same stages on your laptop — same scripts as Jenkins.
