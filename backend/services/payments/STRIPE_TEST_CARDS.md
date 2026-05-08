# Stripe Test Card Cheatsheet

Drop-in card numbers when exercising the Stripe Elements checkout on a paid
event. Use **any future expiry**, **any 3-digit CVC**, **any 5-digit ZIP**.

| Number | Behavior |
|--------|----------|
| `4242 4242 4242 4242` | Succeeds. Default happy-path card for demos. |
| `4000 0027 6000 3184` | Requires 3-D Secure authentication popup (succeeds after confirm). |
| `4000 0000 0000 9995` | Declined — `insufficient_funds`. |
| `4000 0000 0000 0002` | Declined — `card_declined`. |
| `4000 0000 0000 0069` | Declined — `expired_card`. |
| `4000 0000 0000 0127` | Declined — `incorrect_cvc`. |

Server-side smoke (no browser) via the PaymentMethod token shortcut:

```bash
# 1. Create a PaymentIntent from your app.
curl -s -X POST https://34.107.158.154.nip.io/api/payments/intent \
     -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' \
     -d '{"event_id":2,"quantity":1}' | jq

# 2. Confirm it via Stripe API using a test PaymentMethod.
PM=$(curl -s -u "$SK:" -X POST https://api.stripe.com/v1/payment_methods \
     -d type=card -d 'card[token]=tok_visa' | jq -r .id)

curl -s -u "$SK:" -X POST \
     "https://api.stripe.com/v1/payment_intents/$PI_ID/confirm" \
     -d "payment_method=$PM" -d "return_url=http://localhost"
```

## Other token shortcuts (`card[token]=…`)

| Token | Card behavior |
|-------|--------------|
| `tok_visa` | Visa, succeeds |
| `tok_mastercard` | Mastercard, succeeds |
| `tok_amex` | Amex, succeeds |
| `tok_chargeDeclined` | Declined |
| `tok_chargeDeclinedInsufficientFunds` | Declined — insufficient funds |
| `tok_visa_chargeDeclinedExpiredCard` | Declined — expired |

Full reference → <https://stripe.com/docs/testing>
