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
