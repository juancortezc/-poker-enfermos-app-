/**
 * Sistema de permisos por rol. Copia de src/lib/permissions.ts de la web.
 *
 * TODO(@poker/shared): mover esta lógica a packages/shared y que la web y la
 * app la importen de ahí. Mientras tanto, cualquier cambio en la web debe
 * replicarse aquí: los permisos tienen que ser idénticos en ambas.
 *
 * Diferencias con la web: `UserRole` se declara aquí porque la app no depende
 * de @prisma/client, y getDashboardFeatures no se copia (sus rutas /admin/*
 * son de la web antigua y ninguna pantalla móvil lo usa).
 */

export type UserRole = 'Comision' | 'Enfermo' | 'Invitado';

export type FeaturePermission =
  | 'calendar' // Calendario del torneo
  | 'regulations' // Reglamento PDF
  | 'stats-days' // Estadísticas - Días sin ganar
  | 'stats-parents' // Estadísticas - Padres e hijos
  | 'profile' // Perfil personal
  | 'game-dates' // Gestión de fechas
  | 'tournaments' // Gestión de torneos
  | 'players' // Gestión de jugadores
  | 'import' // Importación de datos
  | 'eliminations' // Registro de eliminaciones
  | 't29-proposals' // Propuestas T29
  | 'proposals-admin' // Gestión de propuestas (admin)
  | 'my-proposals' // Mis propuestas
  | 'notifications-config' // Configuración de notificaciones
  | 'technical-docs'; // Documentación técnica

const PERMISSIONS_MAP: Record<FeaturePermission, UserRole[]> = {
  // Acceso para todos los roles
  calendar: ['Comision', 'Enfermo', 'Invitado'],
  regulations: ['Comision', 'Enfermo', 'Invitado'],
  'stats-days': ['Comision', 'Enfermo', 'Invitado'],
  't29-proposals': ['Comision', 'Enfermo', 'Invitado'],

  // Solo Comisión y Enfermo
  profile: ['Comision', 'Enfermo'],
  'my-proposals': ['Comision', 'Enfermo'],

  // Solo Comisión (admin)
  'stats-parents': ['Comision'],
  'game-dates': ['Comision'],
  tournaments: ['Comision'],
  players: ['Comision'],
  import: ['Comision'],
  eliminations: ['Comision'],
  'proposals-admin': ['Comision'],
  'notifications-config': ['Comision'],
  'technical-docs': ['Comision'],
};

/** Verifica si un rol tiene acceso a una funcionalidad específica. */
export function canAccess(userRole: UserRole, feature: FeaturePermission): boolean {
  const allowedRoles = PERMISSIONS_MAP[feature];
  return allowedRoles?.includes(userRole) || false;
}

/** Nivel de acceso de un usuario. */
export function getAccessLevel(userRole: UserRole): 'full' | 'limited' | 'read-only' {
  switch (userRole) {
    case 'Comision':
      return 'full';
    case 'Enfermo':
      return 'limited';
    case 'Invitado':
      return 'read-only';
    default:
      return 'read-only';
  }
}

/** Verifica si un usuario puede acceder a una ruta específica (rutas de la web). */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Rutas públicas (accesibles para todos)
  const publicRoutes = ['/', '/timer', '/ranking', '/players', '/notificaciones', '/t29'];
  if (publicRoutes.includes(route)) return true;

  // Rutas de perfil (solo Comisión y Enfermo)
  if (route === '/perfil') return canAccess(userRole, 'profile');

  // Rutas admin específicas
  if (route.startsWith('/admin/calendar/create')) return canAccess(userRole, 'game-dates');
  if (route.startsWith('/admin/sin-ganar')) return canAccess(userRole, 'stats-days');
  if (route.startsWith('/admin/club-1000')) return true;
  if (route.startsWith('/admin/enfermos')) return true;
  if (route.startsWith('/admin/resultados')) return true;
  if (route.startsWith('/admin/fecha')) return true;
  if (route.startsWith('/admin/calendar')) return canAccess(userRole, 'calendar');
  if (route.startsWith('/admin/regulations')) return canAccess(userRole, 'regulations');
  if (route.startsWith('/admin/stats')) return canAccess(userRole, 'stats-parents');
  if (route.startsWith('/admin/propuestas')) return canAccess(userRole, 'proposals-admin');
  if (route.startsWith('/admin/notificaciones')) return canAccess(userRole, 'notifications-config');
  if (route.startsWith('/admin/tecnico')) return canAccess(userRole, 'technical-docs');

  // Rutas admin restringidas (solo Comisión)
  if (route.startsWith('/admin/')) return userRole === 'Comision';
  if (route.startsWith('/tournaments')) return canAccess(userRole, 'tournaments');
  if (route.startsWith('/game-dates')) return canAccess(userRole, 'game-dates');
  if (route.startsWith('/registro')) return canAccess(userRole, 'eliminations');

  // Por defecto, denegar acceso
  return false;
}

/** Mensaje de restricción para una funcionalidad. */
export function getRestrictionMessage(userRole: UserRole, feature: FeaturePermission): string {
  if (canAccess(userRole, feature)) return '';

  switch (feature) {
    case 'profile':
      return 'Solo disponible para miembros del grupo';
    case 'stats-parents':
      return 'Solo disponible para Comisión';
    case 'game-dates':
    case 'tournaments':
    case 'players':
    case 'import':
    case 'eliminations':
      return 'Solo disponible para Comisión';
    default:
      return 'Acceso restringido';
  }
}
