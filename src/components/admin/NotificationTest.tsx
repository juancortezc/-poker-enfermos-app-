'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { buildAuthHeaders } from '@/lib/client-auth'
import { notificationService } from '@/lib/notifications'
import { Bell, Send, Users, User } from 'lucide-react'

export function NotificationTest() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<'unknown' | 'subscribed' | 'not-subscribed'>('unknown')

  // Form state
  const [notificationType, setNotificationType] = useState<'send' | 'broadcast'>('broadcast')
  const [title, setTitle] = useState('🧪 Prueba de Notificación')
  const [body, setBody] = useState('Esta es una notificación de prueba desde el panel de administración')
  const [playerId, setPlayerId] = useState('')
  const [targetRole, setTargetRole] = useState<'all' | 'Comision' | 'Enfermo' | 'Invitado'>('all')

  const checkSubscriptionStatus = async () => {
    try {
      const subscription = await notificationService.getPushSubscription()
      setSubscriptionStatus(subscription ? 'subscribed' : 'not-subscribed')
    } catch (error) {
      console.error('Error checking subscription:', error)
      setSubscriptionStatus('not-subscribed')
    }
  }

  const subscribeToPush = async () => {
    try {
      setLoading(true)
      setError(null)

      const hasPermission = await notificationService.requestPermission()
      if (!hasPermission) {
        throw new Error('Notification permission denied')
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

  const sendTestNotification = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required')
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
        url: '/admin',
        tag: 'admin-test',
        data: {
          test: true,
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
    } catch (error) {
      console.error('Send error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send notification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notification Status
          </CardTitle>
          <CardDescription>
            Check and manage your push notification subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant={subscriptionStatus === 'subscribed' ? 'default' : 'secondary'}>
              {subscriptionStatus === 'unknown' ? 'Unknown' :
               subscriptionStatus === 'subscribed' ? 'Subscribed' : 'Not Subscribed'}
            </Badge>
            <Button
              onClick={checkSubscriptionStatus}
              variant="outline"
              size="sm"
            >
              Check Status
            </Button>
            {subscriptionStatus !== 'subscribed' && (
              <Button
                onClick={subscribeToPush}
                disabled={loading}
                size="sm"
              >
                Subscribe
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Notification Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Test Notification
          </CardTitle>
          <CardDescription>
            Test push notifications to specific users or broadcast to all users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Notification Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notification Type</label>
            <Select value={notificationType} onValueChange={(value) => setNotificationType(value as 'send' | 'broadcast')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="broadcast">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Broadcast (All Users)
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

          {/* Player ID (only for individual notifications) */}
          {notificationType === 'send' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Player ID</label>
              <Input
                placeholder="Enter player ID..."
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
              />
            </div>
          )}

          {/* Target Role (only for broadcast) */}
          {notificationType === 'broadcast' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Role</label>
              <Select value={targetRole} onValueChange={(value) => setTargetRole(value as typeof targetRole)}>
                <SelectTrigger>
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
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Notification title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Notification message..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
            />
          </div>

          {/* Send Button */}
          <Button
            onClick={sendTestNotification}
            disabled={loading || !title.trim() || !body.trim()}
            className="w-full"
          >
            {loading ? 'Sending...' : `Send ${notificationType === 'send' ? 'to User' : 'Broadcast'}`}
          </Button>

          {/* Result/Error Display */}
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <pre className="text-sm text-green-800 whitespace-pre-wrap">{result}</pre>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}