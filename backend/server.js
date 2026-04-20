const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pino = require('pino');
const pinoHttp = require('pino-http');

const { migrate, ping, close } = require('./db/pool');
const { registerObservers } = require('./observers');
const errorHandler = require('./middleware/errorHandler');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
});

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 5001;

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(compression());
app.use(pinoHttp({ logger }));

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:5001')
    .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
    windowMs: 60_000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10),
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/healthz', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/readyz', async (req, res) => {
    try { await ping(); res.json({ status: 'ready' }); }
    catch (e) { res.status(503).json({ status: 'not ready', error: e.message }); }
});
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' }));

// SERVICE env var picks which routes mount. Same image used 6 times for microservice deployment.
//   all  → mount everything (default — local dev / monolith deploy)
//   auth, events, tickets, payments, notifications, admin → mount only that bundle
const SERVICE = (process.env.SERVICE || 'all').toLowerCase();
const has = (s) => SERVICE === 'all' || SERVICE === s;

if (has('auth'))          app.use('/api/auth',          require('./routes/auth'));
if (has('events'))        app.use('/api/events',        require('./routes/events'));
if (has('tickets'))       app.use('/api/tickets',       require('./routes/tickets'));
if (has('payments'))      app.use('/api/payments',      require('./routes/payments'));
if (has('admin'))         app.use('/api/admin',         require('./routes/admin'));
if (has('admin'))         app.use('/api/users',         require('./routes/users'));
if (has('notifications')) app.use('/api/notifications', require('./routes/notifications'));

logger.info({ SERVICE }, 'mounted routes for service');

app.use((req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use(errorHandler);

async function bootstrap() {
    try {
        await migrate();
        logger.info('DB migrated');
    } catch (e) {
        logger.error({ err: e }, 'DB migrate failed');
        process.exit(1);
    }
    registerObservers();

    const server = app.listen(PORT, '0.0.0.0', () => {
        logger.info(`Zestify API listening on :${PORT}`);
    });

    const shutdown = async (signal) => {
        logger.info(`Received ${signal}, shutting down`);
        server.close(async () => {
            await close();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000).unref();
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) bootstrap();

module.exports = app;
