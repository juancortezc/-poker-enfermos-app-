/**
 * Motor del timer de blinds. Funcion pura: sin base de datos, sin red, sin
 * React. Todo lo que hace es responder "dado este ancla y esta hora, en que
 * nivel estamos y cuanto falta".
 *
 * POR QUE ASI
 *
 * La version anterior guardaba `timeRemaining`, `totalElapsed` y
 * `pausedDuration`: contadores que alguien tenia que ir actualizando. Cada
 * pausa, reanudacion y cambio de nivel era un leer-calcular-escribir, y con
 * dos pestanas abiertas o un doble clic los numeros se separaban de la
 * realidad. El timer se apago dos veces por eso.
 *
 * Aqui no se guarda el tiempo: se guarda un ANCLA de tres datos que solo
 * cambia cuando alguien toca un boton, y el resto se deriva.
 *
 *   - Pausar dos veces escribe el mismo ancla. Las acciones son idempotentes.
 *   - El nivel avanza solo aunque no haya ningun dispositivo abierto, porque
 *     avanzar es una cuenta, no una escritura.
 *   - Sobrevive que se cierre la app, que el telefono duerma, que se caiga la
 *     red o que se reinicie el servidor.
 */

export type TimerStatus = 'inactive' | 'active' | 'paused' | 'completed'

/** Un nivel de la estructura de blinds. `durationMs` 0 = sin limite. */
export interface BlindSpec {
  level: number
  smallBlind: number
  bigBlind: number
  durationMs: number
}

/**
 * Lo unico que se persiste.
 *
 * `anchorAt` en null significa que el reloj no corre: el tiempo transcurrido
 * es exactamente `anchorElapsedMs` y no depende de la hora actual.
 */
export interface TimerAnchor {
  status: TimerStatus
  anchorLevel: number
  anchorElapsedMs: number
  anchorAt: Date | null
}

/** Lo que se muestra. Nada de esto se guarda: todo sale de resolveTimer(). */
export interface TimerView {
  status: TimerStatus
  level: number
  blind: BlindSpec | null
  nextBlind: BlindSpec | null
  elapsedInLevelMs: number
  remainingMs: number
  /** Instante absoluto del cambio. Es lo que usa el cliente para programar el
   *  sonido, en vez de ir descontando de a un segundo. null si no corre. */
  levelEndsAt: Date | null
  isUnlimited: boolean
  isLastLevel: boolean
}

const MINUTO_MS = 60_000

/** Convierte las filas de BlindLevel (duracion en minutos) a specs del motor. */
export function toBlindSpecs(
  levels: Array<{ level: number; smallBlind: number; bigBlind: number; duration: number }>
): BlindSpec[] {
  return [...levels]
    .sort((a, b) => a.level - b.level)
    .map((l) => ({
      level: l.level,
      smallBlind: l.smallBlind,
      bigBlind: l.bigBlind,
      durationMs: Math.max(0, l.duration) * MINUTO_MS,
    }))
}

function buscarNivel(levels: BlindSpec[], level: number): BlindSpec | null {
  return levels.find((l) => l.level === level) ?? null
}

/** Estado inicial: nada empezado. */
export function initialAnchor(): TimerAnchor {
  return { status: 'inactive', anchorLevel: 1, anchorElapsedMs: 0, anchorAt: null }
}

/**
 * El corazon: (ancla, niveles, ahora) -> que se ve en pantalla.
 *
 * Avanza de nivel consumiendo duraciones mientras alcance el tiempo corrido.
 * Un nivel con duracion 0 es "sin limite" y detiene el avance: se queda ahi
 * hasta que alguien adelante a mano.
 */
