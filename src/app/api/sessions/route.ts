import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { intakeSchema } from '@/types/test-session'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: { formError: 'Please log in first' } }, { status: 401 })

  const body = await req.json()
  const parsed = intakeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const session = await prisma.testSession.create({
    data: { userId: user.id, ...parsed.data },
  })
  return NextResponse.json({ sessionId: session.id }, { status: 201 })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Scoped to current user only
  const sessions = await prisma.testSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json({ sessions })
}
