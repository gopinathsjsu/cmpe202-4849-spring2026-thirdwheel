const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const TicketingService = require('../services/TicketingService');
const TicketRepository = require('../repositories/TicketRepository');

const router = express.Router();

router.post('/', authenticateToken, validate({
    event_id: { required: true, type: 'number' },
    quantity: { required: false, type: 'number', min: 1, max: 10 },
}), asyncHandler(async (req, res) => {
    const { event_id, quantity = 1, payment_method } = req.body;
    const ticket = await TicketingService.purchase({
        userId: req.user.id, eventId: event_id, quantity,
        paymentMethodHint: payment_method,
    });
    res.status(201).json({ message: 'Ticket confirmed!', ticket });
}));

router.get('/my', authenticateToken, asyncHandler(async (req, res) => {
    const tickets = await TicketRepository.listByUser(req.user.id);
    res.json({ tickets });
}));

router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
    await TicketingService.cancel({ userId: req.user.id, ticketId: req.params.id });
    res.json({ message: 'Ticket cancelled successfully.' });
}));

module.exports = router;
