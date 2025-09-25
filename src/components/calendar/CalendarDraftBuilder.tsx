'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import LoadingState from '@/components/ui/LoadingState'
import { generateTournamentDates } from '@/lib/date-utils'
import { buildAuthHeaders, getStoredAuthToken } from '@/lib/client-auth'
import { fetchCalendarDraft, saveCalendarDraft } from '@/lib/calendar-draft'
import { CalendarDays, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'

interface GeneratedDate {
  dateNumber: number
  scheduledDate: string
}

const createInitialDates = () => {
  const today = new Date()
  return generateTournamentDates(today, 12)
}

export default function CalendarDraftBuilder() {
  const { user } = useAuth()
  const router = useRouter()
  const [gameDates, setGameDates] = useState<GeneratedDate[]>(createInitialDates)
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState('Cargando calendario guardado...')
  const [error, setError] = useState('')
  const [nextNumber, setNextNumber] = useState<number | null>(null)
  const [customNumber, setCustomNumber] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showApproveConfirm, setShowApproveConfirm] = useState(false)
  const [approving, setApproving] = useState(false)
  const hasLoadedRef = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const tournamentNumber = customNumber ?? nextNumber ?? null

  const fetchNextTournamentNumber = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setNextNumber(null)
      return null
    }

    try {
      const response = await fetch('/api/tournaments/next-number', {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setNextNumber(data.nextNumber)
        setCustomNumber(prev => prev ?? data.nextNumber)
        return data.nextNumber as number
      }
    } catch (err) {
      console.error('Error fetching next tournament number:', err)
      setError('No se pudo obtener el número sugerido del torneo.')
    }

    return null
  }, [])

  useEffect(() => {
    if (!user) return

    if (user.role !== UserRole.Comision) {
      router.push('/admin')
      return
    }

    let cancelled = false

    const initialize = async () => {
      setLoading(true)
      setLoadingMessage('Cargando calendario guardado...')
      setError('')

      try {
        if (getStoredAuthToken()) {
          const draft = await fetchCalendarDraft()
          if (!cancelled && draft?.gameDates?.length === 12) {
            setGameDates(draft.gameDates as GeneratedDate[])
            if (draft.tournamentNumber !== undefined && draft.tournamentNumber !== null) {
              setCustomNumber(draft.tournamentNumber)
            }
          }
        }

        if (!cancelled) {
          await fetchNextTournamentNumber()
        }
      } catch (err) {
        console.error('Error initializing calendar draft builder:', err)
        if (!cancelled) {
          setError('No se pudo cargar el calendario guardado.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setLoadingMessage('')
          hasLoadedRef.current = true
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [user, router, fetchNextTournamentNumber])

  useEffect(() => {
    if (!hasLoadedRef.current) return
    if (!getStoredAuthToken()) return

    const hasIncompleteDates = gameDates.some(date => !date.scheduledDate)
    if (hasIncompleteDates) {
      setIsSaving(false)
      return
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    let cancelled = false
    const numberToPersist = customNumber ?? nextNumber ?? null

    saveTimeoutRef.current = setTimeout(() => {
      saveCalendarDraft({
        tournamentNumber: numberToPersist,
        gameDates
      })
        .then(() => {
          if (cancelled) return
          setIsSaving(false)
          setError('')
        })
        .catch(() => {
          if (cancelled) return
          setIsSaving(false)
          setError('No se pudo guardar el calendario. Intenta nuevamente.')
        })
    }, 600)

    setIsSaving(true)

    return () => {
      cancelled = true
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      setIsSaving(false)
    }
  }, [gameDates, customNumber, nextNumber])

  const generateGameDates = useCallback((startDateISO: string) => {
    const startDate = new Date(startDateISO + 'T12:00:00.000Z')
    return generateTournamentDates(startDate, 12)
  }, [])

  const updateGameDate = useCallback((index: number, scheduledDate: string) => {
    if (!scheduledDate || scheduledDate.trim() === '') {
      const updatedDates = [...gameDates]
      updatedDates[index].scheduledDate = ''
      setGameDates(updatedDates)
      return
    }

    const testDate = new Date(scheduledDate + 'T12:00:00.000Z')
    if (isNaN(testDate.getTime())) {
      toast.error('Fecha inválida seleccionada')
      return
    }

    if (index === 0) {
      const generated = generateGameDates(scheduledDate)
      setGameDates(generated)
    } else {
      const updatedDates = [...gameDates]
      updatedDates[index].scheduledDate = scheduledDate

      const remainingCount = 12 - (index + 1)
      if (remainingCount > 0) {
        const regenerated = generateTournamentDates(testDate, remainingCount + 1)
        for (let i = 0; i < remainingCount; i++) {
          updatedDates[index + 1 + i].scheduledDate = regenerated[i + 1].scheduledDate
        }
      }

      setGameDates(updatedDates)
    }
  }, [gameDates, generateGameDates])

  const handleReset = useCallback(() => {
    setGameDates(createInitialDates())
    setError('')
  }, [])

  const validDatesCount = useMemo(() => gameDates.filter(date => date.scheduledDate).length, [gameDates])

  const approveCalendar = useCallback(async () => {
    if (validDatesCount !== 12) {
      toast.error('Debes definir las 12 fechas antes de aprobar el calendario.')
      return
    }

    if (!tournamentNumber) {
      toast.error('No hay un número de torneo sugerido.')
      return
    }

    try {
      setApproving(true)
      await saveCalendarDraft({
        tournamentNumber,
        gameDates
      })

      toast.success('Calendario aprobado. Continúa con la configuración del torneo.')
      router.push(`/tournaments/new/configure?number=${tournamentNumber}&calendarDraft=1`)
    } catch (error) {
      console.error('Error approving calendar:', error)
      toast.error('No se pudo aprobar el calendario. Intenta nuevamente.')
    } finally {
      setApproving(false)
      setShowApproveConfirm(false)
    }
  }, [validDatesCount, tournamentNumber, gameDates, router])

  if (!user || user.role !== UserRole.Comision) {
    return (
      <div className="min-h-screen bg-poker-dark flex items-center justify-center px-4">
        <div className="rounded-xl border border-white/10 bg-black/70 px-6 py-5 text-center text-sm text-white/70">
          Sin permisos para generar calendarios.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-poker-dark pb-safe">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <LoadingState message={loadingMessage || 'Preparando calendario...'} size="md" className="mb-6" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-poker-dark pb-safe">
      <div className="mx-auto max-w-4xl space-y-2 px-3 sm:px-4 py-2">
        <div className="rounded-3xl border border-white/10 bg-poker-card/90 p-3 sm:p-4 shadow-[0_18px_45px_rgba(229,9,20,0.12)] space-y-3">
          <div className="rounded-xl border border-white/5 bg-poker-dark/40 p-2.5 text-xs text-white/70 sm:text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 text-white/60">
              <div className="inline-flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-poker-red" />
                <span>Próximo torneo: <span className="font-semibold text-white">#{tournamentNumber ?? '—'}</span></span>
              </div>
              {nextNumber && tournamentNumber !== nextNumber && (
                <span className="text-yellow-300 text-[11px] sm:text-xs">Sugerido: #{nextNumber}</span>
              )}
            </div>
            <p className="mt-2 text-white/70">
              Puedes cambiar cualquier fecha y el sistema recalcula automáticamente las posteriores.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-200">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {gameDates.map((gameDate, index) => (
              <div
                key={gameDate.dateNumber}
                className="rounded-xl border-2 border-poker-red/40 bg-poker-card p-3 transition-all duration-200 hover:border-poker-red/60 hover:shadow-lg hover:shadow-poker-red/10"
              >
                <div className="space-y-2 text-center">
                  <div className="flex items-center justify-center space-x-2 text-[11px] text-poker-muted">
                    <span className="font-medium uppercase tracking-wide">Fecha {gameDate.dateNumber}</span>
                    {index === 0 && <span className="h-1.5 w-1.5 rounded-full bg-poker-red" />}
                  </div>

                  {(() => {
                    if (!gameDate.scheduledDate) {
                      return (
                        <div className="space-y-1 text-poker-muted">
                          <div className="text-xl font-bold sm:text-2xl">--</div>
                          <div className="text-base font-semibold sm:text-lg">---</div>
                        </div>
                      )
                    }

                    const dateObj = new Date(gameDate.scheduledDate + 'T12:00:00')
                    if (Number.isNaN(dateObj.getTime())) {
                      return (
                        <div className="space-y-1 text-red-400">
                          <div className="text-xl font-bold sm:text-2xl">!</div>
                          <div className="text-base font-semibold sm:text-lg">ERROR</div>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-0.5">
                        <div className="text-xl font-bold text-white sm:text-2xl">{dateObj.getDate()}</div>
                        <div className="text-sm font-semibold text-orange-400 sm:text-base">
                          {dateObj
                            .toLocaleDateString('es-ES', { month: 'short' })
                            .toUpperCase()}
                        </div>
                      </div>
                    )
                  })()}

                  <div>
                    <DatePicker
                      value={gameDate.scheduledDate}
                      onChange={(value) => updateGameDate(index, value)}
                      placeholder={index === 0 ? 'Seleccionar fecha' : 'Auto'}
                      required={index === 0}
                      className="w-full text-xs opacity-80 transition-opacity hover:opacity-100 sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="w-full flex-1 border-white/20 text-poker-text hover:bg-white/5"
          >
            Resetear calendario
          </Button>
          <Button
            type="button"
            onClick={() => setShowApproveConfirm(true)}
            className="w-full flex-1 bg-poker-red text-white hover:bg-red-700"
          >
            <Check className="mr-2 h-4 w-4" />
            Aprobar calendario
          </Button>
        </div>

        <div className="text-xs text-white/50">
          {isSaving ? (
            <div className="inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando borrador...
            </div>
          ) : error ? (
            <div className="text-center text-red-400 font-semibold">
              Revisa tu conexión: no pudimos guardar los últimos cambios.
            </div>
          ) : (
            <div className="text-center text-yellow-300 font-semibold">
              Últimos cambios guardados para revisión de la Comisión.
            </div>
          )}
        </div>
      </div>

      {showApproveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-poker-card p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
            <h2 className="text-lg font-semibold text-white">Confirmar aprobación</h2>
            <p className="mt-3 text-sm text-white/80">
              Al aprobar el calendario será parte del próximo Torneo. ¿Deseas continuar?
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowApproveConfirm(false)}
                className="w-full border-white/20 text-white hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={approveCalendar}
                disabled={approving}
                className="w-full bg-poker-red text-white hover:bg-red-700"
              >
                {approving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aprobando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
