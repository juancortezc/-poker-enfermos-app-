'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { getDashboardFeatures } from '@/lib/permissions'
import type { DashboardFeature } from '@/lib/permissions'
import { AdminCard } from '@/components/ui/RestrictedCard'
import { BroadcastNotification } from '@/components/admin/BroadcastNotification'
import {
  Award,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  FileSpreadsheet,
  FileText,
  FileUser,
  Flame,
  HeartPulse,
  Lightbulb,
  MessageSquarePlus,
  Radio,
  Sparkles,
  Trophy,
  Users
} from 'lucide-react'

const iconMap = {
  resultados: Award,
  'sin-ganar': Flame,
  'club-1000': Sparkles,
  'enfermos-base': HeartPulse,
  calendar: CalendarDays,
  regulations: FileText,
  'game-dates': CalendarCheck,
  tournaments: Trophy,
  'calendar-builder': CalendarPlus,
  players: Users,
  import: FileSpreadsheet,
  stats: BarChart3,
  't29-proposals': Lightbulb,
  'proposals-admin': MessageSquarePlus,
  'my-proposals': FileUser,
  notifications: Bell,
  broadcast: Radio,
}

export default function AdminLimitedDashboard() {
  const { user } = useAuth()

  if (!user) return null

  const features = getDashboardFeatures(user.role)

  const renderFeature = (feature: DashboardFeature, index: number, offset = 0) => {
    const Icon = iconMap[feature.id as keyof typeof iconMap] || BarChart3
    const isInteractive = feature.accessible && !feature.restricted

    const card = (
      <AdminCard
        title={feature.title}
        icon={Icon}
        accessible={feature.accessible}
        restricted={feature.restricted}
        userRole={user.role}
        feature={feature.permission}
        index={offset + index}
      />
    )

    if (isInteractive) {
      return (
        <Link key={feature.id} href={feature.href} className="block">
          {card}
        </Link>
      )
    }

    return (
      <div key={feature.id} className="block" aria-disabled>
        {card}
      </div>
    )
  }

  const renderBroadcastCard = (index: number) => {
    const [showBroadcast, setShowBroadcast] = useState(false)

    if (showBroadcast) {
      return (
        <div key="broadcast-content" className="col-span-2 sm:col-span-3">
          <div className="rounded-2xl border border-poker-red/20 bg-gradient-to-br from-[#1a1b2b]/95 via-[#141625]/95 to-[#10111b]/95 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Broadcast Notifications</h3>
              <button
                onClick={() => setShowBroadcast(false)}
                className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                ×
              </button>
            </div>
            <BroadcastNotification />
          </div>
        </div>
      )
    }

    return (
      <button
        key="broadcast"
        onClick={() => setShowBroadcast(true)}
        className="block w-full"
      >
        <AdminCard
          title="Broadcast"
          icon={Radio}
          accessible={true}
          restricted={false}
          userRole={user.role}
          index={index}
        />
      </button>
    )
  }

  return (
    <div className="relative px-4 pt-16 pb-28">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/80" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-xl flex-col gap-8">
        {features.base.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">Accesos rápidos</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70">
                Menu
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {features.base.map((feature, index) => renderFeature(feature, index))}
            </div>
          </section>
        )}

        {(user.role === 'Comision' || features.admin.some(f => f.accessible || f.restricted)) && (
          <section className="rounded-3xl border border-poker-red/20 bg-poker-red/5 p-4 shadow-[0_16px_50px_rgba(229,9,20,0.18)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-white/70">Comisión</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-poker-red/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                <span className="h-2 w-2 rounded-full bg-poker-red animate-pulse" />
                Exclusivo
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              {features.admin.map((feature, index) => renderFeature(feature, index, features.base.length))}
              {user.role === 'Comision' && renderBroadcastCard(features.admin.length + features.base.length)}
            </div>
          </section>
        )}


        {user.role !== 'Comision' && (
          <div className="rounded-3xl border border-white/10 bg-white/10 p-4 text-center text-sm text-white/70">
            {user.role === 'Enfermo'
              ? 'Como Enfermo tienes acceso directo a resultados, calendario y estadísticas públicas.'
              : 'Como Invitado puedes consultar la información general del torneo desde este menú.'
            }
          </div>
        )}
      </div>
    </div>
  )
}
