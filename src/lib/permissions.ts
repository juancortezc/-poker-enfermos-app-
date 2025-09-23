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

/**
 * Mapa de permisos por feature y rol
 */
const PERMISSIONS_MAP: Record<FeaturePermission, UserRole[]> = {
  // Acceso para todos los roles
  'calendar': ['Comision', 'Enfermo', 'Invitado'],
  'regulations': ['Comision', 'Enfermo', 'Invitado'],
  'stats-days': ['Comision', 'Enfermo', 'Invitado'],
  
  // Solo Comisión y Enfermo
  'profile': ['Comision', 'Enfermo'],
  
  // Solo Comisión (admin)
  'stats-parents': ['Comision'],
  'game-dates': ['Comision'],
  'tournaments': ['Comision'],
  'players': ['Comision'],
  'import': ['Comision'],
  'eliminations': ['Comision'],
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
export function getDashboardFeatures(userRole: UserRole) {
  const baseFeatures = [
    {
      id: 'calendar',
      title: 'CALENDARIO',
      href: '/admin/calendar',
      accessible: canAccess(userRole, 'calendar'),
      restricted: false
    },
    {
      id: 'regulations',
      title: 'REGLAMENTO',
      href: '/admin/regulations',
      accessible: canAccess(userRole, 'regulations'),
      restricted: false
    },
    {
      id: 'resultados',
      title: 'RESULTADOS',
      href: '/admin/resultados',
      accessible: true, // Accesible para todos los usuarios
      restricted: false
    },
    {
      id: 'stats',
      title: 'STATS',
      href: '/admin/stats',
      accessible: canAccess(userRole, 'stats-days'), // Al menos días sin ganar
      restricted: userRole !== 'Comision' // Restringido parcialmente para no-Comisión
    }
  ]

  const adminFeatures = [
    {
      id: 'game-dates',
      title: 'FECHA',
      href: '/game-dates/config',
      accessible: canAccess(userRole, 'game-dates'),
      restricted: !canAccess(userRole, 'game-dates')
    },
    {
      id: 'tournaments',
      title: 'TORNEOS',
      href: '/tournaments',
      accessible: canAccess(userRole, 'tournaments'),
      restricted: !canAccess(userRole, 'tournaments')
    },
    {
      id: 'players',
      title: 'ENFERMOS',
      href: '/players',
      accessible: canAccess(userRole, 'players'),
      restricted: !canAccess(userRole, 'players')
    },
    {
      id: 'import',
      title: 'IMPORTAR',
      href: '/admin/import',
      accessible: canAccess(userRole, 'import'),
      restricted: !canAccess(userRole, 'import')
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
  const publicRoutes = ['/', '/timer', '/ranking', '/players', '/notificaciones']
  if (publicRoutes.includes(route)) return true

  // Rutas de perfil (solo Comisión y Enfermo)
  if (route === '/perfil') return canAccess(userRole, 'profile')

  // Rutas admin específicas
  if (route.startsWith('/admin/calendar')) return canAccess(userRole, 'calendar')
  if (route.startsWith('/admin/regulations')) return canAccess(userRole, 'regulations')
  if (route.startsWith('/admin/stats')) return canAccess(userRole, 'stats-days')
  
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
