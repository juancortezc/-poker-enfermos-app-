/**
 * Mesa terminada (queda un jugador). Paridad con GameCompletedCard de la
 * web: si la fecha no se cerró sola, la Comisión la cierra a mano.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Text } from 'react-native';

import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Body, Title } from '@/components/ui/Typography';
import { apiFetch, ApiError } from '@/lib/api';
import { useCP } from '@/theme/tone';

export function GameCompletedCard({
  gameDateId,
  status,
  onClosed,
}: {
  gameDateId: number;
  status: string;
  onClosed: () => void;
}) {
  const c = useCP();
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(status === 'completed');
  const [error, setError] = useState<string | null>(null);

  const close = async () => {
    setClosing(true);
    setError(null);
    try {
      await apiFetch('/api/admin/fix-stuck-date', {
        method: 'POST',
        json: { gameDateId },
      });
      setClosed(true);
      onClosed();
    } catch (e) {
      if (e instanceof ApiError) {
        // `hint` viene en error.details (formato nuevo) o en la raíz (viejo).
        const hint = typeof e.details.hint === 'string' ? e.details.hint : undefined;
        setError(e.message || hint || 'Error al cerrar la fecha');
      } else {
        setError('Error de conexión');
      }
    } finally {
      setClosing(false);
    }
  };

  return (
    <CPCard className="items-center gap-3 py-8">
      <Ionicons name={closed ? 'checkmark-circle' : 'trophy'} size={36} color={closed ? c.positive : c.gold} />
      <Title className="text-center">{closed ? 'Fecha completada' : 'Juego completado'}</Title>
      <Body className="text-center text-cp-on-surface-muted">
        {closed ? 'La fecha quedó cerrada.' : 'El torneo de hoy terminó. ¡Felicitaciones al ganador!'}
      </Body>
      {!closed && status === 'in_progress' ? (
        <CPButton
          title="Cerrar fecha"
          size="lg"
          loading={closing}
          onPress={() =>
            Alert.alert('Cerrar fecha', 'Se marca la fecha como completada.', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Cerrar', onPress: close },
            ])
          }
        />
      ) : null}
      {error ? <Text className="text-center font-inter text-sm text-cp-primary-light">{error}</Text> : null}
    </CPCard>
  );
}
