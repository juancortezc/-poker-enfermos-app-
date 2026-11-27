import Image from 'next/image'
import { nextDateLine, registeredPlayersLabel, toRoman, tournamentPoster } from '@poker/shared'
import { DISPLAY_CONDENSADO, FUENTE_DISPLAY, SOBRE_NEGRO } from './HomeLucha'

interface CPTournamentPosterProps {
  tournamentNumber: number
  /** Proxima fecha del torneo (`stats.nextDate` de /api/tournaments/active). */
  nextDate?: { dateNumber: number; scheduledDate?: string | null } | null
  /** Jugadores inscritos en el torneo. */
  registeredCount?: number
  /** Ancho que ocupa el bloque, para que next/image elija el tamano. */
  sizes?: string
  /** El primer bloque de la pantalla: la imagen se pide con prioridad. */
  preload?: boolean
}

/** Ancho del bloque a sangre: la columna (max-w-md) menos el padding de la pagina. */
const DEFAULT_SIZES = '(min-width: 448px) 408px, calc(100vw - 40px)'

/**
 * El torneo que arranca. Mientras el torneo activo no tiene ninguna fecha
 * jugada no hay tabla (todos en 0, en el orden en que se inscribieron), asi
 * que en su lugar va el afiche del torneo con la proxima fecha y los
 * inscritos. Sin afiche propio (ver TOURNAMENT_POSTERS en @poker/shared), un
 * afiche tipografico con el numero.
 */
export function CPTournamentPoster({ tournamentNumber, nextDate, registeredCount, sizes = DEFAULT_SIZES, preload }: CPTournamentPosterProps) {
  const poster = tournamentPoster(tournamentNumber)
  const fecha = nextDateLine(nextDate)

  return (
    <section
      className="cp-rise"
      aria-labelledby="h-torneo-arranca"
      style={{ borderRadius: 20, overflow: 'hidden', background: SOBRE_NEGRO.fondo, boxShadow: 'var(--cp-elevation-2)' }}
    >
      <div style={{ position: 'relative', aspectRatio: '2 / 3', width: '100%' }}>
        {poster ? (
          <Image
            src={`/torneos/${poster.file}-1024.webp`}
            alt={poster.alt}
            fill
            sizes={sizes}
            preload={preload}
            className="object-cover"
          />
        ) : (
          <AficheGenerico tournamentNumber={tournamentNumber} />
        )}
      </div>

      <div style={{ padding: '16px 18px 20px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: `3px solid ${SOBRE_NEGRO.rojo}` }}>
        <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 800, fontSize: 12, letterSpacing: '0.14em', color: SOBRE_NEGRO.rojoTexto }}>
          ARRANCA EL TORNEO
        </span>
        <h2 id="h-torneo-arranca" style={{ ...DISPLAY_CONDENSADO, margin: 0, fontSize: 40, color: SOBRE_NEGRO.texto }}>
          Torneo {tournamentNumber}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 16, rowGap: 4 }}>
          {fecha && (
            <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 800, fontSize: 18, color: SOBRE_NEGRO.oro }}>{fecha}</span>
          )}
          {registeredCount != null && registeredCount > 0 && (
            <span style={{ fontSize: 14, color: SOBRE_NEGRO.textoSuave }}>{registeredPlayersLabel(registeredCount)}</span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: SOBRE_NEGRO.textoSuave }}>
          La tabla aparece cuando se juegue la primera fecha.
        </p>
      </div>
    </section>
  )
}

/** Afiche de respaldo: el numero en romano, en grande, sobre el negro del club. */
function AficheGenerico({ tournamentNumber }: { tournamentNumber: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        border: `6px solid ${SOBRE_NEGRO.rojo}`,
        borderRadius: 20,
        background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${SOBRE_NEGRO.rojo} 30%, transparent) 0, transparent 62%), ${SOBRE_NEGRO.fondo}`,
      }}
    >
      <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 900, fontSize: 28, letterSpacing: '0.2em', color: SOBRE_NEGRO.texto }}>TORNEO</span>
      <span style={{ ...DISPLAY_CONDENSADO, fontSize: 120, lineHeight: 1, color: SOBRE_NEGRO.texto }}>{toRoman(tournamentNumber)}</span>
      <span style={{ fontFamily: FUENTE_DISPLAY, fontWeight: 800, fontSize: 14, letterSpacing: '0.18em', color: SOBRE_NEGRO.rojoTexto }}>POKER DE ENFERMOS</span>
    </div>
  )
}
