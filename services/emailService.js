const nodemailer = require('nodemailer');

// Create transporter (configure in .env for real SMTP)
const createTransporter = () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
};

const sendEmail = async (to, subject, html) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`📧 [Email Stub] To: ${to} | Subject: ${subject}`);
    return { stubbed: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"LabCare System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
};

const sendIssueUpdateEmail = async (userEmail, ticketId, newStatus, remarks) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #3b82f6;">LabCare Issue Update</h2>
      <p>Your issue <strong>${ticketId}</strong> has been updated.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold;">New Status:</td><td style="padding: 8px;">${newStatus}</td></tr>
        ${remarks ? `<tr><td style="padding: 8px; font-weight: bold;">Remarks:</td><td style="padding: 8px;">${remarks}</td></tr>` : ''}
      </table>
      <p style="color: #666;">This is an automated notification from LabCare System.</p>
    </div>
  `;
  return sendEmail(userEmail, `Issue ${ticketId} - Status Updated to ${newStatus}`, html);
};

module.exports = { sendEmail, sendIssueUpdateEmail };
