/** Un punto de la línea de tiempo del calendario (web: FechaTimelineItem). */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName } from '@poker/shared';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/jugador/Avatar';
import { POSITIVE, Score } from '@/components/jugador/Bits';
import type { TournamentDate } from '@/hooks/useTournamentDates';
import { daysUntil } from '@/lib/dates';
import { noir } from '@/theme/colors';

const TIME = '19h20'; // hora estándar de todas las fechas del torneo

type Props = {
  date: TournamentDate;
  isNext: boolean;
  isLast: boolean;
  currentUserId: string;
  birthdayPlayerName?: string | null;
};

export function FechaTimelineItem({ date: gd, isNext, isLast, currentUserId, birthdayPlayerName }: Props) {
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
        borderColor: isNext ? noir.copper : noir.border,
        backgroundColor: isNext ? 'rgba(169,68,28,0.16)' : noir.surface,
      }}
      className="mb-3 flex-1 flex-row items-center gap-3 rounded-2xl p-3">
      <View className="w-12 items-center">
        <Text className="font-inter text-[10px] uppercase tracking-[1px] text-noir-muted">Fecha</Text>
        <Score value={gd.dateNumber} size={18} />
        <Text className="font-inter-bold text-xs text-noir-copper">
          {date.getDate()} {month}
        </Text>
      </View>

      <View className="flex-1">
        {done && winner ? (
          <View className="flex-row items-center gap-2">
            <Avatar name={fullName(winner.eliminatedPlayer)} photoUrl={winner.eliminatedPlayer.photoUrl} size={40} ringColor={noir.gold} />
            <View>
              <Text style={{ color: POSITIVE }} className="font-inter-bold text-[11px] tracking-[1px]">
                GANADOR
              </Text>
              <Text className="font-inter-semibold text-sm text-noir-text">
                {winner.eliminatedPlayer.firstName} {winner.eliminatedPlayer.lastName[0]}.
              </Text>
            </View>
          </View>
        ) : birthdayPlayerName ? (
          <View className="flex-row items-center gap-2">
            <Ionicons name="gift-outline" size={16} color={noir.gold} />
            <View className="flex-1">
              <Text className="font-inter-bold text-[11px] tracking-[1px] text-noir-gold">FECHA ESPECIAL</Text>
              <Text className="font-inter-semibold text-sm text-noir-text">Cumpleaños de {birthdayPlayerName}</Text>
            </View>
          </View>
        ) : isNext ? (
          <View>
            <Text className="font-inter-bold text-[11px] tracking-[1px] text-noir-copper">PRÓXIMA FECHA</Text>
            <Text className="font-inter-semibold text-sm text-noir-text">
              Faltan {days} {days === 1 ? 'día' : 'días'}
            </Text>
            <Text className="font-inter text-xs text-noir-muted">{TIME}</Text>
          </View>
        ) : (
          <View>
            <Text className="font-inter-semibold text-[11px] tracking-[1px] text-noir-muted">PROGRAMADA</Text>
            <Text className="font-inter-semibold text-sm text-noir-text">{TIME}</Text>
          </View>
        )}
      </View>

      {done ? (
        <View className="items-end">
          <Text className="font-inter-semibold text-[11px] text-noir-muted">{mine?.position === 1 ? '¡GANASTE!' : 'TÚ QUEDASTE'}</Text>
          {mine && mine.position !== 1 ? <Score value={`#${mine.position}`} size={16} /> : null}
          {!mine ? <Text className="font-inter text-xs text-noir-muted">—</Text> : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View className="flex-row gap-3">
      <View className="w-6 items-center">
        <View
          style={{
            backgroundColor: done ? POSITIVE : isNext ? noir.copper : 'transparent',
            borderWidth: done || isNext ? 0 : 2,
            borderColor: noir.border,
          }}
          className="h-6 w-6 items-center justify-center rounded-full">
          {done ? <Ionicons name="checkmark" size={14} color={noir.bg} /> : null}
          {!done && isNext ? <Ionicons name="calendar" size={12} color={noir.text} /> : null}
        </View>
        {!isLast ? <View className="mt-0.5 w-0.5 flex-1 bg-noir-border" /> : null}
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
