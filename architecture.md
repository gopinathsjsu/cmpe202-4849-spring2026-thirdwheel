# Zestify — Architecture & Diagrams

UML-style component and deployment diagrams plus sequence diagrams for the key
cross-service flows. All diagrams are written in **Mermaid** so GitHub renders
them natively when you open this file in the browser.

---

## 1. Component Diagram (UML)

Shows the logical components of the system, their responsibilities, and the
dependencies between them. Each box is a deployable Node.js process or a static
web bundle.

```mermaid
flowchart TB

    subgraph Browser["💻 Browser  ‹‹execution environment››"]
        FE["**frontend**\n‹‹component››\nNext.js 16 / React 19\nApp Router pages"]
        SE["**StripeCheckout**\n‹‹component››\nStripe Elements\n(PaymentElement)"]
    end

    subgraph Gateway["🌐 nginx Gateway  ‹‹component››"]
        NG["path router\n/api/auth/* → 5001\n/api/events/* → 5002\n/api/tickets/* → 5003\n/api/notifications/* → 5004\n/api/admin/* → 5005\n/api/payments/* → 5006\n/* → frontend:3000"]
    end

    subgraph Services["⚙️ Microservices  ‹‹execution environment››"]
        AU["**api-auth**\n‹‹component››\nRegister · Login · Me · Profile\nJWT issuer"]
        EV["**api-events**\n‹‹component››\nCRUD · Search · Cancel · Reschedule\nModeration pipeline (CoR)"]
        TK["**api-tickets**\n‹‹component››\nPurchase · Cancel · My-tickets\nTicketingService facade\nPaymentStrategy"]
        PY["**api-payments**\n‹‹component››\nPaymentIntent create / verify\nInternal verify endpoint"]
        NO["**api-notifications**\n‹‹component››\nList · Mark read\n12h reminder cron"]
        AD["**api-admin**\n‹‹component››\nModeration · Stats · Audit log\nUser mgmt"]
    end

    subgraph SharedLib["📦 shared/ library"]
        DB_REPO["Repositories\nUser · Event · Ticket\nCategory · Notification · Admin"]
        ADP["Adapters\nEmail · Cache · Storage · Stripe"]
        DOM["Domain\nStateMachine · DomainEvents bus"]
    end

    subgraph External["☁️ External Systems"]
        DB[("**Postgres 16**\n‹‹database››\nCloud SQL\nzestify-db")]
        STR["**Stripe API**\n‹‹external service››\nTest mode"]
        SMTP["**Gmail SMTP**\n‹‹external service››\nsmtp.gmail.com:587"]
    end

    %% Browser → Gateway
    FE -->|"HTTPS"| NG
    SE -->|"HTTPS"| NG

    %% Gateway → Services
    NG --> AU
    NG --> EV
    NG --> TK
    NG --> PY
    NG --> NO
    NG --> AD

    %% Cross-service (internal HTTP)
    TK -.->|"X-Internal-Secret"| PY

    %% Services → shared lib (logical)
    AU -.-> SharedLib
    EV -.-> SharedLib
    TK -.-> SharedLib
    PY -.-> SharedLib
    NO -.-> SharedLib
    AD -.-> SharedLib

    %% Shared lib → DB & adapters
    DB_REPO --> DB
    ADP --> SMTP
    PY --> STR
    SE -->|"confirmPayment()"| STR

    classDef component fill:#e0e7ff,stroke:#4f46e5,color:#1e1b4b
    classDef db fill:#dcfce7,stroke:#15803d
    classDef ext fill:#fef3c7,stroke:#d97706
    class FE,SE,NG,AU,EV,TK,PY,NO,AD component
    class DB db
    class STR,SMTP ext
```

### Component responsibilities

