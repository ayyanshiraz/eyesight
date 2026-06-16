import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DeleteSessionButton from "@/components/DeleteSessionButton"

function va(d: number|null|undefined) {
  if(!d) return 'N/A'
  const denom = Math.round(20 / d)
  return `6/${Math.round(denom * 0.3)}`
}
function sph(v: number|null|undefined) { if(v==null)return'N/A'; return`${v>0?'+':''}${v.toFixed(2)} D` }
function cyl(v: number|null|undefined) { if(v==null||v===0)return'—'; return`${v.toFixed(2)} D` }
function axisStr(v: number|null|undefined) { if(v==null)return'—'; return`${v}°` }
const diagColor = (d:string|null) => ({
  MYOPIA:'bg-blue-100 text-blue-800', HYPEROPIA:'bg-orange-100 text-orange-800',
  EMMETROPIA:'bg-green-100 text-green-800', ASTIGMATISM:'bg-yellow-100 text-yellow-800',
  MIXED:'bg-red-100 text-red-800',
}[d??''] ?? 'bg-gray-100 text-gray-700')

// Simple inline SVG sparkline — no chart library needed
function SphTrendChart({ sessions }: { sessions: any[] }) {
  const pts = sessions
    .filter(s => s.status === "COMPLETED" && s.sphRight != null)
    .slice(0, 10)
    .reverse()
  if (pts.length < 2) return null

  const W = 280, H = 80, PAD = 8
  const vals = pts.map(s => (s.sphRight + s.sphLeft) / 2) // average both eyes
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5
  const range = max - min || 1
  const xs = pts.map((_, i) => PAD + (i / (pts.length - 1)) * (W - PAD * 2))
  const ys = vals.map(v => PAD + (1 - (v - min) / range) * (H - PAD * 2))

  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ")

  return (
    <div className="card mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base font-medium text-ink">Sphere trend (avg both eyes)</h3>
        <span className="text-xs text-muted">Last {pts.length} tests</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {/* Zero line */}
        {min < 0 && max > 0 && (
          <line
            x1={PAD} x2={W - PAD}
            y1={PAD + (1 - (0 - min) / range) * (H - PAD * 2)}
            y2={PAD + (1 - (0 - min) / range) * (H - PAD * 2)}
            stroke="#1B7A5E" strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4"
          />
        )}
        {/* Line */}
        <path d={path} fill="none" stroke="#1B7A5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Dots */}
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={4} fill="#1B7A5E"/>
        ))}
        {/* Labels */}
        {xs.map((x, i) => (
          <text key={i} x={x} y={ys[i] < H/2 ? ys[i] + 16 : ys[i] - 8}
            fontSize="10" textAnchor="middle" fill="#5B6F66">
            {vals[i] >= 0 ? "+" : ""}{vals[i].toFixed(2)}
          </text>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted mt-1">
        <span>Oldest</span>
        <span>Most recent</span>
      </div>
    </div>
  )
}

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
          <p className="text-sm text-muted mt-1">
            {completed.length} completed · {inProgress.length} in progress
          </p>
        </div>
        <Link href="/test" className="btn-primary">+ New Screening</Link>
      </div>

      {/* Trend chart */}
      {completed.length >= 2 && <SphTrendChart sessions={sessions} />}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <section className="mb-10 mt-6">
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

      {/* Completed */}
      <section className={inProgress.length > 0 ? "" : "mt-6"}>
        <h2 className="font-display text-lg font-medium text-ink mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block"/> Completed Screenings
        </h2>
        {completed.length === 0 ? (
          <div className="card text-center text-muted py-12">
            <p className="mb-3 text-lg">No completed screenings yet.</p>
            <Link href="/test" className="btn-primary text-sm">Start your first screening →</Link>
          </div>
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

                  {/* Clinical prescription table */}
                  <div className="rounded-xl border border-accent/10 overflow-hidden mb-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-accent-light">
                          {["Eye","Sph","Cyl","Axis","Va"].map(h=>(
                            <th key={h} className="px-3 py-2 text-center text-muted font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {label:"Right (OD)",cls:"bg-blue-50 text-blue-800",sv:s.sphRight,cv:s.cylRight,av:s.axisRight,acuity:s.acuityRight},
                          {label:"Left (OS)", cls:"bg-purple-50 text-purple-800",sv:s.sphLeft, cv:s.cylLeft, av:s.axisLeft, acuity:s.acuityLeft},
                        ].map(eye=>(
                          <tr key={eye.label} className="border-t border-accent/5">
                            <td className="px-3 py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${eye.cls}`}>{eye.label}</span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-semibold text-ink">{sph(eye.sv)}</td>
                            <td className="px-3 py-2 text-center font-mono text-ink">{cyl(eye.cv)}</td>
                            <td className="px-3 py-2 text-center font-mono text-ink">{axisStr(eye.av)}</td>
                            <td className="px-3 py-2 text-center font-mono font-semibold text-accent-dark">{va(eye.acuity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Extra metrics */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs mb-4">
                    {[
                      {l:"Reading add", v:s.readingAdd&&s.readingAdd>0?"+"+s.readingAdd.toFixed(2)+" D":"—"},
                      {l:"Colour vision",v:s.colorVisionPass?"Passed":"Failed", hi:!s.colorVisionPass},
                      {l:"Macular",      v:s.macularDistortion?"Distortion":"Normal", hi:s.macularDistortion},
                      {l:"IPD",          v:s.ipdMm?s.ipdMm.toFixed(1)+" mm":"N/A"},
                    ].map(({l,v,hi})=>(
                      <div key={l} className={`rounded-lg px-2 py-1.5 border ${hi?'border-red-200 bg-red-50':'border-accent/10 bg-white'}`}>
                        <span className="block text-muted">{l}</span>
                        <span className={`font-semibold ${hi?'text-red-700':'text-ink'}`}>{v}</span>
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
