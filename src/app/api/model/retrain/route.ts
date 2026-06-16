import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { retrainModel } from '@/lib/model'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await retrainModel()
  return NextResponse.json({ ok: true })
}
