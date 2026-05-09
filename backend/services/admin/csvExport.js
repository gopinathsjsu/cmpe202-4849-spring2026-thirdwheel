// Minimal CSV serializer for admin data exports (users, audit log, attendees).
// Avoids pulling a CSV library — Postgres rows → quoted, comma-joined string.

function escape(v) {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, columns) {
    if (!rows || rows.length === 0) return '';
    const cols = columns && columns.length ? columns : Object.keys(rows[0]);
    const header = cols.join(',');
    const body = rows.map(r => cols.map(c => escape(r[c])).join(',')).join('\n');
    return `${header}\n${body}\n`;
}

module.exports = { toCsv };
