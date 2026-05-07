# api-payments

Microservice wrapping the Stripe SDK and exposing two endpoints — one public
(`/intent`) for the frontend, one internal (`X-Internal-Secret` gated) for
api-tickets to verify a PaymentIntent before issuing a ticket.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payments/intent` | JWT | Create Stripe PaymentIntent for a paid event |
| GET  | `/internal/payments/:pi` | `X-Internal-Secret` header | Retrieve PI status (used by api-tickets) |

## Environment

```
STRIPE_SECRET_KEY=sk_test_...
INTERNAL_SECRET=internal-zestify-2026
```

## Cross-service trust

The `X-Internal-Secret` header is the only thing protecting `/internal/payments/:pi`.
Both `api-tickets` and `api-payments` read the same `INTERNAL_SECRET` env var
(injected via VM metadata). VPC traffic stays inside Docker's `zestify` network
on a single VM, so the secret never leaves the host.

## Patterns

- **Adapter** — `shared/adapters/StripeAdapter.js` hides the Stripe SDK
- **Strategy** (consumer-side) — `services/tickets/strategy.js` picks `StripePaymentStrategy` when `paymentMethodHint === 'stripe'` and calls back into this service

Port: **5006**
