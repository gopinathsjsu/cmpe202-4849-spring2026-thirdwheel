// Strategy pattern: pluggable payment processors

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
    async charge() {
        throw Object.assign(new Error('Stripe integration not enabled'), { statusCode: 501 });
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
