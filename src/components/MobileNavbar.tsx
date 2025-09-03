'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import {
  HomeIcon,
  TimerIcon,
  TrophyIcon,
  UsersIcon,
  SettingsIcon,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Inicio', icon: HomeIcon, roles: ['all'] },
  { href: '/timer', label: 'Timer', icon: TimerIcon, roles: ['all'] },
  { href: '/rankings', label: 'Rankings', icon: TrophyIcon, roles: ['all'] },
  { href: '/players', label: 'Jugadores', icon: UsersIcon, roles: ['Comision'] },
  { href: '/admin', label: 'Admin', icon: SettingsIcon, roles: ['Comision'] },
]

export default function MobileNavbar() {
  const pathname = usePathname()
  const { user } = useAuth()

  if (!user) return null

  const filteredItems = navItems.filter(item => 
    item.roles.includes('all') || 
    (canCRUD(user.role) && item.roles.includes('Comision'))
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                isActive 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-gray-600 hover:text-green-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}