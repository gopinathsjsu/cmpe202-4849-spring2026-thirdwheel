const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { EventRepository } = require('../repositories/EventRepository');
const { createPaymentIntent, retrievePaymentIntent } = require('../adapters/StripeAdapter');

const router = express.Router();

// POST /api/payments/intent — create a Stripe PaymentIntent for an event ticket
router.post('/intent', authenticateToken, validate({
    event_id: { required: true, type: 'number' },
    quantity: { required: false, type: 'number', min: 1, max: 10 },
}), asyncHandler(async (req, res) => {
    const { event_id, quantity = 1 } = req.body;

    const event = await EventRepository.findByIdRaw(event_id);
    if (!event || event.status !== 'approved') {
        return res.status(404).json({ error: 'Event not found or not available.' });
    }
    if ((event.price || 0) <= 0) {
        return res.status(400).json({ error: 'Event is free; no payment required.' });
    }
    const spotsLeft = event.capacity - event.tickets_sold;
    if (quantity > spotsLeft) {
        return res.status(400).json({ error: `Only ${spotsLeft} spots remaining.` });
    }

    const total = event.price * quantity;
    const intent = await createPaymentIntent({
        amountCents: Math.round(total * 100),
        currency: (event.currency || 'usd').toLowerCase(),
        metadata: {
            event_id: String(event_id),
            user_id: String(req.user.id),
            quantity: String(quantity),
        },
    });

    res.json({
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.id,
        amount: total,
        currency: event.currency || 'USD',
    });
}));

// GET /api/payments/verify/:id — internal endpoint called by api-tickets to verify a PaymentIntent
// Auth: shared INTERNAL_SECRET header (X-Internal-Secret) so external clients can't drain Stripe API.
router.get('/verify/:id', asyncHandler(async (req, res) => {
    const expected = process.env.INTERNAL_SECRET;
    if (!expected || req.get('X-Internal-Secret') !== expected) {
        return res.status(401).json({ error: 'Internal auth required.' });
    }
    const intent = await retrievePaymentIntent(req.params.id);
    res.json({
        id: intent.id,
        status: intent.status,
        amount: intent.amount,
        currency: intent.currency,
        metadata: intent.metadata,
    });
}));

module.exports = router;
