import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function sph(v: number|null|undefined) { if(v==null)return'—'; return`${v>0?'+':''}${v.toFixed(2)}` }
function va(d: number|null|undefined) { if(!d)return'—'; return`6/${Math.round(20/d*3)}` }
const diagColor = (d:string|null) => ({
  MYOPIA:'bg-blue-100 text-blue-800', HYPEROPIA:'bg-orange-100 text-orange-800',
  EMMETROPIA:'bg-green-100 text-green-800', ASTIGMATISM:'bg-yellow-100 text-yellow-800',
  MIXED:'bg-red-100 text-red-800',
}[d??''] ?? 'bg-gray-100 text-gray-700')

export default async function AdminPage() {
  const user = await getCurrentUser() as any
  if (!user) redirect('/login')
  if (!user.isAdmin) redirect('/dashboard')

  const [totalUsers, totalSessions, completedSessions, inProgressSessions, users, recentSessions] =
    await Promise.all([
      prisma.user.count(),
      prisma.testSession.count(),
      prisma.testSession.count({ where: { status: 'COMPLETED' } }),
      prisma.testSession.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          testSessions: {
            orderBy: { createdAt: 'desc' },
            select: {
              id:true, status:true, createdAt:true, completedAt:true,
              diagnosisClass:true, sphLeft:true, sphRight:true,
              cylLeft:true, cylRight:true, acuityLeft:true, acuityRight:true,
              age:true, recommendation:true,
            }
          }
        }
      }),
      prisma.testSession.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        take: 10,
        include: { user: { select: { firstName:true, lastName:true, email:true } } }
      })
    ])

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-red-600">Admin Panel</p>
          <h1 className="font-display text-3xl font-medium text-ink mt-1">ClearSight Admin</h1>
          <p className="text-muted text-sm mt-1">Logged in as {user.firstName} ({user.email})</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-sm">← Back to Dashboard</Link>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Users',       value: totalUsers,          color: 'bg-blue-50 border-blue-200' },
          { label: 'Total Tests',        value: totalSessions,       color: 'bg-accent-light border-accent/20' },
          { label: 'Completed Tests',    value: completedSessions,   color: 'bg-green-50 border-green-200' },
          { label: 'In Progress',        value: inProgressSessions,  color: 'bg-yellow-50 border-yellow-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
            <p className="text-3xl font-display font-bold text-ink">{s.value}</p>
            <p className="text-sm text-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent completed tests */}
      <section className="mb-10">
        <h2 className="font-display text-xl font-medium text-ink mb-4">Recent Completed Tests</h2>
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-accent-light border-b border-accent/10">
                {['Patient','Email','Date','Right Sph','Left Sph','Diagnosis','Va OD','Va OS'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSessions.map((s:any) => (
                <tr key={s.id} className="border-b border-accent/5 hover:bg-accent-light/30">
                  <td className="px-4 py-3 font-medium text-ink">{s.user?.firstName} {s.user?.lastName}</td>
                  <td className="px-4 py-3 text-muted">{s.user?.email}</td>
                  <td className="px-4 py-3 text-muted">{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 font-mono">{sph(s.sphRight)}</td>
                  <td className="px-4 py-3 font-mono">{sph(s.sphLeft)}</td>
                  <td className="px-4 py-3">
                    {s.diagnosisClass && <span className={`px-2 py-0.5 rounded text-xs font-bold ${diagColor(s.diagnosisClass)}`}>{s.diagnosisClass}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-accent-dark">{va(s.acuityRight)}</td>
                  <td className="px-4 py-3 font-mono text-accent-dark">{va(s.acuityLeft)}</td>
                </tr>
              ))}
              {recentSessions.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted">No completed tests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* All users */}
      <section>
        <h2 className="font-display text-xl font-medium text-ink mb-4">All Users ({totalUsers})</h2>
        <div className="space-y-6">
          {users.map((u:any) => (
            <div key={u.id} className="card">
              {/* User header */}
              <div className="flex items-start justify-between mb-4 pb-4 border-b border-accent/10">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-medium text-ink">{u.firstName} {u.lastName}</p>
                    {u.isAdmin && <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">ADMIN</span>}
                    {u.emailVerified && <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">Verified</span>}
                  </div>
                  <p className="text-sm text-muted mt-0.5">@{u.username} · {u.email}</p>
                  <p className="text-xs text-muted mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString(undefined,{dateStyle:'medium'})}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-ink">{u.testSessions.length}</p>
                  <p className="text-xs text-muted">tests</p>
                </div>
              </div>

              {/* User's sessions */}
              {u.testSessions.length > 0 ? (
                <div className="space-y-3">
                  {u.testSessions.map((s:any) => {
                    const rec = s.recommendation as any
                    const recText = typeof rec==='string'?rec:rec?.text??''
                    return (
                      <div key={s.id} className={`rounded-xl border p-4 ${s.status==='COMPLETED'?'border-accent/10 bg-white':'border-yellow-200 bg-yellow-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.status==='COMPLETED'?'bg-green-100 text-green-700':'bg-yellow-200 text-yellow-800'}`}>
                              {s.status.replace('_',' ')}
                            </span>
                            {s.diagnosisClass && <span className={`px-2 py-0.5 rounded text-xs font-bold ${diagColor(s.diagnosisClass)}`}>{s.diagnosisClass}</span>}
                          </div>
                          <p className="text-xs text-muted">
                            {s.completedAt ? new Date(s.completedAt).toLocaleString() : new Date(s.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {s.status === 'COMPLETED' && (
                          <div className="grid grid-cols-4 gap-3 text-xs mt-2">
                            {[
                              ['Right Sph', sph(s.sphRight)],
                              ['Left Sph',  sph(s.sphLeft)],
                              ['Va OD',     va(s.acuityRight)],
                              ['Va OS',     va(s.acuityLeft)],
                            ].map(([l,v])=>(
                              <div key={String(l)}>
                                <span className="block text-muted">{l}</span>
                                <span className="font-mono font-semibold text-ink">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {recText && <p className="text-xs text-muted mt-2 italic">{recText}</p>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted">No tests yet.</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
