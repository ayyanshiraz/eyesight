import crypto from 'crypto'

export const OTP_LENGTH = 6
export const OTP_EXPIRY_MS = 15 * 60 * 1000 // 15 minutes

/** Generates a random 6-digit code, e.g. "042817". */
export function generateOtp(): string {
  return crypto.randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, '0')
}

/** OTPs are stored hashed, the same way passwords are. */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}
