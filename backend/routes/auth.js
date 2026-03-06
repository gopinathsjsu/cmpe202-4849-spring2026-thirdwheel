const express = require('express');
const bcrypt = require('bcryptjs');
const UserRepository = require('../repositories/UserRepository');
const { authenticateToken, generateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const asyncHandler = require('../middleware/asyncHandler');
const { emitDomain, Events } = require('../domain/DomainEvents');

const router = express.Router();

router.post('/register', validate({
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string', minLength: 6 },
    role: { required: false, type: 'string', enum: ['attendee', 'organizer'] },
}), asyncHandler(async (req, res) => {
    const { name, email, password, role = 'attendee', bio = '', phone = '' } = req.body;
    const existing = await UserRepository.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const hashed = bcrypt.hashSync(password, 10);
    const user = await UserRepository.create({ name, email, password: hashed, role, bio, phone });
    const token = generateToken(user);
    emitDomain(Events.USER_REGISTERED, { user });
    res.status(201).json({ message: 'Account created successfully.', token, user });
}));

router.post('/login', validate({
    email: { required: true, type: 'email' },
    password: { required: true, type: 'string' },
}), asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await UserRepository.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    if (!user.is_active) return res.status(403).json({ error: 'Your account has been deactivated.' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid email or password.' });
    const token = generateToken(user);
    const { password: _, ...safeUser } = user;
    res.json({ message: 'Login successful.', token, user: safeUser });
}));

router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
    const user = await UserRepository.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
}));

router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
    const { name, bio, phone } = req.body;
    const user = await UserRepository.updateProfile(req.user.id, { name, bio, phone });
    res.json({ message: 'Profile updated.', user });
}));

module.exports = router;
