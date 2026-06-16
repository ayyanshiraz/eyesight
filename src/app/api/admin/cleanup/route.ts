// POST /api/admin/cleanup — marks IN_PROGRESS sessions older than 7 days as ABANDONED.
// Call this via a Vercel cron job or manually from the admin panel.
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const user = await getCurrentUser() as any
  if (!user?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const result = await prisma.testSession.updateMany({
    where: { status: 'IN_PROGRESS', createdAt: { lt: cutoff } },
    data:  { status: 'ABANDONED' },
  })
  return NextResponse.json({ abandoned: result.count })
}
