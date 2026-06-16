import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/auth/me - returns the logged-in user, or 401 if not signed in.
// Used by client components (e.g. the nav bar) to know whether to show
// "Log in" or the account menu.
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  })
}
