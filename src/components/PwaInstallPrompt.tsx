'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Download, Share2 } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'pwa-install-dismissed-at-v1'
const INSTALL_FLAG = 'installed'

const isStandaloneDisplayMode = () => {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    nav.standalone === true
  )
}

const detectIos = () => {
  if (typeof window === 'undefined') return false
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)
  const dismissedTodayRef = useRef(false)

  const markDismissedToday = () => {
    if (typeof window === 'undefined') return
    const today = new Date().toISOString().slice(0, 10)
    window.localStorage.setItem(DISMISS_KEY, today)
    dismissedTodayRef.current = true
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const today = new Date().toISOString().slice(0, 10)
    let dismissed = window.localStorage.getItem(DISMISS_KEY)

    if (dismissed === '1') {
      window.localStorage.setItem(DISMISS_KEY, today)
      dismissed = today
    }

    const hasInstalled = dismissed === INSTALL_FLAG
    const hasDismissedToday = dismissed === today || hasInstalled
    dismissedTodayRef.current = hasDismissedToday

    const iosDevice = detectIos()
    setIsIos(iosDevice)

    if (isStandaloneDisplayMode()) {
      return
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      if (dismissedTodayRef.current) {
        return
      }
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setVisible(true)
      setShowIosSteps(false)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setVisible(false)
      window.localStorage.setItem(DISMISS_KEY, INSTALL_FLAG)
      dismissedTodayRef.current = true
    }

    const handleManualPrompt = (event: Event) => {
      const detail = (event as CustomEvent<{ forceIos?: boolean }>).detail || {}
      const ios = detectIos()
      setIsIos(ios)
      setShowIosSteps(detail.forceIos || ios)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('pwa:show', handleManualPrompt as EventListener)

    if (iosDevice && !hasDismissedToday) {
      setVisible(true)
      setShowIosSteps(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('pwa:show', handleManualPrompt as EventListener)
    }
  }, [])

  const hidePrompt = () => {
    setVisible(false)
    setDeferredPrompt(null)
    markDismissedToday()
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowIosSteps(true)
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        hidePrompt()
      }
      setDeferredPrompt(null)
    } catch (error) {
      console.warn('PWA install prompt failed:', error)
    }
  }

  const instructions = useMemo(
    () => [
      'Pulsa el botón Compartir en Safari',
      'Selecciona "Agregar a pantalla de inicio"',
      'Confirma con "Agregar" para tener acceso rápido',
    ],
    []
  )

  if (!visible) return null

  return (
    <div className="fixed bottom-24 left-1/2 z-60 w-full max-w-md -translate-x-1/2 px-4">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/90 backdrop-blur-md shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(229,9,20,0.2),_transparent_65%)]" />
        <div className="relative p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-poker-red/80 text-white shadow-lg">
              {isIos ? <Share2 className="h-5 w-5" /> : <Download className="h-5 w-5" />}
            </div>
            <div className="flex-1 text-sm text-white/90">
              <h3 className="text-base font-semibold text-white">Instala Poker de Enfermos</h3>
              {isIos || showIosSteps ? (
                <div className="mt-2 space-y-1.5 text-xs text-white/80">
                  {instructions.map((step, index) => (
                    <div key={step} className="flex items-start gap-2">
                      <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-white">{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-white/80">
                  Añade la app a tu pantalla principal para acceder más rápido y habilitar notificaciones en vivo.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={hidePrompt}
              className="ml-2 text-white/60 transition-colors hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 text-sm">
            {!isIos && !showIosSteps && (
              <button
                type="button"
                onClick={() => setShowIosSteps(true)}
                className="text-white/60 underline-offset-4 transition-colors hover:text-white"
              >
                ¿Usas iOS?
              </button>
            )}
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-full bg-poker-red px-4 py-2 font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
            >
              {isIos || showIosSteps ? 'Ok, entendido' : 'Instalar app'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PwaInstallPrompt
