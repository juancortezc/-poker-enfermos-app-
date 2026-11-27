/**
 * Editar un torneo ya creado: jugadores inscritos y calendario.
 *
 * Reglas (las aplica la API en PUT /api/tournaments/[id]; la web y la app las
 * usan para avisar antes de guardar):
 * - Torneo FINALIZADO: no se tocan jugadores ni calendario.
 * - Calendario: solo se cambian, agregan o borran fechas que no empezaron
 *   (pending o CREATED). Una fecha en curso, completada o cancelada conserva
 *   su día y su número: no se mueve, no se borra y nada se inserta antes.
 *   Las fechas van en orden, una por día, en martes, y el torneo queda con
 *   10 a 15. `dateNumber` sale de la posición (1..n) y totalDates = n.
 * - Jugadores: inscribir se puede siempre que el torneo siga abierto (también
 *   tarde, con fechas ya jugadas). Quitar, solo a quien no jugó ninguna fecha
 *   del torneo (ni en curso ni completada, ni aparece en sus eliminaciones).
 *   Invitados e inactivos no se inscriben.
 */
import { isGameDateEditable, parseToUTCNoon, validateTuesdayDate, addDaysToDateString, getNextTuesday, formatDateForInput } from './game-dates'

export const MIN_TOURNAMENT_DATES = 10
export const MAX_TOURNAMENT_DATES = 15

/** Fechas que cuentan como jugadas: quien está en ellas ya jugó el torneo. */
export const PLAYED_GAME_DATE_STATUSES = ['in_progress', 'completed'] as const

export interface EditIssue {
  /** conflict: choca con lo ya jugado (409). invalid: datos mal armados (400). */
  kind: 'conflict' | 'invalid'
  code: string
  message: string
  details?: Record<string, unknown>
}

export type EditResult<T> = { ok: true; value: T } | { ok: false; error: EditIssue }

const fail = (kind: EditIssue['kind'], code: string, message: string, details?: Record<string, unknown>) =>
  ({ ok: false, error: { kind, code, message, details } }) as const

/** "YYYY-MM-DD" de un "YYYY-MM-DD" o un ISO. */
export function calendarDay(value: string | Date): string {
  return typeof value === 'string' ? value.split('T')[0] : formatDateForInput(value)
}

// --- Torneo ------------------------------------------------------------------

/** Jugadores y calendario se editan mientras el torneo no terminó. */
export function checkTournamentRosterEditable(t: { number: number; status: string }): EditResult<true> {
  if (t.status === 'FINALIZADO') {
    return fail(
      'conflict',
      'TOURNAMENT_FINISHED',
      `El Torneo ${t.number} ya terminó: no se cambian sus jugadores ni su calendario.`
    )
  }
  return { ok: true, value: true }
}

// --- Calendario --------------------------------------------------------------

export interface CalendarDate {
  id: number
  dateNumber: number
  scheduledDate: string | Date
  status: string
}

export interface CalendarInput {
  /** Sin id: fecha nueva. */
  id?: number | null
  scheduledDate: string
}

export interface CalendarPlan {
  /** Fechas existentes que cambian de día o de número. */
  updates: Array<{ id: number; dateNumber: number; scheduledDate: string }>
  creates: Array<{ dateNumber: number; scheduledDate: string }>
  /** Ids de fechas sin empezar que se borran. */
  removes: number[]
  totalDates: number
  changed: boolean
}

const lockedReason: Record<string, string> = {
  in_progress: 'está en curso',
  completed: 'ya se jugó',
  cancelled: 'está cancelada',
}

function lockedLabel(d: CalendarDate) {
  return `La fecha ${d.dateNumber} ${lockedReason[d.status] ?? 'ya empezó'}`
}

/**
 * Compara el calendario actual con el pedido (lista completa, en orden) y
 * devuelve qué cambiar, o el primer problema en español.
 */
