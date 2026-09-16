'use client'

import { useEffect, useState } from 'react'

/**
 * iOS solo expone la API de notificaciones a las web apps instaladas en la
 * pantalla de inicio (Safari 16.4+). Dentro de una pestana de Safari no existe
 * ni `Notification` ni push, asi que `isSupported()` da false y el usuario
 * queda sin camino: por eso hay que detectar este caso y explicar como salir.
 */
export function useIosInstall() {
  const [state, setState] = useState({
    isIos: false,
    isStandalone: false,
    needsInstall: false,
  })

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean }
    // iPadOS 13+ se presenta como Mac; el touch lo delata.
    const isIos =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      nav.standalone === true

    setState({ isIos, isStandalone, needsInstall: isIos && !isStandalone })
  }, [])

  return state
}

export default useIosInstall
