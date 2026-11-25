/**
 * Piezas compartidas por las imagenes para WhatsApp (Mas → Compartir).
 *
 * Se arman con ImageResponse (next/og), que renderiza en el SERVIDOR. Es a
 * proposito: el proyecto ya se habia sacado html2canvas de encima para bajar
 * el bundle, y capturar el DOM en el cliente lo traeria de vuelta. Aqui el
 * costo para el telefono es cero — recibe un PNG y punto.
 *
 * Diseno del T31, lucha libre, el mismo del Inicio (apps/mobile/.../home/
 * lucha.tsx): cartel negro con franjas rojas y cuerdas de ring, la tarjeta del
 * campeon rotada con su cinta oro, titulares en Archivo 900 itálica condensada
 * y las fotos 3:4 como protagonistas. Rosa solo para el 7/2.
 *
 * Ojo al editar: ImageResponse (satori) soporta un subconjunto de CSS. Solo
 * flexbox (nada de grid), y todo div con mas de un hijo necesita display:flex
 * explicito o falla en tiempo de render. Tampoco hay emojis: el renderizador
 * no trae la fuente, asi que las estrellas y la corona van en SVG.
 */

import sharp from 'sharp'
import { ImageResponse } from 'next/og'
import { darkColors as oscuro, lightColors as claro } from '@poker/design'
import { calculateTournamentRanking } from '@/lib/ranking-utils'
import {
  compareByTiebreak,
  leaderPhrase,
  nightWinnerPhrase,
  nightlyPosition,
  playedDateNumbers,
  playerCardUrl,
  playerLabel,
  scoreOf,
  SCORE_LABELS,
  fullName,
  shortenFullName,
  type Phrase,
  type PlayerRanking,
} from '@poker/shared'
import { getPlayerPhotoUrl } from '@/lib/player-utils'
import { getAvatarColor, getInitials } from '@/lib/avatar-utils'
import { prisma } from '@/lib/prisma'
// La lista de campos del jugador NO se escribe a mano: el selector compartido
// existe para que ningun `select` pueda arrastrar `pin` ni `adminKey`, y para
// que haya un solo archivo donde comprobarlo.
import { PLAYER_PUBLIC_SELECT } from '@/lib/player-select'

/** Ancho pensado para que WhatsApp no lo recomprima a papilla. */
export const ANCHO = 1080

/** Aire a los lados. El contenido util queda en ANCHO - 2*PADDING. */
const PADDING = 40
const ANCHO_UTIL = ANCHO - PADDING * 2

/* ── Colores ─────────────────────────────────────────────────────────────
 *
 * Todos salen de @poker/design (una sola fuente para web y app): `claro` es el
 * papel de la pantalla (.cp-light) y `oscuro` el de los carteles negros, el
 * mismo `cp` que usa el Inicio de la app. Aqui solo se les pone nombre.
 * ──────────────────────────────────────────────────────────────────────── */

export const COLORES = {
  // Papel: el suelo de la imagen
  papel: claro.surface0,
  tarjeta: claro.surface1,
  elevada: claro.surface2,
  borde: claro.surfaceBorder,
  tinta: claro.onSurface,
  tintaMedia: claro.onSurfaceMuted,
  tintaSuave: claro.onSurfaceVariant,
  marcaTexto: claro.primaryLight, // rojo COMO TEXTO sobre papel
  sube: claro.positive,
  baja: claro.negative,
  // Cartel negro
  negro: oscuro.surface0,
  negro1: oscuro.surface1,
  negro2: oscuro.surface2,
  negro3: oscuro.surface3,
  crema: oscuro.onSurface,
  cremaMedia: oscuro.onSurfaceMuted,
  marca: oscuro.primary,
  marcaBoton: oscuro.primaryVariant,
  marcaClara: oscuro.primaryLight, // rojo COMO TEXTO sobre negro
  blanco: oscuro.onPrimary,
  tintaPapel: oscuro.ink, // texto sobre oro, plata, bronce, rosa, naranja, verde
  // Podio
  oro: oscuro.gold,
  plata: oscuro.silver,
  bronce: oscuro.bronze,
  oroOscuro: oscuro.goldOnLight,
  // 7/2
  rosa: oscuro.malazo,
  rosaTexto: oscuro.malazoText,
  rosaBloque: oscuro.malazoBlock,
  rosaHondo: oscuro.malazoDeep,
  rosaSuave: oscuro.malazoSoft,
  // Por rol en "lo que dejo la noche"
  naranja: oscuro.negative,
  verde: oscuro.positive,
}

/** Metal de relleno por puesto del podio. */
export const MEDALLA = [COLORES.oro, COLORES.plata, COLORES.bronce]

