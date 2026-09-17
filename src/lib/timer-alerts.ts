'use client'

/**
 * Los avisos del timer: sonido, vibracion y destello.
 *
 * El sonido se sintetiza con WebAudio en vez de cargar un archivo. Dos
 * razones: no hay que sumar assets ni esperar a que descarguen, y sobre todo
 * un oscilador arranca al instante — un <audio> puede tardar lo suficiente
 * como para que el aviso llegue tarde, que es justo lo que no puede pasar.
 *
 * Los navegadores no dejan sonar hasta que el usuario interactua con la
 * pagina. Por eso hay `prepararAudio()`: se llama desde el primer clic real
 * (arrancar el timer, por ejemplo) para dejar el contexto listo.
 */

let contexto: AudioContext | null = null

type ConstructorAudio = typeof AudioContext

function obtenerContexto(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (contexto) return contexto
  const Ctor: ConstructorAudio | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: ConstructorAudio }).webkitAudioContext
  if (!Ctor) return null
  try {
    contexto = new Ctor()
    return contexto
  } catch {
    return null
  }
}

/**
 * Desbloquea el audio. Debe llamarse dentro de un gesto del usuario; si no,
 * el navegador deja el contexto suspendido y el primer aviso no suena.
 */
export function prepararAudio(): void {
  const ctx = obtenerContexto()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

/** Un pitido. `frecuencia` en Hz, `duracion` en segundos. */
function pitido(frecuencia: number, duracion: number, retraso: number): void {
  const ctx = obtenerContexto()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume()

  const inicio = ctx.currentTime + retraso
  const osc = ctx.createOscillator()
  const volumen = ctx.createGain()

  osc.type = 'sine'
  osc.frequency.value = frecuencia

  // Rampa de entrada y salida: un oscilador que arranca y corta en seco
  // produce un chasquido desagradable.
  volumen.gain.setValueAtTime(0, inicio)
  volumen.gain.linearRampToValueAtTime(0.35, inicio + 0.02)
  volumen.gain.setValueAtTime(0.35, inicio + duracion - 0.05)
  volumen.gain.linearRampToValueAtTime(0, inicio + duracion)

  osc.connect(volumen)
  volumen.connect(ctx.destination)
  osc.start(inicio)
  osc.stop(inicio + duracion)
}

function vibrar(patron: number[]): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(patron)
  } catch {
    // Safari en iOS no vibra desde la web. El sonido y el destello quedan.
  }
}

/**
 * Falta un minuto: dos pitidos cortos y agudos, vibracion breve.
 * Es un aviso, no el evento: tiene que notarse sin interrumpir la mano.
 */
export function avisarUnMinuto(): void {
  pitido(880, 0.15, 0)
  pitido(880, 0.15, 0.25)
  vibrar([120, 80, 120])
}

/**
 * Cambio de blind: tres pitidos mas graves y largos, vibracion sostenida.
 * Distinto del anterior a proposito — desde la otra punta de la mesa hay que
 * poder distinguir "falta un minuto" de "ya cambio" sin mirar la pantalla.
 */
export function avisarCambio(): void {
  pitido(523, 0.25, 0)
  pitido(659, 0.25, 0.3)
  pitido(784, 0.45, 0.6)
  vibrar([250, 120, 250, 120, 400])
}
