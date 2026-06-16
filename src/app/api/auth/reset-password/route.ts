import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resetPasswordSchema } from '@/types/auth'
import { hashOtp } from '@/lib/otp'
import { hashPassword, createSession } from '@/lib/auth'

// POST /api/auth/reset-password - verifies the PASSWORD_RESET code, sets
// a new password, signs out every existing session for the account, and
// logs the user in on this device.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = resetPasswordSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: { formError: 'Check the form and try again' } }, { status: 400 })
  }

  const { email, code, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ error: { formError: 'Invalid or expired code' } }, { status: 400 })
  }

  const token = await prisma.verificationToken.findFirst({
    where: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!token || token.codeHash !== hashOtp(code)) {
    return NextResponse.json({ error: { formError: 'Invalid or expired code' } }, { status: 400 })
  }

  const passwordHash = await hashPassword(password)

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    // A password reset signs out every device that was previously logged in.
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ])

  await createSession(user.id)

  return NextResponse.json({ ok: true })
}
