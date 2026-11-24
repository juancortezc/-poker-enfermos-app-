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
 * explicito o falla en tiempo de render. Tampoco hay emojis: el renderizador
 * no trae la fuente, asi que donde la app pone 💀 aqui va una pastilla rosa.
 */

/** Ancho pensado para que WhatsApp no lo recomprima a papilla. */
export const ANCHO = 1080

/** Aire a los lados. El contenido util queda en ANCHO - 2*PADDING. */
const PADDING = 40
const ANCHO_UTIL = ANCHO - PADDING * 2

/**
 * Paleta tomada de la app. Las imagenes arrancaron oscuras, del sistema
 * viejo, y desentonaban: ahora comparten el mismo papel, la misma tinta y los
 * mismos colores por rol — rojo la marca, rosa los malazos, oro/plata/bronce
 * el podio, verde el que sube, naranja el que baja.
 *
 * Los que empiezan por `tabla` vienen de CPRankingView: la tabla real es una
 * grilla de bordes negros sobre blanco, no una lista de tarjetas, y la imagen
 * tiene que verse igual.
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
  // Grilla de la tabla, igual que CPRankingView
  tablaRejilla: '#000000',
  tablaCabecera: '#382E2C',
  tablaCabeceraTexto: '#F5EFE6',
  tablaPuntos: '#C62828',
  tablaTintePuntos: '#FFF5F4',
  tablaFilaPar: '#FFFFFF',
  tablaFilaImpar: '#F7F7F7',
  tablaFilaMalazo: '#FDEBEE',
  tablaNota: '#9A8F8B',
  tablaApagado: '#9A8F8B',
  // Metales vivos: sirven de relleno y de borde, nunca de texto
  oroVivo: '#E8C158',
  plataViva: '#C9C6C2',
  bronceVivo: '#C08A54',
}

/** Metal de relleno por puesto del podio. */
export const MEDALLA = [COLORES.oroVivo, COLORES.plataViva, COLORES.bronceVivo]
/** El mismo metal pero COMO TEXTO sobre papel: estos si pasan contraste. */
const MEDALLA_TEXTO = [COLORES.oro, COLORES.plata, COLORES.bronce]

/**
 * Satori no nos mide el contenido: ImageResponse EXIGE el alto y, si no se le
 * da, pone 630 y recorta la imagen por la mitad. Asi que cada pieza suma sus
 * bloques a mano con estos ayudantes. Si cambias un fontSize, vuelve a mirar
 * la imagen renderizada: el numero de aqui ya no sirve.
 */
const INTERLINEA = 1.2
const linea = (px: number) => Math.round(px * INTERLINEA)

/** Alto de la cabecera y el pie del marco, que son iguales en todas. */
const ALTO_MARCO =
  PADDING + linea(26) + 8 + linea(62) + 28 + 26 + linea(24) + PADDING

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
        padding: PADDING,
        fontFamily: 'Inter',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
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
            fontSize: 62,
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
          paddingTop: 26,
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

import sharp from 'sharp'
import { ImageResponse } from 'next/og'
import {
  calculateTournamentRanking,
  compareByTiebreak,
  nightlyPosition,
  playedDateNumbers,
  scoreOf,
  SCORE_LABELS,
  type PlayerRanking,
} from '@/lib/ranking-utils'
import { fullName, shortenFullName } from '@/lib/player-name'
import { getPlayerPhotoUrl } from '@/lib/player-utils'
import { getAvatarColor, getInitials } from '@/lib/avatar-utils'
import { prisma } from '@/lib/prisma'
// La lista de campos del jugador NO se escribe a mano: el selector compartido
// existe para que ningun `select` pueda arrastrar `pin` ni `adminKey`, y para
// que haya un solo archivo donde comprobarlo.
import { PLAYER_PUBLIC_SELECT } from '@/lib/player-select'

/** Nombre real abreviado. Las imagenes tienen que nombrar igual a la misma
 *  persona, y la tabla del torneo usa el nombre real, no el alias. */
const nombreCorto = (p: { firstName: string; lastName?: string | null }) =>
  shortenFullName(fullName(p))

/* ── Tipografia ──────────────────────────────────────────────────────────
 *
 * Satori solo dibuja los pesos que se le entregan: con la fuente de fabrica
 * (un unico regular) todo salia del mismo grosor y la jerarquia se perdia —
 * el nombre del campeon pesaba igual que el pie de pagina.
 *
 * Se baja Inter, la misma de la app, en los tres pesos que se usan. Se baja
 * una sola vez por proceso. Si falla, se renderiza sin `fonts` y cae a la
 * fuente de fabrica: una imagen sin negritas es mucho mejor que ninguna.
 * ──────────────────────────────────────────────────────────────────────── */

type Fuente = { name: string; data: ArrayBuffer; weight: 400 | 700 | 900; style: 'normal' }

/** UA viejo a proposito: asi Google Fonts devuelve TTF, que es lo que satori
 *  entiende. Con un UA moderno contesta woff2 y no sirve. */
const UA_SIN_WOFF2 =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1'

