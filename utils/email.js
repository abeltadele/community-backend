// utils/email.js
// Nodemailer helper. If EMAIL_* envs not set, function becomes a no-op.

const nodemailer = require("nodemailer");

let transporter = null;

if (
  process.env.EMAIL_HOST &&
  process.env.EMAIL_PORT &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS
) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    // Email not configured; skip silently.
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "no-reply@example.com",
    to, subject, html
  });
}

module.exports = { sendEmail };
