const { query } = require('../db/pool');

const CategoryRepository = {
    async list() {
        const r = await query('SELECT * FROM categories ORDER BY name');
        return r.rows;
    },
};

module.exports = CategoryRepository;
