import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET /api/stats/active-users - Obtener usuarios activos en los últimos N días
export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url)
      const days = parseInt(searchParams.get('days') || '7')

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

      return NextResponse.json({
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
    } catch (error) {
      console.error('Error fetching active users:', error)
      return NextResponse.json(
        { error: 'Error fetching active users' },
        { status: 500 }
      )
    }
  })
}
