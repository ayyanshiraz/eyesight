import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import LogoutButton from "./LogoutButton"

export default async function Navbar() {
  const user = await getCurrentUser()
  
  // Find if there is an active session waiting for the camera test
  let activeSession = null
  if (user) {
    activeSession = await prisma.testSession.findFirst({
      where: { userId: user.id, status: "IN_PROGRESS" },
      orderBy: { createdAt: "desc" }
    })
  }

  return (
    <header className="border-b border-accent/10 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl font-medium text-ink">
          ClearSight
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="text-ink hover:text-accent-dark">
                Dashboard
              </Link>
              
              <div className="flex items-center gap-2 ml-4 border-l pl-4">
                <Link href="/test" className="btn-secondary px-3 py-1 text-sm">
                  Fill Questions
                </Link>
                
                {activeSession ? (
                  <Link href={`/sessions/${activeSession.id}/camera`} className="btn-primary px-3 py-1 text-sm bg-green-600 hover:bg-green-700">
                    Take Test
                  </Link>
                ) : (
                  <button disabled className="btn-primary px-3 py-1 text-sm bg-gray-300 text-gray-500 cursor-not-allowed" title="Please fill questions first">
                    Take Test (Locked)
                  </button>
                )}
              </div>

              {(user as any).isAdmin && (
                <Link href="/admin" className="text-xs font-bold text-red-600 border border-red-200 bg-red-50 px-3 py-1 rounded-full hover:bg-red-100">
                  Admin Panel
                </Link>
              )}
              <span className="text-muted ml-4">Hi, {user.firstName}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink hover:text-accent-dark">
                Log in
              </Link>
              <Link href="/register" className="btn-primary px-4 py-2 text-sm">
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}