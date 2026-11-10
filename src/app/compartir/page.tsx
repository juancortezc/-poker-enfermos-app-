'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Share2, Download, RefreshCw, Trophy, ListOrdered, Sparkles, Sigma, Crown, Skull } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveTournament } from '@/hooks/useActiveTournament'
import { useActiveGameDate } from '@/hooks/useActiveGameDate'
import { buildAuthHeaders } from '@/lib/client-auth'
import { CPHeader } from '@/components/clean-poker/CPHeader'
import { CPBottomNav } from '@/components/clean-poker/CPBottomNav'
import { CPAppShell } from '@/components/clean-poker/CPAppShell'
import { CPPageSkeleton } from '@/components/clean-poker/CPPageSkeleton'
import { HomeCard } from '@/components/clean-poker/HomeCard'

/**
 * Imagenes del torneo para mandar al grupo por WhatsApp.
 *
 * El PNG se arma en el servidor (next/og). Aqui solo se descarga y se pasa al
 * menu de compartir del telefono; no se captura el DOM, que obligaria a meter
 * html2canvas de vuelta en el bundle.
 *
 * Contenido generico a proposito: podio, los personajes de la noche y la
 * tabla del torneo. Nada
 * de "tu noche" ni la posicion de quien comparte — esto lo ve todo el grupo.
 */

type Pieza = {
  clave:
    | 'ultima-fecha'
    | 'malazo-fecha'
    | 'lo-que-dejo'
    | 'podio-torneo'
    | 'malazos-torneo'
    | 'elimina'
    | 'acum'
  titulo: string
  detalle: string
  icono: typeof Trophy
  archivo: string
}

/**
 * Primero lo de la noche recien jugada, que es lo que el grupo espera al dia
 * siguiente; despues lo del torneo, que cambia lento; al final las tablas.
 */
const PIEZAS: Pieza[] = [
  {
    clave: 'ultima-fecha',
    titulo: 'Podio de la noche',
    detalle: 'Los tres primeros de la fecha, con sus fotos, el Varón y cuántos jugaron.',
    icono: Trophy,
    archivo: 'podio-de-la-noche.png',
  },
  {
    clave: 'malazo-fecha',
    titulo: 'El 7/2 de la noche',
    detalle: 'El primero en salir de la mesa, el segundo y quién lo mandó a casa.',
    icono: Skull,
    archivo: 'siete-dos-de-la-noche.png',
  },
  {
    clave: 'lo-que-dejo',
    titulo: 'Lo que dejó la noche',
    detalle: 'El Varón, el Malazo, quién más bajó y quién más subió.',
    icono: Sparkles,
    archivo: 'lo-que-dejo-la-noche.png',
  },
  {
    clave: 'podio-torneo',
    titulo: 'Podio del torneo',
    detalle: 'Los tres primeros de la tabla acumulada, con las mesas finales del líder.',
    icono: Crown,
    archivo: 'podio-del-torneo.png',
  },
  {
    clave: 'malazos-torneo',
    titulo: 'Los 7/2 del torneo',
    detalle: 'Los dos últimos de la tabla y a cuántos puntos están de salir del fondo.',
    icono: Skull,
    archivo: 'siete-dos-del-torneo.png',
  },
  {
    clave: 'elimina',
    titulo: 'Tabla Elimina',
    detalle: 'La tabla completa del torneo, igual que en la app: PUNTOS, ACUM. y los ELIMINA.',
    icono: ListOrdered,
    archivo: 'tabla-elimina.png',
  },
  {
    clave: 'acum',
    titulo: 'Tabla ACUM.',
    detalle: 'Ordenada por puntos reales, sin descartar fechas. DIF es lo que quita el ELIMINA.',
    icono: Sigma,
    archivo: 'tabla-acum.png',
  },
]

type Estado = { url: string; blob: Blob } | null

/**
 * Las imagenes se arman de una en una.
 *
 * Cada tarjeta pide la suya al montarse, y son siete: pedirlas todas a la vez
 * deja al servidor rasterizando siete PNG grandes en paralelo y el resto de la
 * app se queda esperando. Esta cola las pone en fila sin cambiar nada de lo
 * que ve la Comision.
 */
let cola: Promise<unknown> = Promise.resolve()

function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const turno = cola.then(tarea, tarea)
  cola = turno.catch(() => undefined)
  return turno
}

