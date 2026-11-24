'use client'

import Image from 'next/image'
import type { ReactNode } from 'react'

/**
 * El armazon comun de las tres tablas historicas: Campeonatos, 7/2 y Podios.
 *
 * Las tres cuentan lo mismo —un podio de tres y una lista detras— y antes cada
 * una lo dibujaba por su cuenta. Eso ya se habia desincronizado una vez, asi
 * que el diseño vive aqui y cada pestaña solo aporta sus datos y sus colores.
 *
 * SOBRE LAS TARJETAS DEL PODIO: la foto ocupa la tarjeta entera. Empezo siendo
 * un descuido —un `Image fill` cuyo contenedor no estaba posicionado, asi que
 * la foto se desbordaba y tapaba el nombre— pero esa foto grande es el aspecto
 * que se aprobo, asi que ahora esta hecho a proposito y el puesto lo dicen el
 * tamaño y el color del borde.
 *
 * Lo que NO era deliberado era perder el nombre: al taparlo la foto, los tres
 * primeros quedaban sin identificar. El nombre va ahora DEBAJO de la tarjeta,
 * con el apellido abreviado porque en 112px no entra entero (y en este grupo
 * hay varios Juan y varios Jose, asi que la inicial no es opcional).
 */

export interface Jugador {
  id: string
  firstName: string
  lastName: string
  photoUrl?: string
  isActive: boolean
  aliases: string[]
}

export interface FilaHistorico {
  jugador: Jugador
  /** La cifra grande: la que ordena y la que va en la pastilla. */
  total: number
  /** Linea opcional bajo el nombre (el desglose, los torneos). */
  detalle?: ReactNode
  /**
   * Linea opcional bajo la pastilla del podio. Las tarjetas no llevan nombre,
   * asi que es el unico hueco para un desglose en los tres primeros; el 7/2 lo
   * usa para que se vea de que esta hecho el total.
   */
  pie?: ReactNode
}

export interface Paleta {
  /** Relleno de los bordes del podio: oro, plata, bronce — o los tres rosas. */
  metales: [string, string, string]
  /** El mismo color pero legible COMO TEXTO sobre papel claro. */
  tintas: [string, string, string]
  /** Pastilla de la lista. */
  pastillaFondo: string
  pastillaTexto: string
  /**
   * Fondo del boton Reintentar. Va en la paleta y no como prop suelta porque
   * este modulo es el dueño del color: en cuanto una pestaña puede pasar un
   * color a mano, los tres bloques de error vuelven a divergir.
   */
  botonFondo: string
}

export const PALETA_METAL: Paleta = {
  metales: ['#E8C158', '#C9C6C2', '#C08A54'],
  // El metal vivo no se lee como texto sobre papel (el oro da 1.9:1). Estos si.
  tintas: ['#7F5D07', '#5A5653', '#754E27'],
  pastillaFondo: '#fbbf2420',
  pastillaTexto: 'var(--cp-gold)',
  botonFondo: '#E53935',
}

export const PALETA_ROSA: Paleta = {
  metales: ['#AD1457', '#D81B60', '#EC4899'],
  // El rosa claro queda en 3.4:1 sobre papel, asi que el tercero usa uno mas
  // oscuro para el texto aunque su borde siga siendo el claro.
  tintas: ['#8E1148', '#AD1457', '#9D174D'],
  pastillaFondo: '#ec489920',
  pastillaTexto: '#AD1457',
  botonFondo: '#AD1457',
}

/**
 * Los dos estados de espera de las tablas historicas.
 *
 * Estaban copiados carácter por carácter en las tres pestañas: lo unico que
 * cambiaba era el texto y el color del boton, y ese color ya se habia
 * desincronizado (dos pestañas en rojo, una en rosa, ninguna leyendo la
 * paleta). Van aqui por el mismo motivo que el resto del armazon.
 */
export function CargandoHistorico({ texto }: { texto: string }) {
  return (
    <div className="flex justify-center py-8">
      <div style={{ color: 'var(--cp-on-surface-muted)' }}>{texto}</div>
    </div>
  )
}

export function ErrorHistorico({
  mensaje,
  paleta,
  onReintentar,
}: {
  mensaje: string
  paleta: Paleta
  onReintentar: () => void
}) {
  return (
    <div
      className="rounded-2xl p-6 text-center"
      style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
    >
      <p style={{ color: 'var(--cp-primary-light)', fontSize: 'var(--cp-body-size)' }}>Error: {mensaje}</p>
      <button
        onClick={onReintentar}
        className="mt-4 px-4 py-2 rounded-lg font-medium"
        style={{ background: paleta.botonFondo, color: 'white' }}
      >
        Reintentar
      </button>
    </div>
  )
}

const nombreCompleto = (j: Jugador) => `${j.firstName} ${j.lastName}`
const aliasDe = (j: Jugador) => (j.aliases && j.aliases.length > 0 ? j.aliases[0] : '')
/** Para las tarjetas del podio, donde no cabe el apellido entero. */
const nombreCorto = (j: Jugador) => `${j.firstName} ${j.lastName.charAt(0)}.`

