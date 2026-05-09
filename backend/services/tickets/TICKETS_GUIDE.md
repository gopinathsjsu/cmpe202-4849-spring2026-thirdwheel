# Tickets Service Guide

## Lifecycle

```
                    ┌────────────────┐
                    │   confirmed    │ ← new ticket on POST
                    └───────┬────────┘
              ┌─────────────┼─────────────┐
              ↓             ↓             ↓
        ┌──────────┐  ┌───────────┐  ┌──────────┐
        │cancelled │  │ attended  │  │ refunded │
        └──────────┘  └─────┬─────┘  └────▲─────┘
                             └─────────────┘
```

Status transitions are asserted by `shared/domain/StateMachine.js`. Illegal
moves throw HTTP 400 with `Illegal ticket status transition: <from> -> <to>`.

## Ticket code

10 characters from a 32-letter unambiguous alphabet (no 0, 1, I, L, O):

```js
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function generateTicketCode() {
  let s = '';
  for (let i = 0; i < 10; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
```

Collision probability across 1M tickets ≈ `1M² / (2 × 32^10) ≈ 4.4 × 10^-7`.
UNIQUE constraint in schema plus retry-on-23505 covers the rest.

## Active-ticket dedupe

```sql
CREATE UNIQUE INDEX uniq_active_ticket
  ON tickets (user_id, event_id)
  WHERE status != 'cancelled';
```

User cannot have two confirmed/attended tickets for the same event. Cancelled
rows are excluded from the index → user can buy → cancel → re-buy without
hitting UNIQUE conflict. See [`ADR-0004`](../../../adr/0004-postgres-partial-unique-index.md).

## Cancel flow

```
DELETE /api/tickets/:id
  ↓
TicketRepository.findByIdForUser  (404 if not yours)
  ↓
assertTicketTransition(ticket.status, 'cancelled')  → 400 if illegal
  ↓
withTx:
  UPDATE tickets SET status = 'cancelled' WHERE id = ?
  UPDATE events SET tickets_sold = tickets_sold - quantity WHERE id = event_id
  INSERT INTO notifications (...)
  ↓
cache invalidate event:<id> + events:list:
  ↓
emitDomain(TICKET_CANCELLED, { userId, ticket })
  ↓
200 { message: 'Ticket cancelled successfully.' }
```

Observer side effect: `sendEmail(ticketCancellationEmail)` to the user with a
"Open in Google Maps" link.

## Stripe round-trip

Server-side (no browser) verification recipe:

```bash
SK="sk_test_..."
BASE="https://34.107.158.154.nip.io"

# 1. Login.
TOKEN=$(curl -sS -H 'Content-Type: application/json' \
  -d '{"email":"sohamrajjain0007@gmail.com","password":"password123"}' \
  "$BASE/api/auth/login" | jq -r .token)

# 2. Create PaymentIntent.
PI_ID=$(curl -sS -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"event_id":2,"quantity":1}' "$BASE/api/payments/intent" | jq -r .paymentIntentId)

# 3. Confirm via Stripe with test PaymentMethod.
PM=$(curl -sS -u "$SK:" -X POST https://api.stripe.com/v1/payment_methods \
  -d type=card -d 'card[token]=tok_visa' | jq -r .id)
curl -sS -u "$SK:" -X POST \
  "https://api.stripe.com/v1/payment_intents/$PI_ID/confirm" \
  -d "payment_method=$PM" -d 'return_url=http://localhost' | jq .status

# 4. Purchase ticket — api-tickets calls api-payments internally to verify.
curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"event_id\":2,\"quantity\":1,\"payment_method\":\"stripe\",\"payment_intent_id\":\"$PI_ID\"}" \
  "$BASE/api/tickets"
```

## Refund eligibility

`services/tickets/refundEligibility.js` computes refund tier based on
hours-until-event:

| Hours until event | Refund |
|-------------------|--------|
| ≥ 48 | Full (100%) |
| ≥ 12 | Partial (50%) |
| < 12 | None |

Free tickets always return `{ refund: 'none' }`. Currently informational only
— actual Stripe refund flow is on the backlog (ZST-042).
