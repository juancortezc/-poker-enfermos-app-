import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withComisionAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  return withComisionAuth(request, async (req, user) => {
    try {
      console.log('Fetching next tournament number for user:', user.id)
      
      // Obtener el último número de torneo
      const lastTournament = await prisma.tournament.findFirst({
        orderBy: { number: 'desc' }
      })

      console.log('Last tournament found:', lastTournament ? `Tournament ${lastTournament.number}` : 'None')

      const nextNumber = lastTournament ? lastTournament.number + 1 : 28

      console.log('Next tournament number:', nextNumber)

      return NextResponse.json({ nextNumber })
    } catch (error) {
      console.error('Error getting next tournament number:', error)
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return NextResponse.json(
        { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  })
}