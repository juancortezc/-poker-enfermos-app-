'use client';

import { useCallback, useEffect, useState } from 'react';
import { notificationService } from '@/lib/notifications';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      const supported = notificationService.isSupported();
      setIsSupported(supported);

      if (supported) {
        await notificationService.initialize();
        setPermission(notificationService.getPermissionStatus());
        const subscription = await notificationService.getPushSubscription();
        setPushSubscription(subscription);
      }

      setIsInitializing(false);
    };

    bootstrap();
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setPermission(notificationService.getPermissionStatus());
    return granted;
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
    pushSubscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  };
};
