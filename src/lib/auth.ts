import crypto from 'crypto'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const SESSION_COOKIE = 'session_token'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/** Creates a session row, sets the cookie, and returns the token. */
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await prisma.session.create({
    data: { id: token, userId, expiresAt },
  })

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return token
}

/** Returns the logged-in user for the current request, or null. */
export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  })

  if (!session) return null

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {})
    return null
  }

  return session.user
}

/** Deletes the current session and clears the cookie. */
export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value

  if (token) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {})
  }

  cookies().delete(SESSION_COOKIE)
}
