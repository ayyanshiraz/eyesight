import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/types/auth'
import { hashPassword } from '@/lib/auth'
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'

// POST /api/auth/register - creates an unverified User, generates an email
// verification OTP, and emails it via Hostinger SMTP. The user is verified
// (and logged in) at /api/auth/verify.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { firstName, lastName, username, email, phone, address, password } = parsed.data

  const [existingUsername, existingEmail] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    prisma.user.findUnique({ where: { email } }),
  ])

  if (existingUsername) {
    return NextResponse.json(
      { error: { fieldErrors: { username: ['That username is taken'] } } },
      { status: 409 }
    )
  }

  if (existingEmail) {
    return NextResponse.json(
      { error: { fieldErrors: { email: ['An account with this email already exists'] } } },
      { status: 409 }
    )
  }

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: { firstName, lastName, username, email, phone, address, passwordHash },
  })

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
    await sendOtpEmail(email, code, 'verify-email')
  } catch (err) {
    console.error('Failed to send verification email:', err)
    // The account exists either way - let the user retry from /verify.
    return NextResponse.json(
      {
        email: user.email,
        warning: 'Account created, but the verification email failed to send. Use "Resend code" on the next page.',
      },
      { status: 201 }
    )
  }

  return NextResponse.json({ email: user.email }, { status: 201 })
}
