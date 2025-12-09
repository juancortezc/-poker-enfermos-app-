'use client'

import { AlertTriangle, X } from 'lucide-react'
import { Button } from './button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'warning',
  isLoading = false
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: 'text-rose-400',
      border: 'border-rose-500/30',
      bg: 'from-rose-500/15 via-[#2a1a14] to-[#1f1410]',
      button: 'bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700'
    },
    warning: {
      icon: 'text-[#e0b66c]',
      border: 'border-[#e0b66c]/30',
      bg: 'from-[#e0b66c]/10 via-[#2a1a14] to-[#1f1410]',
      button: 'bg-gradient-to-r from-[#e0b66c] via-[#d4a049] to-[#a9441c]'
    },
    info: {
      icon: 'text-blue-400',
      border: 'border-blue-500/30',
      bg: 'from-blue-500/10 via-[#2a1a14] to-[#1f1410]',
      button: 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700'
    }
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className={`relative w-full max-w-md rounded-3xl border ${styles.border} bg-gradient-to-br ${styles.bg} p-6 shadow-[0_24px_48px_rgba(11,6,3,0.65)]`}
        role="dialog"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 ${styles.icon}`}>
            <AlertTriangle className="h-7 w-7" />
          </div>
        </div>

        {/* Title */}
        <h2
          id="dialog-title"
          className="mb-3 text-center text-xl font-semibold tracking-tight text-white"
        >
          {title}
        </h2>

        {/* Description */}
        <p
          id="dialog-description"
          className="mb-6 text-center text-sm leading-relaxed text-white/70"
        >
          {description}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-full border border-white/20 bg-white/5 text-white/80 transition-all hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {cancelText}
          </Button>
          <Button
            variant="ghost"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 rounded-full ${styles.button} text-white font-semibold shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                <span>Procesando...</span>
              </div>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
