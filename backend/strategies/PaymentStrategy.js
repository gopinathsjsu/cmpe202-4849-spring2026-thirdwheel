// Strategy pattern: pluggable payment processors (Free / MockCard / Stripe).
//
// Stripe verification routes through api-payments microservice via internal HTTP.
// Falls back to direct Stripe SDK call if api-payments URL not configured (monolith mode).

const { retrievePaymentIntent } = require('../adapters/StripeAdapter');

class FreePaymentStrategy {
    async charge({ amount }) {
        if (amount > 0) throw Object.assign(new Error('Free strategy used for paid event'), { statusCode: 400 });
        return { method: 'free', status: 'completed', txId: null };
    }
}

class MockCardPaymentStrategy {
    async charge({ amount }) {
        if (amount <= 0) throw Object.assign(new Error('Mock card requires positive amount'), { statusCode: 400 });
        return { method: 'mock_card', status: 'completed', txId: 'mock_' + Date.now() };
    }
}

class StripePaymentStrategy {
    async charge({ amount, paymentIntentId }) {
        if (!paymentIntentId) {
            throw Object.assign(new Error('Stripe payment requires paymentIntentId'), { statusCode: 400 });
        }
        const intent = await this._fetchIntent(paymentIntentId);
        if (intent.status !== 'succeeded') {
            throw Object.assign(new Error(`Payment not completed (status: ${intent.status})`), { statusCode: 400 });
        }
        const expectedCents = Math.round(amount * 100);
        if (intent.amount !== expectedCents) {
            throw Object.assign(new Error(`Payment amount mismatch (expected ${expectedCents}, got ${intent.amount})`), { statusCode: 400 });
        }
        return { method: 'stripe', status: 'completed', txId: intent.id };
    }

    async _fetchIntent(id) {
        const url = process.env.PAYMENTS_SERVICE_URL;
        const secret = process.env.INTERNAL_SECRET;
        // Microservice mode — call api-payments via internal HTTP.
        if (url && secret) {
            const r = await fetch(`${url}/api/payments/verify/${encodeURIComponent(id)}`, {
                headers: { 'X-Internal-Secret': secret },
            });
            if (!r.ok) {
                const text = await r.text();
                throw Object.assign(new Error(`api-payments verify failed: ${r.status} ${text}`), { statusCode: 502 });
            }
            return r.json();
        }
        // Monolith mode — talk to Stripe directly.
        return retrievePaymentIntent(id);
    }
}

const strategies = {
    free: new FreePaymentStrategy(),
    mock_card: new MockCardPaymentStrategy(),
    stripe: new StripePaymentStrategy(),
};

function selectStrategy(amount, requestedMethod) {
    if (amount <= 0) return strategies.free;
    if (requestedMethod === 'stripe') return strategies.stripe;
    return strategies.mock_card;
}

module.exports = { strategies, selectStrategy };
