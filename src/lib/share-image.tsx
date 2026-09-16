/**
 * Piezas compartidas por las imagenes para WhatsApp.
 *
 * Se arman con ImageResponse (next/og), que renderiza en el SERVIDOR. Es a
 * proposito: el proyecto ya se habia sacado html2canvas de encima para bajar
 * el bundle, y capturar el DOM en el cliente lo traeria de vuelta. Aqui el
 * costo para el telefono es cero — recibe un PNG y punto.
 *
 * Ojo al editar: ImageResponse soporta un subconjunto de CSS. Solo flexbox
 * (nada de grid), y todo div con mas de un hijo necesita display:flex
 * explicito o falla en tiempo de render.
 */

/** Ancho pensado para que WhatsApp no lo recomprima a papilla. */
export const ANCHO = 1080

/**
 * Paleta tomada de clean-poker-tokens.css (bloque .cp-light). Las imagenes
 * arrancaron oscuras, del sistema viejo, y desentonaban con la app: ahora
 * comparten el mismo papel, la misma tinta y los mismos colores por rol —
 * rojo la marca, rosa los malazos, oro/plata/bronce el podio, verde el que
 * sube, naranja el que baja.
 */
export const COLORES = {
  papel: '#FAF7F2',        // --cp-surface-0
  tarjeta: '#FFFFFF',      // --cp-surface-1
  elevada: '#F3EDE4',      // --cp-surface-2
  borde: '#E7DED2',        // --cp-surface-border
  tinta: '#17120F',        // --cp-on-surface
  tintaMedia: '#574C49',   // --cp-on-surface-muted
  tintaSuave: '#786B66',   // --cp-on-surface-variant
  marca: '#E53935',        // --cp-primary
  marcaTexto: '#C62828',   // --cp-primary-light (rojo legible como texto)
  oro: '#8A6508',
  plata: '#6E6A67',
  bronce: '#8B5E2F',
  malazo: '#C2185B',
  sube: '#15803D',
  baja: '#C2410C',
}

export const MEDALLA = [COLORES.oro, COLORES.plata, COLORES.bronce]

/** Marco comun: fondo, cabecera con el torneo y pie con la marca del grupo. */
export function Marco({
  titulo,
  subtitulo,
  alto,
  children,
}: {
  titulo: string
  subtitulo: string
  alto: number
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        width: ANCHO,
        height: alto,
        display: 'flex',
        flexDirection: 'column',
        background: COLORES.papel,
        padding: 48,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            letterSpacing: 6,
            color: COLORES.marcaTexto,
            fontWeight: 700,
          }}
        >
          {subtitulo.toUpperCase()}
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 900,
            color: COLORES.tinta,
            marginTop: 8,
          }}
        >
          {titulo}
        </div>
      </div>

      {children}

      <div
        style={{
          display: 'flex',
          marginTop: 'auto',
          paddingTop: 28,
          fontSize: 24,
          color: COLORES.tintaSuave,
          letterSpacing: 3,
        }}
      >
        POKER DE ENFERMOS
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────
 * Constructores de las imagenes.
 *
 * Viven aqui y no en la ruta para que se puedan renderizar desde un script
 * sin pasar por la autenticacion. Asi lo que se prueba es este mismo codigo,
 * no una copia que puede divergir.
 * ──────────────────────────────────────────────────────────────────────── */

import { ImageResponse } from 'next/og'
import { calculateTournamentRanking, scoreOf, SCORE_LABELS } from '@/lib/ranking-utils'
import { fullName, shortenFullName } from '@/lib/player-name'

/** Nombre real abreviado. Las dos imagenes tienen que nombrar igual a la
 *  misma persona, y la tabla del torneo usa el nombre real, no el alias. */
const nombreCorto = (p: { firstName: string; lastName?: string | null }) =>
  shortenFullName(fullName(p))
import { prisma } from '@/lib/prisma'

