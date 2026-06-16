import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function AdminUsersPage({
  searchParams,
}: { searchParams: { from?: string; to?: string; preset?: string; q?: string } }) {
  const today = new Date()
  let from = searchParams.from
  let to   = searchParams.to

  if (searchParams.preset === "today") {
    from = today.toISOString().slice(0,10); to = from
  } else if (searchParams.preset === "week") {
    const d = new Date(today); d.setDate(d.getDate()-7)
    from = d.toISOString().slice(0,10); to = today.toISOString().slice(0,10)
  } else if (searchParams.preset === "month") {
    from = new Date(today.getFullYear(),today.getMonth(),1).toISOString().slice(0,10)
    to   = today.toISOString().slice(0,10)
  }

  const dateFilter = from || to ? {
    gte: from ? new Date(from) : undefined,
    lte: to   ? (() => { const d=new Date(to); d.setHours(23,59,59,999); return d })() : undefined,
  } : undefined

  const users = await prisma.user.findMany({
    where: {
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...(searchParams.q ? {
        OR: [
          { firstName: { contains: searchParams.q, mode: "insensitive" } },
          { lastName:  { contains: searchParams.q, mode: "insensitive" } },
          { email:     { contains: searchParams.q, mode: "insensitive" } },
          { username:  { contains: searchParams.q, mode: "insensitive" } },
        ]
      } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { testSessions: true } } },
  })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Total Users</h1>
        <p className="text-gray-500 text-sm mt-1">{users.length} user{users.length!==1?"s":""} found</p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3 mb-6 bg-white border border-gray-200 rounded-2xl p-4">
        <input type="text" name="q" defaultValue={searchParams.q} placeholder="Search name, email, username…"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-accent flex-1 min-w-48" />

        {[{l:"All Time",p:""},{l:"Today",p:"today"},{l:"This Week",p:"week"},{l:"This Month",p:"month"}].map(p=>(
          <a key={p.l} href={p.p?`/admin/users?preset=${p.p}`:"/admin/users"}
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

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Name","Username","Email","Phone","Joined","Verified","Tests","Actions"].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u:any) => (
              <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                  {u.isAdmin && <span className="text-xs text-red-600 font-bold">ADMIN</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">@{u.username}</td>
                <td className="px-4 py-3 text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone||"—"}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${u.emailVerified?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700"}`}>
                    {u.emailVerified?"Yes":"No"}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">{u._count.testSessions}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/manage?userId=${u.id}`}
                    className="text-xs font-medium text-accent hover:underline">
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
            {users.length===0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
