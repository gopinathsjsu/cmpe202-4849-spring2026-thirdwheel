const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let pool;

function buildConfig() {
    if (process.env.DATABASE_URL) {
        return { connectionString: process.env.DATABASE_URL, max: parseInt(process.env.PG_POOL_MAX || '10', 10) };
    }
    if (process.env.INSTANCE_UNIX_SOCKET) {
        return {
            host: process.env.INSTANCE_UNIX_SOCKET,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            max: parseInt(process.env.PG_POOL_MAX || '10', 10),
        };
    }
    return {
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432', 10),
        user: process.env.PGUSER || 'zestify',
        password: process.env.PGPASSWORD || 'zestify',
        database: process.env.PGDATABASE || 'zestify',
        max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    };
}

function getPool() {
    if (!pool) {
        pool = new Pool(buildConfig());
        pool.on('error', (err) => console.error('PG pool error:', err));
    }
    return pool;
}

async function query(text, params) {
    return getPool().query(text, params);
}

async function withTx(fn) {
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

async function migrate() {
    const schemaPath = path.join(__dirname, 'schema.postgres.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await query(schema);
}

async function ping() {
    const r = await query('SELECT 1 as ok');
    return r.rows[0].ok === 1;
}

async function close() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

module.exports = { getPool, query, withTx, migrate, ping, close };
