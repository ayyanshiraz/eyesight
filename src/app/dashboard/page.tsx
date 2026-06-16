import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DeleteSessionButton from "@/components/DeleteSessionButton"

function snellen(d: number|null|undefined) { if(!d)return'N/A'; return`20/${Math.round(20/d)}` }
function sph(v: number|null|undefined) { if(v==null)return'N/A'; return`${v>0?'+':''}${v.toFixed(2)} D` }
const diagColor = (d:string|null) =>
  d==='MYOPIA'?'bg-blue-100 text-blue-800':d==='HYPEROPIA'?'bg-orange-100 text-orange-800':d==='EMMETROPIA'?'bg-green-100 text-green-800':'bg-gray-100 text-gray-700'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const sessions = await prisma.testSession.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "desc" },
  })

  const completed  = sessions.filter((s: any) => s.status === "COMPLETED")
  const inProgress = sessions.filter((s: any) => s.status === "IN_PROGRESS")

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent-dark">Dashboard</p>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">Welcome back, {user.firstName}</h1>
        </div>
        <Link href="/test" className="btn-primary">+ New Screening</Link>
      </div>

      {inProgress.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display text-lg font-medium text-ink mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"/> In Progress
          </h2>
          <div className="space-y-3">
            {inProgress.map((s: any) => (
              <div key={s.id} className="card flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-ink">{s.createdAt.toLocaleDateString()}</p>
                  <p className="text-xs text-muted">{s.id.slice(0,12)}…</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/test?edit=${s.id}`} className="btn-secondary text-sm px-4 py-2">Edit Questions</Link>
                  <Link href={`/sessions/${s.id}/camera`} className="btn-primary text-sm px-4 py-2">Take Test →</Link>
                  <DeleteSessionButton sessionId={s.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-lg font-medium text-ink mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block"/> Completed Screenings
        </h2>
        {completed.length === 0 ? (
          <div className="card text-center text-muted py-12">No completed screenings yet.</div>
        ) : (
          <div className="space-y-6">
            {completed.map((s: any) => {
              const rec = s.recommendation as any
              const recText = typeof rec==='string' ? rec : rec?.text ?? ''
              return (
                <div key={s.id} className="card overflow-hidden">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-accent/10">
                    <div>
                      <p className="font-display text-lg font-medium text-ink">
                        {s.completedAt ? new Date(s.completedAt).toLocaleDateString(undefined,{dateStyle:'medium'}) : s.createdAt.toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted">ID {s.id.slice(0,10)}…</p>
                    </div>
                    {s.diagnosisClass && (
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${diagColor(s.diagnosisClass)}`}>
                        {s.diagnosisClass}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm mb-4">
                    {[
                      ['Right Acuity', snellen(s.acuityRight)],
                      ['Left Acuity',  snellen(s.acuityLeft)],
                      ['Right SPH', sph(s.sphRight), Math.abs(s.sphRight??0)>=0.5],
                      ['Left SPH',  sph(s.sphLeft),  Math.abs(s.sphLeft??0)>=0.5],
                      ['Cylinder',  s.cylinder!=null?s.cylinder.toFixed(2)+' D':'0.00 D'],
                      ['Reading add', s.readingAdd&&s.readingAdd>0?'+'+s.readingAdd.toFixed(2)+' D':'—'],
                      ['Astigmatism', s.astigmatismScore===1?'Detected':'Negative', s.astigmatismScore===1],
                      ['Colour vision', s.colorVisionPass?'Passed':'Failed', !s.colorVisionPass],
                      ['Macular', s.macularDistortion?'Distortion':'Normal', s.macularDistortion],
                      ['IPD', s.ipdMm?s.ipdMm.toFixed(1)+' mm':'N/A'],
                    ].map(([l,v,hi])=>(
                      <div key={String(l)} className={`rounded-xl px-3 py-2 border ${hi?'border-accent/20 bg-accent-light':'border-accent/10 bg-white'}`}>
                        <span className="block text-xs text-muted">{l}</span>
                        <span className={`font-semibold ${hi?'text-accent-dark':'text-ink'}`}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {recText && (
                    <div className="rounded-xl bg-accent-light border border-accent/10 px-4 py-3 mb-4">
                      <p className="text-xs font-medium text-accent-dark uppercase tracking-wider mb-1">Recommendation</p>
                      <p className="text-sm text-ink">{recText}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-accent/10">
                    <Link href={`/sessions/${s.id}`} className="text-sm font-medium text-accent-dark hover:underline">View full details →</Link>
                    <div className="flex gap-2">
                      <Link href={`/sessions/${s.id}/camera`} className="btn-secondary text-xs px-3 py-1.5">Retake</Link>
                      <DeleteSessionButton sessionId={s.id} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
