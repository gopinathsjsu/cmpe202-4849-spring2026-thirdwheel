const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../../middleware/validate');

function runValidator(schema, body) {
    const mw = validate(schema);
    let response = null;
    let nextCalled = false;
    const req = { body };
    const res = {
        status(code) { this.code = code; return this; },
        json(payload) { response = { code: this.code || 200, payload }; return this; },
    };
    const next = () => { nextCalled = true; };
    mw(req, res, next);
    return { response, nextCalled };
}

test('validate passes when all fields valid', () => {
    const { nextCalled, response } = runValidator(
        { email: { required: true, type: 'email' }, name: { required: true, type: 'string', minLength: 2 } },
        { email: 'a@b.com', name: 'Alice' }
    );
    assert.equal(nextCalled, true);
    assert.equal(response, null);
});

test('validate rejects missing required', () => {
    const { nextCalled, response } = runValidator(
        { email: { required: true, type: 'email' } },
        {}
    );
    assert.equal(nextCalled, false);
    assert.equal(response.code, 400);
    assert.match(response.payload.details[0], /email is required/);
});

test('validate rejects bad email format', () => {
    const { response } = runValidator(
        { email: { required: true, type: 'email' } },
        { email: 'not-an-email' }
    );
    assert.equal(response.code, 400);
});

test('validate enforces enum', () => {
    const { response } = runValidator(
        { role: { type: 'string', enum: ['attendee', 'organizer'] } },
        { role: 'admin' }
    );
    assert.equal(response.code, 400);
});

test('validate enforces number min/max', () => {
    const { response } = runValidator(
        { qty: { type: 'number', min: 1, max: 5 } },
        { qty: 10 }
    );
    assert.equal(response.code, 400);
});

test('validate ok when optional missing', () => {
    const { nextCalled } = runValidator(
        { phone: { type: 'string', minLength: 7 } },
        {}
    );
    assert.equal(nextCalled, true);
});
