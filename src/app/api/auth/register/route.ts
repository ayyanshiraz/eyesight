import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/types/auth'
import { hashPassword } from '@/lib/auth'
import { generateOtp, hashOtp, OTP_EXPIRY_MS } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limit: 5 registrations per 15 min per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!checkRateLimit(`register:${ip}`, 5)) {
    return NextResponse.json(
      { error: { formError: 'Too many accounts created from this IP. Please wait 15 minutes.' } },
      { status: 429 }
    )
  }

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
    return NextResponse.json(
      { email: user.email, warning: 'Account created but the verification email failed. Use "Resend code" on the next page.' },
      { status: 201 }
    )
  }

  return NextResponse.json({ email: user.email }, { status: 201 })
}
