'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, type NotificationPreferences } from '@/hooks/useNotifications';
import { notificationService } from '@/lib/notifications';
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
  Settings,
  TestTube
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const {
    isSupported,
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
  } = useNotifications();

  const [saving, setSaving] = useState(false);
  const [testingSound, setTestingSound] = useState(false);

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

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark">
        <div className="px-4 pt-20 pb-8">
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
    <div className="min-h-screen bg-gradient-to-br from-poker-dark via-black to-poker-dark">
      <div className="px-4 pt-20 pb-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              Configuración de Notificaciones
            </h1>
            <p className="text-gray-400">
              Personaliza qué notificaciones quieres recibir durante las fechas de juego
            </p>
          </div>

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
                  <h3 className="text-white font-semibold">Estado de Permisos</h3>
                  <p className="text-gray-400 text-sm">
                    {permission === 'granted' && 'Notificaciones habilitadas'}
                    {permission === 'denied' && 'Notificaciones bloqueadas - Habilita en configuración del navegador'}
                    {permission === 'default' && 'Permisos pendientes - Haz click para habilitar'}
                  </p>
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

          {/* Timer Notifications */}
          <Card className="admin-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Timer className="w-6 h-6 text-poker-red" />
              <h3 className="text-white font-semibold">Notificaciones de Timer</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Aviso 1 minuto antes</Label>
                  <p className="text-gray-400 text-sm">Te avisa cuando queda 1 minuto para cambio de blinds</p>
                </div>
                <Switch
                  checked={preferences.timer.oneMinuteWarning}
                  onCheckedChange={(value) => handlePreferenceChange('timer', 'oneMinuteWarning', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Cambio de blinds</Label>
                  <p className="text-gray-400 text-sm">Notifica cuando cambian los niveles de blinds</p>
                </div>
                <Switch
                  checked={preferences.timer.blindChange}
                  onCheckedChange={(value) => handlePreferenceChange('timer', 'blindChange', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Timer pausado</Label>
                  <p className="text-gray-400 text-sm">Avisa cuando la Comisión pausa el timer</p>
                </div>
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
              <h3 className="text-white font-semibold">Notificaciones de Juego</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Jugador eliminado</Label>
                  <p className="text-gray-400 text-sm">Notifica cuando un jugador es eliminado</p>
                </div>
                <Switch
                  checked={preferences.game.playerEliminated}
                  onCheckedChange={(value) => handlePreferenceChange('game', 'playerEliminated', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Ganador declarado</Label>
                  <p className="text-gray-400 text-sm">Celebra cuando hay un ganador</p>
                </div>
                <Switch
                  checked={preferences.game.winnerDeclared}
                  onCheckedChange={(value) => handlePreferenceChange('game', 'winnerDeclared', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-white">Fecha completada</Label>
                  <p className="text-gray-400 text-sm">Notifica cuando termina una fecha de juego</p>
                </div>
                <Switch
                  checked={preferences.game.gameCompleted}
                  onCheckedChange={(value) => handlePreferenceChange('game', 'gameCompleted', value)}
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
              <h3 className="text-white font-semibold">Configuración de Sonido</h3>
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
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testSound('warning.mp3')}
                      disabled={testingSound}
                    >
                      <TestTube className="w-4 h-4 mr-1" />
                      Test
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Vibration Settings */}
          <Card className="admin-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Smartphone className="w-6 h-6 text-poker-red" />
              <h3 className="text-white font-semibold">Configuración de Vibración</h3>
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
                    Probar Vibración
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