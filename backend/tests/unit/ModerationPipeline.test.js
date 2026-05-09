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

// TrustedOrganizer auto-approve is intentionally disabled in the chain;
// every clean event must hit the admin queue. The handler class is kept
// for reference but is no longer wired in buildPipeline.
test('clean event is queued for admin review (no auto-approve)', async () => {
    const p = buildPipeline(fakeTrustedRepo(99));
    const r = await p.handle({ event: { title: 'Brand New Meetup', description: 'a regular meetup description', capacity: 50, organizer_id: 9 } });
    assert.equal(r.action, 'queue');
});

test('pipeline order: spam still beats clean queue', async () => {
    const p = buildPipeline(fakeTrustedRepo(99));
    const r = await p.handle({ event: { title: 'lottery winner', description: 'sign up free iphone', capacity: 50, organizer_id: 1 } });
    assert.equal(r.action, 'auto-reject');
});
