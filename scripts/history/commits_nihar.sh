#!/usr/bin/env bash
# Nihar's commits — Public events vertical + Frontend deploy + Tests + CI.
# Pages: /, /events, /events/[id], /events/create

source "$(dirname "$0")/_lib.sh"
ensure_snapshot
ensure_git_identity

echo "==> Replaying Nihar's commits"

# === W01 (Feb 15-21) — bootstrap ===
c_inline "2026-02-15T09:30:00" "chore: initialize repo with team project README skeleton" README.md <<'EOF'
# Zestify

CMPE 202 Spring 2026 — Team Project.

Eventbrite-like event management platform.

## Team
- Nihar Patel
- Soham Patel
- Kalhar Patel
EOF
c "2026-02-15T09:35:00" "chore: standard .gitignore for node + next + env files" .gitignore

# Frontend scaffold — early version w/o @stripe deps. Stripe lands later (Soham Apr 23).
c_strip "2026-02-18T19:20:00" "chore(frontend): scaffold Next.js 16 + React 19 — package.json" \
    frontend/package.json '/@stripe/d'
c "2026-02-18T19:25:00" "chore(frontend): scaffold lockfile + base config files" \
    frontend/package-lock.json frontend/.gitignore frontend/next.config.mjs frontend/jsconfig.json frontend/README.md frontend/.dockerignore

# === W02 (Feb 22-28) — domain ===
c "2026-02-26T14:30:00" "feat(domain): event + ticket state machines (legal-transition assertions)" \
    backend/domain/StateMachine.js

# === W03 (Mar 1-7) — categories ===
c "2026-03-03T18:00:00" "feat(repo): category repository for catalog browsing" \
    backend/repositories/CategoryRepository.js

# === W04 (Mar 8-14) — events repo + calendar ===
c "2026-03-10T15:30:00" "feat(repo): event repository with filters / pagination / counts" \
    backend/repositories/EventRepository.js
c "2026-03-12T15:00:00" "feat(utils): Google Calendar URL + ICS calendar file generator" \
    backend/utils/calendar.js

# === W05 (Mar 15-21) — events route + service ===
c "2026-03-17T11:45:00" "feat(api): events routes — list, search, detail, CRUD, attendees" \
    backend/routes/events.js
c "2026-03-19T17:00:00" "feat(service): EventService orchestrating CRUD + lifecycle + cache invalidation" \
    backend/services/EventService.js

# === W06 (Mar 22-28) — moderation ===
c "2026-03-24T13:30:00" "feat(service): moderation pipeline (Chain of Responsibility)" \
    backend/services/ModerationPipeline.js

# === W07 (Mar 29-Apr 4) — frontend landing ===
c "2026-04-01T16:00:00" "feat(frontend): landing page with featured events + hero" \
    frontend/src/app/page.js frontend/src/app/page.module.css frontend/src/app/home.css frontend/src/app/favicon.ico
c "2026-04-03T11:30:00" "feat(frontend): EventCard reusable component + public assets" \
    frontend/src/components/EventCard.js frontend/src/components/EventCard.css \
    frontend/public/file.svg frontend/public/globe.svg frontend/public/next.svg frontend/public/vercel.svg frontend/public/window.svg

# === W08 (Apr 5-11) — events list ===
c "2026-04-09T17:30:00" "feat(frontend): events listing page with filters/search/categories" \
    frontend/src/app/events/page.js frontend/src/app/events/events.css

