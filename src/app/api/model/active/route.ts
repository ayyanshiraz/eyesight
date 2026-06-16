import { NextResponse } from 'next/server'
import { getActiveCoefficients } from '@/lib/model'

export async function GET() {
  const result = await getActiveCoefficients()
  return NextResponse.json(result)
}
