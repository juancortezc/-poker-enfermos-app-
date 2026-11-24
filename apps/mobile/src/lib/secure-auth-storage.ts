/**
 * Persistencia de la sesión en el llavero (iOS Keychain / Android Keystore).
 *
 * Es el equivalente a las claves `poker-pin` y `poker-user` del localStorage
 * de la web, pero cifrado y ligado al dispositivo (THIS_DEVICE_ONLY: no viaja
 * en copias de seguridad a otro teléfono).
 *
 * NOTA: el plan (docs/mobile/PLAN.md) prevé sustituir la clave por un token de
 * sesión emitido por el servidor. Cuando exista, solo cambia lo que se guarda
 * en PIN_KEY; el resto del flujo (biometría, desbloqueo) se mantiene.
 */
import * as SecureStore from 'expo-secure-store';

import type { AuthUser } from '@/contexts/AuthContext';

const PIN_KEY = 'poker-pin';
const USER_KEY = 'poker-user';
const BIOMETRIC_KEY = 'poker-biometric';
const BIOMETRIC_OFFERED_KEY = 'poker-biometric-offered';

const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function get(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, options);
  } catch {
    // Un valor ilegible (p.ej. llavero restaurado de otro equipo) equivale a no tenerlo.
    return null;
  }
}

export const authStorage = {
  getPin: () => get(PIN_KEY),
  setPin: (pin: string) => SecureStore.setItemAsync(PIN_KEY, pin, options),

  async getUser(): Promise<AuthUser | null> {
    const raw = await get(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },
  setUser: (user: AuthUser) => SecureStore.setItemAsync(USER_KEY, JSON.stringify(user), options),

  async isBiometricEnabled(): Promise<boolean> {
    return (await get(BIOMETRIC_KEY)) === '1';
  },
  setBiometricEnabled: (enabled: boolean) =>
    SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? '1' : '0', options),

  async wasBiometricOffered(): Promise<boolean> {
    return (await get(BIOMETRIC_OFFERED_KEY)) === '1';
  },
  markBiometricOffered: () => SecureStore.setItemAsync(BIOMETRIC_OFFERED_KEY, '1', options),

  /** Cierra sesión. La preferencia de biometría y el "ya ofrecido" se conservan. */
  async clearSession(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(PIN_KEY, options),
      SecureStore.deleteItemAsync(USER_KEY, options),
    ]);
  },
};
