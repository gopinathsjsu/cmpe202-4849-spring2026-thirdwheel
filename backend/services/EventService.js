const { EventRepository } = require('../repositories/EventRepository');
const { query } = require('../db/pool');
const { buildPipeline } = require('./ModerationPipeline');
const { assertEventTransition } = require('../domain/StateMachine');
const { emitDomain, Events } = require('../domain/DomainEvents');
const { getCache } = require('../adapters/CacheAdapter');
const { generateGoogleCalendarUrl } = require('../utils/calendar');

const moderationDeps = {
    countApprovedByOrganizer: async (organizerId) => {
        const r = await query("SELECT COUNT(*)::int AS c FROM events WHERE organizer_id = $1 AND status = 'approved'", [organizerId]);
        return r.rows[0].c;
    },
};

const pipeline = buildPipeline(moderationDeps);

const EventService = {
    async list(params) {
        const cache = getCache();
        const key = 'events:list:' + JSON.stringify(params);
        const cached = await cache.get(key);
        if (cached) return cached;
        const result = await EventRepository.list(params);
        await cache.set(key, result, 15_000);
        return result;
    },

    async findByIdEnriched(id, requestingUserId) {
        const cache = getCache();
        const cached = await cache.get(`event:${id}`);
        const event = cached || await EventRepository.findById(id);
        if (!event) return null;
        if (!cached) await cache.set(`event:${id}`, event, 30_000);

        let hasTicket = false, userTicket = null;
        if (requestingUserId) {
            const r = await query("SELECT * FROM tickets WHERE user_id = $1 AND event_id = $2 AND status != 'cancelled'", [requestingUserId, id]);
            userTicket = r.rows[0] || null;
            hasTicket = !!userTicket;
        }
        return {
            event: { ...event, google_calendar_url: generateGoogleCalendarUrl(event) },
            hasTicket,
            userTicket,
        };
    },

    async create(data) {
        const event = await EventRepository.create(data);
        const decision = await pipeline.handle({ event });
        if (decision.action === 'auto-approve') {
            await EventRepository.setStatus(event.id, 'approved');
            event.status = 'approved';
            emitDomain(Events.EVENT_APPROVED, { event, autoApproved: true, reason: decision.reason });
        } else if (decision.action === 'auto-reject') {
            await EventRepository.setStatus(event.id, 'rejected');
            event.status = 'rejected';
            emitDomain(Events.EVENT_REJECTED, { event, autoRejected: true, reason: decision.reason });
        } else {
            emitDomain(Events.EVENT_CREATED, { event });
        }
        getCache().del('events:list:').catch(() => {});
        return { event, decision };
    },

    async update(id, data, user) {
        const existing = await EventRepository.findByIdRaw(id);
        if (!existing) throw Object.assign(new Error('Event not found.'), { statusCode: 404 });
        if (user.role !== 'admin' && existing.organizer_id !== user.id) {
            throw Object.assign(new Error('You can only edit your own events.'), { statusCode: 403 });
        }
        const updated = await EventRepository.update(id, data);
        getCache().del(`event:${id}`).catch(() => {});
        getCache().del('events:list:').catch(() => {});
        return updated;
    },

    async delete(id, user) {
        const existing = await EventRepository.findByIdRaw(id);
        if (!existing) throw Object.assign(new Error('Event not found.'), { statusCode: 404 });
        if (user.role !== 'admin' && existing.organizer_id !== user.id) {
            throw Object.assign(new Error('You can only delete your own events.'), { statusCode: 403 });
        }
        await EventRepository.delete(id);
        getCache().del(`event:${id}`).catch(() => {});
        getCache().del('events:list:').catch(() => {});
    },

    async approve(id, adminId, reason = '') {
        const existing = await EventRepository.findByIdRaw(id);
        if (!existing) throw Object.assign(new Error('Event not found.'), { statusCode: 404 });
        assertEventTransition(existing.status, 'approved');
        await EventRepository.setStatus(id, 'approved');
        const updated = await EventRepository.findByIdRaw(id);
        emitDomain(Events.EVENT_APPROVED, { event: updated, adminId, reason });
        getCache().del(`event:${id}`).catch(() => {});
        getCache().del('events:list:').catch(() => {});
        return updated;
    },

    async reject(id, adminId, reason = '') {
        const existing = await EventRepository.findByIdRaw(id);
        if (!existing) throw Object.assign(new Error('Event not found.'), { statusCode: 404 });
        assertEventTransition(existing.status, 'rejected');
        await EventRepository.setStatus(id, 'rejected');
        const updated = await EventRepository.findByIdRaw(id);
        emitDomain(Events.EVENT_REJECTED, { event: updated, adminId, reason });
        getCache().del(`event:${id}`).catch(() => {});
        return updated;
    },
};

module.exports = EventService;
