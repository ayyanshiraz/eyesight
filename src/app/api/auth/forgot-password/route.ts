import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forgotPasswordSchema } from '@/types/auth'
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'

// POST /api/auth/forgot-password - issues a password reset code if an
// account exists for the given email. Always responds { ok: true }, with
// or without an account, so this can't be used to discover which emails
// are registered.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = forgotPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: { formError: 'Enter a valid email address' } }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })

  if (!user) {
    return NextResponse.json({ ok: true })
  }

  const code = generateOtp()

  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
  })

  try {
    await sendOtpEmail(user.email, code, 'reset-password')
  } catch (err) {
    console.error('Failed to send password reset email:', err)
  }

  return NextResponse.json({ ok: true })
}
