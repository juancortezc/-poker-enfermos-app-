'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  notificationService,
  NotificationHelpers,
} from '@/lib/notifications';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationOptions,
  type NotificationPreferences,
  type NotificationPreferenceType,
} from '@/lib/notification-types';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isSupported, setIsSupported] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const bootstrap = async () => {
      const supported = notificationService.isSupported();
      setIsSupported(supported);

      if (supported) {
        await notificationService.initialize();
        setPermission(notificationService.getPermissionStatus());
        setPreferences(notificationService.getPreferences());
        const subscription = await notificationService.getPushSubscription();
        setPushSubscription(subscription);

        unsubscribe = notificationService.subscribeToPreferenceChanges((next) => {
          setPreferences(next);
        });
      }

      setIsInitializing(false);
    };

    bootstrap();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setPermission(notificationService.getPermissionStatus());
    return granted;
  }, []);

  const savePreferences = useCallback((nextPreferences: NotificationPreferences) => {
    notificationService.updatePreferences(nextPreferences);
    setPreferences(nextPreferences);
  }, []);

  const sendWithPreferences = useCallback(
    (type: NotificationPreferenceType, options: NotificationOptions) => {
      return notificationService.sendNotificationWithPreferences(
        type,
        options,
        notificationService.getPreferences()
      );
    },
    []
  );

  const notifyTimerWarning = useCallback(() => {
    return sendWithPreferences('oneMinuteWarning', NotificationHelpers.timer.oneMinuteWarning());
  }, [sendWithPreferences]);

  const notifyBlindChange = useCallback((newLevel: number, smallBlind: number, bigBlind: number) => {
    return sendWithPreferences('blindChange', NotificationHelpers.timer.blindChange(newLevel, smallBlind, bigBlind));
  }, [sendWithPreferences]);

  const notifyPlayerEliminated = useCallback((playerName: string, position: number) => {
    return sendWithPreferences('playerEliminated', NotificationHelpers.game.playerEliminated(playerName, position));
  }, [sendWithPreferences]);

  const notifyWinner = useCallback((playerName: string, points: number) => {
    return sendWithPreferences('winnerDeclared', NotificationHelpers.game.winnerDeclared(playerName, points));
  }, [sendWithPreferences]);

  const notifyGameCompleted = useCallback((dateNumber: number) => {
    return sendWithPreferences('gameCompleted', NotificationHelpers.game.gameCompleted(dateNumber));
  }, [sendWithPreferences]);

  const playSound = useCallback((soundFile: string) => {
    const prefs = notificationService.getPreferences();
    if (!prefs.sound.enabled) return;
    notificationService.playSound(soundFile, prefs.sound.volume / 100).catch((error) => {
      console.warn('Could not play sound test:', error);
    });
  }, []);

  const vibrate = useCallback(() => {
    const prefs = notificationService.getPreferences();
    if (!prefs.vibration.enabled) return;
    const pattern = notificationService.getVibrationPattern(prefs.vibration.intensity);
    notificationService.vibrate(pattern);
  }, []);

  const subscribeToPush = useCallback(async (publicKey?: string) => {
    const subscription = await notificationService.subscribeToPush(publicKey);
    setPushSubscription(subscription);
    return subscription;
  }, []);

  const unsubscribeFromPush = useCallback(async () => {
    const success = await notificationService.unsubscribeFromPush();
    if (success) {
      setPushSubscription(null);
    }
    return success;
  }, []);

  return {
    isSupported,
    isInitializing,
    permission,
    preferences,
    pushSubscription,
    requestPermission,
    savePreferences,
    notifyTimerWarning,
    notifyBlindChange,
    notifyPlayerEliminated,
    notifyWinner,
    notifyGameCompleted,
    playSound,
    vibrate,
    subscribeToPush,
    unsubscribeFromPush,
  };
};

export type { NotificationOptions, NotificationPreferences } from '@/lib/notification-types';
