'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buildAuthHeaders } from '@/lib/client-auth'
import {
  Send,
  Users,
  User,
  MessageSquare,
  Sparkles,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Bell
} from 'lucide-react'

interface Player {
  id: string
  firstName: string
  lastName: string
  role: string
}

interface BroadcastTemplate {
  id: string
  title: string
  body: string
  icon: string
}

const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  {
    id: 'urgent_announcement',
    title: '🚨 Anuncio Urgente',
    body: 'IMPORTANTE: [Mensaje urgente para todos los miembros del grupo]',
    icon: '🚨'
  },
  {
    id: 'schedule_change',
    title: '⏰ Cambio de Horario',
    body: 'ATENCIÓN: Se ha modificado el horario. Nueva fecha/hora: [detalles]',
    icon: '⏰'
  },
  {
    id: 'reminder',
    title: '📋 Recordatorio',
    body: 'Recordamos que el próximo evento será [fecha/hora]. Confirmen asistencia.',
    icon: '📋'
  },
  {
    id: 'general',
    title: '📢 Información General',
    body: 'Queremos informar sobre [tema]. Para más detalles contactar a la Comisión.',
    icon: '📢'
  }
]

export function BroadcastNotification() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  // Form state
  const [notificationType, setNotificationType] = useState<'send' | 'broadcast'>('broadcast')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [targetRole, setTargetRole] = useState<'all' | 'Comision' | 'Enfermo' | 'Invitado'>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // Character limits
  const TITLE_LIMIT = 100
  const BODY_LIMIT = 500

  // Load players on component mount
  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    try {
      setLoadingPlayers(true)
      const response = await fetch('/api/players', {
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to load players')
      }

      const data = await response.json()
      setPlayers(data.players || [])
    } catch (error) {
      console.error('Error loading players:', error)
      setError('Failed to load players list')
    } finally {
      setLoadingPlayers(false)
    }
  }

  const applyTemplate = (templateId: string) => {
    const template = BROADCAST_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setTitle(template.title)
      setBody(template.body)
      setSelectedTemplate(templateId)
    }
  }

  const clearForm = () => {
    setTitle('')
    setBody('')
    setSelectedPlayer('')
    setTargetRole('all')
    setSelectedTemplate('')
    setResult(null)
    setError(null)
  }

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Título y mensaje son obligatorios')
      return
    }

    if (notificationType === 'send' && !selectedPlayer) {
      setError('Selecciona un jugador para envío individual')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const endpoint = notificationType === 'send'
        ? '/api/notifications/send'
        : '/api/notifications/broadcast'

      const requestBody = {
        title: title.trim(),
        body: body.trim(),
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        url: '/',
        tag: 'admin-broadcast',
        data: {
          manual: true,
          timestamp: Date.now()
        }
      }

      if (notificationType === 'send') {
        Object.assign(requestBody, { playerId: selectedPlayer })
      } else {
        Object.assign(requestBody, {
          targetRoles: targetRole === 'all' ? undefined : [targetRole]
        })
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle specific "no subscriptions" error more gracefully
        if (data.error?.includes('No matching subscriptions') || data.error?.includes('subscriptions found')) {
          setError('ℹ️ No hay usuarios suscritos a notificaciones. Los usuarios deben activar las notificaciones primero desde sus dispositivos.')
          return
        }
        throw new Error(data.error || 'Error al enviar notificación')
      }

      // Handle successful response with better user feedback
      if (data.sentTo === 0 && data.totalSubscriptions > 0) {
        setResult(`✅ Mensaje preparado para ${data.totalSubscriptions} usuarios\n📱 Los usuarios recibirán la notificación cuando activen las notificaciones desde sus dispositivos`)
      } else if (data.sentTo === 0) {
        setResult(`⚠️ No se enviaron notificaciones. Ninguna suscripción coincide con los criterios seleccionados.`)
      } else {
        setResult(`✅ ${data.message}\n📤 Enviado inmediatamente a: ${data.sentTo} usuarios\n👥 Total de usuarios elegibles: ${data.totalSubscriptions}`)
      }

      // Clear form after successful send
      setTimeout(() => {
        clearForm()
      }, 3000)

    } catch (error) {
      console.error('Send error:', error)
      setError(error instanceof Error ? error.message : 'Error al enviar notificación')
    } finally {
      setLoading(false)
    }
  }

  const getSelectedPlayerName = () => {
    if (!selectedPlayer) return 'Ninguno seleccionado'
    const player = players.find(p => p.id === selectedPlayer)
    return player ? `${player.firstName} ${player.lastName}` : 'Jugador no encontrado'
  }

  const getAudienceInfo = () => {
    if (notificationType === 'send') {
      return `Envío individual: ${getSelectedPlayerName()}`
    }

    const roleText = targetRole === 'all' ? 'Todos los usuarios' : `Solo ${targetRole}`
    return `Broadcast: ${roleText}`
  }

  return (
    <div className="space-y-6">
      {/* Information Notice */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/15 via-[#191a2c] to-[#10111b]">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">Información</span>
        </div>
        <p className="text-sm text-white/70 leading-relaxed">
          Las notificaciones push requieren que los usuarios las activen desde sus dispositivos.
          Si no hay suscripciones activas, las notificaciones no se enviarán.
        </p>
      </div>

      {/* Quick Templates */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
          Plantillas Rápidas
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BROADCAST_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template.id)}
              className={`group p-3 rounded-xl border text-left transition-all duration-200 ${
                selectedTemplate === template.id
                  ? 'border-poker-red/60 bg-gradient-to-r from-poker-red/20 to-poker-red/10'
                  : 'border-white/12 bg-gradient-to-r from-white/8 to-white/3 hover:border-white/20 hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{template.icon}</span>
                <span className="text-xs font-medium text-white">
                  {template.title.replace(/🚨|⏰|📋|📢/, '').trim()}
                </span>
              </div>
              <p className="text-xs text-white/60 line-clamp-2">
                {template.body.substring(0, 50)}...
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Notification Type */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
          Tipo de Envío
        </label>
        <Select value={notificationType} onValueChange={(value: 'send' | 'broadcast') => setNotificationType(value)}>
          <SelectTrigger className="bg-white/5 border-white/15 text-white hover:border-white/35 transition-all duration-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="broadcast">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Broadcast (Múltiples usuarios)
              </div>
            </SelectItem>
            <SelectItem value="send">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Envío Individual
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Target Selection */}
      {notificationType === 'send' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              Seleccionar Jugador
            </label>
            {loadingPlayers && (
              <RefreshCw className="w-3 h-3 animate-spin text-white/60" />
            )}
          </div>
          <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
            <SelectTrigger className="bg-white/5 border-white/15 text-white hover:border-white/35 transition-all duration-200">
              <SelectValue placeholder="Elige un jugador..." />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{player.firstName} {player.lastName}</span>
                    <span className="text-xs text-white/60">({player.role})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
            Audiencia
          </label>
          <Select value={targetRole} onValueChange={(value: typeof targetRole) => setTargetRole(value)}>
            <SelectTrigger className="bg-white/5 border-white/15 text-white hover:border-white/35 transition-all duration-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Usuarios</SelectItem>
              <SelectItem value="Comision">Solo Comisión</SelectItem>
              <SelectItem value="Enfermo">Solo Enfermos</SelectItem>
              <SelectItem value="Invitado">Solo Invitados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Title */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
            Título
          </label>
          <span className="text-xs text-white/60">
            {title.length}/{TITLE_LIMIT}
          </span>
        </div>
        <Input
          placeholder="Título de la notificación..."
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, TITLE_LIMIT))}
          className="bg-white/5 border-white/15 text-white placeholder:text-white/40 hover:border-white/35 focus:border-poker-red/60 transition-all duration-200"
        />
      </div>

      {/* Body */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
            Mensaje
          </label>
          <span className="text-xs text-white/60">
            {body.length}/{BODY_LIMIT}
          </span>
        </div>
        <Textarea
          placeholder="Contenido de la notificación..."
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, BODY_LIMIT))}
          rows={4}
          className="bg-white/5 border-white/15 text-white placeholder:text-white/40 hover:border-white/35 focus:border-poker-red/60 transition-all duration-200"
        />
      </div>

      {/* Preview */}
      {title && body && (
        <div className="p-4 rounded-xl border border-white/12 bg-gradient-to-r from-white/8 to-white/3">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-poker-red" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">Vista Previa</span>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-sm text-white/70 leading-relaxed">{body}</p>
            <p className="text-xs text-poker-red/80 mt-3">{getAudienceInfo()}</p>
          </div>
        </div>
      )}

      {/* Send Button */}
      <Button
        onClick={sendNotification}
        disabled={loading || !title.trim() || !body.trim() || (notificationType === 'send' && !selectedPlayer)}
        className="w-full bg-gradient-to-r from-black to-poker-red hover:from-black/90 hover:to-poker-red/90 text-white shadow-[0_14px_30px_rgba(229,9,20,0.35)] hover:shadow-[0_18px_40px_rgba(229,9,20,0.45)] hover:-translate-y-0.5 transition-all duration-200 rounded-full font-semibold"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Enviando...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            {notificationType === 'send' ? 'Enviar a Usuario' : 'Enviar Broadcast'}
          </div>
        )}
      </Button>

      {/* Clear Button */}
      <Button
        onClick={clearForm}
        variant="outline"
        className="w-full border-white/15 text-white/70 hover:bg-white/10 hover:border-white/35 hover:text-white transition-all duration-200"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Limpiar Formulario
      </Button>

      {/* Result/Error Display */}
      {result && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/15 via-[#191a2c] to-[#10111b] border border-emerald-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">Éxito</span>
          </div>
          <pre className="text-sm text-emerald-200 whitespace-pre-wrap">{result}</pre>
        </div>
      )}

      {error && (
        <div className="p-4 bg-gradient-to-r from-rose-500/15 via-[#191a2c] to-[#10111b] border border-rose-500/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-200">Error</span>
          </div>
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}
    </div>
  )
}