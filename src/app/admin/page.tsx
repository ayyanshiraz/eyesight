import { prisma } from "@/lib/prisma"

// Date filter helper
function getDateFilter(from?: string, to?: string) {
  if (!from && !to) return undefined
  const filter: any = {}
  if (from) filter.gte = new Date(from)
  if (to) { const d = new Date(to); d.setHours(23,59,59,999); filter.lte = d }
  return filter
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; preset?: string }
}) {
  // Resolve preset shortcuts
  let from = searchParams.from
  let to   = searchParams.to
  const today = new Date()

  if (searchParams.preset === "today") {
    from = today.toISOString().slice(0,10)
    to   = today.toISOString().slice(0,10)
  } else if (searchParams.preset === "month") {
    from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0,10)
    to   = today.toISOString().slice(0,10)
  } else if (searchParams.preset === "week") {
    const d = new Date(today); d.setDate(d.getDate() - 7)
    from = d.toISOString().slice(0,10)
    to   = today.toISOString().slice(0,10)
  }

  const dateFilter = getDateFilter(from, to)

  const [totalUsers, totalSessions, completedSessions, inProgress, recentTests] = await Promise.all([
    prisma.user.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
    prisma.testSession.count({ where: dateFilter ? { createdAt: dateFilter } : undefined }),
    prisma.testSession.count({ where: { status: "COMPLETED", ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
    prisma.testSession.count({ where: { status: "IN_PROGRESS", ...(dateFilter ? { createdAt: dateFilter } : {}) } }),
    prisma.testSession.findMany({
      where: { status: "COMPLETED", ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { completedAt: "desc" },
      take: 8,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ])

  const stats = [
    { label: "Total Users",      value: totalUsers,       color: "bg-blue-500",   icon: "👥" },
    { label: "Total Tests",       value: totalSessions,    color: "bg-accent",     icon: "🔬" },
    { label: "Completed Tests",   value: completedSessions,color: "bg-green-500",  icon: "✅" },
    { label: "In Progress",       value: inProgress,       color: "bg-yellow-500", icon: "⏳" },
  ]

  const diagColor = (d: string|null) => ({
    MYOPIA:"bg-blue-100 text-blue-800", HYPEROPIA:"bg-orange-100 text-orange-800",
    EMMETROPIA:"bg-green-100 text-green-800", ASTIGMATISM:"bg-yellow-100 text-yellow-800",
    MIXED:"bg-red-100 text-red-800",
  }[d??""]) ?? "bg-gray-100 text-gray-700"

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of all platform activity</p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <form action="/api/admin/cleanup" method="POST">
          <button type="submit"
            className="px-4 py-2 rounded-xl bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 transition-colors">
            🧹 Mark abandoned sessions (7d+)
          </button>
        </form>
        <a href="/admin/users" className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-accent hover:text-accent transition-colors">
          Manage users →
        </a>
      </div>

      {/* Date filter */}
      <form method="GET" className="flex flex-wrap items-center gap-3 mb-8 bg-white border border-gray-200 rounded-2xl p-4">
        <span className="text-sm font-medium text-gray-600">Filter by date:</span>

        {/* Presets */}
        {[
          { label: "All Time", preset: "" },
          { label: "Today",    preset: "today" },
          { label: "This Week",preset: "week" },
          { label: "This Month",preset:"month" },
        ].map(p => (
          <a key={p.label} href={p.preset ? `?preset=${p.preset}` : "/admin"}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              (searchParams.preset===p.preset) || (!searchParams.preset && !p.preset && !from)
                ? "bg-accent text-white border-accent"
                : "bg-white text-gray-600 border-gray-200 hover:border-accent hover:text-accent"
            }`}>
            {p.label}
          </a>
        ))}

        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-gray-500">From</label>
          <input type="date" name="from" defaultValue={from}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
          <label className="text-sm text-gray-500">To</label>
          <input type="date" name="to" defaultValue={to}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
          <button type="submit"
            className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-accent-dark transition-colors">
            Apply
          </button>
        </div>
      </form>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-lg mb-3`}>
              {s.icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            {(from||to) && <p className="text-xs text-accent mt-1">filtered</p>}
          </div>
        ))}
      </div>

      {/* Recent tests */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Completed Tests</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {["Patient","Date","Right Sph","Left Sph","Diagnosis","Va OD","Va OS"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentTests.map((s: any) => (
              <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{s.user?.firstName} {s.user?.lastName}</td>
                <td className="px-4 py-3 text-gray-500">{s.completedAt ? new Date(s.completedAt).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3 font-mono">{s.sphRight!=null?`${s.sphRight>0?"+":""}${s.sphRight.toFixed(2)}`:"—"}</td>
                <td className="px-4 py-3 font-mono">{s.sphLeft!=null?`${s.sphLeft>0?"+":""}${s.sphLeft.toFixed(2)}`:"—"}</td>
                <td className="px-4 py-3">
                  {s.diagnosisClass && <span className={`px-2 py-0.5 rounded text-xs font-bold ${diagColor(s.diagnosisClass)}`}>{s.diagnosisClass}</span>}
                </td>
                <td className="px-4 py-3 font-mono text-accent">{s.acuityRight?`6/${Math.round(20/s.acuityRight*3)}`:"—"}</td>
                <td className="px-4 py-3 font-mono text-accent">{s.acuityLeft?`6/${Math.round(20/s.acuityLeft*3)}`:"—"}</td>
              </tr>
            ))}
            {recentTests.length===0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No completed tests in this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
