import { 
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationOptions,
  type NotificationPreferences,
  type NotificationCategory,
  type NotificationPreferenceType,
} from '@/lib/notification-types';
import { getAuthHeaderValue } from '@/lib/client-auth';

interface InternalNotificationPayload {
  title: string;
  options: NotificationOptions & {
    timestamp: number;
    requireInteraction: boolean;
    silent: boolean;
    autoClose?: number;
  };
}

/**
 * Servicio central de notificaciones
 * Maneja la lógica de envío, sonidos y vibración
 */
export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES;
  private broadcastChannel: BroadcastChannel | null = null;
  private preferenceListeners = new Set<(preferences: NotificationPreferences) => void>();
  private clientId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  private pushSubscription: PushSubscription | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private toUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  async getPushSubscription(): Promise<PushSubscription | null> {
    await this.initialize();
    if (!this.serviceWorkerRegistration) {
      return null;
    }

    const pushManager = this.serviceWorkerRegistration.pushManager;

    if (this.pushSubscription) return this.pushSubscription;

    try {
      this.pushSubscription = await pushManager.getSubscription();
    } catch (error) {
      console.warn('Error retrieving push subscription:', error);
    }

    return this.pushSubscription;
  }

  async subscribeToPush(applicationServerKey?: string) {
    await this.initialize();

    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not available');
    }

    try {
      const pushManager = this.serviceWorkerRegistration.pushManager;
      const existing = await pushManager.getSubscription();
      if (existing) {
        this.pushSubscription = existing;
        // Send subscription to server
        await this.sendSubscriptionToServer(existing);
        return existing;
      }

      // Get VAPID public key from server if not provided
      let vapidKey = applicationServerKey;
      if (!vapidKey) {
        const response = await fetch('/api/notifications/vapid-key');
        if (response.ok) {
          const data = await response.json();
          vapidKey = data.publicKey;
        }
      }

      if (!vapidKey) {
        throw new Error('VAPID key not available');
      }

      const subscribeOptions: PushSubscriptionOptionsInit = {
        userVisibleOnly: true,
        applicationServerKey: this.toUint8Array(vapidKey),
      };

      this.pushSubscription = await pushManager.subscribe(subscribeOptions);

      // Send subscription to server
      await this.sendSubscriptionToServer(this.pushSubscription);

      return this.pushSubscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  async unsubscribeFromPush() {
    const subscription = await this.getPushSubscription();
    if (!subscription) return false;

    try {
      // Notify server before unsubscribing
      await this.removeSubscriptionFromServer(subscription);

      const success = await subscription.unsubscribe();
      if (success) {
        this.pushSubscription = null;
      }
      return success;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    try {
      const authHeader = getAuthHeaderValue();
      if (!authHeader) {
        throw new Error('Missing authentication credentials for push subscription');
      }

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.getKey('p256dh') ?
                btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))) : '',
              auth: subscription.getKey('auth') ?
                btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))) : ''
            }
          },
          userAgent: navigator.userAgent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      console.log('Push subscription sent to server successfully');
    } catch (error) {
      console.error('Error sending subscription to server:', error);
      throw error;
    }
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription) {
    try {
      const authHeader = getAuthHeaderValue();
      if (!authHeader) {
        throw new Error('Missing authentication credentials for push unsubscription');
      }

      const response = await fetch(`/api/notifications/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        console.warn('Failed to remove subscription from server');
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error);
    }
  }

  /**
   * Inicializar el servicio
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Verificar soporte
      if (!this.isSupported()) {
        console.warn('Notifications not supported in this browser');
        return false;
      }

      await this.registerServiceWorker();
      this.loadPreferences();
      this.setupBroadcastChannel();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  private async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    try {
      // Si ya hay un SW activo, obtener el registro
      this.serviceWorkerRegistration = await navigator.serviceWorker.getRegistration();

      if (!this.serviceWorkerRegistration) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
      }

      // Asegurar que el SW esté listo
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready for notifications');
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }

  private setupBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;

    this.broadcastChannel = new BroadcastChannel('poker-notifications');
    this.broadcastChannel.addEventListener('message', (event) => {
      const { type, payload, source } = event.data || {};

      if (type === 'PREFERENCES_UPDATED' && payload && source !== this.clientId) {
        this.preferences = payload;
        this.preferenceListeners.forEach((listener) => listener(this.preferences));
      }

      if (type === 'SHOW_NOTIFICATION' && payload && source !== this.clientId) {
        this.routeNotification(payload as InternalNotificationPayload).catch((error) => {
          console.warn('Failed to route broadcast notification:', error);
        });
      }
    });
  }

  private loadPreferences() {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem('notification-preferences');
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
        this.preferences = {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          ...parsed,
          timer: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.timer,
            ...(parsed?.timer || {}),
          },
          game: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.game,
            ...(parsed?.game || {}),
          },
        };
      }
    } catch (error) {
      console.warn('Error loading notification preferences:', error);
    }
  }

  private persistPreferences(preferences: NotificationPreferences) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('notification-preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }

  getPreferences(): NotificationPreferences {
    return this.preferences;
  }

  subscribeToPreferenceChanges(callback: (preferences: NotificationPreferences) => void): () => void {
    this.preferenceListeners.add(callback);
    return () => {
      this.preferenceListeners.delete(callback);
    };
  }

  updatePreferences(preferences: NotificationPreferences) {
    this.preferences = preferences;
    this.persistPreferences(preferences);

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'PREFERENCES_UPDATED',
        payload: preferences,
        source: this.clientId,
      });
    }

    this.preferenceListeners.forEach((listener) => listener(preferences));
  }

  /**
   * Verificar si las notificaciones están soportadas
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           'serviceWorker' in navigator;
  }

  /**
   * Obtener el estado de los permisos
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Solicitar permisos de notificación
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;

    try {
      await this.initialize();
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * Reproducir sonido
   */
  playSound(soundFile: string, volume = 0.7): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`/sounds/${soundFile}`);
        audio.volume = Math.max(0, Math.min(1, volume));
        
        audio.addEventListener('ended', () => resolve());
        audio.addEventListener('error', (e) => reject(e));
        
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Vibrar dispositivo
   */
  vibrate(pattern: number[] | number = 200): boolean {
    if (!navigator.vibrate) return false;

    try {
      return navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Vibration failed:', error);
      return false;
    }
  }

  /**
   * Obtener patrones de vibración predefinidos
   */
  getVibrationPattern(intensity: 'light' | 'medium' | 'heavy'): number[] {
    const patterns = {
      light: [100],
      medium: [200],
      heavy: [300, 100, 300],
    };
    return patterns[intensity];
  }

  /**
   * Enviar notificación
   */
  async sendNotification(options: NotificationOptions): Promise<boolean> {
    await this.initialize();

    if (this.getPermissionStatus() !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    const payload: InternalNotificationPayload = {
      title: options.title,
      options: {
        ...options,
        timestamp: Date.now(),
        requireInteraction: options.priority === 'high',
        silent: !options.sound,
        autoClose: options.priority === 'high' ? undefined : 5000,
      },
    };

    try {
      await this.routeNotification(payload);
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  private async routeNotification(payload: InternalNotificationPayload) {
    const registration = await this.ensureRegistration();

    if (registration?.active) {
      registration.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload,
        source: this.clientId,
      });
    } else if (this.isSupported()) {
      // Fallback directo en caso de no tener SW activo
      const { title, options } = payload;
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: options.tag,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
        data: options.data,
        timestamp: options.timestamp,
      });

      if (options.autoClose) {
        setTimeout(() => notification.close(), options.autoClose);
      }
    }
  }

  private async ensureRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.serviceWorkerRegistration) return this.serviceWorkerRegistration;
    if (!('serviceWorker' in navigator)) return null;

    try {
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      return this.serviceWorkerRegistration;
    } catch (error) {
      console.warn('Service worker not ready', error);
      return null;
    }
  }

  /**
   * Enviar notificación con preferencias de usuario
   */
  async sendNotificationWithPreferences(
    type: NotificationPreferenceType,
    options: NotificationOptions,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    await this.initialize();

    const category = this.getNotificationCategory(type);
    if (!this.isNotificationEnabled(type, category, preferences)) {
      console.log(`Notification disabled for type: ${type}`);
      return false;
    }

    const finalOptions: NotificationOptions = { ...options };

    if (options.sound && preferences.sound.enabled) {
      this.playSound(options.sound, preferences.sound.volume / 100).catch((error) =>
        console.warn('Could not play notification sound:', error)
      );
    } else {
      delete finalOptions.sound;
    }

    if (options.vibrate && preferences.vibration.enabled) {
      const pattern = this.getVibrationPattern(preferences.vibration.intensity);
      this.vibrate(pattern);
    } else {
      finalOptions.vibrate = false;
    }

    return this.sendNotification(finalOptions);
  }

  /**
   * Obtener categoría de notificación
   */
  private getNotificationCategory(type: string): NotificationCategory {
    const timerTypes: NotificationPreferenceType[] = ['oneMinuteWarning', 'blindChange', 'timerPaused'];
    return timerTypes.includes(type) ? 'timer' : 'game';
  }

  /**
   * Verificar si un tipo de notificación está habilitado
   */
  private isNotificationEnabled(
    type: NotificationPreferenceType,
    category: NotificationCategory,
    preferences: NotificationPreferences
  ): boolean {
    const categoryPrefs = preferences[category];
    return Boolean(categoryPrefs[type as keyof typeof categoryPrefs]);
  }

  /**
   * Limpiar notificaciones por tag
   */
  clearNotificationsByTag(tag: string): void {
    // En browsers que soportan Service Worker
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.getNotifications({ tag }).then(notifications => {
        notifications.forEach(notification => notification.close());
      });
    }
  }

  /**
   * Limpiar todas las notificaciones
   */
  clearAllNotifications(): void {
    if (this.serviceWorkerRegistration) {
      this.serviceWorkerRegistration.getNotifications().then(notifications => {
        notifications.forEach(notification => notification.close());
      });
    }
  }
}

// Instancia singleton
export const notificationService = NotificationService.getInstance();

/**
 * Helper functions para tipos específicos de notificaciones
 */
export const NotificationHelpers = {
  timer: {
    oneMinuteWarning: (): NotificationOptions => ({
      title: '⏰ Timer Warning',
      body: '¡Queda 1 minuto para el próximo nivel de blinds!',
      sound: 'warning.mp3',
      vibrate: true,
      priority: 'normal',
      tag: 'timer-warning',
      icon: '/icons/timer-icon.png',
    }),

    blindChange: (level: number, smallBlind: number, bigBlind: number): NotificationOptions => ({
      title: '🔄 Cambio de Blinds',
      body: `Nivel ${level}: ${smallBlind}/${bigBlind}`,
      sound: 'blind-change.mp3',
      vibrate: true,
      priority: 'high',
      tag: 'blind-change',
      icon: '/icons/blinds-icon.png',
    }),

    timerPaused: (): NotificationOptions => ({
      title: '⏸️ Timer Pausado',
      body: 'El timer ha sido pausado por la Comisión',
      sound: 'pause.mp3',
      vibrate: true,
      priority: 'normal',
      tag: 'timer-paused',
    }),
  },

  game: {
    playerEliminated: (playerName: string, position: number): NotificationOptions => ({
      title: '💀 Jugador Eliminado',
      body: `${playerName} eliminado en posición ${position}°`,
      sound: 'elimination.mp3',
      vibrate: true,
      priority: 'normal',
      tag: 'elimination',
      icon: '/icons/elimination-icon.png',
    }),

    winnerDeclared: (playerName: string, points: number): NotificationOptions => ({
      title: '🏆 ¡Tenemos Ganador!',
      body: `${playerName} gana la fecha con ${points} puntos`,
      sound: 'winner.mp3',
      vibrate: true,
      priority: 'high',
      tag: 'winner',
      icon: '/icons/winner-icon.png',
    }),

    gameCompleted: (dateNumber: number): NotificationOptions => ({
      title: '🎯 Fecha Completada',
      body: `La Fecha ${dateNumber} ha terminado exitosamente`,
      sound: 'completion.mp3',
      vibrate: true,
      priority: 'normal',
      tag: 'game-completed',
      icon: '/icons/completed-icon.png',
    }),
  },
};
