# nginx — in-VM path router

This nginx container sits in front of the eight microservice containers on
each Compute Engine VM. It is the single entry point exposed on port 80 (and
therefore the only container the Global HTTPS LB connects to).

Its only job: route `/api/<svc>/*` to the right upstream container and route
everything else to the frontend.

## File map

| File | Purpose |
|------|---------|
| `nginx.microsvc.conf` | Production config — bundled into the image |
| `Dockerfile` | Slim nginx:alpine image with the config copied in |

## Routing table

```nginx
location /api/auth          { set $upstream http://api-auth:5001;          proxy_pass $upstream; }
location /api/events        { set $upstream http://api-events:5002;        proxy_pass $upstream; }
location /api/tickets       { set $upstream http://api-tickets:5003;       proxy_pass $upstream; }
location /api/payments      { set $upstream http://api-payments:5006;      proxy_pass $upstream; }
location /api/notifications { set $upstream http://api-notifications:5004; proxy_pass $upstream; }
location /api/admin         { set $upstream http://api-admin:5005;         proxy_pass $upstream; }
location /api/users         { set $upstream http://api-admin:5005;         proxy_pass $upstream; }
location /                  { set $upstream http://frontend:3000;          proxy_pass $upstream; }
```

The `set $upstream` indirection forces nginx to resolve the upstream hostname
at **request time** instead of at config-load time. Combined with:

```nginx
resolver 127.0.0.11 ipv6=off valid=10s;
```

…this means a restarted backend container (new internal IP) is picked up by
nginx within 10 seconds without a reload. `127.0.0.11` is Docker's embedded
DNS server.

Without this trick, nginx caches the first IP returned for `api-events` at
config-load time. When the api-events container restarts and gets a new
internal IP, nginx silently keeps proxying to the dead one and returns 502
forever.

## Health endpoint

```nginx
location /api/health {
    set $upstream http://api-events:5002/healthz;
    proxy_pass $upstream;
}
```

Why route the LB health-check through `api-events`? Because `api-events` is
the most likely service to be wedged (it's the one with the heaviest read
path). If `api-events` is down, the VM should be marked unhealthy and pulled
out of the LB rotation. Static `return 200;` would mask real outages.

## Headers we set

```nginx
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_http_version 1.1;
proxy_set_header Connection "";
```

`X-Forwarded-For` is set so `express-rate-limit` running inside each backend
container sees the real client IP instead of the Docker bridge (172.18.0.x).
The corresponding `app.set('trust proxy', true)` in `shared/server-base.js`
makes Express honor it.

## Timeouts

```nginx
proxy_connect_timeout 5s;
proxy_send_timeout    60s;
proxy_read_timeout    60s;
```

Long enough for Stripe `PaymentIntent.confirm()` round-trips through the
internal verify endpoint, short enough to free up worker slots on stuck calls.

## Gzip

```nginx
gzip on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

Hits cleanly for our JSON-heavy API responses; the `/api/events` list endpoint
typically compresses ~75%.

## Why nginx + Docker DNS over Cloud Load Balancing per service?

We could have used a Google Cloud HTTP(S) Load Balancer with multiple
backend services (one per microservice) instead of running nginx ourselves.
We chose in-VM nginx because:

1. **Single LB resource** in GCP. Per-service LB would mean 6 + frontend + nginx
   backend-services + 6 url-map path rules. Higher cost, more moving parts.
2. **Co-located services** mean nginx → container traffic stays on the Docker
   bridge (no network hop). Tail-latency of in-process LB is sub-millisecond.
3. **Easy local dev parity.** Same `nginx.microsvc.conf` runs identically in
   `docker-compose.microsvc.yml` for local development. No "works on cloud,
   broken locally" failures.

## Building + pushing

```bash
docker buildx build --platform linux/amd64 \
  -t us-west1-docker.pkg.dev/healthy-mender-491009-b4/zestify/nginx:microsvc \
  --push ./nginx
```

The image tag `:microsvc` is referenced in `scripts/vm-startup.sh`'s generated
`docker-compose.yml`. Every VM pulls this exact tag on boot.

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| All `/api/*` return 502 | Backend containers not started yet (boot-order race). Wait 30s. |
| Random `/api/*` 502s after a service restart | DNS caching — verify `resolver 127.0.0.11 valid=10s` is in the config. |
| Frontend loads but assets 404 | nginx fallback `location /` rule missing or misordered. Specific `location /api/*` rules must come **before** the catch-all. |
| `X-Forwarded-For` is loopback | `app.set('trust proxy', true)` not set in `shared/server-base.js`. |