export function planCalendarEdit(
  current: ReadonlyArray<CalendarDate>,
  next: ReadonlyArray<CalendarInput>
): EditResult<CalendarPlan> {
  if (next.length < MIN_TOURNAMENT_DATES || next.length > MAX_TOURNAMENT_DATES) {
    return fail(
      'invalid',
      'CALENDAR_SIZE',
      `El torneo debe tener entre ${MIN_TOURNAMENT_DATES} y ${MAX_TOURNAMENT_DATES} fechas (quedarían ${next.length}).`
    )
  }

  const byId = new Map(current.map((d) => [d.id, d]))
  const seen = new Set<number>()
  for (const entry of next) {
    if (entry.id == null) continue
    if (!byId.has(entry.id)) {
      return fail('invalid', 'GAME_DATE_NOT_IN_TOURNAMENT', `La fecha ${entry.id} no es de este torneo. Recarga e intenta de nuevo.`)
    }
    if (seen.has(entry.id)) {
      return fail('invalid', 'DUPLICATE_GAME_DATE', 'Una fecha aparece dos veces en el calendario.')
    }
    seen.add(entry.id)
  }

  const days = next.map((e) => calendarDay(e.scheduledDate))
  for (let i = 0; i < days.length; i++) {
    if (Number.isNaN(parseToUTCNoon(days[i]).getTime())) {
      return fail('invalid', 'INVALID_DATE', `La fecha ${i + 1} no es una fecha válida.`)
    }
  }

  // Lo jugado no se mueve: mismo id, misma posición, mismo día.
  for (const d of [...current].sort((a, b) => a.dateNumber - b.dateNumber)) {
    if (isGameDateEditable(d.status)) continue
    const index = next.findIndex((e) => e.id === d.id)
    if (index === -1) {
      return fail('conflict', 'GAME_DATE_LOCKED', `${lockedLabel(d)}: no se puede borrar.`, { dateNumber: d.dateNumber })
    }
    if (index + 1 !== d.dateNumber) {
      return fail(
        'conflict',
        'GAME_DATE_LOCKED',
        `${lockedLabel(d)}: no puede pasar a ser la fecha ${index + 1}. Solo se agregan o quitan fechas después de las jugadas.`,
        { dateNumber: d.dateNumber }
      )
    }
    if (days[index] !== calendarDay(d.scheduledDate)) {
      return fail('conflict', 'GAME_DATE_LOCKED', `${lockedLabel(d)}: no se puede cambiar de día.`, { dateNumber: d.dateNumber })
    }
  }

  // Días nuevos o cambiados: martes, como el resto del calendario.
  for (let i = 0; i < next.length; i++) {
    const cur = next[i].id != null ? byId.get(next[i].id as number) : undefined
    if (cur && calendarDay(cur.scheduledDate) === days[i]) continue
    const tuesday = validateTuesdayDate(days[i])
    if (!tuesday.valid) {
      return fail('invalid', 'INVALID_DATE', `Fecha ${i + 1}: ${tuesday.message ?? 'fecha inválida'}`, { dateNumber: i + 1 })
    }
  }

  for (let i = 1; i < days.length; i++) {
    if (days[i] <= days[i - 1]) {
      return fail(
        'invalid',
        'CALENDAR_ORDER',
        `La fecha ${i + 1} (${days[i]}) tiene que ser después de la fecha ${i} (${days[i - 1]}).`,
        { dateNumber: i + 1 }
      )
    }
  }

  const updates: CalendarPlan['updates'] = []
  const creates: CalendarPlan['creates'] = []
  next.forEach((entry, i) => {
    const dateNumber = i + 1
    const cur = entry.id != null ? byId.get(entry.id) : undefined
    if (!cur) {
      creates.push({ dateNumber, scheduledDate: days[i] })
    } else if (cur.dateNumber !== dateNumber || calendarDay(cur.scheduledDate) !== days[i]) {
      updates.push({ id: cur.id, dateNumber, scheduledDate: days[i] })
    }
  })
  const removes = current.filter((d) => !seen.has(d.id)).map((d) => d.id)

  return {
    ok: true,
    value: {
      updates,
      creates,
      removes,
      totalDates: next.length,
      changed: updates.length + creates.length + removes.length > 0,
    },
  }
}

/**
 * Formato viejo de PUT (`gameDates: [{ id, scheduledDate }]`, solo las que
 * cambian, sin altas ni bajas) convertido a un calendario completo.
 */
export function calendarFromPatch(
  current: ReadonlyArray<CalendarDate>,
  patch: ReadonlyArray<{ id: number; scheduledDate: string }>
): EditResult<CalendarInput[]> {
  const byId = new Map(patch.map((p) => [p.id, p.scheduledDate]))
  for (const id of byId.keys()) {
    if (!current.some((d) => d.id === id)) {
      return fail('invalid', 'GAME_DATE_NOT_IN_TOURNAMENT', `La fecha ${id} no es de este torneo. Recarga e intenta de nuevo.`)
    }
  }
  return {
    ok: true,
    value: [...current]
      .sort((a, b) => a.dateNumber - b.dateNumber)
      .map((d) => ({ id: d.id, scheduledDate: calendarDay(byId.get(d.id) ?? d.scheduledDate) })),
  }
}

