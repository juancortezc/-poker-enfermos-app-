'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import { useState, useEffect } from 'react'
import {
  HomeIcon,
  TrophyIcon,
  UsersIcon,
  SettingsIcon,
  ClipboardListIcon,
  ArrowLeft,
  Lightbulb,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Inicio', icon: HomeIcon, roles: ['all'] },
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
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-gradient-to-br from-[#1a1b2b]/92 via-[#141625]/92 to-[#10111b]/92 px-3 py-2 shadow-[0_-18px_40px_rgba(8,9,15,0.6)] backdrop-blur-xl">
      <div className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex min-w-[72px] flex-col items-center rounded-2xl border border-white/12 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 active:scale-95"
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
                  flex flex-col items-center rounded-2xl px-3 py-2 text-[11px] min-w-[64px]
                  transition-all duration-200 transform active:scale-95
                  ${isActive 
                    ? 'text-white bg-gradient-to-r from-poker-red/85 to-poker-red shadow-lg shadow-poker-red/30 border border-poker-red/40' 
                    : 'text-white/55 border border-transparent hover:text-white hover:border-white/15 hover:bg-white/10'
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
                <span className={`mt-1 font-semibold uppercase tracking-[0.18em] ${isActive ? 'text-white' : 'text-white/60'}`}>
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
