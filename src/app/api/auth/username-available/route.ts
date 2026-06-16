import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { usernameSchema } from '@/types/auth'

// GET /api/auth/username-available?username=... - used by the registration
// form's "check availability" button (and live as the user types).
export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('username') ?? ''
  const parsed = usernameSchema.safeParse(username)

  if (!parsed.success) {
    return NextResponse.json({ available: false, reason: parsed.error.issues[0]?.message })
  }

  const existing = await prisma.user.findUnique({
    where: { username: parsed.data },
    select: { id: true },
  })

  return NextResponse.json({ available: !existing })
}