/** Día propuesto para agregar una fecha al final: 14 días después de la última. */
export function nextCalendarDay(days: ReadonlyArray<string>): string {
  const last = days[days.length - 1]
  return last ? addDaysToDateString(calendarDay(last), 14) : formatDateForInput(getNextTuesday())
}

// --- Jugadores ---------------------------------------------------------------

/**
 * Qué fechas jugó cada jugador: las en curso o completadas donde aparece, más
 * las fechas de sus eliminaciones (como eliminado o eliminador).
 */
export function playedDatesByPlayer(
  dates: ReadonlyArray<{ dateNumber: number; status: string; playerIds?: ReadonlyArray<string> | null }>,
  eliminations: ReadonlyArray<{ dateNumber: number; playerIds: ReadonlyArray<string> }> = []
): Record<string, number[]> {
  const played: Record<string, Set<number>> = {}
  const mark = (id: string, n: number) => (played[id] ??= new Set()).add(n)
  for (const d of dates) {
    if (!(PLAYED_GAME_DATE_STATUSES as readonly string[]).includes(d.status)) continue
    for (const id of d.playerIds ?? []) mark(id, d.dateNumber)
  }
  for (const e of eliminations) for (const id of e.playerIds) mark(id, e.dateNumber)
  return Object.fromEntries(Object.entries(played).map(([id, set]) => [id, [...set].sort((a, b) => a - b)]))
}

export interface ParticipantCandidate {
  id: string
  name: string
  role: string
  isActive: boolean
}

export interface ParticipantsPlan {
  add: string[]
  remove: string[]
  /** La lista final, sin repetidos, en el orden pedido. */
  participantIds: string[]
  changed: boolean
}

function joinNames(names: string[]) {
  return names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}

/**
 * Compara los inscritos con la lista pedida. `players` trae al menos a los que
 * se agregan y a los que se quitan (para nombrarlos en los mensajes).
 */
export function planParticipantsEdit(args: {
  current: ReadonlyArray<string>
  next: ReadonlyArray<string>
  played: Readonly<Record<string, ReadonlyArray<number>>>
  players: ReadonlyArray<ParticipantCandidate>
}): EditResult<ParticipantsPlan> {
  const participantIds = [...new Set(args.next)]
  if (participantIds.length === 0) {
    return fail('invalid', 'PARTICIPANTS_EMPTY', 'El torneo debe tener al menos un jugador inscrito.')
  }
  const current = new Set(args.current)
  const wanted = new Set(participantIds)
  const add = participantIds.filter((id) => !current.has(id))
  const remove = [...current].filter((id) => !wanted.has(id))
  const info = new Map(args.players.map((p) => [p.id, p]))
  const name = (id: string) => info.get(id)?.name ?? id

  const missing = add.filter((id) => !info.has(id))
  if (missing.length > 0) {
    return fail('invalid', 'PLAYER_NOT_FOUND', missing.length === 1 ? 'Hay un jugador que no existe.' : `Hay ${missing.length} jugadores que no existen.`, { playerIds: missing })
  }
  const guests = add.filter((id) => info.get(id)?.role === 'Invitado')
  if (guests.length > 0) {
    return fail(
      'invalid',
      'GUEST_NOT_ALLOWED',
      `${joinNames(guests.map(name))} ${guests.length === 1 ? 'es Invitado' : 'son Invitados'}: los invitados juegan fechas sueltas, no se inscriben al torneo.`,
      { playerIds: guests }
    )
  }
  const inactive = add.filter((id) => info.get(id)?.isActive === false)
  if (inactive.length > 0) {
    return fail('invalid', 'PLAYER_INACTIVE', `${joinNames(inactive.map(name))} no ${inactive.length === 1 ? 'está activo' : 'están activos'}.`, {
      playerIds: inactive,
    })
  }

  const blocked = remove.filter((id) => (args.played[id]?.length ?? 0) > 0)
  if (blocked.length > 0) {
    const detail = blocked.map((id) => {
      const n = args.played[id]
      return `${name(id)} (${n.length === 1 ? `fecha ${n[0]}` : `fechas ${n.join(', ')}`})`
    })
    return fail(
      'conflict',
      'PARTICIPANT_HAS_PLAYED',
      `No se puede quitar del torneo a quien ya jugó: ${joinNames(detail)}.`,
      { playerIds: blocked }
    )
  }

  return { ok: true, value: { add, remove, participantIds, changed: add.length + remove.length > 0 } }
}