function Tarjeta({ pieza }: { pieza: Pieza }) {
  const [estado, setEstado] = useState<Estado>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const Icono = pieza.icono

  const generar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // La cola tiene que envolver tambien la lectura del cuerpo. Antes solo
      // envolvia el fetch, y fetch se resuelve en cuanto llegan las cabeceras:
      // next/og transmite el PNG mientras lo rasteriza, asi que el trabajo
      // pesado del servidor pasaba durante el res.blob(), ya fuera del turno.
      // Resultado: las siete tarjetas liberaban la fila casi al instante y
      // seguian rasterizando en paralelo, justo lo que la cola debia evitar
      // (la app se quedaba lenta mientras se armaban las imagenes).
      const blob = await enFila(async () => {
        const res = await fetch(`/api/share/${pieza.clave}`, {
          headers: buildAuthHeaders(),
          cache: 'no-store',
        })
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? 'Todavía no hay datos para esta imagen.'
              : 'No se pudo generar la imagen.'
          )
        }
        // El turno no se libera hasta tener el PNG completo en memoria.
        return res.blob()
      })

      // createObjectURL y el estado de React son locales e instantaneos: no
      // tocan al servidor, asi que no hace falta ocupar el turno con ellos.
      setEstado((previo) => {
        if (previo) URL.revokeObjectURL(previo.url)
        return { blob, url: URL.createObjectURL(blob) }
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la imagen.')
    } finally {
      setCargando(false)
    }
  }, [pieza.clave])

  useEffect(() => {
    generar()
  }, [generar])

  // Se libera el object URL al desmontar para no dejar el blob colgado.
  useEffect(() => {
    return () => {
      setEstado((previo) => {
        if (previo) URL.revokeObjectURL(previo.url)
        return null
      })
    }
  }, [])

  const compartir = async () => {
    if (!estado) return
    const file = new File([estado.blob], pieza.archivo, { type: 'image/png' })

    // En el telefono esto abre el menu nativo y lleva directo a WhatsApp.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return
      } catch (e) {
        // Cancelar el menu no es un error que valga la pena mostrar.
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    descargar()
  }

  const descargar = () => {
    if (!estado) return
    const a = document.createElement('a')
    a.href = estado.url
    a.download = pieza.archivo
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const puedeCompartir = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <HomeCard style={{ padding: 16 }}>
      <div className="flex items-start gap-3">
        <Icono className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--cp-primary)' }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold" style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}>
            {pieza.titulo}
          </p>
          <p
            className="mt-0.5"
            style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)', lineHeight: 1.5 }}
          >
            {pieza.detalle}
          </p>
        </div>
      </div>

      <div
        className="mt-4 rounded-xl overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--cp-surface-2)', border: '1px solid var(--cp-surface-border)', minHeight: 140 }}
      >
        {cargando && (
          <p style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)', padding: 24 }}>
            Generando...
          </p>
        )}
        {!cargando && error && (
          <p style={{ fontSize: 'var(--cp-caption-size)', color: '#C2410C', padding: 24, textAlign: 'center' }}>
            {error}
          </p>
        )}
        {!cargando && !error && estado && (
          <Image
            src={estado.url}
            alt={`Vista previa de ${pieza.titulo}`}
            width={1080}
            height={600}
            className="w-full h-auto"
            unoptimized
          />
        )}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={compartir}
          disabled={!estado || cargando}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
          style={{
            background: 'var(--cp-primary)',
            color: '#fff',
            fontSize: 'var(--cp-body-size)',
            opacity: !estado || cargando ? 0.5 : 1,
          }}
        >
          <Share2 className="w-4 h-4" />
          {puedeCompartir ? 'Compartir' : 'Descargar'}
        </button>

        {puedeCompartir && (
          <button
            onClick={descargar}
            disabled={!estado || cargando}
            aria-label={`Descargar ${pieza.titulo}`}
            className="flex items-center justify-center px-4 rounded-xl"
            style={{
              border: '1px solid var(--cp-surface-border)',
              color: 'var(--cp-on-surface)',
              opacity: !estado || cargando ? 0.5 : 1,
            }}
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={generar}
          disabled={cargando}
          aria-label={`Regenerar ${pieza.titulo}`}
          className="flex items-center justify-center px-4 rounded-xl"
          style={{
            border: '1px solid var(--cp-surface-border)',
            color: 'var(--cp-on-surface)',
            opacity: cargando ? 0.5 : 1,
          }}
        >
          <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </HomeCard>
  )
}

export default function CompartirPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { tournament: activeTournament, isLoading: tournamentLoading } = useActiveTournament({ refreshInterval: 300000 })
  const { hasActiveGameDate } = useActiveGameDate()

  const esComision = user?.role === 'Comision'

  useEffect(() => {
    if (!authLoading && user && !esComision) {
      router.replace('/')
    }
  }, [authLoading, user, esComision, router])

  if (authLoading || tournamentLoading) {
    return <CPPageSkeleton blocks={[56, 320]} />
  }

  if (!user || !esComision) {
    return null
  }

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'PE'

  return (
    <CPAppShell tone="light">
      <CPHeader tone="light"
        userInitials={userInitials}
        userPhotoUrl={user.photoUrl}
        tournamentNumber={activeTournament?.number ?? 29}
        isComision
        hasActiveGameDate={hasActiveGameDate}
      />

      <main className="pb-24 px-4 pt-4 space-y-4">
        <div>
          <h1 className="font-bold" style={{ fontSize: 'var(--cp-title-size)', color: 'var(--cp-on-surface)' }}>
            Compartir al grupo
          </h1>
          <p
            className="mt-1"
            style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)', lineHeight: 1.5 }}
          >
            Imágenes listas para WhatsApp. Solo información del grupo: nada de
            resultados personales.
          </p>
        </div>

        {PIEZAS.map((pieza) => (
          <Tarjeta key={pieza.clave} pieza={pieza} />
        ))}
      </main>

      <CPBottomNav tone="light" />
    </CPAppShell>
  )
}
