import crypto from 'crypto';

// Simple in-memory OTP store
type OtpEntry = {
  code: string;
  expiresAt: number; // Unix timestamp in ms
};

const otpStore: Map<string, OtpEntry> = new Map();

// Generate a numeric OTP of given length (default 6)
export function generateOtpFor(recipient: string, length: number = 6): string {
  const code = crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(recipient, { code, expiresAt });
  return code;
}

// Verify OTP. Returns true if valid, and consumes it (prevents reuse)
export function verifyOtp(recipient: string, code: string): boolean {
  const entry = otpStore.get(recipient);
  if (!entry) return false;
  const isExpired = Date.now() > entry.expiresAt;
  const isMatch = entry.code === code;
  if (!isExpired && isMatch) {
    otpStore.delete(recipient); // consume OTP after successful verification
    return true;
  }
  return false;
}

// For testing / housekeeping (optional)
export function clearExpiredOtps() {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}

