// api-events microservice — events list/detail/CRUD/categories/calendar/featured/stats.

const { createApp, listen } = require('../../shared/server-base');
const { registerObservers } = require('./observers');

const app = createApp({ name: 'api-events' });
app.use('/api/events', require('./routes'));

registerObservers();
listen(app, parseInt(process.env.PORT || '5002', 10));
