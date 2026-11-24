/**
 * Avisos del timer en el teléfono: notificación local con sonido, háptica y
 * (en pantalla) el destello. Mismos momentos y mismos sonidos que la web
 * (apps/web/src/lib/timer-alerts.ts):
 *
 *   - falta 1 minuto: dos pitidos agudos (880 Hz), vibración breve
 *   - cambio de nivel: tres pitidos ascendentes (Do-Mi-Sol), vibración larga
 *
 * Los pitidos son los mismos de WebAudio grabados en
 * assets/sounds/timer_minuto.wav y timer_cambio.wav (config plugin de
 * expo-notifications en app.json).
 *
 * A diferencia de la web, los avisos se PROGRAMAN como notificaciones locales
 * para toda la noche: suenan aunque la app esté en segundo plano o con la
 * pantalla bloqueada. Cada vez que cambia el estado (pausa, reanudación,
 * adelantar nivel) se cancelan y se vuelven a programar.
 */
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications';
import { Platform } from 'react-native';

import { formatChips, type LevelBoundary } from './timer-view';

/** Marca para reconocer (y cancelar) solo las notificaciones del timer. */
const SOURCE = 'envivo-timer';

const CHANNEL_MINUTE = 'timer-minuto';
const CHANNEL_CHANGE = 'timer-cambio';
const SOUND_MINUTE = 'timer_minuto.wav';
const SOUND_CHANGE = 'timer_cambio.wav';

const ONE_MINUTE_MS = 60_000;

export type AlertKind = 'one-minute' | 'level-change';

let handlerInstalled = false;

/**
 * Con la app en primer plano también se muestra y suena: la pantalla del
 * timer hace el destello, pero el sonido lo pone la notificación.
 *
 * OJO: setNotificationHandler es global. Si el agente de push instala otro
 * handler, tiene que mantener este comportamiento para `data.source ===
 * 'envivo-timer'`.
 */
function installForegroundHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type AlertPermission = 'granted' | 'denied' | 'unavailable';

/**
 * Canales (Android) y permiso. En Android 13+ el canal tiene que existir
 * antes de pedir el permiso. Se puede llamar muchas veces.
 */
export async function prepareTimerAlerts(): Promise<AlertPermission> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    installForegroundHandler();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_MINUTE, {
        name: 'Timer: falta 1 minuto',
        importance: AndroidImportance.HIGH,
        sound: SOUND_MINUTE,
        vibrationPattern: [0, 120, 80, 120],
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync(CHANNEL_CHANGE, {
        name: 'Timer: cambio de nivel',
        importance: AndroidImportance.MAX,
        sound: SOUND_CHANGE,
        vibrationPattern: [0, 250, 120, 250, 120, 400],
        lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      });
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'denied';
    const asked = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return asked.granted ? 'granted' : 'denied';
  } catch (error) {
    if (__DEV__) console.warn('No se pudieron preparar los avisos del timer:', error);
    return 'unavailable';
  }
}

/**
 * Android 12+: sin el permiso de alarmas exactas el sistema puede atrasar el
 * aviso varios minutos. Devuelve false si falta (para ofrecer activarlo).
 */
export async function hasExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.getExactAlarmPermissionsAsync()).granted;
  } catch {
    return true;
  }
}

