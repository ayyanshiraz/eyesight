import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const admin = await getCurrentUser() as any
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!admin.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { userId, action, newPassword } = await req.json()
  if (!userId || !action) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  // Prevent self-deletion
  if (action === "deleteUser" && userId === admin.id) {
    return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 })
  }

  try {
    if (action === "changePassword") {
      if (!newPassword || newPassword.length < 6)
        return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
      const passwordHash = await bcrypt.hash(newPassword, 12)
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
      return NextResponse.json({ message: "Password updated successfully" })
    }

    if (action === "deleteSessions") {
      const deleted = await prisma.testSession.deleteMany({ where: { userId } })
      return NextResponse.json({ message: `Deleted ${deleted.count} test session(s)` })
    }

    if (action === "deleteUser") {
      // Cascade: sessions deleted via FK, sessions first just in case
      await prisma.testSession.deleteMany({ where: { userId } })
      await prisma.verificationToken.deleteMany({ where: { userId } })
      await prisma.session.deleteMany({ where: { userId } })
      await prisma.user.delete({ where: { id: userId } })
      return NextResponse.json({ message: "Account permanently deleted" })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