export async function buildEliminaImage(): Promise<Response> {

    const torneo = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      select: { id: true, number: true },
    })

    if (!torneo) {
      return new Response('No hay torneo activo', { status: 404 })
    }

    const data = await calculateTournamentRanking(torneo.id)
    if (!data) {
      return new Response('No se pudo calcular la tabla', { status: 500 })
    }

    const filas = data.rankings
    const ALTO_FILA = 58
    const alto = 340 + filas.length * ALTO_FILA

    return new ImageResponse(
      (
        <Marco titulo={`Tabla Torneo ${torneo.number}`} subtitulo="Elimina" alto={alto}>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {/* Encabezado */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingBottom: 12,
                borderBottom: `2px solid ${COLORES.borde}`,
                fontSize: 22,
                letterSpacing: 3,
                color: COLORES.tintaSuave,
              }}
            >
              <div style={{ display: 'flex', width: 70 }}>#</div>
              <div style={{ display: 'flex', flex: 1 }}>JUGADOR</div>
              <div style={{ display: 'flex', width: 150, justifyContent: 'flex-end' }}>
                {SCORE_LABELS.points}
              </div>
            </div>

            {filas.map((p, i) => {
              const medalla = i < 3 ? MEDALLA[i] : null
              return (
                <div
                  key={p.playerId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: ALTO_FILA,
                    borderBottom: `1px solid ${COLORES.borde}`,
                    background: i % 2 === 1 ? COLORES.elevada : COLORES.tarjeta,
                  }}
                >
                  <div style={{ display: 'flex', width: 70, alignItems: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: medalla ?? 'transparent',
                        color: medalla ? '#FFFFFF' : COLORES.tintaSuave,
                        fontSize: 26,
                        fontWeight: 800,
                      }}
                    >
                      {p.position}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flex: 1,
                      fontSize: 30,
                      fontWeight: medalla ? 800 : 500,
                      color: COLORES.tinta,
                    }}
                  >
                    {shortenFullName(p.playerName)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      width: 150,
                      justifyContent: 'flex-end',
                      fontSize: 32,
                      fontWeight: 800,
                      color: medalla ?? COLORES.tinta,
                    }}
                  >
                    {scoreOf(p)}
                  </div>
                </div>
              )
            })}
          </div>
        </Marco>
      ),
      { width: ANCHO, height: alto }
    )
}

