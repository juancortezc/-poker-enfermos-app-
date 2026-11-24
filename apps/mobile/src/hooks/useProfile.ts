/**
 * Perfil propio (`/api/profile`, exige sesión). GET para leer y PUT para
 * guardar teléfono, email, cumpleaños y la clave, igual que DatosTab de la web.
 *
 * Si se cambia la clave, la nueva se guarda en el llavero y en memoria ANTES
 * de revalidar: el header de autorización se arma con la clave guardada y,
 * si siguiera la vieja, la siguiente petición daría 401 y cerraría la sesión.
 */
import useSWR from 'swr';

import { apiFetch, ApiError, setAuthPin } from '@/lib/api';
import { authStorage } from '@/lib/secure-auth-storage';
import { normalizePin } from '@poker/shared';

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  aliases: string[];
  birthDate?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  role: string;
  lastVictoryDate?: string | null;
}

export interface ProfileUpdate {
  phone?: string;
  email?: string;
  birthDate?: string;
  pin?: string;
}

export const PROFILE_KEY = '/api/profile';

/** La API del perfil responde `{ message }` (no `{ error }`) en los fallos. */
function profileErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    try {
      const parsed = JSON.parse(error.info) as { message?: unknown; error?: unknown };
      const msg = parsed.message ?? parsed.error;
      if (typeof msg === 'string' && msg) return msg;
    } catch {
      // cuerpo no JSON
    }
    return error.status >= 500 ? 'Error del servidor. Probá de nuevo.' : error.message;
  }
  return 'Sin conexión. Revisá tu internet.';
}

export function useProfile() {
  const swr = useSWR<Profile>(PROFILE_KEY);

  const save = async (update: ProfileUpdate): Promise<{ ok: true } | { ok: false; error: string }> => {
    const pin = update.pin ? normalizePin(update.pin) : undefined;
    try {
      await apiFetch(PROFILE_KEY, {
        method: 'PUT',
        json: {
          phone: update.phone || undefined,
          email: update.email || undefined,
          birthDate: update.birthDate || undefined,
          pin,
        },
      });
    } catch (error) {
      return { ok: false, error: profileErrorMessage(error) };
    }
    if (pin) {
      setAuthPin(pin);
      await authStorage.setPin(pin);
    }
    await swr.mutate();
    return { ok: true };
  };

  return { ...swr, profile: swr.data, save };
}
