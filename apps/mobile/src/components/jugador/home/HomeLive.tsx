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
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import type { ActiveGameDate } from '@/hooks/useActiveGameDate';
import { useGameDateEliminations } from '@/hooks/useTournamentDates';
import { noir } from '@/theme/colors';

export function HomeLive({ gameDate }: { gameDate: ActiveGameDate }) {
  const { can, user } = useAuth();
  const { data: eliminations } = useGameDateEliminations(gameDate.id);

  const out = eliminations?.length ?? 0;
  const remaining = Math.max(0, gameDate.playersCount - out);
  const isPlaying = !!user && gameDate.playerIds.includes(user.id);
  const myElim = eliminations?.find((e) => e.eliminatedPlayer.id === user?.id);
  const last = eliminations ? [...eliminations].sort((a, b) => b.position - a.position).at(-1) : undefined;

  return (
    <View className="gap-4">
      <NoirCard accent className="gap-3">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: noir.danger }} />
          <Overline style={{ color: noir.danger }}>En vivo</Overline>
        </View>
        <Title>Fecha {gameDate.dateNumber}</Title>
        <StatRow
          items={[
            { value: gameDate.playersCount, label: 'JUGADORES' },
            { value: remaining, label: 'EN LA MESA', color: noir.gold },
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
            <Ionicons name="skull-outline" size={14} color={noir.muted} />
            <Muted>
              Último eliminado: {last.eliminatedPlayer.firstName} {last.eliminatedPlayer.lastName[0]}. ({last.position}º)
            </Muted>
          </View>
        ) : null}
      </NoirCard>

      <View className="flex-row gap-3">
        <NoirButton title="Timer" icon={<Ionicons name="timer-outline" size={18} color={noir.bg} />} onPress={() => router.push('/timer')} className="flex-1" />
        {can('eliminations') ? (
          <NoirButton title="Registro" variant="copper" onPress={() => router.push('/registro')} className="flex-1" />
        ) : null}
      </View>
      <NoirButton title="Tabla en vivo" variant="outline" onPress={() => router.push('/ranking')} />
    </View>
  );
}
