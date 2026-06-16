import { PrismaClient } from '@prisma/client'

// Next.js reloads modules in dev, which would otherwise create a new
// PrismaClient (and a new connection pool) on every change. Caching it on
// the global object avoids that.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
