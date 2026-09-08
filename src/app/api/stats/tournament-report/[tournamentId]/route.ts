import { NextRequest, NextResponse } from 'next/server'
import { withComisionAuth } from '@/lib/api-auth'
import { generateTournamentReportWorkbook } from '@/lib/tournament-report'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  return withComisionAuth(request, async () => {
    try {
      const { tournamentId } = await params
      const tournamentIdNum = parseInt(tournamentId)

      if (isNaN(tournamentIdNum)) {
        return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 })
      }

      const result = await generateTournamentReportWorkbook(tournamentIdNum)

      if (!result) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
      }

      const buffer = await result.workbook.xlsx.writeBuffer()

      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="torneo-${result.tournamentNumber}-reporte.xlsx"`
        }
      })
    } catch (error) {
      console.error('Error generating tournament report:', error)
      return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
    }
  })
}
