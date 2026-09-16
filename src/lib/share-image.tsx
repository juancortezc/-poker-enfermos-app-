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

export const COLORES = {
  fondo: '#1A1310',
  fondoSuave: '#241B17',
  borde: '#3A2C26',
  tinta: '#F5EDE6',
  tintaSuave: '#A4928A',
  marca: '#E53935',
  oro: '#E8C158',
  plata: '#C3C0BC',
  bronce: '#C08A54',
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
        background: COLORES.fondo,
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
            color: COLORES.marca,
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
                    background: i % 2 === 1 ? COLORES.fondoSuave : 'transparent',
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
                        color: medalla ? COLORES.fondo : COLORES.tintaSuave,
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
                    background: campeon ? 'rgba(232,193,88,0.12)' : COLORES.fondoSuave,
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
                      color: COLORES.fondo,
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

            <div style={{ display: 'flex', marginTop: 26 }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  padding: 24,
                  borderRadius: 16,
                  background: COLORES.fondoSuave,
                  border: `1px solid ${COLORES.borde}`,
                  marginRight: 14,
                }}
              >
                <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, color: COLORES.tintaSuave }}>
                  JUGARON
                </div>
                <div style={{ display: 'flex', fontSize: 52, fontWeight: 900, color: COLORES.tinta, marginTop: 6 }}>
                  {fecha.playerIds.length}
                </div>
              </div>

              {varon && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 2,
                    padding: 24,
                    borderRadius: 16,
                    background: 'rgba(229,57,53,0.14)',
                    border: `1px solid ${COLORES.marca}`,
                  }}
                >
                  <div style={{ display: 'flex', fontSize: 22, letterSpacing: 3, color: COLORES.marca }}>
                    VARON DE LA NOCHE
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 6 }}>
                    <div style={{ display: 'flex', fontSize: 42, fontWeight: 900, color: COLORES.tinta }}>
                      {varon.nombre}
                    </div>
                    <div style={{ display: 'flex', fontSize: 28, color: COLORES.tintaSuave, marginLeft: 14 }}>
                      {varon.cuenta} eliminaciones
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Marco>
      ),
      { width: ANCHO, height: alto }
    )
}
