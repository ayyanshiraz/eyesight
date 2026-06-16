import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { intakeSchema, resultsSchema } from '@/types/test-session'
import { classifyDiagnosis, readingAddForAge } from '@/lib/optics'
import { retrainModel } from '@/lib/model'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const session = await prisma.testSession.findFirst({ where: { id: params.id, userId: user.id } })
  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(session)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const existing = await prisma.testSession.findFirst({ where: { id: params.id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const parsed = intakeSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  await prisma.testSession.updateMany({ where: { id: params.id, userId: user.id }, data: parsed.data })
  return NextResponse.json({ success: true, sessionId: params.id })
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const existing = await prisma.testSession.findFirst({ where: { id: params.id, userId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = resultsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data
  const sphLeft  = d.sphLeft  ?? 0
  const sphRight = d.sphRight ?? 0
  const cylLeft  = d.cylLeft  ?? 0
  const cylRight = d.cylRight ?? 0
  const diagnosisClass = classifyDiagnosis(sphLeft, sphRight, cylLeft, cylRight)
  const readingAdd     = existing.age ? readingAddForAge(existing.age) : 0

  await prisma.testSession.updateMany({
    where: { id: params.id, userId: user.id },
    data: {
      status: 'COMPLETED', completedAt: new Date(),
      ipdMm: d.ipdMm, ipdConfidence: d.ipdConfidence,
      avgDistanceCm: d.avgDistanceCm,
      pxPerMm: d.pxPerMm,
      acuityLeft: d.acuityLeft, acuityRight: d.acuityRight,
      sphLeft, sphRight, cylLeft, cylRight,
      axisLeft: d.axisLeft, axisRight: d.axisRight,
      cylinder: d.cylinder,
      readingAdd,
      astigmatismScore: d.astigmatismScore,
      colorVisionPass:  typeof d.colorVisionPass  === 'boolean' ? d.colorVisionPass  : null,
      macularDistortion: typeof d.macularDistortion === 'boolean' ? d.macularDistortion : null,
      duochromeScore: d.duochromeScore,
      diagnosisClass: diagnosisClass as any,
      recommendation: d.recommendation as any,
    },
  })

  retrainModel().catch(() => {})
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const deleted = await prisma.testSession.deleteMany({ where: { id: params.id, userId: user.id } })
  if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
