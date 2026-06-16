import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/types/auth'
import { verifyPassword, createSession } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per 15 minutes per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  if (!checkRateLimit(`login:${ip}`, 10)) {
    return NextResponse.json(
      { error: { formError: 'Too many login attempts. Please wait 15 minutes before trying again.' } },
      { status: 429 }
    )
  }

  const body = await req.json()
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: { formError: 'Enter your username/email and password' } }, { status: 400 })
  }

  const { identifier, password } = parsed.data

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: { formError: 'Incorrect username/email or password' } }, { status: 401 })
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: { formError: 'Please verify your email first', email: user.email } },
      { status: 403 }
    )
  }

  await createSession(user.id)
  return NextResponse.json({ ok: true })
}
