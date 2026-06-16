import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(user as any).isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [totalUsers, totalSessions, completedSessions, users] = await Promise.all([
    prisma.user.count(),
    prisma.testSession.count(),
    prisma.testSession.count({ where: { status: 'COMPLETED' } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, firstName: true, lastName: true, username: true,
        email: true, createdAt: true, emailVerified: true, isAdmin: true,
        testSessions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, status: true, createdAt: true, completedAt: true,
            diagnosisClass: true, sphLeft: true, sphRight: true,
            cylLeft: true, cylRight: true, axisLeft: true, axisRight: true,
            acuityLeft: true, acuityRight: true, age: true,
            recommendation: true,
          }
        }
      }
    })
  ])

  return NextResponse.json({ totalUsers, totalSessions, completedSessions, users })
}
