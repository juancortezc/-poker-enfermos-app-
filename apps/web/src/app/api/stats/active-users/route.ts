import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireComision } from '@/lib/api-auth'
import { withErrorHandler } from '@/lib/errors'
import { ok, parseQuery } from '@/lib/http'
import { activeUsersQuerySchema } from '@poker/shared'

export const dynamic = 'force-dynamic'

// GET /api/stats/active-users - Obtener usuarios activos en los últimos N días
export const GET = withErrorHandler(async (request: NextRequest) => {
  await requireComision(request)
  const { days } = parseQuery(request, activeUsersQuerySchema)

  const since = new Date()
  since.setDate(since.getDate() - days)

  // Usuarios con actividad reciente
  const activeUsers = await prisma.player.findMany({
    where: {
      lastActiveAt: { gte: since },
      isActive: true
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      lastActiveAt: true,
      photoUrl: true
    },
    orderBy: { lastActiveAt: 'desc' }
  })

  // Usuarios sin actividad reciente (pero activos en el sistema)
  const inactiveUsers = await prisma.player.findMany({
    where: {
      isActive: true,
      OR: [
        { lastActiveAt: null },
        { lastActiveAt: { lt: since } }
      ]
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      lastActiveAt: true,
      photoUrl: true
    },
    orderBy: { lastName: 'asc' }
  })

  return ok({
    days,
    since: since.toISOString(),
    activeUsers: {
      count: activeUsers.length,
      users: activeUsers.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        lastActiveAt: u.lastActiveAt?.toISOString(),
        photoUrl: u.photoUrl
      }))
    },
    inactiveUsers: {
      count: inactiveUsers.length,
      users: inactiveUsers.map(u => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        lastActiveAt: u.lastActiveAt?.toISOString() || null,
        photoUrl: u.photoUrl
      }))
    }
  })
})
