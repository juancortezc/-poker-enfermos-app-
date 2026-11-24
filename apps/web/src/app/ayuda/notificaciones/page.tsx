'use client'

import Link from 'next/link'
import { Share, Plus, Bell, Check, AlertTriangle, Smartphone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { useNotifications } from '@/hooks/useNotifications'
import { useIosInstall } from '@/hooks/useIosInstall'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
import { HomeCard } from '@/components/clean-poker/HomeCard'

/**
 * Instructivo de notificaciones en iPhone.
 *
 * Existe porque el camino no es descubrible: Apple no deja que una pagina
 * abierta en Safari mande notificaciones, asi que el boton de "activar"
 * sencillamente no aparece y no hay nada que explique por que. La pantalla
 * detecta en que punto del camino esta el telefono en vez de soltar los tres
 * pasos a ciegas.
 */

const PASOS = [
  {
    icon: Share,
    titulo: 'Abre el menu Compartir',
    detalle:
      'En Safari, toca el cuadrito con la flecha hacia arriba. En el iPhone esta abajo al centro; en el iPad, arriba a la derecha.',
  },
  {
    icon: Plus,
    titulo: 'Elige "Agregar a inicio"',
    detalle:
      'Baja en la lista hasta encontrarlo. Confirma con Agregar, arriba a la derecha. Te queda un icono nuevo en la pantalla de inicio.',
  },
  {
    icon: Smartphone,
    titulo: 'Abre la app desde ese icono',
    detalle:
      'No desde Safari: desde el icono nuevo. Es la unica forma en que iOS la trata como app y habilita las notificaciones.',
  },
  {
    icon: Bell,
    titulo: 'Activa las alertas',
    detalle:
      'Entra a Mas → Ajustes → Alertas y toca Activar. iOS te va a preguntar si permites las notificaciones: responde que si.',
  },
]

function Estado({
  tono,
  titulo,
  detalle,
}: {
  tono: 'ok' | 'aviso' | 'info'
  titulo: string
  detalle: string
}) {
  const color = tono === 'ok' ? '#15803D' : tono === 'aviso' ? '#C2410C' : 'var(--cp-primary)'
  const fondo =
    tono === 'ok'
      ? 'rgba(21, 128, 61, 0.10)'
      : tono === 'aviso'
        ? 'rgba(194, 65, 12, 0.10)'
        : 'rgba(229, 57, 53, 0.08)'
  const Icono = tono === 'ok' ? Check : tono === 'aviso' ? AlertTriangle : Bell

  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4"
      style={{ background: fondo, border: `1px solid ${color}33` }}
    >
      <Icono className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
      <div className="min-w-0">
        <p className="font-semibold" style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
          {titulo}
        </p>
        <p className="mt-1" style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-variant)', lineHeight: 1.5 }}>
          {detalle}
        </p>
      </div>
    </div>
  )
}

export default function AyudaNotificacionesPage() {
  const { user, loading: authLoading } = useAuth()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()
  const { isSupported, isInitializing, permission, pushSubscription } = useNotifications()
  const { isIos, isStandalone } = useIosInstall()

  if (authLoading || tournamentLoading) {
    return <CPPageSkeleton blocks={[56, 320]} />
  }

  const userInitials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'

  // Donde esta parado este dispositivo ahora mismo.
  const estado = (() => {
    if (isInitializing) return null
    if (pushSubscription) {
      return {
        tono: 'ok' as const,
        titulo: 'Ya las tienes activas',
        detalle: 'Este dispositivo va a recibir los avisos. No tienes que hacer nada mas.',
      }
    }
    if (isIos && !isStandalone) {
      return {
        tono: 'aviso' as const,
        titulo: 'Falta instalar la app',
        detalle: 'Estas en Safari, y ahi iOS no permite notificaciones. Sigue los cuatro pasos de abajo.',
      }
    }
    if (permission === 'denied') {
      return {
        tono: 'aviso' as const,
        titulo: 'Las bloqueaste antes',
        detalle:
          'Hay que habilitarlas desde los Ajustes del telefono: Ajustes → Notificaciones → Poker de Enfermos. Desde la app ya no se puede preguntar de nuevo.',
      }
    }
    if (!isSupported) {
      return {
        tono: 'aviso' as const,
        titulo: 'Este navegador no las soporta',
        detalle: 'Abre la app en Safari (iPhone) o en Chrome (Android y computadora).',
      }
    }
    return {
      tono: 'info' as const,
      titulo: 'Listo para activarlas',
      detalle: 'Este dispositivo si puede recibirlas. Entra a Mas → Ajustes → Alertas y toca Activar.',
    }
  })()

  return (
    <CPAppShell tone="light">
      <CPHeader tone="light"
        userInitials={userInitials}
        userPhotoUrl={user?.photoUrl}
        tournamentNumber={activeTournament?.number ?? 29}
        isComision={user?.role === 'Comision'}
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-24 px-4 pt-4 space-y-4">
        <div>
          <h1
            className="font-bold"
            style={{ fontSize: 'var(--cp-title-size, 20px)', color: 'var(--cp-on-surface)' }}
          >
            Notificaciones en iPhone
          </h1>
          <p
            className="mt-1"
            style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)', lineHeight: 1.5 }}
          >
            Apple no deja que una pagina abierta en Safari mande notificaciones. Hay
            que instalar la app en la pantalla de inicio. Se hace una sola vez.
          </p>
        </div>

        {estado && <Estado {...estado} />}

        <HomeCard style={{ padding: 16 }}>
          <ol className="space-y-4">
            {PASOS.map((paso, i) => {
              const Icono = paso.icon
              return (
                <li key={paso.titulo} className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 flex items-center justify-center font-bold"
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: 'var(--cp-primary)',
                      color: '#fff',
                      fontSize: 13,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="flex items-center gap-2 font-semibold"
                      style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
                    >
                      <Icono className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--cp-on-surface-muted)' }} />
                      {paso.titulo}
                    </p>
                    <p
                      className="mt-1"
                      style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-variant)', lineHeight: 1.5 }}
                    >
                      {paso.detalle}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </HomeCard>

        <HomeCard style={{ padding: 16 }}>
          <p
            className="font-semibold mb-2"
            style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
          >
            Si algo no sale
          </p>
          <ul className="space-y-2" style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-variant)', lineHeight: 1.5 }}>
            <li>
              <strong style={{ color: 'var(--cp-on-surface)' }}>Tiene que ser Safari.</strong> Si abres
              la app en Chrome o Firefox del iPhone, agregarla a inicio no sirve para las notificaciones.
            </li>
            <li>
              <strong style={{ color: 'var(--cp-on-surface)' }}>No aparece &ldquo;Agregar a inicio&rdquo;.</strong> Estas
              en una ventana privada. Abre la app en una pestana normal.
            </li>
            <li>
              <strong style={{ color: 'var(--cp-on-surface)' }}>Dijiste que no sin querer.</strong> iOS no
              vuelve a preguntar: hay que habilitarlas en Ajustes → Notificaciones → Poker de Enfermos.
            </li>
            <li>
              <strong style={{ color: 'var(--cp-on-surface)' }}>En Android y computadora</strong> no hace
              falta instalar nada: entra directo a Mas → Ajustes → Alertas.
            </li>
          </ul>
        </HomeCard>

        <Link
          href="/perfil?tab=notificaciones"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold"
          style={{ background: 'var(--cp-primary)', color: '#fff', fontSize: 'var(--cp-body-size)' }}
        >
          <Bell className="w-4 h-4" />
          Ir a Alertas
        </Link>
      </main>

      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
