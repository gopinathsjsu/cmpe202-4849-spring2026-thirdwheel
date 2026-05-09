// Chain of Responsibility: each handler inspects an event and returns
// { action: 'auto-approve' | 'auto-reject' | 'queue', reason }.
// First handler that returns non-'queue' wins. Final fallback queues for admin.

class Handler {
    constructor() { this.next = null; }
    setNext(handler) { this.next = handler; return handler; }
    async handle(ctx) {
        if (this.next) return this.next.handle(ctx);
        return { action: 'queue', reason: 'No handler matched; awaiting admin review.' };
    }
}

class SpamFilterHandler extends Handler {
    async handle(ctx) {
        const t = `${ctx.event.title} ${ctx.event.description}`.toLowerCase();
        const banned = ['lottery', 'crypto giveaway', 'free iphone', 'click here to win'];
        if (banned.some(w => t.includes(w))) {
            return { action: 'auto-reject', reason: 'Flagged as spam by automatic filter.' };
        }
        return super.handle(ctx);
    }
}

class CapacitySanityHandler extends Handler {
    async handle(ctx) {
        if (ctx.event.capacity > 100000) {
            return { action: 'auto-reject', reason: 'Capacity exceeds platform limit.' };
        }
        return super.handle(ctx);
    }
}

class TrustedOrganizerHandler extends Handler {
    constructor(repo) { super(); this.repo = repo; }
    async handle(ctx) {
        const approvedCount = await this.repo.countApprovedByOrganizer(ctx.event.organizer_id);
        if (approvedCount >= 3) {
            return { action: 'auto-approve', reason: 'Trusted organizer (3+ prior approvals).' };
        }
        return super.handle(ctx);
    }
}

function buildPipeline(deps) {
    // TrustedOrganizer auto-approve intentionally disabled — every legitimate
    // event must pass through the admin moderation queue. Class kept for
    // reference; re-enable by inserting back into the chain.
    const spam = new SpamFilterHandler();
    const capacity = new CapacitySanityHandler();
    spam.setNext(capacity).setNext(new Handler());
    return spam;
}

module.exports = { buildPipeline, SpamFilterHandler, CapacitySanityHandler, TrustedOrganizerHandler };
