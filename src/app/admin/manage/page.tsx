import { prisma } from "@/lib/prisma"
import Link from "next/link"
import UserManageActions from "./UserManageActions"

export default async function AdminManagePage({
  searchParams,
}: { searchParams: { userId?: string; q?: string } }) {
  const users = await prisma.user.findMany({
    where: searchParams.q ? {
      OR: [
        { firstName: { contains: searchParams.q, mode: "insensitive" } },
        { lastName:  { contains: searchParams.q, mode: "insensitive" } },
        { email:     { contains: searchParams.q, mode: "insensitive" } },
      ]
    } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { testSessions: true } } },
  })

  // Selected user detail
  const selected = searchParams.userId
    ? await prisma.user.findUnique({
        where: { id: searchParams.userId },
        include: { _count: { select: { testSessions: true } } },
      })
    : null

  return (
    <div className="p-8 flex gap-6">
      {/* Left: users list */}
      <div className="w-80 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 mb-4">User Management</h1>

        <form method="GET" className="mb-3">
          {searchParams.userId && <input type="hidden" name="userId" value={searchParams.userId} />}
          <input type="text" name="q" defaultValue={searchParams.q} placeholder="Search users…"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        </form>

        <div className="space-y-2">
          {users.map((u: any) => (
            <Link key={u.id} href={`/admin/manage?userId=${u.id}${searchParams.q?`&q=${searchParams.q}`:""}`}
              className={`block rounded-xl border p-3 transition-colors ${
                searchParams.userId===u.id
                  ?"border-accent bg-accent-light"
                  :"border-gray-100 bg-white hover:border-accent/30"
              } ${(u as any).isBanned?"opacity-50":""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{u.firstName} {u.lastName}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-700">{u._count.testSessions} tests</p>
                  {u.isAdmin && <span className="text-xs text-red-600 font-bold">ADMIN</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Right: user detail + actions */}
      <div className="flex-1">
        {selected ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.firstName} {selected.lastName}</h2>
                  <p className="text-gray-500 text-sm">@{selected.username}</p>
                </div>
                <div className="flex gap-2">
                  {selected.isAdmin && <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold">ADMIN</span>}
                  {selected.emailVerified && <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">Verified</span>}
                </div>
              </div>

              {/* Account details */}
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                {[
                  ["First Name",    selected.firstName],
                  ["Last Name",     selected.lastName],
                  ["Username",      "@"+selected.username],
                  ["Email",         selected.email],
                  ["Phone",         selected.phone || "—"],
                  ["Address",       selected.address || "—"],
                  ["Joined",        new Date(selected.createdAt).toLocaleString()],
                  ["Email Verified",selected.emailVerified ? new Date(selected.emailVerified).toLocaleDateString() : "No"],
                  ["Total Tests",   selected._count.testSessions.toString()],
                  ["User ID",       selected.id],
                ].map(([l,v]) => (
                  <div key={String(l)} className="bg-gray-50 rounded-xl px-4 py-3">
                    <dt className="text-xs text-gray-400 mb-0.5">{l}</dt>
                    <dd className="font-medium text-gray-900 break-all">{v}</dd>
                  </div>
                ))}
              </div>

              {/* Password hash (shown for admin transparency) */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
                <dt className="text-xs text-yellow-600 font-medium mb-1">Password Hash (bcrypt)</dt>
                <dd className="font-mono text-xs text-gray-700 break-all">{selected.passwordHash}</dd>
                <p className="text-xs text-yellow-600 mt-1">⚠️ This is a one-way hash. Use "Change Password" below to set a new one.</p>
              </div>

              {/* Actions component */}
              <UserManageActions userId={selected.id} userEmail={selected.email} userName={`${selected.firstName} ${selected.lastName}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-white rounded-2xl border border-gray-100 text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">👈</p>
              <p className="font-medium">Select a user to manage</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
