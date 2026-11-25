/**
 * Home mientras se juega una fecha. En la web el home se vuelve el tablero en
 * vivo (LiveDateBoard); ese tablero es del área En Vivo (F4). Aquí queda la
 * entrada: qué fecha se juega, cuántos quedan en la mesa, la tabla con la
 * proyección en vivo y los accesos al timer y al registro (según rol).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';

import { StatRow } from '@/components/jugador/Bits';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import type { ActiveGameDate } from '@/hooks/useActiveGameDate';
import { useGameDateEliminations } from '@/hooks/useTournamentDates';
import { useCP } from '@/theme/tone';

export function HomeLive({ gameDate }: { gameDate: ActiveGameDate }) {
  const c = useCP();
  const { can, user } = useAuth();
  const { data: eliminations } = useGameDateEliminations(gameDate.id);

  const out = eliminations?.length ?? 0;
  const remaining = Math.max(0, gameDate.playersCount - out);
  const isPlaying = !!user && gameDate.playerIds.includes(user.id);
  const myElim = eliminations?.find((e) => e.eliminatedPlayer.id === user?.id);
  const last = eliminations ? [...eliminations].sort((a, b) => b.position - a.position).at(-1) : undefined;

  return (
    <View className="gap-4">
      <CPCard className="gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.primaryLight }} />
          <Overline style={{ color: c.primaryLight }}>En vivo</Overline>
        </View>
        <Title>Fecha {gameDate.dateNumber}</Title>
        <StatRow
          items={[
            { value: gameDate.playersCount, label: 'JUGADORES' },
            { value: remaining, label: 'EN LA MESA', color: c.positive },
            { value: out, label: 'ELIMINADOS' },
          ]}
        />
        {isPlaying ? (
          <Muted>
            {myElim ? `Saliste ${myElim.position}º · ${myElim.points} pts` : 'Seguís en la mesa. ¡Suerte!'}
          </Muted>
        ) : null}
        {last && !myElim ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="skull-outline" size={14} color={c.onSurfaceVariant} />
            <Muted>
              Último eliminado: {last.eliminatedPlayer.firstName} {last.eliminatedPlayer.lastName[0]}. ({last.position}º)
            </Muted>
          </View>
        ) : null}
      </CPCard>

      <View className="flex-row gap-3">
        <CPButton title="Timer" icon={<Ionicons name="timer-outline" size={18} color={c.onPrimary} />} onPress={() => router.push('/timer')} className="flex-1" />
        {can('eliminations') ? (
          <CPButton title="Registro" variant="primary" onPress={() => router.push('/registro')} className="flex-1" />
        ) : null}
      </View>
      <CPButton title="Tabla en vivo" variant="outline" onPress={() => router.push('/ranking')} />
    </View>
  );
}
