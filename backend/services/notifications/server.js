// api-notifications — list/mark notifications + 12h reminder cron.

const { createApp, listen } = require('../../shared/server-base');
const reminderLoop = require('./reminderLoop');

const app = createApp({ name: 'api-notifications' });
app.use('/api/notifications', require('./routes'));

// Manual trigger endpoint for reminder loop (admin-only via header check).
app.post('/api/notifications/_trigger-reminder', (req, res) => {
    if (req.headers['x-internal-secret'] !== process.env.INTERNAL_SECRET) {
        return res.status(401).json({ error: 'unauthorized' });
    }
    reminderLoop.tick().catch(() => {});
    res.json({ message: 'reminder tick triggered' });
});

reminderLoop.start();
listen(app, parseInt(process.env.PORT || '5004', 10));
