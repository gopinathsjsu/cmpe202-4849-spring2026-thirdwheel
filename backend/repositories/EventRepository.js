const { query, withTx } = require('../db/pool');

const EVENT_SELECT = `
  e.*,
  c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon, c.color AS category_color,
  u.name AS organizer_name, u.email AS organizer_email, u.avatar AS organizer_avatar, u.bio AS organizer_bio
`;

const FROM_JOINS = `
  FROM events e
  LEFT JOIN categories c ON e.category_id = c.id
  LEFT JOIN users u ON e.organizer_id = u.id
`;

function shape(e) {
    if (!e) return null;
    return {
        ...e,
        is_online: !!e.is_online,
        is_featured: !!e.is_featured,
        schedule: typeof e.schedule === 'string' ? JSON.parse(e.schedule || '[]') : (e.schedule || []),
        spots_left: e.capacity - e.tickets_sold,
    };
}

const EventRepository = {
    async list({ search, category, city, dateFrom, dateTo, isOnline, isFeatured, status, sort, order, limit, offset }) {
        const where = ['e.status = $1'];
        const params = [status];

        if (search) {
            params.push(`%${search}%`);
            where.push(`(e.title ILIKE $${params.length} OR e.description ILIKE $${params.length} OR e.tags ILIKE $${params.length})`);
        }
        if (category) { params.push(category); where.push(`c.slug = $${params.length}`); }
        if (city) { params.push(`%${city}%`); where.push(`e.city ILIKE $${params.length}`); }
        if (dateFrom) { params.push(dateFrom); where.push(`e.date >= $${params.length}`); }
        if (dateTo) { params.push(dateTo); where.push(`e.date <= $${params.length}`); }
        if (isOnline !== undefined) { params.push(isOnline); where.push(`e.is_online = $${params.length}`); }
        if (isFeatured !== undefined) { params.push(isFeatured); where.push(`e.is_featured = $${params.length}`); }

        const w = `WHERE ${where.join(' AND ')}`;
        const validSorts = { date: 'e.date', title: 'e.title', created: 'e.created_at', price: 'e.price' };
        const sortCol = validSorts[sort] || 'e.date';
        const sortOrder = order === 'desc' ? 'DESC' : 'ASC';

        const total = (await query(`SELECT COUNT(*)::int AS total ${FROM_JOINS} ${w}`, params)).rows[0].total;

        params.push(limit, offset);
        const events = (await query(
            `SELECT ${EVENT_SELECT} ${FROM_JOINS} ${w} ORDER BY ${sortCol} ${sortOrder} LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        )).rows.map(shape);

        return { events, total };
    },

    async findById(id) {
        const r = await query(`SELECT ${EVENT_SELECT} ${FROM_JOINS} WHERE e.id = $1`, [id]);
        return shape(r.rows[0]);
    },

    async findByIdRaw(id) {
        const r = await query('SELECT * FROM events WHERE id = $1', [id]);
        return r.rows[0] || null;
    },

    async featured(limit = 6) {
        const r = await query(
            `SELECT ${EVENT_SELECT} ${FROM_JOINS} WHERE e.status = 'approved' AND e.is_featured = TRUE ORDER BY e.date ASC LIMIT $1`,
            [limit]
        );
        return r.rows.map(shape);
    },

    async stats() {
        const totalEvents = (await query("SELECT COUNT(*)::int AS c FROM events WHERE status = 'approved'")).rows[0].c;
        const totalUsers = (await query('SELECT COUNT(*)::int AS c FROM users')).rows[0].c;
        const totalTickets = (await query("SELECT COUNT(*)::int AS c FROM tickets WHERE status = 'confirmed'")).rows[0].c;
        const totalOrganizers = (await query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'organizer'")).rows[0].c;
        return { totalEvents, totalUsers, totalTickets, totalOrganizers };
    },

    async create(data) {
        const slug = (data.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const r = await query(
            `INSERT INTO events (title, slug, description, short_description, date, end_date, time, end_time,
        location, venue_name, address, city, state, zip, latitude, longitude, is_online, online_url,
        capacity, price, image, organizer_id, category_id, status, tags, schedule)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,'pending',$24,$25)
       RETURNING *`,
            [
                data.title, slug, data.description, data.short_description || '', data.date, data.end_date || null,
                data.time, data.end_time || null, data.location, data.venue_name || '', data.address || '',
                data.city || '', data.state || '', data.zip || '', data.latitude ?? null, data.longitude ?? null,
                !!data.is_online, data.online_url || '', data.capacity, data.price || 0, data.image || null,
                data.organizer_id, data.category_id ?? null, data.tags || '',
                typeof data.schedule === 'string' ? data.schedule : JSON.stringify(data.schedule || []),
            ]
        );
        return shape(r.rows[0]);
    },

    async update(id, data) {
        const fields = [];
        const params = [];
        const setIfDefined = (col, val) => {
            if (val === undefined) return;
            params.push(val);
            fields.push(`${col} = $${params.length}`);
        };
        setIfDefined('title', data.title);
        setIfDefined('description', data.description);
        setIfDefined('short_description', data.short_description);
        setIfDefined('date', data.date);
        setIfDefined('end_date', data.end_date);
        setIfDefined('time', data.time);
        setIfDefined('end_time', data.end_time);
        setIfDefined('location', data.location);
        setIfDefined('venue_name', data.venue_name);
        setIfDefined('address', data.address);
        setIfDefined('city', data.city);
        setIfDefined('state', data.state);
        setIfDefined('zip', data.zip);
        setIfDefined('latitude', data.latitude);
        setIfDefined('longitude', data.longitude);
        if (data.is_online !== undefined) setIfDefined('is_online', !!data.is_online);
        setIfDefined('online_url', data.online_url);
        setIfDefined('capacity', data.capacity);
        setIfDefined('price', data.price);
        setIfDefined('category_id', data.category_id);
        setIfDefined('tags', data.tags);
        if (data.schedule !== undefined) {
            params.push(typeof data.schedule === 'string' ? data.schedule : JSON.stringify(data.schedule));
            fields.push(`schedule = $${params.length}`);
        }
        setIfDefined('image', data.image);
        if (!fields.length) return this.findById(id);
        fields.push(`updated_at = NOW()`);
        params.push(id);
        await query(`UPDATE events SET ${fields.join(', ')} WHERE id = $${params.length}`, params);
        return this.findById(id);
    },

    async delete(id) {
        await query('DELETE FROM events WHERE id = $1', [id]);
    },

    async setStatus(id, status) {
        await query('UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
    },

    async incrementSold(id, qty, client) {
        const q = client || { query };
        await q.query('UPDATE events SET tickets_sold = tickets_sold + $1 WHERE id = $2', [qty, id]);
    },

    async decrementSold(id, qty, client) {
        const q = client || { query };
        await q.query('UPDATE events SET tickets_sold = tickets_sold - $1 WHERE id = $2', [qty, id]);
    },

    async listForOrganizer(organizerId, { status, limit, offset }) {
        const where = ['e.organizer_id = $1'];
        const params = [organizerId];
        if (status) { params.push(status); where.push(`e.status = $${params.length}`); }
        const w = `WHERE ${where.join(' AND ')}`;
        const total = (await query(`SELECT COUNT(*)::int AS total FROM events e ${w}`, params)).rows[0].total;
        params.push(limit, offset);
        const events = (await query(
            `SELECT e.*, c.name AS category_name, c.icon AS category_icon,
              (SELECT COUNT(*)::int FROM tickets t WHERE t.event_id = e.id AND t.status = 'confirmed') AS confirmed_tickets
       FROM events e LEFT JOIN categories c ON e.category_id = c.id
       ${w} ORDER BY e.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        )).rows.map(shape);
        return { events, total };
    },

    async listForAdmin({ status, limit, offset }) {
        const where = [];
        const params = [];
        if (status) { params.push(status); where.push(`e.status = $${params.length}`); }
        const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const total = (await query(`SELECT COUNT(*)::int AS total FROM events e ${w}`, params)).rows[0].total;
        params.push(limit, offset);
        const events = (await query(
            `SELECT e.*, u.name AS organizer_name, u.email AS organizer_email, c.name AS category_name
       FROM events e
       LEFT JOIN users u ON e.organizer_id = u.id
       LEFT JOIN categories c ON e.category_id = c.id
       ${w} ORDER BY e.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        )).rows.map(shape);
        return { events, total };
    },

    async organizerStats(organizerId) {
        const totalEvents = (await query('SELECT COUNT(*)::int AS c FROM events WHERE organizer_id = $1', [organizerId])).rows[0].c;
        const approvedEvents = (await query("SELECT COUNT(*)::int AS c FROM events WHERE organizer_id = $1 AND status = 'approved'", [organizerId])).rows[0].c;
        const pendingEvents = (await query("SELECT COUNT(*)::int AS c FROM events WHERE organizer_id = $1 AND status = 'pending'", [organizerId])).rows[0].c;
        const totalAttendees = (await query(
            `SELECT COUNT(*)::int AS c FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE e.organizer_id = $1 AND t.status = 'confirmed'`, [organizerId])).rows[0].c;
        const totalRevenue = (await query(
            `SELECT COALESCE(SUM(t.total_price),0)::float AS total FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE e.organizer_id = $1 AND t.payment_status = 'completed'`, [organizerId])).rows[0].total;
        return { totalEvents, approvedEvents, pendingEvents, totalAttendees, totalRevenue };
    },

    async attendees(eventId) {
        const r = await query(
            `SELECT t.*, u.name, u.email, u.phone, u.avatar
       FROM tickets t JOIN users u ON t.user_id = u.id
       WHERE t.event_id = $1 AND t.status != 'cancelled'
       ORDER BY t.created_at DESC`, [eventId]);
        return r.rows;
    },

    async cancelAllTicketsForEvent(eventId, client) {
        const q = client || { query };
        const r = await q.query(
            `UPDATE tickets SET status = 'cancelled'
       WHERE event_id = $1 AND status != 'cancelled'
       RETURNING *`, [eventId]);
        await q.query(`UPDATE events SET tickets_sold = 0 WHERE id = $1`, [eventId]);
        return r.rows;
    },

    async recomputeTicketsSold(eventId, client) {
        const q = client || { query };
        await q.query(
            `UPDATE events e
         SET tickets_sold = COALESCE((
           SELECT SUM(quantity) FROM tickets t
           WHERE t.event_id = e.id AND t.status = 'confirmed'
         ), 0)
       WHERE id = $1`, [eventId]);
    },

    async findUpcomingNeedingReminder(hoursAhead = 12, windowHours = 1) {
        const r = await query(
            `SELECT * FROM events
       WHERE status = 'approved'
         AND reminder_sent_at IS NULL
         AND (date::timestamp + time::time)
             BETWEEN NOW() + ($1::int || ' hours')::interval - ($2::int || ' hours')::interval
                 AND NOW() + ($1::int || ' hours')::interval + ($2::int || ' hours')::interval`,
            [hoursAhead, windowHours]);
        return r.rows;
    },

    async markReminderSent(eventId) {
        await query('UPDATE events SET reminder_sent_at = NOW() WHERE id = $1', [eventId]);
    },
};

module.exports = { EventRepository, withTx };
