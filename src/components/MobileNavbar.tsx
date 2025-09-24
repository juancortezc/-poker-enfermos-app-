'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import { useState, useEffect } from 'react'
import {
  HomeIcon,
  TimerIcon,
  TrophyIcon,
  UsersIcon,
  SettingsIcon,
  ClipboardListIcon,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Inicio', icon: HomeIcon, roles: ['all'] },
  { href: '/timer', label: 'Timer', icon: TimerIcon, roles: ['Comision'] },
  { href: '/ranking', label: 'Tabla', icon: TrophyIcon, roles: ['all'] },
  { href: '/admin', label: 'Admin', icon: SettingsIcon, roles: ['all'] },
]

export default function MobileNavbar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [hasActiveGameDate, setHasActiveGameDate] = useState(false)

  // Check for active game date
  useEffect(() => {
    const checkActiveGameDate = async () => {
      try {
        const response = await fetch('/api/game-dates/active')
        
        if (response.ok) {
          const data = await response.json()
          setHasActiveGameDate(!!data)
        }
      } catch (error) {
        console.error('Error checking active game date:', error)
      }
    }

    checkActiveGameDate()
    // Check every 30 seconds for updates
    const interval = setInterval(checkActiveGameDate, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (!user) return null

  // Create dynamic nav items based on active game date
  const dynamicNavItems = [...navItems]
  
  // Add Registro button if there's an active game date and user is Comision
  if (hasActiveGameDate && canCRUD(user.role)) {
    // Insert Registro after Timer (index 2)
    dynamicNavItems.splice(2, 0, {
      href: '/registro',
      label: 'Registro',
      icon: ClipboardListIcon,
      roles: ['Comision']
    })
  }

  const filteredItems = dynamicNavItems.filter(item => 
    item.roles.includes('all') || 
    (canCRUD(user.role) && item.roles.includes('Comision'))
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-poker-card border-t border-white/10 px-2 py-2 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {filteredItems.map((item, index) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center p-2 rounded-xl min-w-[60px] 
                transition-all duration-200 transform active:scale-95
                ${isActive 
                  ? 'text-white bg-poker-red shadow-lg shadow-poker-red/30' 
                  : 'text-poker-muted hover:text-poker-text hover:bg-white/5'
                }
                animate-stagger animate-stagger-${index + 1}
              `}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-poker-red rounded-full animate-pulse" />
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}