'use client'

import { useState, useEffect } from 'react'
import { Download, Share2, Smartphone, CheckCircle, Apple, Chrome } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function AplicacionTab() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect iOS
    const iosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    setIsIos(iosDevice)

    // Detect standalone mode
    const nav = window.navigator as Navigator & { standalone?: boolean }
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      nav.standalone === true
    setIsStandalone(standalone)

    // Listen for install prompt
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Trigger manual PWA show event for iOS
      window.dispatchEvent(new CustomEvent('pwa:show', { detail: { forceIos: isIos } }))
      return
    }

    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.warn('PWA install prompt failed:', error)
    }
    setInstalling(false)
  }

  const IOS_INSTRUCTIONS = [
    {
      step: 1,
      icon: <Share2 className="w-5 h-5" />,
      text: 'Pulsa el botón Compartir en Safari',
      detail: 'Es el icono cuadrado con flecha hacia arriba',
    },
    {
      step: 2,
      icon: <Smartphone className="w-5 h-5" />,
      text: 'Selecciona "Agregar a pantalla de inicio"',
      detail: 'Desplázate hacia abajo si no lo ves',
    },
    {
      step: 3,
      icon: <CheckCircle className="w-5 h-5" />,
      text: 'Confirma con "Agregar"',
      detail: 'El icono aparecerá en tu pantalla de inicio',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        {isStandalone ? (
          <>
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.2)' }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: '#22c55e' }} />
            </div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--cp-on-surface)' }}
            >
              App Instalada
            </h2>
            <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
              Estás usando Poker Enfermos como aplicación
            </p>
          </>
        ) : (
          <>
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(229, 57, 53, 0.2)' }}
            >
              <Download className="w-8 h-8" style={{ color: '#E53935' }} />
            </div>
            <h2
              className="text-lg font-bold mb-2"
              style={{ color: 'var(--cp-on-surface)' }}
            >
              Instalar Aplicación
            </h2>
            <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-caption-size)' }}>
              Agrega Poker Enfermos a tu pantalla de inicio para acceder más rápido
            </p>
          </>
        )}
      </div>

      {/* iOS Instructions */}
      {isIos && !isStandalone && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Apple className="w-5 h-5" style={{ color: '#E53935' }} />
            <h3 className="font-semibold" style={{ color: 'var(--cp-on-surface)' }}>
              Instrucciones para iOS
            </h3>
          </div>

          <div className="space-y-4">
            {IOS_INSTRUCTIONS.map((instruction) => (
              <div
                key={instruction.step}
                className="flex items-start gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(229, 57, 53, 0.2)' }}
                >
                  <span style={{ color: '#E53935', fontWeight: 'bold', fontSize: '14px' }}>
                    {instruction.step}
                  </span>
                </div>
                <div>
                  <p
                    className="font-medium"
                    style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}
                  >
                    {instruction.text}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--cp-on-surface-muted)' }}
                  >
                    {instruction.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Safari Note */}
          <div
            className="mt-4 p-3 rounded-xl"
            style={{
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
            }}
          >
            <p style={{ color: '#f97316', fontSize: 'var(--cp-caption-size)' }}>
              Nota: Debes usar Safari para instalar la app en iOS
            </p>
          </div>
        </div>
      )}

      {/* Android/Chrome Instructions */}
      {!isIos && !isStandalone && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'var(--cp-surface)',
            border: '1px solid var(--cp-surface-border)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <Chrome className="w-5 h-5" style={{ color: '#E53935' }} />
            <h3 className="font-semibold" style={{ color: 'var(--cp-on-surface)' }}>
              {deferredPrompt ? 'Listo para instalar' : 'Instrucciones para Android'}
            </h3>
          </div>

          {deferredPrompt ? (
            <p style={{ color: 'var(--cp-on-surface-muted)', fontSize: 'var(--cp-body-size)' }}>
              Pulsa el botón de abajo para agregar Poker Enfermos a tu pantalla de inicio
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(229, 57, 53, 0.2)' }}
                >
                  <span style={{ color: '#E53935', fontWeight: 'bold', fontSize: '14px' }}>1</span>
                </div>
                <div>
                  <p
                    className="font-medium"
                    style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}
                  >
                    Abre el menú de Chrome
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--cp-on-surface-muted)' }}>
                    Los tres puntos en la esquina superior derecha
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(229, 57, 53, 0.2)' }}
                >
                  <span style={{ color: '#E53935', fontWeight: 'bold', fontSize: '14px' }}>2</span>
                </div>
                <div>
                  <p
                    className="font-medium"
                    style={{ color: 'var(--cp-on-surface)', fontSize: 'var(--cp-body-size)' }}
                  >
                    Selecciona "Instalar aplicación"
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--cp-on-surface-muted)' }}>
                    O "Agregar a pantalla de inicio"
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Install Button */}
      {!isStandalone && (
        <button
          onClick={handleInstallClick}
          disabled={installing}
          className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{
            background: '#E53935',
            color: 'white',
            opacity: installing ? 0.7 : 1,
          }}
        >
          {isIos ? (
            <>
              <Share2 className="w-5 h-5" />
              Entendido
            </>
          ) : deferredPrompt ? (
            <>
              <Download className="w-5 h-5" />
              {installing ? 'Instalando...' : 'Instalar Aplicación'}
            </>
          ) : (
            <>
              <Smartphone className="w-5 h-5" />
              Ver instrucciones
            </>
          )}
        </button>
      )}

      {/* Features */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--cp-surface)',
          border: '1px solid var(--cp-surface-border)',
        }}
      >
        <h3
          className="font-semibold mb-4"
          style={{ color: 'var(--cp-on-surface)' }}
        >
          Beneficios de la App
        </h3>

        <div className="space-y-3">
          {[
            'Acceso rápido desde tu pantalla de inicio',
            'Funciona sin conexión a internet',
            'Recibe notificaciones en tiempo real',
            'Experiencia de pantalla completa',
          ].map((benefit, index) => (
            <div key={index} className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
              <p style={{ color: 'var(--cp-on-surface-variant)', fontSize: 'var(--cp-caption-size)' }}>
                {benefit}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
