'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buildAuthHeaders } from '@/lib/client-auth'
import {
  Bell,
  Settings,
  Trophy,
  Users,
  Clock,
  MessageSquare,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
  History,
  RefreshCw
} from 'lucide-react'
import type { NotificationEventSettings } from '@/lib/notification-config'

interface NotificationEvent {
  eventType: string
  defaultSettings: NotificationEventSettings
  description: string
  category: 'tournament' | 'game' | 'timer' | 'proposals' | 'dates'
}

interface NotificationHistoryItem {
  id: string
  eventType: string | null
  notificationType: string
  title: string
  body: string
  sentTo: number
  totalSubscriptions: number
  success: boolean
  errorMessage: string | null
  sentBy: { firstName: string; lastName: string } | null
  createdAt: string
}

const CATEGORY_ICONS = {
  tournament: Trophy,
  game: Users,
  timer: Clock,
  proposals: MessageSquare,
  dates: Calendar
}

const CATEGORY_COLORS = {
  tournament: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-200',
  game: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
  timer: 'border-purple-500/20 bg-purple-500/10 text-purple-200',
  proposals: 'border-green-500/20 bg-green-500/10 text-green-200',
  dates: 'border-orange-500/20 bg-orange-500/10 text-orange-200'
}

export function NotificationConfig() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [events, setEvents] = useState<NotificationEvent[]>([])
  const [settings, setSettings] = useState<Record<string, NotificationEventSettings>>({})
  const [history, setHistory] = useState<NotificationHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
    loadHistory()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications/config', {
        headers: buildAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to load notification config')
      }

      const data = await response.json()
      setEvents(data.events || [])
      setSettings(data.settings || {})

    } catch (error) {
      console.error('Error loading config:', error)
      setError(error instanceof Error ? error.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      setHistoryLoading(true)

      const response = await fetch('/api/notifications/history?limit=10', {
        headers: buildAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }

    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({ settings })
      })

      if (!response.ok) {
        throw new Error('Failed to save notification config')
      }

      setResult('✅ Configuration saved successfully')
      setTimeout(() => setResult(null), 3000)

    } catch (error) {
      console.error('Error saving config:', error)
      setError(error instanceof Error ? error.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  const updateEventSetting = (eventType: string, key: keyof NotificationEventSettings, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [key]: value
      }
    }))
  }

  const updateCustomMessage = (eventType: string, field: 'title' | 'body', value: string) => {
    setSettings(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        customMessage: {
          ...prev[eventType]?.customMessage,
          [field]: value
        }
      }
    }))
  }

  const testNotification = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildAuthHeaders()
        },
        body: JSON.stringify({
          title: '🧪 Test Notification',
          body: 'This is a test notification from the admin panel'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send test notification')
      }

      const data = await response.json()
      setResult(`✅ Test notification sent to ${data.sentTo}/${data.totalSubscriptions} subscriptions`)

      // Reload history to show the test
      setTimeout(() => loadHistory(), 1000)

    } catch (error) {
      console.error('Error sending test:', error)
      setError(error instanceof Error ? error.message : 'Failed to send test')
    } finally {
      setLoading(false)
    }
  }

  const groupedEvents = events.reduce((acc, event) => {
    if (!acc[event.category]) {
      acc[event.category] = []
    }
    acc[event.category].push(event)
    return acc
  }, {} as Record<string, NotificationEvent[]>)

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-white/60">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Loading notification configuration...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-blue-500/10 border border-blue-500/20">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Notification Configuration</h2>
            <p className="text-sm text-white/70 leading-relaxed">Configure automatic notifications for system events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={testNotification}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-white/15 text-white/70 hover:bg-white/10 hover:border-white/35 hover:text-white transition-all duration-200"
          >
            <Bell className="w-4 h-4 mr-2" />
            Test
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
            size="sm"
            className="bg-gradient-to-r from-black to-poker-red hover:from-black/90 hover:to-poker-red/90 text-white shadow-[0_14px_30px_rgba(229,9,20,0.35)] hover:shadow-[0_18px_40px_rgba(229,9,20,0.45)] hover:-translate-y-0.5 transition-all duration-200 rounded-full"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Config
          </Button>
        </div>
      </div>

      {/* Results/Errors */}
      {result && (
        <div className="p-4 bg-gradient-to-r from-emerald-500/15 via-[#191a2c] to-[#10111b] border border-emerald-500/20 rounded-xl">
          <p className="text-sm text-emerald-200">{result}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-gradient-to-r from-rose-500/15 via-[#191a2c] to-[#10111b] border border-rose-500/20 rounded-xl">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
          <TabsTrigger value="events" className="text-white/70 data-[state=active]:text-white">Event Configuration</TabsTrigger>
          <TabsTrigger value="history" className="text-white/70 data-[state=active]:text-white">Notification History</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          {Object.entries(groupedEvents).map(([category, categoryEvents]) => {
            const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]
            const colorClass = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]

            return (
              <Card key={category} className="border-white/12 bg-gradient-to-b from-white/8 to-white/3 shadow-[0_18px_40px_rgba(11,12,32,0.35)] hover:-translate-y-1 hover:border-white/20 transition-all duration-200">
                <CardHeader className="bg-gradient-to-r from-white/8 to-transparent border-b border-white/10">
                  <CardTitle className="flex items-center gap-2 capitalize text-xl font-semibold tracking-tight">
                    <Icon className="w-5 h-5" />
                    {category} Events
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Configure notifications for {category}-related events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  {categoryEvents.map((event) => {
                    const eventSettings = settings[event.eventType] || event.defaultSettings

                    return (
                      <div key={event.eventType} className={`p-4 rounded-lg border ${colorClass}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-white mb-1">
                              {event.description}
                            </h4>
                            <p className="text-xs text-white/60">
                              Event: {event.eventType}
                            </p>
                          </div>
                          <Switch
                            checked={eventSettings.isEnabled}
                            onCheckedChange={(checked) =>
                              updateEventSetting(event.eventType, 'isEnabled', checked)
                            }
                          />
                        </div>

                        {eventSettings.isEnabled && (
                          <div className="space-y-3 pt-3 border-t border-white/10">
                            {/* Target Roles */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs font-medium text-white/80 mb-2 block">
                                  Target Roles
                                </label>
                                <div className="flex flex-wrap gap-1">
                                  {['Comision', 'Enfermo', 'Invitado'].map((role) => (
                                    <Badge
                                      key={role}
                                      variant={eventSettings.targetRoles?.includes(role as never) ? 'default' : 'outline'}
                                      className="cursor-pointer text-xs"
                                      onClick={() => {
                                        const currentRoles = eventSettings.targetRoles || []
                                        const newRoles = currentRoles.includes(role as never)
                                          ? currentRoles.filter(r => r !== role)
                                          : [...currentRoles, role]
                                        updateEventSetting(event.eventType, 'targetRoles', newRoles)
                                      }}
                                    >
                                      {role}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-medium text-white/80 mb-2 block">
                                  Timing
                                </label>
                                <Select
                                  value={eventSettings.timing}
                                  onValueChange={(value) =>
                                    updateEventSetting(event.eventType, 'timing', value)
                                  }
                                >
                                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="immediate">Immediate</SelectItem>
                                    <SelectItem value="delayed">Delayed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Custom Message */}
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-white/80">
                                Custom Message (optional)
                              </label>
                              <div className="grid grid-cols-1 gap-2">
                                <Input
                                  placeholder="Custom title..."
                                  value={eventSettings.customMessage?.title || ''}
                                  onChange={(e) =>
                                    updateCustomMessage(event.eventType, 'title', e.target.value)
                                  }
                                  className="bg-white/5 border-white/10 text-white text-xs h-8"
                                />
                                <Textarea
                                  placeholder="Custom message..."
                                  value={eventSettings.customMessage?.body || ''}
                                  onChange={(e) =>
                                    updateCustomMessage(event.eventType, 'body', e.target.value)
                                  }
                                  rows={2}
                                  className="bg-white/5 border-white/10 text-white text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-white/12 bg-gradient-to-b from-white/8 to-white/3 shadow-[0_18px_40px_rgba(11,12,32,0.35)]">
            <CardHeader className="bg-gradient-to-r from-white/8 to-transparent border-b border-white/10">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                  <History className="w-5 h-5" />
                  Recent Notifications
                </CardTitle>
                <Button
                  onClick={loadHistory}
                  disabled={historyLoading}
                  variant="outline"
                  size="sm"
                  className="border-white/15 text-white/70 hover:bg-white/10 hover:border-white/35 hover:text-white transition-all duration-200"
                >
                  <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-white/70">
                History of sent notifications (last 10)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-white/60 py-4">
                  No notifications sent yet
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="p-4 rounded-xl border border-white/12 bg-gradient-to-r from-white/8 to-white/3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-white text-sm">
                              {item.title}
                            </h4>
                            <Badge variant={item.success ? 'default' : 'destructive'} className="text-xs">
                              {item.success ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <AlertCircle className="w-3 h-3 mr-1" />
                              )}
                              {item.success ? 'Sent' : 'Failed'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.notificationType}
                            </Badge>
                          </div>
                          <p className="text-xs text-white/70 mb-2">
                            {item.body}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-white/50">
                            <span>Sent to: {item.sentTo}/{item.totalSubscriptions}</span>
                            {item.eventType && <span>Event: {item.eventType}</span>}
                            {item.sentBy && (
                              <span>By: {item.sentBy.firstName} {item.sentBy.lastName}</span>
                            )}
                            <span>{new Date(item.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      {item.errorMessage && (
                        <p className="text-xs text-red-400 mt-2">
                          Error: {item.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}