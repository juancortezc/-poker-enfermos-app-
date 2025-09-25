'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, type NotificationPreferences } from '@/hooks/useNotifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Bell, 
  BellOff, 
  Timer, 
  Trophy, 
  Volume2, 
  VolumeX, 
  Smartphone,
  AlertTriangle,
  CheckCircle,
  TestTube
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const {
    isSupported,
    isInitializing,
    permission,
    preferences,
    requestPermission,
    savePreferences,
    playSound,
    vibrate,
    notifyTimerWarning,
    notifyBlindChange,
    notifyPlayerEliminated,
    notifyWinner,
    pushSubscription,
    subscribeToPush,
    unsubscribeFromPush,
  } = useNotifications();

  const [saving, setSaving] = useState(false);
  const [testingSound, setTestingSound] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Solicitar permisos al cargar la página si no están otorgados
  useEffect(() => {
    if (isSupported && permission === 'default') {
      // No solicitar automáticamente, mejor mostrar un botón
    }
  }, [isSupported, permission]);

  const handlePreferenceChange = async (
    category: keyof NotificationPreferences,
    key: string,
    value: boolean | number | string
  ) => {
    const newPreferences = {
      ...preferences,
      [category]: {
        ...preferences[category],
        [key]: value,
      },
    };
    
    savePreferences(newPreferences);
  };

  const handlePermissionRequest = async () => {
    setSaving(true);
    await requestPermission();
    setSaving(false);
  };

  const testSound = async (soundFile: string) => {
    setTestingSound(true);
    try {
      await playSound(soundFile);
    } catch (error) {
      console.error('Error testing sound:', error);
    }
    setTestingSound(false);
  };

  const testVibration = () => {
    vibrate();
  };

  const testNotifications = {
    timer: () => notifyTimerWarning(),
    blindChange: () => notifyBlindChange(5, 200, 400),
    elimination: () => notifyPlayerEliminated('Jugador Test', 10),
    winner: () => notifyWinner('Ganador Test', 25),
  };

  const pushEnabled = Boolean(pushSubscription);

  const handleEnablePush = async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    setPushLoading(true);
    try {
      await subscribeToPush(vapidKey);
    } catch (error) {
      console.error('Error enabling push notifications:', error);
    }
    setPushLoading(false);
  };

  const handleDisablePush = async () => {
    setPushLoading(true);
    await unsubscribeFromPush();
    setPushLoading(false);
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-poker-muted">Preparando notificaciones...</div>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div>
        <div className="pt-20">
          <div className="max-w-md mx-auto text-center">
            <Card className="admin-card p-8">
              <BellOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                Notificaciones No Disponibles
              </h2>
              <p className="text-gray-400">
                Tu navegador no soporta notificaciones web. 
                Actualiza a una versión más reciente para usar esta función.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pt-20">
        <div className="max-w-2xl mx-auto space-y-6">
          

          {/* Permission Status */}
          <Card className="admin-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {permission === 'granted' ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-orange-400" />
                )}
                <div>
                  <h3 className="text-white font-semibold">Permiso Sistema</h3>
                </div>
              </div>
              
              {permission !== 'granted' && (
                <Button
                  onClick={handlePermissionRequest}
                  disabled={saving || permission === 'denied'}
                  className="bg-poker-red hover:bg-poker-red/80"
                >
                  {saving ? 'Solicitando...' : 'Habilitar'}
                </Button>
              )}
            </div>
          </Card>

          {/* Push Subscription */}
          <Card className="admin-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <Bell className={`w-6 h-6 ${pushEnabled ? 'text-green-400' : 'text-orange-400'}`} />
                  <h3 className="text-white font-semibold">Push / Background</h3>
                </div>
                <p className="text-xs text-poker-muted mt-2">
                  {pushEnabled
                    ? 'Recibirás alertas aunque estés en otras páginas del sitio.'
                    : 'Activa push para recibir alertas aunque la app esté en segundo plano.'}
                </p>
              </div>
              <div className="flex gap-2">
                {pushEnabled ? (
                  <Button
                    variant="outline"
                    onClick={handleDisablePush}
                    disabled={pushLoading}
                    className="text-sm"
                  >
                    {pushLoading ? 'Desactivando...' : 'Desactivar'}
                  </Button>
                ) : (
                  <Button
                    onClick={handleEnablePush}
                    disabled={pushLoading || permission !== 'granted'}
                    className="bg-poker-red hover:bg-poker-red/80 text-sm"
                  >
                    {pushLoading ? 'Activando...' : 'Activar Push'}
                  </Button>
                )}
              </div>
            </div>
            {permission !== 'granted' && (
              <p className="text-xs text-orange-400 mt-3">
                Primero autoriza las notificaciones del navegador para habilitar push.
              </p>
            )}
          </Card>

          {/* Timer Notifications */}
          <Card className="admin-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Timer className="w-6 h-6 text-poker-red" />
              <h3 className="text-white font-semibold">Timer</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white">Aviso 1 minuto antes</Label>
                <Switch
                  checked={preferences.timer.oneMinuteWarning}
                  onCheckedChange={(value) => handlePreferenceChange('timer', 'oneMinuteWarning', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-white">Cambio de blinds</Label>
                <Switch
                  checked={preferences.timer.blindChange}
                  onCheckedChange={(value) => handlePreferenceChange('timer', 'blindChange', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-white">Timer pausado</Label>
                <Switch
                  checked={preferences.timer.timerPaused}
                  onCheckedChange={(value) => handlePreferenceChange('timer', 'timerPaused', value)}
                />
              </div>
            </div>
          </Card>

          {/* Game Notifications */}
          <Card className="admin-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-poker-red" />
              <h3 className="text-white font-semibold">Enfermos</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white">Jugador eliminado</Label>
                <Switch
                  checked={preferences.game.playerEliminated}
                  onCheckedChange={(value) => handlePreferenceChange('game', 'playerEliminated', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-white">Ganador</Label>
                <Switch
                  checked={preferences.game.winnerDeclared}
                  onCheckedChange={(value) => handlePreferenceChange('game', 'winnerDeclared', value)}
                />
              </div>
            </div>
          </Card>

          {/* Sound Settings */}
          <Card className="admin-card p-6">
            <div className="flex items-center gap-3 mb-4">
              {preferences.sound.enabled ? (
                <Volume2 className="w-6 h-6 text-poker-red" />
              ) : (
                <VolumeX className="w-6 h-6 text-gray-400" />
              )}
              <h3 className="text-white font-semibold">Sonido</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white">Sonidos habilitados</Label>
                <Switch
                  checked={preferences.sound.enabled}
                  onCheckedChange={(value) => handlePreferenceChange('sound', 'enabled', value)}
                />
              </div>

              {preferences.sound.enabled && (
                <div>
                  <Label className="text-white block mb-2">
                    Volumen: {preferences.sound.volume}%
                  </Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={preferences.sound.volume}
                    onChange={(e) => handlePreferenceChange('sound', 'volume', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testSound('warning.mp3')}
                    disabled={testingSound}
                    className="mt-2"
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    Test
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Vibration Settings */}
          <Card className="admin-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-poker-red" />
              <h3 className="text-white font-semibold">Vibración</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-white">Vibración habilitada</Label>
                <Switch
                  checked={preferences.vibration.enabled}
                  onCheckedChange={(value) => handlePreferenceChange('vibration', 'enabled', value)}
                />
              </div>

              {preferences.vibration.enabled && (
                <div>
                  <Label className="text-white block mb-2">Intensidad</Label>
                  <select
                    value={preferences.vibration.intensity}
                    onChange={(e) => handlePreferenceChange('vibration', 'intensity', e.target.value)}
                    className="w-full bg-poker-card border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="light">Suave</option>
                    <option value="medium">Media</option>
                    <option value="heavy">Fuerte</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testVibration}
                    className="mt-2"
                  >
                    <TestTube className="w-4 h-4 mr-1" />
                    Test
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Test Notifications */}
          {permission === 'granted' && (
            <Card className="admin-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <TestTube className="w-6 h-6 text-poker-red" />
                <h3 className="text-white font-semibold">Probar Notificaciones</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={testNotifications.timer}
                  className="text-sm"
                >
                  Timer Warning
                </Button>
                <Button
                  variant="outline"
                  onClick={testNotifications.blindChange}
                  className="text-sm"
                >
                  Cambio Blinds
                </Button>
                <Button
                  variant="outline"
                  onClick={testNotifications.elimination}
                  className="text-sm"
                >
                  Eliminación
                </Button>
                <Button
                  variant="outline"
                  onClick={testNotifications.winner}
                  className="text-sm"
                >
                  Ganador
                </Button>
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
