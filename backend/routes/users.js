const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../middleware/asyncHandler');
const { EventRepository } = require('../repositories/EventRepository');

const router = express.Router();

router.get('/me/events', authenticateToken, requireRole('organizer', 'admin'), asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const { events, total } = await EventRepository.listForOrganizer(req.user.id, {
        status, limit: limitNum, offset: (pageNum - 1) * limitNum,
    });
    res.json({
        events,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
}));

router.get('/me/stats', authenticateToken, requireRole('organizer', 'admin'), asyncHandler(async (req, res) => {
    const stats = await EventRepository.organizerStats(req.user.id);
    res.json({ stats });
}));

module.exports = router;