/** `#RRGGBB` → `rgba()` con la opacidad dada. Para velos y degradados. */
function alfa(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

/* ── Tipografia ──────────────────────────────────────────────────────────
 *
 * Satori solo dibuja los pesos que se le entregan, asi que se bajan todos los
 * que se usan, una vez por proceso:
 *
 * - Inter 400/600/700: el cuerpo (nombres de la tabla, detalles).
 * - Archivo 800/900: cifras y rotulos.
 * - "Cond": Archivo 900 condensada (ancho 75) y su itálica (ancho 70), la de
 *   los titulares del Inicio. Satori no entiende `font-stretch`, por eso va
 *   como familia aparte.
 *
 * Si alguna falla, se renderiza con las que llegaron (o la de fabrica): una
 * imagen sin negritas es mucho mejor que ninguna.
 * ──────────────────────────────────────────────────────────────────────── */

type Fuente = {
  name: string
  data: ArrayBuffer
  weight: 400 | 600 | 700 | 800 | 900
  style: 'normal' | 'italic'
}

/** UA viejo a proposito: asi Google Fonts devuelve TTF, que es lo que satori
 *  entiende. Con un UA moderno contesta woff2 y no sirve. */
const UA_SIN_WOFF2 =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1'

async function bajarFuente(
  familia: string,
  nombre: string,
  peso: Fuente['weight'],
  estilo: Fuente['style'] = 'normal'
): Promise<Fuente | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${familia}`, {
      headers: { 'User-Agent': UA_SIN_WOFF2 },
    }).then((r) => (r.ok ? r.text() : ''))
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1]
    if (!url) return null
    const res = await fetch(url)
    if (!res.ok) return null
    return { name: nombre, data: await res.arrayBuffer(), weight: peso, style: estilo }
  } catch {
    return null
  }
}

let fuentesEnCamino: Promise<Fuente[]> | null = null

function fuentes(): Promise<Fuente[]> {
  fuentesEnCamino ??= Promise.all([
    bajarFuente('Inter:wght@400', 'Inter', 400),
    bajarFuente('Inter:wght@600', 'Inter', 600),
    bajarFuente('Inter:wght@700', 'Inter', 700),
    bajarFuente('Archivo:wght@800', 'Archivo', 800),
    bajarFuente('Archivo:wght@900', 'Archivo', 900),
    bajarFuente('Archivo:wdth,wght@75,900', 'Cond', 900),
    bajarFuente('Archivo:ital,wdth,wght@1,70,900', 'Cond', 900, 'italic'),
  ]).then((f) => f.filter((x): x is Fuente => x !== null))
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

/** Estilos de texto que se repiten. */
const cifra = (size: number, color: string): React.CSSProperties => ({
  display: 'flex',
  fontFamily: 'Archivo',
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1,
  color,
})
const rotulo = (size: number, color: string, espaciado = 3): React.CSSProperties => ({
  display: 'flex',
  fontFamily: 'Cond',
  fontWeight: 900,
  fontSize: size,
  lineHeight: 1,
  letterSpacing: espaciado,
  color,
})
const cuerpo = (size: number, color: string, peso: 400 | 600 | 700 = 400): React.CSSProperties => ({
  display: 'flex',
  fontFamily: 'Inter',
  fontWeight: peso,
  fontSize: size,
  lineHeight: 1.2,
  color,
})
/** Una linea que no se parte: si no entra, puntos suspensivos. */
const unaLinea: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

/* ── Fotos y tarjetas ────────────────────────────────────────────────────
 *
 * Desde el T31 las fotos son WebP: recortes 3:4 de 600x800 en
 * `t31/perfil/<apodo>.webp` y tarjetas 2:3 de 800x1200 (marco y apodo) en
 * `t31/tarjetas/<apodo>.webp`. Satori no decodifica WebP de forma fiable, asi
 * que sharp las baja, las recorta al tamano EXACTO al que se dibujan (encuadre
 * arriba, como `object-top` en la app) y las incrusta como JPEG de pocos KB.
 *
 * Si la foto no esta o no se puede bajar, devuelve null y quien dibuja cae a
 * las iniciales (o, para la tarjeta, a la foto). Nunca lanza: una cara que
 * falta no puede costar la imagen.
 * ──────────────────────────────────────────────────────────────────────── */

/** libvips abre un hilo por nucleo; el cuello es la red, no la CPU. */
sharp.concurrency(1)

/** Plazo de cada descarga: pasado el plazo, esa cara cae a iniciales. */
const PLAZO_FOTO_MS = 8000

/** Cuantas caras se bajan y encogen a la vez. Los WebP del T31 pesan
 *  ~80 KB (los PNG de antes, ~3 MB), asi que ocho a la vez no aprietan. */
const CARAS_A_LA_VEZ = 8

/**
 * Las fotos no cambian: se guardan mientras viva el proceso. `cacheOriginales`
 * guarda el archivo tal como viene, por URL (la PROMESA, para que dos pedidos
 * simultaneos compartan descarga); `cacheFotos` el JPEG ya recortado, que si
 * depende del tamano.
 */
const cacheOriginales = new Map<string, Promise<Buffer | null>>()
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

/**
 * La foto recortada a ancho x alto, como data URI. null si no hay.
 *
 * `radio`: esquinas redondeadas horneadas en la imagen (PNG con alfa) en vez
 * de `borderRadius` en el <img>, y `abajo: false` redondea solo las de arriba.
 * Satori dibuja cada recorte (borderRadius u overflow:hidden) como una
 * mascara, y con varias anidadas el render se iba de 2 s a 30 s: por eso en
 * estas imagenes ninguna foto se recorta en el render.
 */
async function foto(
  url: string | null | undefined,
  ancho: number,
  alto: number,
  radio = 0,
  abajo = true
): Promise<string | null> {
  if (!url) return null
  const clave = `${url}@${ancho}x${alto}r${radio}${abajo ? '' : 'a'}`
  const guardada = cacheFotos.get(clave)
  if (guardada !== undefined) return guardada

  let dataUri: string | null = null
  try {
    const bytes = await original(url)
    if (bytes) {
      const recorte = sharp(bytes)
        .resize(ancho, alto, { fit: 'cover', position: 'top' })
        .flatten({ background: COLORES.negro1 })
      if (radio > 0) {
        const mascara = Buffer.from(
          `<svg width="${ancho}" height="${alto}"><rect width="${ancho}" height="${abajo ? alto : alto + radio}" rx="${radio}" ry="${radio}"/></svg>`
        )
        const chica = await recorte.composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer()
        dataUri = `data:image/png;base64,${chica.toString('base64')}`
      } else {
        const chica = await recorte.jpeg({ quality: 84 }).toBuffer()
        dataUri = `data:image/jpeg;base64,${chica.toString('base64')}`
      }
    }
  } catch {
    dataUri = null
  }

  cacheFotos.set(clave, dataUri)
  return dataUri
}

/** La tarjeta del T31; sin tarjeta (otra temporada), la foto normal. */
async function tarjeta(
  photoUrl: string | null | undefined,
  role: string | null | undefined,
  ancho: number,
  alto: number
): Promise<string | null> {
  const deTarjeta = await foto(playerCardUrl(photoUrl, role), ancho, alto, RADIO_TARJETA)
  return deTarjeta ?? foto(getPlayerPhotoUrl(photoUrl, role), ancho, alto, RADIO_TARJETA)
}

/** Baja las fotos de una lista y devuelve un mapa por id, de a lotes. */
async function fotosDe(
  gente: Array<{ id: string; url: string | null | undefined }>,
  ancho: number,
  alto: number,
  radio = 0,
  abajo = true
): Promise<Map<string, string | null>> {
  const unicos = [...new Map(gente.map((g) => [g.id, g])).values()]
  const caras: Array<string | null> = []
  for (let i = 0; i < unicos.length; i += CARAS_A_LA_VEZ) {
    const lote = unicos.slice(i, i + CARAS_A_LA_VEZ)
    caras.push(...(await Promise.all(lote.map((g) => foto(g.url, ancho, alto, radio, abajo)))))
  }
  return new Map(unicos.map((g, i) => [g.id, caras[i]]))
}

/**
 * La cara de un jugador. Con foto, la foto; sin foto, las iniciales sobre su
 * color de siempre — el mismo criterio y el mismo color que HomeAvatar.
 */
function Cara({
  foto,
  nombre,
  semilla,
  ancho,
  alto,
  radio = 0,
}: {
  foto: string | null
  nombre: string
  semilla: string
  ancho: number
  alto: number
  /** Solo para las iniciales: la foto ya trae sus esquinas horneadas. */
  radio?: number | string
}) {
  const comun: React.CSSProperties = { width: ancho, height: alto, flexShrink: 0 }

  if (foto) {
    return (
      // Dentro de ImageResponse no hay next/image: satori solo entiende <img>.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={foto} width={ancho} height={alto} style={{ ...comun, objectFit: 'cover' }} alt="" />
    )
  }

  return (
    <div
      style={{
        ...comun,
        borderRadius: radio,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: getAvatarColor(semilla),
        color: COLORES.blanco,
        fontFamily: 'Archivo',
        fontWeight: 900,
        fontSize: Math.round(Math.min(ancho, alto) * 0.34),
      }}
    >
      {getInitials(nombre)}
    </div>
  )
}

/* ── Marco y piezas del cartel ───────────────────────────────────────────
 *
 * Satori no mide el contenido: ImageResponse EXIGE el alto y, si no se le da,
 * pone 630 y recorta. Por eso cada bloque tiene alto fijo y cada imagen suma
 * sus bloques a mano. Si cambias un tamano, vuelve a mirar el PNG.
 * ──────────────────────────────────────────────────────────────────────── */

const ALTO_CABECERA = 30 + 10 + 76 // rotulo + aire + titulo
const SEP_CABECERA = 32
const ALTO_PIE = 32 + 26 // aire + marca

/** Alto de marco (fondo, cabecera y pie) alrededor del contenido. */
const ALTO_MARCO = PADDING + ALTO_CABECERA + SEP_CABECERA + ALTO_PIE + PADDING
/** Igual, para las piezas que traen su propia cabecera (las tablas). */
const ALTO_MARCO_SIN_CABECERA = PADDING + ALTO_PIE + PADDING

/** Marco comun: papel, cabecera con el torneo y pie con la marca del grupo. */
export function Marco({
  titulo,
  subtitulo,
  alto,
  children,
}: {
  /** Sin titulo, la pieza pone su propia cabecera. */
  titulo?: string
  subtitulo?: string
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
      {titulo ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: ALTO_CABECERA, marginBottom: SEP_CABECERA }}>
          <div style={{ ...rotulo(30, COLORES.marcaTexto, 5), height: 30 }}>{(subtitulo ?? '').toUpperCase()}</div>
          <div
            style={{
              ...rotulo(76, COLORES.tinta, 1.5),
              fontStyle: 'italic',
              height: 76,
              marginTop: 10,
            }}
          >
            {titulo.toUpperCase()}
          </div>
        </div>
      ) : null}

      {children}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 'auto',
          height: 26,
        }}
      >
        <div style={{ display: 'flex', width: 34, height: 6, background: COLORES.marca, marginRight: 14 }} />
        <div style={rotulo(26, COLORES.tintaMedia, 5)}>POKER DE ENFERMOS</div>
      </div>
    </div>
  )
}

/** Estrella de cinco puntas (el ★ del cartel; satori no trae fuente de simbolos). */
function Estrella({ lado, color }: { lado: number; color: string }) {
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24">
      <path d="M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7L2 9.5l7.1-.6z" fill={color} />
    </svg>
  )
}

/** Corona del cinturon. */
function Corona({ lado, color }: { lado: number; color: string }) {
  return (
    <svg width={lado} height={lado} viewBox="0 0 24 24">
      <path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z" fill={color} />
    </svg>
  )
}

const ALTO_ROTULO_CARTEL = 36

/** Rotulo oro del cartel ("FUNCION ESTELAR · FECHA 14"), entre dos iconos. */
function RotuloCartel({ texto, icono }: { texto: string; icono: 'estrella' | 'corona' }) {
  const Icono = icono === 'estrella' ? Estrella : Corona
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: ALTO_ROTULO_CARTEL }}>
      <Icono lado={30} color={COLORES.oro} />
      <div style={{ ...rotulo(30, COLORES.oro, 6), margin: '0 16px' }}>{texto}</div>
      <Icono lado={30} color={COLORES.oro} />
    </div>
  )
}

const RADIO_CARTEL = 36

/**
 * El bloque del cartel. `ring`: negro con franjas rojas y cuerdas de ring (la
 * noche); `glow`: negro con resplandor oro (el cinturon); `rosa`: el del 7/2,
 * con franjas claras y cuerdas blancas.
 */
function Cartel({
  patron,
  alto,
  cuerdas = [],
  padding = 44,
  children,
}: {
  patron: 'ring' | 'glow' | 'rosa'
  alto: number
  /** Distancia desde arriba de cada cuerda, en px. */
  cuerdas?: number[]
  padding?: number
  children: React.ReactNode
}) {
  const fondo =
    patron === 'rosa'
      ? `linear-gradient(160deg, ${COLORES.rosaBloque} 0%, ${COLORES.rosaHondo} 100%)`
      : COLORES.negro
  const franja = patron === 'rosa' ? alfa(COLORES.blanco, 0.07) : alfa(COLORES.marca, 0.16)
  const textura =
    patron === 'glow'
      ? `radial-gradient(circle at 50% 30%, ${alfa(COLORES.oro, 0.24)} 0%, ${alfa(COLORES.oro, 0)} 60%)`
      : `repeating-linear-gradient(135deg, ${franja} 0px, ${franja} 36px, rgba(0,0,0,0) 36px, rgba(0,0,0,0) 72px)`
  const colorCuerda = patron === 'rosa' ? alfa(COLORES.blanco, 0.35) : alfa(COLORES.marca, 0.6)

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: ANCHO_UTIL,
        height: alto,
        borderRadius: RADIO_CARTEL,
        background: fondo,
      }}
    >
      {/* Sin overflow:hidden (ver `foto`): la textura lleva el mismo radio y
          las cuerdas van lejos de las esquinas. */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          left: 0,
          top: 0,
          width: ANCHO_UTIL,
          height: alto,
          borderRadius: RADIO_CARTEL,
          backgroundImage: textura,
        }}
      />
      {cuerdas.map((top) => (
        <div
          key={top}
          style={{ display: 'flex', position: 'absolute', left: 0, top, width: ANCHO_UTIL, height: 7, background: colorCuerda }}
        />
      ))}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: ANCHO_UTIL,
          height: alto,
          padding,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Tarjeta 2:3 del protagonista, rotada, con aro oro y sombra profunda. */
const TARJETA_ANCHO = 420
const TARJETA_ALTO = 630
const RADIO_TARJETA = 24

function TarjetaHeroe({
  foto: src,
  nombre,
  semilla,
  grados,
}: {
  foto: string | null
  nombre: string
  semilla: string
  grados: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        width: TARJETA_ANCHO,
        height: TARJETA_ALTO,
        borderRadius: RADIO_TARJETA,
        transform: `rotate(${grados}deg)`,
        boxShadow: `0 0 0 6px ${COLORES.oro}`,
      }}
    >
      <Cara foto={src} nombre={nombre} semilla={semilla} ancho={TARJETA_ANCHO} alto={TARJETA_ALTO} radio={RADIO_TARJETA} />
    </div>
  )
}

/**
 * Titular de dos lineas (la frase de @poker/shared) en mayusculas, Archivo 900
 * itálica condensada; la segunda linea en el color de acento. El tamano baja
 * con la linea mas larga para que entre a lo ancho.
 */
function titular(lineas: Phrase, acento: string, ancho: number, max = 112) {
  const larga = Math.max(lineas[0].length, lineas[1].length)
  // Ancho medio de una mayuscula de la condensada itálica: ~0.5 em.
  const size = Math.floor(Math.max(52, Math.min(max, ancho / (larga * 0.5))))
  const interlinea = Math.round(size * 0.98)
  const linea = (texto: string, color: string) => (
    <div
      style={{
        display: 'flex',
        fontFamily: 'Cond',
        fontStyle: 'italic',
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: 1,
        height: interlinea,
        alignItems: 'center',
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {texto.toUpperCase()}
    </div>
  )
  return {
    alto: interlinea * 2,
    nodo: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: ancho }}>
        {linea(lineas[0], COLORES.crema)}
        {linea(lineas[1], acento)}
      </div>
    ),
  }
}

/** Titulo de seccion sobre papel ("EL PODIO"). */
const ALTO_SECCION = 52
const SEP_SECCION = 20

function TituloSeccion({ texto }: { texto: string }) {
  return (
    <div style={{ ...rotulo(52, COLORES.tinta, 1), height: ALTO_SECCION, marginBottom: SEP_SECCION }}>{texto}</div>
  )
}

/** Pastilla de color con texto ("EL VARON", "7/2"). */
function Etiqueta({ texto, fondo, color, size = 24 }: { texto: string; fondo: string; color: string; size?: number }) {
  return (
    <div
      style={{
        ...rotulo(size, color, 2),
        background: fondo,
        padding: '8px 14px',
        borderRadius: 6,
        alignSelf: 'flex-start',
      }}
    >
      {texto}
    </div>
  )
}

const RADIO_TILE = 32
const ARO_TILE = 6
/** La foto de un tile: su tamano y radio por dentro del aro. */
const fotoTile = (ancho: number, alto: number, aro: boolean) => {
  const b = aro ? ARO_TILE : 0
  return [ancho - 2 * b, alto - 2 * b, RADIO_TILE - b] as const
}

/**
 * Tile 3:4 a foto completa, con degradado oscuro y el texto encima (como
 * PhotoTile del Inicio). `aro`: borde de color alrededor.
 */
function TileFoto({
  ancho,
  alto,
  foto: src,
  nombre,
  semilla,
  aro,
  alinear = 'izquierda',
  children,
}: {
  ancho: number
  alto: number
  foto: string | null
  nombre: string
  semilla: string
  aro?: string
  alinear?: 'izquierda' | 'derecha'
  children: React.ReactNode
}) {
  const b = aro ? ARO_TILE : 0
  const r = RADIO_TILE - b
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: ancho,
        height: alto,
        borderRadius: RADIO_TILE,
        background: COLORES.negro1,
        ...(aro ? { border: `${b}px solid ${aro}` } : {}),
      }}
    >
      <Cara foto={src} nombre={nombre} semilla={semilla} ancho={ancho - 2 * b} alto={alto - 2 * b} radio={r} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: alinear === 'derecha' ? 'flex-end' : 'flex-start',
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: ancho - 2 * b,
          borderRadius: `0 0 ${r}px ${r}px`,
          padding: '140px 28px 28px',
          backgroundImage: `linear-gradient(180deg, ${alfa(COLORES.negro, 0)} 0%, ${alfa(COLORES.negro, 0.9)} 55%)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Nombre grande sobre un tile o un cartel. */
const nombreTile = (size: number, ancho: number): React.CSSProperties => ({
  ...rotulo(size, COLORES.crema, 0),
  height: Math.round(size * 1.1),
  alignItems: 'center',
  maxWidth: ancho,
  ...unaLinea,
})

/* ── Franja de datos (Varon, verdugo, cuantos jugaron) ───────────────── */

const ALTO_FRANJA = 232

type DatoPersona = {
  etiqueta: string
  fondo: string
  colorEtiqueta: string
  nombre: string
  detalle?: string
  foto: string | null
  semilla: string
}

/** Lado de la foto de la franja: 3:4. */
const FRANJA_FOTO = { ancho: 150, alto: 200, radio: 18 }

function Franja({
  persona,
  jugaron,
}: {
  persona: DatoPersona | null
  jugaron: { cuantos: number; detalle: string }
}) {
  const tarjetaFranja: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    height: ALTO_FRANJA,
    padding: 16,
    borderRadius: 28,
    background: COLORES.tarjeta,
    border: `2px solid ${COLORES.borde}`,
  }
  const anchoPersona = persona ? 610 : 0
  const anchoJugaron = ANCHO_UTIL - anchoPersona - (persona ? 24 : 0)
  const anchoTexto = anchoPersona - 32 - 4 - FRANJA_FOTO.ancho - 24

  return (
    <div style={{ display: 'flex', width: ANCHO_UTIL, height: ALTO_FRANJA }}>
      {persona ? (
        <div style={{ ...tarjetaFranja, width: anchoPersona, marginRight: 24 }}>
          <Cara
            foto={persona.foto}
            nombre={persona.nombre}
            semilla={persona.semilla}
            ancho={FRANJA_FOTO.ancho}
            alto={FRANJA_FOTO.alto}
            radio={FRANJA_FOTO.radio}
          />
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 24, width: anchoTexto }}>
            <Etiqueta texto={persona.etiqueta} fondo={persona.fondo} color={persona.colorEtiqueta} size={22} />
            <div style={{ ...rotulo(52, COLORES.tinta, 0), marginTop: 14, height: 58, alignItems: 'center', ...unaLinea, maxWidth: anchoTexto }}>
              {persona.nombre}
            </div>
            {persona.detalle ? (
              <div style={{ ...cuerpo(28, COLORES.tintaSuave), marginTop: 6 }}>{persona.detalle}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ ...tarjetaFranja, width: anchoJugaron, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', padding: '16px 28px' }}>
        <div style={rotulo(24, COLORES.tintaMedia, 4)}>JUGARON</div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 10 }}>
          <div style={cifra(88, COLORES.tinta)}>{jugaron.cuantos}</div>
          <div style={{ ...rotulo(28, COLORES.tintaMedia, 2), marginLeft: 12 }}>ENFERMOS</div>
        </div>
        <div style={{ ...cuerpo(24, COLORES.tintaSuave), marginTop: 10 }}>{jugaron.detalle}</div>
      </div>
    </div>
  )
}

