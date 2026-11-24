'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Mic, BarChart3, MoreHorizontal, ListOrdered } from 'lucide-react'

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
    // La tabla del torneo es lo que mas se mira y no tenia acceso directo:
    // habia que pasar por Inicio o por Mas. Va segunda, pegada a Inicio.
    id: 'tabla',
    label: 'Tabla',
    href: '/ranking',
    icon: <ListOrdered className="w-5 h-5" />,
  },
  {
    id: 'podcast',
    label: 'Podcast',
    href: '/podcast',
    icon: <Mic className="w-5 h-5" />,
  },
  {
    // Barras, no una flecha de tendencia: la flecha se leia como "subir/bajar"
    // —que es justo lo que significa en las tablas— y no como "resultados".
    id: 'stats',
    label: 'Estadísticas',
    href: '/stats',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    id: 'mas',
    label: 'Más',
    href: '/mas',
    icon: <MoreHorizontal className="w-5 h-5" />,
  },
]

interface CPBottomNavProps {
  /** Acompaña el tono del shell; sobre suelo claro el degradado va en papel. */
  tone?: 'dark' | 'light'
}

export function CPBottomNav({ tone = 'dark' }: CPBottomNavProps = {}) {
  const claro = tone === 'light'
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/home') {
      return pathname === '/home' || pathname === '/'
    }
    return pathname?.startsWith(href) ?? false
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
          background: claro
            ? 'linear-gradient(180deg, rgba(250,247,242,0) 0%, rgba(250,247,242,0.95) 16%, rgba(250,247,242,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.94) 16%, rgba(0,0,0,1) 100%)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
      <div className="flex items-center py-2 px-1">
        {/*
          Aqui vivia un boton "Atras" que aparecia solo fuera del home. Esa
          regla no se podia adivinar desde la pantalla: el mismo menu cambiaba
          de forma segun donde estuvieras, y el destino dependia del historial,
          asi que dos caminos distintos a la misma pantalla daban vueltas
          distintas. El telefono ya tiene su propio gesto para volver.
        */}
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-all flex-1 min-w-0"
              style={{
                background: active ? 'var(--cp-surface)' : 'transparent',
                color: active ? 'var(--cp-on-surface)' : 'var(--cp-on-surface-variant)',
              }}
            >
              {item.icon}
              <span
                className="font-medium truncate"
                style={{ fontSize: '12px' }}
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