async function bajarInter(peso: 400 | 700 | 900): Promise<Fuente | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${peso}`, {
      headers: { 'User-Agent': UA_SIN_WOFF2 },
    }).then((r) => (r.ok ? r.text() : ''))
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!url) return null
    const res = await fetch(url)
    if (!res.ok) return null
    return { name: 'Inter', data: await res.arrayBuffer(), weight: peso, style: 'normal' }
  } catch {
    return null
  }
}

let fuentesEnCamino: Promise<Fuente[]> | null = null

function fuentes(): Promise<Fuente[]> {
  fuentesEnCamino ??= Promise.all([bajarInter(400), bajarInter(700), bajarInter(900)]).then(
    (f) => f.filter((x): x is Fuente => x !== null)
  )
  return fuentesEnCamino
}

/** Render final: ancho de WhatsApp y la tipografia ya cargada. */
async function imagen(nodo: React.ReactElement, alto: number): Promise<Response> {
  const cargadas = await fuentes()
  return new ImageResponse(nodo, {
    width: ANCHO,
    height: alto,
    ...(cargadas.length > 0 ? { fonts: cargadas } : {}),
  })
}

/* ── Fotos ───────────────────────────────────────────────────────────────
 *
 * Las originales son PNG de ~3 MB y 1086×1448. Incrustar treinta de esas en
 * un render lo tumba (y una sola que falle rompe la imagen entera), asi que
 * aqui se bajan una vez, se encogen a un cuadrado del lado que se va a
 * dibujar — con el encuadre arriba, como `object-top` en la app — y se
 * incrustan como JPEG de pocos KB.
 *
 * Si la foto no esta o no se puede bajar, devuelve null y quien dibuja cae a
 * las iniciales. Nunca lanza: una cara que falta no puede costar la imagen.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * libvips abre un hilo por nucleo y, con varias fotos encogiendose a la vez,
 * eso multiplica los buffers intermedios sin ganar nada: en Vercel el cuello
 * es la red, no la CPU. Un hilo por operacion y el paralelismo lo pone el
 * pool de mas abajo, que si sabemos cuanto vale.
 */
sharp.concurrency(1)

/**
 * Plazo de cada descarga. Un storage lento no puede comerse los 30 s que dura
 * la funcion: pasado el plazo se corta, la foto queda en null y esa cara cae a
 * iniciales. Una imagen con una cara menos sale; una que se queda colgada, no.
 */
const PLAZO_FOTO_MS = 8000

/** Cuantas caras se bajan y encogen a la vez. Con seis conexiones la red ya
 *  esta saturada: subir el numero no acelera y si multiplica la memoria, que
 *  es lo que aprieta cuando la tabla pasa de 19 a 24 jugadores. */
const CARAS_A_LA_VEZ = 5

/**
 * Las fotos no cambian: se guardan mientras viva el proceso. Son DOS caches a
 * proposito.
 *
 * `cacheOriginales` guarda el PNG tal como viene, por URL sola. La misma
 * persona se dibuja a varios lados —44 en la tabla, 84 en la tira, 170 de
 * acompanante, 260 de campeon— y con una unica cache por `url@lado` el archivo
 * de ~3 MB se volvia a bajar entero una vez por tamano: el campeon de la noche
 * sale en cuatro piezas, o sea cuatro descargas del mismo archivo.
 *
 * Guarda la PROMESA y no el buffer para que dos pedidos simultaneos de la
 * misma cara compartan una sola descarga en vez de disparar dos.
 */
const cacheOriginales = new Map<string, Promise<Buffer | null>>()

/** Y esta guarda el JPEG ya encogido, que si depende del lado. Son pocos KB. */
const cacheFotos = new Map<string, string | null>()

/** El archivo original, bajado una sola vez por URL. Nunca lanza. */
function original(url: string): Promise<Buffer | null> {
  let enCamino = cacheOriginales.get(url)
  if (!enCamino) {
    enCamino = fetch(url, { signal: AbortSignal.timeout(PLAZO_FOTO_MS) })
      .then(async (res) => (res.ok ? Buffer.from(await res.arrayBuffer()) : null))
      .catch(() => null)
    cacheOriginales.set(url, enCamino)
  }
  return enCamino
}

async function fotoChica(url: string | null | undefined, lado: number): Promise<string | null> {
  if (!url) return null
  const clave = `${url}@${lado}`
  const guardada = cacheFotos.get(clave)
  if (guardada !== undefined) return guardada

  let dataUri: string | null = null
  try {
    const bytes = await original(url)
    if (bytes) {
      const chica = await sharp(bytes)
        .resize(lado, lado, { fit: 'cover', position: 'top' })
        .jpeg({ quality: 82 })
        .toBuffer()
      dataUri = `data:image/jpeg;base64,${chica.toString('base64')}`
    }
  } catch {
    dataUri = null
  }

  cacheFotos.set(clave, dataUri)
  return dataUri
}

/**
 * Baja las fotos de una lista y devuelve un mapa por id, de a lotes.
 *
 * Antes iban todas con un `Promise.all` suelto: en la tabla del torneo eso son
 * 19-24 descargas de ~3 MB a la vez MAS 19-24 `sharp()` sobre PNG de 1086×1448
 * (unos 6 MB en crudo al decodificar cada uno). Entraba en 1024 MB por los
 * pelos; el lote lo deja plano sin tardar mas, porque el limite es la red.
 */
async function fotosDe(
  gente: Array<{ id: string; url: string | null | undefined }>,
  lado: number
): Promise<Map<string, string | null>> {
  const unicos = [...new Map(gente.map((g) => [g.id, g])).values()]
  const caras: Array<string | null> = []
  for (let i = 0; i < unicos.length; i += CARAS_A_LA_VEZ) {
    const lote = unicos.slice(i, i + CARAS_A_LA_VEZ)
    caras.push(...(await Promise.all(lote.map((g) => fotoChica(g.url, lado)))))
  }
  return new Map(unicos.map((g, i) => [g.id, caras[i]]))
}

/**
 * La cara de un jugador. Con foto, la foto; sin foto, las iniciales sobre su
 * color de siempre — el mismo criterio y el mismo color que HomeAvatar, para
 * que el jugador sin foto se reconozca igual en la app y en la imagen.
 */
function Cara({
  foto,
  nombre,
  semilla,
  lado,
  radio = 8,
  borde,
}: {
  foto: string | null
  nombre: string
  semilla: string
  lado: number
  radio?: number | string
  borde?: string
}) {
  const comun: React.CSSProperties = {
    width: lado,
    height: lado,
    borderRadius: radio,
    flexShrink: 0,
    ...(borde ? { border: `${Math.max(2, Math.round(lado / 28))}px solid ${borde}` } : {}),
  }

  if (foto) {
    return (
      // Dentro de ImageResponse no hay next/image: satori solo entiende <img>.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={foto}
        width={lado}
        height={lado}
        style={{ ...comun, objectFit: 'cover' }}
        alt=""
      />
    )
  }

  return (
    <div
      style={{
        ...comun,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: getAvatarColor(semilla),
        color: '#FFFFFF',
        fontWeight: 800,
        fontSize: Math.round(lado * 0.34),
      }}
    >
      {getInitials(nombre)}
    </div>
  )
}

/* ── La tabla ────────────────────────────────────────────────────────────
 *
 * Calcada de CPRankingView: grilla de bordes negros sobre blanco, cabecera
 * cafe oscuro con PUNTOS en rojo, pastilla de medalla en los tres primeros,
 * filas alternadas, los dos ultimos en rosa y la nota de "que estoy mirando"
 * debajo. Las mismas columnas y las mismas etiquetas.
 * ──────────────────────────────────────────────────────────────────────── */

type Celda = { texto: string; color?: string; fondo?: string; peso?: number; italica?: boolean }

type Columna = {
  rotulo: string
  ancho: number
  /** true = la columna que manda, con la cabecera roja y el tinte rosado. */
  manda?: boolean
  celda: (f: FilaTabla) => Celda
}

type FilaTabla = {
  posicion: number
  nombre: string
  foto: string | null
  jugador: PlayerRanking
  esMalazo: boolean
}

const ALTO_FILA = 72
const ALTO_CABECERA_TABLA = 66
const FUENTE_CELDA = 30

/**
 * Lado de la cara en la fila. El mismo numero manda en dos sitios —el tamano
 * al que se baja la foto y el tamano al que se dibuja—, asi que vive aqui: si
 * se mueve uno solo, la foto sale escalada en el PNG.
 */
const LADO_TABLA = 44

function pastillaMedalla(posicion: number) {
  if (posicion === 1) return { background: COLORES.oroVivo, color: '#1A1512' }
  if (posicion === 2) return { background: COLORES.plataViva, color: '#1A1512' }
  if (posicion === 3) return { background: COLORES.bronceVivo, color: '#1A1512' }
  return { background: COLORES.tablaCabecera, color: COLORES.tablaCabeceraTexto }
}

function TablaImagen({
  titulo,
  subtitulo,
  nota,
  filas,
  columnas,
}: {
  titulo: string
  subtitulo: string
  nota: string
  filas: FilaTabla[]
  columnas: Columna[]
}) {
  const ANCHO_PUESTO = 64
  const anchoFijo = ANCHO_PUESTO + columnas.reduce((a, c) => a + c.ancho, 0)
  const anchoNombre = ANCHO_UTIL - anchoFijo

  const rejilla = `1px solid ${COLORES.tablaRejilla}`

  // La nota se parte sola: a 26px entran unos 74 caracteres por renglon.
  const altoNota = Math.max(1, Math.ceil(nota.length / 74)) * Math.round(26 * 1.45) + 18
  const alto =
    ALTO_MARCO + altoNota + 2 + ALTO_CABECERA_TABLA + filas.length * ALTO_FILA

  return {
    alto,
    nodo: (
      <Marco titulo={titulo} subtitulo={subtitulo} alto={alto}>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            lineHeight: 1.45,
            color: COLORES.tablaNota,
            marginBottom: 18,
          }}
        >
          {nota}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: ANCHO_UTIL,
            border: rejilla,
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {/* Cabecera */}
          <div style={{ display: 'flex', height: ALTO_CABECERA_TABLA, alignItems: 'stretch' }}>
            {[
              { rotulo: '#', ancho: ANCHO_PUESTO, manda: false, izquierda: false },
              { rotulo: 'JUGADOR', ancho: anchoNombre, manda: false, izquierda: true },
              ...columnas.map((c) => ({ rotulo: c.rotulo, ancho: c.ancho, manda: !!c.manda, izquierda: false })),
            ].map((c, i, todas) => (
              <div
                key={c.rotulo}
                style={{
                  display: 'flex',
                  width: c.ancho,
                  alignItems: 'center',
                  justifyContent: c.izquierda ? 'flex-start' : 'center',
                  padding: c.izquierda ? '0 12px' : '0 6px',
                  background: c.manda ? COLORES.tablaPuntos : COLORES.tablaCabecera,
                  color: c.manda ? '#FFFFFF' : COLORES.tablaCabeceraTexto,
                  fontSize: 25,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  ...(i === todas.length - 1 ? {} : { borderRight: rejilla }),
                }}
              >
                {c.rotulo}
              </div>
            ))}
          </div>

          {/* Filas */}
          {filas.map((f, i) => {
            const fondoFila = f.esMalazo
              ? COLORES.tablaFilaMalazo
              : i % 2 === 1
                ? COLORES.tablaFilaImpar
                : COLORES.tablaFilaPar
            const medalla = pastillaMedalla(f.posicion)

            return (
              <div
                key={`${f.jugador.playerId}-${i}`}
                style={{
                  display: 'flex',
                  height: ALTO_FILA,
                  alignItems: 'stretch',
                  borderTop: rejilla,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    width: ANCHO_PUESTO,
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: fondoFila,
                    borderRight: rejilla,
                  }}
                >
                  {/* La app pone 💀 en los dos ultimos; aqui no hay fuente de
                      emoji, asi que el puesto va en la pastilla rosa. */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      fontSize: 26,
                      fontWeight: 800,
                      ...(f.esMalazo
                        ? { background: COLORES.malazo, color: '#FFFFFF' }
                        : medalla),
                    }}
                  >
                    {f.posicion}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    width: anchoNombre,
                    alignItems: 'center',
                    padding: '0 14px',
                    background: fondoFila,
                    borderRight: rejilla,
                  }}
                >
                  <Cara
                    foto={f.foto}
                    nombre={f.jugador.playerName}
                    semilla={f.jugador.playerId}
                    lado={LADO_TABLA}
                    radio="50%"
                  />
                  <div
                    style={{
                      display: 'flex',
                      marginLeft: 12,
                      fontSize: FUENTE_CELDA,
                      fontWeight: 600,
                      color: '#000000',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {f.nombre}
                  </div>
                </div>

                {columnas.map((c, j) => {
                  const celda = c.celda(f)
                  return (
                    <div
                      key={c.rotulo}
                      style={{
                        display: 'flex',
                        width: c.ancho,
                        alignItems: 'center',
                        justifyContent: 'center',
                        background:
                          celda.fondo ??
                          (c.manda ? COLORES.tablaTintePuntos : fondoFila),
                        color: celda.color ?? '#000000',
                        fontSize: c.manda ? 34 : FUENTE_CELDA,
                        fontWeight: celda.peso ?? (c.manda ? 900 : 400),
                        ...(celda.italica ? { fontStyle: 'italic' as const } : {}),
                        ...(j === columnas.length - 1 ? {} : { borderRight: rejilla }),
                      }}
                    >
                      {celda.texto}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </Marco>
    ),
  }
}

/** Torneo activo, o null si no hay. */
async function torneoActivo() {
  return prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    select: { id: true, number: true },
  })
}

/** Los dos ultimos puestos de la tabla son el 7/2 del torneo. */
const umbralMalazo = (rankings: PlayerRanking[]) => rankings.length - 2

export async function buildEliminaImage(): Promise<Response> {
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const data = await calculateTournamentRanking(torneo.id)
  if (!data) return new Response('No se pudo calcular la tabla', { status: 500 })

  const { rankings, tournament } = data
  const caras = await fotosDe(
    rankings.map((p) => ({ id: p.playerId, url: p.playerPhoto })),
    LADO_TABLA
  )

  const descartes = tournament.datesToEliminate ?? 2
  const mostrarE3 = descartes >= 3
  const hayMultas = rankings.some((r) => (r.pointPenalty ?? 0) > 0)
  const eliminasActivos = rankings.some((r) => r.eliminasActive)
  const corte = umbralMalazo(rankings)

  const filas: FilaTabla[] = rankings.map((p) => ({
    posicion: p.position,
    nombre: shortenFullName(p.playerName),
    foto: caras.get(p.playerId) ?? null,
    jugador: p,
    esMalazo: p.position > corte,
  }))

  /** Los ELIMINA restan, asi que van en naranja; grises mientras no apliquen. */
  const eliminaDe = (n: 1 | 2 | 3) => (f: FilaTabla): Celda => {
    const proyectado = f.jugador.liveProjection?.[`elimina${n}` as const]
    const real = f.jugador[`elimina${n}` as const]
    const valor = f.jugador.liveProjection ? proyectado : real
    return {
      texto: valor !== undefined ? `−${valor}` : '—',
      color: f.jugador.eliminasActive ? COLORES.baja : COLORES.tablaApagado,
      italica: Boolean(f.jugador.liveProjection),
    }
  }

  const columnas: Columna[] = [
    {
      rotulo: SCORE_LABELS.points,
      ancho: 118,
      manda: true,
      celda: (f) => ({ texto: String(scoreOf(f.jugador)) }),
    },
    {
      rotulo: SCORE_LABELS.accumulated,
      ancho: 108,
      celda: (f) => ({ texto: String(f.jugador.totalPoints), color: COLORES.baja }),
    },
    { rotulo: 'E1', ancho: 78, celda: eliminaDe(1) },
    { rotulo: 'E2', ancho: 78, celda: eliminaDe(2) },
    ...(mostrarE3 ? [{ rotulo: 'E3', ancho: 78, celda: eliminaDe(3) }] : []),
    ...(hayMultas
      ? [
          {
            rotulo: 'MULTA',
            ancho: 104,
            celda: (f: FilaTabla): Celda => ({
              texto: (f.jugador.pointPenalty ?? 0) > 0 ? `−${f.jugador.pointPenalty}` : '—',
              color: COLORES.baja,
            }),
          },
        ]
      : []),
  ]

  const nota = hayMultas
    ? `${SCORE_LABELS.points} = ${SCORE_LABELS.accumulated} menos las fechas descartadas y las multas de puntos.`
    : `${SCORE_LABELS.points} = ${SCORE_LABELS.accumulated} menos las fechas descartadas.${
        eliminasActivos ? '' : ' Todavía no se restan: empiezan a mitad del torneo.'
      }`

  const { alto, nodo } = TablaImagen({
    titulo: `Tabla Torneo ${torneo.number}`,
    subtitulo: 'Elimina',
    nota,
    filas,
    columnas,
  })
  return imagen(nodo, alto)
}

/**
 * La tabla sin descartar fechas: ordenada por puntos reales.
 *
 * Trae DIF, que es lo que el ELIMINA (y las multas) le quitan a cada uno —
 * sin esa columna la imagen no se distingue de la otra tabla.
 */
export async function buildAcumImage(): Promise<Response> {
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const data = await calculateTournamentRanking(torneo.id)
  if (!data) return new Response('No se pudo calcular la tabla', { status: 500 })

  const caras = await fotosDe(
    data.rankings.map((p) => ({ id: p.playerId, url: p.playerPhoto })),
    LADO_TABLA
  )

  const acumDe = (p: PlayerRanking) => p.totalPoints + (p.liveProjection?.points ?? 0)

  const ordenadas = [...data.rankings].sort((a, b) => {
    const dif = acumDe(b) - acumDe(a)
    if (dif !== 0) return dif
    // Mismos desempates que la tabla oficial, importados y no copiados.
    return compareByTiebreak(a, b)
  })

  const corte = umbralMalazo(ordenadas)
  let puesto = 1
  const filas: FilaTabla[] = ordenadas.map((p, i) => {
    if (i > 0 && acumDe(ordenadas[i - 1]) !== acumDe(p)) puesto = i + 1
    return {
      posicion: puesto,
      nombre: shortenFullName(p.playerName),
      foto: caras.get(p.playerId) ?? null,
      jugador: p,
      esMalazo: puesto > corte,
    }
  })

  const columnas: Columna[] = [
    {
      rotulo: SCORE_LABELS.accumulated,
      ancho: 126,
      manda: true,
      celda: (f) => ({ texto: String(acumDe(f.jugador)) }),
    },
    {
      rotulo: SCORE_LABELS.points,
      ancho: 118,
      celda: (f) => ({ texto: String(scoreOf(f.jugador)) }),
    },
    {
      rotulo: 'DIF',
      ancho: 104,
      celda: (f) => {
        const dif = acumDe(f.jugador) - scoreOf(f.jugador)
        return {
          texto: dif > 0 ? `−${dif}` : '—',
          color: dif > 0 ? COLORES.baja : COLORES.tablaApagado,
        }
      },
    },
  ]

  const { alto, nodo } = TablaImagen({
    titulo: `Tabla Torneo ${torneo.number}`,
    subtitulo: `${SCORE_LABELS.accumulated} · sin descartar fechas`,
    nota: `Ordenado por ${SCORE_LABELS.accumulated}: todos los puntos, sin descartar ninguna fecha. No es la tabla oficial — DIF es lo que te quita el ELIMINA.`,
    filas,
    columnas,
  })
  return imagen(nodo, alto)
}

/* ── Podios ──────────────────────────────────────────────────────────────
 *
 * Mismo esqueleto para la noche y para el torneo: el campeon manda con la
 * cara grande y los dos acompanantes van abajo, lado a lado. Lo que cambia es
 * de donde salen los numeros.
 * ──────────────────────────────────────────────────────────────────────── */

type Puesto = {
  puesto: number
  nombre: string
  alias?: string | null
  foto: string | null
  semilla: string
  valor: number
  /** Rotulo del numero. Si no se pasa, Podio pone PUNTOS: era lo que los dos
   *  podios venian pasando igual. */
  rotuloValor?: string
  /** Hasta tres datos chicos bajo el campeon. */
  pie?: Array<{ valor: string; rotulo: string }>
}

const LADO_CAMPEON = 260
const LADO_ACOMPANANTE = 170

/** Alto de la tarjeta del campeon: manda la cara o la columna de texto. */
function altoCampeon(conAlias: boolean, conPie: boolean) {
  const texto =
    linea(25) +
    10 +
    linea(58) +
    (conAlias ? 6 + linea(28) : 0) +
    14 +
    linea(64) +
    (conPie ? 18 + 16 + 1 + linea(34) + 2 + linea(21) : 0)
  return Math.max(LADO_CAMPEON, texto) + 28 * 2 + 3 * 2
}

const ALTO_ACOMPANANTE =
  Math.max(LADO_ACOMPANANTE, linea(34) + 4 + linea(34) + 8 + linea(44)) + 22 * 2 + 2 * 2

/**
 * Lado de la cara de la tira. El numero tiene que llegar igual a tres sitios
 * —la foto que se baja, el alto que se reserva aqui y el `lado` con el que se
 * dibuja—, y moverlo en uno solo descuadra la tira sin que nada avise.
 */
const LADO_TIRA = 84
const ALTO_TIRA = Math.max(LADO_TIRA, linea(21) + 4 + linea(38) + 2 + linea(24)) + 20 * 2 + 2

function Podio({
  puestos,
  rotuloCampeon,
  extra,
}: {
  puestos: Puesto[]
  rotuloCampeon: string
  extra?: React.ReactNode
}) {
  const campeon = puestos[0]
  const resto = puestos.slice(1, 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: ANCHO_UTIL }}>
      {/* Campeon: tarjeta oscura, la celebracion de la imagen */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: 28,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #231A14 0%, #17120F 60%)',
          border: `3px solid ${COLORES.oroVivo}`,
        }}
      >
        <Cara
          foto={campeon.foto}
          nombre={campeon.nombre}
          semilla={campeon.semilla}
          lado={LADO_CAMPEON}
          radio={18}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            marginLeft: 30,
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 25,
              letterSpacing: 4,
              fontWeight: 800,
              color: COLORES.oroVivo,
            }}
          >
            {rotuloCampeon.toUpperCase()}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 58,
              fontWeight: 900,
              color: '#FFFFFF',
              marginTop: 10,
            }}
          >
            {campeon.nombre}
          </div>
          {campeon.alias ? (
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                fontStyle: 'italic',
                color: COLORES.oroVivo,
                marginTop: 6,
              }}
            >
              {`"${campeon.alias}"`}
            </div>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 14 }}>
            <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, color: COLORES.oroVivo }}>
              {campeon.valor}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: 27,
                letterSpacing: 3,
                color: '#C9BDB4',
                marginLeft: 12,
              }}
            >
              {campeon.rotuloValor ?? SCORE_LABELS.points}
            </div>
          </div>

          {campeon.pie && campeon.pie.length > 0 ? (
            <div
              style={{
                display: 'flex',
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              {campeon.pie.map((d) => (
                <div key={d.rotulo} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ display: 'flex', fontSize: 34, fontWeight: 900, color: '#FFFFFF' }}>
                    {d.valor}
                  </div>
                  <div style={{ display: 'flex', fontSize: 21, color: '#A99C94', marginTop: 2 }}>
                    {d.rotulo}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Plata y bronce, lado a lado */}
      {resto.length > 0 ? (
        <div style={{ display: 'flex', marginTop: 18 }}>
          {resto.map((p, i) => {
            const metal = MEDALLA[p.puesto - 1] ?? COLORES.plataViva
            const metalTexto = MEDALLA_TEXTO[p.puesto - 1] ?? COLORES.plata
            return (
              <div
                key={p.semilla}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  marginLeft: i === 0 ? 0 : 18,
                  padding: 22,
                  borderRadius: 20,
                  background: COLORES.tarjeta,
                  border: `2px solid ${metal}`,
                }}
              >
                <Cara
                  foto={p.foto}
                  nombre={p.nombre}
                  semilla={p.semilla}
                  lado={LADO_ACOMPANANTE}
                  radio={14}
                />
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 20, flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 34,
                      fontWeight: 900,
                      color: metalTexto,
                    }}
                  >
                    {`#${p.puesto}`}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 34,
                      fontWeight: 700,
                      color: COLORES.tinta,
                      marginTop: 4,
                    }}
                  >
                    {p.nombre}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 8 }}>
                    <div style={{ display: 'flex', fontSize: 44, fontWeight: 900, color: COLORES.tinta }}>
                      {p.valor}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        fontSize: 22,
                        letterSpacing: 2,
                        color: COLORES.tintaSuave,
                        marginLeft: 10,
                      }}
                    >
                      {p.rotuloValor ?? SCORE_LABELS.points}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {extra}
    </div>
  )
}

