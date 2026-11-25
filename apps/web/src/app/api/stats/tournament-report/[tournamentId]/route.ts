import { NextRequest, NextResponse } from 'next/server'
import { requireComision } from '@/lib/api-auth'
import { generateTournamentReportWorkbook } from '@/lib/tournament-report'
import { AppError, withErrorHandler } from '@/lib/errors'
import { parseParams } from '@/lib/http'
import { tournamentIdParamsSchema } from '@poker/shared'

/**
 * Excepcion de formato: es una descarga (.xlsx), asi que la respuesta correcta
 * es el archivo, no `{ success, data }`. Los errores si salen en el formato
 * estandar de la API.
 */
export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) => {
  await requireComision(request)
  const { tournamentId } = parseParams(await params, tournamentIdParamsSchema)

  const result = await generateTournamentReportWorkbook(tournamentId)
  if (!result) {
    throw AppError.notFound('Torneo no encontrado')
  }

  const buffer = await result.workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="torneo-${result.tournamentNumber}-reporte.xlsx"`
    }
  })
})
