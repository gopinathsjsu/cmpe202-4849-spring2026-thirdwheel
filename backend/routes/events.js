const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const EventService = require('../services/EventService');
const { EventRepository } = require('../repositories/EventRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const { generateCalendarFile } = require('../utils/calendar');

const router = express.Router();

router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const {
        search, category, city, date_from, date_to,
        is_online, is_featured, status = 'approved',
        sort = 'date', order = 'asc',
        page = 1, limit = 12,
    } = req.query;

    const params = {
        search, category, city,
        dateFrom: date_from, dateTo: date_to,
        isOnline: is_online === undefined ? undefined : is_online === 'true',
        isFeatured: is_featured === undefined ? undefined : is_featured === 'true',
        status, sort, order,
        limit: parseInt(limit, 10), offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
    };

    const { events, total } = await EventService.list(params);
    res.json({
        events,
        pagination: {
            total, page: parseInt(page, 10), limit: parseInt(limit, 10),
            totalPages: Math.ceil(total / parseInt(limit, 10)),
        },
    });
}));

router.get('/categories', asyncHandler(async (req, res) => {
    const categories = await CategoryRepository.list();
    res.json({ categories });
}));

router.get('/featured', asyncHandler(async (req, res) => {
    const events = await EventRepository.featured(6);
    res.json({ events });
}));

router.get('/stats', asyncHandler(async (req, res) => {
    const stats = await EventRepository.stats();
    res.json({ stats });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const data = await EventService.findByIdEnriched(req.params.id, req.user?.id);
    if (!data) return res.status(404).json({ error: 'Event not found.' });
    res.json(data);
}));

router.get('/:id/calendar', asyncHandler(async (req, res) => {
    const event = await EventRepository.findByIdRaw(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    const ics = generateCalendarFile(event);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', `attachment; filename="${event.slug}.ics"`);
    res.send(ics);
}));

router.post('/', authenticateToken, requireRole('organizer', 'admin'), validate({
    title: { required: true, type: 'string', minLength: 3, maxLength: 200 },
    description: { required: true, type: 'string', minLength: 10 },
    date: { required: true, type: 'string' },
    time: { required: true, type: 'string' },
    location: { required: true, type: 'string' },
    capacity: { required: true, type: 'number', min: 1 },
}), asyncHandler(async (req, res) => {
    const { event, decision } = await EventService.create({ ...req.body, organizer_id: req.user.id });
    res.status(201).json({
        message: decision.action === 'auto-approve'
            ? 'Event created and auto-approved.'
            : decision.action === 'auto-reject'
                ? 'Event auto-rejected by moderation.'
                : 'Event created. Pending admin approval.',
        decision, event,
    });
}));

router.put('/:id', authenticateToken, requireRole('organizer', 'admin'), asyncHandler(async (req, res) => {
    const updated = await EventService.update(req.params.id, req.body, req.user);
    res.json({ message: 'Event updated.', event: updated });
}));

router.delete('/:id', authenticateToken, requireRole('organizer', 'admin'), asyncHandler(async (req, res) => {
    await EventService.delete(req.params.id, req.user);
    res.json({ message: 'Event deleted.' });
}));

router.get('/:id/attendees', authenticateToken, requireRole('organizer', 'admin'), asyncHandler(async (req, res) => {
    const event = await EventRepository.findByIdRaw(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (req.user.role !== 'admin' && event.organizer_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only view attendees of your own events.' });
    }
    const attendees = await EventRepository.attendees(req.params.id);
    res.json({ event: { id: event.id, title: event.title }, attendees, total: attendees.length });
}));

module.exports = router;
