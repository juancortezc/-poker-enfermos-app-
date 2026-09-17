/**
 * Pruebas del motor del timer. Sin base de datos: el motor es una funcion
 * pura, asi que una noche entera se reproduce en milisegundos.
 *
 *   npx tsx scripts/test-timer-engine.ts
 *
 * Existe porque el timer se apago dos veces sin que nadie pudiera verificar
 * la aritmetica de pausa y reanudacion. Antes de volver a encenderlo, esto
 * tiene que pasar en verde.
 */
import {
  toBlindSpecs,
  resolveTimer,
  initialAnchor,
  startTimer,
  pauseTimer,
  resumeTimer,
  restartLevel,
  advanceLevel,
  type TimerAnchor,
  type BlindSpec,
} from '../src/lib/timer-engine'

let fallas = 0
let pruebas = 0

function ok(condicion: boolean, titulo: string, detalle = '') {
  pruebas++
  if (condicion) {
    console.log(`  OK   ${titulo}`)
  } else {
    fallas++
    console.log(` FALLA ${titulo}${detalle ? ` — ${detalle}` : ''}`)
  }
}

function igual(actual: unknown, esperado: unknown, titulo: string) {
  ok(actual === esperado, titulo, `esperado ${esperado}, obtenido ${actual}`)
}

function seccion(nombre: string) {
  console.log(`\n— ${nombre} —`)
}

const MIN = 60_000
const t0 = new Date('2026-09-17T20:00:00.000Z')
const enMin = (m: number) => new Date(t0.getTime() + m * MIN)

// Estructura real: 25min los primeros, 20 los del medio, 15 los finales.
const NIVELES: BlindSpec[] = toBlindSpecs([
  { level: 1, smallBlind: 50, bigBlind: 100, duration: 25 },
  { level: 2, smallBlind: 100, bigBlind: 200, duration: 25 },
  { level: 3, smallBlind: 150, bigBlind: 300, duration: 25 },
  { level: 4, smallBlind: 200, bigBlind: 400, duration: 20 },
  { level: 5, smallBlind: 300, bigBlind: 600, duration: 20 },
  { level: 6, smallBlind: 400, bigBlind: 800, duration: 15 },
])

// ── Arranque ───────────────────────────────────────────────────────────────
seccion('Arranque')
{
  const a = initialAnchor()
  const v = resolveTimer(a, NIVELES, t0)
  igual(v.status, 'inactive', 'sin arrancar, queda inactivo')
  igual(v.levelEndsAt, null, 'sin arrancar, no hay instante de cambio')

  const corriendo = startTimer(NIVELES, t0)
  const v1 = resolveTimer(corriendo, NIVELES, t0)
  igual(v1.level, 1, 'arranca en el nivel 1')
  igual(v1.remainingMs, 25 * MIN, 'el nivel 1 arranca con sus 25 minutos')
  igual(v1.blind?.bigBlind, 100, 'muestra el blind del nivel 1')
  igual(v1.nextBlind?.level, 2, 'anuncia el nivel siguiente')
  igual(v1.levelEndsAt?.getTime(), enMin(25).getTime(), 'el cambio cae a los 25 minutos')
}

// ── El nivel avanza solo, sin que nadie escriba nada ───────────────────────
seccion('Avance automatico (nadie mirando)')
{
  const a = startTimer(NIVELES, t0)
  igual(resolveTimer(a, NIVELES, enMin(24)).level, 1, 'a los 24 min sigue en el 1')
  igual(resolveTimer(a, NIVELES, enMin(25)).level, 2, 'a los 25 min ya es nivel 2')
  igual(resolveTimer(a, NIVELES, enMin(26)).remainingMs, 24 * MIN, 'al minuto 26 quedan 24 del nivel 2')
  igual(resolveTimer(a, NIVELES, enMin(75)).level, 4, 'a los 75 min va por el nivel 4')

  // Tres horas despues: se pasa de la estructura y queda completado.
  const v = resolveTimer(a, NIVELES, enMin(200))
  igual(v.status, 'completed', 'pasada la estructura queda completado')
  igual(v.level, 6, 'completado se queda en el ultimo nivel')
  igual(v.remainingMs, 0, 'completado no tiene tiempo restante')
}

