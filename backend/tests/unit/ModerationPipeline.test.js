const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPipeline } = require('../../services/ModerationPipeline');

const fakeTrustedRepo = (count) => ({ countApprovedByOrganizer: async () => count });

test('spam handler auto-rejects banned phrases', async () => {
    const p = buildPipeline(fakeTrustedRepo(0));
    const r = await p.handle({ event: { title: 'Free iPhone', description: 'click here to win', capacity: 100, organizer_id: 1 } });
    assert.equal(r.action, 'auto-reject');
    assert.match(r.reason, /spam/i);
});

test('capacity sanity rejects > 100k', async () => {
    const p = buildPipeline(fakeTrustedRepo(0));
    const r = await p.handle({ event: { title: 'Mega', description: 'normal description text', capacity: 200000, organizer_id: 1 } });
    assert.equal(r.action, 'auto-reject');
    assert.match(r.reason, /capacity/i);
});

test('trusted organizer auto-approves when >= 3 prior approvals', async () => {
    const p = buildPipeline(fakeTrustedRepo(3));
    const r = await p.handle({ event: { title: 'Normal Meetup', description: 'a regular meetup', capacity: 50, organizer_id: 7 } });
    assert.equal(r.action, 'auto-approve');
});

test('untrusted organizer is queued for admin', async () => {
    const p = buildPipeline(fakeTrustedRepo(0));
    const r = await p.handle({ event: { title: 'Brand New Meetup', description: 'a regular meetup description', capacity: 50, organizer_id: 9 } });
    assert.equal(r.action, 'queue');
});

test('pipeline order: spam beats trust', async () => {
    const p = buildPipeline(fakeTrustedRepo(99));
    const r = await p.handle({ event: { title: 'lottery winner', description: 'sign up free iphone', capacity: 50, organizer_id: 1 } });
    assert.equal(r.action, 'auto-reject');
});
