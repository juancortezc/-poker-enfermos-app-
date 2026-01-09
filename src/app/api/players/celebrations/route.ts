import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface BirthdayPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
  birthDate: string
  isToday: boolean
  daysUntil: number
}

interface DroughtPlayer {
  id: string
  firstName: string
  lastName: string
  photoUrl: string | null
  lastVictoryDate: string | null
  daysSinceVictory: number
  isOver1000Days: boolean
}

export async function GET() {
  try {
    const today = new Date()
    const todayMonth = today.getMonth() + 1 // 1-12
    const todayDay = today.getDate()

    // Get all active players with birthDate or lastVictoryDate
    const players = await prisma.player.findMany({
      where: {
        isActive: true,
        role: { in: ['Comision', 'Enfermo'] }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        birthDate: true,
        lastVictoryDate: true
      }
    })

    // Process birthdays
    const birthdays: BirthdayPlayer[] = []

    for (const player of players) {
      if (!player.birthDate) continue

      // Parse birthDate - expected format: "YYYY-MM-DD" or "MM-DD"
      const parts = player.birthDate.split('-')
      let birthMonth: number
      let birthDay: number

      if (parts.length === 3) {
        // YYYY-MM-DD format
        birthMonth = parseInt(parts[1], 10)
        birthDay = parseInt(parts[2], 10)
      } else if (parts.length === 2) {
        // MM-DD format
        birthMonth = parseInt(parts[0], 10)
        birthDay = parseInt(parts[1], 10)
      } else {
        continue // Invalid format
      }

      if (isNaN(birthMonth) || isNaN(birthDay)) continue

      const isToday = birthMonth === todayMonth && birthDay === todayDay

      // Calculate days until birthday
      const thisYearBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay)
      let nextBirthday = thisYearBirthday

      if (thisYearBirthday < today && !isToday) {
        // Birthday already passed this year, get next year's
        nextBirthday = new Date(today.getFullYear() + 1, birthMonth - 1, birthDay)
      }

      const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Include if birthday is today or within next 7 days
      if (isToday || (daysUntil > 0 && daysUntil <= 7)) {
        birthdays.push({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          photoUrl: player.photoUrl,
          birthDate: player.birthDate,
          isToday,
          daysUntil: isToday ? 0 : daysUntil
        })
      }
    }

    // Sort birthdays: today first, then by daysUntil
    birthdays.sort((a, b) => {
      if (a.isToday && !b.isToday) return -1
      if (!a.isToday && b.isToday) return 1
      return a.daysUntil - b.daysUntil
    })

    // Process victory droughts (1000+ days without winning)
    const droughts: DroughtPlayer[] = []

    for (const player of players) {
      let daysSinceVictory: number

      if (!player.lastVictoryDate) {
        // Never won - calculate from join date or a default
        // For now, skip players who never won (or we could include them as infinite drought)
        continue
      }

      // Parse lastVictoryDate - expected format: "YYYY-MM-DD"
      const victoryDate = new Date(player.lastVictoryDate)
      if (isNaN(victoryDate.getTime())) continue

      daysSinceVictory = Math.floor((today.getTime() - victoryDate.getTime()) / (1000 * 60 * 60 * 24))

      // Only include if >= 1000 days
      if (daysSinceVictory >= 1000) {
        droughts.push({
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          photoUrl: player.photoUrl,
          lastVictoryDate: player.lastVictoryDate,
          daysSinceVictory,
          isOver1000Days: true
        })
      }
    }

    // Sort droughts by daysSinceVictory descending (longest drought first)
    droughts.sort((a, b) => b.daysSinceVictory - a.daysSinceVictory)

    return NextResponse.json({
      birthdays,
      droughts,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching celebrations:', error)
    return NextResponse.json(
      { error: 'Error al obtener celebraciones' },
      { status: 500 }
    )
  }
}
