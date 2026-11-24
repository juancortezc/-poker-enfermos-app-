/** Días enteros que faltan hasta `date` (0 si ya pasó), redondeando hacia arriba como la web. */
export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000));
}
