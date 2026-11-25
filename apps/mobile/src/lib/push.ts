/**
 * Push nativo (T16). Equivalente móvil de src/lib/notifications.ts de la web:
 * pide permiso, obtiene el ExpoPushToken y lo registra en
 * `POST /api/push/devices`. El servidor envía por la Expo Push API con los
 * mismos tipos de notificación y preferencias que el web-push.
 *
 * AuthContext lo llama al entrar (login, arranque o desbloqueo) y al salir.
 * Nunca lanza: si algo falla la app sigue funcionando sin push.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { apiFetch } from '@/lib/api';
import { cp } from '@/theme/colors';

/** Mismo id que EXPO_ANDROID_CHANNEL_ID en apps/web/src/lib/expo-push.ts. */
const ANDROID_CHANNEL_ID = 'default';

/** Último token registrado en esta sesión de la app (para darlo de baja). */
let registeredToken: string | null = null;

// Con la app abierta, mostrar la notificación igual que en segundo plano.
// Es el ÚNICO setNotificationHandler de la app (es global): cubre el push del
// servidor y los avisos locales del timer (envivo/timer-alerts.ts), que
// necesitan banner y sonido también en primer plano.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function isPushCapable(): boolean {
  return (Platform.OS === 'ios' || Platform.OS === 'android') && Device.isDevice;
}

function easProjectId(): string | undefined {
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  return fromExtra ?? Constants.easConfig?.projectId;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Poker Enfermos',
    importance: AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: cp.primary,
  });
}

/** Lee el token sin pedir permiso (null si no está concedido). */
async function currentTokenIfGranted(): Promise<string | null> {
  const projectId = easProjectId();
  if (!isPushCapable() || !projectId) return null;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return null;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/**
 * Pide permiso (solo la primera vez muestra el diálogo del sistema), obtiene
 * el token y lo registra para el jugador autenticado. Devuelve el token o null.
 */
export async function registerPushDevice(): Promise<string | null> {
  try {
    const projectId = easProjectId();
    if (!isPushCapable() || !projectId) return null;

    await ensureAndroidChannel();

    let { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (!granted && canAskAgain) {
      ({ granted } = await Notifications.requestPermissionsAsync());
    }
    if (!granted) return null;

    const { data: expoToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await apiFetch('/api/push/devices', {
      method: 'POST',
      json: { expoToken, platform: Platform.OS },
    });
    registeredToken = expoToken;
    return expoToken;
  } catch (error) {
    if (__DEV__) console.warn('No se pudo registrar el dispositivo para push:', error);
    return null;
  }
}

/**
 * Da de baja el token en el servidor. Recibe la clave explícita porque en el
 * logout desde `locked` la credencial todavía no está cargada en api.ts.
 */
export async function unregisterPushDevice(pin: string): Promise<void> {
  try {
    const expoToken = registeredToken ?? (await currentTokenIfGranted());
    if (!expoToken) return;
    await apiFetch('/api/push/devices', {
      method: 'DELETE',
      json: { expoToken },
      skipAuth: true,
      headers: { Authorization: `Bearer PIN:${pin}` },
    });
    registeredToken = null;
  } catch (error) {
    if (__DEV__) console.warn('No se pudo dar de baja el dispositivo push:', error);
  }
}
