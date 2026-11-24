'use client'

import { useEffect } from 'react'

/**
 * Hace que la app se actualice sola cuando se publica una version nueva.
 *
 * EL PROBLEMA QUE RESUELVE
 *
 * La app es una PWA: el service worker guarda su propio codigo para que
 * funcione sin conexion. Eso tiene un costo — el telefono sigue ejecutando la
 * copia vieja hasta que el service worker nuevo toma el control, y eso solo
 * pasaba al cerrar la app por completo. En la practica nadie cierra una app
 * instalada: queda meses en segundo plano. Asi, alguien podia estar viendo una
 * version de hace semanas mientras en la computadora veia la actual, sin
 * ninguna senal de que estaba desactualizado.
 *
 * QUE HACE
 *
 * 1. Busca si hay version nueva al volver a primer plano y una vez por hora.
 *    Sin esto, una pestana abierta hace dias nunca se entera.
 * 2. Cuando el service worker nuevo toma el control, recarga una sola vez.
 *
 * El guardia del `controller` evita recargar en la primera visita: ahi tambien
 * se dispara `controllerchange` —porque el service worker reclama la pagina—
 * y recargar en ese momento haria parpadear la app sin motivo.
 */

const CADA_HORA = 60 * 60 * 1000

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    let recargando = false
    let intervalo: ReturnType<typeof setInterval> | undefined

    const alCambiarControlador = () => {
      // Sin controlador previo no hay nada que reemplazar: es la primera carga.
      if (recargando) return
      recargando = true
      window.location.reload()
    }

    const buscarActualizacion = async () => {
      try {
        const registro = await navigator.serviceWorker.getRegistration()
        await registro?.update()
      } catch {
        // Sin red o sin permiso: se reintenta en el proximo ciclo.
      }
    }

    const alVolverAlFrente = () => {
      if (!document.hidden) void buscarActualizacion()
    }

    // Solo se escucha el cambio si YA habia un controlador. Si no lo hay, esta
    // es la primera visita y el evento llegaria por el reclamo inicial.
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', alCambiarControlador)
      void buscarActualizacion()
      intervalo = setInterval(buscarActualizacion, CADA_HORA)
      document.addEventListener('visibilitychange', alVolverAlFrente)
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', alCambiarControlador)
      document.removeEventListener('visibilitychange', alVolverAlFrente)
      if (intervalo) clearInterval(intervalo)
    }
  }, [])

  return null
}

export default ServiceWorkerUpdater
