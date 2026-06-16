import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resendCodeSchema } from '@/types/auth'
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'

// POST /api/auth/resend-code - issues a fresh OTP for an unverified
// account. Always responds with { ok: true } so this can't be used to
// probe which emails are registered.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = resendCodeSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: { formError: 'Enter a valid email address' } }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })

  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true })
  }

  const code = generateOtp()

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  })

  try {
    await sendOtpEmail(user.email, code, 'verify-email')
  } catch (err) {
    console.error('Failed to send verification email:', err)
    return NextResponse.json(
      { error: { formError: 'Could not send the email - check the server logs for the SMTP error.' } },
      { status: 502 }
    )
  }

  return NextResponse.json({ ok: true })
}
