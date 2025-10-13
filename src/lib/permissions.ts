import { UserRole } from '@prisma/client'

/**
 * Sistema de permisos para controlar acceso a funcionalidades por rol
 */

export type FeaturePermission =
  | 'calendar'           // Calendario del torneo
  | 'regulations'        // Reglamento PDF
  | 'stats-days'         // Estadísticas - Días sin ganar
  | 'stats-parents'      // Estadísticas - Padres e hijos
  | 'profile'            // Perfil personal
  | 'game-dates'         // Gestión de fechas
  | 'tournaments'        // Gestión de torneos
  | 'players'            // Gestión de jugadores
  | 'import'             // Importación de datos
  | 'eliminations'       // Registro de eliminaciones
  | 't29-proposals'      // Propuestas T29
  | 'proposals-admin'    // Gestión de propuestas (admin)
  | 'my-proposals'       // Mis propuestas
  | 'notifications-config' // Configuración de notificaciones

/**
 * Mapa de permisos por feature y rol
 */
const PERMISSIONS_MAP: Record<FeaturePermission, UserRole[]> = {
  // Acceso para todos los roles
  'calendar': ['Comision', 'Enfermo', 'Invitado'],
  'regulations': ['Comision', 'Enfermo', 'Invitado'],
  'stats-days': ['Comision', 'Enfermo', 'Invitado'],
  't29-proposals': ['Comision', 'Enfermo', 'Invitado'],

  // Solo Comisión y Enfermo
  'profile': ['Comision', 'Enfermo'],
  'my-proposals': ['Comision', 'Enfermo'],

  // Solo Comisión (admin)
  'stats-parents': ['Comision'],
  'game-dates': ['Comision'],
  'tournaments': ['Comision'],
  'players': ['Comision'],
  'import': ['Comision'],
  'eliminations': ['Comision'],
  'proposals-admin': ['Comision'],
  'notifications-config': ['Comision'],
}

/**
 * Verifica si un rol tiene acceso a una funcionalidad específica
 */
export function canAccess(userRole: UserRole, feature: FeaturePermission): boolean {
  const allowedRoles = PERMISSIONS_MAP[feature]
  return allowedRoles?.includes(userRole) || false
}

/**
 * Obtiene el nivel de acceso de un usuario
 */
export function getAccessLevel(userRole: UserRole): 'full' | 'limited' | 'read-only' {
  switch (userRole) {
    case 'Comision':
      return 'full'
    case 'Enfermo':
      return 'limited'
    case 'Invitado':
      return 'read-only'
    default:
      return 'read-only'
  }
}

/**
 * Funciones disponibles en el dashboard por rol
 */
export interface DashboardFeature {
  id: string
  title: string
  href: string
  accessible: boolean
  restricted: boolean
  permission?: FeaturePermission
}

