'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import { canCRUD } from '@/lib/auth'
import { NoirButton } from '@/components/noir/NoirButton'
import { cn } from '@/lib/utils'

const baseNavItems = [
  { href: '/', label: 'Inicio', icon: '/icons/nav-home.png', roles: ['all'] as const },
  { href: '/ranking', label: 'Ranking', icon: '/icons/nav-ranking.png', roles: ['all'] as const },
  { href: '/admin', label: 'Menú', icon: '/icons/nav-settings.png', roles: ['all'] as const },
]

const registroNavItem = {
  href: '/registro',
  label: 'Registro',
  icon: '/icons/nav-profile.png',
  roles: ['Comision'] as const,
}

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [hasActiveGameDate, setHasActiveGameDate] = useState(false)

  useEffect(() => {
    let isMounted = true

    const checkActiveGameDate = async () => {
      try {
        const response = await fetch('/api/game-dates/active')
        if (!isMounted) return

        if (response.ok) {
          const data = await response.json()
          setHasActiveGameDate(Boolean(data))
        }
      } catch (error) {
        console.error('Error checking active game date:', error)
      }
    }

    checkActiveGameDate()
    const interval = window.setInterval(checkActiveGameDate, 30000)

    return () => {
      isMounted = false
      window.clearInterval(interval)
    }
  }, [])

  if (!user) {
    return null
  }

  const navItems = [...baseNavItems]

  if (hasActiveGameDate && canCRUD(user.role)) {
    navItems.splice(2, 0, registroNavItem)
  }

  const filteredItems = navItems.filter(
    (item) => item.roles.includes('all') || (canCRUD(user.role) && item.roles.includes('Comision'))
  )

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push('/admin')
    }
  }

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-[100] px-2.5 pb-2.5 pt-1">
      <div className="mx-auto max-w-sm">
        <div className="flex items-center gap-1.5 rounded-[22px] border border-[#e0b66c]/25 bg-[rgba(19,12,9,0.92)] px-2 py-1.5 shadow-[0_-12px_28px_rgba(11,6,3,0.55)] backdrop-blur-xl">
          <NoirButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex h-9 min-w-[60px] items-center justify-center rounded-xl px-2.5 text-[8px] uppercase tracking-[0.2em]"
          >
            Volver
          </NoirButton>

          <div className="flex flex-1 items-center justify-between gap-1">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex h-12 w-14 flex-col items-center justify-center rounded-2xl border border-transparent px-1.5 py-1 text-[8px] uppercase tracking-[0.18em] transition-all duration-200',
                    isActive
                      ? 'border-[#e0b66c]/45 bg-[linear-gradient(135deg,rgba(224,182,108,0.3),rgba(169,68,28,0.25))] text-[#1f1410]'
                      : 'text-[#d7c59a]/75 hover:border-[#e0b66c]/35 hover:text-[#f3e6c5]'
                  )}
                >
                  <span
                    className={cn(
                      'mb-1 flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-[rgba(42,26,20,0.78)] shadow-[0_4px_12px_rgba(11,6,3,0.4)] transition-all duration-200',
                      isActive
                        ? 'border-[#2b1209] bg-[linear-gradient(135deg,rgba(224,182,108,0.4),rgba(169,68,28,0.35))]'
                        : 'group-hover:border-[#e0b66c]/35 group-hover:bg-[rgba(42,26,20,0.9)]'
                    )}
                  >
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={20}
                      height={20}
                      className={cn(
                        'transition-all duration-200',
                        isActive ? 'opacity-100 drop-shadow-[0_0_8px_rgba(224,182,108,0.45)]' : 'opacity-85 group-hover:opacity-100'
                      )}
                    />
                  </span>
                  <span className="font-semibold">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
