/**
 * Tipos de dominio compartidos entre la web y la app movil.
 *
 * Son uniones de texto con los mismos valores que los enums de Prisma
 * (prisma/schema.prisma en apps/web). Un valor de Prisma se puede asignar a
 * estos tipos y viceversa, sin depender de @prisma/client.
 */

export type UserRole = 'Comision' | 'Enfermo' | 'Invitado'

export type TournamentStatus = 'ACTIVO' | 'FINALIZADO'

export type GameDateStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'CREATED'

export type TimerStatus = 'inactive' | 'active' | 'paused' | 'completed'

export type VoteType = 'thumbsUp' | 'thumbsDown'

export type NotificationType = 'manual' | 'automatic' | 'scheduled' | 'test'
