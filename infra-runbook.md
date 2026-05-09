# Infrastructure Runbook

Incident response playbook for the live Zestify deployment. Read this when
something's broken in production. Every section starts with **symptoms** so
you can find the right playbook fast.

> Live URL: https://34.107.158.154.nip.io
> Project: `healthy-mender-491009-b4`
> Region: `us-west1`

---

## 0. Common diagnostic commands

```bash
# MIG instance health.
gcloud compute instance-groups managed list-instances zestify-microsvc-mig \
  --region=us-west1

# LB backend health.
gcloud compute backend-services get-health zestify-microsvc-svc --global

# Cloud SQL status.
gcloud sql instances describe zestify-db --format='value(state)'

# SSL cert state.
gcloud compute ssl-certificates describe zestify-cert --global \
  --format='value(managed.status,managed.domainStatus)'

# Recent serial logs from a VM (boot debugging).
gcloud compute instances get-serial-port-output zestify-microsvc-A \
  --zone=us-west1-b | tail -200

# SSH into a VM + inspect containers.
gcloud compute ssh zestify-microsvc-A --zone=us-west1-b
sudo docker compose -f /opt/zestify/docker-compose.yml ps
sudo docker compose -f /opt/zestify/docker-compose.yml logs api-events --tail=200
```

---

## 1. Symptom — HTTPS curl hangs / `SSL_ERROR_SYSCALL`

**Likely cause:** Cert just turned ACTIVE but the proxy hasn't picked up the
new chain yet. Or the cert is still PROVISIONING.

```bash
# 1. Confirm cert status.
gcloud compute ssl-certificates describe zestify-cert --global \
  --format='value(managed.status,managed.domainStatus)'

# Expected: ACTIVE  ACTIVE
# If PROVISIONING, wait 5-15 min — Google validates the domain via the LB IP.

# 2. Force a curl with verbose handshake to see the failure.
curl -vvI https://34.107.158.154.nip.io 2>&1 | head -40

# 3. If still failing after 30 min, recreate the proxy binding.
gcloud compute target-https-proxies update zestify-https-proxy \
  --ssl-certificates=zestify-cert
```

**Edge case:** `nip.io` resolves to a stale IP if you migrated the LB to a new
address. Verify the domain resolves to the same IP printed by
`gcloud compute addresses describe zestify-ip --global --format='value(address)'`.

---

## 2. Symptom — `502 Bad Gateway` from LB

**Likely cause:** Both VMs failing the LB health check. The LB has no healthy
backend so it returns 502.

```bash
# 1. Check backend health.
gcloud compute backend-services get-health zestify-microsvc-svc --global

# Look for "healthState": "UNHEALTHY" on both VMs.

# 2. SSH into one VM and check the nginx container.
gcloud compute ssh zestify-microsvc-A --zone=us-west1-b
sudo docker compose -f /opt/zestify/docker-compose.yml ps
# Look for nginx EXITED or Restarting.

# 3. If nginx is fine, check the api-events container (which serves /api/health).
sudo docker compose -f /opt/zestify/docker-compose.yml logs api-events --tail=80
# Common: Postgres connection refused → see §3.

# 4. Last resort — recreate the VMs.
gcloud compute instance-groups managed rolling-action replace \
  zestify-microsvc-mig --region=us-west1 --max-unavailable=3
```

**False positive:** If only one VM is unhealthy, the LB still routes around
it; you'll get 200s on most requests. Restart that VM only:

```bash
gcloud compute instance-groups managed recreate-instances zestify-microsvc-mig \
  --instances=zestify-microsvc-A --region=us-west1
```

---

## 3. Symptom — `/readyz` returns 503 / DB unreachable

**Cause hierarchy** (most → least common):

1. Cloud SQL stopped (cost-saving auto-stop, manual stop).
2. Authorized networks misconfigured (your dev IP changed, VM IP rotated).
3. Cloud SQL in maintenance window.
4. Network firewall rule deleted.

```bash
# 1. Cloud SQL state.
gcloud sql instances describe zestify-db --format='value(state)'
# Expected: RUNNABLE  (if STOPPED → start it)
gcloud sql instances patch zestify-db --activation-policy=ALWAYS

# 2. Authorized networks include the VM's external IPs?
gcloud sql instances describe zestify-db \
  --format='value(settings.ipConfiguration.authorizedNetworks[].value)'

# 3. Check the VMs' external IPs match.
gcloud compute instances list --filter='name~zestify-microsvc' \
  --format='value(name,networkInterfaces[0].accessConfigs[0].natIP)'

# 4. Add missing IP.
gcloud sql instances patch zestify-db \
  --authorized-networks="$EXISTING_IPS,$NEW_VM_IP"
```

