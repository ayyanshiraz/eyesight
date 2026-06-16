import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { vaLabel, SNELLEN_DENOMINATORS } from '@/lib/optics'

type Rec = { text?: string; prescription?: any; squint?: string; readingAdd?: number }

function sph(v: number|null|undefined) { if(v==null)return'—'; return`${v>0?'+':''}${v.toFixed(2)}` }
function cyl(v: number|null|undefined) { if(v==null||v===0)return'—'; return v.toFixed(2) }
function axis(v: number|null|undefined) { if(v==null)return'—'; return`${v}°` }
function vaStr(decimal: number|null|undefined) {
  if (!decimal) return '—'
  const idx  = Math.max(0, SNELLEN_DENOMINATORS.length - Math.round(decimal * SNELLEN_DENOMINATORS.length) - 1)
  return vaLabel(SNELLEN_DENOMINATORS[idx])
}
const diagColor = (d:string|null) => ({
  MYOPIA:'bg-blue-100 text-blue-800', HYPEROPIA:'bg-orange-100 text-orange-800',
  EMMETROPIA:'bg-green-100 text-green-800', ASTIGMATISM:'bg-yellow-100 text-yellow-800',
  MIXED:'bg-red-100 text-red-800',
}[d??''] ?? 'bg-gray-100 text-gray-700')

export default async function SessionPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser()
  if (!user) notFound()
  const session = await prisma.testSession.findFirst({
    where: { id: params.id, userId: user.id }, include: { user: true }
  })
  if (!session) notFound()

  const rec = session.recommendation as Rec | null
  const recText = typeof rec === 'string' ? rec : rec?.text ?? ''

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/dashboard" className="text-sm text-muted hover:text-ink">← Dashboard</Link>

      <div className="flex items-start justify-between gap-4 mt-4 mb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent-dark">Session {session.id.slice(0,10)}</p>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">{session.user?.firstName}&apos;s Prescription</h1>
          <p className="text-muted text-sm mt-1">
            {session.completedAt ? new Date(session.completedAt).toLocaleString() : session.createdAt.toLocaleString()}
            {' · '}<strong>{session.status.replace('_',' ').toLowerCase()}</strong>
          </p>
        </div>
        {session.diagnosisClass && (
          <span className={`mt-1 px-3 py-1 rounded-full text-sm font-bold shrink-0 ${diagColor(session.diagnosisClass)}`}>
            {session.diagnosisClass}
          </span>
        )}
      </div>

      {session.status === 'COMPLETED' && (
        <>
          {/* ── Clinical prescription table (matches paper card format) ── */}
          <section className="mb-5">
            <h2 className="font-display text-lg font-medium text-ink mb-3">Vision Prescription</h2>
            <div className="rounded-2xl border-2 border-accent/20 overflow-hidden">
              <div className="bg-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-wider">
                ClearSight Refraction Results
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-accent-light">
                    <th className="px-4 py-2 text-left text-muted text-xs font-medium">Eye</th>
                    <th className="px-4 py-2 text-center text-muted text-xs font-medium">Sph (D)</th>
                    <th className="px-4 py-2 text-center text-muted text-xs font-medium">Cyl (D)</th>
                    <th className="px-4 py-2 text-center text-muted text-xs font-medium">Axis</th>
                    <th className="px-4 py-2 text-center text-muted text-xs font-medium">Va</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-accent/10">
                    <td className="px-4 py-3 font-medium text-ink">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Right (OD)</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-ink">{sph(session.sphRight)}</td>
                    <td className="px-4 py-3 text-center font-mono text-ink">{cyl(session.cylRight)}</td>
                    <td className="px-4 py-3 text-center font-mono text-ink">{axis(session.axisRight)}</td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-accent-dark">{vaStr(session.acuityRight)}</td>
                  </tr>
                  <tr className="border-t border-accent/10">
                    <td className="px-4 py-3 font-medium text-ink">
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs">Left (OS)</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-ink">{sph(session.sphLeft)}</td>
                    <td className="px-4 py-3 text-center font-mono text-ink">{cyl(session.cylLeft)}</td>
                    <td className="px-4 py-3 text-center font-mono text-ink">{axis(session.axisLeft)}</td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-accent-dark">{vaStr(session.acuityLeft)}</td>
                  </tr>
                  {session.readingAdd && session.readingAdd > 0 && (
                    <tr className="border-t border-accent/10 bg-accent-light/30">
                      <td colSpan={4} className="px-4 py-2 text-xs text-muted">Reading Add (Age {session.age})</td>
                      <td className="px-4 py-2 text-center font-mono font-semibold text-accent-dark">+{session.readingAdd.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Additional checks */}
          <section className="card mb-5">
            <h2 className="font-display text-lg font-medium text-ink mb-4">Additional Findings</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {[
                ['Colour vision',  session.colorVisionPass ? 'Passed' : 'Failed'],
                ['Macular',        session.macularDistortion ? 'Distortion' : 'Normal'],
                ['IPD',            session.ipdMm ? session.ipdMm.toFixed(1)+' mm' : '—'],
                ['Test distance',  session.avgDistanceCm ? session.avgDistanceCm.toFixed(1)+' cm' : '—'],
                ['Screen px/mm',   session.pxPerMm ? session.pxPerMm.toFixed(2) : 'default'],
                ['Duochrome',      session.duochromeScore===0?'Red (myopic)':session.duochromeScore===2?'Green (hyperopic)':'Balanced'],
              ].map(([l,v])=>(
                <div key={String(l)}><dt className="text-muted text-xs">{l}</dt><dd className="font-medium text-ink">{v}</dd></div>
              ))}
            </div>
          </section>

          {recText && (
            <section className="card mb-5 bg-accent-light border-accent/20">
              <h2 className="font-display text-lg font-medium text-ink mb-2">Recommendation</h2>
              <p className="text-sm text-ink">{recText}</p>
            </section>
          )}
        </>
      )}

      {/* Intake */}
      <section className="card mb-5">
        <h2 className="font-display text-lg font-medium text-ink mb-4">Intake Summary</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[['Age',session.age??'—'],['Country',session.country??'—'],
            ['Screen time',session.screenTime!=null?`${session.screenTime} hrs/day`:'—'],
            ['Eye fatigue',session.fatigueScore??'—'],['Cataract risk',session.cataractRisk??'—'],
          ].map(([l,v])=>(
            <div key={String(l)}><dt className="text-muted text-xs">{l}</dt><dd className="font-medium text-ink">{v}</dd></div>
          ))}
        </div>
      </section>

      <div className="flex gap-3">
        <Link href={`/sessions/${session.id}/camera`} className="btn-secondary text-sm">Retake test</Link>
        <Link href={`/test?edit=${session.id}`}       className="btn-secondary text-sm">Edit questionnaire</Link>
      </div>
    </main>
  )
}
