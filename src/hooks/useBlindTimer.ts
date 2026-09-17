'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { buildAuthHeaders } from '@/lib/client-auth'
import type { TimerSnapshot } from '@/lib/timer-service'

/**
 * El timer visto desde el cliente.
 *
 * Dos decisiones que evitan los problemas del hook anterior:
 *
 * 1. NO se descuenta un contador local. El servidor manda `levelEndsAt`, un
 *    instante absoluto, y aqui solo se calcula la diferencia contra el reloj
 *    corregido. Si la pestana se duerme diez minutos, al volver muestra el
 *    valor correcto sin arrastrar error.
 *
 * 2. Se corrige el desfase del reloj del dispositivo. El telefono de alguien
 *    puede estar minutos adelantado; `serverNow` permite descontarlo.
 */

export type TimerAction = 'start' | 'pause' | 'resume' | 'restart-level' | 'advance'

/** Lo que se dispara cuando toca avisar. */
export type TimerAlert =
  | { kind: 'one-minute'; level: number }
  | { kind: 'level-change'; level: number; smallBlind: number; bigBlind: number }

interface Options {
  gameDateId: number | null
  /** Se llama una sola vez por evento. Para el sonido, la vibracion y el destello. */
  onAlert?: (alert: TimerAlert) => void
}

const UN_MINUTO_MS = 60_000

export function useBlindTimer({ gameDateId, onAlert }: Options) {
  const { data, error, isLoading, mutate } = useSWR<TimerSnapshot>(
    gameDateId ? `/api/timer/${gameDateId}` : null,
    {
      // Sondeo de respaldo: cubre los cambios hechos desde otro dispositivo.
      // La cuenta regresiva no depende de esto, se calcula localmente.
      refreshInterval: 15_000,
      revalidateOnFocus: true,
      dedupingInterval: 2_000,
    }
  )

  const [remainingMs, setRemainingMs] = useState(0)
  const desfaseRef = useRef(0)
  const avisadoRef = useRef<string | null>(null)
  const nivelPrevioRef = useRef<number | null>(null)
  const onAlertRef = useRef(onAlert)
  onAlertRef.current = onAlert

  // Desfase entre el reloj del servidor y el del dispositivo.
  useEffect(() => {
    if (!data?.serverNow) return
    desfaseRef.current = new Date(data.serverNow).getTime() - Date.now()
  }, [data?.serverNow])

  const calcular = useCallback(() => {
    if (!data) return 0
    if (data.status !== 'active' || !data.levelEndsAt) return data.remainingMs
    const ahora = Date.now() + desfaseRef.current
    return Math.max(0, new Date(data.levelEndsAt).getTime() - ahora)
  }, [data])

  // Tic de un segundo, solo para refrescar lo que se ve.
  useEffect(() => {
    if (!data) return
    setRemainingMs(calcular())
    if (data.status !== 'active') return

    const id = setInterval(() => setRemainingMs(calcular()), 1000)
    // Al volver a primer plano el navegador pudo estrangular el intervalo:
    // se recalcula de inmediato en vez de esperar al proximo tic.
    const alVolver = () => {
      if (!document.hidden) setRemainingMs(calcular())
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [data, calcular])

  // Aviso de "falta 1 minuto". La clave incluye el nivel para que se dispare
  // una sola vez por nivel, aunque el tic pase varias veces por el umbral.
  useEffect(() => {
    if (!data || data.status !== 'active' || data.isUnlimited) return
    if (remainingMs > UN_MINUTO_MS || remainingMs <= 0) return

    const clave = `1min:${data.level}`
    if (avisadoRef.current === clave) return
    avisadoRef.current = clave
    onAlertRef.current?.({ kind: 'one-minute', level: data.level })
  }, [remainingMs, data])

  // Aviso de cambio de blind: se dispara al ver un nivel distinto al anterior,
  // no al llegar a cero. Asi tambien avisa si el cambio fue manual.
  useEffect(() => {
    if (!data || data.status === 'inactive') return
    const previo = nivelPrevioRef.current
    nivelPrevioRef.current = data.level

    if (previo === null || previo === data.level) return
    onAlertRef.current?.({
      kind: 'level-change',
      level: data.level,
      smallBlind: data.smallBlind ?? 0,
      bigBlind: data.bigBlind ?? 0,
    })
  }, [data])

  // Cuando la cuenta llega a cero, se pide el estado nuevo al servidor: es el
  // que decide el nivel, no el cliente.
  useEffect(() => {
    if (!data || data.status !== 'active' || data.isUnlimited) return
    if (remainingMs > 0) return
    mutate()
  }, [remainingMs, data, mutate])

  const control = useCallback(
    async (action: TimerAction) => {
      if (!gameDateId) return
      const res = await fetch(`/api/timer/${gameDateId}`, {
        method: 'POST',
        headers: { ...buildAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const detalle = await res.json().catch(() => ({}))
        throw new Error(detalle?.error ?? 'No se pudo controlar el timer')
      }
      // La respuesta ya trae el estado resultante: se usa directo en vez de
      // volver a pedirlo.
      await mutate(await res.json(), { revalidate: false })
    },
    [gameDateId, mutate]
  )

  return {
    snapshot: data ?? null,
    remainingMs,
    isLoading,
    error,
    control,
    refresh: mutate,
  }
}

/** mm:ss a partir de milisegundos. */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
