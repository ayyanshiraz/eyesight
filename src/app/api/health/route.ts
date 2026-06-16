import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/health - confirms the app can reach Neon. Useful right after
// setting DATABASE_URL/DIRECT_URL for the first time.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', database: 'connected' })
  } catch {
    return NextResponse.json(
      { status: 'error', database: 'unreachable' },
      { status: 500 }
    )
  }
}
