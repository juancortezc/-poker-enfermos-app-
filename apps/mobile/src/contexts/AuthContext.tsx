/**
 * Sesión del usuario. Réplica de src/contexts/AuthContext.tsx de la web con
 * dos diferencias propias del teléfono:
 *
 * 1. La clave se guarda en el llavero (expo-secure-store), no en localStorage.
 * 2. Biometría opcional: si está activa, al abrir la app la sesión arranca
 *    `locked` y hay que pasar Face ID/huella para cargar la clave. El fallback
 *    es volver a escribir la clave.
 *
 * Estados:
 *   loading   → leyendo el llavero (splash visible)
 *   signedOut → pantalla de login
 *   locked    → hay sesión guardada pero falta la biometría
 *   signedIn  → app
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiFetch, ApiError, setAuthPin, setUnauthorizedHandler } from '@/lib/api';
import { authenticateWithBiometrics, getBiometricSupport, type BiometricSupport } from '@/lib/biometrics';
import {
  canAccess,
  isValidPinForLogin,
  normalizePin,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH_LOGIN,
  type FeaturePermission,
  type UserRole,
} from '@poker/shared';
import { registerPushDevice, unregisterPushDevice } from '@/lib/push';
import { authStorage } from '@/lib/secure-auth-storage';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  photoUrl?: string;
}

export type AuthStatus = 'loading' | 'signedOut' | 'locked' | 'signedIn';

export type LoginResult = { ok: true } | { ok: false; error: string };

interface AuthContextType {
  status: AuthStatus;
  user: AuthUser | null;
  role: UserRole | null;
  /** Atajo a `canAccess(role, feature)`; false sin sesión. */
  can: (feature: FeaturePermission) => boolean;

  login: (pin: string) => Promise<LoginResult>;
  logout: () => Promise<void>;

  biometric: BiometricSupport;
  biometricEnabled: boolean;
  /** Desbloqueo con biometría desde el estado `locked`. */
  unlock: () => Promise<boolean>;
  /** Desde `locked`: renunciar a la biometría esta vez y escribir la clave. */
  switchToPin: () => void;
  /** Activa/desactiva (activar pide la biometría para confirmar). */
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  /** true si conviene ofrecer activar biometría (primer login con clave). */
  shouldOfferBiometric: () => Promise<boolean>;
  markBiometricOffered: () => Promise<void>;

  /** Mensaje para el login tras una sesión caducada (401). */
  notice: string | null;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const NO_BIOMETRIC: BiometricSupport = { available: false, kind: 'generic', label: 'biometría' };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [biometric, setBiometric] = useState<BiometricSupport>(NO_BIOMETRIC);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** Igual que la web: refresca nombre/rol/foto en segundo plano. */
  const refreshUserData = useCallback(async (userId: string) => {
    try {
      const fresh = await apiFetch<AuthUser>(`/api/auth/me?id=${encodeURIComponent(userId)}`);
      setUser(fresh);
      await authStorage.setUser(fresh);
    } catch (error) {
      if (__DEV__) console.warn('Error refreshing user data:', error);
    }
  }, []);

  const clearLocalSession = useCallback(async () => {
    setAuthPin(null);
    setUser(null);
    setStatus('signedOut');
    await authStorage.clearSession();
  }, []);

  // Arranque: leer el llavero y decidir el estado inicial.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pin, storedUser, bioEnabled, support] = await Promise.all([
        authStorage.getPin(),
        authStorage.getUser(),
        authStorage.isBiometricEnabled(),
        getBiometricSupport(),
      ]);
      if (cancelled) return;
      setBiometric(support);
      setBiometricEnabledState(bioEnabled);

      if (!pin || !storedUser) {
        setStatus('signedOut');
        return;
      }
      setUser(storedUser);
      if (bioEnabled && support.available) {
        setStatus('locked');
        return;
      }
      setAuthPin(pin);
      setStatus('signedIn');
      refreshUserData(storedUser.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUserData]);

  // 401 con credencial cargada → la clave ya no sirve: fuera y al login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setNotice('Tu sesión caducó. Volvé a ingresar tu clave.');
      clearLocalSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearLocalSession]);

  // Push nativo: registrar el token cada vez que se entra (login, arranque o
  // desbloqueo). Idempotente en el servidor; también refresca lastSeenAt.
  const signedInUserId = status === 'signedIn' ? user?.id : undefined;
  useEffect(() => {
    if (signedInUserId) registerPushDevice();
  }, [signedInUserId]);

  const login = useCallback(
    async (rawPin: string): Promise<LoginResult> => {
      const pin = normalizePin(rawPin);
      if (!isValidPinForLogin(pin)) {
        return { ok: false, error: `La clave debe tener entre ${PIN_MIN_LENGTH_LOGIN} y ${PIN_MAX_LENGTH} caracteres` };
      }
      try {
        const authUser = await apiFetch<AuthUser & { pin?: string }>('/api/auth/login', {
          method: 'POST',
          json: { pin },
          skipAuth: true,
        });
        // El servidor no debería devolver el hash, pero por si acaso no se guarda.
        const cleanUser: AuthUser = {
          id: authUser.id,
          firstName: authUser.firstName,
          lastName: authUser.lastName,
          role: authUser.role,
          photoUrl: authUser.photoUrl,
        };
        await Promise.all([authStorage.setPin(pin), authStorage.setUser(cleanUser)]);
        setAuthPin(pin);
        setUser(cleanUser);
        setNotice(null);
        setStatus('signedIn');
        return { ok: true };
      } catch (error) {
        if (error instanceof ApiError) {
          return { ok: false, error: error.status >= 500 ? 'Error del servidor. Probá de nuevo.' : error.message };
        }
        return { ok: false, error: 'Sin conexión. Revisá tu internet.' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      const pin = await authStorage.getPin();
      if (pin) {
        await unregisterPushDevice(pin);
        // Invalida el cache de tokens del servidor (mismo formato que el header).
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          skipAuth: true,
          headers: { Authorization: `Bearer PIN:${pin}` },
        });
      }
    } catch (error) {
      if (__DEV__) console.warn('Error during logout:', error);
    } finally {
      await clearLocalSession();
    }
  }, [clearLocalSession]);

  const unlock = useCallback(async () => {
    const ok = await authenticateWithBiometrics('Desbloqueá Poker Enfermos');
    if (!ok) return false;
    const [pin, storedUser] = await Promise.all([authStorage.getPin(), authStorage.getUser()]);
    if (!pin || !storedUser) {
      await clearLocalSession();
      return false;
    }
    setAuthPin(pin);
    setUser(storedUser);
    setStatus('signedIn');
    refreshUserData(storedUser.id);
    return true;
  }, [clearLocalSession, refreshUserData]);

  const switchToPin = useCallback(() => {
    // La sesión guardada se queda: el login la sobrescribe al entrar.
    setStatus('signedOut');
  }, []);

  const setBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        if (!biometric.available) return false;
        const ok = await authenticateWithBiometrics(`Activar ${biometric.label}`);
        if (!ok) return false;
      }
      await authStorage.setBiometricEnabled(enabled);
      await authStorage.markBiometricOffered();
      setBiometricEnabledState(enabled);
      return true;
    },
    [biometric]
  );

  const shouldOfferBiometric = useCallback(async () => {
    if (!biometric.available || biometricEnabled) return false;
    return !(await authStorage.wasBiometricOffered());
  }, [biometric, biometricEnabled]);

  const markBiometricOffered = useCallback(() => authStorage.markBiometricOffered(), []);

  const value = useMemo<AuthContextType>(() => {
    const role = status === 'signedIn' && user ? user.role : null;
    return {
      status,
      user,
      role,
      can: (feature) => (role ? canAccess(role, feature) : false),
      login,
      logout,
      biometric,
      biometricEnabled,
      unlock,
      switchToPin,
      setBiometricEnabled,
      shouldOfferBiometric,
      markBiometricOffered,
      notice,
      clearNotice: () => setNotice(null),
    };
  }, [
    status,
    user,
    login,
    logout,
    biometric,
    biometricEnabled,
    unlock,
    switchToPin,
    setBiometricEnabled,
    shouldOfferBiometric,
    markBiometricOffered,
    notice,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
