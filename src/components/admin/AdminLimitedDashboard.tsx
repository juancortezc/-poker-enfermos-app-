'use client'

import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import { getDashboardFeatures } from '@/lib/permissions'
import { AdminCard } from '@/components/ui/RestrictedCard'
import { 
  Calendar, 
  FileText, 
  BarChart3,
  CalendarDays,
  Trophy,
  Users
} from 'lucide-react'

const iconMap = {
  calendar: CalendarDays,
  regulations: FileText,
  stats: BarChart3,
  'game-dates': Calendar,
  tournaments: Trophy,
  players: Users,
}

export default function AdminLimitedDashboard() {
  const { user } = useAuth()
  
  if (!user) return null

  const features = getDashboardFeatures(user.role)

  return (
    <div className="px-4 pt-32 pb-20">
      <div className="max-w-md mx-auto">
        <div className="grid grid-cols-2 gap-4">
          {features.all.map((feature, index) => {
            const Icon = iconMap[feature.id as keyof typeof iconMap] || BarChart3
            
            const cardElement = (
              <AdminCard
                key={feature.id}
                title={feature.title}
                icon={Icon}
                accessible={feature.accessible}
                restricted={feature.restricted}
                userRole={user.role}
                feature={feature.id}
                index={index}
              />
            )

            return feature.accessible && !feature.restricted ? (
              <Link key={feature.id} href={feature.href}>
                {cardElement}
              </Link>
            ) : (
              cardElement
            )
          })}
        </div>
      </div>
    </div>
  )
}