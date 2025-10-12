'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { buildAuthHeaders } from '@/lib/client-auth'
import { notificationService } from '@/lib/notifications'
import {
  Bell,
  Send,
  Users,
  User,
  X,
  AlertCircle,
  Clock,
  MessageSquare,
  Target,
  Sparkles
} from 'lucide-react'

interface QuickNotificationModalProps {
  isOpen: boolean
  onClose: () => void
}

interface NotificationTemplate {
  id: string
  title: string
  body: string
  icon: string
}

const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'urgent_meeting',
    title: '🚨 Reunión Urgente',
    body: 'Se ha programado una reunión urgente para [ubicación/hora]. Es importante la asistencia de todos.',
    icon: '🚨'
  },
  {
    id: 'schedule_change',
    title: '⏰ Cambio de Horario',
    body: 'IMPORTANTE: Se ha modificado el horario del evento. Nueva hora: [nueva_hora].',
    icon: '⏰'
  },
  {
    id: 'reminder',
    title: '📋 Recordatorio Importante',
    body: 'Recordamos que [evento/actividad] está programado para [fecha/hora]. No olviden confirmar asistencia.',
    icon: '📋'
  },
  {
    id: 'announcement',
    title: '📢 Anuncio General',
    body: 'Queremos informar a todos sobre [información importante]. Para más detalles contactar a la Comisión.',
    icon: '📢'
  }
]

export function QuickNotificationModal({ isOpen, onClose }: QuickNotificationModalProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'unknown' | 'subscribed' | 'not-subscribed'>('unknown')

  // Form state
  const [notificationType, setNotificationType] = useState<'send' | 'broadcast'>('broadcast')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [targetRole, setTargetRole] = useState<'all' | 'Comision' | 'Enfermo' | 'Invitado'>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')

  // Character limits
  const TITLE_LIMIT = 100
  const BODY_LIMIT = 500

  // Check subscription status on mount
  useEffect(() => {
    if (isOpen) {
      checkSubscriptionStatus()
      clearForm()
    }
  }, [isOpen])

  const checkSubscriptionStatus = async () => {
    try {
      const subscription = await notificationService.getPushSubscription()
      setSubscriptionStatus(subscription ? 'subscribed' : 'not-subscribed')
    } catch (error) {
      console.error('Error checking subscription:', error)
      setSubscriptionStatus('not-subscribed')
    }
  }

  const clearForm = () => {
    setTitle('')
    setBody('')
    setPlayerId('')
    setTargetRole('all')
    setSelectedTemplate('')
    setResult(null)
    setError(null)
  }

  const applyTemplate = (templateId: string) => {
    const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setTitle(template.title)
      setBody(template.body)
      setSelectedTemplate(templateId)
    }
  }

  const subscribeToPush = async () => {
    try {
      setLoading(true)
      setError(null)

      const hasPermission = await notificationService.requestPermission()
      if (!hasPermission) {
        throw new Error('Permission denied for notifications')
      }

      await notificationService.subscribeToPush()
      setSubscriptionStatus('subscribed')
      setResult('Successfully subscribed to push notifications')
    } catch (error) {
      console.error('Subscription error:', error)
      setError(error instanceof Error ? error.message : 'Failed to subscribe')
    } finally {
      setLoading(false)
    }
  }

  const sendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and message are required')
      return
    }

    if (notificationType === 'send' && !playerId.trim()) {
      setError('Player ID is required for individual notifications')
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
        tag: 'quick-notification',
        data: {
          manual: true,
          timestamp: Date.now()
        }
      }

      if (notificationType === 'send') {
        Object.assign(requestBody, { playerId: playerId.trim() })
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
        throw new Error(data.error || 'Failed to send notification')
      }

      setResult(`✅ ${data.message}\n📤 Sent to: ${data.sentTo}/${data.totalSubscriptions} subscriptions`)

      // Clear form after successful send
      setTimeout(() => {
        clearForm()
        onClose()
      }, 2000)

    } catch (error) {
      console.error('Send error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send notification')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getAudienceInfo = () => {
    if (notificationType === 'send') {
      return `Sending to specific user: ${playerId || 'Not selected'}`
    }

    const roleText = targetRole === 'all' ? 'All users' : `${targetRole} only`
    return `Broadcasting to: ${roleText}`
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="relative border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1b2b]/95 via-[#141625]/95 to-[#10111b]/95 backdrop-blur-md" />

          <div className="relative">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-r from-poker-red/20 to-poker-red/10">
                  <Bell className="w-5 h-5 text-poker-red" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Send Quick Notification</h2>
                  <p className="text-sm text-white/60">Send instant messages to users</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Subscription Status */}
              {subscriptionStatus !== 'subscribed' && (
                <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/10">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-200">
                        You&apos;re not subscribed to notifications
                      </p>
                      <p className="text-xs text-amber-300/80">
                        Subscribe to receive notifications yourself
                      </p>
                    </div>
                    <Button
                      onClick={subscribeToPush}
                      disabled={loading}
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Subscribe
                    </Button>
                  </div>
                </div>
              )}

              {/* Templates */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Quick Templates</label>
                <div className="grid grid-cols-2 gap-2">
                  {NOTIFICATION_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedTemplate === template.id
                          ? 'border-poker-red/40 bg-poker-red/10'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{template.icon}</span>
                        <span className="text-xs font-medium text-white">
                          {template.title.replace(/🚨|⏰|📋|📢/, '').trim()}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 line-clamp-2">
                        {template.body.substring(0, 60)}...
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification Type */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-white">Notification Type</label>
                <Select value={notificationType} onValueChange={(value: 'send' | 'broadcast') => setNotificationType(value)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broadcast">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Broadcast (Multiple Users)
                      </div>
                    </SelectItem>
                    <SelectItem value="send">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Send to Specific User
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Selection */}
              {notificationType === 'send' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Player ID</label>
                  <Input
                    placeholder="Enter player ID..."
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Target Audience</label>
                  <Select value={targetRole} onValueChange={(value: typeof targetRole) => setTargetRole(value)}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="Comision">Comisión Only</SelectItem>
                      <SelectItem value="Enfermo">Enfermos Only</SelectItem>
                      <SelectItem value="Invitado">Invitados Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Title</label>
                  <span className="text-xs text-white/60">
                    {title.length}/{TITLE_LIMIT}
                  </span>
                </div>
                <Input
                  placeholder="Notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_LIMIT))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Message</label>
                  <span className="text-xs text-white/60">
                    {body.length}/{BODY_LIMIT}
                  </span>
                </div>
                <Textarea
                  placeholder="Notification message..."
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, BODY_LIMIT))}
                  rows={4}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              {/* Preview */}
              {title && body && (
                <div className="p-4 rounded-lg border border-white/10 bg-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-poker-red" />
                    <span className="text-xs font-medium text-white">Preview</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">{title}</p>
                    <p className="text-xs text-white/70">{body}</p>
                    <p className="text-xs text-poker-red mt-2">{getAudienceInfo()}</p>
                  </div>
                </div>
              )}

              {/* Send Button */}
              <Button
                onClick={sendNotification}
                disabled={loading || !title.trim() || !body.trim() || (notificationType === 'send' && !playerId.trim())}
                className="w-full bg-gradient-to-r from-poker-red to-poker-red/90 hover:from-poker-red/90 hover:to-poker-red text-white"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Send {notificationType === 'send' ? 'to User' : 'Broadcast'}
                  </div>
                )}
              </Button>

              {/* Result/Error Display */}
              {result && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <pre className="text-sm text-green-400 whitespace-pre-wrap">{result}</pre>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}