'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useBlindTimer, formatRemaining, type TimerAlert } from '@/hooks/useBlindTimer'
import { avisarUnMinuto, avisarCambio, prepararAudio, audioListo } from '@/lib/timer-alerts'
import { TIMER_ENABLED } from '@/lib/feature-flags'

/**
 * Pantalla del timer. Pensada para mirarse de lejos, en la mesa: numeros
 * enormes, fondo negro y un destello a pantalla completa cuando toca avisar.
 *
 * La cuenta regresiva no la lleva esta pantalla — la calcula contra el
 * instante de cambio que manda el servidor. Puede cerrarse, dormirse o
 * abrirse a mitad de la noche y siempre muestra lo mismo que las demas.
 */

type Destello = 'aviso' | 'cambio' | null

export default function TimerPage() {
  const { user } = useAuth()
  const { gameDate } = useActiveGameDate({ refreshInterval: 30000 })
  const [destello, setDestello] = useState<Destello>(null)
  const [anuncio, setAnuncio] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sonidoListo, setSonidoListo] = useState(true)

  const esComision = user?.role === 'Comision'
  const gameDateId = gameDate?.id ?? null

  const alAvisar = useCallback((alerta: TimerAlert) => {
    if (alerta.kind === 'one-minute') {
      avisarUnMinuto()
      setAnuncio('FALTA 1 MINUTO')
      setDestello('aviso')
    } else {
      avisarCambio()
      setAnuncio(`CAMBIO A ${alerta.smallBlind}/${alerta.bigBlind}`)
      setDestello('cambio')
    }
  }, [])

  const { snapshot, remainingMs, control } = useBlindTimer({ gameDateId, onAlert: alAvisar })

  /**
   * El navegador no deja sonar hasta que hay un gesto del usuario. Los
   * botones solo los ve la Comision, asi que en una pantalla proyectada con
   * la sesion de cualquier jugador el audio no se desbloqueaba nunca — justo
   * la pantalla que tiene que sonar. Sirve cualquier toque.
   */
  useEffect(() => {
    setSonidoListo(audioListo())
    if (audioListo()) return

    const desbloquear = async () => {
      if (await prepararAudio()) setSonidoListo(true)
    }
    window.addEventListener('pointerdown', desbloquear)
    window.addEventListener('keydown', desbloquear)
    return () => {
      window.removeEventListener('pointerdown', desbloquear)
      window.removeEventListener('keydown', desbloquear)
    }
  }, [sonidoListo])

  // El destello y el cartel se apagan solos.
  useEffect(() => {
    if (!destello) return
    const id = setTimeout(() => {
      setDestello(null)
      setAnuncio(null)
    }, destello === 'cambio' ? 6000 : 4000)
    return () => clearTimeout(id)
  }, [destello])

  const accion = async (a: Parameters<typeof control>[0]) => {
    setError(null)
    // Doble funcion: ademas de la accion, el clic desbloquea el audio.
    if (await prepararAudio()) setSonidoListo(true)
    try {
      await control(a)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo controlar el timer')
    }
  }

  if (!TIMER_ENABLED) {
    return (
      <Centrado>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>Timer en mantenimiento</p>
      </Centrado>
    )
  }

  if (!gameDate) {
    return (
      <Centrado>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }}>No hay fecha activa</p>
      </Centrado>
    )
  }

  const pausado = snapshot?.status === 'paused'
  const terminado = snapshot?.status === 'completed'
  const critico = snapshot?.status === 'active' && remainingMs <= 60_000 && remainingMs > 0

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 select-none"
      style={{
        background:
          destello === 'cambio' ? '#7F1D1D' : destello === 'aviso' ? '#4A3708' : '#0B0B0D',
        transition: 'background 220ms ease',
      }}
    >
      {/* Cartel del aviso, a pantalla completa */}
      {anuncio && (
        <div
          className="cp-rise"
          style={{
            fontSize: 'clamp(28px, 7vw, 64px)',
            fontWeight: 900,
            letterSpacing: '0.04em',
            color: '#fff',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {anuncio}
        </div>
      )}

      <p style={{ fontSize: 14, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.45)' }}>
        FECHA {gameDate.dateNumber} · NIVEL {snapshot?.level ?? 1}
      </p>

      {/* Blind actual */}
      <div
        style={{
          fontSize: 'clamp(44px, 12vw, 120px)',
          fontWeight: 900,
          color: '#fff',
          lineHeight: 1.05,
          marginTop: 8,
        }}
      >
        {snapshot?.smallBlind ?? '—'}/{snapshot?.bigBlind ?? '—'}
      </div>

      {/* Cuenta regresiva */}
      <div
        className={critico ? 'animate-pulse' : undefined}
        style={{
          fontSize: 'clamp(72px, 26vw, 260px)',
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          marginTop: 4,
          color: pausado ? '#E8C158' : critico ? '#FF6B6B' : '#fff',
        }}
      >
        {snapshot?.isUnlimited ? 'SIN LÍMITE' : formatRemaining(remainingMs)}
      </div>

      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginTop: 12, textAlign: 'center' }}>
        {pausado
          ? 'PAUSADO'
          : terminado
            ? 'ESTRUCTURA TERMINADA'
            : snapshot?.nextLevel
              ? `Sigue: ${snapshot.nextSmallBlind}/${snapshot.nextBigBlind}`
              : 'Último nivel'}
      </p>

      {error && (
        <p style={{ fontSize: 14, color: '#FF9F9F', marginTop: 16, textAlign: 'center' }}>{error}</p>
      )}

      {!sonidoListo && (
        <p
          className="animate-pulse"
          style={{
            marginTop: 28,
            fontSize: 15,
            color: '#E8C158',
            textAlign: 'center',
            letterSpacing: '0.04em',
          }}
        >
          Toca la pantalla una vez para activar el sonido
        </p>
      )}

      {/* Controles: solo Comisión */}
      {esComision && (
        <div className="flex flex-wrap items-center justify-center gap-3" style={{ marginTop: 40 }}>
          {snapshot?.status === 'inactive' ? (
            <Boton onClick={() => accion('start')} destacado>
              <Play className="w-5 h-5" />
              {sonidoListo ? 'Iniciar' : 'Iniciar y activar sonido'}
            </Boton>
          ) : (
            <>
              <Boton onClick={() => accion(pausado ? 'resume' : 'pause')} destacado>
                {pausado ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                {pausado ? 'Reanudar' : 'Pausar'}
              </Boton>
              <Boton onClick={() => accion('restart-level')}>
                <RotateCcw className="w-5 h-5" /> Reiniciar nivel
              </Boton>
              <Boton onClick={() => accion('advance')}>
                <SkipForward className="w-5 h-5" /> Adelantar
              </Boton>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Centrado({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 text-center"
      style={{ background: '#0B0B0D' }}
    >
      {children}
    </div>
  )
}

function Boton({
  children,
  onClick,
  destacado = false,
}: {
  children: React.ReactNode
  onClick: () => void
  destacado?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-85"
      style={{
        padding: '14px 22px',
        borderRadius: 14,
        fontSize: 16,
        color: '#fff',
        background: destacado ? '#E53935' : 'rgba(255,255,255,0.10)',
        border: destacado ? 'none' : '1px solid rgba(255,255,255,0.20)',
      }}
    >
      {children}
    </button>
  )
}