// ── Pausa y reanudacion (la cena) ──────────────────────────────────────────
seccion('Pausa y reanudacion — la cena')
{
  let a: TimerAnchor = startTimer(NIVELES, t0)

  // Pausan a los 10 minutos del nivel 1.
  a = pauseTimer(a, NIVELES, enMin(10))
  igual(resolveTimer(a, NIVELES, enMin(10)).remainingMs, 15 * MIN, 'al pausar quedan 15 minutos')

  // La cena dura 30. El reloj NO corre.
  igual(resolveTimer(a, NIVELES, enMin(40)).remainingMs, 15 * MIN, 'media hora de cena no consume tiempo')
  igual(resolveTimer(a, NIVELES, enMin(40)).level, 1, 'la cena no cambia de nivel')
  igual(resolveTimer(a, NIVELES, enMin(40)).status, 'paused', 'sigue pausado')

  // Reanudan.
  a = resumeTimer(a, enMin(40))
  igual(resolveTimer(a, NIVELES, enMin(40)).remainingMs, 15 * MIN, 'al reanudar arranca donde quedo')
  igual(resolveTimer(a, NIVELES, enMin(50)).remainingMs, 5 * MIN, 'diez minutos despues quedan 5')
  igual(resolveTimer(a, NIVELES, enMin(55)).level, 2, 'y despues cambia de nivel normalmente')
}

// ── Idempotencia: el bug que rompia la version anterior ────────────────────
seccion('Idempotencia (doble clic, dos pestanas)')
{
  let a: TimerAnchor = startTimer(NIVELES, t0)
  a = pauseTimer(a, NIVELES, enMin(10))
  const unaVez = { ...a }

  // Pausar de nuevo, incluso mas tarde, no debe mover nada.
  a = pauseTimer(a, NIVELES, enMin(12))
  igual(a.anchorElapsedMs, unaVez.anchorElapsedMs, 'pausar dos veces no acumula')
  igual(a.status, 'paused', 'pausar dos veces deja pausado')

  a = resumeTimer(a, enMin(20))
  const trasReanudar = resolveTimer(a, NIVELES, enMin(20)).remainingMs
  a = resumeTimer(a, enMin(25)) // segunda reanudacion, no deberia reanclar
  igual(
    resolveTimer(a, NIVELES, enMin(20)).remainingMs,
    trasReanudar,
    'reanudar dos veces no reinicia el reloj'
  )
}

// ── Reiniciar el nivel actual ──────────────────────────────────────────────
seccion('Reiniciar el nivel actual')
{
  let a: TimerAnchor = startTimer(NIVELES, t0)
  // A los 40 min va por el nivel 2, con 10 corridos.
  igual(resolveTimer(a, NIVELES, enMin(40)).level, 2, 'contexto: nivel 2')

  a = restartLevel(a, NIVELES, enMin(40))
  const v = resolveTimer(a, NIVELES, enMin(40))
  igual(v.level, 2, 'reiniciar mantiene el nivel')
  igual(v.remainingMs, 25 * MIN, 'reiniciar devuelve la duracion completa')
  igual(resolveTimer(a, NIVELES, enMin(50)).remainingMs, 15 * MIN, 'y sigue corriendo desde ahi')

  // Reiniciar estando en pausa no debe destapar el reloj.
  let p: TimerAnchor = startTimer(NIVELES, t0)
  p = pauseTimer(p, NIVELES, enMin(10))
  p = restartLevel(p, NIVELES, enMin(10))
  igual(resolveTimer(p, NIVELES, enMin(30)).status, 'paused', 'reiniciar en pausa sigue pausado')
  igual(resolveTimer(p, NIVELES, enMin(30)).remainingMs, 25 * MIN, 'y con la duracion completa')
}

