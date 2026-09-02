import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendNotificationIfEnabled } from '@/lib/notification-config'

/**
 * GET /api/cron/birthdays
 *
 * Triggered daily by Vercel Cron at 12:00 UTC (7:00am Ecuador, no DST).
 * Sends a broadcast push for every active player whose birthday is today.
 * Idempotent: skips players already notified in the last 20 hours in case
 * the cron fires more than once.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const now = new Date()
    // Cron always fires at 12:00 UTC, which is 7:00am Ecuador — same calendar day either way.
    const todayMonth = now.getUTCMonth() + 1
    const todayDay = now.getUTCDate()

    const players = await prisma.player.findMany({
      where: {
        isActive: true,
        role: { in: ['Comision', 'Enfermo'] },
        birthDate: { not: null }
      },
      select: { id: true, firstName: true, lastName: true, birthDate: true }
    })

    const birthdayPlayers = players.filter((player) => {
      const parts = player.birthDate!.split('-')
      let month: number
      let day: number
      if (parts.length === 3) {
        month = parseInt(parts[1], 10)
        day = parseInt(parts[2], 10)
      } else if (parts.length === 2) {
        month = parseInt(parts[0], 10)
        day = parseInt(parts[1], 10)
      } else {
        return false
      }
      return month === todayMonth && day === todayDay
    })

    if (birthdayPlayers.length === 0) {
      return NextResponse.json({ success: true, checked: players.length, birthdays: 0 })
    }

    const recentlyNotified = await prisma.notificationHistory.findMany({
      where: {
        eventType: 'player_birthday',
        createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) }
      },
      select: { metadata: true }
    })
    const alreadyNotifiedIds = new Set(
      recentlyNotified
        .map((h) => (h.metadata as { playerId?: string } | null)?.playerId)
        .filter((id): id is string => !!id)
    )

    const results = []
    for (const player of birthdayPlayers) {
      if (alreadyNotifiedIds.has(player.id)) {
        results.push({ playerId: player.id, skipped: true })
        continue
      }

      const result = await sendNotificationIfEnabled(
        'player_birthday',
        '🎂 Cumpleaños',
        `Hoy es el cumpleaños de ${player.firstName} ${player.lastName}. ¡Felicítalo!`,
        { playerId: player.id }
      )
      results.push({ playerId: player.id, ...result })
    }

    return NextResponse.json({
      success: true,
      checked: players.length,
      birthdays: birthdayPlayers.length,
      results
    })
  } catch (error) {
    console.error('[BIRTHDAY CRON ERROR]', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