export async function requestExactAlarms(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    return (await Notifications.requestExactAlarmPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

function content(
  kind: AlertKind,
  b: Pick<LevelBoundary, 'level' | 'smallBlind' | 'bigBlind'>,
  dateNumber: number | null,
  at: number | null = null
) {
  const fecha = dateNumber != null ? `Fecha ${dateNumber} · ` : '';
  if (kind === 'one-minute') {
    return {
      title: 'Falta 1 minuto',
      body: `${fecha}Sigue nivel ${b.level}: ${formatChips(b.smallBlind)}/${formatChips(b.bigBlind)}`,
      sound: SOUND_MINUTE,
      data: { source: SOURCE, kind, at },
    };
  }
  return {
    title: `Cambio a ${formatChips(b.smallBlind)}/${formatChips(b.bigBlind)}`,
    body: `${fecha}Nivel ${b.level}`,
    sound: SOUND_CHANGE,
    data: { source: SOURCE, kind, at },
  };
}

/** Lo último que se programó, para no reprogramar en cada tic. */
let lastPlan: LevelBoundary[] = [];
let queue: Promise<unknown> = Promise.resolve();

function samePlan(a: LevelBoundary[], b: LevelBoundary[]): boolean {
  if (a.length !== b.length) return false;
  // Tolerancia de 1,5 s: el desfase se vuelve a medir en cada consulta y
  // varía con la latencia; no vale la pena reprogramar por eso.
  return a.every((x, i) => x.level === b[i].level && Math.abs(x.at - b[i].at) < 1500);
}

/**
 * Cancela los avisos del timer pendientes. Deja los que vencen en el próximo
 * segundo y medio: si el sistema todavía no los entregó, están sonando ahora
 * mismo y cortarlos haría que el cambio de nivel pase en silencio.
 */
async function cancelOurs(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const keepUntil = Date.now() + 1500;
  await Promise.all(
    all
      .filter((n) => {
        const data = n.content.data as {
          source?: unknown;
          at?: unknown;
        } | null;
        if (data?.source !== SOURCE) return false;
        return typeof data.at !== 'number' || data.at > keepUntil;
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Programa los avisos de los próximos cambios de nivel. Si el plan no cambió
 * (mismos niveles, mismas horas) no hace nada. Las llamadas se encolan para
 * que una reprogramación no se cruce con la anterior.
 */
export function scheduleTimerAlerts(plan: LevelBoundary[], dateNumber: number | null): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  if (samePlan(plan, lastPlan)) return Promise.resolve();

  // Cambio de nivel natural: el plan nuevo es el anterior sin el cambio que
  // acaba de pasar (y quizá uno más al final). No se cancela nada: la
  // notificación de ese cambio puede estar sonando justo ahora y cancelarla
  // la cortaría. Solo se agregan las que faltan.
  const cutoff = Date.now() + 1000;
  const oldFuture = lastPlan.filter((b) => b.at > cutoff);
  const newFuture = plan.filter((b) => b.at > cutoff);
  const extends_ = oldFuture.length > 0 && samePlan(oldFuture, newFuture.slice(0, oldFuture.length));
  const toAdd = extends_ ? newFuture.slice(oldFuture.length) : plan;
  lastPlan = plan;

  const run = async () => {
    if (!extends_) await cancelOurs();
    const now = Date.now();
    for (const b of toAdd) {
      const minuteAt = b.at - ONE_MINUTE_MS;
      if (minuteAt > now + 1000) {
        await Notifications.scheduleNotificationAsync({
          content: content('one-minute', b, dateNumber, minuteAt),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: minuteAt,
            channelId: CHANNEL_MINUTE,
          },
        });
      }
      if (b.at > now + 500) {
        await Notifications.scheduleNotificationAsync({
          content: content('level-change', b, dateNumber, b.at),
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: b.at,
            channelId: CHANNEL_CHANGE,
          },
        });
      }
    }
  };
  const next = queue.then(run, run).catch((error) => {
    lastPlan = [];
    if (__DEV__) console.warn('No se pudieron programar los avisos del timer:', error);
  });
  queue = next;
  return next;
}

/** Al salir de la pantalla o al pausar: fuera todos los avisos del timer. */
export function cancelTimerAlerts(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  lastPlan = [];
  const run = () => cancelOurs();
  const next = queue.then(run, run).catch(() => {});
  queue = next;
  return next;
}

/**
 * ¿Había un aviso programado para este momento? Si sí, ya sonó (o va a sonar)
 * la notificación y no hace falta otra. Si no, el cambio fue manual (alguien
 * adelantó el nivel) y hay que hacer sonar el aviso ahora.
 */
export function wasScheduledAround(kind: AlertKind, level: number, at: number, toleranceMs = 4000): boolean {
  return lastPlan.some((b) => {
    if (kind === 'level-change') return b.level === level && Math.abs(b.at - at) <= toleranceMs;
    return b.fromLevel === level && Math.abs(b.at - ONE_MINUTE_MS - at) <= toleranceMs;
  });
}

/** Notificación inmediata (para cambios manuales, que no estaban programados). */
export async function presentNow(
  kind: AlertKind,
  b: Pick<LevelBoundary, 'level' | 'smallBlind' | 'bigBlind'>,
  dateNumber: number | null
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: content(kind, b, dateNumber),
      trigger:
        Platform.OS === 'android'
          ? {
              channelId: kind === 'one-minute' ? CHANNEL_MINUTE : CHANNEL_CHANGE,
            }
          : null,
    });
  } catch (error) {
    if (__DEV__) console.warn('No se pudo mostrar el aviso del timer:', error);
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Háptica: breve para el minuto, larga y marcada para el cambio. */
export async function hapticFor(kind: AlertKind): Promise<void> {
  try {
    if (kind === 'one-minute') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await wait(250);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await wait(250);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // Sin motor háptico (simulador): no pasa nada.
  }
}
