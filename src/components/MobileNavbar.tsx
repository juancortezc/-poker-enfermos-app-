'use client'

import { usePathname, useRouter } from 'next/navigation'
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
  ArrowLeft,
  Lightbulb,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Inicio', icon: HomeIcon, roles: ['all'] },
  { href: '/timer', label: 'Timer', icon: TimerIcon, roles: ['Comision'] },
  { href: '/ranking', label: 'Tabla', icon: TrophyIcon, roles: ['all'] },
  { href: '/t29', label: 'T29', icon: Lightbulb, roles: ['all'] },
  { href: '/admin', label: 'Menu', icon: SettingsIcon, roles: ['all'] },
]

export default function MobileNavbar() {
  const pathname = usePathname()
  const router = useRouter()
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

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        router.back()
        return
      }
    }
    router.push('/admin')
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-poker-card px-3 py-2 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:bg-black/85 before:content-[''] before:backdrop-blur-sm safe-bottom">
      <div className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex min-w-[72px] flex-col items-center rounded-xl bg-white/5 px-3 py-2 text-xs font-medium text-white transition-all duration-200 hover:bg-white/10 active:scale-95"
        >
          <ArrowLeft size={20} />
          <span className="mt-1">Volver</span>
        </button>

        <div className="flex flex-1 justify-end gap-1">
          {filteredItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex flex-col items-center rounded-xl px-3 py-2 text-xs min-w-[60px]
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
                    <div className="absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full bg-poker-red" />
                  )}
                </div>
                <span className={`mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
