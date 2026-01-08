'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, ChevronLeft, Table2, TrendingUp, Info } from 'lucide-react'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Inicio',
    href: '/home',
    icon: <Home className="w-5 h-5" />,
  },
  {
    id: 'tabla',
    label: 'Tabla',
    href: '/tabla',
    icon: <Table2 className="w-5 h-5" />,
  },
  {
    id: 'stats',
    label: 'Stats',
    href: '/stats',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: 'info',
    label: 'Info',
    href: '/info',
    icon: <Info className="w-5 h-5" />,
  },
]

export function CPBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    return pathname?.startsWith(href) ?? false
  }

  // Show back button when not on home page
  const isHomePage = pathname === '/home' || pathname === '/' || pathname === null

  const handleBack = () => {
    router.back()
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}
    >
      {/* Container that matches CPAppShell max-width */}
      <div
        className="w-full max-w-md"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.95) 100%)',
        }}
      >
      <div className="flex items-center justify-around py-2 px-4">
        {/* Back button - only show when not on home */}
        {!isHomePage && (
          <button
            onClick={handleBack}
            className="flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all cursor-pointer"
            style={{
              background: 'transparent',
              color: 'var(--cp-on-surface-variant)',
            }}
          >
            <ChevronLeft className="w-5 h-5" />
            <span
              className="font-medium"
              style={{ fontSize: 'var(--cp-caption-size)' }}
            >
              Atrás
            </span>
          </button>
        )}

        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all"
              style={{
                background: active ? 'var(--cp-surface)' : 'transparent',
                color: active ? 'var(--cp-on-surface)' : 'var(--cp-on-surface-variant)',
              }}
            >
              {item.icon}
              <span
                className="font-medium"
                style={{ fontSize: 'var(--cp-caption-size)' }}
              >
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

export default CPBottomNav
