import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySchema } from '@/types/auth'
import { hashOtp } from '@/lib/otp'
import { createSession } from '@/lib/auth'

// POST /api/auth/verify - checks the OTP sent to the user's email, marks
// the account verified, and logs the user in (sets the session cookie).
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = verifySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: { formError: 'Enter the 6-digit code from your email' } }, { status: 400 })
  }

  const { email, code } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: { formError: 'Invalid or expired code' } }, { status: 400 })
  }

  const token = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      type: 'EMAIL_VERIFICATION',
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!token || token.codeHash !== hashOtp(code)) {
    return NextResponse.json({ error: { formError: 'Invalid or expired code' } }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } }),
  ])

  await createSession(user.id)

  return NextResponse.json({ ok: true })
}