export function resolveTimer(
  anchor: TimerAnchor,
  levels: BlindSpec[],
  now: Date
): TimerView {
  const vacio: TimerView = {
    status: anchor.status,
    level: anchor.anchorLevel,
    blind: null,
    nextBlind: null,
    elapsedInLevelMs: 0,
    remainingMs: 0,
    levelEndsAt: null,
    isUnlimited: false,
    isLastLevel: true,
  }

  if (levels.length === 0 || anchor.status === 'inactive') {
    return vacio
  }

  const ultimo = levels[levels.length - 1]

  // Tiempo corrido desde el ancla. Si esta pausado, el reloj no suma. El
  // max(0) cubre el desfase de relojes: un cliente adelantado no puede
  // producir un transcurrido negativo.
  const desdeElAncla =
    anchor.status === 'active' && anchor.anchorAt
      ? Math.max(0, now.getTime() - anchor.anchorAt.getTime())
      : 0

  let presupuesto = Math.max(0, anchor.anchorElapsedMs) + desdeElAncla
  let nivel = anchor.anchorLevel
  let actual = buscarNivel(levels, nivel)

  // Si el ancla apunta a un nivel que no existe, se cae al ultimo.
  if (!actual) {
    actual = ultimo
    nivel = ultimo.level
  }

  // Consumir niveles completos. Los de duracion 0 no se consumen nunca.
  while (actual && actual.durationMs > 0 && presupuesto >= actual.durationMs) {
    const siguiente = levels.find((l) => l.level > nivel)
    if (!siguiente) {
      // Se acabo la estructura: queda parado al final del ultimo nivel.
      return {
        status: 'completed',
        level: actual.level,
        blind: actual,
        nextBlind: null,
        elapsedInLevelMs: actual.durationMs,
        remainingMs: 0,
        levelEndsAt: null,
        isUnlimited: false,
        isLastLevel: true,
      }
    }
    presupuesto -= actual.durationMs
    nivel = siguiente.level
    actual = siguiente
  }

  if (!actual) return vacio

  const sinLimite = actual.durationMs === 0
  const restante = sinLimite ? 0 : Math.max(0, actual.durationMs - presupuesto)
  const corriendo = anchor.status === 'active'

  return {
    status: anchor.status,
    level: actual.level,
    blind: actual,
    nextBlind: levels.find((l) => l.level > actual!.level) ?? null,
    elapsedInLevelMs: presupuesto,
    remainingMs: restante,
    levelEndsAt: corriendo && !sinLimite ? new Date(now.getTime() + restante) : null,
    isUnlimited: sinLimite,
    isLastLevel: actual.level === ultimo.level,
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Acciones. Todas devuelven un ancla nueva; ninguna muta la anterior.
 * Son idempotentes: repetir la misma accion no acumula efectos.
 * ──────────────────────────────────────────────────────────────────────── */

/** Arranca desde el primer nivel. */
export function startTimer(levels: BlindSpec[], now: Date): TimerAnchor {
  return {
    status: 'active',
    anchorLevel: levels[0]?.level ?? 1,
    anchorElapsedMs: 0,
    anchorAt: now,
  }
}

/** Congela el reloj donde esta. Pausar dos veces deja el mismo ancla. */
export function pauseTimer(anchor: TimerAnchor, levels: BlindSpec[], now: Date): TimerAnchor {
  if (anchor.status !== 'active') return anchor
  const vista = resolveTimer(anchor, levels, now)
  return {
    status: 'paused',
    anchorLevel: vista.level,
    anchorElapsedMs: vista.elapsedInLevelMs,
    anchorAt: null,
  }
}

/** Reanuda desde donde quedo. La cena es exactamente esto: pausar y reanudar. */
export function resumeTimer(anchor: TimerAnchor, now: Date): TimerAnchor {
  if (anchor.status !== 'paused') return anchor
  return { ...anchor, status: 'active', anchorAt: now }
}

/** Vuelve a empezar el nivel actual con su duracion completa. */
export function restartLevel(anchor: TimerAnchor, levels: BlindSpec[], now: Date): TimerAnchor {
  if (anchor.status === 'inactive') return anchor
  const vista = resolveTimer(anchor, levels, now)
  return {
    status: anchor.status === 'completed' ? 'active' : anchor.status,
    anchorLevel: vista.level,
    anchorElapsedMs: 0,
    anchorAt: anchor.status === 'paused' ? null : now,
  }
}

/** Adelanta al siguiente nivel. En el ultimo no hace nada. */
export function advanceLevel(anchor: TimerAnchor, levels: BlindSpec[], now: Date): TimerAnchor {
  if (anchor.status === 'inactive') return anchor
  const vista = resolveTimer(anchor, levels, now)
  const siguiente = levels.find((l) => l.level > vista.level)
  if (!siguiente) return anchor
  return {
    status: anchor.status === 'completed' ? 'active' : anchor.status,
    anchorLevel: siguiente.level,
    anchorElapsedMs: 0,
    anchorAt: anchor.status === 'paused' ? null : now,
  }
}
