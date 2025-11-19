import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prefer POSTGRES_PRISMA_URL (Vercel Postgres) if available, otherwise use DATABASE_URL
let databaseUrl = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || ''

// Add connection pool parameters if not already present
if (databaseUrl && !databaseUrl.includes('connection_limit=')) {
  const separator = databaseUrl.includes('?') ? '&' : '?'
  // Increase connection limit and timeout for better performance
  const connectionLimit = process.env.NODE_ENV === 'production' ? 25 : 30
  const poolTimeout = 20
  databaseUrl = `${databaseUrl}${separator}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Ensure connections are properly closed on process termination
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
  
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}