# === W09 (Apr 12-18) — event detail + organizer routes ===
# Event detail page — early version w/o StripeCheckout integration. Stripe lands later (Soham Apr 23).
c_inline "2026-04-15T14:00:00" "feat(frontend): event detail page with OpenStreetMap embed + Google Calendar link" \
    "frontend/src/app/events/[id]/page.js" <<'EOF'
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { events as eventsApi, tickets as ticketsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import './event-detail.css';

export default function EventDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const toast = useToast();
    const [event, setEvent] = useState(null);
    const [hasTicket, setHasTicket] = useState(false);
    const [userTicket, setUserTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        eventsApi.get(id).then(data => {
            setEvent(data.event);
            setHasTicket(data.hasTicket);
            setUserTicket(data.userTicket);
        }).catch(() => toast.error('Event not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleRegister = async () => {
        if (!user) { router.push('/login'); return; }
        setTicketLoading(true);
        try {
            await ticketsApi.purchase({ event_id: event.id, quantity });
            toast.success('Ticket confirmed');
            setHasTicket(true);
            setShowTicketModal(false);
            const data = await eventsApi.get(id);
            setEvent(data.event);
            setUserTicket(data.userTicket);
        } catch (err) {
            toast.error(err.error || 'Registration failed');
        } finally {
            setTicketLoading(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: 60 }}>Loading…</div>;
    if (!event) return <div className="container" style={{ padding: 60 }}>Event not found.</div>;

    const isFree = !event.price || event.price === 0;
    const spotsLeft = event.capacity - event.tickets_sold;

    return (
        <div className="event-detail">
            <div className="container">
                <h1>{event.title}</h1>
                <p>{event.description}</p>
                {event.latitude && event.longitude && !event.is_online && (
                    <iframe
                        title="map"
                        width="100%" height="300" frameBorder="0" scrolling="no"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${event.longitude - 0.01},${event.latitude - 0.01},${event.longitude + 0.01},${event.latitude + 0.01}&layer=mapnik&marker=${event.latitude},${event.longitude}`}
                    ></iframe>
                )}
                <a href={event.google_calendar_url} target="_blank" rel="noreferrer">Add to Google Calendar</a>
                <a href={`/api/events/${event.id}/calendar`}>Download .ics</a>
                <button className="btn btn-primary" onClick={() => setShowTicketModal(true)} disabled={hasTicket || spotsLeft <= 0}>
                    {hasTicket ? 'You have a ticket' : isFree ? 'Get Ticket' : `Buy Ticket — $${event.price}`}
                </button>
            </div>
            {showTicketModal && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <div className="modal-header"><h3>Confirm Registration</h3></div>
                        <div className="modal-body">
                            <p>{event.title}</p>
                            <select className="form-select" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))}>
                                {[1,2,3,4,5].filter(n => n <= spotsLeft).map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <p>Total: {isFree ? 'FREE' : `$${(event.price * quantity).toFixed(2)}`}</p>
                            {!isFree && <p>This is a mock payment — no real charges will be made.</p>}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowTicketModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleRegister} disabled={ticketLoading}>
                                {ticketLoading ? 'Processing…' : 'Confirm Registration'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
EOF
c "2026-04-15T14:05:00" "style(frontend): event detail page styles" \
    "frontend/src/app/events/[id]/event-detail.css"
# === W10 (Apr 19-25) — event create ===
c "2026-04-21T10:30:00" "feat(frontend): event creation page (organizer)" \
    frontend/src/app/events/create/page.js frontend/src/app/events/create/create-event.css

# === W11 (Apr 26-May 3) — tests + CI + GCP ===
c "2026-04-25T11:00:00" "test(unit): StateMachine — legal/illegal transitions" \
    backend/tests/unit/StateMachine.test.js
c "2026-04-26T13:45:00" "test(unit): ModerationPipeline — handler order + auto-approve/reject" \
    backend/tests/unit/ModerationPipeline.test.js
c "2026-04-27T11:00:00" "ci: Jenkinsfile pipeline (install / lint / unit / build / integration / smoke / GCP deploy)" \
    Jenkinsfile
c "2026-04-29T11:00:00" "ci: jenkins-in-docker setup + ci-local helper" \
    jenkins/docker-compose.jenkins.yml jenkins/README.md scripts/ci-local.sh
c "2026-04-30T17:30:00" "infra(tf): root module — providers + project APIs" \
    terraform/main.tf
c "2026-05-01T10:00:00" "infra(tf): artifact_registry module (Docker repo)" \
    terraform/modules/artifact_registry/main.tf
c "2026-05-01T14:30:00" "infra(tf): cloud_run_frontend module (Next.js standalone)" \
    terraform/modules/cloud_run_frontend/main.tf
c "2026-05-02T14:30:00" "infra(deploy): deploy.sh orchestrator (build → push → terraform apply)" \
    scripts/deploy.sh
c "2026-05-02T17:00:00" "docs(deploy): GCP deployment guide (Compute MIG + HTTPS LB + Cloud SQL)" \
    docs/deployment-gcp.md
c_append "2026-05-03T13:00:00" "docs(readme): deployment section (docker compose + image notes + GCP link)" README.md <<'EOF'

## Deployment
- Local: `docker compose up -d` (full stack)
- Backend image: `zestify-backend` (Node 20 slim, healthcheck `/healthz`)
- Frontend image: `zestify-frontend` (Next.js standalone)
- Postgres 16 with named volume
- Cloud (GCP): Compute Engine MIG + Global HTTPS Load Balancer + Cloud SQL — see [docs/deployment-gcp.md](docs/deployment-gcp.md)
EOF

echo "==> Nihar's commits done."