> **Long-term fix:** ZST-041 — migrate to Cloud SQL Auth Proxy + IAM-based DB
> auth so VM IP rotations don't require schema-side changes.

---

## 4. Symptom — Stripe payment fails with "Element not mounted"

**Cause:** Frontend was built with a missing or dummy
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` build arg. The Stripe SDK constructs an
empty Elements instance that never mounts a PaymentElement.

```bash
# 1. Verify the publishable key is baked into the JS bundle.
curl -s https://34.107.158.154.nip.io/events/2 -o /tmp/p.html
for c in $(grep -oE '/_next/static/chunks/[^"]+\.js' /tmp/p.html | sort -u); do
  curl -s "https://34.107.158.154.nip.io$c" 2>/dev/null | \
    grep -oE 'pk_test_51[A-Za-z0-9]{20}' | head -1
done
# Should print a 20+ char pk_test_... — if empty, image was built with placeholder.

# 2. Rebuild + push the frontend with the real key.
docker buildx build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_API_URL=/api \
  --build-arg "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REAL" \
  -t us-west1-docker.pkg.dev/healthy-mender-491009-b4/zestify/frontend:latest \
  --push ./frontend

# 3. Rolling-replace VMs to pull the new image.
gcloud compute instance-groups managed rolling-action replace \
  zestify-microsvc-mig --region=us-west1
```

**Subtle gotcha:** `NEXT_PUBLIC_*` env vars must be set at **build** time, not
runtime. Setting them in the VM instance template after the image is built has
no effect on the bundled JS.

---

## 5. Symptom — Emails not arriving for attendees

**Diagnostic order:**

```bash
# 1. Was the email actually attempted? Check observer logs.
gcloud compute ssh zestify-microsvc-A --zone=us-west1-b
sudo docker compose -f /opt/zestify/docker-compose.yml logs api-events --tail=80 | grep observer
# Expect: [observer] EVENT_CANCELLED done: notif=2/2 email=2/2

# If email=0/N → SMTP rejected. If notif=0/N → DB insert failed (see §6).

# 2. Inspect for SMTP errors.
sudo docker compose -f /opt/zestify/docker-compose.yml logs api-events api-tickets api-notifications --tail=300 | \
  grep -iE "SMTP send failed|EAUTH|535|nodemail"

# 3. Common SMTP failures.
#    "535-5.7.8 Username and Password not accepted" → Gmail rejected app password.
#        Regenerate at https://myaccount.google.com/apppasswords + update VM metadata.
#    "Connection timeout" → Gmail blocked the egress IP. Switch to SendGrid or
#        a real transactional provider.

# 4. Verify env vars are set inside containers.
sudo docker compose -f /opt/zestify/docker-compose.yml exec api-tickets env | grep SMTP
# Should show SMTP_HOST, SMTP_USER, SMTP_PASS, EMAIL_FROM.
```

**Recipient-side check:** Gmail can mark our domain as spam after a burst of
sends. If an attendee says no email arrived, check their Spam folder first.

---

## 6. Symptom — Notifications API returns stale unread count

**Cause:** In-memory cache per process. After mark-as-read on one VM, the
unread-count cache on the other VM has not invalidated.

**Quick fix:** the cache TTL is 2 seconds — wait briefly and retry.

**Real fix:** ZST-043 — migrate the cache to Redis (Memorystore) so both VMs
share state. Adapter is already abstracted in `shared/adapters/CacheAdapter.js`
behind the `REDIS_URL` env var.

---

## 7. Symptom — MIG won't replace VMs / `max-unavailable` error

```
ERROR: maxSurge or maxUnavailable must be >= number of zones
```

**Cause:** Regional MIG spans 3 zones (us-west1-a, b, c). The
`max-unavailable` parameter must be ≥ 3 for a regional MIG, even though we
only run 2 instances.

```bash
gcloud compute instance-groups managed rolling-action replace \
  zestify-microsvc-mig --region=us-west1 --max-unavailable=3
