/**
 * Como se nombra a un jugador en pantalla.
 *
 * En el grupo hay nombres repetidos (varios Juan, varios Jose), asi que el
 * nombre solo no alcanza: SIEMPRE se muestra con la inicial del apellido.
 * "Juan C." y "Juan T." son dos personas distintas y hay que poder separarlas
 * de un vistazo, incluso en una fila angosta.
 */

/** Alias del club si existe; si no, el nombre de pila. */
function preferredFirstName(player: { firstName: string; aliases?: string[] | null }): string {
  const alias = player.aliases?.[0]?.trim()
  return alias && alias.length > 0 ? alias : player.firstName
}

/**
 * Etiqueta a partir de los campos estructurados: "Juan C.", "Mono B.".
 * Es la forma preferida — aqui no hay que adivinar donde termina el nombre.
 */
export function playerLabel(player: {
  firstName: string
  lastName?: string | null
  aliases?: string[] | null
}): string {
  const first = preferredFirstName(player).trim()
  const initial = player.lastName?.trim()?.[0]
  return initial ? `${first} ${initial.toUpperCase()}.` : first
}

/**
 * Etiqueta a partir de un nombre ya concatenado: "Juan Fernando Ochoa" →
 * "Juan Fernando O.". Se conservan los nombres compuestos porque son parte de
 * como se distingue a la gente ("Juan Antonio C." vs "Juan Fernando C.").
 *
 * Solo para datos que ya vienen unidos; si tienes los campos por separado usa
 * playerLabel, que no tiene que suponer nada.
 */
export function shortenFullName(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  const last = parts[parts.length - 1]
  return `${parts.slice(0, -1).join(' ')} ${last[0].toUpperCase()}.`
}

/** Nombre completo sin abreviar, para perfiles y encabezados de detalle. */
export function fullName(player: { firstName: string; lastName?: string | null }): string {
  return [player.firstName, player.lastName].filter(Boolean).join(' ').trim()
}

/** Foto unica de todos los invitados externos (el pato del torneo vigente). */
export const GUEST_PHOTO_URL = 'https://storage.googleapis.com/poker-enfermos/t31/perfil/pato-1.webp'

/** El pato de los invitados hasta el T30. */
export const T30_GUEST_PHOTO_URL = 'https://storage.googleapis.com/poker-enfermos/pato.png'

/**
 * Foto con la que se muestra a alguien: los invitados llevan el pato. Si la API
 * ya mando el pato viejo (una fecha de un torneo anterior al T31), se respeta.
 */
export function displayPhoto(photoUrl?: string | null, role?: string | null): string | null {
  if (role === 'Invitado') return photoUrl === T30_GUEST_PHOTO_URL ? photoUrl : GUEST_PHOTO_URL
  return photoUrl ?? null
}

/**
 * Tarjeta completa (con marco y apodo) del torneo vigente, a partir de la foto
 * de perfil: `t31/perfil/<apodo>.webp` -> `t31/tarjetas/<apodo>.webp`. Los
 * invitados llevan la del pato. null si la foto no es de una temporada con
 * tarjetas (entonces se muestra la foto normal).
 */
export function playerCardUrl(photoUrl?: string | null, role?: string | null): string | null {
  const src = displayPhoto(photoUrl, role)
  if (!src) return null
  const m = src.match(/^(https:\/\/storage\.googleapis\.com\/poker-enfermos\/t\d+)\/perfil\/([^/]+\.webp)$/)
  return m ? `${m[1]}/tarjetas/${m[2]}` : null
}

/** Primer torneo con fotos de lucha libre (tarjetas en `t31/`). */
export const FIRST_CARD_TOURNAMENT = 31

/** Foto que tenia cada jugador hasta el T30, por el archivo nuevo del T31. */
const T30_PHOTOS: Record<string, string> = {
  charlie: 'charliec.png', minimi: 'juang.png', 'el-trampas': 'freddy.png', 'el-teta': 'rubi.png',
  'la-dama-de-rosa': 'vela.png', 'el-pajarraco': 'pit.png', chiki: 'diegob.png', jackie: 'jac.png',
  coqueta: 'coque.png', damiana: 'damian.png', mechesangas: 'meche.png', tramaco: 'tamayo.png',
  'mango-tropical': 'jfo.png', frijolero: 'sean.png', rola: 'rola.png', lulu: 'lulu.png',
  milton: 'milton.png', fer: 'fer.png', perro: 'perro.png', joto: 'joto.png', mono: 'mono.png',
  'el-asesor': 'j%26p.png', felipao: 'fp.png', 'pato-1': 'pato.png',
}

/**
 * Foto para mostrar a alguien en un torneo pasado: antes del T31 va la foto
 * de entonces (la del T30), no la tarjeta de lucha libre. Si no hay foto
 * vieja conocida, la actual.
 */
export function photoForTournament(photoUrl: string | null | undefined, tournamentNumber: number): string | null {
  if (!photoUrl || tournamentNumber >= FIRST_CARD_TOURNAMENT) return photoUrl ?? null
  const m = photoUrl.match(/^https:\/\/storage\.googleapis\.com\/poker-enfermos\/t31\/perfil\/([^/]+)\.webp$/)
  const old = m ? T30_PHOTOS[m[1]] : undefined
  return old ? `https://storage.googleapis.com/poker-enfermos/${old}` : photoUrl
}

const T31_PROFILE_PHOTO = /^https:\/\/storage\.googleapis\.com\/poker-enfermos\/t31\/perfil\/[^/]+\.webp$/

/**
 * Lo mismo que photoForTournament, pero sobre una respuesta entera: recorre
 * objetos y arreglos y cambia toda foto de perfil del T31 por la que la persona
 * tenia en ese torneo. Es el punto unico de la API para lo que pertenece a un
 * torneo (fechas, eliminaciones, tabla, estadisticas): asi ninguna pantalla
 * tiene que acordarse. Desde el T31 (o sin numero) devuelve lo mismo. Es
 * idempotente y no toca fechas ni otros objetos que no sean planos.
 */
export function withTournamentPhotos<T>(data: T, tournamentNumber: number | null | undefined): T {
  if (tournamentNumber == null || tournamentNumber >= FIRST_CARD_TOURNAMENT) return data
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') {
      return T31_PROFILE_PHOTO.test(value) ? photoForTournament(value, tournamentNumber) : value
    }
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') {
      const proto = Object.getPrototypeOf(value)
      if (proto !== Object.prototype && proto !== null) return value
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
    }
    return value
  }
  return walk(data) as T
}
