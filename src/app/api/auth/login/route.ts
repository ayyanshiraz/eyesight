import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/types/auth'
import { verifyPassword, createSession } from '@/lib/auth'

// POST /api/auth/login - accepts a username or email plus password.
export async function POST(req: NextRequest) {
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
