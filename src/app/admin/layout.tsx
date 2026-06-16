import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import AdminSidebar from "@/components/admin/AdminSidebar"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser() as any
  if (!user) redirect("/login")
  if (!user.isAdmin) redirect("/dashboard")

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
