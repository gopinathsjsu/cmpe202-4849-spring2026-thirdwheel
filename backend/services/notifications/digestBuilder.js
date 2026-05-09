// Groups unread notifications into a single email digest (future: daily/weekly summary).
// Pure transformation — caller fetches notifications then renders the digest.

function summarize(notifications) {
    const byType = {};
    for (const n of notifications) {
        byType[n.type] = (byType[n.type] || 0) + 1;
    }
    return byType;
}

function buildDigest({ user, notifications }) {
    if (!notifications || notifications.length === 0) return null;
    const summary = summarize(notifications);
    const lines = [`Hi ${user.name},`, '', `You have ${notifications.length} unread notification(s):`];
    for (const [type, n] of Object.entries(summary)) {
        lines.push(`  • ${n} ${type.replace(/_/g, ' ')}`);
    }
    lines.push('', '— Zestify Events');
    return {
        to: user.email,
        subject: `🔔 Your Zestify digest — ${notifications.length} new`,
        text: lines.join('\n'),
    };
}

module.exports = { buildDigest, summarize };
