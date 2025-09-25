import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

const DRAFT_ID = 1

export async function GET(request: NextRequest) {
  return withComisionAuth(request, async () => {
    try {
      const draft = await prisma.calendarDraft.findUnique({
        where: { id: DRAFT_ID }
      })

      return NextResponse.json({ draft })
    } catch (error) {
      console.error('Error fetching calendar draft:', error)
      return NextResponse.json({ error: 'Error fetching calendar draft' }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  return withComisionAuth(request, async (req, user) => {
    try {
      const body = await req.json()
      const { tournamentNumber, gameDates } = body as {
        tournamentNumber?: number | null
        gameDates: Array<{ dateNumber: number; scheduledDate: string }>
      }

      if (!Array.isArray(gameDates) || gameDates.length !== 12) {
        return NextResponse.json({ error: 'Se requieren 12 fechas para el calendario.' }, { status: 400 })
      }

      const hasInvalidDate = gameDates.some((entry, index) => {
        if (typeof entry?.dateNumber !== 'number' || typeof entry?.scheduledDate !== 'string') {
          return true
        }
        const parsedDate = new Date(entry.scheduledDate + 'T12:00:00.000Z')
        if (Number.isNaN(parsedDate.getTime())) {
          return true
        }
        if (entry.dateNumber !== index + 1) {
          return true
        }
        return false
      })

      if (hasInvalidDate) {
        return NextResponse.json({ error: 'Fechas inválidas en el calendario.' }, { status: 400 })
      }

      const draft = await prisma.calendarDraft.upsert({
        where: { id: DRAFT_ID },
        create: {
          id: DRAFT_ID,
          tournamentNumber: tournamentNumber ?? null,
          gameDates,
          updatedBy: user.id
        },
        update: {
          tournamentNumber: tournamentNumber ?? null,
          gameDates,
          updatedBy: user.id
        }
      })

      return NextResponse.json({ draft })
    } catch (error) {
      console.error('Error saving calendar draft:', error)
      return NextResponse.json({ error: 'Error guardando el calendario.' }, { status: 500 })
    }
  })
}

export async function DELETE(request: NextRequest) {
  return withComisionAuth(request, async () => {
    try {
      await prisma.calendarDraft.delete({
        where: { id: DRAFT_ID }
      }).catch(() => null)

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Error deleting calendar draft:', error)
      return NextResponse.json({ error: 'Error eliminando el calendario.' }, { status: 500 })
    }
  })
}
