const test = require('node:test');
const assert = require('node:assert/strict');
const { strategies, selectStrategy } = require('../../strategies/PaymentStrategy');

test('selectStrategy returns Free when amount is 0', () => {
    const s = selectStrategy(0);
    assert.equal(s, strategies.free);
});

test('selectStrategy returns MockCard for positive amount', () => {
    const s = selectStrategy(25);
    assert.equal(s, strategies.mock_card);
});

test('selectStrategy honors stripe hint when amount > 0', () => {
    const s = selectStrategy(50, 'stripe');
    assert.equal(s, strategies.stripe);
});

test('FreeStrategy.charge returns completed for 0 amount', async () => {
    const r = await strategies.free.charge({ amount: 0 });
    assert.equal(r.status, 'completed');
    assert.equal(r.method, 'free');
});

test('FreeStrategy.charge rejects positive amount', async () => {
    await assert.rejects(() => strategies.free.charge({ amount: 5 }), { statusCode: 400 });
});

test('MockCardStrategy.charge returns mocked tx', async () => {
    const r = await strategies.mock_card.charge({ amount: 50 });
    assert.equal(r.status, 'completed');
    assert.equal(r.method, 'mock_card');
    assert.match(r.txId, /^mock_/);
});

test('MockCardStrategy.charge rejects 0 amount', async () => {
    await assert.rejects(() => strategies.mock_card.charge({ amount: 0 }), { statusCode: 400 });
});

test('StripeStrategy.charge requires paymentIntentId', async () => {
    await assert.rejects(() => strategies.stripe.charge({ amount: 100 }), { statusCode: 400 });
});
