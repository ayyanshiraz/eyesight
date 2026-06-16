"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const nav = [
  { href: "/admin",         label: "Dashboard",     icon: "📊" },
  { href: "/admin/users",   label: "Total Users",   icon: "👥" },
  { href: "/admin/tests",   label: "Total Tests",   icon: "🔬" },
  { href: "/admin/manage",  label: "User Management", icon: "⚙️" },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 min-h-screen bg-ink text-white flex flex-col">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10">
        <p className="text-xs font-medium uppercase tracking-widest text-white/50 mb-1">ClearSight</p>
        <p className="font-display text-lg font-medium">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <Link href="/dashboard" className="text-xs text-white/50 hover:text-white transition-colors">
          ← Back to App
        </Link>
      </div>
    </aside>
  )
}
