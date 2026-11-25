/** Un punto de la línea de tiempo del calendario (web: FechaTimelineItem). */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName } from '@poker/shared';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { Score } from '@/components/jugador/Bits';
import type { TournamentDate } from '@/hooks/useTournamentDates';
import { daysUntil } from '@/lib/dates';
import { useCP } from '@/theme/tone';

const TIME = '19h20'; // hora estándar de todas las fechas del torneo

type Props = {
  date: TournamentDate;
  isNext: boolean;
  isLast: boolean;
  currentUserId: string;
  birthdayPlayerName?: string | null;
};

export function FechaTimelineItem({ date: gd, isNext, isLast, currentUserId, birthdayPlayerName }: Props) {
  const c = useCP();
  const done = gd.status === 'completed';
  const date = new Date(gd.scheduledDate);
  const month = date.toLocaleDateString('es-EC', { month: 'short' }).toUpperCase().replace('.', '');
  const days = daysUntil(gd.scheduledDate) ?? 0;
  const winner = gd.eliminations.find((e) => e.position === 1);
  const mine = gd.eliminations.find((e) => e.eliminatedPlayer.id === currentUserId);

  const card = (
    <View
      style={{
        borderWidth: isNext ? 2 : 1,
        borderColor: isNext ? c.primary : c.surfaceBorder,
        backgroundColor: isNext ? 'rgba(229,57,53,0.08)' : c.surface1,
      }}
      className="mb-3 flex-1 flex-row items-center gap-3 rounded-[14px] p-3">
      <View className="w-12 items-center">
        <Text className="font-inter-bold text-[11px] uppercase tracking-[0.5px] text-cp-on-surface-muted">Fecha</Text>
        <Score value={gd.dateNumber} size={18} />
        <Text className="font-inter-bold text-xs text-cp-primary-light">
          {date.getDate()} {month}
        </Text>
      </View>

      <View className="flex-1">
        {done && winner ? (
          <View className="flex-row items-center gap-2">
            <PlayerAvatar name={fullName(winner.eliminatedPlayer)} photoUrl={winner.eliminatedPlayer.photoUrl} size={40} />
            <View>
              <Text style={{ color: c.positive }} className="font-inter-bold text-[11px] tracking-[1px]">
                GANADOR
              </Text>
              <Text className="font-inter-semibold text-sm text-cp-on-surface">
                {winner.eliminatedPlayer.firstName} {winner.eliminatedPlayer.lastName[0]}.
              </Text>
            </View>
          </View>
        ) : birthdayPlayerName ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="gift-outline" size={16} color={c.gold} />
            <View className="flex-1">
              <Text style={{ color: c.gold }} className="font-inter-bold text-[11px] tracking-[1px]">FECHA ESPECIAL</Text>
              <Text className="font-inter-semibold text-sm text-cp-on-surface">Cumpleaños de {birthdayPlayerName}</Text>
            </View>
          </View>
        ) : isNext ? (
          <View>
            <Text className="font-inter-bold text-[11px] tracking-[1px] text-cp-primary-light">PRÓXIMA FECHA</Text>
            <Text className="font-inter-semibold text-sm text-cp-on-surface">
              Faltan {days} {days === 1 ? 'día' : 'días'}
            </Text>
            <Text className="font-inter text-xs text-cp-on-surface-muted">{TIME}</Text>
          </View>
        ) : (
          <View>
            <Text className="font-inter-semibold text-[11px] tracking-[1px] text-cp-on-surface-muted">PROGRAMADA</Text>
            <Text className="font-inter-semibold text-sm text-cp-on-surface">{TIME}</Text>
          </View>
        )}
      </View>

      {done ? (
        <View className="items-end">
          <Text className="font-inter-semibold text-[11px] text-cp-on-surface-muted">{mine?.position === 1 ? '¡GANASTE!' : 'TÚ QUEDASTE'}</Text>
          {mine && mine.position !== 1 ? <Score value={`#${mine.position}`} size={16} /> : null}
          {!mine ? <Text className="font-inter text-xs text-cp-on-surface-muted">—</Text> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-row gap-3">
      <View className="w-6 items-center">
        <View
          style={{
            backgroundColor: done ? c.positive : isNext ? c.primary : 'transparent',
            borderWidth: done || isNext ? 0 : 2,
            borderColor: c.surface4,
          }}
          className="h-6 w-6 items-center justify-center rounded-full">
          {done ? <Ionicons name="checkmark" size={14} color="white" /> : null}
          {!done && isNext ? <Ionicons name="calendar" size={12} color="white" /> : null}
        </View>
        {!isLast ? <View className="mt-0.5 w-0.5 flex-1 bg-cp-surface-border" /> : null}
      </View>
      {done ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ver resultados de la fecha ${gd.dateNumber}`}
          onPress={() => router.push({ pathname: '/fecha', params: { id: String(gd.id) } })}
          className="flex-1 active:opacity-80">
          {card}
        </Pressable>
      ) : (
        card
      )}
    </View>
  );
}
