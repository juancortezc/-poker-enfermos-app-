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
  { href: '/t29', label: 'T29', icon: '/icons/nav-t29.png', roles: ['all'] as const },
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
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-center gap-3 rounded-[32px] border border-[#e0b66c]/25 bg-[rgba(19,12,9,0.92)] px-3 py-3 shadow-[0_-24px_60px_rgba(11,6,3,0.75)] backdrop-blur-xl">
          <NoirButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="min-w-[96px] px-4 py-2 text-[10px] tracking-[0.22em]"
          >
            Volver
          </NoirButton>

          <div className="flex flex-1 items-center justify-evenly gap-1">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group relative flex min-w-[80px] flex-col items-center gap-1 rounded-3xl px-3 py-2 text-[10px]
                    transition-all duration-200 ${isActive ? '-translate-y-1' : ''}
                  `}
                >
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full border border-transparent bg-[rgba(42,26,20,0.75)] shadow-[0_8px_22px_rgba(11,6,3,0.55)] transition-all duration-200',
                      isActive
                        ? 'border-[#e0b66c]/65 bg-[linear-gradient(135deg,rgba(224,182,108,0.35),rgba(169,68,28,0.35))]'
                        : 'group-hover:border-[#e0b66c]/35 group-hover:bg-[rgba(42,26,20,0.9)]'
                    )}
                  >
                    <Image
                      src={item.icon}
                      alt={item.label}
                      width={28}
                      height={28}
                      className={cn(
                        'transition-opacity duration-200',
                        isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'font-semibold uppercase tracking-[0.22em] transition-colors duration-200',
                      isActive ? 'text-[#e0b66c]' : 'text-[#d7c59a]/70 group-hover:text-[#f3e6c5]'
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
