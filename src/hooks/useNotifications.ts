'use client';

import { useState, useEffect, useCallback } from 'react';

export interface NotificationPreferences {
  timer: {
    oneMinuteWarning: boolean;
    blindChange: boolean;
    timerPaused: boolean;
  };
  game: {
    playerEliminated: boolean;
    winnerDeclared: boolean;
    gameCompleted: boolean;
  };
  sound: {
    enabled: boolean;
    volume: number; // 0-100
  };
  vibration: {
    enabled: boolean;
    intensity: 'light' | 'medium' | 'heavy';
  };
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: string;
  vibrate?: boolean;
  priority?: 'low' | 'normal' | 'high';
  tag?: string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  timer: {
    oneMinuteWarning: true,
    blindChange: true,
    timerPaused: false,
  },
  game: {
    playerEliminated: true,
    winnerDeclared: true,
    gameCompleted: true,
  },
  sound: {
    enabled: true,
    volume: 70,
  },
  vibration: {
    enabled: true,
    intensity: 'medium',
  },
};

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isSupported, setIsSupported] = useState(false);

  // Verificar soporte del navegador
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        loadPreferences();
      }
    }
  }, []);

  // Cargar preferencias desde localStorage
  const loadPreferences = useCallback(() => {
    try {
      const stored = localStorage.getItem('notification-preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Error loading notification preferences:', error);
    }
  }, []);

  // Guardar preferencias en localStorage
  const savePreferences = useCallback((newPreferences: NotificationPreferences) => {
    try {
      localStorage.setItem('notification-preferences', JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  }, []);

  // Solicitar permisos de notificación
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  // Reproducir sonido
  const playSound = useCallback((soundFile: string) => {
    if (!preferences.sound.enabled) return;

    try {
      const audio = new Audio(`/sounds/${soundFile}`);
      audio.volume = preferences.sound.volume / 100;
      audio.play().catch(e => console.warn('Could not play sound:', e));
    } catch (error) {
      console.warn('Error playing sound:', error);
    }
  }, [preferences.sound]);

  // Vibrar dispositivo
  const vibrate = useCallback((pattern?: number[]) => {
    if (!preferences.vibration.enabled || !navigator.vibrate) return;

    try {
      if (pattern) {
        navigator.vibrate(pattern);
      } else {
        // Patrones según intensidad
        const patterns = {
          light: [100],
          medium: [200],
          heavy: [300, 100, 300],
        };
        navigator.vibrate(patterns[preferences.vibration.intensity]);
      }
    } catch (error) {
      console.warn('Error vibrating device:', error);
    }
  }, [preferences.vibration]);

  // Enviar notificación
  const sendNotification = useCallback(async (
    type: keyof NotificationPreferences['timer'] | keyof NotificationPreferences['game'],
    options: NotificationOptions
  ) => {
    // Verificar permisos
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    // Verificar preferencias del usuario
    const category = type in preferences.timer ? 'timer' : 'game';
    if (!preferences[category][type as keyof typeof preferences[typeof category]]) {
      console.log(`Notification disabled for type: ${type}`);
      return false;
    }

    try {
      // Crear notificación
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        tag: options.tag || type,
        requireInteraction: options.priority === 'high',
        silent: !preferences.sound.enabled,
      });

      // Reproducir sonido si está especificado
      if (options.sound) {
        playSound(options.sound);
      }

      // Vibrar si está especificado
      if (options.vibrate) {
        vibrate();
      }

      // Auto-cerrar notificación después de 5 segundos (excepto alta prioridad)
      if (options.priority !== 'high') {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [permission, preferences, playSound, vibrate]);

  // Notificaciones específicas del sistema
  const notifyTimerWarning = useCallback(() => {
    return sendNotification('oneMinuteWarning', {
      title: '⏰ Timer Warning',
      body: '¡Queda 1 minuto para el próximo nivel de blinds!',
      sound: 'warning.mp3',
      vibrate: true,
      priority: 'normal',
      tag: 'timer-warning',
    });
  }, [sendNotification]);

  const notifyBlindChange = useCallback((newLevel: number, smallBlind: number, bigBlind: number) => {
    return sendNotification('blindChange', {
      title: '🔄 Blind Change',
      body: `Nivel ${newLevel}: ${smallBlind}/${bigBlind}`,
      sound: 'blind-change.mp3',
      vibrate: true,
      priority: 'high',
      tag: 'blind-change',
    });
  }, [sendNotification]);

  const notifyPlayerEliminated = useCallback((playerName: string, position: number) => {
    return sendNotification('playerEliminated', {
      title: '💀 Jugador Eliminado',
      body: `${playerName} eliminado en posición ${position}`,
      sound: 'elimination.mp3',
      vibrate: true,
      priority: 'normal',
      tag: 'elimination',
    });
  }, [sendNotification]);

  const notifyWinner = useCallback((playerName: string, points: number) => {
    return sendNotification('winnerDeclared', {
      title: '🏆 ¡Tenemos Ganador!',
      body: `${playerName} gana con ${points} puntos`,
      sound: 'winner.mp3',
      vibrate: true,
      priority: 'high',
      tag: 'winner',
    });
  }, [sendNotification]);

  const notifyGameCompleted = useCallback((dateNumber: number) => {
    return sendNotification('gameCompleted', {
      title: '🎯 Fecha Completada',
      body: `Fecha ${dateNumber} ha terminado`,
      sound: 'completion.mp3',
      vibrate: true,
      priority: 'normal',
      tag: 'game-completed',
    });
  }, [sendNotification]);

  return {
    // Estado
    isSupported,
    permission,
    preferences,
    
    // Acciones
    requestPermission,
    savePreferences,
    sendNotification,
    
    // Notificaciones específicas
    notifyTimerWarning,
    notifyBlindChange,
    notifyPlayerEliminated,
    notifyWinner,
    notifyGameCompleted,
    
    // Utilidades
    playSound,
    vibrate,
  };
};