// ── Adelantar ──────────────────────────────────────────────────────────────
seccion('Adelantar nivel')
{
  let a: TimerAnchor = startTimer(NIVELES, t0)
  a = advanceLevel(a, NIVELES, enMin(5))
  const v = resolveTimer(a, NIVELES, enMin(5))
  igual(v.level, 2, 'adelantar pasa al nivel siguiente')
  igual(v.remainingMs, 25 * MIN, 'el nivel nuevo arranca completo')

  // Adelantar hasta el final y una vez mas.
  let z: TimerAnchor = startTimer(NIVELES, t0)
  for (let i = 0; i < 5; i++) z = advanceLevel(z, NIVELES, enMin(5))
  igual(resolveTimer(z, NIVELES, enMin(5)).level, 6, 'llega al ultimo nivel')
  const antes = { ...z }
  z = advanceLevel(z, NIVELES, enMin(5))
  igual(z.anchorLevel, antes.anchorLevel, 'en el ultimo nivel, adelantar no hace nada')
}

// ── Casos borde ────────────────────────────────────────────────────────────
seccion('Casos borde')
{
  // Reloj del cliente adelantado: no puede producir tiempo negativo.
  const a = startTimer(NIVELES, enMin(10))
  const v = resolveTimer(a, NIVELES, t0) // "ahora" anterior al ancla
  igual(v.remainingMs, 25 * MIN, 'un reloj desfasado no adelanta el nivel')

  // Nivel sin limite: no avanza nunca solo.
  const sinLimite = toBlindSpecs([
    { level: 1, smallBlind: 50, bigBlind: 100, duration: 0 },
    { level: 2, smallBlind: 100, bigBlind: 200, duration: 20 },
  ])
  const s = startTimer(sinLimite, t0)
  const vs = resolveTimer(s, sinLimite, enMin(300))
  igual(vs.level, 1, 'un nivel sin limite no avanza solo')
  ok(vs.isUnlimited, 'se marca como sin limite')
  igual(vs.levelEndsAt, null, 'sin limite no tiene instante de cambio')

  // Sin estructura cargada.
  igual(resolveTimer(startTimer([], t0), [], t0).blind, null, 'sin niveles no revienta')

  // Ancla apuntando a un nivel inexistente (estructura editada a mitad).
  const huerfano: TimerAnchor = {
    status: 'active',
    anchorLevel: 99,
    anchorElapsedMs: 0,
    anchorAt: t0,
  }
  igual(resolveTimer(huerfano, NIVELES, t0).level, 6, 'un ancla huerfana cae al ultimo nivel')
}

// ── La noche completa ──────────────────────────────────────────────────────
seccion('Una noche completa')
{
  let a: TimerAnchor = startTimer(NIVELES, t0)
  // 75 min de juego -> nivel 4
  igual(resolveTimer(a, NIVELES, enMin(75)).level, 4, 'tras 75 min va por el nivel 4')
  // Cena de 30 min
  a = pauseTimer(a, NIVELES, enMin(75))
  a = resumeTimer(a, enMin(105))
  igual(resolveTimer(a, NIVELES, enMin(105)).level, 4, 'tras la cena sigue en el 4')
  // Se les fue la mano con un nivel: lo reinician
  a = restartLevel(a, NIVELES, enMin(110))
  igual(resolveTimer(a, NIVELES, enMin(110)).remainingMs, 20 * MIN, 'reinician el nivel 4')
  // Deciden apurar el cierre
  a = advanceLevel(a, NIVELES, enMin(115))
  igual(resolveTimer(a, NIVELES, enMin(115)).level, 5, 'adelantan al 5')
  // Y lo dejan correr hasta el final
  igual(resolveTimer(a, NIVELES, enMin(135)).level, 6, 'a los 20 min pasa al 6')
  igual(resolveTimer(a, NIVELES, enMin(150)).status, 'completed', 'y termina la estructura')
}

console.log(
  `\n${fallas === 0 ? 'TODO OK' : `${fallas} FALLAS`} — ${pruebas - fallas}/${pruebas} pruebas\n`
)
process.exit(fallas === 0 ? 0 : 1)
