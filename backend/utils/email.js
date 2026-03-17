const nodemailer = require('nodemailer');

// Use Ethereal for mock email in development
let transporter = null;

async function getTransporter() {
    if (!transporter) {
        // Create a test account on Ethereal
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
    }
    return transporter;
}

async function sendEmail({ to, subject, html }) {
    try {
        const transport = await getTransporter();
        const info = await transport.sendMail({
            from: '"Zestify Events" <noreply@zestify.com>',
            to,
            subject,
            html,
        });
        console.log(`📧 Email sent: ${nodemailer.getTestMessageUrl(info)}`);
        return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

function ticketConfirmationEmail(user, event, ticket) {
    return {
        to: user.email,
        subject: `🎫 Ticket Confirmed: ${event.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">🎉 You're In!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Your ticket has been confirmed</p>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1e293b; margin-top: 0;">${event.title}</h2>
          <p style="color: #64748b;">📅 ${event.date} at ${event.time}</p>
          <p style="color: #64748b;">📍 ${event.location}</p>
          <p style="color: #64748b;">🎫 Ticket Code: <strong>${ticket.ticket_code}</strong></p>
          <p style="color: #64748b;">👤 ${user.name}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #94a3b8; font-size: 14px;">Thank you for registering through Zestify!</p>
        </div>
      </div>
    `,
    };
}

function eventApprovalEmail(organizer, event, approved) {
    return {
        to: organizer.email,
        subject: approved ? `✅ Event Approved: ${event.title}` : `❌ Event Rejected: ${event.title}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${approved ? '#10b981' : '#ef4444'}; padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">${approved ? '✅ Approved!' : '❌ Not Approved'}</h1>
        </div>
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1e293b; margin-top: 0;">${event.title}</h2>
          <p style="color: #64748b;">${approved ? 'Your event has been approved and is now live on Zestify!' : 'Unfortunately, your event was not approved. Please review our guidelines and try again.'}</p>
        </div>
      </div>
    `,
    };
}

module.exports = { sendEmail, ticketConfirmationEmail, eventApprovalEmail };
