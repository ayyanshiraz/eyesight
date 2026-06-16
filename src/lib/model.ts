// src/lib/model.ts — self-training data flywheel (OLS regression, pure JS)
import { prisma } from '@/lib/prisma'
import { estimateSphere, SPH_MIN, SPH_MAX, SPH_STEP } from '@/lib/optics'

export interface ModelCoefficients {
  slope: number
  duoMyopic: number
  duoHyperopic: number
}

const DEFAULTS: ModelCoefficients = { slope: 5.0, duoMyopic: -0.5, duoHyperopic: 0.75 }
const MIN_ROWS = 6

/** Returns active model coefficients, falling back to defaults. */
export async function getActiveCoefficients(): Promise<{
  coefficients: ModelCoefficients; version: string; n: number
}> {
  try {
    const mv = await (prisma as any).modelVersion.findFirst({
      where: { active: true }, orderBy: { trainedAt: 'desc' },
    })
    if (mv?.metrics) {
      const m = mv.metrics as any
      return {
        coefficients: {
          slope:        m.slope        ?? DEFAULTS.slope,
          duoMyopic:    m.duoMyopic    ?? DEFAULTS.duoMyopic,
          duoHyperopic: m.duoHyperopic ?? DEFAULTS.duoHyperopic,
        },
        version: mv.version,
        n: m.n ?? 0,
      }
    }
  } catch (_) {}
  return { coefficients: DEFAULTS, version: 'baseline', n: 0 }
}

/** Estimate sphere using fetched model coefficients */
export function estimateWithCoeffs(
  acuity: number, duochrome: number, c: ModelCoefficients
): number {
  return estimateSphere(acuity, duochrome, c.slope, c.duoMyopic, c.duoHyperopic)
}

/** Retrain on all completed sessions. Called fire-and-forget after each PATCH. */
export async function retrainModel(): Promise<void> {
  try {
    const sessions = await (prisma as any).testSession.findMany({
      where: {
        status: 'COMPLETED',
        acuityLeft:  { not: null },
        acuityRight: { not: null },
        sphLeft:     { not: null },
        sphRight:    { not: null },
        duochromeScore: { not: null },
      },
      select: { acuityLeft:true, acuityRight:true, sphLeft:true, sphRight:true, duochromeScore:true },
    })

    // Build rows: y = slope*(acuity-1) + duoMyopic*isRed + duoHyperopic*isGreen
    type Row = { x1:number; x2:number; x3:number; y:number }
    const rows: Row[] = []
    for (const s of sessions) {
      const d = s.duochromeScore as number
      const r2 = d===0?1:0, r3 = d===2?1:0
      rows.push({ x1: (s.acuityLeft  as number)-1, x2:r2, x3:r3, y: s.sphLeft  as number })
      rows.push({ x1: (s.acuityRight as number)-1, x2:r2, x3:r3, y: s.sphRight as number })
    }
    if (rows.length < MIN_ROWS) {
      // Ensure a baseline version exists
      const existing = await (prisma as any).modelVersion.findFirst({ where:{ active:true } })
      if (!existing) {
        await (prisma as any).modelVersion.create({
          data:{ version:'v1-baseline', metrics:{ ...DEFAULTS, n:rows.length }, active:true }
        })
      }
      return
    }

    // OLS normal equations (3×3)
    let s11=0,s12=0,s13=0,s22=0,s23=0,s33=0,t1=0,t2=0,t3=0
    for (const r of rows) {
      s11+=r.x1*r.x1; s12+=r.x1*r.x2; s13+=r.x1*r.x3
      s22+=r.x2*r.x2; s23+=r.x2*r.x3; s33+=r.x3*r.x3
      t1+=r.x1*r.y;   t2+=r.x2*r.y;   t3+=r.x3*r.y
    }
    const A = [[s11,s12,s13],[s12,s22,s23],[s13,s23,s33]]
    const det3 = (m:number[][]) =>
      m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
     -m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
     +m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0])
    const D = det3(A)
    if (Math.abs(D) < 1e-10) return
    const sub = (col:number,vals:number[]) => A.map((row,i)=>row.map((v,j)=>j===col?vals[i]:v))
    const T = [t1,t2,t3]
    let slope        = Math.max(2, Math.min(10, det3(sub(0,T))/D))
    let duoMyopic    = Math.max(-2,Math.min(0,  det3(sub(1,T))/D))
    let duoHyperopic = Math.max(0, Math.min(2,  det3(sub(2,T))/D))

    // MAE
    let mae = 0
    for (const r of rows) mae += Math.abs(slope*r.x1+duoMyopic*r.x2+duoHyperopic*r.x3-r.y)
    mae = +(mae/rows.length).toFixed(4)

    await (prisma as any).modelVersion.updateMany({ where:{active:true}, data:{active:false} })
    const count = await (prisma as any).modelVersion.count()
    await (prisma as any).modelVersion.create({
      data:{
        version:`v${count+1}`,
        metrics:{ slope, duoMyopic, duoHyperopic, n:rows.length, mae },
        active:true,
      }
    })
  } catch (_) {}
}
