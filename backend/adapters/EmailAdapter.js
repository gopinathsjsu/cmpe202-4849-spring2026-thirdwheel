const nodemailer = require('nodemailer');

class NoopEmailProvider {
    async send({ to, subject }) {
        console.log(`[email-noop] to=${to} subject="${subject}"`);
        return { success: true, provider: 'noop' };
    }
}

class EtherealEmailProvider {
    constructor() { this.transporter = null; }
    async getTransporter() {
        if (!this.transporter) {
            const account = await nodemailer.createTestAccount();
            this.transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email', port: 587, secure: false,
                auth: { user: account.user, pass: account.pass },
            });
        }
        return this.transporter;
    }
    async send({ to, subject, html }) {
        try {
            const t = await this.getTransporter();
            const info = await t.sendMail({ from: '"Zestify Events" <noreply@zestify.com>', to, subject, html });
            return { success: true, provider: 'ethereal', previewUrl: nodemailer.getTestMessageUrl(info) };
        } catch (err) {
            console.error('Ethereal send failed:', err.message);
            return { success: false, error: err.message };
        }
    }
}

class SmtpEmailProvider {
    constructor(opts) {
        this.transporter = nodemailer.createTransport({
            host: opts.host, port: opts.port, secure: opts.secure,
            auth: { user: opts.user, pass: opts.pass },
        });
        this.from = opts.from;
    }
    async send({ to, subject, html }) {
        try {
            await this.transporter.sendMail({ from: this.from, to, subject, html });
            return { success: true, provider: 'smtp' };
        } catch (err) {
            console.error('SMTP send failed:', err.message);
            return { success: false, error: err.message };
        }
    }
}

let provider = null;
function getProvider() {
    if (provider) return provider;
    const choice = (process.env.EMAIL_PROVIDER || 'ethereal').toLowerCase();
    if (choice === 'noop') provider = new NoopEmailProvider();
    else if (choice === 'smtp') provider = new SmtpEmailProvider({
        host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER, pass: process.env.SMTP_PASS,
        from: process.env.EMAIL_FROM || '"Zestify Events" <noreply@zestify.com>',
    });
    else provider = new EtherealEmailProvider();
    return provider;
}

async function sendEmail(message) {
    return getProvider().send(message);
}

