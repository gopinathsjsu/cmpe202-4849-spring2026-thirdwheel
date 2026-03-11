const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const asyncHandler = require('../middleware/asyncHandler');
const { EventRepository } = require('../repositories/EventRepository');
const UserRepository = require('../repositories/UserRepository');
const AdminRepository = require('../repositories/AdminRepository');
const EventService = require('../services/EventService');

const router = express.Router();

router.get('/events', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const { events, total } = await EventRepository.listForAdmin({
        status, limit: limitNum, offset: (pageNum - 1) * limitNum,
    });
    res.json({
        events,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
}));

router.put('/events/:id/approve', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    await EventService.approve(req.params.id, req.user.id, req.body.reason || '');
    res.json({ message: 'Event approved.' });
}));

router.put('/events/:id/reject', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    await EventService.reject(req.params.id, req.user.id, req.body.reason || '');
    res.json({ message: 'Event rejected.' });
}));

router.get('/users', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const { role, search, page = 1, limit = 20 } = req.query;
    const limitNum = parseInt(limit, 10);
    const pageNum = parseInt(page, 10);
    const { users, total } = await UserRepository.listForAdmin({
        role, search, limit: limitNum, offset: (pageNum - 1) * limitNum,
    });
    const enriched = await Promise.all(users.map(async u => ({
        ...u,
        eventCount: await UserRepository.countEventsByOrganizer(u.id),
        ticketCount: await UserRepository.countTicketsByUser(u.id),
    })));
    res.json({
        users: enriched,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
}));

router.put('/users/:id/role', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!['attendee', 'organizer', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role.' });
    }
    const user = await UserRepository.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    await UserRepository.setRole(req.params.id, role);
    await AdminRepository.logAction({
        adminId: req.user.id, action: `change_role_to_${role}`,
        targetType: 'user', targetId: req.params.id, reason: req.body.reason || '',
    });
    res.json({ message: `User role changed to ${role}.` });
}));

router.put('/users/:id/toggle', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const user = await UserRepository.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.id === req.user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    const newStatus = !user.is_active;
    await UserRepository.setActive(req.params.id, newStatus);
    await AdminRepository.logAction({
        adminId: req.user.id, action: newStatus ? 'activate' : 'deactivate',
        targetType: 'user', targetId: req.params.id, reason: req.body.reason || '',
    });
    res.json({ message: `User ${newStatus ? 'activated' : 'deactivated'}.` });
}));

router.get('/stats', authenticateToken, requireRole('admin'), asyncHandler(async (req, res) => {
    const stats = await AdminRepository.stats();
    res.json({ stats });
}));

module.exports = router;