/* ── La tabla ────────────────────────────────────────────────────────────
 *
 * Es un dato: tiene que leerse igual que en la app (CPRankingView). Grilla de
 * bordes negros sobre papel, PUNTOS en rojo, medallas en los tres primeros,
 * los dos ultimos en rosa y la nota de "que estoy mirando". Lo de lucha libre
 * va en la cabecera (cartel negro con cuerdas) y en las fotos, que crecen a
 * recortes 3:4.
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

const ALTO_FILA = 100
const ALTO_CABECERA_TABLA = 70
const FUENTE_CELDA = 30

/**
 * Foto de la fila: recorte 3:4, 1.5x la cara redonda de antes (44). El mismo
 * tamano manda en el recorte y en el dibujo, por eso vive aqui.
 */
const FOTO_TABLA = { ancho: 66, alto: 88, radio: 10 }

/** Cartel de la tabla: rotulo, titulo y cuerdas. */
const ALTO_CARTEL_TABLA = 36 + ALTO_ROTULO_CARTEL + 18 + 104 + 36

function pastillaMedalla(posicion: number) {
  if (posicion === 1) return { background: COLORES.oro, color: COLORES.tintaPapel }
  if (posicion === 2) return { background: COLORES.plata, color: COLORES.tintaPapel }
  if (posicion === 3) return { background: COLORES.bronce, color: COLORES.tintaPapel }
  return { background: COLORES.negro2, color: COLORES.crema }
}