// Build Google Maps URL — lat/lon if available else search by location string.
function mapsUrlForEvent(event) {
    if (event.is_online && event.online_url) return event.online_url;
    if (event.latitude != null && event.longitude != null) {
        return `https://www.google.com/maps/search/?api=1&query=${event.latitude},${event.longitude}`;
    }
    const q = [event.venue_name, event.address, event.city, event.state, event.zip, event.location]
        .filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || event.location || '')}`;
}

function locationBlock(event) {
    const url = mapsUrlForEvent(event);
    const label = event.is_online
        ? `💻 ${event.venue_name || 'Online Event'}`
        : `📍 ${[event.venue_name, event.address, event.city, event.state, event.zip].filter(Boolean).join(', ') || event.location}`;
    const linkText = event.is_online ? '→ Join Online' : '→ Open in Google Maps';
    return `
      <p style="margin:8px 0">${label}</p>
      <p style="margin:8px 0">
        <a href="${url}" target="_blank" rel="noopener"
           style="display:inline-block;background:#06b6d4;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">
          ${linkText}
        </a>
      </p>`;
}

// Template Method-style email factories
function ticketConfirmationEmail(user, event, ticket) {
    return {
        to: user.email,
        subject: `🎫 Ticket Confirmed: ${event.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">🎉 You're In!</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>📅 ${event.date} at ${event.time}</p>
        ${locationBlock(event)}
        <p>🎫 Code: <strong>${ticket.ticket_code}</strong></p>
        <p>👤 ${user.name}</p>
      </div></div>`,
    };
}

function eventApprovalEmail(organizer, event, approved) {
    return {
        to: organizer.email,
        subject: approved ? `✅ Event Approved: ${event.title}` : `❌ Event Rejected: ${event.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:${approved ? '#10b981' : '#ef4444'};padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">${approved ? '✅ Approved!' : '❌ Not Approved'}</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>${approved ? 'Live on Zestify.' : 'Please review guidelines and try again.'}</p>
      </div></div>`,
    };
}

function eventCancelledEmail(user, event, reason) {
    return {
        to: user.email,
        subject: `❌ Event Cancelled: ${event.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:#ef4444;padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">❌ Event Cancelled</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>Hi ${user.name},</p>
        <p>The event you registered for has been cancelled.</p>
        <p><strong>Originally scheduled:</strong> 📅 ${event.date} at ${event.time}</p>
        ${locationBlock(event)}
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>Your ticket has been automatically cancelled. If payment was charged, refund handled separately.</p>
        <p style="color:#94a3b8;font-size:14px">— Zestify Events</p>
      </div></div>`,
    };
}

function eventRescheduledEmail(user, event, oldDate, oldTime) {
    return {
        to: user.email,
        subject: `📅 Event Rescheduled: ${event.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#f59e0b,#7c3aed);padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">📅 Event Rescheduled</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>Hi ${user.name},</p>
        <p>The event you registered for has been rescheduled.</p>
        <p><strong>Old schedule:</strong> <s>${oldDate} at ${oldTime}</s></p>
        <p><strong>New schedule:</strong> 🆕 <strong>${event.date} at ${event.time}</strong></p>
        ${locationBlock(event)}
        <p>Your ticket remains valid. Add the new time to your calendar.</p>
        <p style="color:#94a3b8;font-size:14px">— Zestify Events</p>
      </div></div>`,
    };
}

function eventReminderEmail(user, event, hoursUntil) {
    return {
        to: user.email,
        subject: `⏰ Reminder: ${event.title} starts in ${hoursUntil}h`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#06b6d4,#7c3aed);padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">⏰ Event Starting Soon</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>Hi ${user.name},</p>
        <p>Just a heads-up — your event starts in about <strong>${hoursUntil} hours</strong>.</p>
        <p><strong>📅 When:</strong> ${event.date} at ${event.time}</p>
        ${locationBlock(event)}
        <p>See you there!</p>
        <p style="color:#94a3b8;font-size:14px">— Zestify Events</p>
      </div></div>`,
    };
}

function eventCreatedEmail(organizer, event) {
    return {
        to: organizer.email,
        subject: `📝 Event Submitted — Pending Review: ${event.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">📝 Event Submitted</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>Hi ${organizer.name},</p>
        <p>Your event has been submitted and is now awaiting admin review. You'll get another email once it's approved (or if changes are needed).</p>
        <p><strong>📅 When:</strong> ${event.date} at ${event.time}</p>
        ${locationBlock(event)}
        <p><strong>👥 Capacity:</strong> ${event.capacity}</p>
        <p style="color:#94a3b8;font-size:14px">— Zestify Events</p>
      </div></div>`,
    };
}

function eventPendingReviewAdminEmail(admin, organizer, event) {
    return {
        to: admin.email,
        subject: `🛎️ New Event Awaiting Review: ${event.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:#f59e0b;padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">🛎️ Review Required</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>Hi ${admin.name},</p>
        <p><strong>${organizer.name}</strong> just submitted a new event. Please review.</p>
        <p><strong>📅 When:</strong> ${event.date} at ${event.time}</p>
        ${locationBlock(event)}
        <p><strong>👥 Capacity:</strong> ${event.capacity}</p>
        <p><strong>💰 Price:</strong> ${event.price > 0 ? `$${event.price}` : 'Free'}</p>
        <p><strong>📝 Description:</strong> ${(event.short_description || event.description || '').substring(0, 300)}${(event.description || '').length > 300 ? '…' : ''}</p>
        <p style="margin-top:20px">
          <a href="https://34.107.158.154.nip.io/admin" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">→ Open Admin Panel</a>
        </p>
        <p style="color:#94a3b8;font-size:14px">— Zestify Events</p>
      </div></div>`,
    };
}

function ticketCancellationEmail(user, event, ticket) {
    return {
        to: user.email,
        subject: `🎫 Ticket Cancelled: ${event.title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
      <div style="background:#64748b;padding:30px;border-radius:12px 12px 0 0;color:#fff">
        <h1 style="margin:0">Ticket Cancelled</h1></div>
      <div style="background:#f8fafc;padding:30px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px">
        <h2>${event.title}</h2>
        <p>Hi ${user.name},</p>
        <p>Your ticket (code <strong>${ticket.ticket_code}</strong>) for this event has been cancelled.</p>
        <p>📅 ${event.date} at ${event.time}</p>
        ${locationBlock(event)}
        <p style="color:#94a3b8;font-size:14px">— Zestify Events</p>
      </div></div>`,
    };
}

module.exports = {
    sendEmail,
    ticketConfirmationEmail,
    ticketCancellationEmail,
    eventApprovalEmail,
    eventCreatedEmail,
    eventPendingReviewAdminEmail,
    eventCancelledEmail,
    eventRescheduledEmail,
    eventReminderEmail,
    getProvider,
};