export function CPHistoricoTab({
  filas,
  paleta,
  vacio,
}: {
  filas: FilaHistorico[]
  paleta: Paleta
  vacio: string
}) {
  if (filas.length === 0) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
      >
        <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>{vacio}</p>
      </div>
    )
  }

  // La regla de la casa: quien ya no juega sigue en la tabla, pero al final.
  // Vive aqui y no en cada pestaña porque estaba copiada en las tres, con el
  // mismo comentario, y ya habia empezado a divergir. Es ademas una regla que
  // se quito una vez por error, asi que conviene que tenga un solo sitio.
  const ordenadas = [
    ...filas.filter((f) => f.jugador.isActive),
    ...filas.filter((f) => !f.jugador.isActive),
  ]

  const podio = ordenadas.slice(0, 3)
  const resto = ordenadas.slice(3)

  return (
    <div className="space-y-4">
      {/* El segundo a la izquierda, el primero al centro y mas grande. */}
      <div className="flex justify-center items-end gap-3 py-4">
        {podio[1] && <TarjetaPodio fila={podio[1]} color={paleta.metales[1]} tinta={paleta.tintas[1]} grande={false} />}
        {podio[0] && <TarjetaPodio fila={podio[0]} color={paleta.metales[0]} tinta={paleta.tintas[0]} grande />}
        {podio[2] && <TarjetaPodio fila={podio[2]} color={paleta.metales[2]} tinta={paleta.tintas[2]} grande={false} />}
      </div>

      {resto.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--cp-surface)', border: '1px solid var(--cp-surface-border)' }}
        >
          <div className="divide-y" style={{ borderColor: 'var(--cp-surface-border)' }}>
            {resto.map((fila, i) => (
              <div key={fila.jugador.id} className="flex items-center gap-3 p-3">
                <div
                  className="w-6 text-center font-medium tabular-nums"
                  style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
                >
                  {i + 4}
                </div>

                <div className="relative w-10 h-10 flex-shrink-0 overflow-hidden rounded-full border border-black/10">
                  {fila.jugador.photoUrl ? (
                    <Image src={fila.jugador.photoUrl} alt={nombreCompleto(fila.jugador)} fill className="object-cover" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center text-xs font-semibold"
                      style={{ background: paleta.metales[0], color: 'white' }}
                    >
                      {fila.jugador.firstName.charAt(0)}
                      {fila.jugador.lastName.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="font-medium truncate"
                    style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface)' }}
                  >
                    {nombreCompleto(fila.jugador)}
                  </p>
                  {aliasDe(fila.jugador) && (
                    <p className="truncate" style={{ fontSize: '12px', color: 'var(--cp-negative)' }}>
                      ({aliasDe(fila.jugador)})
                    </p>
                  )}
                  {fila.detalle}
                </div>

                <div
                  className="px-3 py-1 rounded-lg font-bold tabular-nums"
                  style={{
                    background: paleta.pastillaFondo,
                    color: paleta.pastillaTexto,
                    fontSize: 'var(--cp-body-size)',
                  }}
                >
                  {fila.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TarjetaPodio({
  fila,
  color,
  tinta,
  grande,
}: {
  fila: FilaHistorico
  color: string
  tinta: string
  grande: boolean
}) {
  const j = fila.jugador
  return (
    <div className="flex flex-col items-center">
      <div
        className={`${grande ? 'w-28 h-36' : 'w-24 h-32'} rounded-2xl relative overflow-hidden`}
        style={{ background: 'var(--cp-surface)', border: `2px solid ${color}` }}
      >
        {j.photoUrl ? (
          <Image
            src={j.photoUrl}
            alt={nombreCompleto(j)}
            fill
            sizes="112px"
            className="object-cover"
            style={{ objectPosition: 'top' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-bold"
            style={{ background: `${color}30`, color: tinta, fontSize: grande ? 28 : 24 }}
          >
            {j.firstName.charAt(0)}
            {j.lastName.charAt(0)}
          </div>
        )}
      </div>

      <p
        className="mt-2 font-semibold text-center truncate w-full px-1"
        style={{ fontSize: grande ? 13 : 12, color: 'var(--cp-on-surface)' }}
      >
        {nombreCorto(j)}
      </p>

      {aliasDe(j) && (
        <p
          className="text-center truncate w-full px-1"
          style={{ fontSize: 11, color: 'var(--cp-negative)' }}
        >
          ({aliasDe(j)})
        </p>
      )}

      <div
        className="mt-1 px-3 py-1 rounded-full font-bold tabular-nums"
        style={{ background: `${color}30`, color: tinta, fontSize: 'var(--cp-body-size)' }}
      >
        {fila.total}
      </div>

      {/* El desglose usa la misma tinta que la pastilla, y el color va SIEMPRE
          en este div, nunca heredado: `globals.css` tiene una regla
          `p, span, div { color: var(--text) }` con el valor del tema oscuro,
          asi que cualquier texto que herede color sale crema y desaparece
          sobre el papel claro. Por eso `pie` es texto plano y no un <span>. */}
      {fila.pie && (
        <div
          className="mt-1 text-center font-semibold tabular-nums"
          style={{ fontSize: 12, color: tinta }}
        >
          {fila.pie}
        </div>
      )}
    </div>
  )
}

export default CPHistoricoTab
