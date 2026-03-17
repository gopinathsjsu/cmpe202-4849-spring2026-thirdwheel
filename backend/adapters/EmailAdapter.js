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
        <p>📍 ${event.location}</p>
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

module.exports = { sendEmail, ticketConfirmationEmail, eventApprovalEmail, getProvider };
