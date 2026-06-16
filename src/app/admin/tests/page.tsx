import { prisma } from "@/lib/prisma"

const diagColor = (d:string|null) => ({
  MYOPIA:"bg-blue-100 text-blue-800", HYPEROPIA:"bg-orange-100 text-orange-800",
  EMMETROPIA:"bg-green-100 text-green-800", ASTIGMATISM:"bg-yellow-100 text-yellow-800",
  MIXED:"bg-red-100 text-red-800",
}[d??""]) ?? "bg-gray-100 text-gray-700"

function sph(v:number|null|undefined){if(v==null)return"—";return`${v>0?"+":""}${v.toFixed(2)}`}
function va(d:number|null|undefined){if(!d)return"—";return`6/${Math.round(20/d*3)}`}

export default async function AdminTestsPage({
  searchParams,
}: { searchParams: { from?:string; to?:string; preset?:string; status?:string } }) {
  const today = new Date()
  let from = searchParams.from
  let to   = searchParams.to

  if (searchParams.preset==="today") { from=today.toISOString().slice(0,10); to=from }
  else if (searchParams.preset==="week") {
    const d=new Date(today); d.setDate(d.getDate()-7)
    from=d.toISOString().slice(0,10); to=today.toISOString().slice(0,10)
  } else if (searchParams.preset==="month") {
    from=new Date(today.getFullYear(),today.getMonth(),1).toISOString().slice(0,10)
    to=today.toISOString().slice(0,10)
  }

  const dateFilter = from||to ? {
    gte: from?new Date(from):undefined,
    lte: to?(()=>{const d=new Date(to);d.setHours(23,59,59,999);return d})():undefined,
  } : undefined

  const status = searchParams.status || "ALL"

  const sessions = await prisma.testSession.findMany({
    where: {
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...(status!=="ALL" ? { status: status as any } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { firstName:true, lastName:true, email:true, username:true } } },
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Total Tests</h1>
        <p className="text-gray-500 text-sm mt-1">{sessions.length} test{sessions.length!==1?"s":""} found</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3 mb-6 bg-white border border-gray-200 rounded-2xl p-4">
        {/* Status filter */}
        <select name="status" defaultValue={status}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent">
          <option value="ALL">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ABANDONED">Abandoned</option>
        </select>

        {[{l:"All Time",p:""},{l:"Today",p:"today"},{l:"This Week",p:"week"},{l:"This Month",p:"month"}].map(p=>(
          <a key={p.l} href={p.p?`/admin/tests?preset=${p.p}${status!=="ALL"?`&status=${status}`:""}`:"/admin/tests"}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              searchParams.preset===p.p||(!searchParams.preset&&!p.p&&!from)
                ?"bg-accent text-white border-accent":"bg-white text-gray-600 border-gray-200 hover:border-accent"}`}>
            {p.l}
          </a>
        ))}
        <input type="date" name="from" defaultValue={from}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
        <input type="date" name="to" defaultValue={to}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent" />
        <button type="submit" className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-accent-dark">Apply</button>
      </form>

      {/* Tests table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Patient","Email","Date","Status","R Sph","L Sph","R Cyl","L Cyl","Va OD","Va OS","Diagnosis"].map(h=>(
                <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s:any) => (
              <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{s.user?.firstName} {s.user?.lastName}</td>
                <td className="px-3 py-3 text-gray-500 text-xs">{s.user?.email}</td>
                <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                  {s.completedAt
                    ? new Date(s.completedAt).toLocaleDateString(undefined,{dateStyle:"medium"})
                    : new Date(s.createdAt).toLocaleDateString(undefined,{dateStyle:"medium"})}
                </td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    s.status==="COMPLETED"?"bg-green-100 text-green-700":
                    s.status==="IN_PROGRESS"?"bg-yellow-100 text-yellow-700":
                    "bg-gray-100 text-gray-600"}`}>
                    {s.status.replace("_"," ")}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-xs">{sph(s.sphRight)}</td>
                <td className="px-3 py-3 font-mono text-xs">{sph(s.sphLeft)}</td>
                <td className="px-3 py-3 font-mono text-xs">{s.cylRight?s.cylRight.toFixed(2):"—"}</td>
                <td className="px-3 py-3 font-mono text-xs">{s.cylLeft?s.cylLeft.toFixed(2):"—"}</td>
                <td className="px-3 py-3 font-mono text-xs text-accent">{va(s.acuityRight)}</td>
                <td className="px-3 py-3 font-mono text-xs text-accent">{va(s.acuityLeft)}</td>
                <td className="px-3 py-3">
                  {s.diagnosisClass && (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${diagColor(s.diagnosisClass)}`}>
                      {s.diagnosisClass}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {sessions.length===0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">No tests found for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
