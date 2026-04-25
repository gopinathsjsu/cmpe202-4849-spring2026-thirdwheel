const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransition, assertEventTransition, assertTicketTransition, EVENT_TRANSITIONS, TICKET_TRANSITIONS } = require('../../domain/StateMachine');

test('event pending -> approved is legal', () => {
    assert.equal(canTransition(EVENT_TRANSITIONS, 'pending', 'approved'), true);
});

test('event approved -> approved is illegal', () => {
    assert.equal(canTransition(EVENT_TRANSITIONS, 'approved', 'approved'), false);
});

test('event rejected is terminal', () => {
    for (const target of Object.keys(EVENT_TRANSITIONS)) {
        assert.equal(canTransition(EVENT_TRANSITIONS, 'rejected', target), false);
    }
});

test('event approved -> completed is legal', () => {
    assert.equal(canTransition(EVENT_TRANSITIONS, 'approved', 'completed'), true);
});

test('assertEventTransition throws on illegal', () => {
    assert.throws(() => assertEventTransition('approved', 'pending'), { statusCode: 400 });
});

test('assertEventTransition no-op on legal', () => {
    assert.doesNotThrow(() => assertEventTransition('pending', 'approved'));
});

test('ticket confirmed -> cancelled legal', () => {
    assert.equal(canTransition(TICKET_TRANSITIONS, 'confirmed', 'cancelled'), true);
});

test('ticket cancelled -> any is illegal', () => {
    for (const target of Object.keys(TICKET_TRANSITIONS)) {
        assert.equal(canTransition(TICKET_TRANSITIONS, 'cancelled', target), false);
    }
});

test('assertTicketTransition throws on illegal', () => {
    assert.throws(() => assertTicketTransition('cancelled', 'confirmed'), { statusCode: 400 });
});
