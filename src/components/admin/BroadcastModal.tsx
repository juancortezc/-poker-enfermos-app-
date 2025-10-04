'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { BroadcastNotification } from './BroadcastNotification'
import {
  Bell,
  X,
  Radio
} from 'lucide-react'

interface BroadcastModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="relative border border-white/12 rounded-2xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b2b]/95 via-[#141625]/95 to-[#10111b]/95 backdrop-blur-md" />

          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/12 bg-gradient-to-r from-white/8 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-poker-red/20 to-poker-red/10 border border-poker-red/20">
                  <Radio className="w-5 h-5 text-poker-red" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-white">Broadcast de Notificaciones</h2>
                  <p className="text-sm text-white/70 leading-relaxed">Envía mensajes a usuarios específicos o grupos</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <BroadcastNotification />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Render modal in a portal to ensure it's on top
  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null
}

interface BroadcastButtonProps {
  className?: string
}

export function BroadcastButton({ className }: BroadcastButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Debug function to force close
  const forceClose = () => {
    setIsModalOpen(false)
    console.log('Modal forced to close')
  }

  // Emergency close on window click (temporary)
  useEffect(() => {
    const handleWindowClick = (e: Event) => {
      if (e.target && (e.target as HTMLElement).tagName === 'BODY') {
        forceClose()
      }
    }

    if (isModalOpen) {
      window.addEventListener('click', handleWindowClick)
    }

    return () => {
      window.removeEventListener('click', handleWindowClick)
    }
  }, [isModalOpen])

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className={`bg-gradient-to-r from-black to-poker-red hover:from-black/90 hover:to-poker-red/90 text-white shadow-[0_14px_30px_rgba(229,9,20,0.35)] hover:shadow-[0_18px_40px_rgba(229,9,20,0.45)] hover:-translate-y-0.5 transition-all duration-200 rounded-full font-semibold ${className}`}
      >
        <Radio className="w-4 h-4 mr-2" />
        Broadcast
      </Button>

      <BroadcastModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}