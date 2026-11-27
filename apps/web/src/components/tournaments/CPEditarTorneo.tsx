'use client'

/**
 * Editar un torneo ya creado (Comisión): nombre, jugadores inscritos y
 * calendario. Las reglas son las de @poker/shared/tournament-edit, que la API
 * vuelve a aplicar al guardar: lo jugado queda fijo, las fechas pendientes se
 * mueven, agregan o quitan, y se inscribe tarde pero no se quita a quien jugó.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarPlus, Check, Lock, Search, Trash2, X } from 'lucide-react'
import { toast } from 'react-toastify'
import {
  MAX_TOURNAMENT_DATES,
  MIN_TOURNAMENT_DATES,
  calendarDay,
  checkTournamentRosterEditable,
  fullName,
  isGameDateEditable,
  nextCalendarDay,
  planCalendarEdit,
  planParticipantsEdit,
  playedDatesByPlayer,
  rescheduleFrom,
  type CalendarInput,
} from '@poker/shared'
import CPAppShell from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/contexts/AuthContext'
import { apiFetch, apiErrorMessage } from '@/lib/api-client'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: string
  isActive?: boolean
  aliases?: string[]
}

interface TournamentData {
  id: number
  name: string
  number: number
  status: 'PROXIMO' | 'ACTIVO' | 'FINALIZADO'
  gameDates: Array<{ id: number; dateNumber: number; scheduledDate: string; status: string; playerIds: string[] }>
  tournamentParticipants: Array<{ player: Player }>
}

type Row = { key: string; id?: number; scheduledDate: string; status: string }
type Tab = 'jugadores' | 'calendario'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  CREATED: 'Configurada',
  in_progress: 'En curso',
  completed: 'Jugada',
  cancelled: 'Cancelada',
}

function prettyDay(day: string) {
  const d = new Date(`${day}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return day
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const card: React.CSSProperties = {
  background: 'var(--cp-surface)',
  border: '1px solid var(--cp-surface-border)',
  borderRadius: 18,
}
const overline: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--cp-on-surface-muted)',
}
const input: React.CSSProperties = {
  background: 'var(--cp-surface-2)',
  border: '1px solid var(--cp-surface-border)',
  borderRadius: 5,
  color: 'var(--cp-on-surface)',
  fontSize: 15,
}

export default function CPEditarTorneo({ tournamentId }: { tournamentId: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tournament, setTournament] = useState<TournamentData | null>(null)
  const [members, setMembers] = useState<Player[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('jugadores')

  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [shiftNext, setShiftNext] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isComision = user?.role === 'Comision'

  const reset = useCallback((t: TournamentData) => {
    setTournament(t)
    setName(t.name)
    setSelected(t.tournamentParticipants.map((tp) => tp.player.id))
    setRows(
      t.gameDates.map((d) => ({ key: `id-${d.id}`, id: d.id, scheduledDate: calendarDay(d.scheduledDate), status: d.status }))
    )
  }, [])

  const load = useCallback(async () => {
    try {
      setLoadError(null)
      const [t, players] = await Promise.all([
        apiFetch<TournamentData>(`/api/tournaments/${tournamentId}`),
        apiFetch<Player[]>('/api/players?role=Enfermo,Comision'),
      ])
      reset(t)
      setMembers(players.filter((p) => p.isActive !== false))
    } catch (e) {
      setLoadError(apiErrorMessage(e, 'No se pudo cargar el torneo'))
    }
  }, [tournamentId, reset])

  useEffect(() => {
    if (isComision) load()
  }, [isComision, load])

  // --- Derivados ---------------------------------------------------------------

  const played = useMemo(() => (tournament ? playedDatesByPlayer(tournament.gameDates) : {}), [tournament])
  const currentIds = useMemo(() => tournament?.tournamentParticipants.map((tp) => tp.player.id) ?? [], [tournament])

  const pickable = useMemo(() => {
    const extra = tournament?.tournamentParticipants.map((tp) => tp.player).filter((p) => !members.some((m) => m.id === p.id)) ?? []
    return [...members, ...extra].sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'))
  }, [members, tournament])

  const participantsResult = useMemo(
    () =>
      planParticipantsEdit({
        current: currentIds,
        next: selected,
        played,
        players: pickable.map((p) => ({ id: p.id, name: fullName(p), role: p.role, isActive: p.isActive !== false })),
      }),
    [currentIds, selected, played, pickable]
  )

  const calendar: CalendarInput[] = rows.map((r) => ({ id: r.id, scheduledDate: r.scheduledDate }))
  const calendarResult = useMemo(
    () => (tournament ? planCalendarEdit(tournament.gameDates, calendar) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tournament, rows]
  )

  const rosterLock = tournament ? checkTournamentRosterEditable(tournament) : null
  const locked = rosterLock !== null && !rosterLock.ok
  const nameChanged = !!tournament && name.trim() !== tournament.name
  const participantsChanged = participantsResult.ok && participantsResult.value.changed
  const calendarChanged = !!calendarResult && calendarResult.ok && calendarResult.value.changed
  const problem =
    (!participantsResult.ok && participantsResult.error.message) ||
    (calendarResult && !calendarResult.ok && calendarResult.error.message) ||
    (name.trim() === '' && 'El nombre no puede quedar vacío.') ||
    null
  // Hay cambios aunque todavía no sean válidos (para poder descartarlos).
  const rosterTouched = selected.length !== currentIds.length || selected.some((id) => !currentIds.includes(id))
  const calendarTouched =
    !!tournament &&
    (rows.length !== tournament.gameDates.length ||
      rows.some((r, i) => r.id !== tournament.gameDates[i].id || r.scheduledDate !== calendarDay(tournament.gameDates[i].scheduledDate)))
  const dirty = nameChanged || rosterTouched || calendarTouched
  const started = tournament?.gameDates.some((d) => !isGameDateEditable(d.status)) ?? false

  // --- Acciones ---------------------------------------------------------------

  const toggle = (id: string) => {
    setSaveError(null)
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  const changeDay = (index: number, day: string) => {
    if (!day) return
    setSaveError(null)
    setRows((prev) => {
      if (!shiftNext) return prev.map((r, i) => (i === index ? { ...r, scheduledDate: day } : r))
      const moved = rescheduleFrom(prev, index, day)
      // Las fechas fijas nunca se corren.
      return moved.map((r, i) => (isGameDateEditable(prev[i].status) ? r : prev[i]))
    })
  }

  const removeRow = (index: number) => {
    setSaveError(null)
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  const addRow = () => {
    setSaveError(null)
    setRows((prev) => [
      ...prev,
      { key: `new-${Date.now()}`, scheduledDate: nextCalendarDay(prev.map((r) => r.scheduledDate)), status: 'pending' },
    ])
  }

  const discard = () => {
    if (tournament) reset(tournament)
    setSaveError(null)
  }

  const save = async () => {
    if (!tournament || problem) return
    setSaving(true)
    setSaveError(null)
    try {
      const body: Record<string, unknown> = {}
      if (nameChanged) body.name = name.trim()
      if (participantsChanged) body.participantIds = selected
      if (calendarChanged) body.calendar = calendar
      await apiFetch(`/api/tournaments/${tournament.id}`, { method: 'PUT', body: JSON.stringify(body) })
      toast.success(`Torneo ${tournament.number} actualizado`)
      await load()
    } catch (e) {
      setSaveError(apiErrorMessage(e, 'No se pudo guardar el torneo'))
    } finally {
      setSaving(false)
    }
  }

  const cancelTournament = async () => {
    if (!tournament) return
    setDeleting(true)
    try {
      await apiFetch(`/api/tournaments/${tournament.id}`, { method: 'DELETE' })
      toast.success(`Torneo ${tournament.number} cancelado`)
      router.push('/admin')
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo cancelar el torneo'))
    } finally {
      setDeleting(false)
      setConfirmCancel(false)
    }
  }

  // --- Render -----------------------------------------------------------------

  if (authLoading || (isComision && !tournament && !loadError)) return <CPPageSkeleton blocks={[80, 240, 240]} />

  if (!isComision) {
    return (
      <CPAppShell tone="light">
        <div className="min-h-screen flex items-center justify-center px-4">
          <p style={{ color: 'var(--cp-on-surface-muted)' }}>Solo la Comisión puede editar torneos.</p>
        </div>
      </CPAppShell>
    )
  }

  if (!tournament) {
    return (
      <CPAppShell tone="light">
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p style={{ color: 'var(--cp-on-surface)' }}>{loadError}</p>
          <button onClick={load} className="px-4 py-2" style={{ ...input, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </CPAppShell>
    )
  }

  const term = search.trim().toLowerCase()
  const visible = pickable.filter(
    (p) => !term || fullName(p).toLowerCase().includes(term) || (p.aliases ?? []).some((a) => a.toLowerCase().includes(term))
  )
  const added = participantsResult.ok ? participantsResult.value.add.length : 0
  const removed = participantsResult.ok ? participantsResult.value.remove.length : 0

  return (
    <CPAppShell tone="light">
      <div className="min-h-screen" style={{ paddingBottom: 'calc(120px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
          {/* Encabezado */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              aria-label="Volver a Admin"
              className="flex h-11 w-11 shrink-0 items-center justify-center"
              style={{ ...input, background: 'var(--cp-surface)' }}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p style={overline}>Comisión · {tournament.status === 'ACTIVO' ? 'Torneo activo' : tournament.status === 'FINALIZADO' ? 'Finalizado' : 'Próximo'}</p>
              <h1
                style={{
                  fontFamily: 'var(--cp-font-display)',
                  fontWeight: 800,
                  fontSize: 26,
                  letterSpacing: '-0.02em',
                  color: 'var(--cp-on-surface)',
                  lineHeight: 1.1,
                }}
              >
                Editar Torneo {tournament.number}
              </h1>
            </div>
          </div>

          {locked && rosterLock && !rosterLock.ok ? <Notice tone="negative">{rosterLock.error.message}</Notice> : null}
          {!locked && started ? (
            <Notice tone="info">
              El torneo ya empezó: las fechas jugadas quedan fijas. Las pendientes se pueden mover, agregar o quitar, y se
              puede inscribir tarde.
            </Notice>
          ) : null}

          {/* Nombre */}
          <div className="p-4 space-y-2" style={card}>
            <label htmlFor="tournament-name" style={overline}>
              Nombre
            </label>
            <input
              id="tournament-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full px-3 py-2.5"
              style={input}
            />
            <p style={{ fontSize: 12, color: 'var(--cp-on-surface-muted)' }}>El número ({tournament.number}) no se cambia.</p>
          </div>

          {/* Pestañas */}
          <div className="flex gap-1 p-1" style={{ ...card, borderRadius: 5 }} role="tablist">
            {(
              [
                ['jugadores', `Jugadores · ${selected.length}`],
                ['calendario', `Calendario · ${rows.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="flex-1 min-h-[44px] px-2"
                style={{
                  borderRadius: 5,
                  fontWeight: 700,
                  fontSize: 14,
                  background: tab === id ? 'var(--cp-primary)' : 'transparent',
                  color: tab === id ? 'var(--cp-on-primary)' : 'var(--cp-on-surface-muted)',
                  cursor: 'pointer',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'jugadores' ? (
            <div className="p-4 space-y-3" style={card}>
              <div className="flex items-baseline justify-between gap-2">
                <p style={overline}>Inscritos</p>
                <p style={{ fontSize: 13, color: 'var(--cp-on-surface-muted)' }}>
                  {selected.length} de {pickable.length}
                  {added ? <span style={{ color: 'var(--cp-positive-on-light)' }}> · +{added}</span> : null}
                  {removed ? <span style={{ color: 'var(--cp-negative-on-light)' }}> · −{removed}</span> : null}
                </p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--cp-on-surface-medium)' }}>
                Quien ya jugó una fecha del torneo no se puede quitar.
              </p>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cp-on-surface-muted)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar jugador"
                  aria-label="Buscar jugador"
                  className="w-full py-2.5 pl-9 pr-3"
                  style={input}
                />
              </div>
              <ul className="divide-y" style={{ borderColor: 'var(--cp-surface-border)' }}>
                {visible.map((p) => {
                  const on = selected.includes(p.id)
                  const wasIn = currentIds.includes(p.id)
                  const playedDates = played[p.id] ?? []
                  const fixed = wasIn && playedDates.length > 0
                  const disabled = locked || (fixed && on)
                  return (
                    <li key={p.id} style={{ borderColor: 'var(--cp-surface-border)' }}>
                      <label
                        className="flex min-h-[52px] items-center gap-3 py-2"
                        style={{ cursor: disabled ? 'default' : 'pointer', opacity: locked ? 0.6 : 1 }}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={disabled}
                          onChange={() => toggle(p.id)}
                          className="h-5 w-5 shrink-0"
                          style={{ accentColor: 'var(--cp-primary)' }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate" style={{ fontSize: 15, fontWeight: 600, color: 'var(--cp-on-surface)' }}>
                            {fullName(p)}
                          </span>
                          {fixed ? (
                            <span className="flex items-center gap-1" style={{ fontSize: 12, color: 'var(--cp-on-surface-muted)' }}>
                              <Lock size={11} /> Jugó {playedDates.length === 1 ? `la fecha ${playedDates[0]}` : `${playedDates.length} fechas`}
                            </span>
                          ) : on && !wasIn ? (
                            <span style={{ fontSize: 12, color: 'var(--cp-positive-on-light)' }}>Se inscribe al guardar</span>
                          ) : !on && wasIn ? (
                            <span style={{ fontSize: 12, color: 'var(--cp-negative-on-light)' }}>Sale al guardar</span>
                          ) : p.role === 'Comision' ? (
                            <span style={{ fontSize: 12, color: 'var(--cp-on-surface-muted)' }}>Comisión</span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  )
                })}
                {visible.length === 0 ? (
                  <li className="py-6 text-center" style={{ color: 'var(--cp-on-surface-muted)', fontSize: 14 }}>
                    Nadie coincide con la búsqueda.
                  </li>
                ) : null}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 space-y-2" style={card}>
                <div className="flex items-baseline justify-between gap-2">
                  <p style={overline}>Calendario</p>
                  <p style={{ fontSize: 13, color: 'var(--cp-on-surface-muted)' }}>
                    {rows.length} fechas · entre {MIN_TOURNAMENT_DATES} y {MAX_TOURNAMENT_DATES}
                  </p>
                </div>
                <label className="flex min-h-[44px] items-center gap-3" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={shiftNext}
                    onChange={(e) => setShiftNext(e.target.checked)}
                    className="h-5 w-5"
                    style={{ accentColor: 'var(--cp-primary)' }}
                  />
                  <span style={{ fontSize: 14, color: 'var(--cp-on-surface)' }}>
                    Al mover una fecha, correr las siguientes (cada 14 días)
                  </span>
                </label>
              </div>

              <ol className="space-y-2">
                {rows.map((r, i) => {
                  const editable = !locked && isGameDateEditable(r.status)
                  const original = r.id ? tournament.gameDates.find((d) => d.id === r.id) : undefined
                  const moved = original && calendarDay(original.scheduledDate) !== r.scheduledDate
                  const renumbered = original && original.dateNumber !== i + 1
                  return (
                    <li key={r.key} className="flex items-center gap-3 p-3" style={{ ...card, borderRadius: 14 }}>
                      <div className="w-14 shrink-0 text-center">
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cp-on-surface-muted)', letterSpacing: '0.08em' }}>FECHA</p>
                        <p
                          style={{
                            fontFamily: 'var(--cp-font-display)',
                            fontWeight: 800,
                            fontSize: 24,
                            lineHeight: 1,
                            color: 'var(--cp-on-surface)',
                          }}
                        >
                          {i + 1}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        {editable ? (
                          <input
                            type="date"
                            value={r.scheduledDate}
                            onChange={(e) => changeDay(i, e.target.value)}
                            aria-label={`Día de la fecha ${i + 1}`}
                            className="w-full px-2 py-2"
                            style={input}
                          />
                        ) : (
                          <p className="flex items-center gap-1.5 py-2" style={{ fontSize: 15, color: 'var(--cp-on-surface)' }}>
                            <Lock size={13} style={{ color: 'var(--cp-on-surface-muted)' }} />
                            {prettyDay(r.scheduledDate)}
                          </p>
                        )}
                        <p style={{ fontSize: 12, color: 'var(--cp-on-surface-muted)' }}>
                          {editable ? prettyDay(r.scheduledDate) : null}
                          {r.status !== 'pending' ? <span> · {STATUS_LABEL[r.status] ?? r.status}</span> : null}
                          {!r.id ? <span style={{ color: 'var(--cp-positive-on-light)' }}> · Nueva</span> : null}
                          {moved ? <span style={{ color: 'var(--cp-info-on-light)' }}> · Movida</span> : null}
                          {renumbered && !moved ? <span style={{ color: 'var(--cp-info-on-light)' }}> · Antes fecha {original.dateNumber}</span> : null}
                        </p>
                      </div>
                      {editable ? (
                        <button
                          onClick={() => removeRow(i)}
                          aria-label={`Quitar la fecha ${i + 1}`}
                          disabled={rows.length <= MIN_TOURNAMENT_DATES}
                          className="flex h-11 w-11 shrink-0 items-center justify-center"
                          style={{
                            ...input,
                            color: 'var(--cp-negative-on-light)',
                            opacity: rows.length <= MIN_TOURNAMENT_DATES ? 0.35 : 1,
                            cursor: rows.length <= MIN_TOURNAMENT_DATES ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </li>
                  )
                })}
              </ol>

              <button
                onClick={addRow}
                disabled={locked || rows.length >= MAX_TOURNAMENT_DATES}
                className="flex w-full min-h-[48px] items-center justify-center gap-2"
                style={{
                  ...input,
                  background: 'var(--cp-surface)',
                  borderStyle: 'dashed',
                  fontWeight: 700,
                  opacity: locked || rows.length >= MAX_TOURNAMENT_DATES ? 0.4 : 1,
                  cursor: locked || rows.length >= MAX_TOURNAMENT_DATES ? 'not-allowed' : 'pointer',
                }}
              >
                <CalendarPlus size={18} /> Agregar fecha al final
              </button>
            </div>
          )}

          {/* Zona de peligro */}
          <div className="pt-4 text-center">
            <button
              onClick={() => setConfirmCancel(true)}
              className="min-h-[44px] px-4"
              style={{ fontSize: 14, fontWeight: 600, color: 'var(--cp-negative-on-light)', cursor: 'pointer' }}
            >
              Cancelar torneo
            </button>
            <p style={{ fontSize: 12, color: 'var(--cp-on-surface-muted)' }}>Los blinds se editan en Admin → Blinds.</p>
          </div>
        </div>

        {/* Barra de guardar */}
        <div
          className="fixed inset-x-0 bottom-0 z-20 px-4 pt-3"
          style={{
            background: 'var(--cp-background)',
            borderTop: '1px solid var(--cp-surface-border)',
            paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="mx-auto max-w-2xl space-y-2">
            {problem || saveError ? (
              <p role="alert" style={{ fontSize: 13, color: 'var(--cp-negative-on-light)', fontWeight: 600 }}>
                {saveError ?? problem}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                onClick={discard}
                disabled={!dirty || saving}
                className="flex min-h-[48px] items-center justify-center gap-1.5 px-4"
                style={{ ...input, background: 'var(--cp-surface)', fontWeight: 700, opacity: !dirty || saving ? 0.4 : 1 }}
              >
                <X size={16} /> Descartar
              </button>
              <button
                onClick={save}
                disabled={!dirty || !!problem || saving || locked}
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2"
                style={{
                  borderRadius: 5,
                  background: 'var(--cp-primary)',
                  color: 'var(--cp-on-primary)',
                  fontWeight: 800,
                  fontSize: 16,
                  opacity: !dirty || !!problem || saving || locked ? 0.45 : 1,
                  cursor: !dirty || !!problem || saving || locked ? 'not-allowed' : 'pointer',
                }}
              >
                <Check size={18} /> {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={cancelTournament}
        title={`Cancelar el Torneo ${tournament.number}`}
        description="Borra para siempre el torneo con sus fechas, eliminaciones, inscritos, ranking y blinds. No se puede deshacer."
        confirmText="Sí, cancelar torneo"
        cancelText="No, mantenerlo"
        variant="danger"
        isLoading={deleting}
      />
    </CPAppShell>
  )
}

function Notice({ tone, children }: { tone: 'info' | 'negative'; children: React.ReactNode }) {
  const color = tone === 'info' ? 'var(--cp-info-on-light)' : 'var(--cp-negative-on-light)'
  return (
    <div
      className="px-4 py-3"
      style={{ ...card, borderRadius: 14, borderLeft: `4px solid ${color}`, fontSize: 14, color: 'var(--cp-on-surface)' }}
    >
      {children}
    </div>
  )
}