/** Tira de datos sueltos al pie de una imagen (jugaron, varon de la noche...). */
type DatoTira = {
  rotulo: string
  texto: string
  color: string
  detalle?: string
  foto?: string | null
  semilla?: string
}

function TiraDatos({ datos }: { datos: DatoTira[] }) {
  return (
    <div style={{ display: 'flex', marginTop: 18 }}>
      {datos.map((d, i) => (
        <div
          key={d.rotulo}
          style={{
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            marginLeft: i === 0 ? 0 : 18,
            padding: '20px 22px',
            borderRadius: 18,
            background: COLORES.tarjeta,
            border: `1px solid ${COLORES.borde}`,
            borderLeft: `10px solid ${d.color}`,
          }}
        >
          {d.foto !== undefined ? (
            <div style={{ display: 'flex', marginRight: 16 }}>
              <Cara foto={d.foto} nombre={d.texto} semilla={d.semilla ?? d.texto} lado={LADO_TIRA} radio={12} />
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', fontSize: 21, letterSpacing: 3, fontWeight: 700, color: d.color }}>
              {d.rotulo}
            </div>
            <div style={{ display: 'flex', fontSize: 38, fontWeight: 900, color: COLORES.tinta, marginTop: 4 }}>
              {d.texto}
            </div>
            {d.detalle ? (
              <div style={{ display: 'flex', fontSize: 24, color: COLORES.tintaSuave, marginTop: 2 }}>
                {d.detalle}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )
}

/** La ultima fecha cerrada del torneo activo, con todo lo que hace falta. */
async function ultimaFechaCerrada(torneoId: number) {
  return prisma.gameDate.findFirst({
    where: { tournamentId: torneoId, status: 'completed' },
    orderBy: { dateNumber: 'desc' },
    select: {
      dateNumber: true,
      playerIds: true,
      eliminations: {
        select: {
          position: true,
          points: true,
          eliminatedPlayer: {
            select: PLAYER_PUBLIC_SELECT,
          },
          eliminatorPlayerId: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  })
}

type JugadorFecha = {
  id: string
  firstName: string
  lastName: string | null
  aliases: string[] | null
  photoUrl: string | null
  role: string | null
}

const urlFoto = (j: JugadorFecha) => getPlayerPhotoUrl(j.photoUrl, j.role) ?? null

/** El Varon de la noche: el que mas gente saco. */
function varonDeLaNoche(eliminaciones: Array<{ position: number; eliminatorPlayerId: string }>) {
  // La posicion 1 no cuenta: el ganador se guarda como su propio eliminador.
  const conteo = new Map<string, number>()
  for (const e of eliminaciones) {
    if (e.position === 1) continue
    conteo.set(e.eliminatorPlayerId, (conteo.get(e.eliminatorPlayerId) ?? 0) + 1)
  }
  if (conteo.size === 0) return null
  const [id, cuenta] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]
  return { id, cuenta }
}

/** PODIO DE LA NOCHE: los tres primeros de la fecha recien jugada. */
export async function buildUltimaFechaImage(): Promise<Response> {
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const fecha = await ultimaFechaCerrada(torneo.id)
  if (!fecha || fecha.eliminations.length === 0) {
    return new Response('No hay fecha completada', { status: 404 })
  }

  const podio = fecha.eliminations.filter((e) => e.position <= 3).sort((a, b) => a.position - b.position)
  if (podio.length === 0) return new Response('La fecha no tiene podio', { status: 404 })

  const varon = varonDeLaNoche(fecha.eliminations)
  const jugadorVaron = varon
    ? await prisma.player.findUnique({
        where: { id: varon.id },
        select: PLAYER_PUBLIC_SELECT,
      })
    : null

  // Una sola pasada por las fotos: el campeon grande, el resto chico.
  const [caraCampeon, carasResto, caraVaron] = await Promise.all([
    fotoChica(urlFoto(podio[0].eliminatedPlayer), LADO_CAMPEON),
    fotosDe(
      podio.slice(1).map((e) => ({ id: e.eliminatedPlayer.id, url: urlFoto(e.eliminatedPlayer) })),
      LADO_ACOMPANANTE
    ),
    jugadorVaron ? fotoChica(urlFoto(jugadorVaron), LADO_TIRA) : Promise.resolve(null),
  ])

  const puestos: Puesto[] = podio.map((e, i) => ({
    puesto: e.position,
    nombre: nombreCorto(e.eliminatedPlayer),
    alias: i === 0 ? (e.eliminatedPlayer.aliases?.[0] ?? null) : null,
    foto: i === 0 ? caraCampeon : (carasResto.get(e.eliminatedPlayer.id) ?? null),
    semilla: e.eliminatedPlayer.id,
    valor: e.points,
  }))

  const datos: DatoTira[] = []
  if (jugadorVaron && varon) {
    datos.push({
      rotulo: 'EL VARÓN DE LA NOCHE',
      texto: nombreCorto(jugadorVaron),
      detalle: `${varon.cuenta} eliminaciones`,
      color: COLORES.marcaTexto,
      foto: caraVaron,
      semilla: jugadorVaron.id,
    })
  }
  datos.push({
    rotulo: 'JUGARON',
    texto: `${fecha.playerIds.length} enfermos`,
    detalle: `fecha ${fecha.dateNumber} del torneo ${torneo.number}`,
    color: COLORES.tintaMedia,
  })

  const alto =
    ALTO_MARCO +
    altoCampeon(Boolean(puestos[0].alias), false) +
    (puestos.length > 1 ? 18 + ALTO_ACOMPANANTE : 0) +
    18 +
    ALTO_TIRA

  return imagen(
    <Marco
      titulo={`Podio de la Fecha ${fecha.dateNumber}`}
      subtitulo={`Torneo ${torneo.number} · la noche`}
      alto={alto}
    >
      <Podio
        puestos={puestos}
        rotuloCampeon="campeón de la noche"
        extra={<TiraDatos datos={datos} />}
      />
    </Marco>,
    alto
  )
}

/** PODIO DEL TORNEO: los tres primeros de la tabla acumulada. */
export async function buildPodioTorneoImage(): Promise<Response> {
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const data = await calculateTournamentRanking(torneo.id)
  if (!data || data.rankings.length === 0) {
    return new Response('No se pudo calcular la tabla', { status: 500 })
  }

  const { rankings, tournament } = data
  const tres = rankings.filter((r) => r.position <= 3).sort((a, b) => a.position - b.position)
  if (tres.length === 0) return new Response('La tabla no tiene podio', { status: 404 })

  const fechasJugadas = playedDateNumbers(rankings)
  const mesasFinalesDe = (p: PlayerRanking) =>
    fechasJugadas.filter(
      (d) => (p.pointsByDate[d] ?? 0) > 0 && (nightlyPosition(rankings, d, p.playerId) ?? 999) <= 9
    ).length

  const [caraLider, carasResto] = await Promise.all([
    fotoChica(tres[0].playerPhoto, LADO_CAMPEON),
    fotosDe(
      tres.slice(1).map((p) => ({ id: p.playerId, url: p.playerPhoto })),
      LADO_ACOMPANANTE
    ),
  ])

  const lider = tres[0]
  const puestos: Puesto[] = tres.map((p, i) => ({
    puesto: p.position,
    nombre: shortenFullName(p.playerName),
    alias: i === 0 ? (p.playerAlias || null) : null,
    foto: i === 0 ? caraLider : (carasResto.get(p.playerId) ?? null),
    semilla: p.playerId,
    valor: scoreOf(p),
    pie:
      i === 0
        ? [
            { valor: String(mesasFinalesDe(lider)), rotulo: 'MESAS FINALES' },
            {
              valor: String(lider.firstPlaces + lider.secondPlaces + lider.thirdPlaces),
              rotulo: 'PODIOS',
            },
            { valor: String(lider.firstPlaces), rotulo: 'VICTORIAS' },
          ]
        : undefined,
  }))

  const alto =
    ALTO_MARCO +
    altoCampeon(Boolean(puestos[0].alias), true) +
    (puestos.length > 1 ? 18 + ALTO_ACOMPANANTE : 0)

  return imagen(
    <Marco
      titulo="Podio del torneo"
      subtitulo={`Torneo ${torneo.number} · ${fechasJugadas.length} de ${tournament.totalDates ?? 12} fechas`}
      alto={alto}
    >
      <Podio puestos={puestos} rotuloCampeon="líder del torneo" />
    </Marco>,
    alto
  )
}

/* ── Los 7/2 ─────────────────────────────────────────────────────────────
 *
 * El rosa es de ellos y de nadie mas, igual que en el home. Tarjeta rellena,
 * texto blanco y la cara grande: el malazo se mira, no se lee.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Lados de las caras rosas. Cada uno tiene que llegar igual a tres sitios —la
 * foto que se baja, el alto que se reserva con `altoMalazo` y el `lado` con el
 * que se dibuja la tarjeta—. Con los numeros sueltos, cambiar el del JSX y
 * olvidar el de `altoMalazo` saca la tarjeta cortada en el PNG, y eso no se
 * nota hasta que alguien mira la imagen.
 */
const LADO_MALAZO = 230
const LADO_MALAZO_SEGUNDO = 150

/** Alto de una tarjeta rosa: manda la cara o la columna de texto. */
function altoMalazo(lado: number, conDetalle: boolean) {
  const texto = linea(24) + 8 + linea(54) + 10 + linea(52) + (conDetalle ? 10 + linea(27) : 0)
  const cara = lado + 2 * Math.max(2, Math.round(lado / 28))
  return Math.max(cara, texto) + 26 * 2
}

function TarjetaMalazo({
  rotulo,
  nombre,
  semilla,
  foto,
  lado,
  valor,
  rotuloValor = SCORE_LABELS.points,
  detalle,
  primera,
}: {
  rotulo: string
  nombre: string
  semilla: string
  foto: string | null
  lado: number
  valor: string
  /** Rotulo del numero. Por omision PUNTOS, que es lo que pasaban las tres
   *  llamadas. */
  rotuloValor?: string
  detalle?: string | null
  primera: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: ANCHO_UTIL,
        marginTop: primera ? 0 : 18,
        padding: 26,
        borderRadius: 24,
        background: `linear-gradient(135deg, ${COLORES.malazo} 0%, #8E1148 100%)`,
      }}
    >
      <Cara foto={foto} nombre={nombre} semilla={semilla} lado={lado} radio={18} borde="rgba(255,255,255,0.45)" />
      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 28, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 24,
            letterSpacing: 4,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          {rotulo.toUpperCase()}
        </div>
        <div style={{ display: 'flex', fontSize: 54, fontWeight: 900, color: '#FFFFFF', marginTop: 8 }}>
          {nombre}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
          <div style={{ display: 'flex', fontSize: 52, fontWeight: 900, color: '#FFFFFF' }}>{valor}</div>
          <div
            style={{
              display: 'flex',
              fontSize: 25,
              letterSpacing: 3,
              color: 'rgba(255,255,255,0.78)',
              marginLeft: 12,
            }}
          >
            {rotuloValor}
          </div>
        </div>
        {detalle ? (
          <div style={{ display: 'flex', fontSize: 27, color: 'rgba(255,255,255,0.8)', marginTop: 10 }}>
            {detalle}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** EL 7/2 DE LA NOCHE: el primero en salir de la fecha recien jugada. */
export async function buildMalazoFechaImage(): Promise<Response> {
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const fecha = await ultimaFechaCerrada(torneo.id)
  if (!fecha || fecha.eliminations.length === 0) {
    return new Response('No hay fecha completada', { status: 404 })
  }

  // Ordenadas por posicion ascendente: el ultimo es el puesto mas alto, o sea
  // el primero que salio de la mesa.
  const malazo = fecha.eliminations[fecha.eliminations.length - 1]
  const segundo = fecha.eliminations.length > 1 ? fecha.eliminations[fecha.eliminations.length - 2] : null

  const verdugo = await prisma.player.findUnique({
    where: { id: malazo.eliminatorPlayerId },
    select: PLAYER_PUBLIC_SELECT,
  })

  const [caraMalazo, caraSegundo, caraVerdugo] = await Promise.all([
    fotoChica(urlFoto(malazo.eliminatedPlayer), LADO_MALAZO),
    segundo
      ? fotoChica(urlFoto(segundo.eliminatedPlayer), LADO_MALAZO_SEGUNDO)
      : Promise.resolve(null),
    verdugo ? fotoChica(urlFoto(verdugo), LADO_TIRA) : Promise.resolve(null),
  ])

  const alto =
    ALTO_MARCO +
    altoMalazo(LADO_MALAZO, false) +
    (segundo ? 18 + altoMalazo(LADO_MALAZO_SEGUNDO, false) : 0) +
    (verdugo ? 18 + ALTO_TIRA : 0)

  return imagen(
      <Marco
        titulo="El 7/2 de la noche"
        subtitulo={`Torneo ${torneo.number} · Fecha ${fecha.dateNumber}`}
        alto={alto}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: ANCHO_UTIL }}>
          <TarjetaMalazo
            primera
            rotulo="primero en salir"
            nombre={nombreCorto(malazo.eliminatedPlayer)}
            semilla={malazo.eliminatedPlayer.id}
            foto={caraMalazo}
            lado={LADO_MALAZO}
            valor={String(malazo.points)}
          />

          {segundo ? (
            <TarjetaMalazo
              primera={false}
              rotulo="y el segundo en salir"
              nombre={nombreCorto(segundo.eliminatedPlayer)}
              semilla={segundo.eliminatedPlayer.id}
              foto={caraSegundo}
              lado={LADO_MALAZO_SEGUNDO}
              valor={String(segundo.points)}
            />
          ) : null}

          {verdugo ? (
            <TiraDatos
              datos={[
                {
                  rotulo: 'EL VERDUGO',
                  texto: nombreCorto(verdugo),
                  color: COLORES.marcaTexto,
                  foto: caraVerdugo,
                  semilla: verdugo.id,
                },
                {
                  rotulo: 'JUGARON',
                  texto: `${fecha.playerIds.length} enfermos`,
                  detalle: `fecha ${fecha.dateNumber} del torneo ${torneo.number}`,
                  color: COLORES.tintaMedia,
                },
              ]}
            />
          ) : null}
        </div>
      </Marco>,
    alto
  )
}

/** LOS 7/2 DEL TORNEO: los dos ultimos de la tabla. */
export async function buildMalazosTorneoImage(): Promise<Response> {
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const data = await calculateTournamentRanking(torneo.id)
  if (!data || data.rankings.length < 2) {
    return new Response('La tabla todavía no tiene 7/2', { status: 404 })
  }

  const porPuesto = [...data.rankings].sort((a, b) => a.position - b.position)
  // Los dos ultimos, pero de arriba hacia abajo: penultimo y ultimo.
  const dos = porPuesto.slice(-2)
  // El que esta justo encima del 7/2: la referencia de cuanto falta para salir.
  const salvado = porPuesto.length >= 3 ? porPuesto[porPuesto.length - 3] : null

  const caras = await fotosDe(
    dos.map((p) => ({ id: p.playerId, url: p.playerPhoto })),
    LADO_MALAZO
  )

  const alto = ALTO_MARCO + dos.length * altoMalazo(LADO_MALAZO, true) + (dos.length - 1) * 18

  return imagen(
      <Marco
        titulo="Los 7/2 del torneo"
        subtitulo={`Torneo ${torneo.number} · fondo de la tabla`}
        alto={alto}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: ANCHO_UTIL }}>
          {dos.map((p, i) => {
            const falta = salvado ? scoreOf(salvado) - scoreOf(p) : null
            return (
              <TarjetaMalazo
                key={p.playerId}
                primera={i === 0}
                rotulo={`puesto ${p.position} de ${porPuesto.length}`}
                nombre={shortenFullName(p.playerName)}
                semilla={p.playerId}
                foto={caras.get(p.playerId) ?? null}
                lado={LADO_MALAZO}
                valor={String(scoreOf(p))}
                detalle={
                  falta !== null && falta > 0
                    ? `a ${falta} puntos de salir del 7/2`
                    : 'empatado con el primero a salvo'
                }
              />
            )
          })}
        </div>
      </Marco>,
    alto
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
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const fecha = await ultimaFechaCerrada(torneo.id)
  if (!fecha || fecha.eliminations.length === 0) {
    return new Response('No hay fecha completada', { status: 404 })
  }

  const ranking = await calculateTournamentRanking(torneo.id)
  const rankings = ranking?.rankings ?? []
  const fotoDeRanking = new Map(rankings.map((r) => [r.playerId, r.playerPhoto ?? null]))

  type Tarjeta = {
    rotulo: string
    color: string
    nombre: string
    detalle: string
    id: string
    url: string | null
  }
  const tarjetas: Tarjeta[] = []

  const varon = varonDeLaNoche(fecha.eliminations)
  if (varon) {
    const jugador = await prisma.player.findUnique({
      where: { id: varon.id },
      select: PLAYER_PUBLIC_SELECT,
    })
    if (jugador) {
      tarjetas.push({
        rotulo: 'EL VARÓN DE LA NOCHE',
        color: COLORES.marcaTexto,
        nombre: nombreCorto(jugador),
        detalle: `${varon.cuenta} eliminaciones`,
        id: jugador.id,
        url: urlFoto(jugador),
      })
    }
  }

  // El Malazo: el primero en salir, o sea la posicion mas alta.
  const malazo = fecha.eliminations[fecha.eliminations.length - 1]
  if (malazo) {
    tarjetas.push({
      rotulo: 'EL MALAZO 7/2',
      color: COLORES.malazo,
      nombre: nombreCorto(malazo.eliminatedPlayer),
      detalle: 'primero eliminado',
      id: malazo.eliminatedPlayer.id,
      url: urlFoto(malazo.eliminatedPlayer),
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
      id: peor.playerId,
      url: fotoDeRanking.get(peor.playerId) ?? null,
    })
  }

  if (queSubio.length > 0) {
    const mejor = queSubio.reduce((a, b) => (b.positionsChanged > a.positionsChanged ? b : a))
    tarjetas.push({
      rotulo: 'EL MÁS CONTENTO',
      color: COLORES.sube,
      nombre: shortenFullName(mejor.playerName),
      detalle: `subió ${mejor.positionsChanged} puestos`,
      id: mejor.playerId,
      url: fotoDeRanking.get(mejor.playerId) ?? null,
    })
  }

  if (tarjetas.length === 0) {
    return new Response('No hay nada que contar de la fecha', { status: 404 })
  }

  const LADO_CARA = 120
  const caras = await fotosDe(
    tarjetas.map((t) => ({ id: t.id, url: t.url })),
    LADO_CARA
  )

  const ALTO_TARJETA = 168
  const alto = ALTO_MARCO + tarjetas.length * (ALTO_TARJETA + 18) - 18

  return imagen(
      <Marco
        titulo="Lo que dejó la noche"
        subtitulo={`Torneo ${torneo.number} · Fecha ${fecha.dateNumber}`}
        alto={alto}
      >
        <div style={{ display: 'flex', flexDirection: 'column', width: ANCHO_UTIL }}>
          {tarjetas.map((t) => (
            <div
              key={t.rotulo}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: ALTO_TARJETA,
                marginBottom: 18,
                padding: '0 26px',
                borderRadius: 20,
                background: COLORES.tarjeta,
                border: `1px solid ${COLORES.borde}`,
                borderLeft: `12px solid ${t.color}`,
              }}
            >
              <Cara
                foto={caras.get(t.id) ?? null}
                nombre={t.nombre}
                semilla={t.id}
                lado={LADO_CARA}
                radio={14}
              />
              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24, flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 23,
                    letterSpacing: 3,
                    color: t.color,
                    fontWeight: 800,
                  }}
                >
                  {t.rotulo}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontSize: 46,
                    fontWeight: 900,
                    color: COLORES.tinta,
                    marginTop: 8,
                  }}
                >
                  {t.nombre}
                </div>
                <div style={{ display: 'flex', fontSize: 27, color: COLORES.tintaSuave, marginTop: 4 }}>
                  {t.detalle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Marco>,
    alto
  )
}
