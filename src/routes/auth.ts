import express, { Request, Response } from 'express';
import transporter from '../utils/email';
import { generateOtpFor, verifyOtp } from '../utils/otp';

const router = express.Router();

/**
 * Helper to extract the recipient identifier (email or phone) from request body
 */
function getRecipient(body: any): string | null {
  if (body?.email) return String(body.email).trim().toLowerCase();
  if (body?.phone) return String(body.phone).trim();
  return null;
}

/**
 * POST /auth/send-otp
 * Body: { email?: string, phone?: string }
 * Generates a 6-digit OTP, stores it in memory & sends it via email (if email supplied)
 */
router.post('/auth/send-otp', async (req: Request, res: Response) => {
  try {
    const recipient = getRecipient(req.body);
    if (!recipient) {
      res.status(400).json({ message: 'Either email or phone is required.' });
      return;
    }

    // Generate & persist OTP in store
    const code = generateOtpFor(recipient, 6);

    // If email was provided, attempt to send the OTP
    if (req.body.email) {
      try {
        await transporter.sendMail({
          from: process.env.SENDER_EMAIL,
          to: recipient,
          subject: 'Your One-Time Password (OTP)',
          text: `Your verification code is ${code}. It will expire in 5 minutes.`,
        });
      } catch (mailErr) {
        console.error('Failed to send OTP email:', mailErr);
        // We intentionally do NOT fail the request if email sending fails – the OTP is still generated.
      }
    }

    // For phone numbers, integration with SMS gateway can be added here.

    res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Error in /auth/send-otp:', err);
    res.status(500).json({ message: 'Failed to send OTP.' });
  }
});

/**
 * POST /auth/verify-otp
 * Body: { email?: string, phone?: string, otp: string }
 * Verifies provided OTP against stored value
 */
router.post('/auth/verify-otp', (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const recipient = getRecipient(req.body);

    if (!recipient || !otp) {
      res.status(400).json({ message: 'Recipient (email or phone) and otp are required.' });
      return;
    }

    const isValid = verifyOtp(recipient, String(otp));

    if (!isValid) {
      res.status(400).json({ message: 'Invalid or expired OTP.' });
      return;
    }

    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (err) {
    console.error('Error in /auth/verify-otp:', err);
    res.status(500).json({ message: 'Failed to verify OTP.' });
  }
});

export default router;

