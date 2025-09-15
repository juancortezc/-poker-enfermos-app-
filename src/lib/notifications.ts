import type { NotificationOptions, NotificationPreferences } from '@/hooks/useNotifications';

/**
 * Servicio central de notificaciones
 * Maneja la lógica de envío, sonidos y vibración
 */
export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
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

      // Registrar service worker si no está registrado
      if ('serviceWorker' in navigator) {
        try {
          this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered for notifications');
        } catch (error) {
          console.warn('Service Worker registration failed:', error);
        }
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
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
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.getPermissionStatus() !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: options.tag,
        requireInteraction: options.priority === 'high',
        silent: !options.sound,
        renotify: true,
        timestamp: Date.now(),
      });

      // Reproducir sonido si está especificado
      if (options.sound) {
        this.playSound(options.sound).catch(e => 
          console.warn('Could not play notification sound:', e)
        );
      }

      // Vibrar si está especificado
      if (options.vibrate) {
        this.vibrate();
      }

      // Auto-cerrar notificación (excepto alta prioridad)
      if (options.priority !== 'high') {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Manejar click en notificación
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Enviar notificación con preferencias de usuario
   */
  async sendNotificationWithPreferences(
    type: string,
    options: NotificationOptions,
    preferences: NotificationPreferences
  ): Promise<boolean> {
    // Verificar si el tipo de notificación está habilitado
    const category = this.getNotificationCategory(type);
    if (!this.isNotificationEnabled(type, category, preferences)) {
      console.log(`Notification disabled for type: ${type}`);
      return false;
    }

    // Aplicar configuración de sonido
    if (options.sound && !preferences.sound.enabled) {
      delete options.sound;
    }

    // Aplicar configuración de vibración
    if (options.vibrate && !preferences.vibration.enabled) {
      options.vibrate = false;
    }

    return this.sendNotification(options);
  }

  /**
   * Obtener categoría de notificación
   */
  private getNotificationCategory(type: string): 'timer' | 'game' {
    const timerTypes = ['oneMinuteWarning', 'blindChange', 'timerPaused'];
    return timerTypes.includes(type) ? 'timer' : 'game';
  }

  /**
   * Verificar si un tipo de notificación está habilitado
   */
  private isNotificationEnabled(
    type: string, 
    category: 'timer' | 'game', 
    preferences: NotificationPreferences
  ): boolean {
    const categoryPrefs = preferences[category];
    return categoryPrefs[type as keyof typeof categoryPrefs] === true;
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