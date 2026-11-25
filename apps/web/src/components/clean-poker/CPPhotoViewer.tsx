'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

/**
 * Visor a pantalla completa para una foto o tarjeta de jugador.
 *
 * Usa el <dialog> nativo con showModal(): el navegador ya da lo accesible
 * (foco atrapado dentro, Esc cierra, el resto de la pagina queda inerte y se
 * anuncia como dialogo). Ademas cierra con un clic en cualquier parte —
 * es una foto, no hay nada mas que hacer adentro.
 *
 * Controlado: quien lo usa decide `open` y recibe `onClose`. Lo usa
 * CPPlayerCard con `zoomable`, pero sirve solo para cualquier imagen del
 * bucket (p. ej. el Inicio).
 *
 * Fondo: la tinta del papel casi opaca, igual en tono claro y oscuro, para
 * que la tarjeta (que tiene marco rojo) resalte sin competir.
 */

interface CPPhotoViewerProps {
  open: boolean
  onClose: () => void
  src: string
  alt: string
  /** Proporcion de la imagen (ancho / alto). La tarjeta es 2/3; la foto, 3/4. */
  aspectRatio?: number
}

export function CPPhotoViewer({ open, onClose, src, alt, aspectRatio = 2 / 3 }: CPPhotoViewerProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Sin esto la pagina de atras se sigue desplazando con el dedo.
      document.documentElement.style.overflow = 'hidden'
    } else if (!open && dialog.open) {
      dialog.close()
    }
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={alt}
      className="cp-photo-viewer"
      // Esc dispara 'cancel' y luego 'close'; el boton y el clic, solo close().
      onClose={() => {
        document.documentElement.style.overflow = ''
        onClose()
      }}
      onClick={() => ref.current?.close()}
    >
      {open && (
        <div
          className="cp-photo-viewer__frame"
          style={{ aspectRatio, width: `min(92vw, calc(88dvh * ${aspectRatio}), 560px)` }}
        >
          <Image
            src={src}
            alt={alt}
            fill
            sizes={`min(92vw, calc(88vh * ${aspectRatio}), 560px)`}
            className="object-contain"
          />
        </div>
      )}
      <button
        type="button"
        autoFocus
        aria-label="Cerrar"
        className="cp-photo-viewer__close"
        onClick={() => ref.current?.close()}
      >
        <X size={22} />
      </button>
    </dialog>
  )
}

export default CPPhotoViewer
