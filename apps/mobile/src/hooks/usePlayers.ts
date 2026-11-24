/**
 * Directorio de jugadores (`/api/players`, exige sesión). Lo que trae
 * (teléfono, email, cumpleaños) depende del rol de quien pregunta; nunca el PIN.
 */
import type { UserRole } from '@poker/shared';
import useSWR from 'swr';

export interface DirectoryPlayer {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  aliases: string[];
  photoUrl?: string | null;
  isActive: boolean;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  inviter?: { id: string; firstName: string; lastName: string } | null;
  _count?: { invitees: number };
}

export const PLAYERS_KEY = '/api/players?includeInactive=false';

export function usePlayers() {
  const swr = useSWR<DirectoryPlayer[]>(PLAYERS_KEY);
  return { ...swr, players: swr.data };
}

export function isMember(p: Pick<DirectoryPlayer, 'role'>): boolean {
  return p.role === 'Enfermo' || p.role === 'Comision';
}

/** Coincide por nombre, apellido o alias (sin distinguir mayúsculas). */
export function matchesSearch(p: Pick<DirectoryPlayer, 'firstName' | 'lastName' | 'aliases'>, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return (
    p.firstName.toLowerCase().includes(t) ||
    p.lastName.toLowerCase().includes(t) ||
    (p.aliases ?? []).some((a) => a.toLowerCase().includes(t))
  );
}
