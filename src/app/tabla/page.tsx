import { redirect } from 'next/navigation'

/**
 * La tabla del torneo vive en un solo lugar: /ranking, con selector de detalle
 * (Resumen · Fechas · Elimina). Esta ruta se mantiene para no romper enlaces
 * viejos ni accesos guardados.
 */
export default function TablaPage() {
  redirect('/ranking')
}
