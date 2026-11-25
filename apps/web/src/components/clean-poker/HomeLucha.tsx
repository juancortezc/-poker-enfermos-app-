'use client'

import Image from 'next/image'
import Link from 'next/link'
import { dark } from '@poker/design'
import { getInitials } from '@/lib/avatar-utils'

/**
 * Piezas del Inicio del T31, tema lucha libre mexicana.
 *
 * Los carteles negros (ganador de la noche, dueno del cinturon) y las fotos a
 * sangre van en OSCURO dentro de una pantalla clara: ahi las variables --cp-*
 * ya valen lo del tono claro (el oro, por ejemplo, es el oscuro para papel).
 * Por eso los colores de esos bloques salen de la paleta oscura de
 * @poker/design, la fuente unica, y no de valores sueltos.
 */
export const SOBRE_NEGRO = {
  fondo: dark.surface0,
  panel: dark.surface1,
  linea: dark.surface3,
  texto: dark.onSurface,
  textoSuave: dark.onSurfaceMuted,
  rojo: dark.primary,
  rojoTexto: dark.primaryLight,
  oro: dark.gold,
  plata: dark.silver,
  bronce: dark.bronze,
  /** Texto sobre oro, plata o bronce (pedestales, cinta, cinturon). */
  tinta: dark.ink,
  oroOscuro: dark.goldOnLight,
  rosa: dark.malazo,
  positivo: dark.positive,
  negativo: dark.negative,
  sobreRojo: dark.onPrimary,
} as const

/**
 * Archivo, pedida directo a la variable de next/font. `--cp-font-display` se
 * declara en :root pero `--font-display` lo pone next/font en <body>, asi que
 * en :root queda invalida y el texto cae a Inter (ver reporte).
 */
export const FUENTE_DISPLAY = "var(--font-display), 'Archivo', 'Helvetica Neue', Arial, sans-serif"

/** Medalla por puesto (1-3): relleno vivo y texto que va encima. */
export const MEDALLA = [SOBRE_NEGRO.oro, SOBRE_NEGRO.plata, SOBRE_NEGRO.bronce] as const

/** Titulos condensados del cartel: Archivo 900, italica, ancho 70 %. */
export const DISPLAY_CONDENSADO: React.CSSProperties = {
  fontFamily: FUENTE_DISPLAY,
  fontWeight: 900,
  fontStretch: '70%',
  // next/font no declara el rango de ancho en @font-face, asi que font-stretch
  // solo no basta: el eje se pide directo.
  fontVariationSettings: "'wdth' 70",
  fontStyle: 'italic',
  textTransform: 'uppercase',
  lineHeight: 0.92,
}

/**
 * El cartel y el cinturon tienen que verse ENTEROS en la primera pantalla del
 * movil (390x844 y 360x740), sin que la barra inferior corte nada. La tarjeta
 * es lo unico elastico: toma el alto que queda (viewport menos lo fijo) y de
 * ahi sale su ancho, 2/3 del alto, con tope de 232 px (el tamano del diseno).
 *
 * `reservado` = lo que hay arriba del bloque (cabecera, pestanas: ~137 px),
 * la barra inferior (~75), un respiro (8) y todo lo que el bloque lleva
 * ademas de la tarjeta. Medido con Playwright; si cambia la cabecera o el
 * bloque, hay que volver a medir. Es el mismo criterio que la app
 * (useHeroCardWidth en apps/mobile/.../home/lucha.tsx).
 */
export function heroCardWidth(reservado: number): string {
  return `clamp(140px, calc((100dvh - ${reservado}px) * 2 / 3), 232px)`
}

/**
 * Tamano del titular de dos lineas: el mayor que deja cada linea en una sola
 * fila. Ancho util = columna (hasta 448 px) menos el padding de la pagina (40)
 * y del bloque (40). Archivo 900 condensada e italica al 70 % mide ~0.45 em por letra.
 */
export function heroTitleSize(lines: readonly string[], max: number): string {
  const longest = Math.max(...lines.map(l => l.length), 1)
  return `min(${max}px, calc((min(100vw, 448px) - 80px) / ${(longest * 0.45).toFixed(2)}))`
}

/** Velo para leer texto encima de una foto a sangre. */
const VELO = `linear-gradient(180deg, transparent 0%, color-mix(in srgb, ${SOBRE_NEGRO.fondo} 88%, transparent) 55%)`

interface SectionHeadProps {
  title: string
  /** Enlace a la derecha ("TODOS →"). */
  action?: { label: string; onClick: () => void }
  id?: string
}

/** Encabezado de seccion: "EL PODIO", "MANO A MANO"... */
export function SectionHead({ title, action, id }: SectionHeadProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <h2
        id={id}
        style={{
          margin: 0,
          fontFamily: FUENTE_DISPLAY,
          fontWeight: 900,
          fontStretch: '75%',
          fontVariationSettings: "'wdth' 75",
          fontSize: 26,
          letterSpacing: '0.04em',
          color: 'var(--cp-on-surface)',
          lineHeight: 1,
        }}
      >
        {title}
      </h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 0',
            cursor: 'pointer',
            fontFamily: FUENTE_DISPLAY,
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: '0.1em',
            color: 'var(--cp-primary-light)',
            flexShrink: 0,
          }}
        >
          {action.label} →
        </button>
      )}
    </div>
  )
}

