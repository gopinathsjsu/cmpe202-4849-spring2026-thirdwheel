// Adapter: Stripe SDK wrapper. Reads STRIPE_SECRET_KEY from env (never commit secrets).

const Stripe = require('stripe');

let client = null;

function getClient() {
    if (client) return client;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        const err = new Error('STRIPE_SECRET_KEY not configured');
        err.statusCode = 500;
        throw err;
    }
    client = new Stripe(key, { apiVersion: '2024-06-20' });
    return client;
}

async function createPaymentIntent({ amountCents, currency = 'usd', metadata = {} }) {
    const intent = await getClient().paymentIntents.create({
        amount: amountCents,
        currency,
        automatic_payment_methods: { enabled: true },
        metadata,
    });
    return { id: intent.id, clientSecret: intent.client_secret, status: intent.status };
}

async function retrievePaymentIntent(id) {
    return getClient().paymentIntents.retrieve(id);
}

module.exports = { createPaymentIntent, retrievePaymentIntent, getClient };
