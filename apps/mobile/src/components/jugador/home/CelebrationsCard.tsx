/**
 * Cumpleaños y sequías (1000+ días sin ganar), descartables. Como en la web,
 * los cumpleaños descartados vuelven al día siguiente (día de Ecuador) y las
 * sequías quedan descartadas. En la web se recuerda en localStorage; aquí en
 * SecureStore (ya instalado; son unos pocos ids).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { CPCard } from '@/components/ui/CPCard';
import { Body, Muted, Overline } from '@/components/ui/Typography';
import { useCelebrations } from '@/hooks/useHomeExtras';
import { useCP } from '@/theme/tone';

const KEY = 'celebrations_dismissed';

interface Dismissed {
  birthdayIds: string[];
  droughtIds: string[];
  lastUpdated: string;
}

function ecuadorToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
}

const EMPTY: Dismissed = { birthdayIds: [], droughtIds: [], lastUpdated: '' };

export function CelebrationsCard() {
  const c = useCP();
  const { data } = useCelebrations();
  const [dismissed, setDismissed] = useState<Dismissed | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        const parsed = raw ? (JSON.parse(raw) as Dismissed) : EMPTY;
        const today = ecuadorToday();
        setDismissed(
          parsed.lastUpdated !== today ? { birthdayIds: [], droughtIds: parsed.droughtIds ?? [], lastUpdated: today } : parsed
        );
      })
      .catch(() => setDismissed({ ...EMPTY, lastUpdated: ecuadorToday() }));
  }, []);

  const persist = (next: Dismissed) => {
    setDismissed(next);
    SecureStore.setItemAsync(KEY, JSON.stringify(next)).catch(() => {});
  };

  if (!data || !dismissed) return null;
  const birthdays = data.birthdays.filter((p) => !dismissed.birthdayIds.includes(p.id));
  const droughts = data.droughts.filter((p) => !dismissed.droughtIds.includes(p.id));
  if (birthdays.length === 0 && droughts.length === 0) return null;

  return (
    <View className="gap-3">
      {birthdays.length > 0 ? (
        <CPCard className="gap-3" style={{ borderColor: `${c.gold}66` }}>
          <View className="flex-row items-center gap-2">
            <Ionicons name="gift-outline" size={18} color={c.gold} />
            <Overline className="flex-1">Cumpleaños</Overline>
            <DismissButton
              onPress={() =>
                persist({
                  ...dismissed,
                  birthdayIds: [...dismissed.birthdayIds, ...data.birthdays.map((p) => p.id)],
                  lastUpdated: ecuadorToday(),
                })
              }
            />
          </View>
          {birthdays.map((p) => (
            <View key={p.id} className="flex-row items-center gap-3">
              <PlayerAvatar name={`${p.firstName} ${p.lastName}`} photoUrl={p.photoUrl} size={56} playerId={p.id} linkToProfile />
              <View className="flex-1">
                <Body className="text-base">
                  {p.firstName} {p.lastName}
                </Body>
                <Muted className={p.isToday ? 'font-inter-semibold text-cp-primary-light' : ''}>
                  {p.isToday ? '¡Hoy!' : p.daysUntil === 1 ? 'Mañana' : `En ${p.daysUntil} días`}
                </Muted>
              </View>
              {p.isToday ? <Text style={{ fontSize: 20 }}>🎂</Text> : null}
            </View>
          ))}
        </CPCard>
      ) : null}

      {droughts.length > 0 ? (
        <CPCard className="gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="trophy-outline" size={18} color={c.primaryLight} />
            <Overline className="flex-1">1000+ días sin ganar</Overline>
            <DismissButton
              onPress={() =>
                persist({
                  ...dismissed,
                  droughtIds: [...dismissed.droughtIds, ...data.droughts.map((p) => p.id)],
                  lastUpdated: ecuadorToday(),
                })
              }
            />
          </View>
          {droughts.map((p) => (
            <View key={p.id} className="flex-row items-center gap-3">
              <PlayerAvatar name={`${p.firstName} ${p.lastName}`} photoUrl={p.photoUrl} size={56} playerId={p.id} linkToProfile />
              <View className="flex-1">
                <Body className="text-base">
                  {p.firstName} {p.lastName}
                </Body>
                <Muted>{p.daysSinceVictory} días sin ganar una fecha</Muted>
              </View>
              <Muted className="text-xs uppercase tracking-[1px]">Sequía</Muted>
            </View>
          ))}
        </CPCard>
      ) : null}
    </View>
  );
}

function DismissButton({ onPress }: { onPress: () => void }) {
  const c = useCP();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Descartar"
      onPress={onPress}
      hitSlop={12}
      className="h-8 w-8 items-center justify-center rounded-full active:bg-cp-surface-2">
      <Ionicons name="close" size={18} color={c.onSurfaceVariant} />
    </Pressable>
  );
}