```

Always pass `--max-unavailable=3` for regional MIGs, period.

---

## 8. Symptom — CI/CD build-and-push job fails on `google-github-actions/auth`

```
##[error]google-github-actions/auth failed with: the GitHub Action workflow
must specify exactly one of "workload_identity_provider" or "credentials_json"!
```

**Cause:** Push happened to a repo that doesn't have the `GCP_SA_KEY` secret
configured (e.g. a course-mirror fork).

**Fix:** Already handled — `.github/workflows/ci.yml` gates the deploy jobs on
`github.repository == 'Nihar4/202_final_test'`. Mirror repos run unit +
integration tests only and skip deploy cleanly.

If the canonical repo loses its secret somehow, regenerate:

```bash
# 1. Create a fresh JSON key for the gha-deployer SA.
gcloud iam service-accounts keys create gha-deployer-key.json \
  --iam-account=gha-deployer@healthy-mender-491009-b4.iam.gserviceaccount.com

# 2. Paste the contents into GitHub repo settings → Secrets → GCP_SA_KEY.
# 3. Delete the local file.
rm gha-deployer-key.json

# 4. Re-trigger CI by pushing an empty commit.
git commit --allow-empty -m "ci: re-run after rotating GCP_SA_KEY"
git push
```

---

## 9. Symptom — Spots-left counter stuck after a cancel

**Cause:** TX rolled back without decrementing `events.tickets_sold`. Should
be impossible with the current code (decrement is in the same `withTx` block
as the status update) but if it happens manually:

```sql
-- Recompute tickets_sold from actual active rows.
UPDATE events e
SET tickets_sold = (
  SELECT COALESCE(SUM(quantity), 0) FROM tickets
  WHERE event_id = e.id AND status = 'confirmed'
);
```

---

## 10. Symptom — Reminder cron sends duplicate emails

**Cause:** `reminder_sent_at` not set after a successful send (e.g. process
crashed between the email loop and the `markReminderSent` call).

```sql
-- Manually mark events as reminded to suppress further sends.
UPDATE events
SET reminder_sent_at = NOW()
WHERE id IN (1, 2, 3);  -- list of affected event ids
```

**Long-term fix:** ZST-044 — replace the in-process loop with Cloud Scheduler
→ Pub/Sub → a dedicated reminder worker with idempotency keys.

---

## 11. Symptom — Login throttle too aggressive in demo

Soham's per-email throttle blocks at 5 failed logins in 5 minutes. During
demos with multiple TAs hammering the login form, this can trip. Disable for
demo windows:

```bash
gcloud compute ssh zestify-microsvc-A --zone=us-west1-b -- \
  "echo 'AUTH_RATE_LIMIT_MAX=99999' | sudo tee -a /opt/zestify/docker-compose.yml"
# (or, more sustainably, set the env var in the instance template metadata).
```

After demo, revert to default.

---

## 12. Recovery — full restore from cold

If Compute, MIG, or LB are wiped:

```bash
# 1. Bring back the LB stack.
gcloud compute addresses create zestify-ip --global --addresses=34.107.158.154
gcloud compute ssl-certificates create zestify-cert \
  --domains=34.107.158.154.nip.io --global

# 2. Recreate the backend service + url-map + proxies.
# (Easier: terraform apply -target=module.lb in terraform/envs/prod.)

# 3. Recreate the instance template + MIG.
gcloud compute instance-templates create zestify-microsvc-tmpl-v3 \
  --machine-type=e2-medium \
  --image-family=debian-12 --image-project=debian-cloud \
  --network=default --tags=zestify,http-server \
  --service-account=$(gcloud compute service-accounts list --filter='name~gha-deployer' --format='value(email)') \
  --scopes=cloud-platform \
  --metadata-from-file=startup-script=scripts/vm-startup.sh \
  --metadata=DB_HOST=...,DB_PASS=...,JWT_SECRET=...,STRIPE_SECRET_KEY=...,INTERNAL_SECRET=...,SMTP_HOST=smtp.gmail.com,SMTP_PORT=587,SMTP_USER=...,SMTP_PASS=...,EMAIL_FROM=...

gcloud compute instance-groups managed create zestify-microsvc-mig \
  --base-instance-name=zestify-microsvc \
  --template=zestify-microsvc-tmpl-v3 \
  --size=2 \
  --region=us-west1

# 4. Wait for boot + health.
until curl -fsS https://34.107.158.154.nip.io/api/health >/dev/null 2>&1; do sleep 10; done
```

Cloud SQL is the only stateful resource — if that goes, restore from automated
backup via `gcloud sql backups restore <BACKUP_ID> --backup-instance=zestify-db`.