interface PhotoTileProps {
  playerId: string
  name: string
  src?: string | null
  /** Etiqueta de color arriba del nombre ("EL VARÓN"). */
  tag: string
  tagBg: string
  tagColor: string
  detail?: string
  /** Lado del texto (el mano a mano pone al #2 a la derecha). */
  align?: 'left' | 'right'
  /** `sizes` de next/image: el ancho real de la tarjeta. */
  sizes: string
  /** Contenido extra bajo el nombre (p. ej. el puntaje grande). */
  children?: React.ReactNode
  /** Borde de color (los 7/2 llevan el rosa). */
  accent?: string
}

/**
 * Foto 3:4 a sangre con velo oscuro y texto encima. Toda la tarjeta lleva al
 * perfil del jugador.
 */
export function PhotoTile({ playerId, name, src, tag, tagBg, tagColor, detail, align = 'left', sizes, children, accent }: PhotoTileProps) {
  const right = align === 'right'
  return (
    <Link
      href={`/players/${playerId}`}
      className="cp-foto-link"
      aria-label={`${tag}: ${name}. Ver su perfil`}
      style={{
        position: 'relative',
        display: 'block',
        aspectRatio: '3 / 4',
        borderRadius: 18,
        overflow: 'hidden',
        background: SOBRE_NEGRO.panel,
        minWidth: 0,
      }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={sizes} className="object-cover object-top" />
      ) : (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: '0 0 35% 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FUENTE_DISPLAY,
            fontWeight: 900,
            fontSize: 40,
            color: SOBRE_NEGRO.textoSuave,
          }}
        >
          {getInitials(name)}
        </span>
      )}
      {accent && (
        // El borde va por encima de la foto, no debajo.
        <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 18, boxShadow: `inset 0 0 0 3px ${accent}`, pointerEvents: 'none' }} />
      )}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '40px 12px 12px',
          background: VELO,
          color: SOBRE_NEGRO.texto,
          display: 'flex',
          flexDirection: 'column',
          alignItems: right ? 'flex-end' : 'flex-start',
          textAlign: right ? 'right' : 'left',
          gap: 2,
        }}
      >
        <span
          style={{
            background: tagBg,
            color: tagColor,
            fontFamily: FUENTE_DISPLAY,
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: '0.12em',
            padding: '3px 8px',
            borderRadius: 5,
            lineHeight: 1.2,
          }}
        >
          {tag}
        </span>
        <span
          style={{
            fontFamily: FUENTE_DISPLAY,
            fontWeight: 900,
            fontSize: 20,
            lineHeight: 1.1,
            color: SOBRE_NEGRO.texto,
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
        {detail && <span style={{ fontSize: 13, color: SOBRE_NEGRO.textoSuave, lineHeight: 1.25 }}>{detail}</span>}
        {children}
      </div>
    </Link>
  )
}

interface PodiumProps {
  /** En orden de puesto: [1º, 2º, 3º]. */
  players: Array<{ playerId: string; name: string; src?: string | null; points: number }>
  sizes: string
}

/** Alturas de los pedestales 2-1-3, como el diseno. */
const PEDESTAL = [92, 64, 48] as const
const NUMERO = [34, 24, 20] as const

/**
 * El podio en tres columnas 2-1-3: foto 3:4 con borde de medalla y pedestal
 * del mismo color con el puesto y "Nombre · pts". Cada columna lleva al perfil.
 */
export function Podium({ players, sizes }: PodiumProps) {
  const order = [1, 0, 2].filter(i => players[i])
  return (
    <ol
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 10,
        alignItems: 'end',
      }}
    >
      {order.map(i => {
        const p = players[i]
        const metal = MEDALLA[i]
        return (
          <li key={p.playerId} style={{ minWidth: 0, gridColumn: i === 0 ? 2 : i === 1 ? 1 : 3, gridRow: 1 }}>
            <Link
              href={`/players/${p.playerId}`}
              className="cp-foto-link"
              aria-label={`${i + 1}º lugar: ${p.name}, ${p.points} puntos. Ver su perfil`}
              style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', borderRadius: 12 }}
            >
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '3 / 4',
                  borderRadius: '12px 12px 0 0',
                  overflow: 'hidden',
                  border: `3px solid ${metal}`,
                  borderBottom: 'none',
                  background: 'var(--cp-surface-3)',
                }}
              >
                {p.src ? (
                  <Image src={p.src} alt="" fill sizes={sizes} className="object-cover object-top" />
                ) : (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: FUENTE_DISPLAY,
                      fontWeight: 900,
                      fontSize: 26,
                      color: 'var(--cp-on-surface-muted)',
                    }}
                  >
                    {getInitials(p.name)}
                  </span>
                )}
              </div>
              <div
                style={{
                  height: PEDESTAL[i],
                  background: metal,
                  borderRadius: '0 0 10px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: SOBRE_NEGRO.tinta,
                  padding: '0 4px',
                }}
              >
                <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: NUMERO[i], lineHeight: 1, color: SOBRE_NEGRO.tinta }}>
                  {i + 1}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: i === 0 ? 700 : 600,
                    color: SOBRE_NEGRO.tinta,
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name} · {p.points}
                </span>
              </div>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
