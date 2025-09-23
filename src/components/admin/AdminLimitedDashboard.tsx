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
  Users,
  FileSpreadsheet,
  Timer,
  Award
} from 'lucide-react'

const iconMap = {
  calendar: CalendarDays,
  regulations: FileText,
  resultados: Award,
  stats: BarChart3,
  'game-dates': Calendar,
  tournaments: Trophy,
  players: Users,
  import: FileSpreadsheet,
  timer: Timer,
}

export default function AdminLimitedDashboard() {
  const { user } = useAuth()
  
  if (!user) return null

  const features = getDashboardFeatures(user.role)

  return (
    <div className="px-4 pt-20 pb-20">
      <div className="max-w-md mx-auto">

        {/* Funciones disponibles */}
        {features.base.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-4">
              {features.base.map((feature, index) => {
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
        )}

        {/* Funciones administrativas (solo Comisión o con restricciones) */}
        {(user.role === 'Comision' || features.admin.some(f => f.accessible || f.restricted)) && (
          <div>
            <div className="grid grid-cols-2 gap-4">
              {features.admin.map((feature, index) => {
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
                    index={features.base.length + index}
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
        )}

        {/* Información adicional para usuarios limitados */}
        {user.role !== 'Comision' && (
          <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
            <p className="text-gray-400 text-sm text-center">
              {user.role === 'Enfermo' 
                ? 'Como Enfermo, tienes acceso a estadísticas y documentos del torneo.'
                : 'Como Invitado, puedes consultar información pública del torneo.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}