function TablaImagen({
  torneo,
  titulo,
  acento,
  nota,
  filas,
  columnas,
}: {
  torneo: number
  titulo: string
  /** La palabra roja del titulo ("ELIMINA", "ACUM."). */
  acento: string
  nota: string
  filas: FilaTabla[]
  columnas: Columna[]
}) {
  const ANCHO_PUESTO = 76
  const anchoFijo = ANCHO_PUESTO + columnas.reduce((a, c) => a + c.ancho, 0)
  const anchoNombre = ANCHO_UTIL - anchoFijo

  const rejilla = `1px solid ${COLORES.negro}`

  // La nota se parte sola: a 26px entran unos 74 caracteres por renglon.
  const altoNota = Math.max(1, Math.ceil(nota.length / 74)) * Math.round(26 * 1.45)
  const SEP_NOTA = 22
  const alto =
    ALTO_MARCO_SIN_CABECERA +
    ALTO_CARTEL_TABLA +
    24 +
    altoNota +
    SEP_NOTA +
    2 +
    ALTO_CABECERA_TABLA +
    filas.length * ALTO_FILA

  return {
    alto,
    nodo: (
      <Marco alto={alto}>
        <Cartel patron="ring" alto={ALTO_CARTEL_TABLA} padding={36}>
          <RotuloCartel texto={`LA TABLA · TORNEO ${torneo}`} icono="estrella" />
          <div style={{ display: 'flex', alignItems: 'center', height: 104, marginTop: 18 }}>
            <div style={{ ...rotulo(104, COLORES.crema, 0), fontStyle: 'italic' }}>{titulo}</div>
            <div style={{ ...rotulo(104, COLORES.marcaClara, 0), fontStyle: 'italic', marginLeft: 22 }}>{acento}</div>
          </div>
        </Cartel>

        <div
          style={{
            display: 'flex',
            fontSize: 26,
            lineHeight: 1.45,
            color: COLORES.tintaSuave,
            marginTop: 24,
            marginBottom: SEP_NOTA,
            height: altoNota,
          }}
        >
          {nota}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: ANCHO_UTIL,
            // Sin borderRadius ni overflow:hidden: cada recorte es una mascara
            // y, anidadas en veinte filas, el render pasaba de 2 s a 30 s.
            border: rejilla,
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
                  ...rotulo(30, c.manda ? COLORES.blanco : COLORES.crema, 1),
                  fontStyle: 'italic',
                  width: c.ancho,
                  alignItems: 'center',
                  justifyContent: c.izquierda ? 'flex-start' : 'center',
                  padding: c.izquierda ? '0 18px' : '0 4px',
                  background: c.manda ? COLORES.marcaBoton : COLORES.negro,
                  whiteSpace: 'nowrap',
                  ...(i === todas.length - 1 ? {} : { borderRight: `1px solid ${COLORES.negro3}` }),
                }}
              >
                {c.rotulo}
              </div>
            ))}
          </div>

          {/* Filas */}
          {filas.map((f, i) => {
            const fondoFila = f.esMalazo ? COLORES.rosaSuave : i % 2 === 1 ? COLORES.papel : COLORES.tarjeta
            const medalla = pastillaMedalla(f.posicion)

            return (
              <div
                key={`${f.jugador.playerId}-${i}`}
                style={{
                  display: 'flex',
                  height: ALTO_FILA,
                  alignItems: 'stretch',
                  borderTop: rejilla,
                  background: COLORES.tarjeta,
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
                      ...cifra(28, medalla.color),
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      ...(f.esMalazo
                        ? { background: COLORES.rosaBloque, color: COLORES.blanco }
                        : { background: medalla.background }),
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
                    padding: '0 14px 0 12px',
                    background: fondoFila,
                    borderRight: rejilla,
                  }}
                >
                  <Cara
                    foto={f.foto}
                    nombre={f.jugador.playerName}
                    semilla={f.jugador.playerId}
                    ancho={FOTO_TABLA.ancho}
                    alto={FOTO_TABLA.alto}
                    radio={FOTO_TABLA.radio}
                  />
                  <div
                    style={{
                      ...cuerpo(FUENTE_CELDA, COLORES.tinta, 600),
                      marginLeft: 16,
                      whiteSpace: 'nowrap',
                      maxWidth: anchoNombre - 26 - FOTO_TABLA.ancho - 16,
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
                        background: celda.fondo ?? (c.manda ? alfa(COLORES.marca, 0.06) : fondoFila),
                        color: celda.color ?? COLORES.tinta,
                        fontFamily: c.manda ? 'Archivo' : 'Inter',
                        fontSize: c.manda ? 38 : FUENTE_CELDA,
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

/**
 * Torneo activo; si no hay, el ultimo FINALIZADO (mayor numero, el mismo orden
 * que usa /api/tournaments/active). Entre torneos no hay ACTIVO y Compartir
 * quedaba vacio con 404.
 */
async function torneoActivo() {
  const activo = await prisma.tournament.findFirst({
    where: { status: 'ACTIVO' },
    select: { id: true, number: true },
  })
  if (activo) return activo
  return prisma.tournament.findFirst({
    where: { status: 'FINALIZADO' },
    orderBy: { number: 'desc' },
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
    FOTO_TABLA.ancho,
    FOTO_TABLA.alto,
    FOTO_TABLA.radio
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
      color: f.jugador.eliminasActive ? COLORES.baja : COLORES.tintaSuave,
      italica: Boolean(f.jugador.liveProjection),
    }
  }

  const columnas: Columna[] = [
    {
      rotulo: SCORE_LABELS.points,
      ancho: 120,
      manda: true,
      celda: (f) => ({ texto: String(scoreOf(f.jugador)) }),
    },
    {
      rotulo: SCORE_LABELS.accumulated,
      ancho: 104,
      celda: (f) => ({ texto: String(f.jugador.totalPoints), color: COLORES.baja }),
    },
    { rotulo: 'E1', ancho: 72, celda: eliminaDe(1) },
    { rotulo: 'E2', ancho: 72, celda: eliminaDe(2) },
    ...(mostrarE3 ? [{ rotulo: 'E3', ancho: 72, celda: eliminaDe(3) }] : []),
    ...(hayMultas
      ? [
          {
            rotulo: 'MULTA',
            ancho: 96,
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
    torneo: torneo.number,
    titulo: 'TABLA',
    acento: 'ELIMINA',
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
    FOTO_TABLA.ancho,
    FOTO_TABLA.alto,
    FOTO_TABLA.radio
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
      ancho: 120,
      celda: (f) => ({ texto: String(scoreOf(f.jugador)) }),
    },
    {
      rotulo: 'DIF',
      ancho: 104,
      celda: (f) => {
        const dif = acumDe(f.jugador) - scoreOf(f.jugador)
        return {
          texto: dif > 0 ? `−${dif}` : '—',
          color: dif > 0 ? COLORES.baja : COLORES.tintaSuave,
        }
      },
    },
  ]

  const { alto, nodo } = TablaImagen({
    torneo: torneo.number,
    titulo: 'TABLA',
    acento: SCORE_LABELS.accumulated,
    nota: `Ordenado por ${SCORE_LABELS.accumulated}: todos los puntos, sin descartar ninguna fecha. No es la tabla oficial — DIF es lo que te quita el ELIMINA.`,
    filas,
    columnas,
  })
  return imagen(nodo, alto)
}

/* ── La noche ────────────────────────────────────────────────────────── */

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

/** Nombre real abreviado. Las imagenes tienen que nombrar igual a la misma
 *  persona, y la tabla del torneo usa el nombre real, no el alias. */
const nombreCorto = (p: { firstName: string; lastName?: string | null }) => shortenFullName(fullName(p))

/** Apodo o nombre corto: el que va en la frase del cartel, como en el Inicio. */
const apodo = (p: JugadorFecha) => p.aliases?.[0] || playerLabel(p)

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

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/* Podio 2-1-3 en pedestales (MedalPodium del Inicio). */
const PODIO_COL = 312
const PODIO_SEP = (ANCHO_UTIL - PODIO_COL * 3) / 2
const PODIO_FOTO_ALTO = 416 // 3:4 de la columna
const PODIO_ARO = 8
const PODIO_RADIO_FOTO = 22
const PEDESTAL = [196, 146, 112]
const PEDESTAL_NUM = [96, 72, 58]

type Pedestal = { puesto: number; nombre: string; semilla: string; foto: string | null; valor: number }

function PodioPedestales({ puestos }: { puestos: Pedestal[] }) {
  const orden = [1, 0, 2].filter((i) => puestos[i])
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', width: ANCHO_UTIL, justifyContent: 'center' }}>
      {orden.map((i, k) => {
        const p = puestos[i]
        const metal = MEDALLA[i]
        return (
          <div
            key={p.semilla}
            style={{ display: 'flex', flexDirection: 'column', width: PODIO_COL, marginLeft: k === 0 ? 0 : PODIO_SEP }}
          >
            <div
              style={{
                display: 'flex',
                width: PODIO_COL,
                height: PODIO_FOTO_ALTO,
                padding: `${PODIO_ARO}px ${PODIO_ARO}px 0`,
                background: metal,
                borderRadius: '28px 28px 0 0',
              }}
            >
              <Cara
                foto={p.foto}
                nombre={p.nombre}
                semilla={p.semilla}
                ancho={PODIO_COL - 2 * PODIO_ARO}
                alto={PODIO_FOTO_ALTO - PODIO_ARO}
                radio={`${PODIO_RADIO_FOTO}px ${PODIO_RADIO_FOTO}px 0 0`}
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: PEDESTAL[i],
                background: metal,
                borderRadius: '0 0 24px 24px',
                padding: '0 12px',
              }}
            >
              <div style={cifra(PEDESTAL_NUM[i], COLORES.tintaPapel)}>{p.puesto}</div>
              <div
                style={{
                  ...cuerpo(28, COLORES.tintaPapel, i === 0 ? 700 : 600),
                  marginTop: 6,
                  maxWidth: PODIO_COL - 24,
                  ...unaLinea,
                }}
              >
                {`${p.nombre} · ${p.valor}`}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** PODIO DE LA NOCHE: el cartel del campeon y los tres primeros en pedestales. */
export async function buildUltimaFechaImage(): Promise<Response> {
  const torneo = await torneoActivo()
  if (!torneo) return new Response('No hay torneo activo', { status: 404 })

  const fecha = await ultimaFechaCerrada(torneo.id)
  if (!fecha || fecha.eliminations.length === 0) {
    return new Response('No hay fecha completada', { status: 404 })
  }

  const podio = fecha.eliminations.filter((e) => e.position <= 3).sort((a, b) => a.position - b.position)
  if (podio.length === 0) return new Response('La fecha no tiene podio', { status: 404 })
  const ganador = podio[0].eliminatedPlayer

  const varon = varonDeLaNoche(fecha.eliminations)
  const [jugadorVaron, victorias] = await Promise.all([
    varon ? prisma.player.findUnique({ where: { id: varon.id }, select: PLAYER_PUBLIC_SELECT }) : null,
    // Victorias del ganador en el torneo, contando esta: elige el banco de la
    // frase (primera victoria / repite), igual que el Inicio con firstPlaces.
    prisma.elimination.count({
      where: { eliminatedPlayerId: ganador.id, position: 1, gameDate: { tournamentId: torneo.id, status: 'completed' } },
    }),
  ])

  const PODIO_FOTO = { ancho: PODIO_COL - 2 * PODIO_ARO, alto: PODIO_FOTO_ALTO - PODIO_ARO }
  const [caraTarjeta, carasPodio, caraVaron] = await Promise.all([
    tarjeta(ganador.photoUrl, ganador.role, TARJETA_ANCHO, TARJETA_ALTO),
    fotosDe(
      podio.map((e) => ({ id: e.eliminatedPlayer.id, url: urlFoto(e.eliminatedPlayer) })),
      PODIO_FOTO.ancho,
      PODIO_FOTO.alto,
      PODIO_RADIO_FOTO,
      false
    ),
    jugadorVaron ? foto(urlFoto(jugadorVaron), FRANJA_FOTO.ancho, FRANJA_FOTO.alto, FRANJA_FOTO.radio) : Promise.resolve(null),
  ])

  const frase = nightWinnerPhrase(apodo(ganador), fecha.dateNumber, victorias)
  const PAD = 44
  const { alto: altoTitular, nodo: nodoTitular } = titular(frase, COLORES.marcaClara, ANCHO_UTIL - PAD * 2)
  const ALTO_PUNTOS = 96
  const ALTO_CINTA = 66
  const altoCartel =
    PAD + ALTO_ROTULO_CARTEL + 32 + TARJETA_ALTO + 28 + altoTitular + 18 + ALTO_PUNTOS + PAD
  const arribaTarjeta = PAD + ALTO_ROTULO_CARTEL + 32

  const alto =
    ALTO_MARCO +
    altoCartel +
    40 +
    ALTO_SECCION +
    SEP_SECCION +
    PODIO_FOTO_ALTO +
    PEDESTAL[0] +
    32 +
    ALTO_FRANJA

  return imagen(
    <Marco titulo="Podio de la noche" subtitulo={`Torneo ${torneo.number} · Fecha ${fecha.dateNumber}`} alto={alto}>
      <Cartel
        patron="ring"
        alto={altoCartel}
        padding={PAD}
        cuerdas={[arribaTarjeta + 170, arribaTarjeta + 300, arribaTarjeta + 430]}
      >
        <RotuloCartel texto={`FUNCIÓN ESTELAR · FECHA ${fecha.dateNumber}`} icono="estrella" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32, height: TARJETA_ALTO }}>
          <TarjetaHeroe foto={caraTarjeta} nombre={nombreCorto(ganador)} semilla={ganador.id} grados={-3} />
          {/* La cinta oro sobre el pie de la tarjeta */}
          <div
            style={{
              ...rotulo(34, COLORES.tintaPapel, 6),
              alignItems: 'center',
              height: ALTO_CINTA,
              marginTop: -ALTO_CINTA - 20,
              padding: '0 36px',
              background: COLORES.oro,
              borderRadius: 8,
              transform: 'rotate(-3deg)',
              boxShadow: `0 10px 0 ${alfa(COLORES.negro, 0.45)}`,
            }}
          >
            CAMPEÓN DE LA NOCHE
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 28 }}>{nodoTitular}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 18, height: ALTO_PUNTOS }}>
          <div style={cifra(96, COLORES.oro)}>{podio[0].points}</div>
          <div style={{ ...rotulo(34, COLORES.cremaMedia, 4), marginLeft: 16 }}>
            {podio[0].points === 1 ? 'PUNTO' : 'PUNTOS'}
          </div>
        </div>
      </Cartel>

      <div style={{ display: 'flex', marginTop: 40 }}>
        <TituloSeccion texto="EL PODIO" />
      </div>
      <PodioPedestales
        puestos={podio.map((e) => ({
          puesto: e.position,
          nombre: nombreCorto(e.eliminatedPlayer),
          semilla: e.eliminatedPlayer.id,
          foto: carasPodio.get(e.eliminatedPlayer.id) ?? null,
          valor: e.points,
        }))}
      />

      <div style={{ display: 'flex', marginTop: 32 }}>
        <Franja
          persona={
            jugadorVaron && varon
              ? {
                  etiqueta: 'EL VARÓN DE LA NOCHE',
                  fondo: COLORES.marca,
                  colorEtiqueta: COLORES.blanco,
                  nombre: nombreCorto(jugadorVaron),
                  detalle: plural(varon.cuenta, 'eliminación', 'eliminaciones'),
                  foto: caraVaron,
                  semilla: jugadorVaron.id,
                }
              : null
          }
          jugaron={{ cuantos: fecha.playerIds.length, detalle: `fecha ${fecha.dateNumber} del torneo ${torneo.number}` }}
        />
      </div>
    </Marco>,
    alto
  )
}

/* ── El cinturon ─────────────────────────────────────────────────────── */

/** PODIO DEL TORNEO: el dueno del cinturon y el #2 y #3 en tiles. */
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

  const TILE = { ancho: (ANCHO_UTIL - 24) / 2, alto: Math.round(((ANCHO_UTIL - 24) / 2) * (4 / 3)) }
  const lider = tres[0]
  const resto = tres.slice(1)
  const [caraLider, carasResto] = await Promise.all([
    tarjeta(lider.playerPhoto, null, TARJETA_ANCHO, TARJETA_ALTO),
    fotosDe(
      resto.map((p) => ({ id: p.playerId, url: p.playerPhoto })),
      ...fotoTile(TILE.ancho, TILE.alto, true)
    ),
  ])

  const nick = (p: PlayerRanking) => p.playerAlias || shortenFullName(p.playerName)
  // Lider nuevo: no era #1 antes de esta fecha (subio puestos para llegar).
  const frase = leaderPhrase(nick(lider), fechasJugadas[fechasJugadas.length - 1] ?? 0, lider.positionsChanged > 0)
  const PAD = 44
  const { alto: altoTitular, nodo: nodoTitular } = titular(frase, COLORES.oro, ANCHO_UTIL - PAD * 2)

  const mesas = mesasFinalesDe(lider)
  const podios = lider.firstPlaces + lider.secondPlaces + lider.thirdPlaces
  const numeros = [
    { v: mesas, l: mesas === 1 ? 'MESA FINAL' : 'MESAS FINALES' },
    { v: podios, l: podios === 1 ? 'PODIO' : 'PODIOS' },
    { v: lider.firstPlaces, l: lider.firstPlaces === 1 ? 'VICTORIA' : 'VICTORIAS' },
  ]

  const ALTO_CINTURON = 104
  const ALTO_NUMEROS = 2 + 26 + 64 + 10 + 26
  const arribaTarjeta = PAD + ALTO_ROTULO_CARTEL + 32
  const altoCartel =
    arribaTarjeta + TARJETA_ALTO + (ALTO_CINTURON - 60) + 28 + altoTitular + 30 + ALTO_NUMEROS + PAD
  const totalFechas = tournament.totalDates ?? 12

  const alto = ALTO_MARCO + altoCartel + (resto.length > 0 ? 32 + TILE.alto : 0)

  return imagen(
    <Marco
      titulo="Podio del torneo"
      subtitulo={`Torneo ${torneo.number} · ${fechasJugadas.length} de ${totalFechas} fechas`}
      alto={alto}
    >
      <Cartel patron="glow" alto={altoCartel} padding={PAD}>
        <RotuloCartel texto={`DUEÑO DEL CINTURÓN · FECHA ${fechasJugadas.length} DE ${totalFechas}`} icono="corona" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 32 }}>
          <TarjetaHeroe foto={caraLider} nombre={shortenFullName(lider.playerName)} semilla={lider.playerId} grados={3} />
          {/* El cinturon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 560,
              height: ALTO_CINTURON,
              marginTop: -60,
              padding: '0 44px',
              borderRadius: ALTO_CINTURON / 2,
              background: COLORES.oro,
              border: `6px solid ${COLORES.oroOscuro}`,
              // Sombra dura, sin desenfoque: el blur cuesta segundos de render.
              boxShadow: `0 12px 0 ${alfa(COLORES.negro, 0.45)}`,
            }}
          >
            <div style={cifra(58, COLORES.tintaPapel)}>{`#1 · ${scoreOf(lider)} PTS`}</div>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 28 }}>{nodoTitular}</div>
        <div
          style={{
            display: 'flex',
            width: ANCHO_UTIL - PAD * 2,
            marginTop: 30,
            paddingTop: 26,
            borderTop: `2px solid ${COLORES.negro3}`,
          }}
        >
          {numeros.map((n, i) => (
            <div
              key={n.l}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                ...(i === 1
                  ? { borderLeft: `2px solid ${COLORES.negro3}`, borderRight: `2px solid ${COLORES.negro3}` }
                  : {}),
              }}
            >
              <div style={cifra(64, COLORES.crema)}>{n.v}</div>
              <div style={{ ...cuerpo(24, COLORES.cremaMedia, 600), letterSpacing: 2, marginTop: 10 }}>{n.l}</div>
            </div>
          ))}
        </div>
      </Cartel>

      {resto.length > 0 ? (
        <div style={{ display: 'flex', marginTop: 32 }}>
          {resto.map((p, i) => {
            const derecha = i === 1
            return (
              <div key={p.playerId} style={{ display: 'flex', marginLeft: i === 0 ? 0 : 24 }}>
                <TileFoto
                  ancho={TILE.ancho}
                  alto={TILE.alto}
                  foto={carasResto.get(p.playerId) ?? null}
                  nombre={p.playerName}
                  semilla={p.playerId}
                  aro={MEDALLA[p.position - 1]}
                  alinear={derecha ? 'derecha' : 'izquierda'}
                >
                  <div style={rotulo(36, MEDALLA[p.position - 1] ?? COLORES.plata, 2)}>{`#${p.position}`}</div>
                  <div style={{ ...nombreTile(54, TILE.ancho - 68), marginTop: 8 }}>{shortenFullName(p.playerName)}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 6 }}>
                    <div style={cifra(72, COLORES.crema)}>{scoreOf(p)}</div>
                    <div style={{ ...rotulo(26, COLORES.cremaMedia, 3), marginLeft: 12 }}>{SCORE_LABELS.points}</div>
                  </div>
                </TileFoto>
              </div>
            )
          })}
        </div>
      ) : null}
    </Marco>,
    alto
  )
}

/* ── Los 7/2 ─────────────────────────────────────────────────────────────
 *
 * El rosa es de ellos y de nadie mas, igual que en el Inicio: cartel rosa con
 * cuerdas blancas y las dos fotos 3:4 grandes, lado a lado. El malazo se
 * mira, no se lee.
 * ──────────────────────────────────────────────────────────────────────── */

const PAD_ROSA = 36
const TILE_ROSA = {
  ancho: (ANCHO_UTIL - PAD_ROSA * 2 - 24) / 2,
  alto: Math.round(((ANCHO_UTIL - PAD_ROSA * 2 - 24) / 2) * (4 / 3)),
}

type Malazo = {
  rotulo: string
  nombre: string
  semilla: string
  foto: string | null
  valor: number
  detalle?: string | null
}

/** Cartel rosa con uno o dos tiles 3:4. */
function CartelRosa({ malazos }: { malazos: Malazo[] }) {
  const alto = PAD_ROSA * 2 + TILE_ROSA.alto
  const anchoTexto = TILE_ROSA.ancho - 2 * ARO_TILE - 56
  return (
    <Cartel patron="rosa" alto={alto} padding={PAD_ROSA} cuerdas={[alto * 0.3, alto * 0.45, alto * 0.6].map(Math.round)}>
      <div style={{ display: 'flex', justifyContent: 'center', width: ANCHO_UTIL - PAD_ROSA * 2 }}>
        {malazos.map((m, i) => (
          <div key={m.semilla} style={{ display: 'flex', marginLeft: i === 0 ? 0 : 24 }}>
            <TileFoto
              ancho={TILE_ROSA.ancho}
              alto={TILE_ROSA.alto}
              foto={m.foto}
              nombre={m.nombre}
              semilla={m.semilla}
              aro={COLORES.rosa}
            >
              <Etiqueta texto="7/2" fondo={COLORES.rosa} color={COLORES.tintaPapel} size={28} />
              <div style={{ ...rotulo(26, COLORES.rosaTexto, 3), marginTop: 16 }}>{m.rotulo.toUpperCase()}</div>
              <div style={{ ...nombreTile(56, anchoTexto), marginTop: 10 }}>{m.nombre}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 4 }}>
                <div style={cifra(64, COLORES.crema)}>{m.valor}</div>
                <div style={{ ...rotulo(24, COLORES.cremaMedia, 3), marginLeft: 10 }}>
                  {m.valor === 1 ? 'PUNTO' : SCORE_LABELS.points}
                </div>
              </div>
              {m.detalle ? (
                <div style={{ ...cuerpo(26, COLORES.cremaMedia), marginTop: 10, maxWidth: anchoTexto }}>{m.detalle}</div>
              ) : null}
            </TileFoto>
          </div>
        ))}
      </div>
    </Cartel>
  )
}

/** EL 7/2 DE LA NOCHE: los dos primeros en salir de la fecha recien jugada. */
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

  const [caras, caraVerdugo] = await Promise.all([
    fotosDe(
      [malazo, ...(segundo ? [segundo] : [])].map((e) => ({ id: e.eliminatedPlayer.id, url: urlFoto(e.eliminatedPlayer) })),
      ...fotoTile(TILE_ROSA.ancho, TILE_ROSA.alto, true)
    ),
    verdugo ? foto(urlFoto(verdugo), FRANJA_FOTO.ancho, FRANJA_FOTO.alto, FRANJA_FOTO.radio) : Promise.resolve(null),
  ])

  const malazos: Malazo[] = [
    { e: malazo, rotulo: 'primero en salir' },
    ...(segundo ? [{ e: segundo, rotulo: 'y el segundo' }] : []),
  ].map(({ e, rotulo }) => ({
    rotulo,
    nombre: nombreCorto(e.eliminatedPlayer),
    semilla: e.eliminatedPlayer.id,
    foto: caras.get(e.eliminatedPlayer.id) ?? null,
    valor: e.points,
  }))

  const alto = ALTO_MARCO + PAD_ROSA * 2 + TILE_ROSA.alto + 32 + ALTO_FRANJA

  return imagen(
    <Marco titulo="El 7/2 de la noche" subtitulo={`Torneo ${torneo.number} · Fecha ${fecha.dateNumber}`} alto={alto}>
      <CartelRosa malazos={malazos} />
      <div style={{ display: 'flex', marginTop: 32 }}>
        <Franja
          persona={
            verdugo
              ? {
                  etiqueta: 'EL VERDUGO',
                  fondo: COLORES.marca,
                  colorEtiqueta: COLORES.blanco,
                  nombre: nombreCorto(verdugo),
                  detalle: `sacó a ${nombreCorto(malazo.eliminatedPlayer)}`,
                  foto: caraVerdugo,
                  semilla: verdugo.id,
                }
              : null
          }
          jugaron={{ cuantos: fecha.playerIds.length, detalle: `fecha ${fecha.dateNumber} del torneo ${torneo.number}` }}
        />
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
    ...fotoTile(TILE_ROSA.ancho, TILE_ROSA.alto, true)
  )

  const malazos: Malazo[] = dos.map((p) => {
    const falta = salvado ? scoreOf(salvado) - scoreOf(p) : null
    return {
      rotulo: `puesto ${p.position} de ${porPuesto.length}`,
      nombre: shortenFullName(p.playerName),
      semilla: p.playerId,
      foto: caras.get(p.playerId) ?? null,
      valor: scoreOf(p),
      detalle:
        falta !== null && falta > 0 ? `a ${falta} puntos de salir del 7/2` : 'empatado con el primero a salvo',
    }
  })

  const alto = ALTO_MARCO + PAD_ROSA * 2 + TILE_ROSA.alto

  return imagen(
    <Marco titulo="Los 7/2 del torneo" subtitulo={`Torneo ${torneo.number} · fondo de la tabla`} alto={alto}>
      <CartelRosa malazos={malazos} />
    </Marco>,
    alto
  )
}

/**
 * "Lo que dejo la noche": los cuatro personajes de la fecha, en tiles 3:4 a
 * foto completa con la etiqueta de su rol — el Varon en rojo, el Malazo en
 * rosa, la noche para olvidar en naranja y el mas contento en verde. Mismo
 * criterio que la seccion del Inicio.
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
    etiqueta: string
    fondo: string
    colorEtiqueta: string
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
        etiqueta: 'EL VARÓN',
        fondo: COLORES.marca,
        colorEtiqueta: COLORES.blanco,
        nombre: nombreCorto(jugador),
        detalle: plural(varon.cuenta, 'eliminación', 'eliminaciones'),
        id: jugador.id,
        url: urlFoto(jugador),
      })
    }
  }

  // El Malazo: el primero en salir, o sea la posicion mas alta.
  const malazo = fecha.eliminations[fecha.eliminations.length - 1]
  if (malazo) {
    tarjetas.push({
      etiqueta: 'EL MALAZO 7/2',
      fondo: COLORES.rosa,
      colorEtiqueta: COLORES.tintaPapel,
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
      etiqueta: 'PARA OLVIDAR',
      fondo: COLORES.naranja,
      colorEtiqueta: COLORES.tintaPapel,
      nombre: shortenFullName(peor.playerName),
      detalle: `bajó ${plural(Math.abs(peor.positionsChanged), 'puesto', 'puestos')}`,
      id: peor.playerId,
      url: fotoDeRanking.get(peor.playerId) ?? null,
    })
  }

  if (queSubio.length > 0) {
    const mejor = queSubio.reduce((a, b) => (b.positionsChanged > a.positionsChanged ? b : a))
    tarjetas.push({
      etiqueta: 'EL MÁS CONTENTO',
      fondo: COLORES.verde,
      colorEtiqueta: COLORES.tintaPapel,
      nombre: shortenFullName(mejor.playerName),
      detalle: `subió ${plural(mejor.positionsChanged, 'puesto', 'puestos')}`,
      id: mejor.playerId,
      url: fotoDeRanking.get(mejor.playerId) ?? null,
    })
  }

  if (tarjetas.length === 0) {
    return new Response('No hay nada que contar de la fecha', { status: 404 })
  }

  const SEP = 24
  const TILE = { ancho: (ANCHO_UTIL - SEP) / 2, alto: Math.round(((ANCHO_UTIL - SEP) / 2) * (4 / 3)) }
  const caras = await fotosDe(
    tarjetas.map((t) => ({ id: t.id, url: t.url })),
    ...fotoTile(TILE.ancho, TILE.alto, false)
  )

  const filas: Tarjeta[][] = []
  for (let i = 0; i < tarjetas.length; i += 2) filas.push(tarjetas.slice(i, i + 2))
  const alto = ALTO_MARCO + filas.length * TILE.alto + (filas.length - 1) * SEP

  return imagen(
    <Marco titulo="Lo que dejó la noche" subtitulo={`Torneo ${torneo.number} · Fecha ${fecha.dateNumber}`} alto={alto}>
      <div style={{ display: 'flex', flexDirection: 'column', width: ANCHO_UTIL }}>
        {filas.map((fila, i) => (
          <div key={fila[0].etiqueta} style={{ display: 'flex', marginTop: i === 0 ? 0 : SEP }}>
            {fila.map((t, j) => (
              <div key={t.etiqueta} style={{ display: 'flex', marginLeft: j === 0 ? 0 : SEP }}>
                <TileFoto
                  ancho={TILE.ancho}
                  alto={TILE.alto}
                  foto={caras.get(t.id) ?? null}
                  nombre={t.nombre}
                  semilla={t.id}
                >
                  <Etiqueta texto={t.etiqueta} fondo={t.fondo} color={t.colorEtiqueta} size={28} />
                  <div style={{ ...nombreTile(60, TILE.ancho - 56), marginTop: 16 }}>{t.nombre}</div>
                  <div style={{ ...cuerpo(30, COLORES.cremaMedia), marginTop: 4 }}>{t.detalle}</div>
                </TileFoto>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Marco>,
    alto
  )
}