| Component | Owner | Responsibility |
|-----------|-------|----------------|
| **frontend** | Nihar + Soham | Next.js 16 App Router — all user-facing pages |
| **StripeCheckout** | Nihar | Stripe Elements widget on event detail page |
| **nginx** | Kalhar | In-VM path router, lazy DNS resolution to upstreams |
| **api-auth** | Soham | Register / login / me / profile · JWT issuance |
| **api-events** | Nihar | Event CRUD + search + cancel + reschedule + CoR moderation |
| **api-tickets** | Soham | Ticket purchase / cancel / my-tickets · Facade over PaymentStrategy |
| **api-payments** | Nihar | Stripe SDK wrapper · PaymentIntent create/retrieve · internal verify endpoint |
| **api-notifications** | Kalhar | List + mark-read · 12h-before reminder cron loop |
| **api-admin** | Kalhar | Moderation queue · stats · audit log · user management |
| **shared/** | All 3 | Cross-cutting repositories + adapters + domain (state machine + event bus) |

---

## 2. Deployment Diagram (UML)

Shows the physical deployment topology — GCP resources, VM nodes, and the
containers running on each.

```mermaid
flowchart TB

    subgraph Client["🌍 Client"]
        BR["‹‹device››\nBrowser\n(any modern UA)"]
    end

    subgraph GCP["☁️ GCP project: healthy-mender-491009-b4 · region: us-west1"]

        subgraph LBStack["🛡️ Global HTTPS Load Balancer"]
            IP["‹‹artifact››\nStatic IP\nzestify-ip\n34.107.158.154"]
            FWD443["‹‹component››\nForwarding Rule\nzestify-https-fwd:443"]
            FWD80["‹‹component››\nForwarding Rule\nzestify-fwd:80"]
            TPROXY["‹‹component››\ntarget-https-proxy\nzestify-https-proxy"]
            CERT["‹‹artifact››\nGoogle-managed cert\nzestify-cert\nCN=34.107.158.154.nip.io"]
            URLMAP["‹‹component››\nurl-map\nzestify-lb"]
            BES["‹‹component››\nbackend-service\nzestify-microsvc-svc"]
            HC["‹‹artifact››\nHealth Check\n/api/health on :80"]
        end

        subgraph MIG["📦 MIG zestify-microsvc-mig (regional, 2 instances)"]
            subgraph VMA["‹‹device›› VM zestify-microsvc-A (us-west1-b)"]
                OSA["‹‹execution environment››\nDebian 12 + Docker 24"]
                DCA["‹‹artifact››\ndocker-compose.yml\n(8 containers)"]
                OSA --> DCA
                DCA --> NGA["nginx:microsvc"]
                DCA --> FEA["frontend:latest"]
                DCA --> AUA["api-auth:latest"]
                DCA --> EVA["api-events:latest"]
                DCA --> TKA["api-tickets:latest"]
                DCA --> PYA["api-payments:latest"]
                DCA --> NOA["api-notifications:latest"]
                DCA --> ADA["api-admin:latest"]
            end
            subgraph VMB["‹‹device›› VM zestify-microsvc-B (us-west1-c)"]
                OSB["‹‹execution environment››\nDebian 12 + Docker 24\n(identical 8-container stack)"]
            end
        end

        TMPL["‹‹artifact››\nInstance Template\nzestify-microsvc-tmpl-v3\n(metadata: SMTP, Stripe SK, JWT, INTERNAL)"]
        STARTUP["‹‹artifact››\nVM Startup Script\nscripts/vm-startup.sh"]

        SQL[("‹‹device››\nCloud SQL Postgres 16\nzestify-db\n(Enterprise edition)")]

        subgraph AR["📦 Artifact Registry"]
            AR_REPO["‹‹artifact››\nrepo: zestify\n8 images × :latest tag"]
        end

        SECRETS["‹‹artifact››\nGCP Secret Manager\n(future ZST-041)"]
        FW["‹‹component››\nVPC Firewall\nzestify-allow-lb-80\n(130.211.0.0/22, 35.191.0.0/16)"]
    end

    subgraph ExtSvc["☁️ External Services"]
        STRIPE["‹‹external service››\nstripe.com"]
        GMAIL["‹‹external service››\nsmtp.gmail.com:587"]
        AR_REGISTRY["us-west1-docker.pkg.dev"]
    end

    %% Traffic flow
    BR -->|"HTTPS :443"| IP
    BR -.->|"HTTP :80 (legacy)"| IP
    IP --> FWD443
    IP --> FWD80
    FWD443 --> TPROXY
    TPROXY --> CERT
    TPROXY --> URLMAP
    FWD80 --> URLMAP
    URLMAP --> BES
    BES --> HC
    BES -->|"round-robin"| VMA
    BES --> VMB

    %% VM provisioning
    TMPL --> STARTUP
    TMPL --> MIG
    STARTUP -.->|"docker compose pull"| AR_REPO

    %% Container → DB
    TKA -->|"5432"| SQL
    EVA --> SQL
    AUA --> SQL
    PYA --> SQL
    NOA --> SQL
    ADA --> SQL

    %% Container → External
    PYA --> STRIPE
    TKA --> GMAIL
    EVA --> GMAIL
    NOA --> GMAIL
    ADA --> GMAIL

    classDef gcp fill:#e0f2fe,stroke:#0369a1
    classDef vm fill:#fef9c3,stroke:#a16207
    classDef ext fill:#fce7f3,stroke:#be185d
    class IP,FWD443,FWD80,TPROXY,CERT,URLMAP,BES,HC,TMPL,STARTUP,AR_REPO,SECRETS,FW gcp
    class OSA,OSB,DCA,NGA,FEA,AUA,EVA,TKA,PYA,NOA,ADA vm
    class STRIPE,GMAIL,AR_REGISTRY ext
```

### Physical resources

| Tier | Resource | Spec | Notes |
|------|----------|------|-------|
| LB | Global HTTPS LB | 2 forwarding rules (80 + 443) | Static IP `zestify-ip` |
| SSL | Managed certificate | Google Trust Services WR3 | Auto-renewed every 90 days |
| Compute | MIG (regional us-west1) | 2 × **e2-medium**, 2 vCPU / 4 GB | Auto-heal + rolling-replace |
| VM OS | Debian 12 (bookworm) | Docker 24 + docker-compose-plugin | Bootstrap via startup script |
| DB | Cloud SQL Postgres 16 | **Enterprise** edition · authorized networks | Single zone for cost |
| Registry | Artifact Registry | `zestify` repo · 8 image tags | `:latest` re-pushed every CI run |
| Network | VPC firewall | Port 80 from Google LB ranges | `130.211.0.0/22`, `35.191.0.0/16` |
| Secrets | VM metadata (server-only) | DB_HOST/PASS, JWT, STRIPE_SK, SMTP creds | ZST-041 will migrate to Secret Manager |

---

## 3. Sequence Diagrams (key flows)

### 3.1 Free ticket purchase

```mermaid
sequenceDiagram
    actor U as Attendee
    participant N as nginx
    participant T as api-tickets
    participant DB as Postgres
    participant BUS as Domain Bus
    participant SMTP as Gmail SMTP

    U->>N: POST /api/tickets {event_id, qty}
    N->>T: forward (+ JWT)
    T->>DB: SELECT event WHERE id=?
    T->>DB: SELECT active ticket WHERE user+event
    DB-->>T: none
    T->>T: selectStrategy(price=0) → FreeStrategy
    T->>T: FreeStrategy.charge() → completed
    T->>DB: BEGIN TX
    T->>DB: INSERT tickets (code, user, event, status='confirmed')
    T->>DB: UPDATE events SET tickets_sold = tickets_sold + qty
    T->>DB: INSERT notification (ticket_confirmation)
    T->>DB: INSERT notification (organizer)
    T->>DB: COMMIT
    T-->>BUS: emit TICKET_PURCHASED
    T-->>U: 201 {ticket}
    BUS->>SMTP: ticketConfirmationEmail (with Maps link)
```

### 3.2 Paid ticket purchase via Stripe (cross-service)

```mermaid
sequenceDiagram
    actor U as Attendee
    participant FE as Frontend
    participant N as nginx
    participant P as api-payments
    participant T as api-tickets
    participant STR as Stripe API
    participant DB as Postgres

    U->>FE: Click "Get Tickets $X"
    FE->>N: POST /api/payments/intent
    N->>P: forward
    P->>STR: paymentIntents.create({amount})
    STR-->>P: pi_xxx + clientSecret
    P-->>FE: {clientSecret, paymentIntentId}
    FE->>FE: mount <PaymentElement>
    U->>FE: enter card 4242 ... → Pay
    FE->>STR: stripe.confirmPayment({elements, clientSecret})
    STR-->>FE: pi_xxx status=succeeded
    FE->>N: POST /api/tickets {event_id, qty, payment_intent_id}
    N->>T: forward
    T->>P: GET /internal/payments/:pi (X-Internal-Secret)
    P->>STR: paymentIntents.retrieve(pi_xxx)
    STR-->>P: status=succeeded, amount=X
    P-->>T: {status:'succeeded', amount:X}
    T->>DB: INSERT tickets (...)
    T->>DB: UPDATE tickets_sold
    T-->>U: 201 {ticket}
```

### 3.3 Event cancellation (organizer or admin)

```mermaid
sequenceDiagram
    actor O as Organizer/Admin
    participant N as nginx
    participant E as api-events
    participant DB as Postgres
    participant BUS as Domain Bus
    participant SMTP as Gmail SMTP

    O->>N: POST /api/events/:id/cancel {reason}
    N->>E: forward (+ JWT, role check)
    E->>DB: SELECT event WHERE id=?
    E->>DB: SELECT attendees (snapshot BEFORE cancel)
    DB-->>E: [{user_id, name, email}, …]
    E->>DB: UPDATE events SET status='cancelled'
    E->>DB: UPDATE tickets SET status='cancelled' WHERE event_id=?
    E->>DB: invalidate cache (event:id + events:list:*)
    E-->>BUS: emit EVENT_CANCELLED {event, attendees, reason}
    E-->>O: 200 {attendeesNotified, ticketsCancelled}
    loop For each attendee
        BUS->>DB: INSERT notification (event_cancelled)
        BUS->>SMTP: eventCancelledEmail (with Maps link)
    end
```

### 3.4 12-hour reminder cron

```mermaid
sequenceDiagram
    participant CRON as reminderLoop (api-notifications)
    participant DB as Postgres
    participant SMTP as Gmail SMTP

    Note over CRON: Fires every 300s
    CRON->>DB: SELECT events WHERE status='approved'\n  AND reminder_sent_at IS NULL\n  AND (date+time) BETWEEN NOW()+11h AND NOW()+13h
    DB-->>CRON: [event, ...]
    loop For each upcoming event
        CRON->>DB: SELECT attendees
        loop For each attendee
            CRON->>DB: INSERT notification (event_reminder)
            CRON->>SMTP: eventReminderEmail (with Maps link, hoursUntil=12)
        end
        CRON->>DB: UPDATE events SET reminder_sent_at = NOW()
    end
```

### 3.5 Domain event flow (Observer pattern)

```mermaid
flowchart LR
    P["api-* service"] -->|"emitDomain(TICKET_PURCHASED, {...})"| BUS{{"DomainEventBus\n(EventEmitter)"}}
    BUS --> O1["ticketsObserver\n→ email confirm"]
    BUS --> O2["adminObserver\n→ audit log"]
    BUS --> O3["eventsObserver\n→ cancel/reschedule emails"]
    BUS --> O4["organizer notification"]

    classDef bus fill:#fde68a,stroke:#a16207
    class BUS bus
```

---

## 4. Database ER (entity relationships)

```mermaid
erDiagram
    USERS ||--o{ EVENTS : "organizes"
    USERS ||--o{ TICKETS : "buys"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ ADMIN_ACTIONS : "performs"
    EVENTS ||--o{ TICKETS : "has"
    CATEGORIES ||--o{ EVENTS : "classifies"

    USERS {
        int id PK
        text name
        text email UK
        text password
        text role "attendee|organizer|admin"
        timestamptz created_at
    }
    EVENTS {
        int id PK
        text title
        text slug
        text date
        text time
        text location
        int capacity
        int tickets_sold
        double price
        int organizer_id FK
        int category_id FK
        text status "pending|approved|rejected|cancelled|completed"
        timestamptz reminder_sent_at
    }
    TICKETS {
        int id PK
        text ticket_code UK "10-char unique"
        int user_id FK
        int event_id FK
        int quantity
        text status "confirmed|cancelled|attended|refunded"
        text payment_method "free|mock_card|stripe"
        text payment_status
    }
    NOTIFICATIONS {
        int id PK
        int user_id FK
        text type "ticket_confirmation|event_cancelled|event_reminder|..."
        text title
        text message
        text link
        boolean is_read
    }
    CATEGORIES {
        int id PK
        text name
        text slug UK
        text icon
        text color
    }
    ADMIN_ACTIONS {
        int id PK
        int admin_id FK
        text action
        text target_type "event|user"
        int target_id
        text reason
    }
```

Partial unique index `uniq_active_ticket ON tickets(user_id, event_id) WHERE status != 'cancelled'`
lets a user cancel + repurchase the same event without UNIQUE conflict (ZST-019).

---

## 5. Design Pattern Map

```mermaid
classDiagram
    class TicketingService {
        +purchase()
        +cancel()
        -selectStrategy()
    }
    class PaymentStrategy {
        <<interface>>
        +charge(amount, paymentIntentId)
    }
    class FreeStrategy { +charge() }
    class MockCardStrategy { +charge() }
    class StripeStrategy { +charge() }
    class EventRepository {
        +findById()
        +list()
        +cancelAllTicketsForEvent()
        +findUpcomingNeedingReminder()
    }
    class ModerationPipeline {
        +handle(event)
        -spam()
        -capacity()
        -trusted()
    }
    class StateMachine {
        +assertEventTransition()
        +assertTicketTransition()
    }
    class DomainEventBus {
        +emit()
        +on()
    }
    class EmailAdapter {
        +sendEmail()
        +ticketConfirmation()
        +eventCancelled()
        +eventReschedule()
        +eventReminder()
    }
    class CacheAdapter {
        <<interface>>
        +get() +set() +del()
    }
    class InMemoryLRU { }
    class RedisCache { }

    PaymentStrategy <|-- FreeStrategy : Strategy
    PaymentStrategy <|-- MockCardStrategy : Strategy
    PaymentStrategy <|-- StripeStrategy : Strategy
    TicketingService --> PaymentStrategy : Strategy
    TicketingService --> EventRepository : Repository
    TicketingService --> StateMachine : State
    TicketingService --> DomainEventBus : Observer
    TicketingService --> EmailAdapter : Adapter
    ModerationPipeline : Chain of Responsibility
    TicketingService : Facade
    CacheAdapter <|-- InMemoryLRU : Adapter
    CacheAdapter <|-- RedisCache : Adapter
```

Patterns used:

| Pattern | Where |
|---------|-------|
| **Repository** | `shared/repositories/*Repository.js` — encapsulates Postgres access per aggregate |
| **Strategy** | `services/tickets/strategy.js` — Free / MockCard / Stripe selected at runtime |
| **Facade** | `services/tickets/service.js` — `TicketingService.purchase()` hides 5 sub-steps |
| **Observer** | `shared/domain/DomainEvents.js` — in-process bus over Node's `EventEmitter` |
| **Chain of Responsibility** | `services/events/moderation.js` — Spam → Capacity → TrustedOrganizer |
| **State** | `shared/domain/StateMachine.js` — legal-transition assertions |
| **Adapter** | `shared/adapters/{Email,Cache,Storage,Stripe}Adapter.js` — pluggable backends |
| **Template Method** | `shared/adapters/EmailAdapter.js` — common HTML skeleton, per-event subject + body |
