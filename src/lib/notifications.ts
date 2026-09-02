import { getAuthHeaderValue } from '@/lib/client-auth';

/**
 * Servicio central de notificaciones.
 * Maneja permiso del navegador y suscripción/desuscripción push.
 * El envío real de notificaciones (contenido, on/off por evento) vive en
 * el servidor (`src/lib/notification-config.ts` + `src/lib/push-service.ts`).
 */
export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
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
}

// Instancia singleton
export const notificationService = NotificationService.getInstance();