export async function buildUltimaFechaImage(): Promise<Response> {

    const torneo = await prisma.tournament.findFirst({
      where: { status: 'ACTIVO' },
      select: { id: true, number: true },
    })

    if (!torneo) {
      return new Response('No hay torneo activo', { status: 404 })
    }

    const fecha = await prisma.gameDate.findFirst({
      where: { tournamentId: torneo.id, status: 'completed' },
      orderBy: { dateNumber: 'desc' },
      select: {
        dateNumber: true,
        playerIds: true,
        eliminations: {
          select: {
            position: true,
            points: true,
            eliminatedPlayer: { select: { firstName: true, lastName: true, aliases: true } },
            eliminatorPlayerId: true,
          },
          orderBy: { position: 'asc' },
        },
      },
    })

    if (!fecha || fecha.eliminations.length === 0) {
      return new Response('No hay fecha completada', { status: 404 })
    }

    const podio = fecha.eliminations.filter((e) => e.position <= 3)

    // Varon de la noche: mas eliminaciones. La posicion 1 se excluye porque el
    // ganador se guarda como su propio eliminador.
    const conteo = new Map<string, number>()
    for (const e of fecha.eliminations) {
      if (e.position === 1) continue
      conteo.set(e.eliminatorPlayerId, (conteo.get(e.eliminatorPlayerId) ?? 0) + 1)
    }
    let varon: { nombre: string; cuenta: number } | null = null
    if (conteo.size > 0) {
      const [id, cuenta] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]
      const jugador = await prisma.player.findUnique({
        where: { id },
        select: { firstName: true, lastName: true, aliases: true },
      })
      if (jugador) varon = { nombre: nombreCorto(jugador), cuenta }
    }

    const alto = 900

    return new ImageResponse(
      (
        <Marco
          titulo={`Fecha ${fecha.dateNumber}`}
          subtitulo={`Torneo ${torneo.number}`}
          alto={alto}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            {podio.map((e) => {
              const color = MEDALLA[e.position - 1]
              const campeon = e.position === 1
              return (
                <div
                  key={e.position}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: campeon ? '32px 28px' : '22px 28px',
                    marginBottom: 14,
                    borderRadius: 18,
                    background: campeon ? 'rgba(138,101,8,0.10)' : COLORES.tarjeta,
                    border: `2px solid ${campeon ? color : COLORES.borde}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: campeon ? 76 : 58,
                      height: campeon ? 76 : 58,
                      borderRadius: 16,
                      background: color,
                      color: '#FFFFFF',
                      fontSize: campeon ? 44 : 32,
                      fontWeight: 900,
                      marginRight: 28,
                    }}
                  >
                    {e.position}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flex: 1,
                      fontSize: campeon ? 52 : 38,
                      fontWeight: campeon ? 900 : 700,
                      color: COLORES.tinta,
                    }}
                  >
                    {nombreCorto(e.eliminatedPlayer)}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: campeon ? 46 : 34,
                      fontWeight: 800,
                      color,
                    }}
                  >
                    {e.points}
                  </div>
                </div>
              )
            })}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                marginTop: 26,
                padding: 24,
                borderRadius: 16,
                background: COLORES.tarjeta,
                border: `1px solid ${COLORES.borde}`,
              }}
            >
              <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, color: COLORES.tintaSuave }}>
                JUGARON
              </div>
              <div style={{ display: 'flex', fontSize: 52, fontWeight: 900, color: COLORES.tinta, marginTop: 6 }}>
                {fecha.playerIds.length}
              </div>
            </div>
          </div>
        </Marco>
      ),
      { width: ANCHO, height: alto }
    )
}

/**
 * "Lo que dejo la noche": los cuatro personajes de la fecha.
 *
 * Mismo criterio que la seccion del home — el Varon, el Malazo (primer
 * eliminado), quien mas bajo y quien mas subio en el torneo. Cada uno con su
 * color por rol, no cuatro tarjetas iguales pintadas distinto.
 */
export async function buildLoQueDejoImage(): Promise<Response> {
  const torneo = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    select: { id: true, number: true },
  })

  if (!torneo) {
    return new Response('No hay torneo activo', { status: 404 })
  }

  const fecha = await prisma.gameDate.findFirst({
    where: { tournamentId: torneo.id, status: 'completed' },
    orderBy: { dateNumber: 'desc' },
    select: {
      dateNumber: true,
      eliminations: {
        select: {
          position: true,
          eliminatedPlayer: { select: { id: true, firstName: true, lastName: true } },
          eliminatorPlayerId: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  })

  if (!fecha || fecha.eliminations.length === 0) {
    return new Response('No hay fecha completada', { status: 404 })
  }

  const ranking = await calculateTournamentRanking(torneo.id)
  const rankings = ranking?.rankings ?? []

  type Tarjeta = { rotulo: string; color: string; nombre: string; detalle: string }
  const tarjetas: Tarjeta[] = []

  // El Varon: mas eliminaciones. La posicion 1 no cuenta, el ganador se guarda
  // como su propio eliminador.
  const conteo = new Map<string, number>()
  for (const e of fecha.eliminations) {
    if (e.position === 1) continue
    conteo.set(e.eliminatorPlayerId, (conteo.get(e.eliminatorPlayerId) ?? 0) + 1)
  }
  if (conteo.size > 0) {
    const [id, cuenta] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]
    const jugador = await prisma.player.findUnique({
      where: { id },
      select: { firstName: true, lastName: true },
    })
    if (jugador) {
      tarjetas.push({
        rotulo: 'EL VARÓN DE LA NOCHE',
        color: COLORES.marcaTexto,
        nombre: nombreCorto(jugador),
        detalle: `${cuenta} eliminaciones`,
      })
    }
  }

  // El Malazo: el primero en salir, o sea la posicion mas alta.
  const malazo = fecha.eliminations[fecha.eliminations.length - 1]
  if (malazo) {
    tarjetas.push({
      rotulo: 'EL MALAZO',
      color: COLORES.malazo,
      nombre: nombreCorto(malazo.eliminatedPlayer),
      detalle: 'primero eliminado',
    })
  }

  const queBajo = rankings.filter((r) => r.positionsChanged < 0)
  const queSubio = rankings.filter((r) => r.positionsChanged > 0)

  if (queBajo.length > 0) {
    const peor = queBajo.reduce((a, b) => (b.positionsChanged < a.positionsChanged ? b : a))
    tarjetas.push({
      rotulo: 'NOCHE PARA OLVIDAR',
      color: COLORES.baja,
      nombre: shortenFullName(peor.playerName),
      detalle: `bajó ${Math.abs(peor.positionsChanged)} puestos`,
    })
  }

  if (queSubio.length > 0) {
    const mejor = queSubio.reduce((a, b) => (b.positionsChanged > a.positionsChanged ? b : a))
    tarjetas.push({
      rotulo: 'EL MÁS CONTENTO',
      color: COLORES.sube,
      nombre: shortenFullName(mejor.playerName),
      detalle: `subió ${mejor.positionsChanged} puestos`,
    })
  }

  if (tarjetas.length === 0) {
    return new Response('No hay nada que contar de la fecha', { status: 404 })
  }

  const ALTO_TARJETA = 150
  const alto = 300 + tarjetas.length * (ALTO_TARJETA + 16)

  return new ImageResponse(
    (
      <Marco
        titulo="Lo que dejó la noche"
        subtitulo={`Torneo ${torneo.number} · Fecha ${fecha.dateNumber}`}
        alto={alto}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          {tarjetas.map((t) => (
            <div
              key={t.rotulo}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: ALTO_TARJETA,
                marginBottom: 16,
                padding: '0 28px',
                borderRadius: 18,
                background: COLORES.tarjeta,
                border: `1px solid ${COLORES.borde}`,
                borderLeft: `10px solid ${t.color}`,
              }}
            >
              <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, color: t.color, fontWeight: 700 }}>
                {t.rotulo}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8 }}>
                <div style={{ display: 'flex', fontSize: 46, fontWeight: 900, color: COLORES.tinta }}>
                  {t.nombre}
                </div>
                <div style={{ display: 'flex', fontSize: 28, color: COLORES.tintaSuave, marginLeft: 16 }}>
                  {t.detalle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Marco>
    ),
    { width: ANCHO, height: alto }
  )
}
