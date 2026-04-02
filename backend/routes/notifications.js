const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const NotificationRepository = require('../repositories/NotificationRepository');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(async (req, res) => {
    const { unread_only, page = 1, limit = 20 } = req.query;
    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const { notifications, total, unread } = await NotificationRepository.listForUser(req.user.id, {
        unreadOnly: unread_only === 'true', limit: limitNum, offset: (pageNum - 1) * limitNum,
    });
    res.json({
        notifications, unreadCount: unread,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
}));

router.put('/read-all', authenticateToken, asyncHandler(async (req, res) => {
    await NotificationRepository.markAllRead(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
}));

router.put('/:id/read', authenticateToken, asyncHandler(async (req, res) => {
    const notif = await NotificationRepository.findByIdForUser(req.params.id, req.user.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found.' });
    await NotificationRepository.markRead(req.params.id);
    res.json({ message: 'Notification marked as read.' });
}));

module.exports = router;