export function getDashboardFeatures(userRole: UserRole) {
  const withPermission = (permission?: FeaturePermission) => {
    if (!permission) {
      return {
        accessible: true,
        restricted: false
      }
    }

    const allowed = canAccess(userRole, permission)
    return {
      accessible: allowed,
      restricted: !allowed
    }
  }

  const baseFeatures: DashboardFeature[] = [
    {
      id: 'resultados',
      title: 'RESULTADOS',
      href: '/admin/resultados',
      permission: undefined,
      ...withPermission()
    },
    {
      id: 'calendar',
      title: 'CALENDARIO',
      href: '/admin/calendar',
      permission: 'calendar',
      ...withPermission('calendar')
    },
    {
      id: 'regulations',
      title: 'REGLAMENTO',
      href: '/admin/regulations',
      permission: 'regulations',
      ...withPermission('regulations')
    },
    {
      id: 'enfermos-base',
      title: 'ENFERMOS',
      href: '/admin/enfermos',
      permission: undefined,
      ...withPermission()
    },
    {
      id: 't29',
      title: 'T29',
      href: '/t29',
      permission: 't29-proposals',
      ...withPermission('t29-proposals')
    },
    {
      id: 'sin-ganar',
      title: 'SIN GANAR',
      href: '/admin/sin-ganar',
      permission: 'stats-days',
      ...withPermission('stats-days')
    }
  ]

  const adminFeatures: DashboardFeature[] = [
    {
      id: 'game-dates',
      title: 'ACTIVAR FECHA',
      href: '/game-dates/config',
      permission: 'game-dates',
      ...withPermission('game-dates')
    },
    {
      id: 'players',
      title: 'JUGADORES',
      href: '/players',
      permission: 'players',
      ...withPermission('players')
    },
    {
      id: 'stats',
      title: 'STATS',
      href: '/admin/stats',
      permission: 'stats-parents',
      ...withPermission('stats-parents')
    },
    {
      id: 'torneo-anterior',
      title: 'TORNEO ANTERIOR',
      href: '/admin/torneo-anterior',
      permission: 'tournaments',
      ...withPermission('tournaments')
    },
    {
      id: 'calendar-builder',
      title: 'CREAR CALENDARIO',
      href: '/admin/calendar/create',
      permission: 'game-dates',
      ...withPermission('game-dates')
    },
    {
      id: 'tournaments',
      title: 'CREAR TORNEO',
      href: '/tournaments',
      permission: 'tournaments',
      ...withPermission('tournaments')
    },
    {
      id: 'proposals-admin',
      title: 'PROPUESTAS',
      href: '/admin/propuestas',
      permission: 'proposals-admin',
      ...withPermission('proposals-admin')
    },
    {
      id: 'import',
      title: 'IMPORTAR',
      href: '/admin/import',
      permission: 'import',
      ...withPermission('import')
    }
  ]

  return {
    base: baseFeatures,
    admin: adminFeatures,
    all: [...baseFeatures, ...adminFeatures]
  }
}

/**
 * Verifica si un usuario puede acceder a una ruta específica
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Rutas públicas (accesibles para todos)
  const publicRoutes = ['/', '/timer', '/ranking', '/players', '/notificaciones', '/t29']
  if (publicRoutes.includes(route)) return true

  // Rutas de perfil (solo Comisión y Enfermo)
  if (route === '/perfil') return canAccess(userRole, 'profile')

  // Rutas admin específicas
  if (route.startsWith('/admin/calendar/create')) return canAccess(userRole, 'game-dates')
  if (route.startsWith('/admin/sin-ganar')) return canAccess(userRole, 'stats-days')
  if (route.startsWith('/admin/club-1000')) return true
  if (route.startsWith('/admin/enfermos')) return true
  if (route.startsWith('/admin/resultados')) return true
  if (route.startsWith('/admin/calendar')) return canAccess(userRole, 'calendar')
  if (route.startsWith('/admin/regulations')) return canAccess(userRole, 'regulations')
  if (route.startsWith('/admin/stats')) return canAccess(userRole, 'stats-parents')
  if (route.startsWith('/admin/propuestas')) return canAccess(userRole, 'proposals-admin')
  if (route.startsWith('/admin/notificaciones')) return canAccess(userRole, 'notifications-config')

  // Rutas admin restringidas (solo Comisión)
  if (route.startsWith('/admin/')) return userRole === 'Comision'
  if (route.startsWith('/tournaments')) return canAccess(userRole, 'tournaments')
  if (route.startsWith('/game-dates')) return canAccess(userRole, 'game-dates')
  if (route.startsWith('/registro')) return canAccess(userRole, 'eliminations')

  // Por defecto, denegar acceso
  return false
}

/**
 * Obtiene el mensaje de restricción para una funcionalidad
 */
export function getRestrictionMessage(userRole: UserRole, feature: FeaturePermission): string {
  if (canAccess(userRole, feature)) return ''
  
  switch (feature) {
    case 'profile':
      return 'Solo disponible para miembros del grupo'
    case 'stats-parents':
      return 'Solo disponible para Comisión'
    case 'game-dates':
    case 'tournaments':
    case 'players':
    case 'import':
    case 'eliminations':
      return 'Solo disponible para Comisión'
    default:
      return 'Acceso restringido'
  }
}
