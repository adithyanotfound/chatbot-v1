import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Reusable Nodemailer transporter configured with credentials supplied via environment variables.
 *
 * Expected environment variables:
 * - SENDER_EMAIL: email address to send from
 * - SENDER_EMAIL_PASSWORD: password / app password for the above address
 * - SMTP_HOST (optional): custom SMTP host (defaults to Gmail)
 * - SMTP_PORT (optional): custom SMTP port
 * - SMTP_SECURE (optional): "true" if using secure connection
 */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
  secure: (process.env.SMTP_SECURE ?? 'true') === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_EMAIL_PASSWORD,
  },
});

export default transporter;

